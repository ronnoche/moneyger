import { format } from 'date-fns';
import { getAuthedContext } from '@/lib/api/auth';
import { toErrorResponse } from '@/lib/api/errors';
import { createBudget, listBudgetsWithMetrics } from '@/lib/services/budgetsService';
import { ensureSchemaUpToDate } from '@/lib/services/metadataService';

export async function GET(request: Request) {
  try {
    const { clients, sheetId } = await getAuthedContext();
    await ensureSchemaUpToDate(clients.sheets, sheetId);
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') ?? format(new Date(), 'yyyy-MM-01');
    const data = await listBudgetsWithMetrics(clients.sheets, sheetId, month);
    return Response.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { clients, sheetId } = await getAuthedContext();
    await ensureSchemaUpToDate(clients.sheets, sheetId);
    const body = await request.json();
    const budget = await createBudget(clients.sheets, sheetId, body);
    return Response.json({ budget }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

