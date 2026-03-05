'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/components/data-states';
import { PageHeader } from '@/components/page-header';
import { Card, buttonClassName } from '@/components/ui';

interface Account {
  id: string;
  account_name: string;
  account_balance: string;
  account_type: string;
}

interface Transaction {
  id: string;
  account_name: string;
  payee_name: string;
  bucket_list_name: string;
  annotate: string;
  transaction_amount: string;
}

export default function AccountsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    Promise.all([fetch('/api/accounts'), fetch('/api/transactions')])
      .then(async ([accountsResponse, transactionsResponse]) => {
        if (!accountsResponse.ok || !transactionsResponse.ok) {
          throw new Error('Failed to load account overview');
        }
        const accountsResult = await accountsResponse.json();
        const transactionsResult = await transactionsResponse.json();
        setAccounts(accountsResult.accounts ?? []);
        setTransactions(transactionsResult.transactions ?? []);
      })
      .catch((fetchError) => {
        setError(fetchError.message);
        setAccounts([]);
        setTransactions([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const total = useMemo(
    () => accounts.reduce((sum, account) => sum + Number(account.account_balance), 0),
    [accounts],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <>
            <Link className={buttonClassName({ variant: 'secondary' })} href="/transactions/new">
              Add Transaction
            </Link>
            <Link className={buttonClassName({})} href="/accounts/new">
              Add Wallet
            </Link>
          </>
        }
        title="Wallets"
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Card dense>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total balance</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{total.toFixed(2)}</p>
        </Card>
        <Card dense>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Wallets</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{accounts.length}</p>
        </Card>
        <Card dense>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent transactions</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{transactions.length}</p>
        </Card>
      </div>

      {loading ? <LoadingState label="Loading wallets..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <Card>
          {transactions.length === 0 ? (
            <EmptyState
              action={
                <Link className={buttonClassName({ size: 'sm' })} href="/transactions/new">
                  Add first transaction
                </Link>
              }
              description="Transactions linked to wallets appear here."
              title="No wallet activity yet"
            />
          ) : (
            <>
              <div className="table-scroll hidden md:block">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-left text-muted-foreground">
                      <th className="px-2 py-2 font-medium">Wallet</th>
                      <th className="px-2 py-2 font-medium">Payee</th>
                      <th className="px-2 py-2 font-medium">Bucket List</th>
                      <th className="px-2 py-2 font-medium">Notes</th>
                      <th className="px-2 py-2 font-medium">Outflow</th>
                      <th className="px-2 py-2 font-medium">Inflow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => {
                      const amount = Number(transaction.transaction_amount);
                      const outflow = amount < 0 ? Math.abs(amount).toFixed(2) : '';
                      const inflow = amount > 0 ? amount.toFixed(2) : '';
                      return (
                        <tr className="border-b border-surface-border" key={transaction.id}>
                          <td className="px-2 py-3 text-foreground">{transaction.account_name}</td>
                          <td className="px-2 py-3 text-foreground">{transaction.payee_name}</td>
                          <td className="px-2 py-3 text-foreground">{transaction.bucket_list_name}</td>
                          <td className="px-2 py-3 text-foreground">{transaction.annotate || '—'}</td>
                          <td className="px-2 py-3 text-foreground">{outflow}</td>
                          <td className="px-2 py-3 text-foreground">{inflow}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 md:hidden">
                {transactions.map((transaction) => {
                  const amount = Number(transaction.transaction_amount);
                  return (
                    <div className="glass-muted space-y-2 p-3" key={transaction.id}>
                      <div className="flex justify-between gap-2">
                        <p className="font-medium text-foreground">{transaction.account_name}</p>
                        <p className="text-sm font-semibold text-foreground">{amount.toFixed(2)}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{transaction.payee_name || 'Unknown payee'}</p>
                      <p className="text-sm text-foreground">{transaction.annotate || 'No notes'}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      ) : null}
    </div>
  );
}

