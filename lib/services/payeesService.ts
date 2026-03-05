import type { sheets_v4 } from 'googleapis';
import { ApiError } from '@/lib/api/errors';
import { nowIso } from '@/lib/domain/utils';
import { appendRow } from '@/lib/google/client';
import { SHEET_HEADERS, SHEET_TABS } from '@/lib/google/schema';
import { readSnapshot } from '@/lib/google/sheets-store';
import { invalidateSheetSnapshots } from '@/lib/google/snapshotCache';
import { nextId, toRowValues } from '@/lib/services/helpers';

export const listPayees = async (sheets: sheets_v4.Sheets, sheetId: string) => {
  const snapshot = await readSnapshot(sheets, sheetId);
  return snapshot.payees.sort((a, b) => a.name.localeCompare(b.name));
};

export const findOrCreatePayee = async (sheets: sheets_v4.Sheets, sheetId: string, payeeName: string) => {
  const snapshot = await readSnapshot(sheets, sheetId);
  const existing = snapshot.payees.find((payee) => payee.name.toLowerCase() === payeeName.toLowerCase());
  if (existing) {
    return existing;
  }
  if (!payeeName.trim()) {
    throw new ApiError(400, 'payee_name is required');
  }

  const now = nowIso();
  const created = {
    id: nextId(snapshot.payees),
    name: payeeName.trim(),
    created_at: now,
    updated_at: now,
  };
  await appendRow(sheets, sheetId, SHEET_TABS.payees, toRowValues(SHEET_HEADERS[SHEET_TABS.payees], created));
  invalidateSheetSnapshots(sheetId);
  return { ...created, rowNumber: -1 };
};

