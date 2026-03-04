import { getAuthedContext } from '@/lib/api/auth';
import { toErrorResponse } from '@/lib/api/errors';
import { deleteAccountBudget, updateAccountBudget } from '@/lib/services/accountBudgetsService';
import { ensureSchemaUpToDate } from '@/lib/services/metadataService';

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, context: Params) {
  try {
    const { id } = await context.params;
    const { clients, sheetId } = await getAuthedContext();
    await ensureSchemaUpToDate(clients.sheets, sheetId);
    const body = await request.json();
    const accountBudget = await updateAccountBudget(clients.sheets, sheetId, id, body);
    return Response.json({ accountBudget });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    const { clients, sheetId } = await getAuthedContext();
    await ensureSchemaUpToDate(clients.sheets, sheetId);
    await deleteAccountBudget(clients.sheets, sheetId, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

