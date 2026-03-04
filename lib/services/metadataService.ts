import type { sheets_v4 } from 'googleapis';
import { CURRENT_SCHEMA_VERSION, SHEET_TABS } from '@/lib/google/schema';
import { readSnapshot } from '@/lib/google/sheets-store';
import { updateRow } from '@/lib/google/client';
import { nowIso } from '@/lib/domain/utils';

export const getSchemaVersion = async (sheets: sheets_v4.Sheets, sheetId: string): Promise<string> => {
  const snapshot = await readSnapshot(sheets, sheetId);
  const schemaVersion = snapshot.metadata.find((row) => row.key === 'schemaVersion');
  return schemaVersion?.value ?? '0';
};

export const ensureSchemaUpToDate = async (sheets: sheets_v4.Sheets, sheetId: string) => {
  const snapshot = await readSnapshot(sheets, sheetId);
  const schemaVersionRow = snapshot.metadata.find((row) => row.key === 'schemaVersion');
  if (!schemaVersionRow || schemaVersionRow.value >= CURRENT_SCHEMA_VERSION) {
    return;
  }

  await updateRow(sheets, sheetId, SHEET_TABS.metadata, schemaVersionRow.rowNumber, [
    'schemaVersion',
    CURRENT_SCHEMA_VERSION,
  ]);

  const updatedAtRow = snapshot.metadata.find((row) => row.key === 'updatedAt');
  if (updatedAtRow) {
    await updateRow(sheets, sheetId, SHEET_TABS.metadata, updatedAtRow.rowNumber, ['updatedAt', nowIso()]);
  }
};

