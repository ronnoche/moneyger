'use client';

import { useEffect, useState } from 'react';
import { ErrorState, LoadingState } from '@/components/data-states';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui';

interface CashFlowResponse {
  assets: number;
  liabilities: number;
  net: number;
  accountCards: {
    account: { id: string; account_name: string; account_type: string };
    transactions: { id: string; payee_id: string; transaction_amount: string; created_at: string }[];
    total: number;
  }[];
}

export default function CashflowPage() {
  const [error, setError] = useState('');
  const [data, setData] = useState<CashFlowResponse | null>(null);

  useEffect(() => {
    fetch('/api/cashflow')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Failed to load cash flow'))))
      .then((result) => setData(result))
      .catch((fetchError) => {
        setData(null);
        setError(fetchError.message);
      });
  }, []);

  if (!data && !error) {
    return <LoadingState label="Loading cash flow..." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader description="Monitor assets, liabilities, and account-level movement." title="Cash Flow" />
      {error ? <ErrorState message={error} /> : null}
      {data ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Card dense>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Assets</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{data.assets.toFixed(2)}</p>
            </Card>
            <Card dense>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Liabilities</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{data.liabilities.toFixed(2)}</p>
            </Card>
            <Card dense>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Net Cash Flow</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{data.net.toFixed(2)}</p>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {data.accountCards.map((card) => (
              <Card key={card.account.id}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold text-foreground">{card.account.account_name}</h2>
                  <span className="rounded-full border border-surface-border px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {card.account.account_type}
                  </span>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-foreground">
                  {card.transactions.map((transaction) => (
                    <li className="glass-muted flex items-center justify-between px-3 py-2" key={transaction.id}>
                      <span className="text-muted-foreground">{transaction.created_at.slice(0, 10)}</span>
                      <span className="font-medium">{Number(transaction.transaction_amount).toFixed(2)}</span>
                    </li>
                  ))}
                  {card.transactions.length === 0 ? (
                    <li className="text-sm text-muted-foreground">No transactions in this account.</li>
                  ) : null}
                </ul>
                <p className="mt-3 text-sm font-semibold text-foreground">Total: {card.total.toFixed(2)}</p>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

