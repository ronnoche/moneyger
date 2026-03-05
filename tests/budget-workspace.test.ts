import { describe, expect, it } from 'vitest';
import { buildAvailableFromAssignments } from '@/lib/domain/metrics';
import type { CategoryAssignment, Transaction } from '@/lib/domain/types';

describe('budget workspace metrics', () => {
  it('computes available from assignments and transactions', () => {
    const assignments: CategoryAssignment[] = [
      {
        id: '1',
        category_id: 'cat-1',
        month_key: '2026-03',
        assigned_amount: '500.00',
        source: 'test',
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
        rowNumber: 2,
      },
    ];

    const transactions: Transaction[] = [
      {
        id: '1',
        transaction_amount: '-100.00',
        transaction_date: '2026-03-15',
        annotate: '',
        account_id: '1',
        budget_id: 'cat-1',
        payee_id: '1',
        created_at: '2026-03-15T00:00:00.000Z',
        updated_at: '2026-03-15T00:00:00.000Z',
        rowNumber: 2,
      },
    ];

    const result = buildAvailableFromAssignments('2026-03', assignments, transactions);

    expect(result.assignedTotal).toBe(500);
    expect(result.activityTotal).toBe(-100);
    expect(result.availableTotal).toBe(400);
  });
}

