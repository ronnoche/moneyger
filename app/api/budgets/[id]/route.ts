import { getAuthedContext } from '@/lib/api/auth';
import { toErrorResponse } from '@/lib/api/errors';
import { deleteBudget, getBudgetById, updateBudget } from '@/lib/services/budgetsService';
import { ensureSchemaUpToDate } from '@/lib/services/metadataService';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    const { clients, sheetId } = await getAuthedContext();
    await ensureSchemaUpToDate(clients.sheets, sheetId);
    const budget = await getBudgetById(clients.sheets, sheetId, id);
    if (!budget) {
      return Response.json({ error: { message: 'Budget not found' } }, { status: 404 });
    }
    return Response.json({ budget });
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
    const budget = await updateBudget(clients.sheets, sheetId, id, body);
    return Response.json({ budget });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    const { clients, sheetId } = await getAuthedContext();
    await ensureSchemaUpToDate(clients.sheets, sheetId);
    await deleteBudget(clients.sheets, sheetId, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

