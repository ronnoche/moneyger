'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';

type ThemeName = 'light' | 'dark';

const getPreferredTheme = (): ThemeName => {
  if (typeof window === 'undefined') {
    return 'light';
  }
  const stored = window.localStorage.getItem('moneyger-theme');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme: ThemeName) => {
  document.documentElement.setAttribute('data-theme', theme);
  window.localStorage.setItem('moneyger-theme', theme);
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName>('light');

  useEffect(() => {
    const initial = getPreferredTheme();
    setTheme(initial);
    applyTheme(initial);

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'moneyger-theme' && (event.newValue === 'light' || event.newValue === 'dark')) {
        setTheme(event.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return (
    <Button
      aria-label="Toggle theme"
      onClick={() => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        setTheme(nextTheme);
      }}
      size="sm"
      type="button"
      variant="secondary"
    >
      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    </Button>
  );
}
