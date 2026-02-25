(async function() {
    // ================= 1. FIREBASE ТУТАШУУ =================
    const firebaseApp = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js");
    const firebaseFirestore = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");

    const firebaseConfig = {
        apiKey: "AIzaSyAneBm46gs6L73E5O0GWFHKz9twnTmFIeo",
        authDomain: "music-edcd3.firebaseapp.com",
        projectId: "music-edcd3",
        storageBucket: "music-edcd3.firebasestorage.app",
        messagingSenderId: "514206966226",
        appId: "1:514206966226:web:b588818706c4c0d901680b"
    };

    const app = firebaseApp.initializeApp(firebaseConfig);
    const db = firebaseFirestore.getFirestore(app);

    // ================= 2. ӨЗГӨРМӨЛӨР =================
    let ytPlayer;
    let progressInterval;
    let currentBtn = null;
    let currentSrcTitle = ""; 
    let currentIndex = -1;
    let isDragging = false; 
    let blockAutoUpdate = false; 
    let currentSongsList = [];

    const listDiv = document.getElementById('allList');
    const playerBar = document.getElementById('playerBar');
    const pFill = document.getElementById('pFill');
    const pCont = document.getElementById('pCont');
    const mainPlayBtn = document.getElementById('mainPlayBtn');
    const nextBtn = document.getElementById('nextBtn');
    const searchInput = document.getElementById('searchInput');
    const handle = document.querySelector('.p-handle');

    // Спинер жана Жумшак жылдыруу стилдери
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .is-loading-circle {
            width: 24px; height: 24px;
            border: 3px solid rgba(255,255,255,0.2);
            border-top: 3px solid #fff;
            border-radius: 50%;
            animation: spin 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        /* Жөнөкөй учурда жумшак жылат */
        #pFill, .p-handle { transition: width 0.2s linear; }
        /* Сүйрөп жатканда анимацияны өчүрөбүз (манжага жабышуу үчүн) */
        #pCont:active #pFill, #pCont:active .p-handle { transition: none !important; }
    `;
    document.head.appendChild(style);

      // ================= ИКОНКАЛАР =================
    const getPlayIcon = () => `<svg width="24" height="24" viewBox="-0.5 0 25 25" fill="none"><path d="M7.98047 3.51001C5.43047 4.39001 4.98047 9.09992 4.98047 12.4099C4.98047 15.7199 5.41047 20.4099 7.98047 21.3199C10.6905 22.2499 18.9805 16.1599 18.9805 12.4099C18.9805 8.65991 10.6905 2.58001 7.98047 3.51001Z" fill="#ffffff"></path></svg>`;
    const getPauseIcon = () => `<svg width="24" height="24" viewBox="-0.5 0 25 25" fill="none"><path d="M10 6.42004C10 4.76319 8.65685 3.42004 7 3.42004C5.34315 3.42004 4 4.76319 4 6.42004V18.42C4 20.0769 5.34315 21.42 7 21.42C8.65685 21.42 10 20.0769 10 18.42V6.42004ZM20 6.42004C20 4.76319 18.6569 3.42004 17 3.42004C15.3431 3.42004 14 4.76319 14 6.42004V18.42C14 20.0769 15.3431 21.42 17 21.42C18.6569 21.42 20 20.0769 20 18.42V6.42004Z" fill="#ffffff"></path></svg>`;
    const getLoadingIcon = () => `<div class="is-loading-circle"></div>`;
    const getNextIcon = () => `<svg width="24" height="24" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.98047 3.51001C1.43047 4.39001 0.980469 9.09992 0.980469 12.4099C0.980469 15.7199 1.41047 20.4099 3.98047 21.3199C6.69047 22.2499 14.9805 16.1599 14.9805 12.4099C14.9805 8.65991 6.69047 2.58001 3.98047 3.51001Z" fill="white"/><path d="M23 5.92004C23 4.53933 21.8807 3.42004 20.5 3.42004C19.1193 3.42004 18 4.53933 18 5.92004V18.92C18 20.3008 19.1193 21.42 20.5 21.42C21.8807 21.42 23 20.3008 23 18.92V5.92004Z" fill="white"/></svg>`;
    
    // ================= 3. FIREBASE МААЛЫМАТТАРЫ =================
    function fetchSongsFromFirebase() {
        const { collection, query, orderBy, onSnapshot } = firebaseFirestore;
        const qNew = query(collection(db, "new_hits"), orderBy("created_at", "desc"));
        const qHits = query(collection(db, "hits"), orderBy("created_at", "desc"));

        let newHitsArr = [], hitsArr = [];

        const combine = () => {
            currentSongsList = [...newHitsArr, ...hitsArr].map(item => ({
                artist: item.artist || "Белгисиз",
                title: item.name || "Аталышы жок",
                src: item.src
            }));
            window.renderSongs(currentSongsList);
        };

        onSnapshot(qNew, (snap) => { newHitsArr = snap.docs.map(doc => doc.data()); combine(); });
        onSnapshot(qHits, (snap) => { hitsArr = snap.docs.map(doc => doc.data()); combine(); });
    }

    // ================= 4. ПЛЕЕР ЛОГИКАСЫ =================
    function setIcons(state){
        const icon = (state === "playing") ? getPauseIcon() : (state === "loading" ? getLoadingIcon() : getPlayIcon());
        if(currentBtn) currentBtn.innerHTML = icon;
        if(mainPlayBtn) mainPlayBtn.innerHTML = icon;
    }

    window.onYouTubeIframeAPIReady = function() {
        ytPlayer = new YT.Player('ytPlayer', {
            events: { 'onStateChange': onPlayerStateChange }
        });
    };

    function initPlayer() {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(tag);
        } else if (YT.Player) {
            window.onYouTubeIframeAPIReady();
        }
    }

    function onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.PLAYING) {
            setIcons("playing");
            blockAutoUpdate = false;
            startProgressTracking();
        } else if (event.data === YT.PlayerState.BUFFERING) {
            setIcons("loading");
        } else if (event.data === YT.PlayerState.ENDED) {
            window.playNext();
        } else if (event.data === YT.PlayerState.PAUSED) {
            if (!isDragging) setIcons("paused");
        }
    }

    // ================= ПЕРЕМОТКА (YOUTUBE СТИЛИНДЕ) =================
    if(pCont){
        const getPercent = (e) => {
            const rect = pCont.getBoundingClientRect();
            const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : 
                          (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : e.clientX;
            let percent = (clientX - rect.left) / rect.width;
            return Math.max(0, Math.min(1, percent));
        };

        const handleStart = (e) => {
            isDragging = true;
            blockAutoUpdate = true;
            if(ytPlayer && ytPlayer.getPlayerState() === 1) ytPlayer.pauseVideo();
            updateProgressBar(getPercent(e) * 100);
        };

        const handleMove = (e) => {
            if(!isDragging) return;
            if (e.cancelable) e.preventDefault(); 
            requestAnimationFrame(() => {
                if(isDragging) updateProgressBar(getPercent(e) * 100);
            });
        };

        const handleEnd = (e) => {
            if(!isDragging) return;
            const percent = getPercent(e);
            if(ytPlayer && typeof ytPlayer.getDuration === "function") {
                const dur = ytPlayer.getDuration();
                ytPlayer.seekTo(percent * dur, true);
                
                // Кайра ойнотууну камсыздоо (Retry Logic)
                let attempts = 0;
                const retryPlay = setInterval(() => {
                    if (ytPlayer.getPlayerState() !== 1) ytPlayer.playVideo();
                    else clearInterval(retryPlay);
                    if (++attempts > 5) clearInterval(retryPlay);
                }, 150);
            }
            isDragging = false;
            setTimeout(() => { blockAutoUpdate = false; }, 200);
        };

        pCont.addEventListener('mousedown', handleStart);
        pCont.addEventListener('touchstart', handleStart, {passive: false});
        window.addEventListener('mousemove', handleMove, {passive: false});
        window.addEventListener('touchmove', handleMove, {passive: false});
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchend', handleEnd);
        window.addEventListener('touchcancel', handleEnd);
    }

    function updateProgressBar(percent) {
        if(pFill) pFill.style.width = percent + "%";
        if(handle) handle.style.left = percent + "%";
    }

    function startProgressTracking() {
        clearInterval(progressInterval);
        progressInterval = setInterval(() => {
            if (ytPlayer && ytPlayer.getCurrentTime && !isDragging && !blockAutoUpdate) {
                const curr = ytPlayer.getCurrentTime();
                const dur = ytPlayer.getDuration();
                if (dur > 0) updateProgressBar((curr / dur) * 100);
            }
        }, 500);
    }

    window.toggleMainPlay = function() {
        if (!ytPlayer || !ytPlayer.getPlayerState) return;
        const state = ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
        else ytPlayer.playVideo();
    };

    window.togglePlay = function(btn, src, title, artist){
        if(!src) return;
        if(currentSrcTitle === title){ window.toggleMainPlay(); return; }
        if(currentBtn) currentBtn.innerHTML = getPlayIcon();
        currentBtn = btn; 
        currentSrcTitle = title;
        currentIndex = currentSongsList.findIndex(s => s.title === title);
        document.getElementById('pTitle').innerText = title;
        document.getElementById('pArtist').innerText = artist;
        playerBar.classList.add('active');
        setIcons("loading");
        const vidId = src.match(/(?:v=|\/|embed\/|youtu.be\/)([0-9A-Za-z_-]{11})/)?.[1];
        if(vidId) ytPlayer.loadVideoById(vidId);
    };

    window.playNext = function() {
        if(currentSongsList.length === 0) return;
        currentIndex = (currentIndex + 1) % currentSongsList.length;
        const next = currentSongsList[currentIndex];
        const allBtns = listDiv.querySelectorAll('.play-icon-circle');
        window.togglePlay(allBtns[currentIndex], next.src, next.title, next.artist);
    };

    // ================= 5. РЕНДЕР ЖАНА ИЗДӨӨ =================
    window.renderSongs = function(songsToDisplay){
        if(!listDiv) return;
        listDiv.innerHTML = "";
        songsToDisplay.forEach((song, index)=>{
            const div = document.createElement('div');
            div.className = 'song-item';
            div.innerHTML = `
                <div class="play-icon-circle">${getPlayIcon()}</div>
                <div class="song-info">
                    <b>${song.title}</b>
                    <span>${song.artist}</span>
                </div>`;
            const btn = div.querySelector('.play-icon-circle');
            div.onclick = () => window.togglePlay(btn, song.src, song.title, song.artist);
            listDiv.appendChild(div);
        });
    };

    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = currentSongsList.filter(song => 
                song.title.toLowerCase().includes(query) || 
                song.artist.toLowerCase().includes(query)
            );
            window.renderSongs(filtered);
        });
    }

    // ================= 6. БАШТОО ЖАНА БАСКЫЧТАР =================
    if(mainPlayBtn) {
        mainPlayBtn.innerHTML = getPlayIcon();
        mainPlayBtn.onclick = (e) => { e.preventDefault(); window.toggleMainPlay(); };
    }
    if(nextBtn) {
        nextBtn.innerHTML = getNextIcon();
        nextBtn.onclick = (e) => { e.preventDefault(); window.playNext(); };
    }

    initPlayer();
    fetchSongsFromFirebase();

})();
