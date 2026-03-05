import type { sheets_v4 } from 'googleapis';
import { SHEET_TABS } from '@/lib/google/schema';
import { appendRow } from '@/lib/google/client';
import { readSnapshot } from '@/lib/google/sheets-store';
import type {
  AccountBudget,
  Budget,
  Category,
  CategoryAssignment,
  CategoryGoal,
  CategoryGroup,
  SheetsSnapshot,
} from '@/lib/domain/types';

interface MigrationReport {
  fromVersion: string;
  toVersion: string;
  createdCategoryGroups: number;
  createdCategories: number;
  createdAssignments: number;
  createdGoals: number;
}

const monthKeyFromIso = (iso: string): string => {
  if (!iso) return '';
  // Expect formats like YYYY-MM-DD or full ISO; month key is first 7 chars.
  return iso.slice(0, 7);
};

const hasV2Data = (snapshot: SheetsSnapshot): boolean => {
  return (
    snapshot.categoryGroups.length > 0 ||
    snapshot.categories.length > 0 ||
    snapshot.categoryAssignments.length > 0 ||
    snapshot.categoryGoals.length > 0
  );
};

const nextStringId = (existing: { id: string }[]): string => {
  if (existing.length === 0) return '1';
  const max = existing.reduce((acc, row) => {
    const numeric = Number(row.id);
    if (Number.isNaN(numeric)) return acc;
    return Math.max(acc, numeric);
  }, 0);
  return String(max + 1);
};

const buildDefaultGroup = (budgets: Budget[]): CategoryGroup | null => {
  if (budgets.length === 0) return null;
  const now = budgets[0]?.created_at || budgets[0]?.updated_at || '';
  return {
    id: '1',
    name: 'General',
    sort_order: '1',
    created_at: now,
    updated_at: now,
    rowNumber: -1,
  };
};

const inferGoalType = (budget: Budget): CategoryGoal['goal_type'] => {
  if (budget.is_indefinite === 'true' && budget.cadence) {
    return 'monthly_savings';
  }
  if (budget.is_indefinite === 'false' && budget.target_date) {
    return 'needed_by_date';
  }
  return '';
};

export const runMigrations = async (
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  fromVersion: string,
  toVersion: string,
): Promise<MigrationReport | null> => {
  if (fromVersion === toVersion) {
    return null;
  }

  const snapshot = await readSnapshot(sheets, spreadsheetId);

  if (fromVersion === '1' && toVersion === '2') {
    if (hasV2Data(snapshot)) {
      return {
        fromVersion,
        toVersion,
        createdCategoryGroups: 0,
        createdCategories: 0,
        createdAssignments: 0,
        createdGoals: 0,
      };
    }

    return migrateV1ToV2(sheets, spreadsheetId, snapshot);
  }

  // Future versions: chain additional migrations here.
  return null;
};

const migrateV1ToV2 = async (
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  snapshot: SheetsSnapshot,
): Promise<MigrationReport> => {
  let createdCategoryGroups = 0;
  let createdCategories = 0;
  let createdAssignments = 0;
  let createdGoals = 0;

  const budgets = snapshot.budgets;
  const accountBudgets = snapshot.accountBudgets;

  // 1) Default group
  let defaultGroupId = '1';
  if (snapshot.categoryGroups.length === 0) {
    const group = buildDefaultGroup(budgets);
    if (group) {
      await appendRow(sheets, spreadsheetId, SHEET_TABS.categoryGroups, [
        group.id,
        group.name,
        group.sort_order,
        group.created_at,
        group.updated_at,
      ]);
      createdCategoryGroups += 1;
    }
  } else {
    defaultGroupId = snapshot.categoryGroups[0].id;
  }

  // Reload groups/categories in case other processes wrote to them; for now, rely on in-memory.

  // 2) Categories from budgets
  const existingCategoriesById = new Map<string, Category>();
  snapshot.categories.forEach((category) => {
    existingCategoriesById.set(category.id, category);
  });

  for (const [index, budget] of budgets.entries()) {
    if (existingCategoriesById.has(budget.id)) {
      continue;
    }
    const categoryId = budget.id;
    const sortOrder = String(index + 1);
    await appendRow(sheets, spreadsheetId, SHEET_TABS.categories, [
      categoryId,
      defaultGroupId,
      budget.budget_name,
      '',
      sortOrder,
      budget.created_at,
      budget.updated_at,
    ]);
    createdCategories += 1;
  }

  // 3) Category assignments from account budgets
  const existingAssignments = snapshot.categoryAssignments;
  let nextAssignmentId = nextStringId(existingAssignments);

  for (const allocation of accountBudgets as AccountBudget[]) {
    const monthKey = monthKeyFromIso(allocation.created_at);
    const id = nextAssignmentId;
    nextAssignmentId = String(Number(nextAssignmentId) + 1);

    await appendRow(sheets, spreadsheetId, SHEET_TABS.categoryAssignments, [
      id,
      allocation.budget_id,
      monthKey,
      allocation.allocated_amount,
      'migration_v1',
      allocation.created_at,
      allocation.updated_at,
    ]);
    createdAssignments += 1;
  }

  // 4) Category goals from budgets
  const existingGoals = snapshot.categoryGoals;
  let nextGoalId = nextStringId(existingGoals);

  for (const budget of budgets) {
    if (!budget.target_amount || budget.target_amount === '0' || budget.target_amount === '0.00') {
      continue;
    }

    const goalType = inferGoalType(budget);
    const metadata = {
      budget_type: budget.budget_type,
      minimum_payment_amount: budget.minimum_payment_amount,
      current_cadence_goal: budget.current_cadence_goal,
      linked_account_id: budget.linked_account_id,
    };

    const goalId = nextGoalId;
    nextGoalId = String(Number(nextGoalId) + 1);

    await appendRow(sheets, spreadsheetId, SHEET_TABS.categoryGoals, [
      goalId,
      budget.id,
      goalType,
      budget.target_amount,
      budget.target_date,
      budget.cadence,
      JSON.stringify(metadata),
      budget.created_at,
      budget.updated_at,
    ]);
    createdGoals += 1;
  }

  return {
    fromVersion: '1',
    toVersion: '2',
    createdCategoryGroups,
    createdCategories,
    createdAssignments,
    createdGoals,
  };
};

