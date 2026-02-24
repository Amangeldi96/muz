// ================= 1. FIREBASE ЖАНА КИТЕПКАНАЛАР =================
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

// ================= 2. НЕГИЗГИ ОБЪЕКТТЕР ЖАНА ИКОНКАЛАР =================
let ytPlayer; 
let currentBtn = null; 
let progressInterval;

const iconHTML = `<svg width="20" height="20" viewBox="0 0 25 25" fill="none"><path d="M7.98 3.51C5.43 4.39 4.98 9.1 4.98 12.41s.43 8.01 3 8.91c2.71.93 11-5.16 11-8.91s-8.29-9.83-11-8.9z" fill="#ffffff"/></svg>`;
const pauseIconHTML = `<svg width="20" height="20" viewBox="0 0 25 25" fill="none"><path d="M10 6.42c0-1.66-1.34-3-3-3s-3 1.34-3 3v12c0 1.66 1.34 3 3 3s3-1.34 3-3V6.42zM20 6.42c0-1.66-1.34-3-3-3s-3 1.34-3 3v12c0 1.66 1.34 3 3 3s3-1.34 3-3V6.42z" fill="#ffffff"/></svg>`;
const loadingHTML = `<div class="is-loading-circle"></div>`;

// ================= 3. YOUTUBE API ИНИЦИАЛИЗАЦИЯ =================
// API скриптин динамикалык жүктөө
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

window.onYouTubeIframeAPIReady = function() {
    ytPlayer = new YT.Player('ytPlayer', {
        height: '0', width: '0',
        playerVars: { 'autoplay': 0, 'controls': 0, 'playsinline': 1, 'rel': 0 },
        events: { 
            'onStateChange': onPlayerStateChange 
        }
    });
};

// ================= 4. ГЛОБАЛДЫК БАШКАРУУ ФУНКЦИЯЛАРЫ =================
window.extractVideoId = function(url) {
    if(!url) return "";
    const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = String(url).match(regExp);
    return (match && match[1].length === 11) ? match[1] : url;
};

window.togglePlay = function(btn, src) {
    if (!ytPlayer || typeof ytPlayer.loadVideoById !== 'function') return;

    const vid = window.extractVideoId(src);
    if (!vid) return;

    // Эгер ошол эле ыр басылса
    if (currentBtn === btn) {
        const state = ytPlayer.getPlayerState();
        state === YT.PlayerState.PLAYING ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
        return;
    }

    // Жаңы ырды жүктөө
    if (currentBtn) { 
        currentBtn.innerHTML = iconHTML; 
        resetProgressBar(currentBtn); 
    }

    currentBtn = btn;
    btn.innerHTML = loadingHTML;
    ytPlayer.loadVideoById(vid);
    ytPlayer.playVideo();
};

function onPlayerStateChange(event) {
    if (!currentBtn) return;
    
    if (event.data === YT.PlayerState.PLAYING) {
        currentBtn.innerHTML = pauseIconHTML;
        startProgressTracking();
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        currentBtn.innerHTML = iconHTML;
        if (event.data === YT.PlayerState.ENDED) {
            resetProgressBar(currentBtn);
            currentBtn = null;
        }
    }
}

function startProgressTracking() {
    clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (ytPlayer && ytPlayer.getDuration && currentBtn) {
            const curr = ytPlayer.getCurrentTime();
            const dur = ytPlayer.getDuration();
            if (dur > 0) {
                const percent = (curr / dur) * 100;
                // Кайсы гана стиль болбосун, анын ичиндеги .progress-bg табат
                const parent = currentBtn.closest('.upcoming-card, .block, .song-item, .top-5-card');
                const bar = parent ? parent.querySelector('.progress-bg') : null;
                if (bar) bar.style.width = percent + '%';
            }
        }
    }, 500);
}

function resetProgressBar(btn) {
    const parent = btn.closest('.upcoming-card, .block, .song-item, .top-5-card');
    const bar = parent ? parent.querySelector('.progress-bg') : null;
    if (bar) bar.style.width = '0%';
}

// ================= 5. FIREBASE ЖҮКТӨӨ ЖАНА РЕНДЕР =================
async function loadContent() {
    await Promise.all([
        loadCollection("top_hits", renderTopHits),
        loadCollection("hits", renderHits),
        loadCollection("upcoming", renderUpcoming)
    ]);
}

async function loadCollection(name, callback) {
    const q = query(collection(db, name), orderBy("created_at", "desc"));
    const snap = await getDocs(q);
    callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
}

// Рендер функциялары (Скриншоттордогу стилдерге ылайык)
function renderTopHits(data) {
    const container = document.getElementById('albumList');
    if (!container) return;
    container.innerHTML = data.map(song => `
        <div class="block">
            <div class="progress-container"><div class="progress-bg"></div></div>
            <div class="song-image" style="background-image: url('${song.cover || `https://img.youtube.com/vi/${window.extractVideoId(song.url)}/mqdefault.jpg`}');"></div>
            <div class="block-text"><b>${song.artist}</b><p>${song.name}</p></div>
            <div class="mini-play" onclick="togglePlay(this, '${song.url}')">${iconHTML}</div>
        </div>`).join("");
}

function renderHits(data) {
    const container = document.getElementById('hitList');
    if (!container) return;
    container.innerHTML = data.map(song => `
        <div class="song-item">
            <div class="progress-container" style="position:absolute; bottom:0; width:100%; height:2px;"><div class="progress-bg"></div></div>
            <div class="play-icon-circle" onclick="togglePlay(this, '${song.url}')">${iconHTML}</div>
            <div class="song-name"><b>${song.name}</b><span>${song.artist}</span></div>
        </div>`).join("");
}

function renderUpcoming(data) {
    const container = document.getElementById("upcomingList");
    if (!container) return;
    container.innerHTML = data.map(song => `
        <div class="upcoming-card">
            <div class="progress-container"><div class="progress-bg"></div></div>
            <div class="upcoming-badge">Жакында</div>
            <div class="cover" style="background-image:url('${song.cover || `https://img.youtube.com/vi/${window.extractVideoId(song.url)}/mqdefault.jpg`}')"></div>
            <div class="card-content"><b>${song.artist}</b><p>${song.name}</p></div>
            <div class="upcoming-play" onclick="togglePlay(this, '${song.url}')">${iconHTML}</div>
        </div>`).join("");
}

document.addEventListener('DOMContentLoaded', loadContent);
