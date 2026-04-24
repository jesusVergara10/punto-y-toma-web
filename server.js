'use strict';

const express  = require('express');
const session  = require('express-session');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ─── Contraseña del admin (cámbiala o usa variable de entorno) ─── */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'puntoytoma2024';

/* ─── Directorios ─────────────────────────────────────────────── */
const DATA_DIR    = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

[DATA_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* ─── Helpers JSON ────────────────────────────────────────────── */
function readData(file) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
}

function writeData(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

/* ─── Datos iniciales (solo si no existen) ────────────────────── */
if (!fs.existsSync(path.join(DATA_DIR, 'weddings.json'))) {
  writeData('weddings.json', [
    { id: 1, names: 'Fer & Walter', image: null },
    { id: 2, names: 'Sara & Oscar', image: null },
    { id: 3, names: 'Pao & Diego',  image: null }
  ]);
}

if (!fs.existsSync(path.join(DATA_DIR, 'testimonials.json'))) {
  writeData('testimonials.json', [
    {
      id: 1,
      quote: 'Desde el momento en que decidimos confiar en Punto y Toma, sabíamos que habíamos tomado la elección correcta. Nos hicieron sentir cómodos desde el primer instante, con su carisma nos ayudaron a ser nosotros mismos y capturaron la esencia de los momentos más preciados de una manera auténtica y natural. Fueron 100% profesionales en sus entregables y tiempos, sin duda tienen mi recomendación garantizada.',
      author: 'Cecy'
    }
  ]);
}

if (!fs.existsSync(path.join(DATA_DIR, 'inquiries.json'))) {
  writeData('inquiries.json', []);
}

if (!fs.existsSync(path.join(DATA_DIR, 'home.json'))) {
  writeData('home.json', {
    about_headline: '"We are ready for every new adventure and eager to be part of your love story."',
    about_body: 'We are Betty & Antonio. A photo & Film Duo based in Monterrey, México. We are passionate filmmakers and storytellers. We like to think that there is an indescribable spark in everything we see, live or feel that cannot be put in words, our joyful challenge is to capture it and make you feel it too.',
    grid_image_weddings:  null,
    grid_image_occasions: null,
    hero_video: null
  });
}

/* ─── Multer — subida de imágenes ─────────────────────────────── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uid = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uid + path.extname(file.originalname).toLowerCase());
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'));
  }
});

const uploadVideo = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Solo se permiten videos'));
  }
});

/* ─── Middleware ──────────────────────────────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'pto-toma-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8 horas
}));

/* Archivos estáticos */
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(UPLOADS_DIR));

/* ─── Auth middleware ─────────────────────────────────────────── */
function requireAuth(req, res, next) {
  if (req.session.isAdmin) return next();
  res.status(401).json({ error: 'No autorizado' });
}

/* ══════════════════════════════════════════════════════════════
   API — AUTH
══════════════════════════════════════════════════════════════ */
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Contraseña incorrecta' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/auth', (req, res) => {
  res.json({ isAdmin: !!req.session.isAdmin });
});

/* ══════════════════════════════════════════════════════════════
   API — WEDDINGS
══════════════════════════════════════════════════════════════ */
app.get('/api/weddings', (req, res) => {
  res.json(readData('weddings.json'));
});

app.post('/api/weddings', requireAuth, upload.single('image'), (req, res) => {
  const { names } = req.body;
  if (!names || !names.trim()) return res.status(400).json({ error: 'El nombre es requerido' });

  const weddings = readData('weddings.json');
  const id = weddings.length ? Math.max(...weddings.map(w => w.id)) + 1 : 1;
  const image = req.file ? `/uploads/${req.file.filename}` : null;
  weddings.push({ id, names: names.trim(), image });
  writeData('weddings.json', weddings);
  res.json({ ok: true, id, image });
});

app.put('/api/weddings/:id', requireAuth, upload.single('image'), (req, res) => {
  const id = parseInt(req.params.id);
  const weddings = readData('weddings.json');
  const idx = weddings.findIndex(w => w.id === id);
  if (idx === -1) return res.status(404).json({ error: 'No encontrado' });

  if (req.body.names) weddings[idx].names = req.body.names.trim();

  if (req.file) {
    // Borrar imagen anterior
    if (weddings[idx].image) {
      const old = path.join(UPLOADS_DIR, path.basename(weddings[idx].image));
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    weddings[idx].image = `/uploads/${req.file.filename}`;
  }

  writeData('weddings.json', weddings);
  res.json({ ok: true, image: weddings[idx].image });
});

app.delete('/api/weddings/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  let weddings = readData('weddings.json');
  const wedding = weddings.find(w => w.id === id);
  if (!wedding) return res.status(404).json({ error: 'No encontrado' });

  if (wedding.image) {
    const imgPath = path.join(UPLOADS_DIR, path.basename(wedding.image));
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }

  weddings = weddings.filter(w => w.id !== id);
  writeData('weddings.json', weddings);
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════════
   API — TESTIMONIALS
══════════════════════════════════════════════════════════════ */
app.get('/api/testimonials', (req, res) => {
  res.json(readData('testimonials.json'));
});

app.post('/api/testimonials', requireAuth, (req, res) => {
  const { quote, author } = req.body;
  if (!quote || !author) return res.status(400).json({ error: 'Faltan campos' });

  const testimonials = readData('testimonials.json');
  const id = testimonials.length ? Math.max(...testimonials.map(t => t.id)) + 1 : 1;
  testimonials.push({ id, quote: quote.trim(), author: author.trim() });
  writeData('testimonials.json', testimonials);
  res.json({ ok: true, id });
});

app.put('/api/testimonials/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const testimonials = readData('testimonials.json');
  const idx = testimonials.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'No encontrado' });

  if (req.body.quote)  testimonials[idx].quote  = req.body.quote.trim();
  if (req.body.author) testimonials[idx].author = req.body.author.trim();
  writeData('testimonials.json', testimonials);
  res.json({ ok: true });
});

app.delete('/api/testimonials/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  let testimonials = readData('testimonials.json');
  testimonials = testimonials.filter(t => t.id !== id);
  writeData('testimonials.json', testimonials);
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════════
   API — INQUIRIES
══════════════════════════════════════════════════════════════ */
app.get('/api/inquiries', requireAuth, (req, res) => {
  const data = readData('inquiries.json');
  res.json([...data].reverse()); // más recientes primero
});

app.post('/api/inquiries', (req, res) => {
  const { first_name, last_name, email, occasion, event_date, venue, city, subject, message, source } = req.body;
  if (!first_name || !email || !message) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const inquiries = readData('inquiries.json');
  const id = inquiries.length ? Math.max(...inquiries.map(i => i.id)) + 1 : 1;
  inquiries.push({
    id, first_name, last_name, email, occasion,
    event_date, venue, city, subject, message, source,
    created_at: new Date().toISOString()
  });
  writeData('inquiries.json', inquiries);
  res.json({ ok: true });
});

app.delete('/api/inquiries/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  let inquiries = readData('inquiries.json');
  inquiries = inquiries.filter(i => i.id !== id);
  writeData('inquiries.json', inquiries);
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════════
   API — HOME
══════════════════════════════════════════════════════════════ */

/* Helper: leer home (devuelve objeto, no array) */
function readHome() {
  const p = path.join(DATA_DIR, 'home.json');
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}

app.get('/api/home', (req, res) => {
  res.json(readHome());
});

/* Actualizar textos */
app.put('/api/home/texts', requireAuth, (req, res) => {
  const home = readHome();
  const { about_headline, about_body } = req.body;
  if (about_headline !== undefined) home.about_headline = about_headline.trim();
  if (about_body     !== undefined) home.about_body     = about_body.trim();
  writeData('home.json', home);
  res.json({ ok: true });
});

/* Subir imagen del grid (slot: weddings | occasions) */
app.post('/api/home/image/:slot', requireAuth, upload.single('image'), (req, res) => {
  const { slot } = req.params;
  if (!['weddings', 'occasions'].includes(slot)) {
    return res.status(400).json({ error: 'Slot inválido' });
  }
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });

  const home = readHome();
  const key  = `grid_image_${slot}`;

  if (home[key]) {
    const old = path.join(UPLOADS_DIR, path.basename(home[key]));
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }
  home[key] = `/uploads/${req.file.filename}`;
  writeData('home.json', home);
  res.json({ ok: true, image: home[key] });
});

/* Eliminar imagen del grid */
app.delete('/api/home/image/:slot', requireAuth, (req, res) => {
  const { slot } = req.params;
  if (!['weddings', 'occasions'].includes(slot)) {
    return res.status(400).json({ error: 'Slot inválido' });
  }
  const home = readHome();
  const key  = `grid_image_${slot}`;
  if (home[key]) {
    const old = path.join(UPLOADS_DIR, path.basename(home[key]));
    if (fs.existsSync(old)) fs.unlinkSync(old);
    home[key] = null;
    writeData('home.json', home);
  }
  res.json({ ok: true });
});

/* Subir video del hero */
app.post('/api/home/video', requireAuth, uploadVideo.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió video' });

  const home = readHome();
  if (home.hero_video) {
    const old = path.join(UPLOADS_DIR, path.basename(home.hero_video));
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }
  home.hero_video = `/uploads/${req.file.filename}`;
  writeData('home.json', home);
  res.json({ ok: true, video: home.hero_video });
});

/* Eliminar video del hero */
app.delete('/api/home/video', requireAuth, (req, res) => {
  const home = readHome();
  if (home.hero_video) {
    const old = path.join(UPLOADS_DIR, path.basename(home.hero_video));
    if (fs.existsSync(old)) fs.unlinkSync(old);
    home.hero_video = null;
    writeData('home.json', home);
  }
  res.json({ ok: true });
});

/* ─── Iniciar servidor ────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n  Punto & Toma — servidor corriendo`);
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  → Admin: http://localhost:${PORT}/admin/\n`);
});

module.exports = app;
