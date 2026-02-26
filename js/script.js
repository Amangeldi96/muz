// 1. FIREBASE ЖАНА КИТЕПКАНАЛАР (Өзгөртүүсүз калат)
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
let wakeLock = null;

const iconHTML = `<svg width="20" height="20" viewBox="0 0 25 25" fill="none"><g transform="translate(1, 0)"><path d="M7.98047 3.51001C5.43047 4.39001 4.98047 9.09992 4.98047 12.4099C4.98047 15.7199 5.41047 20.4099 7.98047 21.3199C10.6905 22.2499 18.9805 16.1599 18.9805 12.4099C18.9805 8.65991 10.6905 2.58001 7.98047 3.51001Z" fill="#ffffff"></path></g></svg>`;
const pauseIconHTML = `<svg width="20" height="20" viewBox="0 0 25 25" fill="none"><g transform="translate(1.5, 1) scale(0.9)"><path d="M10 6.42004C10 4.76319 8.65685 3.42004 7 3.42004C5.34315 3.42004 4 4.76319 4 6.42004V18.42C4 20.0769 5.34315 21.42 7 21.42C8.65685 21.42 10 20.0769 10 18.42V6.42004Z" fill="#ffffff"></path><path d="M20 6.42004C20 4.76319 18.6569 3.42004 17 3.42004C15.3431 3.42004 14 4.76319 14 6.42004V18.42C14 20.0769 15.3431 21.42 17 21.42C18.6569 21.42 20 20.0769 20 18.42V6.42004Z" fill="#ffffff"></path></g></svg>`;
const loadingHTML = `<div class="is-loading-circle"></div>`; 

const storyModal = document.getElementById('storyFullscreen');
const storyStatusBar = document.getElementById('statusBar');

// ================= 2.1 ПЛЕЙБАР ЭЛЕМЕНТТЕРИ =================
const mainPlayBtn = document.getElementById('mainPlayBtn');
const pFill = document.getElementById('pFill');
const pHandle = document.getElementById('pHandle');
const pCont = document.getElementById('pCont');
const pTitle = document.getElementById('pTitle');
const pArtist = document.getElementById('pArtist');

// Иконка баракча ачылары менен дароо чыгышы үчүн:
if (mainPlayBtn) mainPlayBtn.innerHTML = iconHTML + loadingHTML;

// ================= 3. YOUTUBE API ЖАНА ЛОГИКА =================
if (!window.YT) {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

window.onYouTubeIframeAPIReady = function() {
    ytPlayer = new YT.Player('ytPlayer', {
        height: '0', width: '0',
        playerVars: { 
            'playsinline': 1, 'controls': 0, 'enablejsapi': 1, 'autoplay': 0,
            'origin': window.location.origin
        },
        events: { 
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError,
            'onReady': (e) => { 
                e.target.unMute();
                if (mainPlayBtn && !currentBtn) mainPlayBtn.innerHTML = iconHTML + loadingHTML;
            } 
        }
    });

    storyYtPlayer = new YT.Player('storyYoutubePlayer', {
        height: '100%', width: '100%',
        playerVars: { 'playsinline': 1, 'controls': 0, 'rel': 0, 'modestbranding': 1, 'iv_load_policy': 3 },
        events: { 'onStateChange': onStoryPlayerStateChange }
    });
};

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
        state === YT.PlayerState.PLAYING ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
        return;
    }

    if (currentBtn) { 
        currentBtn.classList.remove('is-loading');
        currentBtn.innerHTML = iconHTML + loadingHTML;
        resetProgressBar(currentBtn); 
    }
    
    currentBtn = btn;
    currentBtn.classList.add('is-loading');
    
    const parent = btn.closest('.upcoming-card, .block, .song-item');
    if (parent && pTitle && pArtist) {
        pTitle.innerText = parent.querySelector('b').innerText;
        pArtist.innerText = parent.querySelector('p, span').innerText;
    }

    ytPlayer.loadVideoById(vid);
    ytPlayer.playVideo();
};

function onPlayerStateChange(event) {
    const isPlaying = event.data === YT.PlayerState.PLAYING;
    const isBuffering = event.data === YT.PlayerState.BUFFERING;
    const targetHTML = isPlaying ? (pauseIconHTML + loadingHTML) : (iconHTML + loadingHTML);

    if (mainPlayBtn) {
        mainPlayBtn.classList.toggle('is-loading', isBuffering);
        mainPlayBtn.innerHTML = targetHTML;
    }

    if (currentBtn) {
        currentBtn.classList.toggle('is-loading', isBuffering);
        currentBtn.innerHTML = targetHTML;
    }

    if (isPlaying) startProgressTracking();
    if (event.data === YT.PlayerState.ENDED && currentBtn) resetProgressBar(currentBtn);
}

function onPlayerError() {
    [currentBtn, mainPlayBtn].forEach(b => {
        if(b) { b.classList.remove('is-loading'); b.innerHTML = iconHTML + loadingHTML; }
    });
}

function startProgressTracking() {
    clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (ytPlayer && ytPlayer.getCurrentTime) {
            const curr = ytPlayer.getCurrentTime();
            const dur = ytPlayer.getDuration();
            if (dur > 0) {
                const percent = (curr / dur) * 100;
                if (currentBtn) {
                    const parent = currentBtn.closest('.upcoming-card, .block, .song-item');
                    const bar = parent ? parent.querySelector('.progress-bg') : null;
                    if (bar) bar.style.width = percent + '%';
                }
                if (pFill) pFill.style.width = percent + '%';
                if (pHandle) pHandle.style.left = percent + '%';
            }
        }
    }, 500);
}

function resetProgressBar(btn) {
    const parent = btn.closest('.upcoming-card, .block, .song-item');
    const bar = parent ? parent.querySelector('.progress-bg') : null;
    if (bar) bar.style.width = '0%';
    if (pFill) pFill.style.width = '0%';
    if (pHandle) pHandle.style.left = '0%';
}


// ================= 6. СТОРИЗ =================
window.viewStory = function(videoId) {
    if (!storyModal || !storyYtPlayer) return;
    if (ytPlayer) ytPlayer.pauseVideo();
    storyModal.style.display = 'block';
    storyYtPlayer.loadVideoById(window.extractVideoId(videoId));
};

window.closeStory = function() {
    if (storyModal) storyModal.style.display = 'none';
    if (storyYtPlayer) storyYtPlayer.stopVideo();
    clearInterval(storyProgressInterval);
};

function onStoryPlayerStateChange(e) {
    if (e.data === YT.PlayerState.PLAYING) {
        clearInterval(storyProgressInterval);
        storyProgressInterval = setInterval(() => {
            const curr = storyYtPlayer.getCurrentTime();
            const dur = storyYtPlayer.getDuration();
            if (dur > 0 && storyStatusBar) storyStatusBar.style.width = (curr / dur * 100) + '%';
        }, 50);
    } else if (e.data === YT.PlayerState.ENDED) window.closeStory();
}

// ================= 7. FIREBASE ЖҮКТӨӨ =================
async function loadAllContent() {
    const savedTheme = localStorage.getItem('selected-app-theme');
    if (savedTheme) document.body.className = savedTheme;

    loadCollection("top_hits", renderTopHits);
    loadCollection("hits", renderHits);
    loadCollection("shorts", renderShorts);
    loadCollection("upcoming", renderUpcoming);

    const isVisible = localStorage.getItem('player-bar-visible') === 'true';
    const bar = document.getElementById('playerBar');
    const sw = document.getElementById('barSwitch');
    if (bar) bar.style.display = isVisible ? 'block' : 'none';
    if (sw) sw.classList.toggle('on', isVisible);
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
            <div class="mini-play" onclick="togglePlay(this, '${url}')">${iconHTML}${loadingHTML}</div>
        </div>`;
    }).join("");
}

function renderHits(data) {
    const container = document.getElementById('hitList');
    if (!container) return;
    container.innerHTML = data.map(song => `
        <div class="song-item">
            <div class="progress-container" style="position:absolute; bottom:0; width:100%; height:2px;"><div class="progress-bg"></div></div>
            <div class="play-icon-circle" onclick="togglePlay(this, '${song.src || song.url}')">${iconHTML}${loadingHTML}</div>
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
                <div class="upcoming-play" onclick="togglePlay(this, '${url}')">${iconHTML}${loadingHTML}</div>
            </div>`;
    }).join("");
}

document.addEventListener('DOMContentLoaded', loadAllContent);
            
