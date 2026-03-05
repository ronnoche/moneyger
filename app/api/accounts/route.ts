import { getAuthedContext } from '@/lib/api/auth';
import { toErrorResponse } from '@/lib/api/errors';
import { createAccount, listAccounts } from '@/lib/services/accountsService';
import { ensureSchemaUpToDate } from '@/lib/services/metadataService';

export async function GET() {
  try {
    const { clients, sheetId } = await getAuthedContext();
    const accounts = await listAccounts(clients.sheets, sheetId);
    return Response.json({ accounts });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { clients, sheetId } = await getAuthedContext();
    await ensureSchemaUpToDate(clients.sheets, sheetId);
    const body = await request.json();
    const account = await createAccount(clients.sheets, sheetId, body);
    return Response.json({ account }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

