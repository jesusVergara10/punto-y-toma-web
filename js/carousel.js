'use strict';

/* ─── PhotoCarousel ───────────────────────────────────────────────
   Carrusel horizontal con avance automático, drag (mouse y touch)
   y cursor personalizado (← PREVIOUS / NEXT →).

   Uso:
     new PhotoCarousel(sectionEl, ['url1.jpg', 'url2.jpg', ...]);
   ─────────────────────────────────────────────────────────────── */
class PhotoCarousel {
  /**
   * @param {HTMLElement} section - El elemento <section> que contiene el carrusel.
   * @param {string[]}    imageUrls - URLs de las imágenes a mostrar.
   */
  constructor(section, imageUrls) {
    this.section  = section;
    this.track    = section.querySelector('.photo-carousel__track');
    this.cursor   = section.querySelector('.photo-carousel__cursor');
    this.images   = imageUrls;

    /* Posición actual del track en px (negativo = desplazado a la izquierda) */
    this.x        = 0;
    /* Velocidad de avance automático en px por frame */
    this.speed    = 0.6;
    /* Mitad del ancho total del track (para el loop infinito) */
    this.halfWidth = 0;

    /* Estado del drag */
    this.isDragging  = false;
    this.startX      = 0;
    this.startTrackX = 0;
    this.dragDelta   = 0;
    /* Inercia tras soltar el drag */
    this.velocity    = 0;

    this._buildTrack();
    this._bindEvents();
    this._startLoop();
  }

  /* ── Construcción del DOM ────────────────────────────────────── */

  _buildTrack() {
    /* Duplicamos las imágenes para el loop infinito:
       [Set A][Set B] — cuando Set A sale por la izquierda, se resetea
       la posición para que Set B quede exactamente en el mismo lugar. */
    const urls      = [...this.images, ...this.images];
    let   remaining = urls.length;

    const onLoaded = () => {
      remaining--;
      if (remaining === 0) {
        /* Todas las imágenes cargadas — medimos el ancho real del track */
        this.halfWidth = this.track.scrollWidth / 2;
      }
    };

    urls.forEach(url => {
      const slide = document.createElement('div');
      slide.className = 'photo-carousel__slide';

      const img = document.createElement('img');
      img.alt       = 'Fotografía Punto & Toma';
      img.draggable = false;
      /* Contamos carga y error para no quedarnos esperando si una falla */
      img.addEventListener('load',  onLoaded);
      img.addEventListener('error', onLoaded);
      img.src = url;

      slide.appendChild(img);
      this.track.appendChild(slide);
    });
  }

  /* ── Loop de animación ───────────────────────────────────────── */

  _startLoop() {
    const step = () => {
      /* Medición lazy: por si las imágenes ya estaban en caché */
      if (!this.halfWidth && this.track.scrollWidth > 50) {
        this.halfWidth = this.track.scrollWidth / 2;
      }

      if (!this.isDragging) {
        if (Math.abs(this.velocity) > 0.05) {
          /* Aplicar inercia tras soltar el drag */
          this.x        -= this.velocity;
          this.velocity *= 0.94;
        } else {
          this.velocity  = 0;
          this.x        -= this.speed;
        }
      }

      /* Reset infinito: cuando el primer set sale completamente, volvemos */
      if (this.halfWidth) {
        if (this.x <= -this.halfWidth) this.x += this.halfWidth;
        if (this.x >  0)              this.x -= this.halfWidth;
      }

      this.track.style.transform = `translateX(${this.x}px)`;
      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  /* ── Eventos ─────────────────────────────────────────────────── */

  _bindEvents() {
    /* Cursor personalizado — solo visible en la franja del 15% de cada orilla */
    const EDGE_ZONE = 0.15;

    this.section.addEventListener('mousemove', e => {
      const rect  = this.section.getBoundingClientRect();
      const relX  = e.clientX - rect.left;
      const edge  = rect.width * EDGE_ZONE;

      if (relX < edge) {
        this.section.style.cursor = 'none';
        this.cursor.style.display = 'block';
        this.cursor.style.left    = e.clientX + 'px';
        this.cursor.style.top     = e.clientY + 'px';
        this.cursor.textContent   = '← PREVIOUS';
      } else if (relX > rect.width - edge) {
        this.section.style.cursor = 'none';
        this.cursor.style.display = 'block';
        this.cursor.style.left    = e.clientX + 'px';
        this.cursor.style.top     = e.clientY + 'px';
        this.cursor.textContent   = 'NEXT →';
      } else {
        this.section.style.cursor = 'grab';
        this.cursor.style.display = 'none';
      }
    });

    this.section.addEventListener('mouseleave', () => {
      this.section.style.cursor = '';
      this.cursor.style.display = 'none';
    });

    /* Drag con mouse */
    this.section.addEventListener('mousedown', e => {
      this.isDragging       = true;
      this.startX           = e.clientX;
      this.startTrackX      = this.x;
      this.dragDelta        = 0;
      this.velocity         = 0;
      this.section.style.cursor = 'grabbing';
      this.cursor.style.display = 'none';
      e.preventDefault();
    });

    window.addEventListener('mousemove', e => {
      if (!this.isDragging) return;
      this.dragDelta = e.clientX - this.startX;
      this.x         = this.startTrackX + this.dragDelta;
    });

    window.addEventListener('mouseup', e => {
      if (!this.isDragging) return;
      this.isDragging = false;
      /* Inercia proporcional a la velocidad del drag */
      this.velocity   = -(e.clientX - this.startX) * 0.06;
      /* Click sin arrastre → ir a weddings */
      if (Math.abs(this.dragDelta) < 6) {
        window.location.href = 'weddings.html';
      }
    });

    /* Swipe táctil */
    this.section.addEventListener('touchstart', e => {
      this.isDragging  = true;
      this.startX      = e.touches[0].clientX;
      this.startTrackX = this.x;
      this.dragDelta   = 0;
      this.velocity    = 0;
    }, { passive: true });

    this.section.addEventListener('touchmove', e => {
      if (!this.isDragging) return;
      this.dragDelta = e.touches[0].clientX - this.startX;
      this.x         = this.startTrackX + this.dragDelta;
    }, { passive: true });

    this.section.addEventListener('touchend', () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.velocity   = -this.dragDelta * 0.06;
      /* Tap sin swipe → ir a weddings */
      if (Math.abs(this.dragDelta) < 10) {
        window.location.href = 'weddings.html';
      }
    });
  }
}
