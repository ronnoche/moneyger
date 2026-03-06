import { getAuthedContext } from '@/lib/api/auth';
import { toErrorResponse } from '@/lib/api/errors';
import { ensureSchemaUpToDate } from '@/lib/services/metadataService';
import {
  createCategory,
  createCategoryGroup,
  deleteCategoryGroup,
  getBudgetWorkspace,
  renameCategory,
  renameCategoryGroup,
  updateCategoryAssigned,
} from '@/lib/services/budgetWorkspaceService';

export async function GET(request: Request) {
  try {
    const { clients, sheetId } = await getAuthedContext();
    await ensureSchemaUpToDate(clients.sheets, sheetId);
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month_key');
    const data = await getBudgetWorkspace(clients.sheets, sheetId, month);
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

    if (body.action === 'create_group') {
      const group = await createCategoryGroup(clients.sheets, sheetId, body.name);
      return Response.json({ group }, { status: 201 });
    }

    if (body.action === 'create_category') {
      const category = await createCategory(clients.sheets, sheetId, body.group_id, body.name);
      return Response.json({ category }, { status: 201 });
    }

    if (body.action === 'rename_group') {
      const group = await renameCategoryGroup(clients.sheets, sheetId, body.group_id, body.name);
      return Response.json({ group });
    }

    if (body.action === 'delete_group') {
      await deleteCategoryGroup(clients.sheets, sheetId, body.group_id);
      return Response.json({ ok: true });
    }

    if (body.action === 'rename_category') {
      const category = await renameCategory(clients.sheets, sheetId, body.category_id, body.name);
      return Response.json({ category });
    }

    if (body.action === 'update_assigned') {
      await updateCategoryAssigned(
        clients.sheets,
        sheetId,
        body.category_id,
        body.month_key,
        body.assigned_amount,
      );
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

