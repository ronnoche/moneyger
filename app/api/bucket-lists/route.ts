import { getAuthedContext } from '@/lib/api/auth';
import { toErrorResponse } from '@/lib/api/errors';
import { ensureSchemaUpToDate } from '@/lib/services/metadataService';
import { readSnapshot } from '@/lib/google/sheets-store';

export async function GET() {
  try {
    const { clients, sheetId } = await getAuthedContext();
    await ensureSchemaUpToDate(clients.sheets, sheetId);
    const snapshot = await readSnapshot(clients.sheets, sheetId);
    const groupsById = new Map(snapshot.categoryGroups.map((group) => [group.id, group.name]));
    const bucket_lists = snapshot.categories.map((category) => ({
      id: category.id,
      name: category.name,
      bucket_id: category.group_id,
      bucket_name: groupsById.get(category.group_id) ?? '',
    }));
    return Response.json({ bucket_lists });
  } catch (error) {
    return toErrorResponse(error);
  }
}
