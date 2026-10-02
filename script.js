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


/* ---------- HERO PHOTO 3D TILT ---------- */
/* A light pointer-driven tilt that adds depth to the photo frame.
   It is skipped entirely for visitors who prefer reduced motion. */

const heroPhoto = document.querySelector(".hero-photo");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (heroPhoto && !prefersReducedMotion.matches && window.matchMedia("(hover: hover)").matches) {
    let tiltFrame = null;
    let targetX = 0;
    let targetY = 0;

    const renderTilt = () => {
        tiltFrame = null;

        const currentX = parseFloat(heroPhoto.style.getPropertyValue("--tilt-current-x")) || 0;
        const currentY = parseFloat(heroPhoto.style.getPropertyValue("--tilt-current-y")) || 0;

        const nextX = currentX + (targetX - currentX) * 0.14;
        const nextY = currentY + (targetY - currentY) * 0.14;

        heroPhoto.style.setProperty("--tilt-current-x", nextX.toFixed(4));
        heroPhoto.style.setProperty("--tilt-current-y", nextY.toFixed(4));

        heroPhoto.style.setProperty("--tilt-x", `${(-nextY * 7).toFixed(2)}deg`);
        heroPhoto.style.setProperty("--tilt-y", `${(nextX * 9).toFixed(2)}deg`);

        if (Math.abs(targetX - nextX) > 0.001 || Math.abs(targetY - nextY) > 0.001) {
            tiltFrame = requestAnimationFrame(renderTilt);
        }
    };

    const queueTilt = () => {
        if (!tiltFrame) {
            tiltFrame = requestAnimationFrame(renderTilt);
        }
    };

    window.addEventListener(
        "pointermove",
        (event) => {
            targetX = (event.clientX / window.innerWidth) * 2 - 1;
            targetY = (event.clientY / window.innerHeight) * 2 - 1;
            queueTilt();
        },
        { passive: true }
    );

    window.addEventListener("pointerleave", () => {
        targetX = 0;
        targetY = 0;
        queueTilt();
    });
}
