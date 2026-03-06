import { describe, expect, it } from 'vitest';
import { buildPersistentAssignedByCategory } from '@/lib/services/budgetWorkspaceService';
import type { CategoryAssignment } from '@/lib/domain/types';

const makeAssignment = (overrides: Partial<CategoryAssignment>): CategoryAssignment => ({
  id: 'ca-1',
  category_id: 'cat-1',
  month_key: '2026-03',
  assigned_amount: '0.00',
  source: 'manual_inline',
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
  rowNumber: 1,
  ...overrides,
});

describe('buildPersistentAssignedByCategory', () => {
  it('uses latest assignment month per category', () => {
    const assignments: CategoryAssignment[] = [
      makeAssignment({ category_id: 'cat-1', month_key: '2026-03', assigned_amount: '3000.00' }),
      makeAssignment({ id: 'ca-2', category_id: 'cat-1', month_key: '2026-04', assigned_amount: '3500.00' }),
      makeAssignment({ id: 'ca-3', category_id: 'cat-2', month_key: '2026-02', assigned_amount: '500.00' }),
    ];

    const result = buildPersistentAssignedByCategory(assignments);

    expect(result.get('cat-1')).toBe(3500);
    expect(result.get('cat-2')).toBe(500);
  });

  it('keeps prior month assignment for categories without newer rows', () => {
    const assignments: CategoryAssignment[] = [
      makeAssignment({ category_id: 'cat-1', month_key: '2026-03', assigned_amount: '3000.00' }),
      makeAssignment({ id: 'ca-2', category_id: 'cat-2', month_key: '2026-03', assigned_amount: '500.00' }),
      makeAssignment({ id: 'ca-3', category_id: 'cat-1', month_key: '2026-04', assigned_amount: '3200.00' }),
    ];

    const result = buildPersistentAssignedByCategory(assignments);
    const total = Array.from(result.values()).reduce((sum, amount) => sum + amount, 0);

    expect(result.get('cat-1')).toBe(3200);
    expect(result.get('cat-2')).toBe(500);
    expect(total).toBe(3700);
  });
});
