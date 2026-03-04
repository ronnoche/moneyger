import type { sheets_v4 } from 'googleapis';
import { ApiError } from '@/lib/api/errors';
import { accountBudgetInputSchema, validateAllocationAgainstAvailableBalance } from '@/lib/domain/validation';
import { nowIso, toAmountString } from '@/lib/domain/utils';
import { appendRow, updateRow } from '@/lib/google/client';
import { SHEET_HEADERS, SHEET_TABS } from '@/lib/google/schema';
import { readSnapshot } from '@/lib/google/sheets-store';
import { deleteEntityRow, formatValidationError, nextId, toRowValues } from '@/lib/services/helpers';

export const createAccountBudget = async (sheets: sheets_v4.Sheets, sheetId: string, input: unknown) => {
  const parsed = accountBudgetInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, formatValidationError(parsed.error.issues));
  }

  const snapshot = await readSnapshot(sheets, sheetId);
  const duplicate = snapshot.accountBudgets.find(
    (item) => item.account_id === parsed.data.account_id && item.budget_id === parsed.data.budget_id,
  );
  if (duplicate) {
    throw new ApiError(400, 'account_id and budget_id combination must be unique');
  }

  const account = snapshot.accounts.find((item) => item.id === parsed.data.account_id);
  if (!account) {
    throw new ApiError(400, 'Account not found');
  }

  const siblingAllocations = snapshot.accountBudgets
    .filter((item) => item.account_id === parsed.data.account_id)
    .map((item) => item.allocated_amount);
  const exceedsAvailable = validateAllocationAgainstAvailableBalance(
    account.account_balance,
    siblingAllocations,
    parsed.data.allocated_amount,
  );
  if (exceedsAvailable) {
    throw new ApiError(400, exceedsAvailable);
  }

  const now = nowIso();
  const created = {
    id: nextId(snapshot.accountBudgets),
    account_id: parsed.data.account_id,
    budget_id: parsed.data.budget_id,
    allocated_amount: toAmountString(parsed.data.allocated_amount),
    created_at: now,
    updated_at: now,
  };

  await appendRow(
    sheets,
    sheetId,
    SHEET_TABS.accountBudgets,
    toRowValues(SHEET_HEADERS[SHEET_TABS.accountBudgets], created),
  );
  return created;
};

export const updateAccountBudget = async (
  sheets: sheets_v4.Sheets,
  sheetId: string,
  accountBudgetId: string,
  input: unknown,
) => {
  const parsed = accountBudgetInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, formatValidationError(parsed.error.issues));
  }

  const snapshot = await readSnapshot(sheets, sheetId);
  const existing = snapshot.accountBudgets.find((item) => item.id === accountBudgetId);
  if (!existing) {
    throw new ApiError(404, 'Allocation not found');
  }

  const duplicate = snapshot.accountBudgets.find(
    (item) =>
      item.id !== accountBudgetId &&
      item.account_id === parsed.data.account_id &&
      item.budget_id === parsed.data.budget_id,
  );
  if (duplicate) {
    throw new ApiError(400, 'account_id and budget_id combination must be unique');
  }

  const account = snapshot.accounts.find((item) => item.id === parsed.data.account_id);
  if (!account) {
    throw new ApiError(400, 'Account not found');
  }

  const siblingAllocations = snapshot.accountBudgets
    .filter((item) => item.account_id === parsed.data.account_id && item.id !== accountBudgetId)
    .map((item) => item.allocated_amount);
  const exceedsAvailable = validateAllocationAgainstAvailableBalance(
    account.account_balance,
    siblingAllocations,
    parsed.data.allocated_amount,
  );
  if (exceedsAvailable) {
    throw new ApiError(400, exceedsAvailable);
  }

  const updated = {
    ...existing,
    account_id: parsed.data.account_id,
    budget_id: parsed.data.budget_id,
    allocated_amount: toAmountString(parsed.data.allocated_amount),
    updated_at: nowIso(),
  };

  await updateRow(
    sheets,
    sheetId,
    SHEET_TABS.accountBudgets,
    existing.rowNumber,
    toRowValues(SHEET_HEADERS[SHEET_TABS.accountBudgets], updated),
  );
  return updated;
};

export const deleteAccountBudget = async (sheets: sheets_v4.Sheets, sheetId: string, accountBudgetId: string) => {
  const snapshot = await readSnapshot(sheets, sheetId);
  const existing = snapshot.accountBudgets.find((item) => item.id === accountBudgetId);
  if (!existing) {
    throw new ApiError(404, 'Allocation not found');
  }
  await deleteEntityRow(sheets, sheetId, SHEET_TABS.accountBudgets, existing);
};

