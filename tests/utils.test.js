'use strict';

const { escapeHtml, escapeJs, formatDate, capitalize } = require('../js/utils');

describe('escapeHtml', () => {
  test('escapa ampersand', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  test('escapa comillas dobles', () => {
    expect(escapeHtml('"hola"')).toBe('&quot;hola&quot;');
  });

  test('escapa etiquetas HTML', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  test('retorna cadena vacía si recibe null', () => {
    expect(escapeHtml(null)).toBe('');
  });

  test('retorna cadena vacía si recibe undefined', () => {
    expect(escapeHtml(undefined)).toBe('');
  });

  test('convierte números a string', () => {
    expect(escapeHtml(42)).toBe('42');
  });

  test('no modifica texto sin caracteres especiales', () => {
    expect(escapeHtml('texto normal')).toBe('texto normal');
  });
});

describe('escapeJs', () => {
  test('escapa backticks', () => {
    expect(escapeJs('hola `mundo`')).toBe('hola \\`mundo\\`');
  });

  test('escapa barras invertidas', () => {
    expect(escapeJs('ruta\\archivo')).toBe('ruta\\\\archivo');
  });

  test('retorna cadena vacía si recibe null', () => {
    expect(escapeJs(null)).toBe('');
  });

  test('no modifica texto sin caracteres especiales', () => {
    expect(escapeJs('texto normal')).toBe('texto normal');
  });
});

describe('formatDate', () => {
  test('retorna — si recibe null', () => {
    expect(formatDate(null)).toBe('—');
  });

  test('retorna — si recibe undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  test('retorna — si recibe cadena vacía', () => {
    expect(formatDate('')).toBe('—');
  });

  test('formatea una fecha ISO válida', () => {
    const result = formatDate('2025-04-15T00:00:00.000Z');
    expect(result).toMatch(/\d{2}/);
    expect(result).toMatch(/2025/);
  });
});

describe('capitalize', () => {
  test('capitaliza la primera letra', () => {
    expect(capitalize('weddings')).toBe('Weddings');
  });

  test('no modifica cadenas ya capitalizadas', () => {
    expect(capitalize('Weddings')).toBe('Weddings');
  });

  test('maneja cadenas de una sola letra', () => {
    expect(capitalize('a')).toBe('A');
  });

  test('maneja cadena vacía', () => {
    expect(capitalize('')).toBe('');
  });
});
