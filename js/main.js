/* ============================================================
   PUNTO & TOMA — JavaScript principal
   - Nav transparente → sólido al hacer scroll (solo index)
   - Carrusel de testimonios (listo para múltiples slides)
   - Hamburger menu móvil
   - Smooth scroll
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     UTILIDAD: esperar al DOM
  ---------------------------------------------------------- */
  function ready(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  /* ----------------------------------------------------------
     NAV — Transparente en hero → sólido al hacer scroll
     Solo aplica en index.html (páginas con .hero)
  ---------------------------------------------------------- */
  function initNav() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    const hasHero = document.querySelector('.hero');

    if (hasHero) {
      // Index: nav empieza transparente
      nav.classList.add('nav--transparent');

      const heroThreshold = 60; // px para cambiar transparente → sólido
      const hideThreshold = 80; // px para ocultar el nav al hacer scroll

      let isHidden   = false;
      let isOnHero   = true;

      function updateNav() {
        const scrollY = window.scrollY;

        // Transparente vs sólido
        if (scrollY > heroThreshold) {
          nav.classList.remove('nav--transparent');
          nav.classList.add('nav--solid');
          isOnHero = false;
        } else {
          nav.classList.remove('nav--solid');
          nav.classList.add('nav--transparent');
          isOnHero = true;
        }

        // Ocultar al hacer scroll fuera del hero
        if (scrollY > hideThreshold && !isOnHero) {
          nav.classList.add('nav--hidden');
          isHidden = true;
        } else {
          nav.classList.remove('nav--hidden');
          isHidden = false;
        }
      }

      // Mostrar nav cuando el mouse entra al área superior
      document.addEventListener('mousemove', (e) => {
        if (isHidden && e.clientY < 80) {
          nav.classList.remove('nav--hidden');
        } else if (isHidden && e.clientY >= 80) {
          nav.classList.add('nav--hidden');
        }
      });

      window.addEventListener('scroll', updateNav, { passive: true });
      updateNav();
    } else {
      // Páginas internas: nav siempre sólido
      nav.classList.add('nav--static');
    }
  }

  /* ----------------------------------------------------------
     HAMBURGER MENU — Menú móvil
  ---------------------------------------------------------- */
  function initHamburger() {
    const hamburger = document.querySelector('.nav__hamburger');
    const mobileMenu = document.querySelector('.nav__mobile-menu');
    const closeBtn   = document.querySelector('.nav__mobile-close');

    if (!hamburger || !mobileMenu) return;

    function openMenu() {
      mobileMenu.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      mobileMenu.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);

    // Cerrar al hacer click en un link del menú
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    // Cerrar con ESC
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ----------------------------------------------------------
     CARRUSEL DE TESTIMONIOS
     Funciona con cualquier número de slides.
     Añade más slides al HTML y el JS los detecta automáticamente.
  ---------------------------------------------------------- */
  function initCarousel() {
    const carousel = document.querySelector('.testimonials__carousel');
    if (!carousel) return;

    const slides = Array.from(carousel.querySelectorAll('.testimonials__slide'));
    const dotsContainer = document.querySelector('.testimonials__dots');
    const prevBtn = carousel.querySelector('.testimonials__arrow--prev');
    const nextBtn = carousel.querySelector('.testimonials__arrow--next');

    if (slides.length === 0) return;

    let current = 0;
    let autoplayTimer = null;
    const AUTOPLAY_DELAY = 6000; // ms entre slides automáticos

    /* Crear dots dinámicamente según el número de slides */
    function buildDots() {
      if (!dotsContainer) return;
      dotsContainer.innerHTML = '';

      slides.forEach(function (_, index) {
        const dot = document.createElement('button');
        dot.classList.add('testimonials__dot');
        dot.setAttribute('aria-label', 'Testimonio ' + (index + 1));
        dot.addEventListener('click', function () {
          goTo(index);
          resetAutoplay();
        });
        dotsContainer.appendChild(dot);
      });
    }

    /* Ir a un slide concreto */
    function goTo(index) {
      // Ocultar slide actual
      slides[current].classList.remove('is-active');

      // Actualizar dot actual
      const dots = dotsContainer ? dotsContainer.querySelectorAll('.testimonials__dot') : [];
      if (dots.length) dots[current].classList.remove('is-active');

      // Calcular siguiente (con wrap-around)
      current = (index + slides.length) % slides.length;

      // Mostrar nuevo slide
      slides[current].classList.add('is-active');
      if (dots.length) dots[current].classList.add('is-active');
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    /* Autoplay */
    function startAutoplay() {
      if (slides.length <= 1) return;
      autoplayTimer = setInterval(next, AUTOPLAY_DELAY);
    }

    function resetAutoplay() {
      clearInterval(autoplayTimer);
      startAutoplay();
    }

    /* Flechas */
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        prev();
        resetAutoplay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        next();
        resetAutoplay();
      });
    }

    /* Swipe táctil */
    let touchStartX = 0;
    carousel.addEventListener('touchstart', function (e) {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    carousel.addEventListener('touchend', function (e) {
      const delta = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(delta) > 50) {
        if (delta < 0) { next(); } else { prev(); }
        resetAutoplay();
      }
    }, { passive: true });

    /* Pausar autoplay al hover */
    carousel.addEventListener('mouseenter', function () {
      clearInterval(autoplayTimer);
    });
    carousel.addEventListener('mouseleave', startAutoplay);

    /* Inicializar */
    buildDots();
    goTo(0);
    startAutoplay();
  }

  /* ----------------------------------------------------------
     SMOOTH SCROLL — Para links ancla internos
  ---------------------------------------------------------- */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /* ----------------------------------------------------------
     INICIALIZAR TODO
  ---------------------------------------------------------- */
  ready(function () {
    initNav();
    initHamburger();
    initSmoothScroll();

    /* El carrusel se inicializa después de que los testimonios
       se cargan desde la API. Exponemos la función globalmente
       para que index.html la llame cuando el fetch termine. */
    window.__reinitCarousel = initCarousel;

    console.log('%cPunto & Toma — Web loaded', 'color: #7C7C6E; font-family: serif; font-size: 14px;');
  });

})();
