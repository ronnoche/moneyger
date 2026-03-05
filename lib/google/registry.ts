import { formatISO } from 'date-fns';
import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';

const REGISTRY_SPREADSHEET_ID = process.env.GOOGLE_REGISTRY_SPREADSHEET_ID;
const REGISTRY_TAB = 'Users';

if (!REGISTRY_SPREADSHEET_ID) {
  throw new Error('Missing GOOGLE_REGISTRY_SPREADSHEET_ID');
}

const getRegistrySheetsClient = (): sheets_v4.Sheets => {
  const clientEmail = process.env.GOOGLE_REGISTRY_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_REGISTRY_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error('Missing GOOGLE_REGISTRY_CLIENT_EMAIL or GOOGLE_REGISTRY_PRIVATE_KEY');
  }

  const auth = new google.auth.JWT(
    clientEmail,
    undefined,
    privateKey.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets'],
  );

  return google.sheets({ version: 'v4', auth });
};

export interface RegistryUser {
  googleSub: string;
  email: string;
  userSheetId: string;
  registeredAt: string;
  lastSeenAt: string;
  status: string;
}

interface RegistryLookupResult {
  user: RegistryUser;
  rowNumber: number;
}

const mapRowToUser = (row: string[]): RegistryUser => {
  const [googleSub, email, userSheetId, registeredAt, lastSeenAt, status] = row;

  return {
    googleSub,
    email,
    userSheetId,
    registeredAt,
    lastSeenAt,
    status: status ?? 'active',
  };
};

export const findRegistryUserBySub = async (googleSub: string): Promise<RegistryLookupResult | null> => {
  const sheets = getRegistrySheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: REGISTRY_SPREADSHEET_ID,
    range: `${REGISTRY_TAB}!A2:F`,
  });

  const rows = response.data.values ?? [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row[0] === googleSub) {
      const rowNumber = index + 2; // account for header row
      return {
        user: mapRowToUser(row),
        rowNumber,
      };
    }
  }

  return null;
};

export const createRegistryUser = async (params: {
  googleSub: string;
  email: string;
  userSheetId: string;
  status?: string;
}): Promise<RegistryUser> => {
  const sheets = getRegistrySheetsClient();
  const now = formatISO(new Date());

  const registeredAt = now;
  const lastSeenAt = now;
  const status = params.status ?? 'active';

  const row: string[] = [
    params.googleSub,
    params.email,
    params.userSheetId,
    registeredAt,
    lastSeenAt,
    status,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: REGISTRY_SPREADSHEET_ID,
    range: `${REGISTRY_TAB}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row],
    },
  });

  return {
    googleSub: params.googleSub,
    email: params.email,
    userSheetId: params.userSheetId,
    registeredAt,
    lastSeenAt,
    status,
  };
};

export const touchRegistryLastSeen = async (googleSub: string): Promise<void> => {
  const sheets = getRegistrySheetsClient();
  const lookup = await findRegistryUserBySub(googleSub);

  if (!lookup) {
    return;
  }

  const now = formatISO(new Date());

  await sheets.spreadsheets.values.update({
    spreadsheetId: REGISTRY_SPREADSHEET_ID,
    range: `${REGISTRY_TAB}!E${lookup.rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[now]],
    },
  });
};

export const syncRegistryUser = async (params: {
  googleSub: string;
  email: string;
  userSheetId: string;
}): Promise<{ isFirstTime: boolean }> => {
  const sheets = getRegistrySheetsClient();
  const now = formatISO(new Date());

  const existing = await findRegistryUserBySub(params.googleSub);

  if (!existing) {
    await createRegistryUser({
      googleSub: params.googleSub,
      email: params.email,
      userSheetId: params.userSheetId,
    });

    return { isFirstTime: true };
  }

  const values: string[] = [
    existing.user.googleSub,
    params.email,
    params.userSheetId,
    existing.user.registeredAt,
    now,
    existing.user.status,
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: REGISTRY_SPREADSHEET_ID,
    range: `${REGISTRY_TAB}!A${existing.rowNumber}:F${existing.rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [values],
    },
  });

  return { isFirstTime: false };
};

