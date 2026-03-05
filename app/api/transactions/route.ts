import { getAuthedContext } from '@/lib/api/auth';
import { toErrorResponse } from '@/lib/api/errors';
import { ensureSchemaUpToDate } from '@/lib/services/metadataService';
import { createTransaction, listTransactions } from '@/lib/services/transactionsService';

export async function GET(request: Request) {
  try {
    const { clients, sheetId } = await getAuthedContext();
    await ensureSchemaUpToDate(clients.sheets, sheetId);
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const bucketListId = searchParams.get('bucketListId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const transactions = await listTransactions(clients.sheets, sheetId, {
      accountId,
      bucketListId,
      startDate,
      endDate,
    });
    return Response.json({ transactions });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { clients, sheetId } = await getAuthedContext();
    await ensureSchemaUpToDate(clients.sheets, sheetId);
    const body = await request.json();
    const transaction = await createTransaction(clients.sheets, sheetId, body);
    return Response.json({ transaction }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

