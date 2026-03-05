import { getAuthedContext } from '@/lib/api/auth';
import { toErrorResponse } from '@/lib/api/errors';
import { readSnapshot } from '@/lib/google/sheets-store';
import { deleteAccount, updateAccount } from '@/lib/services/accountsService';
import { ensureSchemaUpToDate } from '@/lib/services/metadataService';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    const { clients, sheetId } = await getAuthedContext();
    const snapshot = await readSnapshot(clients.sheets, sheetId);
    const account = snapshot.accounts.find((item) => item.id === id);
    if (!account) {
      return Response.json({ error: { message: 'Account not found' } }, { status: 404 });
    }
    return Response.json({ account });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request, context: Params) {
  try {
    const { id } = await context.params;
    const { clients, sheetId } = await getAuthedContext();
    await ensureSchemaUpToDate(clients.sheets, sheetId);
    const body = await request.json();
    const account = await updateAccount(clients.sheets, sheetId, id, body);
    return Response.json({ account });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    const { clients, sheetId } = await getAuthedContext();
    await ensureSchemaUpToDate(clients.sheets, sheetId);
    await deleteAccount(clients.sheets, sheetId, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

