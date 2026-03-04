import { getAuthedContext } from '@/lib/api/auth';
import { toErrorResponse } from '@/lib/api/errors';
import { ensureSchemaUpToDate } from '@/lib/services/metadataService';
import { listPayees } from '@/lib/services/payeesService';

export async function GET() {
  try {
    const { clients, sheetId } = await getAuthedContext();
    await ensureSchemaUpToDate(clients.sheets, sheetId);
    const payees = await listPayees(clients.sheets, sheetId);
    return Response.json({ payees });
  } catch (error) {
    return toErrorResponse(error);
  }
}

