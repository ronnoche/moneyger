export type AccountType = 'cash' | 'savings' | 'credit' | 'loan';
export type BudgetCadence = 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'yearly';
export type BudgetType = 'savings' | 'payment';
export type GoalType = 'monthly_target' | 'needed_by_date' | 'monthly_savings' | 'debt_paydown';

export interface RowEntity {
  rowNumber: number;
}

export interface Account extends RowEntity {
  id: string;
  account_name: string;
  account_type: AccountType;
  account_balance: string;
  is_reconciled: 'true' | 'false';
  last_reconciled_date: string;
  created_at: string;
  updated_at: string;
}

export interface Budget extends RowEntity {
  id: string;
  budget_name: string;
  budget_type: BudgetType | '';
  cadence: BudgetCadence | '';
  goal_date: string;
  annotate: string;
  target_amount: string;
  target_date: string;
  is_indefinite: 'true' | 'false';
  minimum_payment_amount: string;
  current_cadence_goal: string;
  linked_account_id: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryGroup extends RowEntity {
  id: string;
  name: string;
  sort_order: string;
  created_at: string;
  updated_at: string;
}

export interface Category extends RowEntity {
  id: string;
  group_id: string;
  name: string;
  icon: string;
  sort_order: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryAssignment extends RowEntity {
  id: string;
  category_id: string;
  month_key: string;
  assigned_amount: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryGoal extends RowEntity {
  id: string;
  category_id: string;
  goal_type: GoalType | '';
  target_amount: string;
  target_date: string;
  cadence: BudgetCadence | '';
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction extends RowEntity {
  id: string;
  transaction_amount: string;
  transaction_date: string;
  annotate: string;
  account_id: string;
  bucket_list_id: string;
  payee_id: string;
  created_at: string;
  updated_at: string;
}

export interface AccountBudget extends RowEntity {
  id: string;
  account_id: string;
  budget_id: string;
  allocated_amount: string;
  created_at: string;
  updated_at: string;
}

export interface Payee extends RowEntity {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface MetadataRow extends RowEntity {
  key: string;
  value: string;
}

export interface UserCashFlow {
  assets: number;
  liabilities: number;
  net: number;
}

export interface BudgetSummary {
  id: string;
  budget_name: string;
  monthly_assigned: number;
  monthly_activity: number;
  monthly_available: number;
}

export interface BudgetsIndexResponse {
  budgets: BudgetSummary[];
  unassigned_money: number;
  monthly_leftover: number;
  monthly_assigned_total: number;
  monthly_activity_total: number;
}

export interface SheetsSnapshot {
  accounts: Account[];
  budgets: Budget[];
  transactions: Transaction[];
  accountBudgets: AccountBudget[];
  payees: Payee[];
  metadata: MetadataRow[];
  categoryGroups: CategoryGroup[];
  categories: Category[];
  categoryAssignments: CategoryAssignment[];
  categoryGoals: CategoryGoal[];
}

