'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button, Card, Input, Select } from '@/components/ui';

interface OptionItem {
  id: string;
  label: string;
}

interface TransactionFormValues {
  transaction_amount: string;
  transaction_date: string;
  account_id: string;
  budget_id: string;
  payee_name: string;
  annotate: string;
}

interface Props {
  mode: 'create' | 'edit';
  transactionId?: string;
  initial?: Partial<TransactionFormValues>;
}

export function TransactionForm({ mode, transactionId, initial }: Props) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<OptionItem[]>([]);
  const [budgets, setBudgets] = useState<OptionItem[]>([]);
  const [payees, setPayees] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<TransactionFormValues>({
    transaction_amount: initial?.transaction_amount ?? '0.00',
    transaction_date: initial?.transaction_date ?? '',
    account_id: initial?.account_id ?? '',
    budget_id: initial?.budget_id ?? '',
    payee_name: initial?.payee_name ?? '',
    annotate: initial?.annotate ?? '',
  });

  useEffect(() => {
    Promise.all([fetch('/api/accounts'), fetch('/api/budgets'), fetch('/api/payees')])
      .then(async ([accountsResponse, budgetsResponse, payeesResponse]) => {
        const accountsResult = await accountsResponse.json();
        const budgetsResult = await budgetsResponse.json();
        const payeesResult = await payeesResponse.json();
        setAccounts(
          (accountsResult.accounts ?? []).map((item: { id: string; account_name: string }) => ({
            id: item.id,
            label: item.account_name,
          })),
        );
        setBudgets(
          (budgetsResult.budgets ?? budgetsResult?.data?.budgets ?? []).map((item: { id: string; budget_name: string }) => ({
            id: item.id,
            label: item.budget_name,
          })),
        );
        setPayees((payeesResult.payees ?? []).map((item: { name: string }) => item.name));
      })
      .catch(() => {
        setError('Failed to load form options');
      });
  }, []);

  useEffect(() => {
    if (!initial?.transaction_date) {
      setValues((previous) => ({
        ...previous,
        transaction_date: previous.transaction_date || new Date().toISOString().slice(0, 10),
      }));
    }
  }, [initial?.transaction_date]);

  const submit = async () => {
    setSaving(true);
    setError('');
    const response = await fetch(mode === 'create' ? '/api/transactions' : `/api/transactions/${transactionId}`, {
      method: mode === 'create' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    setSaving(false);
    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: { message: 'Failed to save transaction' } }));
      setError(result.error?.message ?? 'Failed to save transaction');
      return;
    }
    router.push('/transactions');
    router.refresh();
  };

  const remove = async () => {
    if (mode === 'create' || !transactionId) {
      return;
    }
    const response = await fetch(`/api/transactions/${transactionId}`, { method: 'DELETE' });
    if (!response.ok) {
      setError('Failed to delete transaction');
      return;
    }
    router.push('/transactions');
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        description={mode === 'create' ? 'Record a new inflow or outflow.' : 'Update transaction details and allocation.'}
        title={mode === 'create' ? 'New Transaction' : 'Edit Transaction'}
      />
      <Card className="mx-auto max-w-xl space-y-4">
        {error ? <p className="rounded-[var(--radius-sm)] border border-danger px-3 py-2 text-sm text-danger">{error}</p> : null}

        <label className="space-y-1 text-sm">
          <span className="font-medium text-muted-foreground">Amount</span>
          <Input
            step="0.01"
            type="number"
            value={values.transaction_amount}
            onChange={(event) => setValues((previous) => ({ ...previous, transaction_amount: event.target.value }))}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-muted-foreground">Date</span>
          <Input
            type="date"
            value={values.transaction_date}
            onChange={(event) => setValues((previous) => ({ ...previous, transaction_date: event.target.value }))}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-muted-foreground">Account</span>
          <Select value={values.account_id} onChange={(event) => setValues((previous) => ({ ...previous, account_id: event.target.value }))}>
            <option value="">Select account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-muted-foreground">Budget</span>
          <Select value={values.budget_id} onChange={(event) => setValues((previous) => ({ ...previous, budget_id: event.target.value }))}>
            <option value="">Select budget</option>
            {budgets.map((budget) => (
              <option key={budget.id} value={budget.id}>
                {budget.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-muted-foreground">Payee</span>
          <Input
            list="payees"
            value={values.payee_name}
            onChange={(event) => setValues((previous) => ({ ...previous, payee_name: event.target.value }))}
          />
          <datalist id="payees">
            {payees.map((payee) => (
              <option key={payee} value={payee} />
            ))}
          </datalist>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium text-muted-foreground">Notes</span>
          <Input value={values.annotate} onChange={(event) => setValues((previous) => ({ ...previous, annotate: event.target.value }))} />
        </label>

        <div className="flex flex-wrap gap-2">
          <Button disabled={saving} onClick={submit} type="button">
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={() => router.push('/transactions')} type="button" variant="secondary">
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

