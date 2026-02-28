// ==========================================
// 1. FIREBASE ИНИЦИАЛИЗАЦИЯ (Ошол эле бойдон)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAneBm46gs6L73E5O0GWFHKz9twnTmFIeo",
    authDomain: "music-edcd3.firebaseapp.com",
    projectId: "music-edcd3",
    storageBucket: "music-edcd3.firebasestorage.app",
    messagingSenderId: "514206966226",
    appId: "1:514206966226:web:b588818706c4c0d901680b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// 2. ГЛОБАЛДЫК ӨЗГӨРМӨЛӨР
// ==========================================
let player;
let uiTimer;
let isDragging = false;
let blockAutoUpdate = false;
let pendingSeekTime = 0;

const playerCard = document.getElementById('player');
const pArea = document.getElementById('pArea');
const pFill = document.getElementById('pFill');
const playIco = document.getElementById('playIco');
const pauseIco = document.getElementById('pauseIco');
const touchOverlay = document.getElementById('touchOverlay');
const playlistContainer = document.getElementById('playlistContainer');

const fBtn = document.getElementById('fsBtn') || document.getElementById('fBtn');
const enterFs = document.getElementById('enterFs') || document.getElementById('expandIco');
const exitFs = document.getElementById('exitFs') || document.getElementById('collapseIco');

// ==========================================
// 3. YOUTUBE API ЖҮКТӨӨ
// ==========================================
if (!window.YT) {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player('ytPlayer', {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 0,
            controls: 0,
            playsinline: 1,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3
        },
        events: {
            onReady: () => {
                loadPlaylistFromFirebase();
                setupControls();
                setupDragging();
            },
            onStateChange: onPlayerStateChange
        }
    });
};

// ==========================================
// 4. ПЛЕЙЛИСТТИ ЖҮКТӨӨ (Ошол эле бойдон)
// ==========================================
async function loadPlaylistFromFirebase() {
    if (!playlistContainer) return;
    try {
        const q = query(collection(db, "video_clips"), orderBy("created_at", "desc"));
        const snapshot = await getDocs(q);
        playlistContainer.innerHTML = "";
        let first = true;
        snapshot.forEach(doc => {
            const data = doc.data();
            const videoId = extractVideoId(data.src);
            if (!videoId) return;
            const item = document.createElement('div');
            item.className = `playlist-item ${first ? "active" : ""}`;
            item.innerHTML = `
                <div class="pl-thumb" style="background-image:url('https://img.youtube.com/vi/${videoId}/mqdefault.jpg')"></div>
                <div class="pl-info">
                    <b>${data.name || "Аталышы жок"}</b>
                    <p>${data.artist || "Артист"}</p>
                </div>
            `;
            item.onclick = () => loadYTVideo(videoId, item);
            playlistContainer.appendChild(item);
            if (first) {
                player.cueVideoById(videoId);
                first = false;
            }
        });
    } catch (error) {
        console.error("Firebase катасы:", error);
    }
}

function loadYTVideo(id, el) {
    if (!player || typeof player.loadVideoById !== 'function') return;
    player.loadVideoById(id);
    player.playVideo();
    document.querySelectorAll(".playlist-item").forEach(i => {
        i.classList.remove("active");
        const mark = i.querySelector(".playing-mark");
        if (mark) mark.remove();
    });
    el.classList.add("active");
    const thumb = el.querySelector(".pl-thumb");
    if (thumb) thumb.insertAdjacentHTML("afterbegin", `<span class="playing-mark">Ойнолууда</span>`);
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ==========================================
// 5. ПЛЕЕРДИ БАШКАРУУ
// ==========================================
function setupControls() {
    const pBtn = document.getElementById("pBtn");
    if (pBtn) {
        pBtn.onclick = (e) => {
            e.stopPropagation();
            const state = player.getPlayerState();
            state === YT.PlayerState.PLAYING ? player.pauseVideo() : player.playVideo();
            showUI();
        };
    }

    if (fBtn) {
        fBtn.onclick = (e) => {
            e.stopPropagation();
            if (!document.fullscreenElement) {
                if (playerCard.requestFullscreen) playerCard.requestFullscreen();
                else if (playerCard.webkitRequestFullscreen) playerCard.webkitRequestFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
        };
    }

    document.addEventListener("fullscreenchange", () => {
        const isFS = !!document.fullscreenElement;
        if (enterFs) enterFs.style.display = isFS ? "none" : "block";
        if (exitFs) exitFs.style.display = isFS ? "block" : "none";
        if (!isFS) playerCard.classList.remove("ui-hidden");
        showUI();
    });

    if (touchOverlay) {
        touchOverlay.onclick = (e) => {
            if (e.target.closest('#pArea')) return;
            if (document.fullscreenElement) {
                playerCard.classList.toggle("ui-hidden");
                if (!playerCard.classList.contains("ui-hidden")) showUI();
            } else {
                showUI();
            }
        };
    }

    setInterval(() => {
        if (!player || isDragging || blockAutoUpdate) return;
        if (player.getCurrentTime && player.getDuration) {
            const curr = player.getCurrentTime();
            const dur = player.getDuration();
            if (dur > 0) {
                pFill.style.width = ((curr / dur) * 100) + "%";
            }
        }
    }, 100);
}

// ==========================================
// 6. ПЛАВНЫЙ ТАЙМЛАЙН ПЕРЕМОТКА (ОҢДОЛГОН)
// ==========================================
function setupDragging() {
    if (!pArea) return;

    const getPercent = (clientX) => {
        const rect = pArea.getBoundingClientRect();
        let pct = (clientX - rect.left) / rect.width;
        return Math.max(0, Math.min(1, pct));
    };

    // Сүйрөп жатканда тилке гана жылат (Видео катып калбашы үчүн)
    const handleMove = (x) => {
        if (!isDragging) return;
        const pct = getPercent(x);
        
        // CSS transition'ду өчүрөбүз, колго илешип дароо жылыш үчүн
        pFill.style.transition = "none";
        pFill.style.width = (pct * 100) + "%";
        
        const dur = player.getDuration();
        pendingSeekTime = pct * dur;

        // Видеону кошо жылдыруу (Бирок өтө тез эмес, болжол менен 100мс сайын)
        // Бул жерде 'false' коюу маанилүү - бул "жүктөөнү" аягына чыгара электе серверди кыйнабайт
        if (player && typeof player.seekTo === 'function') {
            player.seekTo(pendingSeekTime, false); 
        }
    };

    const start = (x) => {
        isDragging = true;
        blockAutoUpdate = true;
        handleMove(x);
    };

    const end = () => {
        if (!isDragging) return;
        isDragging = false;
        
        // Сөөмөйдү же чычканды коё бергенде гана видеону так ошол жерге секиртүү
        if (player && typeof player.seekTo === 'function') {
            player.seekTo(pendingSeekTime, true);
        }

        // Кайра автоматтык түрдө тилкени жылдырууну иштетүү
        setTimeout(() => { 
            blockAutoUpdate = false; 
            pFill.style.transition = "width 0.2s linear"; 
        }, 200);
        
        showUI();
    };

    // Чычкан окуялары
    pArea.addEventListener("mousedown", (e) => start(e.clientX));
    window.addEventListener("mousemove", (e) => {
        if (isDragging) handleMove(e.clientX);
    });
    window.addEventListener("mouseup", end);

    // Сенсордук (Телефон) окуялары
    pArea.addEventListener("touchstart", (e) => {
        start(e.touches[0].clientX);
    }, { passive: false });
    
    window.addEventListener("touchmove", (e) => {
        if (isDragging) {
            handleMove(e.touches[0].clientX);
            if (e.cancelable) e.preventDefault(); 
        }
    }, { passive: false });
    
    window.addEventListener("touchend", end);
                }
        

// ==========================================
// 7. КАЛГАН ФУНКЦИЯЛАР (Ошол эле бойдон)
// ==========================================
function onPlayerStateChange(event) {
    const playing = event.data === YT.PlayerState.PLAYING;
    if (playIco) playIco.style.display = playing ? "none" : "block";
    if (pauseIco) pauseIco.style.display = playing ? "block" : "none";
    playing ? showUI() : (clearTimeout(uiTimer), playerCard.classList.remove("ui-hidden"));
}

function showUI() {
    playerCard.classList.remove("ui-hidden");
    clearTimeout(uiTimer);
    if (player && player.getPlayerState() === YT.PlayerState.PLAYING && !isDragging) {
        uiTimer = setTimeout(() => {
            if (document.fullscreenElement) playerCard.classList.add("ui-hidden");
        }, 3000);
    }
}

function extractVideoId(url) {
    if (!url) return "";
    const reg = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = String(url).match(reg);
    return (match && match[1].length === 11) ? match[1] : (url.length === 11 ? url : "");
}
