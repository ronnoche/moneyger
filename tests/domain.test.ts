import { describe, expect, it } from 'vitest';
import { buildBudgetsIndex, buildCashFlow } from '@/lib/domain/metrics';
import { accountBudgetInputSchema, transactionInputSchema } from '@/lib/domain/validation';

describe('domain metrics', () => {
  it('computes cashflow from account types', () => {
    const result = buildCashFlow([
      {
        id: '1',
        account_name: 'Wallet',
        account_type: 'cash',
        account_balance: '100.00',
        is_reconciled: 'false',
        last_reconciled_date: '',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        rowNumber: 2,
      },
      {
        id: '2',
        account_name: 'Card',
        account_type: 'credit',
        account_balance: '40.00',
        is_reconciled: 'false',
        last_reconciled_date: '',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        rowNumber: 3,
      },
    ]);

    expect(result).toEqual({
      assets: 100,
      liabilities: 40,
      net: 60,
    });
  });

  it('computes budgets index totals', () => {
    const result = buildBudgetsIndex(
      '2026-03-01',
      [
        {
          id: '1',
          budget_name: 'Groceries',
          budget_type: 'savings',
          cadence: '',
          goal_date: '',
          annotate: '',
          target_amount: '500.00',
          target_date: '',
          is_indefinite: 'false',
          minimum_payment_amount: '',
          current_cadence_goal: '',
          linked_account_id: '',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
          rowNumber: 2,
        },
      ],
      [
        {
          id: '1',
          account_id: '1',
          budget_id: '1',
          allocated_amount: '200.00',
          created_at: '2026-03-05T00:00:00.000Z',
          updated_at: '2026-03-05T00:00:00.000Z',
          rowNumber: 2,
        },
      ],
      [
        {
          id: '1',
          transaction_amount: '-50.00',
          transaction_date: '2026-03-10',
          annotate: '',
          account_id: '1',
          bucket_list_id: '1',
          payee_id: '1',
          created_at: '2026-03-10T00:00:00.000Z',
          updated_at: '2026-03-10T00:00:00.000Z',
          rowNumber: 2,
        },
      ],
    );

    expect(result.budgets[0].monthly_available).toBe(150);
    expect(result.monthly_assigned_total).toBe(200);
    expect(result.monthly_activity_total).toBe(-50);
  });
});

describe('validation', () => {
  it('accepts valid transaction payload', () => {
    const parsed = transactionInputSchema.safeParse({
      transaction_amount: 100,
      transaction_date: '2026-03-01',
      account_id: '1',
      bucket_list_id: '1',
      payee_name: 'Store',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects negative allocation in schema', () => {
    const parsed = accountBudgetInputSchema.safeParse({
      account_id: '1',
      budget_id: '1',
      allocated_amount: -10,
    });
    expect(parsed.success).toBe(false);
  });
});

