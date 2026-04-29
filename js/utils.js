'use strict';

/**
 * Escapa caracteres HTML especiales para prevenir XSS al insertar
 * contenido dinámico en el DOM via innerHTML.
 * @param {*} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Escapa backticks y barras invertidas para usar cadenas dentro de
 * template literals generados dinámicamente (p.ej. atributos onclick).
 * @param {*} str
 * @returns {string}
 */
function escapeJs(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`');
}

/**
 * Formatea una fecha ISO al estilo "15 abr. 2025" en español.
 * @param {string} iso
 * @returns {string}
 */
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

/**
 * Capitaliza la primera letra de una cadena.
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { escapeHtml, escapeJs, formatDate, capitalize };
}
