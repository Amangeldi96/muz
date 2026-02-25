// 1. FIREBASE ЖАНА КИТЕПКАНАЛАР
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
    getFirestore, collection, getDocs, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

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

// ================= 2. ГЛОБАЛДЫК ӨЗГӨРМӨЛӨР =================
let ytPlayer = null;       
let storyYtPlayer = null;  
let currentBtn = null; 
let progressInterval;
let storyProgressInterval;
let isStoryDragging = false; 
let wakeLock = null;

const iconHTML = `<svg width="20" height="20" viewBox="0 0 25 25" fill="none"><g transform="translate(1, 0)"><path d="M7.98047 3.51001C5.43047 4.39001 4.98047 9.09992 4.98047 12.4099C4.98047 15.7199 5.41047 20.4099 7.98047 21.3199C10.6905 22.2499 18.9805 16.1599 18.9805 12.4099C18.9805 8.65991 10.6905 2.58001 7.98047 3.51001Z" fill="#ffffff"></path></g></svg>`;
const pauseIconHTML = `<svg width="20" height="20" viewBox="0 0 25 25" fill="none"><g transform="translate(1.5, 1) scale(0.9)"><path d="M10 6.42004C10 4.76319 8.65685 3.42004 7 3.42004C5.34315 3.42004 4 4.76319 4 6.42004V18.42C4 20.0769 5.34315 21.42 7 21.42C8.65685 21.42 10 20.0769 10 18.42V6.42004Z" fill="#ffffff"></path><path d="M20 6.42004C20 4.76319 18.6569 3.42004 17 3.42004C15.3431 3.42004 14 4.76319 14 6.42004V18.42C14 20.0769 15.3431 21.42 17 21.42C18.6569 21.42 20 20.0769 20 18.42V6.42004Z" fill="#ffffff"></path></g></svg>`;
const loadingHTML = `<div class="is-loading-circle"></div>`; // Сиздин CSS'теги спинер

const storyModal = document.getElementById('storyFullscreen');
const storyStatusBar = document.getElementById('statusBar');
const storyProgressContainer = document.getElementById('progressBarContainer');

// ================= 3. YOUTUBE API ЖАНА ЛОГИКА =================
if (!window.YT) {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try { wakeLock = await navigator.wakeLock.request('screen'); } catch (err) {}
    }
}

window.onYouTubeIframeAPIReady = function() {
    ytPlayer = new YT.Player('ytPlayer', {
        height: '0', width: '0',
        playerVars: { 
            'playsinline': 1, 
            'controls': 0, 
            'enablejsapi': 1,
            'autoplay': 0,
            'origin': window.location.origin
        },
        events: { 
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError, // Ката болгондо спинерди өчүрүү үчүн
            'onReady': (e) => { e.target.unMute(); } 
        }
    });

    storyYtPlayer = new YT.Player('storyYoutubePlayer', {
        height: '100%', width: '100%',
        playerVars: { 'playsinline': 1, 'controls': 0, 'rel': 0, 'modestbranding': 1, 'iv_load_policy': 3 },
        events: { 'onStateChange': onStoryPlayerStateChange }
    });
};

// Visibility API
document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === 'hidden' && ytPlayer) {
        if (ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
            setTimeout(() => { ytPlayer.playVideo(); }, 150);
        }
    }
});

// Media Session
function updateMediaSession(btn) {
    if ('mediaSession' in navigator) {
        const parent = btn.closest('.upcoming-card, .block, .song-item');
        const title = parent.querySelector('b').innerText;
        const artist = parent.querySelector('p, span').innerText;
        const coverImg = parent.querySelector('.song-image, .cover, img');
        let coverSrc = "";
        
        if (coverImg) {
            const style = coverImg.getAttribute('style');
            if (style && style.includes('url')) {
                coverSrc = style.match(/url\(["']?(.*?)["']?\)/)[1];
            } else {
                coverSrc = coverImg.src;
            }
        }

        navigator.mediaSession.metadata = new MediaMetadata({
            title: title,
            artist: artist,
            artwork: [{ src: coverSrc || "", sizes: '512x512', type: 'image/png' }]
        });

        navigator.mediaSession.setActionHandler('play', () => ytPlayer.playVideo());
        navigator.mediaSession.setActionHandler('pause', () => ytPlayer.pauseVideo());
    }
}

// ================= 4. ГЛОБАЛДЫК ФУНКЦИЯЛАР =================
window.extractVideoId = function(url) {
    if(!url) return "";
    const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = String(url).match(regExp);
    return (match && match[1].length === 11) ? match[1] : url;
};

window.getValidCover = function(cover, videoUrl) {
    if (cover && cover.trim() !== "" && cover.startsWith("http")) return cover;
    const vid = window.extractVideoId(videoUrl);
    return `https://img.youtube.com/vi/${vid}/mqdefault.jpg`;
};

window.togglePlay = function(btn, src) {
    if (!ytPlayer || typeof ytPlayer.loadVideoById !== 'function') return;
    
    const vid = window.extractVideoId(src);

    if (currentBtn === btn) {
        const state = ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            ytPlayer.pauseVideo();
        } else {
            btn.innerHTML = loadingHTML; // Кайра ойнотууда спинерди көрсөтүү
            ytPlayer.playVideo();
        }
        return;
    }

    if (currentBtn) { 
        currentBtn.innerHTML = iconHTML; 
        resetProgressBar(currentBtn); 
    }
    
    currentBtn = btn;
    btn.innerHTML = loadingHTML; // Спинерди күйгүзүү
    
    updateMediaSession(btn);
    ytPlayer.loadVideoById(vid);
    ytPlayer.playVideo();
    requestWakeLock();
};

function onPlayerStateChange(event) {
    if (!currentBtn) return;

    if (event.data === YT.PlayerState.PLAYING) {
        currentBtn.innerHTML = pauseIconHTML; // Ойноп баштаганда спинер өчөт, пауза чыгат
        startProgressTracking();
    } 
    else if (event.data === YT.PlayerState.BUFFERING) {
        currentBtn.innerHTML = loadingHTML; // Интернет начар болсо же жүктөлүп жатса спинер чыгат
    } 
    else if (event.data === YT.PlayerState.PAUSED) {
        currentBtn.innerHTML = iconHTML; // Паузада плей иконкасы
    } 
    else if (event.data === YT.PlayerState.ENDED) {
        currentBtn.innerHTML = iconHTML;
        resetProgressBar(currentBtn);
    }
}

function onPlayerError() {
    if (currentBtn) {
        currentBtn.innerHTML = iconHTML; // Ката болсо спинерди алып салуу
        alert("Видеону жүктөөдө ката кетти же YouTube блоктоп койду.");
    }
}

function startProgressTracking() {
    clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (ytPlayer && ytPlayer.getCurrentTime && currentBtn) {
            const curr = ytPlayer.getCurrentTime();
            const dur = ytPlayer.getDuration();
            if (dur > 0) {
                const percent = (curr / dur) * 100;
                const parent = currentBtn.closest('.upcoming-card, .block, .song-item');
                const bar = parent ? parent.querySelector('.progress-bg') : null;
                if (bar) bar.style.width = percent + '%';
            }
        }
    }, 500);
}

function resetProgressBar(btn) {
    const parent = btn.closest('.upcoming-card, .block, .song-item');
    const bar = parent ? parent.querySelector('.progress-bg') : null;
    if (bar) bar.style.width = '0%';
}

// ================= 5. СТОРИЗ ПЕРЕМОТКА =================
window.viewStory = function(videoId) {
    if (!storyModal || !storyYtPlayer) return;
    if (ytPlayer) ytPlayer.pauseVideo();
    storyModal.style.display = 'block';
    if (storyStatusBar) storyStatusBar.style.width = '0%';
    const vid = window.extractVideoId(videoId);
    storyYtPlayer.loadVideoById(vid);
    storyYtPlayer.playVideo();
};

window.closeStory = function() {
    if (storyModal) storyModal.style.display = 'none';
    if (storyYtPlayer) storyYtPlayer.stopVideo();
    clearInterval(storyProgressInterval);
    isStoryDragging = false;
};

function onStoryPlayerStateChange(e) {
    if (e.data === YT.PlayerState.PLAYING) {
        startStoryProgress();
    } else if (e.data === YT.PlayerState.ENDED) {
        window.closeStory();
    } else {
        clearInterval(storyProgressInterval);
    }
}

function startStoryProgress() {
    clearInterval(storyProgressInterval);
    storyProgressInterval = setInterval(() => {
        if (storyYtPlayer && storyYtPlayer.getCurrentTime && !isStoryDragging) {
            const curr = storyYtPlayer.getCurrentTime();
            const dur = storyYtPlayer.getDuration();
            if (dur > 0 && storyStatusBar) {
                storyStatusBar.style.width = (curr / dur * 100) + '%';
            }
        }
    }, 50);
}

function handleStoryScrub(e) {
    if (!storyProgressContainer || !storyYtPlayer) return;
    const rect = storyProgressContainer.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = x / rect.width;
    if (storyStatusBar) storyStatusBar.style.width = (percent * 100) + '%';
    if (isStoryDragging) {
        const dur = storyYtPlayer.getDuration();
        if (dur > 0) storyYtPlayer.seekTo(percent * dur, true);
    }
}

if (storyProgressContainer) {
    const start = (e) => { isStoryDragging = true; storyProgressContainer.classList.add('active'); handleStoryScrub(e); };
    const move = (e) => { if (isStoryDragging) { if (e.cancelable) e.preventDefault(); handleStoryScrub(e); } };
    const end = () => { isStoryDragging = false; if (storyProgressContainer) storyProgressContainer.classList.remove('active'); };
    storyProgressContainer.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    storyProgressContainer.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);
}

window.toggleStoryPlay = function() {
    if (!storyYtPlayer) return;
    const state = storyYtPlayer.getPlayerState();
    state === YT.PlayerState.PLAYING ? storyYtPlayer.pauseVideo() : storyYtPlayer.playVideo();
};

// ================= 6. FIREBASE ЖҮКТӨӨ =================
async function loadAllContent() {
    loadCollection("top_hits", renderTopHits);
    loadCollection("hits", renderHits);
    loadCollection("shorts", renderShorts);
    loadCollection("upcoming", renderUpcoming);
}

async function loadCollection(name, callback) {
    try {
        const q = query(collection(db, name), orderBy("created_at", "desc"));
        const snap = await getDocs(q);
        callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
        const snap = await getDocs(collection(db, name));
        callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
}

function renderTopHits(data) {
    const container = document.getElementById('albumList');
    if (!container) return;
    container.innerHTML = data.map(song => {
        const url = song.src || song.url || "";
        return `
        <div class="block">
            <div class="progress-container"><div class="progress-bg"></div></div>
            <div class="song-image" style="background-image: url('${window.getValidCover(song.cover, url)}');"></div>
            <div class="block-text"><b>${song.artist || "Артист"}</b><p>${song.name || "Аталышы жок"}</p></div>
            <div class="mini-play" onclick="togglePlay(this, '${url}')">${iconHTML}</div>
        </div>`;
    }).join("");
}

function renderHits(data) {
    const container = document.getElementById('hitList');
    if (!container) return;
    container.innerHTML = data.map(song => `
        <div class="song-item">
            <div class="progress-container" style="position:absolute; bottom:0; width:100%; height:2px;"><div class="progress-bg"></div></div>
            <div class="play-icon-circle" onclick="togglePlay(this, '${song.src || song.url}')">${iconHTML}</div>
            <div class="song-name"><b>${song.name || "Аталышы жок"}</b><span>${song.artist || "Артист"}</span></div>
        </div>`).join("");
}

function renderShorts(data) {
    const container = document.getElementById("shortsList");
    if (!container) return;
    container.innerHTML = data.map(item => {
        const url = item.src || item.url || "";
        return `
            <div class="story-item" onclick="viewStory('${url}')">
                <div class="story-circle"><img src="${window.getValidCover(item.cover, url)}"></div>
                <p>${item.artist || "Артист"}</p>
            </div>`;
    }).join("");
}

function renderUpcoming(data) {
    const container = document.getElementById("upcomingList");
    if (!container) return;
    container.innerHTML = data.map(song => {
        const url = song.src || song.preview || song.url || "";
        return `
            <div class="upcoming-card">
                <div class="progress-container"><div class="progress-bg"></div></div>
                <div class="upcoming-badge">Жакында</div>
                <div class="cover" style="background-image:url('${window.getValidCover(song.cover, url)}')"></div>
                <div class="card-content"><b>${song.artist || "Артист"}</b><p>${song.name || "Аталышы жок"}</p></div>
                <div class="upcoming-play" onclick="togglePlay(this, '${url}')">${iconHTML}</div>
            </div>`;
    }).join("");
}

document.addEventListener('DOMContentLoaded', loadAllContent);
