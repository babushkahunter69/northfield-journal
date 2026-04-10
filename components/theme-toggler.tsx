'use client';

import { useEffect, useState } from 'react';

export function ThemeToggler() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setDark(true);
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
      setDark(false);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
        setDark(true);
      }
    }

    setMounted(true);
  }, []);

  function toggleTheme() {
    const nextDark = !dark;

    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }

    setDark(nextDark);
  }

  if (!mounted) {
    return (
      <button
        type="button"
        className="button-secondary"
        aria-label="Toggle theme"
      >
        🌙
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="button-secondary"
      aria-label="Toggle theme"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}