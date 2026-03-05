'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { ThemeToggle } from '@/components/theme-toggle';

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  onCollapse?: () => void;
}

const navigation = [
  { href: '/budgets', label: 'Buckets' },
  { href: '/cashflow', label: 'Cash Flow' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/accounts', label: 'Wallets' },
];

export function Sidebar({ className, onNavigate, onCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { data } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <aside className={clsx('glass relative flex h-full w-full max-w-80 flex-col p-4 md:p-5', className)}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Moneyger</h1>
        {onCollapse ? (
          <Button
            aria-label="Collapse sidebar"
            className="px-2 text-xs"
            onClick={onCollapse}
            size="sm"
            type="button"
            variant="ghost"
          >
            Hide
          </Button>
        ) : null}
      </div>

      <nav className="mb-5 grid gap-1.5">
        {navigation.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              className={clsx(
                'rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-brand text-brand-foreground' : 'text-foreground hover:bg-brand-soft',
              )}
              href={item.href}
              key={item.href}
              onClick={onNavigate}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="flex justify-end border-t border-surface-border pt-4">
          <button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Open account menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-surface-border bg-surface-elevated text-foreground shadow-sm transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <span className="sr-only">Open account menu</span>
            <span className="flex flex-col gap-0.5">
              <span className="block h-[1.5px] w-4 rounded-full bg-foreground" />
              <span className="block h-[1.5px] w-4 rounded-full bg-foreground" />
              <span className="block h-[1.5px] w-4 rounded-full bg-foreground" />
            </span>
          </button>
        </div>

        {menuOpen ? (
          <>
            <button
              aria-label="Close account menu"
              className="fixed inset-0 z-30 cursor-default bg-transparent"
              onClick={() => setMenuOpen(false)}
              type="button"
            />
            <div className="absolute bottom-16 left-4 right-4 z-40 rounded-lg border border-surface-border bg-surface-elevated p-4 text-sm text-foreground shadow-lg">
              <p className="mb-3 truncate">{data?.user?.email}</p>
              <div className="mb-4 flex justify-end">
                <ThemeToggle />
              </div>
              <Button
                className="w-full"
                onClick={() => signOut({ callbackUrl: '/' })}
                size="sm"
                type="button"
                variant="danger"
              >
                Sign out
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </aside>
  );
}

