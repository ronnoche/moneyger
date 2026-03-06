import { describe, expect, it } from 'vitest';
import { categoryMatchesFilter, isOverfunded, isSnoozed, isUnderfunded } from '@/components/budgets/BudgetWorkspaceShell';
import type { BudgetWorkspaceCategory } from '@/lib/services/budgetWorkspaceService';

const makeCategory = (overrides: Partial<BudgetWorkspaceCategory> = {}): BudgetWorkspaceCategory => ({
  id: 'cat-1',
  group_id: 'grp-1',
  name: 'Groceries',
  icon: '',
  sort_order: 1,
  assigned: 100,
  activity: -20,
  available: 80,
  goal: null,
  ...overrides,
});

describe('buckets workspace filters', () => {
  it('marks category underfunded when available is negative', () => {
    const category = makeCategory({ available: -10 });
    expect(isUnderfunded(category)).toBe(true);
    expect(categoryMatchesFilter(category, 'underfunded')).toBe(true);
  });

  it('uses goal target for underfunded and overfunded checks', () => {
    const goalCategory = makeCategory({
      available: 120,
      goal: {
        id: 'goal-1',
        goal_type: 'monthly_target',
        target_amount: 100,
        target_date: '2026-06-01',
        cadence: 'monthly',
      },
    });
    expect(isUnderfunded(goalCategory)).toBe(false);
    expect(isOverfunded(goalCategory)).toBe(true);
    expect(categoryMatchesFilter(goalCategory, 'overfunded')).toBe(true);
  });

  it('marks category snoozed when goal has no cadence and no target date', () => {
    const snoozed = makeCategory({
      goal: {
        id: 'goal-2',
        goal_type: 'monthly_target',
        target_amount: 0,
        target_date: '',
        cadence: '',
      },
    });
    expect(isSnoozed(snoozed)).toBe(true);
    expect(categoryMatchesFilter(snoozed, 'snoozed')).toBe(true);
  });
});
