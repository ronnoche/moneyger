'use client';

import { addMonths, format, parseISO } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui';

export function MonthNavigator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const monthParam = searchParams.get('month') ?? format(new Date(1970, 0, 1), 'yyyy-MM-01');
  const currentMonth = parseISO(monthParam);
  const label = format(currentMonth, 'MMMM yyyy');

  const setMonth = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', value);
    router.push(`/budgets?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => setMonth(format(addMonths(currentMonth, -1), 'yyyy-MM-01'))} type="button" variant="secondary">
        Prev
      </Button>
      <span className="min-w-40 rounded-[var(--radius-sm)] border border-surface-border bg-surface-strong px-3 py-2 text-center text-sm font-medium text-foreground">
        {label}
      </span>
      <Button onClick={() => setMonth(format(addMonths(currentMonth, 1), 'yyyy-MM-01'))} type="button" variant="secondary">
        Next
      </Button>
      <Button onClick={() => setMonth(format(new Date(), 'yyyy-MM-01'))} type="button">
        Today
      </Button>
    </div>
  );
}

