/* =========================================
   ALEX GRAJO PORTFOLIO
   Main JavaScript
   ========================================= */


/* ---------- MOBILE NAVIGATION ---------- */

const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
        navLinks.classList.toggle("active");

        const isOpen = navLinks.classList.contains("active");

        menuToggle.setAttribute("aria-expanded", isOpen);
    });
}


/* ---------- CLOSE MOBILE MENU ---------- */

if (navLinks) {
    const navigationItems = navLinks.querySelectorAll("a");

    navigationItems.forEach((link) => {
        link.addEventListener("click", () => {
            navLinks.classList.remove("active");

            if (menuToggle) {
                menuToggle.setAttribute("aria-expanded", "false");
            }
        });
    });
}


/* ---------- CURRENT YEAR ---------- */

const yearElement = document.querySelector("#current-year");

if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
}
