import { endOfMonth, formatISO, isAfter, parseISO, startOfMonth, subMonths } from 'date-fns';

export const nowIso = () => formatISO(new Date());

export const parseAmount = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const toAmountString = (value: number): string => value.toFixed(2);

export const monthBounds = (dateInput: string) => {
  const date = parseISO(dateInput);
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
};

export const previousMonthBounds = (dateInput: string) => {
  const date = parseISO(dateInput);
  const prev = subMonths(date, 1);
  return {
    start: startOfMonth(prev),
    end: endOfMonth(prev),
  };
};

export const isDateWithin = (dateInput: string, start: Date, end: Date): boolean => {
  const target = parseISO(dateInput);
  return target >= start && target <= end;
};

export const assertNotFutureDate = (dateInput: string): boolean => {
  const target = parseISO(dateInput);
  const today = new Date();
  return !isAfter(target, today);
};

