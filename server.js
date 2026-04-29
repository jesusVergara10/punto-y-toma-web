'use strict';

const express   = require('express');
const session   = require('express-session');
const multer    = require('multer');
const path      = require('path');
const { Pool }  = require('pg');
const { put, del } = require('@vercel/blob');
const pgSession = require('connect-pg-simple')(session);

const app  = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'puntoytoma2024';

/* ─── Conexión a Postgres ─────────────────────────────────────── */
let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

/* ─── Inicialización de base de datos ────────────────────────── */
let dbInitPromise = null;

async function createTables(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS home_config (
      id                   INTEGER PRIMARY KEY DEFAULT 1,
      about_headline       TEXT DEFAULT '"We are ready for every new adventure and eager to be part of your love story."',
      about_body           TEXT DEFAULT 'We are Betty & Antonio. A photo & Film Duo based in Monterrey, México. We are passionate filmmakers and storytellers. We like to think that there is an indescribable spark in everything we see, live or feel that cannot be put in words, our joyful challenge is to capture it and make you feel it too.',
      grid_image_weddings  TEXT,
      grid_image_occasions TEXT,
      hero_video           TEXT
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS weddings (
      id    SERIAL PRIMARY KEY,
      names TEXT NOT NULL,
      image TEXT
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS testimonials (
      id     SERIAL PRIMARY KEY,
      quote  TEXT NOT NULL,
      author TEXT NOT NULL
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id         SERIAL PRIMARY KEY,
      first_name TEXT, last_name  TEXT,
      email      TEXT, occasion   TEXT,
      event_date TEXT, venue      TEXT,
      city       TEXT, subject    TEXT,
      message    TEXT, source     TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function seedInitialData(db) {
  await db.query(
    `INSERT INTO home_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING`
  );

  await db.query(`
    INSERT INTO weddings (names)
    SELECT unnest(ARRAY['Fer & Walter','Sara & Oscar','Pao & Diego'])
    WHERE NOT EXISTS (SELECT 1 FROM weddings)
  `);

  await db.query(`
    INSERT INTO testimonials (quote, author)
    SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM testimonials)
  `, [
    'Desde el momento en que decidimos confiar en Punto y Toma, sabíamos que habíamos tomado la elección correcta. Nos hicieron sentir cómodos desde el primer instante, con su carisma nos ayudaron a ser nosotros mismos y capturaron la esencia de los momentos más preciados de una manera auténtica y natural. Fueron 100% profesionales en sus entregables y tiempos, sin duda tienen mi recomendación garantizada.',
    'Cecy'
  ]);
}

async function initDB() {
  const db = getPool();
  await createTables(db);
  await seedInitialData(db);
}

/* ─── Multer middlewares ──────────────────────────────────────── */
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'));
  }
});

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Solo se permiten videos'));
  }
});

/* ─── Middleware general ──────────────────────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new pgSession({
    conObject: {
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false }
    },
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'pto-toma-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 }
}));

app.use(express.static(path.join(__dirname)));

/* Inicialización lazy — se ejecuta una sola vez por instancia de servidor */
app.use(async (req, res, next) => {
  if (!dbInitPromise) dbInitPromise = initDB();
  try { await dbInitPromise; next(); } catch (err) {
    console.error('DB init error:', err);
    res.status(500).send('Error de base de datos');
  }
});

/* ─── Auth middleware ─────────────────────────────────────────── */
function requireAuth(req, res, next) {
  if (req.session.isAdmin) return next();
  res.status(401).json({ error: 'No autorizado' });
}

/* ─── Elimina un blob de forma segura sin romper el flujo ──────── */
async function safeDeleteBlob(url) {
  if (!url) return;
  try { await del(url); } catch (_) {}
}

/* ══════════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════════ */
app.post('/api/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
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
   WEDDINGS
══════════════════════════════════════════════════════════════ */
app.get('/api/weddings', async (req, res) => {
  try {
    const { rows } = await getPool().query('SELECT * FROM weddings ORDER BY id');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/weddings', requireAuth, imageUpload.single('image'), async (req, res) => {
  try {
    const { names } = req.body;
    if (!names?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });

    let imageUrl = null;
    if (req.file) {
      const blob = await put(`weddings/${Date.now()}-${req.file.originalname}`, req.file.buffer, { access: 'public' });
      imageUrl = blob.url;
    }

    const { rows } = await getPool().query(
      'INSERT INTO weddings (names, image) VALUES ($1, $2) RETURNING id',
      [names.trim(), imageUrl]
    );
    res.json({ ok: true, id: rows[0].id, image: imageUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/weddings/:id', requireAuth, imageUpload.single('image'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const db = getPool();
    const { rows } = await db.query('SELECT * FROM weddings WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });

    const names = req.body.names?.trim() || rows[0].names;
    let imageUrl = rows[0].image;

    if (req.file) {
      await safeDeleteBlob(rows[0].image);
      const blob = await put(`weddings/${Date.now()}-${req.file.originalname}`, req.file.buffer, { access: 'public' });
      imageUrl = blob.url;
    }

    await db.query('UPDATE weddings SET names=$1, image=$2 WHERE id=$3', [names, imageUrl, id]);
    res.json({ ok: true, image: imageUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/weddings/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const db = getPool();
    const { rows } = await db.query('SELECT * FROM weddings WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });

    await safeDeleteBlob(rows[0].image);
    await db.query('DELETE FROM weddings WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ══════════════════════════════════════════════════════════════
   TESTIMONIALS
══════════════════════════════════════════════════════════════ */
app.get('/api/testimonials', async (req, res) => {
  try {
    const { rows } = await getPool().query('SELECT * FROM testimonials ORDER BY id');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/testimonials', requireAuth, async (req, res) => {
  try {
    const { quote, author } = req.body;
    if (!quote || !author) return res.status(400).json({ error: 'Faltan campos' });
    const { rows } = await getPool().query(
      'INSERT INTO testimonials (quote, author) VALUES ($1, $2) RETURNING id',
      [quote.trim(), author.trim()]
    );
    res.json({ ok: true, id: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/testimonials/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { quote, author } = req.body;
    await getPool().query(
      `UPDATE testimonials SET
        quote  = COALESCE($1, quote),
        author = COALESCE($2, author)
       WHERE id = $3`,
      [quote?.trim() || null, author?.trim() || null, id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/testimonials/:id', requireAuth, async (req, res) => {
  try {
    await getPool().query('DELETE FROM testimonials WHERE id = $1', [parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ══════════════════════════════════════════════════════════════
   INQUIRIES
══════════════════════════════════════════════════════════════ */
app.get('/api/inquiries', requireAuth, async (req, res) => {
  try {
    const { rows } = await getPool().query('SELECT * FROM inquiries ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inquiries', async (req, res) => {
  try {
    const { first_name, last_name, email, occasion, event_date, venue, city, subject, message, source } = req.body;
    if (!first_name || !email || !message) return res.status(400).json({ error: 'Faltan campos requeridos' });

    await getPool().query(
      `INSERT INTO inquiries
        (first_name,last_name,email,occasion,event_date,venue,city,subject,message,source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [first_name, last_name, email, occasion, event_date, venue, city, subject, message, source]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/inquiries/:id', requireAuth, async (req, res) => {
  try {
    await getPool().query('DELETE FROM inquiries WHERE id = $1', [parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ══════════════════════════════════════════════════════════════
   HOME
══════════════════════════════════════════════════════════════ */
app.get('/api/home', async (req, res) => {
  try {
    const { rows } = await getPool().query('SELECT * FROM home_config WHERE id = 1');
    res.json(rows[0] || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/home/texts', requireAuth, async (req, res) => {
  try {
    const { about_headline, about_body } = req.body;
    await getPool().query(
      `UPDATE home_config SET
        about_headline = COALESCE($1, about_headline),
        about_body     = COALESCE($2, about_body)
       WHERE id = 1`,
      [about_headline?.trim() || null, about_body?.trim() || null]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/home/image/:slot', requireAuth, imageUpload.single('image'), async (req, res) => {
  try {
    const { slot } = req.params;
    const columnBySlot = { weddings: 'grid_image_weddings', occasions: 'grid_image_occasions' };
    const column = columnBySlot[slot];
    if (!column)   return res.status(400).json({ error: 'Slot inválido' });
    if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });

    const db = getPool();
    const { rows } = await db.query(`SELECT ${column} FROM home_config WHERE id = 1`);
    await safeDeleteBlob(rows[0]?.[column]);

    const blob = await put(`home/${slot}-${Date.now()}-${req.file.originalname}`, req.file.buffer, { access: 'public' });
    await db.query(`UPDATE home_config SET ${column} = $1 WHERE id = 1`, [blob.url]);
    res.json({ ok: true, image: blob.url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/home/image/:slot', requireAuth, async (req, res) => {
  try {
    const { slot } = req.params;
    const columnBySlot = { weddings: 'grid_image_weddings', occasions: 'grid_image_occasions' };
    const column = columnBySlot[slot];
    if (!column) return res.status(400).json({ error: 'Slot inválido' });

    const db = getPool();
    const { rows } = await db.query(`SELECT ${column} FROM home_config WHERE id = 1`);
    await safeDeleteBlob(rows[0]?.[column]);
    await db.query(`UPDATE home_config SET ${column} = NULL WHERE id = 1`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/home/video', requireAuth, videoUpload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió video' });
    const db = getPool();
    const { rows } = await db.query('SELECT hero_video FROM home_config WHERE id = 1');
    await safeDeleteBlob(rows[0]?.hero_video);

    const blob = await put(`home/hero-${Date.now()}-${req.file.originalname}`, req.file.buffer, { access: 'public' });
    await db.query('UPDATE home_config SET hero_video = $1 WHERE id = 1', [blob.url]);
    res.json({ ok: true, video: blob.url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/home/video', requireAuth, async (req, res) => {
  try {
    const db = getPool();
    const { rows } = await db.query('SELECT hero_video FROM home_config WHERE id = 1');
    await safeDeleteBlob(rows[0]?.hero_video);
    await db.query('UPDATE home_config SET hero_video = NULL WHERE id = 1');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ─── Servidor local ──────────────────────────────────────────── */
if (require.main === module) {
  initDB().then(() => {
    app.listen(PORT, () => {
      console.log(`\n  Punto & Toma — servidor corriendo`);
      console.log(`  → http://localhost:${PORT}`);
      console.log(`  → Admin: http://localhost:${PORT}/admin/\n`);
    });
  });
}

module.exports = app;
