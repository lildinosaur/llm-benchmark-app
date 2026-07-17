import React, { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

const getStoredTheme = (): Theme | null => {
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'light' || v === 'dark' ? v : null;
};

const applyTheme = (theme: Theme): void => {
  document.documentElement.setAttribute('data-theme', theme);
};

// Bouton de bascule clair/sombre, synchronisé avec localStorage.
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = getStoredTheme();
    const initial = stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initial);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  if (!theme) return null;

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
      title={theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
    >
      {theme === 'dark' ? '☀︎' : '☾'}
    </button>
  );
}
