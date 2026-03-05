import type { sheets_v4 } from 'googleapis';
import { deleteRow } from '@/lib/google/client';
import { rowFromObject } from '@/lib/google/mappers';
import type { RowEntity } from '@/lib/domain/types';
import { getTabNumericIds } from '@/lib/google/sheets-store';

export const nextId = <T extends { id: string }>(items: T[]): string => {
  const ids = items
    .map((item) => Number(item.id))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  const max = ids[ids.length - 1] ?? 0;
  return String(max + 1);
};

export const formatValidationError = (issues: Array<{ path: PropertyKey[]; message: string }>) =>
  issues
    .map((issue) => `${issue.path.map((segment) => String(segment)).join('.') || 'input'}: ${issue.message}`)
    .join(', ');

export const toRowValues = <T extends object>(header: string[], value: T): string[] =>
  rowFromObject(header, value);

export const deleteEntityRow = async (
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabName: string,
  row: RowEntity,
) => {
  const tabMap = await getTabNumericIds(sheets, spreadsheetId);
  const numericTabId = tabMap.get(tabName);
  if (numericTabId === undefined) {
    throw new Error(`Unable to find tab id for ${tabName}`);
  }
  await deleteRow(sheets, spreadsheetId, numericTabId, row.rowNumber);
};

