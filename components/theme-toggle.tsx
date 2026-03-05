'use client';

import { type ComponentPropsWithoutRef, type CSSProperties, useEffect, useState } from 'react';

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
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
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
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
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
  const toggleTokens: CSSProperties = {
    '--toggle-width': '68px',
    '--toggle-height': '26px',
    '--toggle-padding': '2px',
    '--toggle-thumb-size': '22px',
    '--toggle-thumb-shift': '40px',
    '--toggle-track-light': '#f1f4f8',
    '--toggle-track-dark': '#0f2a3a',
    '--toggle-border-light': '#d7dce3',
    '--toggle-border-dark': '#1f3f53',
    '--toggle-thumb-light': '#ffffff',
    '--toggle-thumb-dark': '#123347',
    '--toggle-thumb-shadow-light': '0 2px 6px rgba(12, 24, 36, 0.18)',
    '--toggle-thumb-shadow-dark': '0 2px 8px rgba(0, 0, 0, 0.35)',
    '--toggle-sun-active': '#f5b301',
    '--toggle-moon-active': '#74baff',
    '--toggle-icon-muted-light': '#7f8a99',
    '--toggle-icon-muted-dark': '#7d8da1',
    '--toggle-focus-ring': '#4ea2ff',
    '--toggle-hover-glow-light': '0 0 0 4px rgba(120, 136, 158, 0.12)',
    '--toggle-hover-glow-dark': '0 0 0 4px rgba(67, 120, 163, 0.24)',
  } as CSSProperties;

  return (
    <button
      aria-pressed={isDark}
      aria-label="Toggle dark mode"
      className={[
        'group relative inline-flex items-center rounded-full border',
        'h-[var(--toggle-height)] w-[var(--toggle-width)] p-[var(--toggle-padding)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--toggle-focus-ring)] focus-visible:ring-offset-2',
        'transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out motion-reduce:transition-none',
        'hover:scale-[1.02] focus-visible:scale-[1.02] motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100',
        isDark
          ? 'border-[var(--toggle-border-dark)] bg-[var(--toggle-track-dark)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] hover:shadow-[var(--toggle-hover-glow-dark)]'
          : 'border-[var(--toggle-border-light)] bg-[var(--toggle-track-light)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.75)] hover:shadow-[var(--toggle-hover-glow-light)]',
      ].join(' ')}
      onClick={() => {
        const nextTheme = isDark ? 'light' : 'dark';
        applyTheme(nextTheme);
        setTheme(nextTheme);
      }}
      style={toggleTokens}
      type="button"
    >
      <span className="sr-only">Toggle dark mode</span>

      <span
        aria-hidden="true"
        className={[
          'pointer-events-none absolute left-[8px] top-1/2 -translate-y-1/2',
          'transition-opacity duration-200 motion-reduce:transition-none',
          isDark ? 'text-[var(--toggle-icon-muted-dark)] opacity-55' : 'text-[var(--toggle-sun-active)] opacity-100',
        ].join(' ')}
      >
        <SunIcon className="h-3.5 w-3.5" />
      </span>

      <span
        aria-hidden="true"
        className={[
          'pointer-events-none absolute right-[8px] top-1/2 -translate-y-1/2',
          'transition-opacity duration-200 motion-reduce:transition-none',
          isDark ? 'text-[var(--toggle-moon-active)] opacity-100' : 'text-[var(--toggle-icon-muted-light)] opacity-65',
        ].join(' ')}
      >
        <MoonIcon className="h-3.5 w-3.5" />
      </span>

      <span
        aria-hidden="true"
        className={[
          'pointer-events-none absolute left-[var(--toggle-padding)] top-1/2 h-[var(--toggle-thumb-size)] w-[var(--toggle-thumb-size)] -translate-y-1/2 rounded-full',
          'grid place-items-center',
          'transition-[transform,background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none',
          isDark
            ? 'translate-x-[var(--toggle-thumb-shift)] bg-[var(--toggle-thumb-dark)] shadow-[var(--toggle-thumb-shadow-dark)]'
            : 'translate-x-0 bg-[var(--toggle-thumb-light)] shadow-[var(--toggle-thumb-shadow-light)]',
        ].join(' ')}
      >
        {isDark ? (
          <MoonIcon className="h-3.5 w-3.5 text-[var(--toggle-moon-active)]" />
        ) : (
          <SunIcon className="h-3.5 w-3.5 text-[var(--toggle-sun-active)]" />
        )}
      </span>
    </button>
  );
}
