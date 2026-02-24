/* Сториз үчүн өзгөрмөлөр */
const storyModal = document.getElementById('storyFullscreen');
const storyVideo = document.getElementById('mainVideo');
const storyStatusBar = document.getElementById('statusBar');
const storyProgressContainer = document.getElementById('progressBarContainer');

let isStoryDragging = false; 

// 1. Сториздерди текшерүү (LocalStorage)
window.addEventListener('load', () => {
    const viewedStories = JSON.parse(localStorage.getItem('viewedStories') || '[]');
    document.querySelectorAll('.story-item').forEach(item => {
        if (viewedStories.includes(item.getAttribute('data-id'))) {
            item.classList.add('viewed');
        }
    });
});

/* 2. Сторизди ачуу - ОПТИМАЛДАШТЫРЫЛГАН */
function viewStory(src, element) {
    // Аудио плеерди токтотуу
    if (typeof audio !== 'undefined' && !audio.paused) {
        audio.pause();
        if (typeof currentBtn !== 'undefined' && currentBtn) {
            const icon = currentBtn.querySelector('.play-pause-icon');
            if (icon) icon.classList.replace('is-paused', 'is-playing');
        }
    }

    // Видео ачыла электе прогресс барды нөлгө түшүрүү
    storyStatusBar.style.width = '0%';
    
    // Видеону жүктөө
    storyVideo.src = src;
    storyVideo.load(); // Серверге видеону даярда деп буйрук берет
    storyModal.style.display = 'block';

    // Видео баштапкы кадрларды жүктөп бүткөндө гана ойнотуу
    storyVideo.oncanplay = () => {
        storyVideo.play().catch(e => console.log("Play error:", e));
        storyVideo.oncanplay = null; // Бир эле жолу иштеши үчүн
    };
    
    const id = element.getAttribute('data-id');
    markAsViewed(id);
    element.classList.add('viewed');
}

function markAsViewed(id) {
    let viewedStories = JSON.parse(localStorage.getItem('viewedStories') || '[]');
    if (!viewedStories.includes(id)) {
        viewedStories.push(id);
        localStorage.setItem('viewedStories', JSON.stringify(viewedStories));
    }
}

// 3. Видео прогресси (Тез иштеши үчүн requestAnimationFrame колдонсо болот, бирок ontimeupdate да жарайт)
storyVideo.ontimeupdate = () => {
    if (!isStoryDragging && storyVideo.duration) {
        const percentage = (storyVideo.currentTime / storyVideo.duration) * 100;
        storyStatusBar.style.width = percentage + '%';
    }
};

/* 4. Скраббинг (Прогресс барды жылдыруу) */
function handleStoryScrub(e) {
    if (!storyVideo.duration) return;
    const rect = storyProgressContainer.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    let percent = Math.min(Math.max(0, x / rect.width), 1);
    
    storyStatusBar.style.width = (percent * 100) + '%';
    if (isStoryDragging) {
        storyVideo.currentTime = percent * storyVideo.duration;
    }
}

// Драг функциялары
const startStoryDrag = (e) => { 
    isStoryDragging = true; 
    storyProgressContainer.classList.add('active'); 
    storyVideo.pause(); 
    handleStoryScrub(e); 
};

const stopStoryDrag = () => { 
    if (isStoryDragging) { 
        isStoryDragging = false; 
        storyProgressContainer.classList.remove('active'); 
        storyVideo.play(); 
    } 
};

const moveStoryDrag = (e) => { 
    if (isStoryDragging) {
        if (e.cancelable) e.preventDefault(); 
        handleStoryScrub(e); 
    } 
};

/* Ивенттерди байлоо */
storyProgressContainer.addEventListener('mousedown', startStoryDrag);
storyProgressContainer.addEventListener('touchstart', startStoryDrag, { passive: false });

storyModal.addEventListener('mousemove', moveStoryDrag);
storyModal.addEventListener('touchmove', moveStoryDrag, { passive: false });

window.addEventListener('mouseup', stopStoryDrag);
window.addEventListener('touchend', stopStoryDrag);

// Экранды басканда ойнотуу/токтотуу (Toggle)
function togglePlay() { // HTML'де togglePlay() деп жазылган
    if (storyVideo.paused) {
        storyVideo.play();
    } else {
        storyVideo.pause();
    }
}

// 5. Сторизди жабуу - ТАЗАЛОО
function closeStory() { 
    storyModal.style.display = 'none'; 
    storyVideo.pause();
    // Видеонун эс тутумун бошотуу (Маанилүү!)
    storyVideo.removeAttribute('src'); 
    storyVideo.load(); 
    storyStatusBar.style.width = '0%';
    isStoryDragging = false;
}

storyVideo.onended = closeStory;
