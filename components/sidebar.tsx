'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui';
import { ThemeToggle } from '@/components/theme-toggle';

interface Account {
  id: string;
  account_name: string;
  account_type: 'cash' | 'savings' | 'credit' | 'loan';
  account_balance: string;
}

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

const navigation = [
  { href: '/budgets', label: 'Budgets' },
  { href: '/cashflow', label: 'Cash Flow' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/accounts', label: 'Accounts' },
];

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { data } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    fetch('/api/accounts')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Failed to fetch accounts')))
      .then((result) => setAccounts(result.accounts ?? []))
      .catch(() => setAccounts([]));
  }, []);

  const grouped = useMemo(() => {
    return {
      cashSavings: accounts.filter((account) => account.account_type === 'cash' || account.account_type === 'savings'),
      liabilities: accounts.filter((account) => account.account_type === 'credit' || account.account_type === 'loan'),
    };
  }, [accounts]);

  return (
    <aside className={clsx('glass flex h-full w-full max-w-80 flex-col p-4 md:p-5', className)}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Moneyger</h1>
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

      <div className="space-y-4">
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cash and Savings</h2>
          <ul className="space-y-1 text-sm text-foreground">
            {grouped.cashSavings.map((account) => (
              <li className="flex justify-between rounded-[var(--radius-sm)] px-2 py-1.5" key={account.id}>
                <span className="truncate pr-3">{account.account_name}</span>
                <span className="font-medium">{Number(account.account_balance).toFixed(2)}</span>
              </li>
            ))}
            {grouped.cashSavings.length === 0 ? <li className="px-2 py-1 text-muted-foreground">No cash accounts yet.</li> : null}
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Liabilities</h2>
          <ul className="space-y-1 text-sm text-foreground">
            {grouped.liabilities.map((account) => (
              <li className="flex justify-between rounded-[var(--radius-sm)] px-2 py-1.5" key={account.id}>
                <span className="truncate pr-3">{account.account_name}</span>
                <span className="font-medium">{Number(account.account_balance).toFixed(2)}</span>
              </li>
            ))}
            {grouped.liabilities.length === 0 ? <li className="px-2 py-1 text-muted-foreground">No liabilities yet.</li> : null}
          </ul>
        </section>
      </div>

      <div className="mt-auto">
        <div className="mb-4 flex justify-end">
          <ThemeToggle />
        </div>
        <div className="border-t border-surface-border pt-4 text-sm text-foreground">
          <p className="truncate">{data?.user?.email}</p>
          <Button
            className="mt-3 w-full"
            onClick={() => signOut({ callbackUrl: '/' })}
            size="sm"
            type="button"
            variant="danger"
          >
            Sign out
          </Button>
        </div>
      </div>
    </aside>
  );
}

