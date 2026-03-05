import type { sheets_v4 } from 'googleapis';
import type { SheetsSnapshot } from '@/lib/domain/types';
import {
  parseAccountBudgets,
  parseAccounts,
  parseBudgets,
  parseCategoryAssignments,
  parseCategoryGoals,
  parseCategoryGroups,
  parseCategories,
  parseMetadata,
  parsePayees,
  parseTransactions,
} from '@/lib/google/mappers';
import { batchGetRanges } from '@/lib/google/client';
import { SHEET_HEADERS, SHEET_TABS } from '@/lib/google/schema';

export const readSnapshot = async (sheets: sheets_v4.Sheets, spreadsheetId: string): Promise<SheetsSnapshot> => {
  const ranges = [
    `${SHEET_TABS.accounts}!A:ZZ`,
    `${SHEET_TABS.budgets}!A:ZZ`,
    `${SHEET_TABS.transactions}!A:ZZ`,
    `${SHEET_TABS.accountBudgets}!A:ZZ`,
    `${SHEET_TABS.payees}!A:ZZ`,
    `${SHEET_TABS.metadata}!A:ZZ`,
    `${SHEET_TABS.categoryGroups}!A:ZZ`,
    `${SHEET_TABS.categories}!A:ZZ`,
    `${SHEET_TABS.categoryAssignments}!A:ZZ`,
    `${SHEET_TABS.categoryGoals}!A:ZZ`,
  ];
  const valueRanges = await batchGetRanges(sheets, spreadsheetId, ranges);

  return {
    accounts: parseAccounts(valueRanges[0]?.values as string[][] | undefined),
    budgets: parseBudgets(valueRanges[1]?.values as string[][] | undefined),
    transactions: parseTransactions(valueRanges[2]?.values as string[][] | undefined),
    accountBudgets: parseAccountBudgets(valueRanges[3]?.values as string[][] | undefined),
    payees: parsePayees(valueRanges[4]?.values as string[][] | undefined),
    metadata: parseMetadata(valueRanges[5]?.values as string[][] | undefined),
    categoryGroups: parseCategoryGroups(valueRanges[6]?.values as string[][] | undefined),
    categories: parseCategories(valueRanges[7]?.values as string[][] | undefined),
    categoryAssignments: parseCategoryAssignments(valueRanges[8]?.values as string[][] | undefined),
    categoryGoals: parseCategoryGoals(valueRanges[9]?.values as string[][] | undefined),
  };
};

export const getTabNumericIds = async (sheets: sheets_v4.Sheets, spreadsheetId: string) => {
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const properties = response.data.sheets?.map((sheet) => sheet.properties).filter(Boolean) ?? [];
  const tabMap = new Map<string, number>();
  properties.forEach((property) => {
    if (property?.title && property.sheetId !== undefined && property.sheetId !== null) {
      tabMap.set(property.title, property.sheetId);
    }
  });
  return tabMap;
};

export const ensureTabsAndHeaders = async (sheets: sheets_v4.Sheets, spreadsheetId: string) => {
  const tabMap = await getTabNumericIds(sheets, spreadsheetId);
  const missingTabs = Object.values(SHEET_TABS).filter((tabName) => !tabMap.has(tabName));

  if (missingTabs.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: missingTabs.map((tabName) => ({
          addSheet: {
            properties: {
              title: tabName,
            },
          },
        })),
      },
    });
  }

  await Promise.all(
    Object.entries(SHEET_HEADERS).map(async ([tabName, header]) => {
      const range = `${tabName}!A1:ZZ1`;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
      const existingHeader = response.data.values?.[0] ?? [];
      if (existingHeader.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'RAW',
          requestBody: {
            values: [header],
          },
        });
      }
    }),
  );
};

