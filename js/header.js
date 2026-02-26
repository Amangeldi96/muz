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

    toggle.addEventListener("mouseenter", () => {

        // 1️⃣ Иконка fade болуп жоголот
        svg.style.opacity = "0";

        setTimeout(() => {

            // 2️⃣ Drawing режимге өтөт
            toggle.classList.add("drawing");

            // Анимацияны кайра баштоо
            toggle.classList.remove("animate");
            void toggle.offsetWidth;

            toggle.classList.add("animate");

            svg.style.opacity = "1";

        }, 300);

    });

    toggle.addEventListener("mouseleave", () => {

        // Баштапкы абалга кайтуу
        toggle.classList.remove("drawing", "animate");
        svg.style.opacity = "1";

    });

});