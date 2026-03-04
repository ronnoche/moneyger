import type { sheets_v4 } from 'googleapis';
import { z } from 'zod';
import { ApiError } from '@/lib/api/errors';
import { accountAvailableBalance } from '@/lib/domain/metrics';
import { accountInputSchema, validateUniqueAccountName } from '@/lib/domain/validation';
import { nowIso, toAmountString } from '@/lib/domain/utils';
import { appendRow, updateRow } from '@/lib/google/client';
import { SHEET_HEADERS, SHEET_TABS } from '@/lib/google/schema';
import { readSnapshot } from '@/lib/google/sheets-store';
import { deleteEntityRow, formatValidationError, nextId, toRowValues } from '@/lib/services/helpers';

export const listAccounts = async (sheets: sheets_v4.Sheets, sheetId: string) => {
  const snapshot = await readSnapshot(sheets, sheetId);
  return snapshot.accounts.map((account) => ({
    ...account,
    available_balance: accountAvailableBalance(account, snapshot.accountBudgets).toFixed(2),
  }));
};

export const createAccount = async (sheets: sheets_v4.Sheets, sheetId: string, input: unknown) => {
  const parsed = accountInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, formatValidationError(parsed.error.issues));
  }

  const snapshot = await readSnapshot(sheets, sheetId);
  const duplicateMessage = validateUniqueAccountName(parsed.data.account_name, snapshot.accounts);
  if (duplicateMessage) {
    throw new ApiError(400, duplicateMessage);
  }

  const now = nowIso();
  const created = {
    id: nextId(snapshot.accounts),
    account_name: parsed.data.account_name,
    account_type: parsed.data.account_type,
    account_balance: toAmountString(parsed.data.account_balance),
    is_reconciled: 'false',
    last_reconciled_date: '',
    created_at: now,
    updated_at: now,
  };

  await appendRow(sheets, sheetId, SHEET_TABS.accounts, toRowValues(SHEET_HEADERS[SHEET_TABS.accounts], created));
  return created;
};

export const updateAccount = async (
  sheets: sheets_v4.Sheets,
  sheetId: string,
  accountId: string,
  input: unknown,
) => {
  const parsed = accountInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, formatValidationError(parsed.error.issues));
  }

  const snapshot = await readSnapshot(sheets, sheetId);
  const existing = snapshot.accounts.find((account) => account.id === accountId);
  if (!existing) {
    throw new ApiError(404, 'Account not found');
  }

  const duplicateMessage = validateUniqueAccountName(parsed.data.account_name, snapshot.accounts, accountId);
  if (duplicateMessage) {
    throw new ApiError(400, duplicateMessage);
  }

  const updated = {
    ...existing,
    account_name: parsed.data.account_name,
    account_type: parsed.data.account_type,
    account_balance: toAmountString(parsed.data.account_balance),
    updated_at: nowIso(),
  };

  await updateRow(
    sheets,
    sheetId,
    SHEET_TABS.accounts,
    existing.rowNumber,
    toRowValues(SHEET_HEADERS[SHEET_TABS.accounts], updated),
  );

  return updated;
};

export const deleteAccount = async (sheets: sheets_v4.Sheets, sheetId: string, accountId: string) => {
  const snapshot = await readSnapshot(sheets, sheetId);
  const existing = snapshot.accounts.find((account) => account.id === accountId);
  if (!existing) {
    throw new ApiError(404, 'Account not found');
  }

  const inUseByTransactions = snapshot.transactions.some((txn) => txn.account_id === accountId);
  const inUseByAllocations = snapshot.accountBudgets.some((allocation) => allocation.account_id === accountId);
  if (inUseByTransactions || inUseByAllocations) {
    throw new ApiError(400, 'Cannot delete account with related transactions or allocations');
  }

  await deleteEntityRow(sheets, sheetId, SHEET_TABS.accounts, existing);
};

export const patchAccountBalance = async (
  sheets: sheets_v4.Sheets,
  sheetId: string,
  accountId: string,
  nextBalance: string,
) => {
  const snapshot = await readSnapshot(sheets, sheetId);
  const existing = snapshot.accounts.find((account) => account.id === accountId);
  if (!existing) {
    throw new ApiError(404, 'Account not found');
  }

  const parsed = z.coerce.number().safeParse(nextBalance);
  if (!parsed.success) {
    throw new ApiError(400, 'Invalid account balance');
  }

  const updated = {
    ...existing,
    account_balance: toAmountString(parsed.data),
    updated_at: nowIso(),
  };
  await updateRow(
    sheets,
    sheetId,
    SHEET_TABS.accounts,
    existing.rowNumber,
    toRowValues(SHEET_HEADERS[SHEET_TABS.accounts], updated),
  );
  return updated;
};

