'use client';

import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { MonthNavigator } from '@/components/month-navigator';
import { PageHeader } from '@/components/page-header';
import { Card, buttonClassName } from '@/components/ui';
import Link from 'next/link';
import { EmptyState, ErrorState, LoadingState } from '@/components/data-states';
import type { BudgetWorkspaceCategory, BudgetWorkspaceGroup, BudgetWorkspaceResponse } from '@/lib/services/budgetWorkspaceService';

interface WorkspaceState extends BudgetWorkspaceResponse {}

export function BudgetWorkspaceShell() {
  const searchParams = useSearchParams();
  const initialMonthKey =
    searchParams.get('month_key') ?? format(new Date(), 'yyyy-MM');

  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<WorkspaceState | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/budget-workspace?month_key=${monthKey}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Failed to load budget workspace'))))
      .then((result: WorkspaceState) => {
        setData(result);
        setError('');
        if (!selectedCategoryId && result.groups.length > 0) {
          const first = result.groups[0]?.categories[0];
          if (first) {
            setSelectedCategoryId(first.id);
          }
        }
      })
      .catch((fetchError: Error) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, [monthKey]);
  const handleAssignedChange = async (categoryId: string, value: string) => {
    if (!data) return;
    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed)) {
      return;
    }

    const optimistic: WorkspaceState = {
      ...data,
      groups: data.groups.map((group) => ({
        ...group,
        categories: group.categories.map((category) =>
          category.id === categoryId ? { ...category, assigned: parsed } : category,
        ),
      })),
    };
    setData(optimistic);

    try {
      await fetch('/api/budget-workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_assigned',
          category_id: categoryId,
          month_key: monthKey,
          assigned_amount: parsed,
        }),
      });
    } catch (updateError: unknown) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update assigned');
      setData(data);
    }
  };

  const statusText = useMemo(() => {
    if (!data) return '';
    if (data.summary.ready_to_assign === 0) {
      return 'All Money Assigned!';
    }
    if (data.summary.ready_to_assign > 0) {
      return 'Ready to Assign';
    }
    return 'You assigned more than you have';
  }, [data]);

  const selectedCategory: BudgetWorkspaceCategory | undefined = useMemo(() => {
    if (!data || !selectedCategoryId) return undefined;
    for (const group of data.groups) {
      const match = group.categories.find((category) => category.id === selectedCategoryId);
      if (match) return match;
    }
    return undefined;
  }, [data, selectedCategoryId]);

  return (
    <div className="flex h-full flex-col space-y-4">
      <PageHeader
        description="Assign every peso a job and keep categories on track."
        actions={
          <Link className={buttonClassName({ variant: 'primary' })} href="/budgets/new">
            Manage Buckets
          </Link>
        }
        title="Budget"
      >
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <MonthNavigator />
          <div className="rounded-[var(--radius-md)] border border-surface-border bg-brand-soft px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ready to Assign
            </p>
            <p className="text-2xl font-semibold text-foreground">
              {data ? data.summary.ready_to_assign.toFixed(2) : '0.00'}
            </p>
            <p className="text-sm text-muted-foreground">{statusText}</p>
          </div>
        </div>
      </PageHeader>

      {loading ? <LoadingState label="Loading budget workspace..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && data ? (
        <div className="grid flex-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="flex min-h-[400px] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-surface-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <div className="flex flex-1 items-center gap-4">
                <span className="w-1/3">Category Group</span>
                <span className="w-1/3">Category</span>
              </div>
              <div className="flex min-w-[260px] flex-none items-center justify-end gap-6">
                <span>Assigned</span>
                <span>Activity</span>
                <span>Available</span>
              </div>
            </div>

            {data.groups.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-6">
                <EmptyState
                  title="No categories yet"
                  description="Create your first group and category to start budgeting."
                  action={
                    <button
                      className={buttonClassName({ size: 'sm' })}
                      type="button"
                    >
                      Add Category Group
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="table-scroll flex-1 overflow-auto">
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {data.groups.map((group: BudgetWorkspaceGroup) => (
                      <Fragment key={group.id}>
                        <tr className="bg-muted/40">
                          <td className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {group.name}
                          </td>
                          <td colSpan={4} />
                        </tr>
                        {group.categories.map((category) => {
                          const isSelected = category.id === selectedCategoryId;
                          return (
                            <tr
                              key={category.id}
                              className={`cursor-pointer border-b border-surface-border hover:bg-surface-elevated ${
                                isSelected ? 'bg-surface-elevated' : ''
                              }`}
                            >
                              <td className="px-4 py-2 text-sm text-foreground">
                                {category.name}
                              </td>
                              <td className="px-2 py-2 text-right text-foreground">
                                <input
                                  className="w-24 rounded-md border border-surface-border bg-background px-2 py-1 text-right text-sm"
                                  defaultValue={category.assigned.toFixed(2)}
                                  inputMode="decimal"
                                  onBlur={(event) =>
                                    handleAssignedChange(category.id, event.target.value)
                                  }
                                  onClick={() => setSelectedCategoryId(category.id)}
                                />
                              </td>
                              <td className="px-2 py-2 text-right text-foreground">
                                {category.activity.toFixed(2)}
                              </td>
                              <td className="px-2 py-2 text-right text-foreground">
                                {category.available.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="flex min-h-[400px] flex-col gap-4 p-4">
            {selectedCategory ? (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Category
                  </p>
                  <p className="text-lg font-semibold text-foreground">{selectedCategory.name}</p>
                </div>

                <div className="space-y-2 rounded-[var(--radius-md)] border border-surface-border bg-muted/40 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Available Balance</span>
                    <span className="font-semibold text-foreground">
                      {selectedCategory.available.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Assigned this month</span>
                    <span className="text-foreground">{selectedCategory.assigned.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Activity this month</span>
                    <span className="text-foreground">{selectedCategory.activity.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Target
                  </p>
                  <button
                    className={buttonClassName({ size: 'sm', variant: 'secondary' })}
                    type="button"
                  >
                    {selectedCategory.goal ? 'Edit target' : 'Create Target'}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a category from the left to see details.
              </p>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}

