'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button, Card, Input, Select } from '@/components/ui';

interface AccountFormValues {
  account_name: string;
  account_balance: string;
  account_type: 'cash' | 'savings' | 'credit' | 'loan';
}

interface Props {
  mode: 'create' | 'edit';
  accountId?: string;
  initial?: Partial<AccountFormValues>;
}

export function AccountForm({ mode, accountId, initial }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<AccountFormValues>({
    account_name: initial?.account_name ?? '',
    account_balance: initial?.account_balance ?? '0.00',
    account_type: initial?.account_type ?? 'savings',
  });

  const submit = async () => {
    setSaving(true);
    setError('');
    const response = await fetch(mode === 'create' ? '/api/accounts' : `/api/accounts/${accountId}`, {
      method: mode === 'create' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    setSaving(false);
    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: { message: 'Failed to save account' } }));
      setError(result.error?.message ?? 'Failed to save account');
      return;
    }
    router.push('/accounts');
    router.refresh();
  };

  const remove = async () => {
    if (mode === 'create' || !accountId) {
      return;
    }
    const response = await fetch(`/api/accounts/${accountId}`, { method: 'DELETE' });
    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: { message: 'Failed to delete account' } }));
      setError(result.error?.message ?? 'Failed to delete account');
      return;
    }
    router.push('/accounts');
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        description={mode === 'create' ? 'Add a new account to track money movement.' : 'Update account details and balance.'}
        title={mode === 'create' ? 'New Account' : 'Edit Account'}
      />
      <Card className="mx-auto max-w-xl space-y-4">
        {error ? <p className="rounded-[var(--radius-sm)] border border-danger px-3 py-2 text-sm text-danger">{error}</p> : null}
        <label className="space-y-1 text-sm">
          <span className="font-medium text-muted-foreground">Account Name</span>
          <Input value={values.account_name} onChange={(event) => setValues((previous) => ({ ...previous, account_name: event.target.value }))} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-muted-foreground">Account Balance</span>
          <Input
            min="0"
            step="0.01"
            type="number"
            value={values.account_balance}
            onChange={(event) => setValues((previous) => ({ ...previous, account_balance: event.target.value }))}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-muted-foreground">Account Type</span>
          <Select value={values.account_type} onChange={(event) => setValues((previous) => ({ ...previous, account_type: event.target.value as AccountFormValues['account_type'] }))}>
            <option value="cash">cash</option>
            <option value="savings">savings</option>
            <option value="credit">credit</option>
            <option value="loan">loan</option>
          </Select>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button disabled={saving} onClick={submit} type="button">
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={() => router.push('/accounts')} type="button" variant="secondary">
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

