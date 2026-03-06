import type { sheets_v4 } from 'googleapis';
import { format } from 'date-fns';
import type {
  Category,
  CategoryAssignment,
  CategoryGoal,
  CategoryGroup,
  SheetsSnapshot,
} from '@/lib/domain/types';
import { parseAmount } from '@/lib/domain/utils';
import { buildAvailableFromAssignments } from '@/lib/domain/metrics';
import { SHEET_HEADERS, SHEET_TABS } from '@/lib/google/schema';
import { readSnapshot } from '@/lib/google/sheets-store';
import { appendRow, updateRow } from '@/lib/google/client';
import { nextId, toRowValues } from '@/lib/services/helpers';

export interface BudgetWorkspaceCategory {
  id: string;
  group_id: string;
  name: string;
  icon: string;
  sort_order: number;
  assigned: number;
  activity: number;
  available: number;
  goal?: CategoryGoalSummary | null;
}

export interface CategoryGoalSummary {
  id: string;
  goal_type: CategoryGoal['goal_type'];
  target_amount: number;
  target_date: string;
  cadence: string;
}

export interface BudgetWorkspaceGroup {
  id: string;
  name: string;
  sort_order: number;
  categories: BudgetWorkspaceCategory[];
}

export interface BudgetWorkspaceSummary {
  month_key: string;
  ready_to_assign: number;
  assigned_total: number;
  activity_total: number;
  available_total: number;
}

export interface BudgetWorkspaceResponse {
  groups: BudgetWorkspaceGroup[];
  summary: BudgetWorkspaceSummary;
}

const monthKeyFromDate = (date: Date): string => format(date, 'yyyy-MM');

export const buildPersistentAssignedByCategory = (
  assignments: CategoryAssignment[],
): Map<string, number> => {
  const latestByCategory = new Map<string, { month_key: string; assigned_amount: number }>();

  assignments.forEach((assignment) => {
    const assigned_amount = parseAmount(assignment.assigned_amount);
    const current = latestByCategory.get(assignment.category_id);
    if (!current || assignment.month_key >= current.month_key) {
      latestByCategory.set(assignment.category_id, {
        month_key: assignment.month_key,
        assigned_amount,
      });
    }
  });

  const persistentByCategory = new Map<string, number>();
  latestByCategory.forEach((value, categoryId) => {
    persistentByCategory.set(categoryId, value.assigned_amount);
  });
  return persistentByCategory;
};

const buildWorkspace = (
  snapshot: SheetsSnapshot,
  monthKey: string,
): BudgetWorkspaceResponse => {
  const assignmentsByCategory = new Map<string, CategoryAssignment[]>();
  snapshot.categoryAssignments
    .filter((assignment) => assignment.month_key === monthKey)
    .forEach((assignment) => {
      const list = assignmentsByCategory.get(assignment.category_id) ?? [];
      list.push(assignment);
      assignmentsByCategory.set(assignment.category_id, list);
    });

  const transactionsByCategory = new Map<string, number>();
  snapshot.transactions.forEach((txn) => {
    const key = txn.bucket_list_id || '';
    if (!key) return;
    const current = transactionsByCategory.get(key) ?? 0;
    transactionsByCategory.set(key, current + parseAmount(txn.transaction_amount));
  });

  const goalsByCategory = new Map<string, CategoryGoal>();
  snapshot.categoryGoals.forEach((goal) => {
    goalsByCategory.set(goal.category_id, goal);
  });

  const groupsById = new Map<string, CategoryGroup>();
  snapshot.categoryGroups.forEach((group) => {
    groupsById.set(group.id, group);
  });

  const categoriesByGroup = new Map<string, Category[]>();
  snapshot.categories.forEach((category) => {
    const list = categoriesByGroup.get(category.group_id) ?? [];
    list.push(category);
    categoriesByGroup.set(category.group_id, list);
  });

  const groups: BudgetWorkspaceGroup[] = [];
  let assigned_total = 0;
  let activity_total = 0;
  let available_total = 0;

  const sortedGroups = snapshot.categoryGroups.slice().sort((a, b) => {
    return Number(a.sort_order) - Number(b.sort_order);
  });

  for (const group of sortedGroups) {
    const categories = (categoriesByGroup.get(group.id) ?? []).slice().sort((a, b) => {
      return Number(a.sort_order) - Number(b.sort_order);
    });

    const workspaceCategories: BudgetWorkspaceCategory[] = categories.map((category) => {
      const assignments = assignmentsByCategory.get(category.id) ?? [];
      const assigned = assignments.reduce(
        (sum, allocation) => sum + parseAmount(allocation.assigned_amount),
        0,
      );

      const activity = transactionsByCategory.get(category.id) ?? 0;
      const available = assigned + activity;

      const goal = goalsByCategory.get(category.id);
      const goalSummary: CategoryGoalSummary | null = goal
        ? {
            id: goal.id,
            goal_type: goal.goal_type,
            target_amount: parseAmount(goal.target_amount),
            target_date: goal.target_date,
            cadence: goal.cadence,
          }
        : null;

      assigned_total += assigned;
      activity_total += activity;
      available_total += available;

      return {
        id: category.id,
        group_id: category.group_id,
        name: category.name,
        icon: category.icon,
        sort_order: Number(category.sort_order),
        assigned,
        activity,
        available,
        goal: goalSummary,
      };
    });

    groups.push({
      id: group.id,
      name: group.name,
      sort_order: Number(group.sort_order),
      categories: workspaceCategories,
    });
  }

  const { assignedTotal, activityTotal, availableTotal } = buildAvailableFromAssignments(
    monthKey,
    snapshot.categoryAssignments,
    snapshot.transactions,
  );

  assigned_total = assignedTotal;
  activity_total = activityTotal;
  available_total = availableTotal;

  const persistentAssignedTotal = Array.from(buildPersistentAssignedByCategory(snapshot.categoryAssignments).values())
    .reduce((sum, assigned) => sum + assigned, 0);

  const ready_to_assign =
    snapshot.accounts
      .filter((account) => account.account_type === 'cash' || account.account_type === 'savings')
      .reduce((sum, account) => sum + parseAmount(account.account_balance), 0) - persistentAssignedTotal;

  return {
    groups,
    summary: {
      month_key: monthKey,
      ready_to_assign,
      assigned_total,
      activity_total,
      available_total,
    },
  };
};

export const getBudgetWorkspace = async (
  sheets: sheets_v4.Sheets,
  sheetId: string,
  monthKey?: string | null,
): Promise<BudgetWorkspaceResponse> => {
  const snapshot = await readSnapshot(sheets, sheetId);
  const key = monthKey && monthKey.length >= 7 ? monthKey.slice(0, 7) : monthKeyFromDate(new Date());
  return buildWorkspace(snapshot, key);
};

export const createCategoryGroup = async (
  sheets: sheets_v4.Sheets,
  sheetId: string,
  name: string,
): Promise<CategoryGroup> => {
  const snapshot = await readSnapshot(sheets, sheetId);
  const id = nextId(snapshot.categoryGroups);
  const sortOrder = String(snapshot.categoryGroups.length + 1);
  const now = new Date().toISOString();
  const group: CategoryGroup = {
    id,
    name,
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
    rowNumber: -1,
  };
  await appendRow(
    sheets,
    sheetId,
    SHEET_TABS.categoryGroups,
    toRowValues(SHEET_HEADERS[SHEET_TABS.categoryGroups], group),
  );
  return group;
};

export const createCategory = async (
  sheets: sheets_v4.Sheets,
  sheetId: string,
  groupId: string,
  name: string,
): Promise<Category> => {
  const snapshot = await readSnapshot(sheets, sheetId);
  const categoriesInGroup = snapshot.categories.filter((category) => category.group_id === groupId);
  const id = nextId(snapshot.categories);
  const sortOrder = String(categoriesInGroup.length + 1);
  const now = new Date().toISOString();
  const category: Category = {
    id,
    group_id: groupId,
    name,
    icon: '',
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
    rowNumber: -1,
  };
  await appendRow(
    sheets,
    sheetId,
    SHEET_TABS.categories,
    toRowValues(SHEET_HEADERS[SHEET_TABS.categories], category),
  );
  return category;
};

export const renameCategory = async (
  sheets: sheets_v4.Sheets,
  sheetId: string,
  categoryId: string,
  name: string,
): Promise<Category> => {
  const snapshot = await readSnapshot(sheets, sheetId);
  const existing = snapshot.categories.find((category) => category.id === categoryId);
  if (!existing) {
    throw new Error('Bucket list was not found.');
  }

  const updated: Category = {
    ...existing,
    name,
    updated_at: new Date().toISOString(),
  };

  await updateRow(
    sheets,
    sheetId,
    SHEET_TABS.categories,
    existing.rowNumber,
    toRowValues(SHEET_HEADERS[SHEET_TABS.categories], updated),
  );

  return updated;
};

export const renameCategoryGroup = async (
  sheets: sheets_v4.Sheets,
  sheetId: string,
  groupId: string,
  name: string,
): Promise<CategoryGroup> => {
  const snapshot = await readSnapshot(sheets, sheetId);
  const existing = snapshot.categoryGroups.find((group) => group.id === groupId);
  if (!existing) {
    throw new Error('Bucket was not found.');
  }

  const updated: CategoryGroup = {
    ...existing,
    name,
    updated_at: new Date().toISOString(),
  };

  await updateRow(
    sheets,
    sheetId,
    SHEET_TABS.categoryGroups,
    existing.rowNumber,
    toRowValues(SHEET_HEADERS[SHEET_TABS.categoryGroups], updated),
  );

  return updated;
};

export const updateCategoryAssigned = async (
  sheets: sheets_v4.Sheets,
  sheetId: string,
  categoryId: string,
  monthKey: string,
  assignedAmount: number,
): Promise<void> => {
  const snapshot = await readSnapshot(sheets, sheetId);
  const existing = snapshot.categoryAssignments.find(
    (assignment) => assignment.category_id === categoryId && assignment.month_key === monthKey,
  );

  const nowIso = new Date().toISOString();
  const assignedString = assignedAmount.toFixed(2);

  if (!existing) {
    const id = nextId(snapshot.categoryAssignments);
    const newAssignment: CategoryAssignment = {
      id,
      category_id: categoryId,
      month_key: monthKey,
      assigned_amount: assignedString,
      source: 'manual_inline',
      created_at: nowIso,
      updated_at: nowIso,
      rowNumber: -1,
    };
    await appendRow(
      sheets,
      sheetId,
      SHEET_TABS.categoryAssignments,
      toRowValues(SHEET_HEADERS[SHEET_TABS.categoryAssignments], newAssignment),
    );
    return;
  }

  const updated: CategoryAssignment = {
    ...existing,
    assigned_amount: assignedString,
    updated_at: nowIso,
  };

  await updateRow(
    sheets,
    sheetId,
    SHEET_TABS.categoryAssignments,
    existing.rowNumber,
    toRowValues(SHEET_HEADERS[SHEET_TABS.categoryAssignments], updated),
  );
};

