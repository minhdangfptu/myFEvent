const THEME_KEY = 'bs-theme';

export function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme) {
  try {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
}

export function toggleTheme() {
  const next = (getSavedTheme() === 'light') ? 'dark' : 'light';
  applyTheme(next);
}



