'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { LoadingState } from '@/components/data-states';
import { TransactionForm } from '@/components/forms/transaction-form';

interface TransactionRecord {
  transaction_amount: string;
  transaction_date: string;
  account_id: string;
  budget_id: string;
  payee_name: string;
  annotate: string;
}

export default function EditTransactionPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [transaction, setTransaction] = useState<TransactionRecord | null>(null);

  useEffect(() => {
    fetch(`/api/transactions/${id}`)
      .then((response) => response.json())
      .then((result) => setTransaction(result.transaction))
      .catch(() => setTransaction(null));
  }, [id]);

  if (!transaction) {
    return <LoadingState label="Loading transaction..." />;
  }

  return (
    <TransactionForm
      initial={{
        transaction_amount: transaction.transaction_amount,
        transaction_date: transaction.transaction_date,
        account_id: transaction.account_id,
        budget_id: transaction.budget_id,
        payee_name: transaction.payee_name,
        annotate: transaction.annotate,
      }}
      mode="edit"
      transactionId={id}
    />
  );
}

