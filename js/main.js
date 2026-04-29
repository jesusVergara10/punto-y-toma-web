'use strict';

(function () {

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function initNav() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    const hasHero = document.querySelector('.hero');

    if (hasHero) {
      nav.classList.add('nav--transparent');

      const SCROLL_SOLID_THRESHOLD = 60;
      const SCROLL_HIDE_THRESHOLD  = 80;

      let isHidden = false;
      let isOnHero = true;

      function updateNav() {
        const scrollY = window.scrollY;

        if (scrollY > SCROLL_SOLID_THRESHOLD) {
          nav.classList.remove('nav--transparent');
          nav.classList.add('nav--solid');
          isOnHero = false;
        } else {
          nav.classList.remove('nav--solid');
          nav.classList.add('nav--transparent');
          isOnHero = true;
        }

        if (scrollY > SCROLL_HIDE_THRESHOLD && !isOnHero) {
          nav.classList.add('nav--hidden');
          isHidden = true;
        } else {
          nav.classList.remove('nav--hidden');
          isHidden = false;
        }
      }

      /* Revelar el nav cuando el cursor se acerca a la parte superior */
      document.addEventListener('mousemove', e => {
        if (isHidden && e.clientY < 80) nav.classList.remove('nav--hidden');
        else if (isHidden && e.clientY >= 80) nav.classList.add('nav--hidden');
      });

      window.addEventListener('scroll', updateNav, { passive: true });
      updateNav();
    } else {
      nav.classList.add('nav--static');
    }
  }

  function initHamburger() {
    const hamburger  = document.querySelector('.nav__hamburger');
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
    mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  }

  function initCarousel() {
    const carousel = document.querySelector('.testimonials__carousel');
    if (!carousel) return;

    const slides       = Array.from(carousel.querySelectorAll('.testimonials__slide'));
    const dotsContainer = document.querySelector('.testimonials__dots');
    const prevBtn      = carousel.querySelector('.testimonials__arrow--prev');
    const nextBtn      = carousel.querySelector('.testimonials__arrow--next');

    if (!slides.length) return;

    const AUTOPLAY_DELAY = 6000;
    let current      = 0;
    let autoplayTimer = null;

    function buildDots() {
      if (!dotsContainer) return;
      dotsContainer.innerHTML = '';
      slides.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.classList.add('testimonials__dot');
        dot.setAttribute('aria-label', 'Testimonio ' + (index + 1));
        dot.addEventListener('click', () => { goTo(index); resetAutoplay(); });
        dotsContainer.appendChild(dot);
      });
    }

    function goTo(index) {
      const dots = dotsContainer ? dotsContainer.querySelectorAll('.testimonials__dot') : [];
      slides[current].classList.remove('is-active');
      if (dots.length) dots[current].classList.remove('is-active');

      current = (index + slides.length) % slides.length;

      slides[current].classList.add('is-active');
      if (dots.length) dots[current].classList.add('is-active');
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    function startAutoplay() {
      if (slides.length <= 1) return;
      autoplayTimer = setInterval(next, AUTOPLAY_DELAY);
    }

    function resetAutoplay() {
      clearInterval(autoplayTimer);
      startAutoplay();
    }

    if (prevBtn) prevBtn.addEventListener('click', () => { prev(); resetAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { next(); resetAutoplay(); });

    let touchStartX = 0;
    carousel.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener('touchend', e => {
      const delta = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(delta) > 50) {
        delta < 0 ? next() : prev();
        resetAutoplay();
      }
    }, { passive: true });

    carousel.addEventListener('mouseenter', () => clearInterval(autoplayTimer));
    carousel.addEventListener('mouseleave', startAutoplay);

    buildDots();
    goTo(0);
    startAutoplay();
  }

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  ready(() => {
    initNav();
    initHamburger();
    initSmoothScroll();

    /* El carrusel se inicializa cuando los testimonios llegan de la API.
       Se expone globalmente para que index.html lo llame tras el fetch. */
    window.__reinitCarousel = initCarousel;
  });

})();
