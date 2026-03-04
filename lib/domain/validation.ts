import { z } from 'zod';
import type { Account, AccountType, Budget, BudgetCadence } from '@/lib/domain/types';
import { assertNotFutureDate, parseAmount } from '@/lib/domain/utils';

const accountTypes: AccountType[] = ['cash', 'savings', 'credit', 'loan'];
const cadences: BudgetCadence[] = ['weekly', 'bi_weekly', 'monthly', 'quarterly', 'yearly'];

export const accountInputSchema = z.object({
  account_name: z.string().trim().min(1, 'account_name is required'),
  account_type: z.enum(accountTypes),
  account_balance: z.coerce.number(),
});

export const budgetInputSchema = z
  .object({
    budget_name: z.string().trim().min(1, 'budget_name is required'),
    target_amount: z.coerce.number().min(0, 'target_amount must be >= 0'),
    is_indefinite: z.boolean(),
    cadence: z.enum(cadences).optional().nullable(),
    target_date: z.string().optional().nullable(),
    budget_type: z.string().optional().nullable(),
    minimum_payment_amount: z.coerce.number().optional().nullable(),
    linked_account_id: z.string().optional().nullable(),
    annotate: z.string().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.is_indefinite && !value.cadence) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'cadence is required when is_indefinite is true',
        path: ['cadence'],
      });
    }

    if (!value.is_indefinite && !value.target_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'target_date is required when is_indefinite is false',
        path: ['target_date'],
      });
    }
  });

export const transactionInputSchema = z.object({
  transaction_amount: z.coerce.number(),
  transaction_date: z.string().min(1, 'transaction_date is required'),
  account_id: z.string().min(1, 'account_id is required'),
  budget_id: z.string().min(1, 'budget_id is required'),
  payee_name: z.string().trim().min(1, 'payee_name is required'),
  annotate: z.string().optional().nullable(),
});

export const accountBudgetInputSchema = z.object({
  account_id: z.string().min(1, 'account_id is required'),
  budget_id: z.string().min(1, 'budget_id is required'),
  allocated_amount: z.coerce.number().min(0, 'allocated_amount must be >= 0'),
});

export const validateUniqueAccountName = (name: string, accounts: Account[], currentId?: string): string | null => {
  const normalized = name.toLowerCase();
  const duplicate = accounts.find(
    (account) => account.account_name.toLowerCase() === normalized && account.id !== currentId,
  );

  return duplicate ? 'account_name must be unique' : null;
};

export const validateUniqueBudgetName = (name: string, budgets: Budget[], currentId?: string): string | null => {
  const normalized = name.toLowerCase();
  const duplicate = budgets.find(
    (budget) => budget.budget_name.toLowerCase() === normalized && budget.id !== currentId,
  );

  return duplicate ? 'budget_name must be unique' : null;
};

export const validateUniquePayeeName = (name: string, payeeNames: string[], currentName?: string): string | null => {
  const normalized = name.toLowerCase();
  const duplicate = payeeNames.find(
    (payeeName) => payeeName.toLowerCase() === normalized && payeeName !== currentName,
  );

  return duplicate ? 'name must be unique' : null;
};

export const validateTransactionDate = (dateInput: string): string | null => {
  if (!assertNotFutureDate(dateInput)) {
    return 'transaction_date must not be in the future';
  }

  return null;
};

export const validateAllocationAgainstAvailableBalance = (
  accountBalance: string,
  siblingsAllocated: string[],
  allocatedAmount: number,
): string | null => {
  const totalAllocated = siblingsAllocated.reduce((sum, value) => sum + parseAmount(value), 0);
  const availableBalance = parseAmount(accountBalance) - totalAllocated;
  if (allocatedAmount > availableBalance) {
    return 'allocated_amount exceeds available account balance';
  }

  return null;
};

