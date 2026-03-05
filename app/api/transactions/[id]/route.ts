import { getAuthedContext } from '@/lib/api/auth';
import { toErrorResponse } from '@/lib/api/errors';
import { readSnapshot } from '@/lib/google/sheets-store';
import { ensureSchemaUpToDate } from '@/lib/services/metadataService';
import { deleteTransaction, updateTransaction } from '@/lib/services/transactionsService';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    const { clients, sheetId } = await getAuthedContext();
    const snapshot = await readSnapshot(clients.sheets, sheetId);
    const transaction = snapshot.transactions.find((txn) => txn.id === id);
    if (!transaction) {
      return Response.json({ error: { message: 'Transaction not found' } }, { status: 404 });
    }
    const payee = snapshot.payees.find((item) => item.id === transaction.payee_id);
    return Response.json({
      transaction: {
        ...transaction,
        payee_name: payee?.name ?? '',
      },
    });
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
    const transaction = await updateTransaction(clients.sheets, sheetId, id, body);
    return Response.json({ transaction });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    const { clients, sheetId } = await getAuthedContext();
    await ensureSchemaUpToDate(clients.sheets, sheetId);
    await deleteTransaction(clients.sheets, sheetId, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

