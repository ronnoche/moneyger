'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { LoadingState } from '@/components/data-states';
import { BudgetForm } from '@/components/forms/budget-form';

interface BudgetRecord {
  budget_name: string;
  target_amount: string;
  is_indefinite: 'true' | 'false';
  cadence: string;
  target_date: string;
}

export default function EditBudgetPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [budget, setBudget] = useState<BudgetRecord | null>(null);

  useEffect(() => {
    fetch(`/api/budgets/${id}`)
      .then((response) => response.json())
      .then((result) => setBudget(result.budget))
      .catch(() => setBudget(null));
  }, [id]);

  if (!budget) {
    return <LoadingState label="Loading budget..." />;
  }

  return (
    <BudgetForm
      budgetId={id}
      initial={{
        budget_name: budget.budget_name,
        target_amount: budget.target_amount,
        is_indefinite: budget.is_indefinite === 'true',
        cadence: budget.cadence,
        target_date: budget.target_date,
      }}
      mode="edit"
    />
  );
}

