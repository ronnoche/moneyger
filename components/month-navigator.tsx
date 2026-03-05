'use client';

import { addMonths, format, parse } from 'date-fns';
import { Button } from '@/components/ui';

interface MonthNavigatorProps {
  monthKey: string;
  onMonthKeyChange: (value: string) => void;
}

export function MonthNavigator({ monthKey, onMonthKeyChange }: MonthNavigatorProps) {
  const currentMonth = parse(monthKey, 'yyyy-MM', new Date());
  const currentMonthKey = format(new Date(), 'yyyy-MM');
  const isCurrentMonth = monthKey === currentMonthKey;
  const label = format(currentMonth, "MMM ''yy");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        onClick={() => onMonthKeyChange(format(addMonths(currentMonth, -1), 'yyyy-MM'))}
        type="button"
        variant="secondary"
      >
        &larr;
      </Button>
      <span className="min-w-28 rounded-[var(--radius-sm)] border border-surface-border bg-surface-strong px-3 py-2 text-center text-sm font-medium text-foreground">
        {label}
      </span>
      <Button
        onClick={() => onMonthKeyChange(format(addMonths(currentMonth, 1), 'yyyy-MM'))}
        type="button"
        variant="secondary"
      >
        &rarr;
      </Button>
      {!isCurrentMonth ? (
        <Button onClick={() => onMonthKeyChange(currentMonthKey)} type="button">
          Today
        </Button>
      ) : null}
    </div>
  );
}

