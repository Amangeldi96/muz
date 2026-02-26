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
// ==========================================
// 5. PALETTE DRAWING EFFECT
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.querySelector(".theme-toggle");
    if (!toggle) return;

    const svg = toggle.querySelector(".palette-icon");
    if (!svg) return;

    // Hover flag
    let isAnimating = false;

    toggle.addEventListener("mouseenter", () => {
        if (isAnimating) return;
        isAnimating = true;

        // SVG өлчөмүнө тийбестен класс кошуу
        toggle.classList.add("drawing");
        toggle.classList.remove("animate");
        void toggle.offsetWidth; // reflow гана, layout бузбайт
        toggle.classList.add("animate");

        // Анимация бүткөндө flag өчүрүү
        setTimeout(() => {
            isAnimating = false;
        }, 1300);
    });

    toggle.addEventListener("mouseleave", () => {
        toggle.classList.remove("drawing", "animate");
        isAnimating = false;
    });
});