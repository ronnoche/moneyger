import { formatISO } from 'date-fns';
import type { TokenSet } from '@/lib/google/auth';
import { getGoogleClients } from '@/lib/google/client';
import { appendRow } from '@/lib/google/client';
import { CURRENT_SCHEMA_VERSION, SHEET_TABS } from '@/lib/google/schema';
import { ensureTabsAndHeaders, readSnapshot } from '@/lib/google/sheets-store';
import { seedAccounts, seedBudgets, seedPayees } from '@/lib/domain/seeds';

export const ensureUserSheetExists = async (tokens: TokenSet): Promise<string> => {
  const { drive, sheets } = getGoogleClients(tokens);
  const files = await drive.files.list({
    q: "appProperties has { key='project' and value='moneyger' } and trashed = false",
    fields: 'files(id,name)',
    spaces: 'drive',
    pageSize: 1,
  });

  const existing = files.data.files?.[0];
  if (existing?.id) {
    await ensureTabsAndHeaders(sheets, existing.id);
    return existing.id;
  }

  const create = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: 'Moneyger',
      },
    },
  });

  const spreadsheetId = create.data.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error('Failed to create Moneyger spreadsheet');
  }

  await drive.files.update({
    fileId: spreadsheetId,
    requestBody: {
      appProperties: {
        project: 'moneyger',
      },
    },
  });

  await ensureTabsAndHeaders(sheets, spreadsheetId);
  await initializeMetadataRows(spreadsheetId, tokens);

  return spreadsheetId;
};

const initializeMetadataRows = async (spreadsheetId: string, tokens: TokenSet) => {
  const { sheets } = getGoogleClients(tokens);
  const now = formatISO(new Date());

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_TABS.metadata}!A:Z`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        ['schemaVersion', CURRENT_SCHEMA_VERSION],
        ['createdAt', now],
        ['updatedAt', now],
      ],
    },
  });
};

export const seedSheetData = async (spreadsheetId: string, tokens: TokenSet) => {
  const { sheets } = getGoogleClients(tokens);
  const snapshot = await readSnapshot(sheets, spreadsheetId);
  if (snapshot.accounts.length > 0 || snapshot.budgets.length > 0 || snapshot.payees.length > 0) {
    return;
  }

  const now = formatISO(new Date());

  for (const [index, account] of seedAccounts.entries()) {
    await appendRow(sheets, spreadsheetId, SHEET_TABS.accounts, [
      String(index + 1),
      account.account_name,
      account.account_type,
      account.account_balance,
      'false',
      '',
      now,
      now,
    ]);
  }

  for (const [index, budgetName] of seedBudgets.entries()) {
    await appendRow(sheets, spreadsheetId, SHEET_TABS.budgets, [
      String(index + 1),
      budgetName,
      'savings',
      '',
      '',
      '',
      '0.00',
      '',
      'false',
      '',
      '',
      '',
      now,
      now,
    ]);
  }

  for (const [index, payeeName] of seedPayees.entries()) {
    await appendRow(sheets, spreadsheetId, SHEET_TABS.payees, [String(index + 1), payeeName, now, now]);
  }
};

