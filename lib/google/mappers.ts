import type {
  Account,
  AccountBudget,
  Budget,
  Category,
  CategoryAssignment,
  CategoryGoal,
  CategoryGroup,
  MetadataRow,
  Payee,
  Transaction,
} from '@/lib/domain/types';

type SheetValues = string[][];

const objectFromRow = <T extends object>(
  header: string[],
  row: string[],
  rowNumber: number,
): T & { rowNumber: number } => {
  const value = header.reduce<Record<string, string>>((accumulator, key, index) => {
    accumulator[key] = row[index] ?? '';
    return accumulator;
  }, {});

  return { ...(value as object), rowNumber } as T & { rowNumber: number };
};

export const parseSheet = <T extends object>(values?: SheetValues): (T & { rowNumber: number })[] => {
  if (!values || values.length < 2) {
    return [];
  }

  const header = values[0];
  return values.slice(1).map((row, index) => objectFromRow<T>(header, row, index + 2));
};

export const parseAccounts = (values?: SheetValues): Account[] => parseSheet<Account>(values);
export const parseBudgets = (values?: SheetValues): Budget[] => parseSheet<Budget>(values);
export const parseTransactions = (values?: SheetValues): Transaction[] => parseSheet<Transaction>(values);
export const parseAccountBudgets = (values?: SheetValues): AccountBudget[] => parseSheet<AccountBudget>(values);
export const parsePayees = (values?: SheetValues): Payee[] => parseSheet<Payee>(values);
export const parseMetadata = (values?: SheetValues): MetadataRow[] => parseSheet<MetadataRow>(values);
export const parseCategoryGroups = (values?: SheetValues): CategoryGroup[] =>
  parseSheet<CategoryGroup>(values);
export const parseCategories = (values?: SheetValues): Category[] => parseSheet<Category>(values);
export const parseCategoryAssignments = (values?: SheetValues): CategoryAssignment[] =>
  parseSheet<CategoryAssignment>(values);
export const parseCategoryGoals = (values?: SheetValues): CategoryGoal[] =>
  parseSheet<CategoryGoal>(values);

export const rowFromObject = (
  header: string[],
  value: Record<string, string | number | undefined | null>,
): string[] => header.map((column) => String(value[column] ?? ''));

