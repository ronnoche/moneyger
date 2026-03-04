import type {
  Account,
  AccountBudget,
  Budget,
  BudgetSummary,
  BudgetsIndexResponse,
  Transaction,
  UserCashFlow,
} from '@/lib/domain/types';
import { isDateWithin, monthBounds, parseAmount, previousMonthBounds } from '@/lib/domain/utils';

export const accountAvailableBalance = (account: Account, accountBudgets: AccountBudget[]): number => {
  const allocated = accountBudgets
    .filter((allocation) => allocation.account_id === account.id)
    .reduce((sum, allocation) => sum + parseAmount(allocation.allocated_amount), 0);

  return parseAmount(account.account_balance) - allocated;
};

export const buildCashFlow = (accounts: Account[]): UserCashFlow => {
  const assets = accounts
    .filter((account) => account.account_type === 'cash' || account.account_type === 'savings')
    .reduce((sum, account) => sum + parseAmount(account.account_balance), 0);
  const liabilities = accounts
    .filter((account) => account.account_type === 'credit' || account.account_type === 'loan')
    .reduce((sum, account) => sum + parseAmount(account.account_balance), 0);

  return {
    assets,
    liabilities,
    net: assets - liabilities,
  };
};

export const buildBudgetsIndex = (
  month: string,
  budgets: Budget[],
  allocations: AccountBudget[],
  transactions: Transaction[],
): BudgetsIndexResponse => {
  const { start, end } = monthBounds(month);
  const { start: prevStart, end: prevEnd } = previousMonthBounds(month);

  const budgetSummaries: BudgetSummary[] = budgets.map((budget) => {
    const monthly_assigned = allocations
      .filter((allocation) => allocation.budget_id === budget.id && isDateWithin(allocation.created_at, start, end))
      .reduce((sum, allocation) => sum + parseAmount(allocation.allocated_amount), 0);

    const monthly_activity = transactions
      .filter((txn) => txn.budget_id === budget.id && isDateWithin(txn.transaction_date, start, end))
      .reduce((sum, txn) => sum + parseAmount(txn.transaction_amount), 0);

    return {
      id: budget.id,
      budget_name: budget.budget_name,
      monthly_assigned,
      monthly_activity,
      monthly_available: monthly_assigned + monthly_activity,
    };
  });

  const totalBudgetAmount = budgets.reduce((sum, budget) => sum + parseAmount(budget.target_amount), 0);
  const totalAllocated = allocations.reduce((sum, allocation) => sum + parseAmount(allocation.allocated_amount), 0);
  const monthly_assigned_total = allocations
    .filter((allocation) => isDateWithin(allocation.created_at, start, end))
    .reduce((sum, allocation) => sum + parseAmount(allocation.allocated_amount), 0);
  const monthly_activity_total = transactions
    .filter((txn) => isDateWithin(txn.transaction_date, start, end))
    .reduce((sum, txn) => sum + parseAmount(txn.transaction_amount), 0);

  const monthly_leftover_assigned = allocations
    .filter((allocation) => isDateWithin(allocation.created_at, prevStart, prevEnd))
    .reduce((sum, allocation) => sum + parseAmount(allocation.allocated_amount), 0);

  const monthly_leftover_activity = transactions
    .filter((txn) => isDateWithin(txn.transaction_date, prevStart, prevEnd))
    .reduce((sum, txn) => sum + parseAmount(txn.transaction_amount), 0);

  return {
    budgets: budgetSummaries,
    unassigned_money: totalBudgetAmount - totalAllocated,
    monthly_leftover: monthly_leftover_assigned + monthly_leftover_activity,
    monthly_assigned_total,
    monthly_activity_total,
  };
};

