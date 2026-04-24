'use strict';

/* ─── Verificar autenticación ──────────────────────────────── */
(async () => {
  const res = await fetch('/api/auth');
  const { isAdmin } = await res.json();
  if (!isAdmin) window.location.href = '/admin/index.html';
})();

/* ─── Tabs ─────────────────────────────────────────────────── */
const sidebarLinks = document.querySelectorAll('.sidebar__link');
const tabPanels    = document.querySelectorAll('.tab-panel');

sidebarLinks.forEach(link => {
  link.addEventListener('click', () => {
    const tab = link.dataset.tab;

    sidebarLinks.forEach(l => l.classList.remove('is-active'));
    tabPanels.forEach(p => p.classList.remove('is-active'));

    link.classList.add('is-active');
    document.getElementById('tab-' + tab).classList.add('is-active');
  });
});

/* ─── Logout ───────────────────────────────────────────────── */
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/admin/index.html';
});

/* ══════════════════════════════════════════════════════════════
   WEDDINGS
══════════════════════════════════════════════════════════════ */
async function loadWeddings() {
  const list = document.getElementById('weddingList');
  const weddings = await fetch('/api/weddings').then(r => r.json());

  if (!weddings.length) {
    list.innerHTML = '<p class="empty-state">No hay bodas registradas.</p>';
    return;
  }

  list.innerHTML = weddings.map(w => `
    <div class="entry-item" data-id="${w.id}">
      ${w.image
        ? `<img src="${w.image}" alt="${w.names}" class="entry-item__thumb" />`
        : `<div class="entry-item__thumb--placeholder">Sin foto</div>`
      }
      <div class="entry-item__info">
        <p class="entry-item__name">${w.names}</p>
        <p class="entry-item__meta">${w.image ? 'Con foto' : 'Sin foto'}</p>
      </div>
      <div class="entry-item__actions">
        <button class="btn-edit" onclick="openEditWedding(${w.id}, '${escHtml(w.names)}', '${w.image || ''}')">Editar</button>
        <button class="btn-danger" onclick="deleteWedding(${w.id})">Eliminar</button>
      </div>
    </div>
  `).join('');
}

/* Mostrar / ocultar formulario de nueva boda */
document.getElementById('openAddWedding').addEventListener('click', () => {
  document.getElementById('addWeddingForm').style.display = 'block';
  document.getElementById('openAddWedding').style.display = 'none';
});

document.getElementById('cancelAddWedding').addEventListener('click', () => {
  document.getElementById('addWeddingForm').style.display = 'none';
  document.getElementById('openAddWedding').style.display = '';
  document.getElementById('weddingForm').reset();
  setMsg('weddingMsg', '');
});

/* Crear boda */
document.getElementById('weddingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const msg  = document.getElementById('weddingMsg');
  setMsg(msg, '');

  try {
    const res = await fetch('/api/weddings', {
      method: 'POST',
      body: new FormData(form)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');

    setMsg(msg, '¡Boda agregada!', 'success');
    form.reset();
    document.getElementById('addWeddingForm').style.display = 'none';
    document.getElementById('openAddWedding').style.display = '';
    loadWeddings();
  } catch (err) {
    setMsg(msg, err.message, 'error');
  }
});

/* Eliminar boda */
window.deleteWedding = async (id) => {
  if (!confirm('¿Eliminar esta boda?')) return;
  await fetch(`/api/weddings/${id}`, { method: 'DELETE' });
  loadWeddings();
};

/* Modal editar boda */
window.openEditWedding = (id, names, image) => {
  document.getElementById('ew-id').value   = id;
  document.getElementById('ew-names').value = names;

  const imgEl   = document.getElementById('ew-current-img');
  const imgWrap = document.getElementById('ew-current-wrap');
  if (image) {
    imgEl.src = image;
    imgWrap.style.display = 'block';
  } else {
    imgWrap.style.display = 'none';
  }

  setMsg('editWeddingMsg', '');
  document.getElementById('editWeddingModal').style.display = 'flex';
};

document.getElementById('closeEditWedding').addEventListener('click', () => {
  document.getElementById('editWeddingModal').style.display = 'none';
  document.getElementById('editWeddingForm').reset();
});

document.getElementById('editWeddingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const id   = document.getElementById('ew-id').value;

  try {
    const res = await fetch(`/api/weddings/${id}`, {
      method: 'PUT',
      body: new FormData(form)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');

    setMsg('editWeddingMsg', '¡Guardado!', 'success');
    setTimeout(() => {
      document.getElementById('editWeddingModal').style.display = 'none';
      form.reset();
      loadWeddings();
    }, 800);
  } catch (err) {
    setMsg('editWeddingMsg', err.message, 'error');
  }
});

/* ══════════════════════════════════════════════════════════════
   TESTIMONIALS
══════════════════════════════════════════════════════════════ */
async function loadTestimonials() {
  const list = document.getElementById('testimonialList');
  const items = await fetch('/api/testimonials').then(r => r.json());

  if (!items.length) {
    list.innerHTML = '<p class="empty-state">No hay testimonios registrados.</p>';
    return;
  }

  list.innerHTML = items.map(t => `
    <div class="testimonial-item" data-id="${t.id}">
      <p class="testimonial-item__quote">"${escHtml(t.quote)}"</p>
      <p class="testimonial-item__author">— ${escHtml(t.author)}</p>
      <div class="testimonial-item__actions">
        <button class="btn-edit" onclick="openEditTestimonial(${t.id}, \`${escJs(t.quote)}\`, '${escJs(t.author)}')">Editar</button>
        <button class="btn-danger" onclick="deleteTestimonial(${t.id})">Eliminar</button>
      </div>
    </div>
  `).join('');
}

/* Mostrar / ocultar formulario */
document.getElementById('openAddTestimonial').addEventListener('click', () => {
  document.getElementById('addTestimonialForm').style.display = 'block';
  document.getElementById('openAddTestimonial').style.display = 'none';
});

document.getElementById('cancelAddTestimonial').addEventListener('click', () => {
  document.getElementById('addTestimonialForm').style.display = 'none';
  document.getElementById('openAddTestimonial').style.display = '';
  document.getElementById('testimonialForm').reset();
  setMsg('testimonialMsg', '');
});

/* Crear testimonio */
document.getElementById('testimonialForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const msg  = document.getElementById('testimonialMsg');

  try {
    const res = await fetch('/api/testimonials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quote:  form.quote.value,
        author: form.author.value
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');

    setMsg(msg, '¡Testimonio agregado!', 'success');
    form.reset();
    document.getElementById('addTestimonialForm').style.display = 'none';
    document.getElementById('openAddTestimonial').style.display = '';
    loadTestimonials();
  } catch (err) {
    setMsg(msg, err.message, 'error');
  }
});

window.deleteTestimonial = async (id) => {
  if (!confirm('¿Eliminar este testimonio?')) return;
  await fetch(`/api/testimonials/${id}`, { method: 'DELETE' });
  loadTestimonials();
};

/* Modal editar testimonio */
window.openEditTestimonial = (id, quote, author) => {
  document.getElementById('et-id').value     = id;
  document.getElementById('et-quote').value  = quote;
  document.getElementById('et-author').value = author;
  setMsg('editTestimonialMsg', '');
  document.getElementById('editTestimonialModal').style.display = 'flex';
};

document.getElementById('closeEditTestimonial').addEventListener('click', () => {
  document.getElementById('editTestimonialModal').style.display = 'none';
});

document.getElementById('editTestimonialForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const id   = document.getElementById('et-id').value;

  try {
    const res = await fetch(`/api/testimonials/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quote:  form.quote.value,
        author: form.author.value
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');

    setMsg('editTestimonialMsg', '¡Guardado!', 'success');
    setTimeout(() => {
      document.getElementById('editTestimonialModal').style.display = 'none';
      loadTestimonials();
    }, 800);
  } catch (err) {
    setMsg('editTestimonialMsg', err.message, 'error');
  }
});

/* ══════════════════════════════════════════════════════════════
   INQUIRIES
══════════════════════════════════════════════════════════════ */
async function loadInquiries() {
  const list  = document.getElementById('inquiryList');
  const count = document.getElementById('inquiryCount');
  const items = await fetch('/api/inquiries').then(r => r.json());

  count.textContent = items.length;

  if (!items.length) {
    list.innerHTML = '<p class="empty-state">No hay consultas recibidas.</p>';
    return;
  }

  list.innerHTML = items.map(i => `
    <div class="inquiry-item" onclick="openInquiry(${i.id})">
      <div class="inquiry-item__header">
        <span class="inquiry-item__name">${escHtml(i.first_name)} ${escHtml(i.last_name || '')}</span>
        ${i.occasion ? `<span class="inquiry-item__occasion">${escHtml(i.occasion)}</span>` : ''}
        <span class="inquiry-item__date-chip">${formatDate(i.created_at)}</span>
      </div>
      <p class="inquiry-item__preview">${escHtml(i.email)} — ${escHtml(i.message || '').substring(0, 80)}…</p>
    </div>
  `).join('');

  // Guardar datos para el modal
  window._inquiries = items;
}

window.openInquiry = (id) => {
  const i = window._inquiries.find(x => x.id === id);
  if (!i) return;

  document.getElementById('inquiryDetail').innerHTML = `
    <div class="inquiry-field"><span class="inquiry-field__label">Nombre</span><span class="inquiry-field__value">${escHtml(i.first_name)} ${escHtml(i.last_name || '')}</span></div>
    <div class="inquiry-field"><span class="inquiry-field__label">Email</span><span class="inquiry-field__value">${escHtml(i.email)}</span></div>
    <div class="inquiry-field"><span class="inquiry-field__label">Ocasión</span><span class="inquiry-field__value">${escHtml(i.occasion || '—')}</span></div>
    <div class="inquiry-field"><span class="inquiry-field__label">Fecha del evento</span><span class="inquiry-field__value">${escHtml(i.event_date || '—')}</span></div>
    <div class="inquiry-field"><span class="inquiry-field__label">Venue</span><span class="inquiry-field__value">${escHtml(i.venue || '—')}</span></div>
    <div class="inquiry-field"><span class="inquiry-field__label">Ciudad</span><span class="inquiry-field__value">${escHtml(i.city || '—')}</span></div>
    <div class="inquiry-field"><span class="inquiry-field__label">Asunto</span><span class="inquiry-field__value">${escHtml(i.subject || '—')}</span></div>
    <div class="inquiry-field"><span class="inquiry-field__label">Cómo nos conoció</span><span class="inquiry-field__value">${escHtml(i.source || '—')}</span></div>
    <div class="inquiry-field inquiry-field--full"><span class="inquiry-field__label">Mensaje</span><span class="inquiry-field__value">${escHtml(i.message || '')}</span></div>
    <div class="inquiry-field"><span class="inquiry-field__label">Recibida</span><span class="inquiry-field__value">${formatDate(i.created_at)}</span></div>
  `;

  document.getElementById('inquiryModal').style.display = 'flex';
};

document.getElementById('closeInquiryModal').addEventListener('click', () => {
  document.getElementById('inquiryModal').style.display = 'none';
});

/* ══════════════════════════════════════════════════════════════
   UTILIDADES
══════════════════════════════════════════════════════════════ */
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escJs(str) {
  return String(str || '').replace(/`/g, '\\`').replace(/\\/g, '\\\\');
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function setMsg(elOrId, text, type = '') {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (!el) return;
  el.textContent = text;
  el.className = 'form-msg' + (type ? ' ' + type : '');
}

/* Cerrar modales al click fuera */
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.style.display = 'none';
  });
});

/* ══════════════════════════════════════════════════════════════
   HOME
══════════════════════════════════════════════════════════════ */
async function loadHome() {
  const home = await fetch('/api/home').then(r => r.json());

  /* Textos */
  if (home.about_headline) document.getElementById('h-headline').value = home.about_headline;
  if (home.about_body)     document.getElementById('h-body').value     = home.about_body;

  /* Imágenes del grid */
  applyGridImage('weddings',  home.grid_image_weddings);
  applyGridImage('occasions', home.grid_image_occasions);

  /* Video */
  applyVideoPreview(home.hero_video);
}

function applyGridImage(slot, url) {
  const preview   = document.getElementById(`preview${cap(slot)}`);
  const deleteBtn = document.getElementById(`deleteImg${cap(slot)}`);
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
  const empty    = document.getElementById('videoEmpty');
  const preview  = document.getElementById('videoPreview');
  const videoEl  = document.getElementById('videoEl');
  const filename = document.getElementById('videoFilename');
  const label    = document.getElementById('videoUploadLabel');

  if (url) {
    empty.style.display   = 'none';
    preview.style.display = 'block';
    videoEl.src = url;
    if (filename) filename.textContent = url.split('/').pop();
    if (label)    label.textContent    = 'Cambiar video';
  } else {
    empty.style.display   = 'block';
    preview.style.display = 'none';
    videoEl.src = '';
    if (label) label.textContent = 'Subir video';
  }
}

function cap(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

/* Guardar textos */
document.getElementById('homeTextsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const msg  = document.getElementById('homeTextsMsg');
  setMsg(msg, '');

  try {
    const res = await fetch('/api/home/texts', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        about_headline: form.about_headline.value,
        about_body:     form.about_body.value
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');
    setMsg(msg, '¡Textos guardados!', 'success');
  } catch (err) {
    setMsg(msg, err.message, 'error');
  }
});

/* Subir imágenes del grid */
['weddings', 'occasions'].forEach(slot => {
  const input     = document.getElementById(`file${cap(slot)}`);
  const deleteBtn = document.getElementById(`deleteImg${cap(slot)}`);
  const msgEl     = document.getElementById(`msgImg${cap(slot)}`);

  if (input) {
    input.addEventListener('change', async () => {
      if (!input.files[0]) return;
      setMsg(msgEl, 'Subiendo…');

      const form = document.getElementById(`formImg${cap(slot)}`);
      const fd   = new FormData(form);
      fd.set('image', input.files[0]);

      try {
        const res  = await fetch(`/api/home/image/${slot}`, { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error');
        applyGridImage(slot, data.image);
        setMsg(msgEl, '¡Imagen guardada!', 'success');
        input.value = '';
      } catch (err) {
        setMsg(msgEl, err.message, 'error');
      }
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm(`¿Eliminar la imagen de ${slot}?`)) return;
      await fetch(`/api/home/image/${slot}`, { method: 'DELETE' });
      applyGridImage(slot, null);
      setMsg(msgEl, 'Imagen eliminada.', 'success');
    });
  }
});

/* Subir video del hero */
document.getElementById('fileVideo').addEventListener('change', async () => {
  const input = document.getElementById('fileVideo');
  const msg   = document.getElementById('videoMsg');
  const bar   = document.getElementById('videoProgressBar');
  const prog  = document.getElementById('videoProgress');

  if (!input.files[0]) return;

  setMsg(msg, '');
  prog.style.display = 'block';
  bar.style.width    = '0%';

  /* XHR para mostrar progreso real */
  const fd  = new FormData();
  fd.append('video', input.files[0]);

  const xhr = new XMLHttpRequest();

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      bar.style.width = Math.round((e.loaded / e.total) * 100) + '%';
    }
  });

  xhr.addEventListener('load', () => {
    prog.style.display = 'none';
    input.value = '';
    try {
      const data = JSON.parse(xhr.responseText);
      if (xhr.status === 200 && data.ok) {
        applyVideoPreview(data.video);
        setMsg(msg, '¡Video guardado!', 'success');
      } else {
        setMsg(msg, data.error || 'Error al subir.', 'error');
      }
    } catch {
      setMsg(msg, 'Error al procesar respuesta.', 'error');
    }
  });

  xhr.addEventListener('error', () => {
    prog.style.display = 'none';
    setMsg(msg, 'Error de conexión.', 'error');
  });

  xhr.open('POST', '/api/home/video');
  xhr.send(fd);
  setMsg(msg, 'Subiendo video, espera un momento…');
});

/* Eliminar video */
document.getElementById('deleteVideo').addEventListener('click', async () => {
  if (!confirm('¿Eliminar el video del hero?')) return;
  await fetch('/api/home/video', { method: 'DELETE' });
  applyVideoPreview(null);
  setMsg(document.getElementById('videoMsg'), 'Video eliminado.', 'success');
});

/* ─── Cargar todo al iniciar ───────────────────────────────── */
loadHome();
loadWeddings();
loadTestimonials();
loadInquiries();
