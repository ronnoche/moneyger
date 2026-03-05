import type { sheets_v4 } from 'googleapis';
import { ApiError } from '@/lib/api/errors';
import { applyAccountBalanceDelta, buildDeleteTransactionAdjustments, buildUpdateTransactionAdjustments } from '@/lib/domain/transactions';
import { transactionInputSchema, validateTransactionDate } from '@/lib/domain/validation';
import { nowIso, toAmountString } from '@/lib/domain/utils';
import { appendRow, updateRow } from '@/lib/google/client';
import { SHEET_HEADERS, SHEET_TABS } from '@/lib/google/schema';
import { readSnapshot } from '@/lib/google/sheets-store';
import { getCachedTransactionsSnapshot, invalidateSheetSnapshots } from '@/lib/google/snapshotCache';
import { deleteEntityRow, formatValidationError, nextId, toRowValues } from '@/lib/services/helpers';
import { findOrCreatePayee } from '@/lib/services/payeesService';

interface TransactionFilters {
  accountId?: string | null;
  bucketListId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export const listTransactions = async (
  sheets: sheets_v4.Sheets,
  sheetId: string,
  filters: TransactionFilters = {},
) => {
  const snapshot = await getCachedTransactionsSnapshot(sheets, sheetId);
  let transactions = snapshot.transactions;

  if (filters.accountId) {
    transactions = transactions.filter((txn) => txn.account_id === filters.accountId);
  }
  if (filters.bucketListId) {
    transactions = transactions.filter((txn) => txn.bucket_list_id === filters.bucketListId);
  }
  if (filters.startDate && filters.endDate) {
    transactions = transactions.filter(
      (txn) => txn.transaction_date >= filters.startDate! && txn.transaction_date <= filters.endDate!,
    );
  }

  return transactions
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((txn) => {
      const account = snapshot.accounts.find((item) => item.id === txn.account_id);
      const bucketList = snapshot.categories.find((item) => item.id === txn.bucket_list_id);
      const payee = snapshot.payees.find((item) => item.id === txn.payee_id);
      return {
        ...txn,
        account_name: account?.account_name ?? '',
        bucket_list_name: bucketList?.name ?? '',
        payee_name: payee?.name ?? '',
      };
    });
};

export const createTransaction = async (sheets: sheets_v4.Sheets, sheetId: string, input: unknown) => {
  const parsed = transactionInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, formatValidationError(parsed.error.issues));
  }

  const dateValidationMessage = validateTransactionDate(parsed.data.transaction_date);
  if (dateValidationMessage) {
    throw new ApiError(400, dateValidationMessage);
  }

  const snapshot = await readSnapshot(sheets, sheetId);
  const account = snapshot.accounts.find((item) => item.id === parsed.data.account_id);
  if (!account) {
    throw new ApiError(400, 'account_id not found');
  }
  const bucketList = snapshot.categories.find((item) => item.id === parsed.data.bucket_list_id);
  if (!bucketList) {
    throw new ApiError(400, 'bucket_list_id not found');
  }

  const payee = await findOrCreatePayee(sheets, sheetId, parsed.data.payee_name);
  const now = nowIso();
  const created = {
    id: nextId(snapshot.transactions),
    transaction_amount: toAmountString(parsed.data.transaction_amount),
    transaction_date: parsed.data.transaction_date,
    annotate: parsed.data.annotate ?? '',
    account_id: account.id,
    bucket_list_id: bucketList.id,
    payee_id: payee.id,
    created_at: now,
    updated_at: now,
  };

  await appendRow(
    sheets,
    sheetId,
    SHEET_TABS.transactions,
    toRowValues(SHEET_HEADERS[SHEET_TABS.transactions], created),
  );

  const nextBalance = applyAccountBalanceDelta(account.account_balance, parsed.data.transaction_amount);
  const updatedAccount = {
    ...account,
    account_balance: nextBalance,
    updated_at: now,
  };
  await updateRow(
    sheets,
    sheetId,
    SHEET_TABS.accounts,
    account.rowNumber,
    toRowValues(SHEET_HEADERS[SHEET_TABS.accounts], updatedAccount),
  );

  invalidateSheetSnapshots(sheetId);
  return created;
};

export const updateTransaction = async (
  sheets: sheets_v4.Sheets,
  sheetId: string,
  transactionId: string,
  input: unknown,
) => {
  const parsed = transactionInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, formatValidationError(parsed.error.issues));
  }
  const dateValidationMessage = validateTransactionDate(parsed.data.transaction_date);
  if (dateValidationMessage) {
    throw new ApiError(400, dateValidationMessage);
  }

  const snapshot = await readSnapshot(sheets, sheetId);
  const existing = snapshot.transactions.find((txn) => txn.id === transactionId);
  if (!existing) {
    throw new ApiError(404, 'Transaction not found');
  }

  const account = snapshot.accounts.find((item) => item.id === parsed.data.account_id);
  if (!account) {
    throw new ApiError(400, 'account_id not found');
  }
  const bucketList = snapshot.categories.find((item) => item.id === parsed.data.bucket_list_id);
  if (!bucketList) {
    throw new ApiError(400, 'bucket_list_id not found');
  }
  const payee = await findOrCreatePayee(sheets, sheetId, parsed.data.payee_name);
  const now = nowIso();

  const adjustments = buildUpdateTransactionAdjustments(
    existing,
    toAmountString(parsed.data.transaction_amount),
    parsed.data.account_id,
  );

  for (const adjustment of adjustments) {
    const targetAccount = snapshot.accounts.find((item) => item.id === adjustment.accountId);
    if (!targetAccount) {
      throw new ApiError(400, `Account ${adjustment.accountId} not found`);
    }
    const updated = {
      ...targetAccount,
      account_balance: applyAccountBalanceDelta(targetAccount.account_balance, adjustment.amountDelta),
      updated_at: now,
    };
    await updateRow(
      sheets,
      sheetId,
      SHEET_TABS.accounts,
      targetAccount.rowNumber,
      toRowValues(SHEET_HEADERS[SHEET_TABS.accounts], updated),
    );
  }

  const updatedTransaction = {
    ...existing,
    transaction_amount: toAmountString(parsed.data.transaction_amount),
    transaction_date: parsed.data.transaction_date,
    annotate: parsed.data.annotate ?? '',
    account_id: account.id,
    bucket_list_id: bucketList.id,
    payee_id: payee.id,
    updated_at: now,
  };

  await updateRow(
    sheets,
    sheetId,
    SHEET_TABS.transactions,
    existing.rowNumber,
    toRowValues(SHEET_HEADERS[SHEET_TABS.transactions], updatedTransaction),
  );

  invalidateSheetSnapshots(sheetId);
  return updatedTransaction;
};

export const deleteTransaction = async (sheets: sheets_v4.Sheets, sheetId: string, transactionId: string) => {
  const snapshot = await readSnapshot(sheets, sheetId);
  const existing = snapshot.transactions.find((txn) => txn.id === transactionId);
  if (!existing) {
    throw new ApiError(404, 'Transaction not found');
  }
  const adjustments = buildDeleteTransactionAdjustments(existing);
  const now = nowIso();
  for (const adjustment of adjustments) {
    const targetAccount = snapshot.accounts.find((item) => item.id === adjustment.accountId);
    if (!targetAccount) {
      continue;
    }
    const updated = {
      ...targetAccount,
      account_balance: applyAccountBalanceDelta(targetAccount.account_balance, adjustment.amountDelta),
      updated_at: now,
    };
    await updateRow(
      sheets,
      sheetId,
      SHEET_TABS.accounts,
      targetAccount.rowNumber,
      toRowValues(SHEET_HEADERS[SHEET_TABS.accounts], updated),
    );
  }

  await deleteEntityRow(sheets, sheetId, SHEET_TABS.transactions, existing);
  invalidateSheetSnapshots(sheetId);
};

