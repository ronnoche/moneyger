import { format } from 'date-fns';
import { getAuthedContext } from '@/lib/api/auth';
import { toErrorResponse } from '@/lib/api/errors';
import { buildCashFlow } from '@/lib/domain/metrics';
import { readSnapshot } from '@/lib/google/sheets-store';
import { ensureSchemaUpToDate } from '@/lib/services/metadataService';

export async function GET(request: Request) {
  try {
    const { clients, sheetId } = await getAuthedContext();
    await ensureSchemaUpToDate(clients.sheets, sheetId);
    const snapshot = await readSnapshot(clients.sheets, sheetId);
    const cashFlow = buildCashFlow(snapshot.accounts);
    const month = new URL(request.url).searchParams.get('month') ?? format(new Date(), 'yyyy-MM');
    const monthTransactions = snapshot.transactions.filter((transaction) => transaction.transaction_date.startsWith(month));

    const accountCards = snapshot.accounts.map((account) => {
      const transactions = monthTransactions.filter((transaction) => transaction.account_id === account.id);
      const total = transactions.reduce((sum, transaction) => sum + Number(transaction.transaction_amount), 0);
      return {
        account,
        transactions,
        total,
      };
    });

    return Response.json({
      ...cashFlow,
      accountCards,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

