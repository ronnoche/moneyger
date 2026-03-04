'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { LoadingState } from '@/components/data-states';
import { AccountForm } from '@/components/forms/account-form';

interface AccountRecord {
  account_name: string;
  account_balance: string;
  account_type: 'cash' | 'savings' | 'credit' | 'loan';
}

export default function EditAccountPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [account, setAccount] = useState<AccountRecord | null>(null);

  useEffect(() => {
    fetch(`/api/accounts/${id}`)
      .then((response) => response.json())
      .then((result) => setAccount(result.account))
      .catch(() => setAccount(null));
  }, [id]);

  if (!account) {
    return <LoadingState label="Loading account..." />;
  }

  return (
    <AccountForm
      accountId={id}
      initial={{
        account_name: account.account_name,
        account_balance: account.account_balance,
        account_type: account.account_type,
      }}
      mode="edit"
    />
  );
}

