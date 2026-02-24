// 1. FIREBASE ЖАНА КИТЕПКАНАЛАР
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    query, 
    orderBy 
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

// ================= НЕГИЗГИ ОБЪЕКТТЕР =================
let ytPlayer;       
let storyYtPlayer;  
let currentBtn = null; 
let progressInterval;
let storyProgressInterval;
let isStoryDragging = false; 

const storyModal = document.getElementById('storyFullscreen');
const storyStatusBar = document.getElementById('statusBar');
const storyProgressContainer = document.getElementById('progressBarContainer');

const iconHTML = `<svg width="20" height="20" viewBox="0 0 25 25" fill="none"><g transform="translate(1, 0)"><path d="M7.98047 3.51001C5.43047 4.39001 4.98047 9.09992 4.98047 12.4099C4.98047 15.7199 5.41047 20.4099 7.98047 21.3199C10.6905 22.2499 18.9805 16.1599 18.9805 12.4099C18.9805 8.65991 10.6905 2.58001 7.98047 3.51001Z" fill="#ffffff"></path></g></svg>`;
const pauseIconHTML = `<svg width="20" height="20" viewBox="0 0 25 25" fill="none"><g transform="translate(1.5, 1) scale(0.9)"><path d="M10 6.42004C10 4.76319 8.65685 3.42004 7 3.42004C5.34315 3.42004 4 4.76319 4 6.42004V18.42C4 20.0769 5.34315 21.42 7 21.42C8.65685 21.42 10 20.0769 10 18.42V6.42004Z" fill="#ffffff"></path><path d="M20 6.42004C20 4.76319 18.6569 3.42004 17 3.42004C15.3431 3.42004 14 4.76319 14 6.42004V18.42C14 20.0769 15.3431 21.42 17 21.42C18.6569 21.42 20 20.0769 20 18.42V6.42004Z" fill="#ffffff"></path></g></svg>`;
const loadingHTML = `<div class="is-loading-circle"></div>`;

// ================= ГЛОБАЛДЫК ФУНКЦИЯЛАР =================
window.extractVideoId = function(url) {
    if(!url) return "";
    const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = String(url).match(regExp);
    return (match && match[1].length === 11) ? match[1] : url;
};

window.togglePlay = function(btn, src) {
    if (!ytPlayer || typeof ytPlayer.loadVideoById !== 'function') {
        console.warn("YouTube Player даяр эмес...");
        return;
    }
    const vid = window.extractVideoId(src);
    if (!vid) return;

    if (storyModal && storyModal.style.display === 'block') window.closeStory();

    if (currentBtn === btn) {
        const state = ytPlayer.getPlayerState();
        state === YT.PlayerState.PLAYING ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
        return;
    }
    if (currentBtn) { 
        currentBtn.innerHTML = iconHTML; 
        resetProgressBar(currentBtn); 
    }
    currentBtn = btn;
    btn.innerHTML = loadingHTML;
    ytPlayer.loadVideoById(vid);
    ytPlayer.playVideo();
};

window.viewStory = function(videoId) {
    const vid = window.extractVideoId(videoId);
    if (!vid) return;
    if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo(); 
    storyModal.style.display = 'block';
    storyStatusBar.style.width = '0%';
    storyYtPlayer.loadVideoById(vid);
    storyYtPlayer.playVideo();
};

window.closeStory = function() { 
    storyModal.style.display = 'none'; 
    if (storyYtPlayer) storyYtPlayer.stopVideo();
    clearInterval(storyProgressInterval);
};

// ================= YOUTUBE API EVENTТЕР =================
window.onYouTubeIframeAPIReady = function() {
    ytPlayer = new YT.Player('ytPlayer', {
        height: '0', width: '0',
        playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1, 'enablejsapi': 1 },
        events: { 
            'onStateChange': (e) => {
                if (!currentBtn) return;
                if (e.data === YT.PlayerState.PLAYING) {
                    currentBtn.innerHTML = pauseIconHTML;
                    startProgressTracking();
                } else if (e.data === YT.PlayerState.ENDED || e.data === YT.PlayerState.PAUSED) {
                    currentBtn.innerHTML = iconHTML;
                    if (e.data === YT.PlayerState.ENDED) {
                        resetProgressBar(currentBtn);
                        currentBtn = null;
                    }
                }
            }
        }
    });

    storyYtPlayer = new YT.Player('storyYoutubePlayer', {
        height: '100%', width: '100%',
        playerVars: { 'playsinline': 1, 'controls': 0, 'rel': 0, 'modestbranding': 1, 'iv_load_policy': 3 },
        events: { 
            'onStateChange': (e) => {
                if (e.data === YT.PlayerState.PLAYING) startStoryProgress();
                else if (e.data === YT.PlayerState.ENDED) window.closeStory();
            }
        }
    });
};

// ================= ПРОГРЕСС ТРЕКИНГ =================
function startProgressTracking() {
    clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (ytPlayer && ytPlayer.getDuration && currentBtn) {
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

function startStoryProgress() {
    clearInterval(storyProgressInterval);
    storyProgressInterval = setInterval(() => {
        if (storyYtPlayer && storyYtPlayer.getCurrentTime && !isStoryDragging) {
            const curr = storyYtPlayer.getCurrentTime();
            const dur = storyYtPlayer.getDuration();
            if (dur > 0) storyStatusBar.style.width = (curr / dur) * 100 + '%';
        }
    }, 50);
}

// ================= FIREBASE ЖҮКТӨӨ =================
async function loadContent() {
    console.log("Маалыматтар жүктөлүүдө...");
    await Promise.all([
        loadCollection("shorts", renderShorts),
        loadCollection("top_hits", renderTopHits),
        loadCollection("hits", renderHits),
        loadCollection("upcoming", renderUpcoming)
    ]);
}

async function loadCollection(name, callback) {
    try {
        const q = query(collection(db, name), orderBy("created_at", "desc"));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`${name} жүктөлдү:`, data.length);
        callback(data);
    } catch (err) {
        console.warn(`${name} иреттөөсүз жүктөлүүдө...`);
        try {
            const snap = await getDocs(collection(db, name));
            callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (e) { console.error(`${name} жүктөө катасы:`, e); }
    }
}

// ================= РЕНДЕРДЕР =================
function renderShorts(data) {
    const container = document.getElementById("shortsList");
    if (!container) return;
    container.innerHTML = data.map(item => {
        const url = item.src || item.url || "";
        return `
        <div class="story-item" onclick="viewStory('${url}')">
            <div class="story-circle"><img src="${item.cover || `https://img.youtube.com/vi/${window.extractVideoId(url)}/mqdefault.jpg`}" onerror="this.src='https://via.placeholder.com/100'"></div>
            <p>${item.artist || "Артист"}</p>
        </div>`;
    }).join("");
}

function renderTopHits(data) {
    const container = document.getElementById('albumList');
    if (!container) return;
    container.innerHTML = data.map(song => {
        const url = song.src || song.url || "";
        return `
        <div class="block">
            <div class="progress-container"><div class="progress-bg"></div></div>
            <div class="song-image" style="background-image: url('${song.cover || `https://img.youtube.com/vi/${window.extractVideoId(url)}/mqdefault.jpg`}');"></div>
            <div class="block-text"><b>${song.artist || "Артист"}</b><p>${song.name || song.title || "Аталышы жок"}</p></div>
            <div class="mini-play" onclick="togglePlay(this, '${url}')">${iconHTML}</div>
        </div>`;
    }).join("");
}

function renderHits(data) {
    const container = document.getElementById('hitList');
    if (!container) return;
    container.innerHTML = data.map(song => {
        const url = song.src || song.url || "";
        return `
        <div class="song-item">
            <div class="progress-container" style="position:absolute; bottom:0; width:100%; height:2px;"><div class="progress-bg"></div></div>
            <div class="play-icon-circle" onclick="togglePlay(this, '${url}')">${iconHTML}</div>
            <div class="song-name"><b>${song.name || song.title || "Аталышы жок"}</b><span>${song.artist || "Артист"}</span></div>
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
            <div class="cover" style="background-image:url('${song.cover || `https://img.youtube.com/vi/${window.extractVideoId(url)}/mqdefault.jpg`}')"></div>
            <div class="card-content"><b>${song.artist || "Артист"}</b><p>${song.name || song.title || "Аталышы жок"}</p></div>
            <div class="upcoming-play" onclick="togglePlay(this, '${url}')">${iconHTML}</div>
        </div>`;
    }).join("");
}

// Скраббинг логикасы
if (storyProgressContainer) {
    const handleScrub = (e) => {
        const rect = storyProgressContainer.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const x = clientX - rect.left;
        let percent = Math.min(Math.max(0, x / rect.width), 1);
        storyStatusBar.style.width = (percent * 100) + '%';
        if (isStoryDragging && storyYtPlayer && storyYtPlayer.getDuration) {
            storyYtPlayer.seekTo(percent * storyYtPlayer.getDuration(), true);
        }
    };
    storyProgressContainer.addEventListener('mousedown', (e) => { isStoryDragging = true; handleScrub(e); });
    storyProgressContainer.addEventListener('touchstart', (e) => { isStoryDragging = true; handleScrub(e); });
    window.addEventListener('mouseup', () => isStoryDragging = false);
    window.addEventListener('touchend', () => isStoryDragging = false);
}

document.addEventListener('DOMContentLoaded', loadContent);
