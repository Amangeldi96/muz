// ==========================================
// МЕНЮ ЖАНА ТЕМА БАШКАРУУ (header.js)
// ==========================================

// 1. Менюну ачуу/жабуу функциясы
window.toggleMenu = function(event) {
    if (event) event.stopPropagation(); // Баскычты басканда "click" окуясы ары кетпеши үчүн
    document.body.classList.toggle('menu-open');
    console.log("Меню абалы: " + document.body.classList.contains('menu-open'));
};

// 2. Экрандын каалаган жерин басканда менюну жабуу
document.addEventListener('click', function(event) {
    const sideMenu = document.querySelector('.side-menu');
    const menuBtn = document.querySelector('.menu-btn');
    const isMenuOpen = document.body.classList.contains('menu-open');

    // Эгер меню ачык болсо ЖАНА басылган жер менюнун же баскычтын ичинде болбосо
    if (isMenuOpen && sideMenu && !sideMenu.contains(event.target) && !menuBtn.contains(event.target)) {
        document.body.classList.remove('menu-open');
        console.log("Бош жер басылды, меню жабылды");
    }
});

// 3. Теманы алмаштыруу
window.changeTheme = function(themeName) {
    const themes = ['light', 'dark', 'gold', 'green', 'red'];
    document.body.classList.remove(...themes);
    document.documentElement.classList.remove(...themes);
    
    document.body.classList.add(themeName);
    document.documentElement.classList.add(themeName);
    
    localStorage.setItem('selected-app-theme', themeName);
};

// 4. Баракча жүктөлгөндө теманы калыбына келтирүү
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('selected-app-theme') || 'dark';
    window.changeTheme(savedTheme);
});
// 4. Баракча жүктөлгөндө теманы калыбына келтирүү
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('selected-app-theme') || 'dark';
    window.changeTheme(savedTheme);
});

// ================= 5. НАСТРОЙКАЛАР (МОДАЛКА) =================
window.toggleSettingsModal = function(show) {
    const modal = document.getElementById('sModal');
    if (modal) {
        if (show) modal.classList.add('active');
        else modal.classList.remove('active');
    }
};

window.changeTheme = function(theme) {
    document.body.className = theme;
    localStorage.setItem('selected-app-theme', theme);
};

window.toggleBarUI = function() {
    const bar = document.getElementById('playerBar');
    const sw = document.getElementById('barSwitch');
    if (bar && sw) {
        const isHidden = bar.style.display === 'none' || bar.style.display === '';
        bar.style.display = isHidden ? 'block' : 'none';
        sw.classList.toggle('on', isHidden);
        localStorage.setItem('player-bar-visible', isHidden);
    }
};

if (mainPlayBtn) {
    mainPlayBtn.onclick = () => {
        if (!ytPlayer || typeof ytPlayer.getPlayerState !== 'function') return;
        const state = ytPlayer.getPlayerState();
        state === YT.PlayerState.PLAYING ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
    };
}

if (pCont) {
    pCont.onclick = (e) => {
        if (!ytPlayer) return;
        const rect = pCont.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const dur = ytPlayer.getDuration();
        if (dur > 0) ytPlayer.seekTo(percent * dur, true);
    };
}
