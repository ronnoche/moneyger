'use client';

import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { MonthNavigator } from '@/components/month-navigator';
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
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);

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

  const selectedCategory: BudgetWorkspaceCategory | undefined = useMemo(() => {
    if (!data || !selectedCategoryId) return undefined;
    for (const group of data.groups) {
      const match = group.categories.find((category) => category.id === selectedCategoryId);
      if (match) return match;
    }
    return undefined;
  }, [data, selectedCategoryId]);

  const summaryCard = useMemo(() => {
    const readyToAssign = data?.summary.ready_to_assign ?? 0;
    if (readyToAssign === 0) {
      return {
        title: 'All are assigned',
        value: '0',
      };
    }
    if (readyToAssign > 0) {
      return {
        title: 'Ready to Assign',
        value: readyToAssign.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
      };
    }
    return {
      title: 'Over assigned',
      value: readyToAssign.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    };
  }, [data]);

  return (
    <div className="flex h-full flex-col space-y-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px] md:items-stretch">
        <Card className="space-y-2 py-2.5 md:py-3" dense>
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Buckets</h1>
          <MonthNavigator monthKey={monthKey} onMonthKeyChange={setMonthKey} />
        </Card>
        <Card className="flex flex-col justify-center bg-brand-soft px-4 py-2.5 text-right" dense>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{summaryCard.title}</p>
          <p className="text-xl font-semibold text-foreground md:text-2xl">{summaryCard.value}</p>
          <div className="mt-2">
            <button
              className={buttonClassName({
                size: 'sm',
                variant: 'secondary',
                className: 'h-7 px-2.5 text-[11px]',
              })}
              onClick={() => setDetailsCollapsed((collapsed) => !collapsed)}
              type="button"
            >
              {detailsCollapsed ? 'Expand' : 'Collapse'}
            </button>
          </div>
        </Card>
      </div>

      {loading ? <LoadingState label="Loading buckets workspace..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && data ? (
        <>
          <div
            className={`grid flex-1 gap-4 ${
              detailsCollapsed ? 'md:grid-cols-1' : 'md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'
            }`}
          >
          <Card className="flex min-h-[400px] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-surface-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <div className="flex flex-1 items-center gap-4">
                <span className="w-1/3">Bucket</span>
                <span className="w-1/3">Bucket List</span>
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
                  title="No bucket lists yet"
                  description="Create your first bucket and bucket list to start budgeting."
                  action={
                    <Link className={buttonClassName({ size: 'sm' })} href="/budgets/new">
                      Add Bucket
                    </Link>
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
                              onClick={() => {
                                setSelectedCategoryId(category.id);
                                setDetailsCollapsed(false);
                              }}
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
                                  onClick={() => {
                                    setSelectedCategoryId(category.id);
                                    setDetailsCollapsed(false);
                                  }}
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

          {!detailsCollapsed ? (
            <Card className="flex min-h-[400px] flex-col gap-4 p-4">
            {selectedCategory ? (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Bucket List
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
                Select a bucket list from the left to see details.
              </p>
            )}
            </Card>
          ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

