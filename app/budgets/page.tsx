'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/components/data-states';
import { MonthNavigator } from '@/components/month-navigator';
import { PageHeader } from '@/components/page-header';
import { Button, Card, buttonClassName } from '@/components/ui';

interface BudgetRow {
  id: string;
  budget_name: string;
  monthly_assigned: number;
  monthly_activity: number;
  monthly_available: number;
}

interface BudgetsResponse {
  budgets: BudgetRow[];
  unassigned_money: number;
  monthly_leftover: number;
  monthly_assigned_total: number;
  monthly_activity_total: number;
}

export default function BudgetsPage() {
  const searchParams = useSearchParams();
  const month = searchParams.get('month') ?? format(new Date(1970, 0, 1), 'yyyy-MM-01');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSeedPrompt, setShowSeedPrompt] = useState(false);
  const [data, setData] = useState<BudgetsResponse>({
    budgets: [],
    unassigned_money: 0,
    monthly_leftover: 0,
    monthly_assigned_total: 0,
    monthly_activity_total: 0,
  });

  useEffect(() => {
    fetch(`/api/budgets?month=${month}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Failed to load budgets'))))
      .then((result: BudgetsResponse) => {
        setData(result);
        setError('');
        if ((result.budgets?.length ?? 0) === 0) {
          setShowSeedPrompt(true);
        }
      })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, [month]);

  const statusText = useMemo(() => {
    if (data.unassigned_money === 0) {
      return 'All Money Assigned!';
    }
    if (data.unassigned_money > 0) {
      return 'Ready to Assign';
    }
    return 'You assigned more than you have';
  }, [data.unassigned_money]);

  const seed = async () => {
    await fetch('/api/seed', { method: 'POST' });
    setShowSeedPrompt(false);
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <Link className={buttonClassName({ variant: 'primary' })} href="/budgets/new">
            Add Budget
          </Link>
        }
        description="Plan monthly money assignment by bucket."
        title="Budgets"
      />

      <Card className="grid gap-4 md:grid-cols-[1fr_auto]">
        <MonthNavigator />
        <div className="rounded-[var(--radius-md)] border border-surface-border bg-brand-soft px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unassigned</p>
          <p className="text-2xl font-semibold text-foreground">{data.unassigned_money.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">{statusText}</p>
        </div>
      </Card>

      {showSeedPrompt ? (
        <Card className="flex flex-wrap items-center justify-between gap-3" dense>
          <p className="text-sm text-foreground">Start with sample data?</p>
          <div className="flex gap-2">
            <Button onClick={seed} size="sm" type="button">
              Yes
            </Button>
            <Button onClick={() => setShowSeedPrompt(false)} size="sm" type="button" variant="secondary">
              No
            </Button>
          </div>
        </Card>
      ) : null}

      {loading ? <LoadingState label="Loading budgets..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <Card className="space-y-3">
          {data.budgets.length === 0 ? (
            <EmptyState
              action={
                <Link className={buttonClassName({ size: 'sm' })} href="/budgets/new">
                  Create first budget
                </Link>
              }
              description="Create budget buckets so monthly planning has structure."
              title="No budgets yet"
            />
          ) : (
            <>
              <div className="table-scroll hidden md:block">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-left text-muted-foreground">
                      <th className="px-2 py-2 font-medium">Bucket</th>
                      <th className="px-2 py-2 font-medium">Assigned</th>
                      <th className="px-2 py-2 font-medium">Activity</th>
                      <th className="px-2 py-2 font-medium">Available</th>
                      <th className="px-2 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.budgets.map((budget) => (
                      <tr className="border-b border-surface-border" key={budget.id}>
                        <td className="px-2 py-3 font-medium text-foreground">{budget.budget_name}</td>
                        <td className="px-2 py-3 text-foreground">{budget.monthly_assigned.toFixed(2)}</td>
                        <td className="px-2 py-3 text-foreground">{budget.monthly_activity.toFixed(2)}</td>
                        <td className="px-2 py-3 text-foreground">{budget.monthly_available.toFixed(2)}</td>
                        <td className="px-2 py-3">
                          <Link className={buttonClassName({ size: 'sm', variant: 'secondary' })} href={`/budgets/${budget.id}/edit`}>
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 md:hidden">
                {data.budgets.map((budget) => (
                  <div className="glass-muted space-y-2 p-3" key={budget.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{budget.budget_name}</p>
                      <Link className={buttonClassName({ size: 'sm', variant: 'secondary' })} href={`/budgets/${budget.id}/edit`}>
                        Edit
                      </Link>
                    </div>
                    <dl className="grid grid-cols-2 gap-y-1 text-sm">
                      <dt className="text-muted-foreground">Assigned</dt>
                      <dd className="text-right text-foreground">{budget.monthly_assigned.toFixed(2)}</dd>
                      <dt className="text-muted-foreground">Activity</dt>
                      <dd className="text-right text-foreground">{budget.monthly_activity.toFixed(2)}</dd>
                      <dt className="text-muted-foreground">Available</dt>
                      <dd className="text-right text-foreground">{budget.monthly_available.toFixed(2)}</dd>
                    </dl>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      ) : null}

      <Card dense>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available in Month</h2>
        <div className="mt-3 grid gap-2 text-sm text-foreground md:grid-cols-3">
          <p className="glass-muted px-3 py-2">Left Over: {data.monthly_leftover.toFixed(2)}</p>
          <p className="glass-muted px-3 py-2">Total Assigned: {data.monthly_assigned_total.toFixed(2)}</p>
          <p className="glass-muted px-3 py-2">Total Activity: {data.monthly_activity_total.toFixed(2)}</p>
        </div>
      </Card>
    </div>
  );
}

