// ==========================================
// МЕНЮ ЖАНА ТЕМА БАШКАРУУ (header.js)
// ==========================================

// 1. Менюну ачуу/жабуу функциясы
window.toggleMenu = function(event) {
    if (event) event.stopPropagation();
    document.body.classList.toggle('menu-open');
};

// 2. Экрандын каалаган жерин басканда менюну жабуу
document.addEventListener('click', function(event) {
    const sideMenu = document.querySelector('.side-menu');
    const menuBtn = document.querySelector('.menu-btn');
    const isMenuOpen = document.body.classList.contains('menu-open');

    if (isMenuOpen && sideMenu && !sideMenu.contains(event.target) && !menuBtn.contains(event.target)) {
        document.body.classList.remove('menu-open');
    }
});

// 3. Теманы алмаштыруу (Бириктирилген вариант)
window.changeTheme = function(themeName) {
    const themes = ['light', 'dark', 'gold', 'green', 'red'];
    
    // Бардык эски темаларды өчүрүү
    document.body.classList.remove(...themes);
    document.documentElement.classList.remove(...themes);
    
    // Жаңы теманы кошуу
    document.body.classList.add(themeName);
    document.documentElement.classList.add(themeName);
    
    localStorage.setItem('selected-app-theme', themeName);
};

// 4. Баракча жүктөлгөндө сакталган маалыматтарды калыбына келтирүү
document.addEventListener('DOMContentLoaded', () => {
    // Теманы калыбына келтирүү
    const savedTheme = localStorage.getItem('selected-app-theme') || 'dark';
    window.changeTheme(savedTheme);

    // Плеер бардын абалын калыбына келтирүү
    const barVisible = localStorage.getItem('player-bar-visible') === 'true';
    const bar = document.getElementById('playerBar');
    const sw = document.getElementById('barSwitch');
    if (bar) bar.style.display = barVisible ? 'block' : 'none';
    if (sw) sw.classList.toggle('on', barVisible);
});

// ================= 5. НАСТРОЙКАЛАР (МОДАЛКА) =================
window.toggleSettingsModal = function(show) {
    const modal = document.getElementById('sModal');
    if (modal) {
        if (show) modal.classList.add('active');
        else modal.classList.remove('active');
    }
};

window.toggleBarUI = function() {
    const bar = document.getElementById('playerBar');
    const sw = document.getElementById('barSwitch');
    if (bar && sw) {
        const isHidden = bar.style.display === 'none' || bar.style.display === '';
        const newState = isHidden; // Эгер жабык болсо, ачабыз (true)
        
        bar.style.display = newState ? 'block' : 'none';
        sw.classList.toggle('on', newState);
        localStorage.setItem('player-bar-visible', newState);
    }
};

// ================= 6. ПЛЕЕР БАШКАРУУ (Каталарды алдын алуу менен) =================
// Элементтер бар экенин текшерүү
const mainPlayBtn = document.getElementById('mainPlayBtn'); // ID туура экенин текшериңиз
const pCont = document.getElementById('pCont');           // ID туура экенин текшериңиз

if (mainPlayBtn) {
    mainPlayBtn.onclick = () => {
        if (typeof ytPlayer !== 'undefined' && ytPlayer.getPlayerState) {
            const state = ytPlayer.getPlayerState();
            state === 1 ? ytPlayer.pauseVideo() : ytPlayer.playVideo(); // 1 = PLAYING
        }
    };
}

if (pCont) {
    pCont.onclick = (e) => {
        if (typeof ytPlayer !== 'undefined' && ytPlayer.getDuration) {
            const rect = pCont.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const dur = ytPlayer.getDuration();
            if (dur > 0) ytPlayer.seekTo(percent * dur, true);
        }
    };
}