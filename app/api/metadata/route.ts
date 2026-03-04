import { getAuthedContext } from '@/lib/api/auth';
import { toErrorResponse } from '@/lib/api/errors';
import { CURRENT_SCHEMA_VERSION } from '@/lib/google/schema';
import { ensureSchemaUpToDate, getSchemaVersion } from '@/lib/services/metadataService';

export async function GET() {
  try {
    const { clients, sheetId } = await getAuthedContext();
    await ensureSchemaUpToDate(clients.sheets, sheetId);
    const schemaVersion = await getSchemaVersion(clients.sheets, sheetId);
    return Response.json({ schemaVersion, currentSchemaVersion: CURRENT_SCHEMA_VERSION });
  } catch (error) {
    return toErrorResponse(error);
  }
}

