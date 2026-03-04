'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button, Card, Input, Select } from '@/components/ui';

interface BudgetFormValues {
  budget_name: string;
  target_amount: string;
  is_indefinite: boolean;
  cadence: string;
  target_date: string;
}

interface Props {
  mode: 'create' | 'edit';
  budgetId?: string;
  initial?: Partial<BudgetFormValues>;
}

const cadenceOptions = ['', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'yearly'];

export function BudgetForm({ mode, budgetId, initial }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSaving, setSaving] = useState(false);
  const [values, setValues] = useState<BudgetFormValues>({
    budget_name: initial?.budget_name ?? '',
    target_amount: initial?.target_amount ?? '0.00',
    is_indefinite: initial?.is_indefinite ?? false,
    cadence: initial?.cadence ?? '',
    target_date: initial?.target_date ?? '',
  });

  const endpoint = useMemo(() => (mode === 'create' ? '/api/budgets' : `/api/budgets/${budgetId}`), [budgetId, mode]);

  const submit = async () => {
    setSaving(true);
    setError('');
    const response = await fetch(endpoint, {
      method: mode === 'create' ? 'POST' : 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    });
    setSaving(false);

    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: { message: 'Failed to save budget' } }));
      setError(result.error?.message ?? 'Failed to save budget');
      return;
    }

    router.push('/budgets');
    router.refresh();
  };

  const remove = async () => {
    if (mode === 'create' || !budgetId) {
      return;
    }
    const response = await fetch(`/api/budgets/${budgetId}`, { method: 'DELETE' });
    if (!response.ok) {
      setError('Failed to delete budget');
      return;
    }
    router.push('/budgets');
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        description={mode === 'create' ? 'Create a bucket and define its target plan.' : 'Update bucket planning and cadence.'}
        title={mode === 'create' ? 'New Budget' : 'Edit Budget'}
      />

      <Card className="mx-auto max-w-xl space-y-4">
        {error ? <p className="rounded-[var(--radius-sm)] border border-danger px-3 py-2 text-sm text-danger">{error}</p> : null}

        <label className="space-y-1 text-sm">
          <span className="font-medium text-muted-foreground">Bucket Name</span>
          <Input value={values.budget_name} onChange={(event) => setValues((previous) => ({ ...previous, budget_name: event.target.value }))} />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-muted-foreground">Target Amount</span>
          <Input
            min="0"
            step="0.01"
            type="number"
            value={values.target_amount}
            onChange={(event) => setValues((previous) => ({ ...previous, target_amount: event.target.value }))}
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            checked={values.is_indefinite}
            className="h-4 w-4 rounded border-surface-border bg-surface-strong text-brand"
            onChange={(event) => setValues((previous) => ({ ...previous, is_indefinite: event.target.checked }))}
            type="checkbox"
          />
          Repeat this budget
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-muted-foreground">Cadence</span>
          <Select
            disabled={!values.is_indefinite}
            value={values.cadence}
            onChange={(event) => setValues((previous) => ({ ...previous, cadence: event.target.value }))}
          >
            {cadenceOptions.map((option) => (
              <option key={option || 'empty'} value={option}>
                {option || 'Select cadence'}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-muted-foreground">Target Date</span>
          <Input
            disabled={values.is_indefinite}
            required={!values.is_indefinite}
            type="date"
            value={values.target_date}
            onChange={(event) => setValues((previous) => ({ ...previous, target_date: event.target.value }))}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <Button disabled={isSaving} onClick={submit} type="button">
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={() => router.push('/budgets')} type="button" variant="secondary">
            Cancel
          </Button>
          {mode === 'edit' ? (
            <Button onClick={remove} type="button" variant="danger">
              Delete
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

