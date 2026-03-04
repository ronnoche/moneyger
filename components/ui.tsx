'use client';

import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type ButtonSize = 'sm' | 'md' | 'lg';

export const buttonClassName = ({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) =>
  clsx(
    'inline-flex items-center justify-center rounded-[var(--radius-sm)] font-medium transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
    'disabled:pointer-events-none disabled:opacity-50',
    size === 'sm' && 'h-9 px-3 text-xs',
    size === 'md' && 'h-10 px-4 text-sm',
    size === 'lg' && 'h-11 px-5 text-sm',
    variant === 'primary' && 'bg-brand text-brand-foreground hover:brightness-110',
    variant === 'secondary' && 'border border-surface-border bg-surface-strong text-foreground hover:bg-brand-soft hover:text-foreground',
    variant === 'ghost' && 'bg-transparent text-foreground hover:bg-brand-soft',
    variant === 'danger' && 'bg-danger text-danger-foreground hover:brightness-110',
    variant === 'soft' && 'bg-brand-soft text-foreground hover:brightness-95',
    className,
  );

export const Button = ({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ComponentPropsWithoutRef<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) => (
  <button
    className={buttonClassName({ variant, size, className })}
    {...props}
  />
);

export const Input = ({
  className,
  ...props
}: ComponentPropsWithoutRef<'input'> & { className?: string }) => (
  <input
    className={clsx(
      'w-full rounded-[var(--radius-sm)] border border-surface-border bg-surface-strong px-3 py-2.5 text-sm text-foreground transition-colors duration-200',
      'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
      'disabled:cursor-not-allowed disabled:opacity-60',
      className,
    )}
    {...props}
  />
);

export const Select = ({
  className,
  ...props
}: ComponentPropsWithoutRef<'select'> & { className?: string }) => (
  <select
    className={clsx(
      'w-full rounded-[var(--radius-sm)] border border-surface-border bg-surface-strong px-3 py-2.5 text-sm text-foreground transition-colors duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60',
      className,
    )}
    {...props}
  />
);

export const Card = ({
  className,
  dense = false,
  ...props
}: ComponentPropsWithoutRef<'section'> & { className?: string; dense?: boolean }) => (
  <section className={clsx('glass', dense ? 'p-4' : 'p-5 md:p-6', className)} {...props} />
);

