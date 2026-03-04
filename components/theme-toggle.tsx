'use client';

import { type ComponentPropsWithoutRef, useEffect, useState } from 'react';

type ThemeName = 'light' | 'dark';
type IconProps = ComponentPropsWithoutRef<'svg'>;

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

const SunIcon = (props: IconProps) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    {...props}
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2.5M12 18.5V21M4.22 4.22 5.99 5.99M18.01 18.01l1.77 1.77M3 12h2.5M18.5 12H21M4.22 19.78 5.99 18.01M18.01 5.99 19.78 4.22" />
  </svg>
);

const MoonIcon = (props: IconProps) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    {...props}
  >
    <path d="M21 12.79A7.5 7.5 0 0 1 12.21 4 5.5 5.5 0 1 0 21 12.79Z" />
  </svg>
);

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

  const isDark = theme === 'dark';

  return (
    <button
      aria-checked={isDark}
      aria-label="Toggle color theme"
      aria-pressed={isDark}
      className={`relative inline-flex h-8 w-14 items-center rounded-full border border-surface-border bg-surface-strong px-1 text-[10px] font-medium text-muted-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 ${
        isDark ? 'bg-slate-900' : 'bg-surface-strong'
      }`}
      onClick={() => {
        const nextTheme = isDark ? 'light' : 'dark';
        applyTheme(nextTheme);
        setTheme(nextTheme);
      }}
      role="switch"
      type="button"
    >
      <span
        className={`absolute inset-y-1 w-6 rounded-full bg-brand-soft shadow-sm transition-transform duration-200 ${
          isDark ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
      <span className="relative flex w-full items-center justify-between">
        <SunIcon className={isDark ? 'h-3 w-3 opacity-40' : 'h-3 w-3 text-amber-300'} />
        <MoonIcon className={isDark ? 'h-3 w-3 text-sky-300' : 'h-3 w-3 opacity-40'} />
      </span>
    </button>
  );
}
