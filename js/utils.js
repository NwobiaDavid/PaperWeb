/**
 * utils.js
 * ────────
 * Stateless helpers. No dependencies on other app modules.
 */

/**
 * Escape HTML special characters to prevent XSS when injecting
 * untrusted text into innerHTML.
 * @param {string} s
 * @returns {string}
 */
function esc(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Promise-based sleep.
 * @param {number} ms  Milliseconds to wait.
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Show or hide the full-screen loading overlay.
 * @param {boolean} on
 */
function showLoading(on) {
  const el = document.getElementById('loading');
  el.style.display = on ? 'flex' : 'none';
}

/**
 * Update the text shown inside the loading overlay.
 * @param {string} txt  Primary message.
 * @param {string} [sub='']  Secondary/subtitle message.
 */
function setLoadingText(txt, sub = '') {
  document.getElementById('loading-text').textContent = txt;
  document.getElementById('loading-sub').textContent  = sub;
}