import { getAuthedContext } from '@/lib/api/auth';
import { toErrorResponse } from '@/lib/api/errors';
import { createAccountBudget } from '@/lib/services/accountBudgetsService';
import { ensureSchemaUpToDate } from '@/lib/services/metadataService';

export async function POST(request: Request) {
  try {
    const { clients, sheetId } = await getAuthedContext();
    await ensureSchemaUpToDate(clients.sheets, sheetId);
    const body = await request.json();
    const accountBudget = await createAccountBudget(clients.sheets, sheetId, body);
    return Response.json({ accountBudget }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

