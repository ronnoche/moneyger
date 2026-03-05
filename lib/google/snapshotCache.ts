import type { sheets_v4 } from 'googleapis';
import type { SheetsSnapshot } from '@/lib/domain/types';
import {
  parseAccountBudgets,
  parseAccounts,
  parseBudgets,
  parsePayees,
  parseTransactions,
} from '@/lib/google/mappers';
import { batchGetRanges } from '@/lib/google/client';
import { SHEET_TABS } from '@/lib/google/schema';
import { readSnapshot } from '@/lib/google/sheets-store';

type CacheEntry<T> = {
  snapshot: T;
  fetchedAt: number;
};

const CACHE_TTL_MS = 5000;

type AccountsSnapshot = Pick<SheetsSnapshot, 'accounts' | 'accountBudgets'>;
type TransactionsSnapshot = Pick<SheetsSnapshot, 'transactions' | 'accounts' | 'budgets' | 'payees'>;

const fullSnapshotCache = new Map<string, CacheEntry<SheetsSnapshot>>();
const accountsSnapshotCache = new Map<string, CacheEntry<AccountsSnapshot>>();
const transactionsSnapshotCache = new Map<string, CacheEntry<TransactionsSnapshot>>();

const isFresh = (entry: CacheEntry<unknown>): boolean => {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
};

const getOrLoad = async <T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  loader: () => Promise<T>,
): Promise<T> => {
  const existing = cache.get(key);
  if (existing && isFresh(existing)) {
    return existing.snapshot;
  }

  const snapshot = await loader();
  cache.set(key, { snapshot, fetchedAt: Date.now() });
  return snapshot;
};

export const getCachedSnapshot = async (
  sheets: sheets_v4.Sheets,
  sheetId: string,
): Promise<SheetsSnapshot> => {
  return getOrLoad(fullSnapshotCache, sheetId, () => readSnapshot(sheets, sheetId));
};

const loadAccountsSnapshot = async (
  sheets: sheets_v4.Sheets,
  sheetId: string,
): Promise<AccountsSnapshot> => {
  const ranges = [`${SHEET_TABS.accounts}!A:ZZ`, `${SHEET_TABS.accountBudgets}!A:ZZ`];
  const valueRanges = await batchGetRanges(sheets, sheetId, ranges);

  return {
    accounts: parseAccounts(valueRanges[0]?.values as string[][] | undefined),
    accountBudgets: parseAccountBudgets(valueRanges[1]?.values as string[][] | undefined),
  };
};

export const getCachedAccountsSnapshot = async (
  sheets: sheets_v4.Sheets,
  sheetId: string,
): Promise<AccountsSnapshot> => {
  return getOrLoad(accountsSnapshotCache, sheetId, () => loadAccountsSnapshot(sheets, sheetId));
};

const loadTransactionsSnapshot = async (
  sheets: sheets_v4.Sheets,
  sheetId: string,
): Promise<TransactionsSnapshot> => {
  const ranges = [
    `${SHEET_TABS.transactions}!A:ZZ`,
    `${SHEET_TABS.accounts}!A:ZZ`,
    `${SHEET_TABS.budgets}!A:ZZ`,
    `${SHEET_TABS.payees}!A:ZZ`,
  ];
  const valueRanges = await batchGetRanges(sheets, sheetId, ranges);

  return {
    transactions: parseTransactions(valueRanges[0]?.values as string[][] | undefined),
    accounts: parseAccounts(valueRanges[1]?.values as string[][] | undefined),
    budgets: parseBudgets(valueRanges[2]?.values as string[][] | undefined),
    payees: parsePayees(valueRanges[3]?.values as string[][] | undefined),
  };
};

export const getCachedTransactionsSnapshot = async (
  sheets: sheets_v4.Sheets,
  sheetId: string,
): Promise<TransactionsSnapshot> => {
  return getOrLoad(transactionsSnapshotCache, sheetId, () => loadTransactionsSnapshot(sheets, sheetId));
};

export const invalidateSheetSnapshots = (sheetId: string) => {
  fullSnapshotCache.delete(sheetId);
  accountsSnapshotCache.delete(sheetId);
  transactionsSnapshotCache.delete(sheetId);
};

