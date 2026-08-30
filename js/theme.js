// Theme toggle — persists to localStorage, works on every page
(function() {
  const STORAGE_KEY = 'gw-theme';
  const root = document.documentElement;

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    localStorage.setItem(STORAGE_KEY, t);
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.textContent = t === 'dark' ? '☀' : '☾';
      btn.title = t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    });
  }

  // Apply immediately before paint to prevent flash
  applyTheme(getTheme());

  // Wire up buttons after DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
      });
    });
  });
})();
