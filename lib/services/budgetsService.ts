import { differenceInCalendarMonths, format, parseISO } from 'date-fns';
import type { sheets_v4 } from 'googleapis';
import { ApiError } from '@/lib/api/errors';
import { isDateWithin, monthBounds, nowIso, parseAmount, previousMonthBounds, toAmountString } from '@/lib/domain/utils';
import { budgetInputSchema, validateUniqueBudgetName } from '@/lib/domain/validation';
import { appendRow, updateRow } from '@/lib/google/client';
import { SHEET_HEADERS, SHEET_TABS } from '@/lib/google/schema';
import { readSnapshot } from '@/lib/google/sheets-store';
import { deleteEntityRow, formatValidationError, nextId, toRowValues } from '@/lib/services/helpers';

const computeCurrentCadenceGoal = (targetAmount: number, targetDate?: string | null): string => {
  if (!targetDate) {
    return toAmountString(targetAmount);
  }

  const months = Math.max(1, differenceInCalendarMonths(parseISO(targetDate), new Date()));
  return toAmountString(targetAmount / months);
};

const parseGoalMetadata = (metadataJson: string): Record<string, string> => {
  if (!metadataJson) return {};
  try {
    const parsed = JSON.parse(metadataJson) as Record<string, unknown>;
    return Object.entries(parsed).reduce<Record<string, string>>((result, [key, value]) => {
      result[key] = value === null || value === undefined ? '' : String(value);
      return result;
    }, {});
  } catch {
    return {};
  }
};

const mapCategoryToBudgetPayload = (
  category: { id: string; name: string; created_at: string; updated_at: string },
  goal?: { target_amount: string; target_date: string; cadence: string; metadata_json: string } | null,
) => {
  const metadata = parseGoalMetadata(goal?.metadata_json ?? '');
  const targetAmount = goal?.target_amount ?? '0.00';
  const targetDate = goal?.target_date ?? '';
  const cadence = goal?.cadence ?? '';
  const isIndefinite = metadata.is_indefinite ?? (targetDate ? 'false' : 'true');
  const numericTargetAmount = parseAmount(targetAmount || '0');
  return {
    id: category.id,
    budget_name: category.name,
    budget_type: metadata.budget_type ?? '',
    cadence,
    goal_date: '',
    annotate: metadata.annotate ?? '',
    target_amount: toAmountString(numericTargetAmount),
    target_date: targetDate,
    is_indefinite: isIndefinite,
    minimum_payment_amount: metadata.minimum_payment_amount ?? '',
    current_cadence_goal: metadata.current_cadence_goal ?? computeCurrentCadenceGoal(numericTargetAmount, targetDate),
    linked_account_id: metadata.linked_account_id ?? '',
    created_at: category.created_at,
    updated_at: category.updated_at,
  };
};

export const listBudgetsWithMetrics = async (sheets: sheets_v4.Sheets, sheetId: string, month: string) => {
  const snapshot = await readSnapshot(sheets, sheetId);
  const { start, end } = monthBounds(month);
  const { start: prevStart, end: prevEnd } = previousMonthBounds(month);
  const monthKey = month.slice(0, 7);
  const prevMonthKey = format(prevStart, 'yyyy-MM');

  const budgets = snapshot.categories.map((category) => {
    const monthly_assigned = snapshot.categoryAssignments
      .filter((assignment) => assignment.category_id === category.id && assignment.month_key === monthKey)
      .reduce((sum, assignment) => sum + parseAmount(assignment.assigned_amount), 0);
    const monthly_activity = snapshot.transactions
      .filter((txn) => txn.bucket_list_id === category.id && isDateWithin(txn.transaction_date, start, end))
      .reduce((sum, txn) => sum + parseAmount(txn.transaction_amount), 0);
    return {
      id: category.id,
      budget_name: category.name,
      monthly_assigned,
      monthly_activity,
      monthly_available: monthly_assigned + monthly_activity,
    };
  });

  const monthly_assigned_total = snapshot.categoryAssignments
    .filter((assignment) => assignment.month_key === monthKey)
    .reduce((sum, assignment) => sum + parseAmount(assignment.assigned_amount), 0);
  const monthly_activity_total = snapshot.transactions
    .filter((txn) => isDateWithin(txn.transaction_date, start, end))
    .reduce((sum, txn) => sum + parseAmount(txn.transaction_amount), 0);
  const monthly_leftover_assigned = snapshot.categoryAssignments
    .filter((assignment) => assignment.month_key === prevMonthKey)
    .reduce((sum, assignment) => sum + parseAmount(assignment.assigned_amount), 0);
  const monthly_leftover_activity = snapshot.transactions
    .filter((txn) => isDateWithin(txn.transaction_date, prevStart, prevEnd))
    .reduce((sum, txn) => sum + parseAmount(txn.transaction_amount), 0);
  const totalCash = snapshot.accounts
    .filter((account) => account.account_type === 'cash' || account.account_type === 'savings')
    .reduce((sum, account) => sum + parseAmount(account.account_balance), 0);

  return {
    budgets,
    unassigned_money: totalCash - monthly_assigned_total,
    monthly_leftover: monthly_leftover_assigned + monthly_leftover_activity,
    monthly_assigned_total,
    monthly_activity_total,
  };
};

export const listBudgets = async (sheets: sheets_v4.Sheets, sheetId: string) => {
  const snapshot = await readSnapshot(sheets, sheetId);
  return snapshot.categories.map((category) =>
    mapCategoryToBudgetPayload(
      category,
      snapshot.categoryGoals.find((goal) => goal.category_id === category.id),
    ),
  );
};

export const getBudgetById = async (sheets: sheets_v4.Sheets, sheetId: string, budgetId: string) => {
  const snapshot = await readSnapshot(sheets, sheetId);
  const category = snapshot.categories.find((item) => item.id === budgetId);
  if (!category) {
    return null;
  }
  const goal = snapshot.categoryGoals.find((item) => item.category_id === budgetId);
  return mapCategoryToBudgetPayload(category, goal);
};

export const createBudget = async (sheets: sheets_v4.Sheets, sheetId: string, input: unknown) => {
  const parsed = budgetInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, formatValidationError(parsed.error.issues));
  }
  const snapshot = await readSnapshot(sheets, sheetId);
  const categoryBackedBudgets = snapshot.categories.map((category) => ({
    id: category.id,
    budget_name: category.name,
  }));
  const duplicate = validateUniqueBudgetName(
    parsed.data.budget_name,
    categoryBackedBudgets as Array<{ id: string; budget_name: string }>,
  );
  if (duplicate) {
    throw new ApiError(400, duplicate);
  }

  const targetAmount = parsed.data.target_amount;
  const now = nowIso();
  const groupId = snapshot.categoryGroups[0]?.id ?? '1';
  if (snapshot.categoryGroups.length === 0) {
    await appendRow(sheets, sheetId, SHEET_TABS.categoryGroups, [
      groupId,
      'General',
      '1',
      now,
      now,
    ]);
  }

  const categoryId = nextId(snapshot.categories);
  const createdCategory = {
    id: categoryId,
    group_id: groupId,
    name: parsed.data.budget_name,
    icon: '',
    sort_order: String(snapshot.categories.filter((category) => category.group_id === groupId).length + 1),
    created_at: now,
    updated_at: now,
  };
  await appendRow(
    sheets,
    sheetId,
    SHEET_TABS.categories,
    toRowValues(SHEET_HEADERS[SHEET_TABS.categories], createdCategory),
  );

  const createdGoal = {
    id: nextId(snapshot.categoryGoals),
    category_id: categoryId,
    goal_type: parsed.data.is_indefinite ? 'monthly_savings' : 'needed_by_date',
    target_amount: toAmountString(targetAmount),
    target_date: parsed.data.target_date ?? '',
    cadence: parsed.data.cadence ?? '',
    metadata_json: JSON.stringify({
      budget_type: parsed.data.budget_type ?? 'savings',
      annotate: parsed.data.annotate ?? '',
      minimum_payment_amount:
        parsed.data.minimum_payment_amount !== undefined && parsed.data.minimum_payment_amount !== null
          ? toAmountString(parsed.data.minimum_payment_amount)
          : '',
      current_cadence_goal: computeCurrentCadenceGoal(targetAmount, parsed.data.target_date),
      linked_account_id: parsed.data.linked_account_id ?? '',
      is_indefinite: parsed.data.is_indefinite ? 'true' : 'false',
    }),
    created_at: now,
    updated_at: now,
  };
  await appendRow(
    sheets,
    sheetId,
    SHEET_TABS.categoryGoals,
    toRowValues(SHEET_HEADERS[SHEET_TABS.categoryGoals], createdGoal),
  );

  return {
    id: createdCategory.id,
    budget_name: createdCategory.name,
    budget_type: parsed.data.budget_type ?? 'savings',
    cadence: parsed.data.cadence ?? '',
    goal_date: '',
    annotate: parsed.data.annotate ?? '',
    target_amount: toAmountString(targetAmount),
    target_date: parsed.data.target_date ?? '',
    is_indefinite: parsed.data.is_indefinite ? 'true' : 'false',
    minimum_payment_amount:
      parsed.data.minimum_payment_amount !== undefined && parsed.data.minimum_payment_amount !== null
        ? toAmountString(parsed.data.minimum_payment_amount)
        : '',
    current_cadence_goal: computeCurrentCadenceGoal(targetAmount, parsed.data.target_date),
    linked_account_id: parsed.data.linked_account_id ?? '',
    created_at: now,
    updated_at: now,
  };
};

export const updateBudget = async (sheets: sheets_v4.Sheets, sheetId: string, budgetId: string, input: unknown) => {
  const parsed = budgetInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, formatValidationError(parsed.error.issues));
  }

  const snapshot = await readSnapshot(sheets, sheetId);
  const existing = snapshot.categories.find((category) => category.id === budgetId);
  if (!existing) {
    throw new ApiError(404, 'Budget not found');
  }
  const duplicate = validateUniqueBudgetName(
    parsed.data.budget_name,
    snapshot.categories.map((category) => ({ id: category.id, budget_name: category.name })) as Array<{
      id: string;
      budget_name: string;
    }>,
    budgetId,
  );
  if (duplicate) {
    throw new ApiError(400, duplicate);
  }

  const targetAmount = parsed.data.target_amount;
  const updatedCategory = {
    ...existing,
    name: parsed.data.budget_name,
    updated_at: nowIso(),
  };

  const existingGoal = snapshot.categoryGoals.find((goal) => goal.category_id === budgetId);
  const now = nowIso();
  const goalMetadata = {
    budget_type: parsed.data.budget_type ?? 'savings',
    annotate: parsed.data.annotate ?? '',
    minimum_payment_amount:
      parsed.data.minimum_payment_amount !== undefined && parsed.data.minimum_payment_amount !== null
        ? toAmountString(parsed.data.minimum_payment_amount)
        : '',
    current_cadence_goal: computeCurrentCadenceGoal(targetAmount, parsed.data.target_date),
    linked_account_id: parsed.data.linked_account_id ?? '',
    is_indefinite: parsed.data.is_indefinite ? 'true' : 'false',
  };
  if (existingGoal) {
    const updatedGoal = {
      ...existingGoal,
      goal_type: parsed.data.is_indefinite ? 'monthly_savings' : 'needed_by_date',
      target_amount: toAmountString(targetAmount),
      target_date: parsed.data.target_date ?? '',
      cadence: parsed.data.cadence ?? '',
      metadata_json: JSON.stringify(goalMetadata),
      updated_at: now,
    };
    await updateRow(
      sheets,
      sheetId,
      SHEET_TABS.categoryGoals,
      existingGoal.rowNumber,
      toRowValues(SHEET_HEADERS[SHEET_TABS.categoryGoals], updatedGoal),
    );
  } else {
    const createdGoal = {
      id: nextId(snapshot.categoryGoals),
      category_id: budgetId,
      goal_type: parsed.data.is_indefinite ? 'monthly_savings' : 'needed_by_date',
      target_amount: toAmountString(targetAmount),
      target_date: parsed.data.target_date ?? '',
      cadence: parsed.data.cadence ?? '',
      metadata_json: JSON.stringify(goalMetadata),
      created_at: now,
      updated_at: now,
    };
    await appendRow(
      sheets,
      sheetId,
      SHEET_TABS.categoryGoals,
      toRowValues(SHEET_HEADERS[SHEET_TABS.categoryGoals], createdGoal),
    );
  }

  await updateRow(
    sheets,
    sheetId,
    SHEET_TABS.categories,
    existing.rowNumber,
    toRowValues(SHEET_HEADERS[SHEET_TABS.categories], updatedCategory),
  );
  return {
    id: updatedCategory.id,
    budget_name: updatedCategory.name,
    budget_type: parsed.data.budget_type ?? '',
    cadence: parsed.data.cadence ?? '',
    goal_date: '',
    annotate: parsed.data.annotate ?? '',
    target_amount: toAmountString(targetAmount),
    target_date: parsed.data.target_date ?? '',
    is_indefinite: parsed.data.is_indefinite ? 'true' : 'false',
    minimum_payment_amount:
      parsed.data.minimum_payment_amount !== undefined && parsed.data.minimum_payment_amount !== null
        ? toAmountString(parsed.data.minimum_payment_amount)
        : '',
    current_cadence_goal: computeCurrentCadenceGoal(targetAmount, parsed.data.target_date),
    linked_account_id: parsed.data.linked_account_id ?? '',
    created_at: updatedCategory.created_at,
    updated_at: updatedCategory.updated_at,
  };
};

export const deleteBudget = async (sheets: sheets_v4.Sheets, sheetId: string, budgetId: string) => {
  const snapshot = await readSnapshot(sheets, sheetId);
  const budget = snapshot.categories.find((item) => item.id === budgetId);
  if (!budget) {
    throw new ApiError(404, 'Budget not found');
  }

  const assignments = snapshot.categoryAssignments.filter((assignment) => assignment.category_id === budgetId);
  const goals = snapshot.categoryGoals.filter((goal) => goal.category_id === budgetId);
  const transactions = snapshot.transactions.filter((transaction) => transaction.bucket_list_id === budgetId);

  for (const txn of transactions.sort((a, b) => b.rowNumber - a.rowNumber)) {
    await deleteEntityRow(sheets, sheetId, SHEET_TABS.transactions, txn);
  }
  for (const assignment of assignments.sort((a, b) => b.rowNumber - a.rowNumber)) {
    await deleteEntityRow(sheets, sheetId, SHEET_TABS.categoryAssignments, assignment);
  }
  for (const goal of goals.sort((a, b) => b.rowNumber - a.rowNumber)) {
    await deleteEntityRow(sheets, sheetId, SHEET_TABS.categoryGoals, goal);
  }
  await deleteEntityRow(sheets, sheetId, SHEET_TABS.categories, budget);
};

export const buildUnassignedMoney = async (sheets: sheets_v4.Sheets, sheetId: string): Promise<number> => {
  const snapshot = await readSnapshot(sheets, sheetId);
  const totalWalletBalances = snapshot.accounts
    .filter((account) => account.account_type === 'cash' || account.account_type === 'savings')
    .reduce((sum, account) => sum + parseAmount(account.account_balance), 0);
  const totalAssigned = snapshot.categoryAssignments.reduce(
    (sum, assignment) => sum + parseAmount(assignment.assigned_amount),
    0,
  );
  return totalWalletBalances - totalAssigned;
};

