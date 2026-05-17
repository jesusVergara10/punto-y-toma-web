'use strict';

/* ─── Verificar autenticación al cargar el panel ─────────────── */
(async () => {
  const res = await fetch('/api/auth');
  const { isAdmin } = await res.json();
  if (!isAdmin) window.location.href = '/admin/index.html';
})();

/* ─── Navegación por tabs ─────────────────────────────────────── */
const sidebarLinks = document.querySelectorAll('.sidebar__link');
const tabPanels    = document.querySelectorAll('.tab-panel');

sidebarLinks.forEach(link => {
  link.addEventListener('click', () => {
    const tab = link.dataset.tab;
    sidebarLinks.forEach(l => l.classList.remove('is-active'));
    tabPanels.forEach(p => p.classList.remove('is-active'));
    link.classList.add('is-active');
    document.getElementById('tab-' + tab).classList.add('is-active');
    /* Cierra el sidebar al seleccionar un tab en mobile */
    if (window.innerWidth <= 768) closeMobileSidebar();
  });
});

/* ─── Sidebar mobile ──────────────────────────────────────────── */
const sidebarEl       = document.querySelector('.sidebar');
const sidebarOverlay  = document.getElementById('sidebarOverlay');
const sidebarToggleEl = document.getElementById('sidebarToggle');

function openMobileSidebar() {
  sidebarEl.classList.add('is-open');
  sidebarOverlay.classList.add('is-visible');
}

function closeMobileSidebar() {
  sidebarEl.classList.remove('is-open');
  sidebarOverlay.classList.remove('is-visible');
}

sidebarToggleEl.addEventListener('click', openMobileSidebar);
sidebarOverlay.addEventListener('click', closeMobileSidebar);

/* ─── Logout ───────────────────────────────────────────────────── */
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/admin/index.html';
});

/* ══════════════════════════════════════════════════════════════
   UTILIDADES
══════════════════════════════════════════════════════════════ */

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeJs(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function showFormMessage(elOrId, text, type = '') {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (!el) return;
  el.textContent = text;
  el.className = 'form-msg' + (type ? ' ' + type : '');
}

/* Cerrar cualquier modal al hacer click fuera de su contenido */
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.style.display = 'none';
  });
});

/* ══════════════════════════════════════════════════════════════
   WEDDINGS
══════════════════════════════════════════════════════════════ */
async function loadWeddings() {
  const list     = document.getElementById('weddingList');
  const weddings = await fetch('/api/weddings').then(r => r.json());

  if (!weddings.length) {
    list.innerHTML = '<p class="empty-state">No hay bodas registradas.</p>';
    return;
  }

  list.innerHTML = weddings.map(w => `
    <div class="entry-item" data-id="${w.id}">
      <div class="entry-item__thumb--placeholder">${w.vimeo_url ? '▶' : '—'}</div>
      <div class="entry-item__info">
        <p class="entry-item__name">${escapeHtml(w.names)}</p>
        <p class="entry-item__meta">${w.vimeo_url ? 'Con video' : 'Sin video'}</p>
      </div>
      <div class="entry-item__actions">
        <button class="btn-edit" onclick="openEditWedding(${w.id}, '${escapeHtml(w.names)}', '${escapeHtml(w.vimeo_url || '')}')">Editar</button>
        <button class="btn-danger" onclick="deleteWedding(${w.id})">Eliminar</button>
      </div>
    </div>
  `).join('');
}

function toggleAddWeddingForm(visible) {
  document.getElementById('addWeddingForm').style.display  = visible ? 'block' : 'none';
  document.getElementById('openAddWedding').style.display  = visible ? 'none'  : '';
}

document.getElementById('openAddWedding').addEventListener('click', () => toggleAddWeddingForm(true));

document.getElementById('cancelAddWedding').addEventListener('click', () => {
  toggleAddWeddingForm(false);
  document.getElementById('weddingForm').reset();
  showFormMessage('weddingMsg', '');
});

document.getElementById('weddingForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  showFormMessage('weddingMsg', '');

  try {
    const res  = await fetch('/api/weddings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ names: form.names.value, vimeo_url: form.vimeo_url.value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');

    showFormMessage('weddingMsg', '¡Boda agregada!', 'success');
    form.reset();
    toggleAddWeddingForm(false);
    loadWeddings();
  } catch (err) {
    showFormMessage('weddingMsg', err.message, 'error');
  }
});

window.deleteWedding = async id => {
  if (!confirm('¿Eliminar esta boda?')) return;
  await fetch(`/api/weddings/${id}`, { method: 'DELETE' });
  loadWeddings();
};

window.openEditWedding = (id, names, vimeo_url) => {
  document.getElementById('ew-id').value    = id;
  document.getElementById('ew-names').value = names;
  document.getElementById('ew-vimeo').value = vimeo_url || '';
  showFormMessage('editWeddingMsg', '');
  document.getElementById('editWeddingModal').style.display = 'flex';
};

document.getElementById('closeEditWedding').addEventListener('click', () => {
  document.getElementById('editWeddingModal').style.display = 'none';
  document.getElementById('editWeddingForm').reset();
});

document.getElementById('editWeddingForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const id   = document.getElementById('ew-id').value;

  try {
    const res  = await fetch(`/api/weddings/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ names: form.names.value, vimeo_url: form.vimeo_url.value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');

    showFormMessage('editWeddingMsg', '¡Guardado!', 'success');
    setTimeout(() => {
      document.getElementById('editWeddingModal').style.display = 'none';
      form.reset();
      loadWeddings();
    }, 800);
  } catch (err) {
    showFormMessage('editWeddingMsg', err.message, 'error');
  }
});

/* ══════════════════════════════════════════════════════════════
   TESTIMONIALS
══════════════════════════════════════════════════════════════ */
async function loadTestimonials() {
  const list  = document.getElementById('testimonialList');
  const items = await fetch('/api/testimonials').then(r => r.json());

  if (!items.length) {
    list.innerHTML = '<p class="empty-state">No hay testimonios registrados.</p>';
    return;
  }

  list.innerHTML = items.map(t => `
    <div class="testimonial-item" data-id="${t.id}">
      <p class="testimonial-item__quote">"${escapeHtml(t.quote)}"</p>
      <p class="testimonial-item__author">— ${escapeHtml(t.author)}</p>
      <div class="testimonial-item__actions">
        <button class="btn-edit" onclick="openEditTestimonial(${t.id}, \`${escapeJs(t.quote)}\`, '${escapeJs(t.author)}')">Editar</button>
        <button class="btn-danger" onclick="deleteTestimonial(${t.id})">Eliminar</button>
      </div>
    </div>
  `).join('');
}

function toggleAddTestimonialForm(visible) {
  document.getElementById('addTestimonialForm').style.display  = visible ? 'block' : 'none';
  document.getElementById('openAddTestimonial').style.display  = visible ? 'none'  : '';
}

document.getElementById('openAddTestimonial').addEventListener('click', () => toggleAddTestimonialForm(true));

document.getElementById('cancelAddTestimonial').addEventListener('click', () => {
  toggleAddTestimonialForm(false);
  document.getElementById('testimonialForm').reset();
  showFormMessage('testimonialMsg', '');
});

document.getElementById('testimonialForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;

  try {
    const res = await fetch('/api/testimonials', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ quote: form.quote.value, author: form.author.value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');

    showFormMessage('testimonialMsg', '¡Testimonio agregado!', 'success');
    form.reset();
    toggleAddTestimonialForm(false);
    loadTestimonials();
  } catch (err) {
    showFormMessage('testimonialMsg', err.message, 'error');
  }
});

window.deleteTestimonial = async id => {
  if (!confirm('¿Eliminar este testimonio?')) return;
  await fetch(`/api/testimonials/${id}`, { method: 'DELETE' });
  loadTestimonials();
};

window.openEditTestimonial = (id, quote, author) => {
  document.getElementById('et-id').value     = id;
  document.getElementById('et-quote').value  = quote;
  document.getElementById('et-author').value = author;
  showFormMessage('editTestimonialMsg', '');
  document.getElementById('editTestimonialModal').style.display = 'flex';
};

document.getElementById('closeEditTestimonial').addEventListener('click', () => {
  document.getElementById('editTestimonialModal').style.display = 'none';
});

document.getElementById('editTestimonialForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const id   = document.getElementById('et-id').value;

  try {
    const res = await fetch(`/api/testimonials/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ quote: form.quote.value, author: form.author.value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');

    showFormMessage('editTestimonialMsg', '¡Guardado!', 'success');
    setTimeout(() => {
      document.getElementById('editTestimonialModal').style.display = 'none';
      loadTestimonials();
    }, 800);
  } catch (err) {
    showFormMessage('editTestimonialMsg', err.message, 'error');
  }
});

/* ══════════════════════════════════════════════════════════════
   INQUIRIES
══════════════════════════════════════════════════════════════ */

/* Cache de consultas para el modal de detalle */
let inquiriesCache = [];

async function loadInquiries() {
  const list  = document.getElementById('inquiryList');
  const count = document.getElementById('inquiryCount');
  const items = await fetch('/api/inquiries').then(r => r.json());

  inquiriesCache       = items;
  count.textContent    = items.length;

  if (!items.length) {
    list.innerHTML = '<p class="empty-state">No hay consultas recibidas.</p>';
    return;
  }

  list.innerHTML = items.map(i => `
    <div class="inquiry-item" onclick="openInquiry(${i.id})">
      <div class="inquiry-item__header">
        <span class="inquiry-item__name">${escapeHtml(i.first_name)} ${escapeHtml(i.last_name || '')}</span>
        ${i.occasion ? `<span class="inquiry-item__occasion">${escapeHtml(i.occasion)}</span>` : ''}
        <span class="inquiry-item__date-chip">${formatDate(i.created_at)}</span>
      </div>
      <p class="inquiry-item__preview">${escapeHtml(i.email)} — ${escapeHtml(i.message || '').substring(0, 80)}…</p>
    </div>
  `).join('');
}

function buildInquiryField(label, value) {
  return `
    <div class="inquiry-field">
      <span class="inquiry-field__label">${label}</span>
      <span class="inquiry-field__value">${escapeHtml(value || '—')}</span>
    </div>
  `;
}

window.openInquiry = id => {
  const inquiry = inquiriesCache.find(x => x.id === id);
  if (!inquiry) return;

  document.getElementById('inquiryDetail').innerHTML = `
    ${buildInquiryField('Nombre',          `${inquiry.first_name} ${inquiry.last_name || ''}`)}
    ${buildInquiryField('Email',           inquiry.email)}
    ${buildInquiryField('Ocasión',         inquiry.occasion)}
    ${buildInquiryField('Fecha del evento',inquiry.event_date)}
    ${buildInquiryField('Venue',           inquiry.venue)}
    ${buildInquiryField('Ciudad',          inquiry.city)}
    ${buildInquiryField('Asunto',          inquiry.subject)}
    ${buildInquiryField('Cómo nos conoció',inquiry.source)}
    <div class="inquiry-field inquiry-field--full">
      <span class="inquiry-field__label">Mensaje</span>
      <span class="inquiry-field__value">${escapeHtml(inquiry.message || '')}</span>
    </div>
    ${buildInquiryField('Recibida', formatDate(inquiry.created_at))}
  `;

  document.getElementById('inquiryModal').style.display = 'flex';
};

document.getElementById('closeInquiryModal').addEventListener('click', () => {
  document.getElementById('inquiryModal').style.display = 'none';
});

/* ══════════════════════════════════════════════════════════════
   HOME
══════════════════════════════════════════════════════════════ */
async function loadHome() {
  const home = await fetch('/api/home').then(r => r.json());

  if (home.about_headline) document.getElementById('h-headline').value = home.about_headline;
  if (home.about_body)     document.getElementById('h-body').value     = home.about_body;

  applyGridImagePreview('weddings',  home.grid_image_weddings);
  applyGridImagePreview('occasions', home.grid_image_occasions);
  applyVideoPreview(home.hero_video);
}

function applyGridImagePreview(slot, url) {
  const preview   = document.getElementById(`preview${capitalize(slot)}`);
  const deleteBtn = document.getElementById(`deleteImg${capitalize(slot)}`);
  if (!preview) return;

  if (url) {
    preview.innerHTML = `<img src="${url}" alt="${slot}" />`;
    if (deleteBtn) deleteBtn.style.display = 'inline-block';
  } else {
    preview.innerHTML = '<span class="home-img-card__empty">Sin imagen</span>';
    if (deleteBtn) deleteBtn.style.display = 'none';
  }
}

function applyVideoPreview(url) {
  const emptyState      = document.getElementById('videoEmpty');
  const previewWrap     = document.getElementById('videoPreview');
  const videoEl         = document.getElementById('videoEl');
  const filenameEl      = document.getElementById('videoFilename');
  const uploadLabelEl   = document.getElementById('videoUploadLabel');

  if (url) {
    emptyState.style.display  = 'none';
    previewWrap.style.display = 'block';
    videoEl.src = url;
    if (filenameEl)    filenameEl.textContent    = url.split('/').pop();
    if (uploadLabelEl) uploadLabelEl.textContent = 'Cambiar video';
  } else {
    emptyState.style.display  = 'block';
    previewWrap.style.display = 'none';
    videoEl.src = '';
    if (uploadLabelEl) uploadLabelEl.textContent = 'Subir video';
  }
}

/* Guardar textos del about */
document.getElementById('homeTextsForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  showFormMessage('homeTextsMsg', '');

  try {
    const res = await fetch('/api/home/texts', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        about_headline: form.about_headline.value,
        about_body:     form.about_body.value
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');
    showFormMessage('homeTextsMsg', '¡Textos guardados!', 'success');
  } catch (err) {
    showFormMessage('homeTextsMsg', err.message, 'error');
  }
});

/* Subir imagen del grid (auto-upload al seleccionar archivo) */
['weddings', 'occasions'].forEach(slot => {
  const inputEl     = document.getElementById(`file${capitalize(slot)}`);
  const deleteBtn   = document.getElementById(`deleteImg${capitalize(slot)}`);
  const msgEl       = document.getElementById(`msgImg${capitalize(slot)}`);

  if (inputEl) {
    inputEl.addEventListener('change', async () => {
      const file = inputEl.files[0];
      if (!file) return;

      showFormMessage(msgEl, 'Subiendo…');
      const formData = new FormData();
      formData.set('image', file);

      try {
        const res  = await fetch(`/api/home/image/${slot}`, { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error');
        applyGridImagePreview(slot, data.image);
        showFormMessage(msgEl, '¡Imagen guardada!', 'success');
        inputEl.value = '';
      } catch (err) {
        showFormMessage(msgEl, err.message, 'error');
      }
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm(`¿Eliminar la imagen de ${slot}?`)) return;
      await fetch(`/api/home/image/${slot}`, { method: 'DELETE' });
      applyGridImagePreview(slot, null);
      showFormMessage(msgEl, 'Imagen eliminada.', 'success');
    });
  }
});

/* Subir video del hero con barra de progreso real */
async function uploadVideoFile(file) {
  const msgEl          = document.getElementById('videoMsg');
  const progressWrapEl = document.getElementById('videoProgress');
  const progressBarEl  = document.getElementById('videoProgressBar');

  showFormMessage(msgEl, 'Subiendo video, espera un momento…');
  progressWrapEl.style.display = 'block';
  progressBarEl.style.width    = '0%';

  const formData = new FormData();
  formData.append('video', file);

  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) {
        progressBarEl.style.width = Math.round((e.loaded / e.total) * 100) + '%';
      }
    });

    xhr.addEventListener('load', () => {
      progressWrapEl.style.display = 'none';
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status === 200 && data.ok) {
          applyVideoPreview(data.video);
          showFormMessage(msgEl, '¡Video guardado!', 'success');
        } else {
          showFormMessage(msgEl, data.error || 'Error al subir.', 'error');
        }
      } catch {
        showFormMessage(msgEl, 'Error al procesar respuesta.', 'error');
      }
      resolve();
    });

    xhr.addEventListener('error', () => {
      progressWrapEl.style.display = 'none';
      showFormMessage(msgEl, 'Error de conexión.', 'error');
      resolve();
    });

    xhr.open('POST', '/api/home/video');
    xhr.send(formData);
  });
}

document.getElementById('fileVideo').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  await uploadVideoFile(file);
  e.target.value = '';
});

document.getElementById('deleteVideo').addEventListener('click', async () => {
  if (!confirm('¿Eliminar el video del hero?')) return;
  await fetch('/api/home/video', { method: 'DELETE' });
  applyVideoPreview(null);
  showFormMessage(document.getElementById('videoMsg'), 'Video eliminado.', 'success');
});

/* ══════════════════════════════════════════════════════════════
   FEATURED WEDDING
══════════════════════════════════════════════════════════════ */
function extractVimeoId(url) {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
  return match ? match[1] : null;
}

function applyFeaturedPreview(url) {
  const preview  = document.getElementById('featuredPreview');
  const videoEl  = document.getElementById('featuredAdminVideo');
  const id       = extractVimeoId(url);

  if (id) {
    videoEl.innerHTML = `<iframe
      src="https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0&dnt=1"
      frameborder="0"
      allow="autoplay; fullscreen; picture-in-picture"
      allowfullscreen></iframe>`;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
}

async function loadFeatured() {
  const home = await fetch('/api/home').then(r => r.json());
  if (home.featured_title)     document.getElementById('f-title').value = home.featured_title;
  if (home.featured_vimeo_url) document.getElementById('f-vimeo').value = home.featured_vimeo_url;
  applyFeaturedPreview(home.featured_vimeo_url);
}

document.getElementById('featuredForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  showFormMessage('featuredMsg', '');

  try {
    const res = await fetch('/api/home/featured', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        featured_title:     form.featured_title.value,
        featured_vimeo_url: form.featured_vimeo_url.value
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');
    showFormMessage('featuredMsg', '¡Guardado!', 'success');
    applyFeaturedPreview(form.featured_vimeo_url.value);
  } catch (err) {
    showFormMessage('featuredMsg', err.message, 'error');
  }
});

/* ─── Cargar todo al iniciar ───────────────────────────────────── */
loadHome();
loadFeatured();
loadWeddings();
loadTestimonials();
loadInquiries();
