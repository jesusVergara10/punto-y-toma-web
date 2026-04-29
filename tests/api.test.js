'use strict';

const request = require('supertest');
const app     = require('../server');

/* ─── Auth ─────────────────────────────────────────────────────── */
describe('POST /api/login', () => {
  test('rechaza contraseña incorrecta con 401', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ password: 'incorrecta' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  test('acepta la contraseña correcta y devuelve ok', async () => {
    const password = process.env.ADMIN_PASSWORD || 'puntoytoma2024';
    const res = await request(app)
      .post('/api/login')
      .send({ password });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('GET /api/auth', () => {
  test('devuelve isAdmin: false para sesión anónima', async () => {
    const res = await request(app).get('/api/auth');
    expect(res.status).toBe(200);
    expect(res.body.isAdmin).toBe(false);
  });
});

/* ─── Weddings (público) ────────────────────────────────────────── */
describe('GET /api/weddings', () => {
  test('devuelve un array', async () => {
    const res = await request(app).get('/api/weddings');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

/* ─── Testimonials (público) ────────────────────────────────────── */
describe('GET /api/testimonials', () => {
  test('devuelve un array', async () => {
    const res = await request(app).get('/api/testimonials');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

/* ─── Home (público) ────────────────────────────────────────────── */
describe('GET /api/home', () => {
  test('devuelve un objeto con los campos de configuración', async () => {
    const res = await request(app).get('/api/home');
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe('object');
  });
});

/* ─── Rutas protegidas sin sesión ────────────────────────────────── */
describe('Rutas protegidas sin autenticación', () => {
  test('POST /api/weddings devuelve 401', async () => {
    const res = await request(app).post('/api/weddings').send({ names: 'Test' });
    expect(res.status).toBe(401);
  });

  test('DELETE /api/weddings/1 devuelve 401', async () => {
    const res = await request(app).delete('/api/weddings/1');
    expect(res.status).toBe(401);
  });

  test('POST /api/testimonials devuelve 401', async () => {
    const res = await request(app)
      .post('/api/testimonials')
      .send({ quote: 'Test', author: 'Autor' });
    expect(res.status).toBe(401);
  });

  test('GET /api/inquiries devuelve 401', async () => {
    const res = await request(app).get('/api/inquiries');
    expect(res.status).toBe(401);
  });

  test('PUT /api/home/texts devuelve 401', async () => {
    const res = await request(app).put('/api/home/texts').send({});
    expect(res.status).toBe(401);
  });
});

/* ─── Inquiries (público — envío de formulario) ─────────────────── */
describe('POST /api/inquiries', () => {
  test('rechaza cuando faltan campos requeridos', async () => {
    const res = await request(app)
      .post('/api/inquiries')
      .send({ last_name: 'Solo apellido' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
