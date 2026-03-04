import { google, sheets_v4 } from 'googleapis';
import type { TokenSet } from '@/lib/google/auth';
import { createOAuthClient } from '@/lib/google/auth';

export interface GoogleClients {
  sheets: sheets_v4.Sheets;
  drive: ReturnType<typeof google.drive>;
}

export const getGoogleClients = (tokens?: TokenSet): GoogleClients => {
  const auth = createOAuthClient(tokens);

  return {
    sheets: google.sheets({ version: 'v4', auth }),
    drive: google.drive({ version: 'v3', auth }),
  };
};

export const batchGetRanges = async (sheets: sheets_v4.Sheets, spreadsheetId: string, ranges: string[]) => {
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
  });

  return response.data.valueRanges ?? [];
};

export const appendRow = async (
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabName: string,
  row: string[],
) => {
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:ZZ`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row],
    },
  });
};

export const updateRow = async (
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabName: string,
  rowNumber: number,
  row: string[],
) => {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A${rowNumber}:ZZ${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row],
    },
  });
};

export const deleteRow = async (
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetId: number,
  rowNumber: number,
) => {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });
};

export const listDriveFiles = async (drive: GoogleClients['drive'], query: string) => {
  const response = await drive.files.list({
    q: query,
    fields: 'files(id,name,appProperties)',
    spaces: 'drive',
    pageSize: 10,
  });

  return response.data.files ?? [];
};

