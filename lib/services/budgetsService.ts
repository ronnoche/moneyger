import { differenceInCalendarMonths, parseISO } from 'date-fns';
import type { sheets_v4 } from 'googleapis';
import { ApiError } from '@/lib/api/errors';
import { buildBudgetsIndex } from '@/lib/domain/metrics';
import { budgetInputSchema, validateUniqueBudgetName } from '@/lib/domain/validation';
import { nowIso, parseAmount, toAmountString } from '@/lib/domain/utils';
import { appendRow, updateRow } from '@/lib/google/client';
import { SHEET_HEADERS, SHEET_TABS } from '@/lib/google/schema';
import { readSnapshot } from '@/lib/google/sheets-store';
import { deleteEntityRow, formatValidationError, nextId, toRowValues } from '@/lib/services/helpers';

const computeCurrentCadenceGoal = (targetAmount: number, targetDate?: string | null): string => {
  if (!targetDate) {
    return toAmountString(targetAmount);
  }

  const months = Math.max(1, differenceInCalendarMonths(parseISO(targetDate), new Date()));
  return toAmountString(targetAmount / months);
};

export const listBudgetsWithMetrics = async (sheets: sheets_v4.Sheets, sheetId: string, month: string) => {
  const snapshot = await readSnapshot(sheets, sheetId);
  return buildBudgetsIndex(month, snapshot.budgets, snapshot.accountBudgets, snapshot.transactions);
};

export const listBudgets = async (sheets: sheets_v4.Sheets, sheetId: string) => {
  const snapshot = await readSnapshot(sheets, sheetId);
  return snapshot.budgets;
};

export const createBudget = async (sheets: sheets_v4.Sheets, sheetId: string, input: unknown) => {
  const parsed = budgetInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, formatValidationError(parsed.error.issues));
  }
  const snapshot = await readSnapshot(sheets, sheetId);
  const duplicate = validateUniqueBudgetName(parsed.data.budget_name, snapshot.budgets);
  if (duplicate) {
    throw new ApiError(400, duplicate);
  }

  const targetAmount = parsed.data.target_amount;
  const now = nowIso();
  const created = {
    id: nextId(snapshot.budgets),
    budget_name: parsed.data.budget_name,
    budget_type: parsed.data.budget_type ?? 'savings',
    cadence: parsed.data.cadence ?? '',
    goal_date: '',
    annotate: parsed.data.annotate ?? '',
    target_amount: toAmountString(targetAmount),
    target_date: parsed.data.target_date ?? '',
    is_indefinite: parsed.data.is_indefinite ? 'true' : 'false',
    minimum_payment_amount:
      parsed.data.minimum_payment_amount !== undefined && parsed.data.minimum_payment_amount !== null
        ? toAmountString(parsed.data.minimum_payment_amount)
        : '',
    current_cadence_goal: computeCurrentCadenceGoal(targetAmount, parsed.data.target_date),
    linked_account_id: parsed.data.linked_account_id ?? '',
    created_at: now,
    updated_at: now,
  };

  await appendRow(sheets, sheetId, SHEET_TABS.budgets, toRowValues(SHEET_HEADERS[SHEET_TABS.budgets], created));
  return created;
};

export const updateBudget = async (sheets: sheets_v4.Sheets, sheetId: string, budgetId: string, input: unknown) => {
  const parsed = budgetInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, formatValidationError(parsed.error.issues));
  }

  const snapshot = await readSnapshot(sheets, sheetId);
  const existing = snapshot.budgets.find((budget) => budget.id === budgetId);
  if (!existing) {
    throw new ApiError(404, 'Budget not found');
  }
  const duplicate = validateUniqueBudgetName(parsed.data.budget_name, snapshot.budgets, budgetId);
  if (duplicate) {
    throw new ApiError(400, duplicate);
  }

  const targetAmount = parsed.data.target_amount;
  const updated = {
    ...existing,
    budget_name: parsed.data.budget_name,
    budget_type: parsed.data.budget_type ?? existing.budget_type ?? 'savings',
    cadence: parsed.data.cadence ?? '',
    annotate: parsed.data.annotate ?? '',
    target_amount: toAmountString(targetAmount),
    target_date: parsed.data.target_date ?? '',
    is_indefinite: parsed.data.is_indefinite ? 'true' : 'false',
    minimum_payment_amount:
      parsed.data.minimum_payment_amount !== undefined && parsed.data.minimum_payment_amount !== null
        ? toAmountString(parsed.data.minimum_payment_amount)
        : '',
    current_cadence_goal: computeCurrentCadenceGoal(targetAmount, parsed.data.target_date),
    linked_account_id: parsed.data.linked_account_id ?? '',
    updated_at: nowIso(),
  };

  await updateRow(
    sheets,
    sheetId,
    SHEET_TABS.budgets,
    existing.rowNumber,
    toRowValues(SHEET_HEADERS[SHEET_TABS.budgets], updated),
  );
  return updated;
};

export const deleteBudget = async (sheets: sheets_v4.Sheets, sheetId: string, budgetId: string) => {
  const snapshot = await readSnapshot(sheets, sheetId);
  const budget = snapshot.budgets.find((item) => item.id === budgetId);
  if (!budget) {
    throw new ApiError(404, 'Budget not found');
  }

  const allocations = snapshot.accountBudgets.filter((allocation) => allocation.budget_id === budgetId);
  const transactions = snapshot.transactions.filter((transaction) => transaction.budget_id === budgetId);

  for (const txn of transactions.sort((a, b) => b.rowNumber - a.rowNumber)) {
    await deleteEntityRow(sheets, sheetId, SHEET_TABS.transactions, txn);
  }
  for (const allocation of allocations.sort((a, b) => b.rowNumber - a.rowNumber)) {
    await deleteEntityRow(sheets, sheetId, SHEET_TABS.accountBudgets, allocation);
  }
  await deleteEntityRow(sheets, sheetId, SHEET_TABS.budgets, budget);
};

export const buildUnassignedMoney = async (sheets: sheets_v4.Sheets, sheetId: string): Promise<number> => {
  const snapshot = await readSnapshot(sheets, sheetId);
  const totalBudgetAmount = snapshot.budgets.reduce((sum, budget) => sum + parseAmount(budget.target_amount), 0);
  const totalAllocated = snapshot.accountBudgets.reduce(
    (sum, accountBudget) => sum + parseAmount(accountBudget.allocated_amount),
    0,
  );
  return totalBudgetAmount - totalAllocated;
};

