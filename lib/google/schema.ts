export const CURRENT_SCHEMA_VERSION = '1';

export const SHEET_TABS = {
  accounts: 'Accounts',
  budgets: 'Budgets',
  transactions: 'Transactions',
  accountBudgets: 'AccountBudgets',
  payees: 'Payees',
  metadata: 'Metadata',
} as const;

export const SHEET_HEADERS: Record<string, string[]> = {
  [SHEET_TABS.accounts]: [
    'id',
    'account_name',
    'account_type',
    'account_balance',
    'is_reconciled',
    'last_reconciled_date',
    'created_at',
    'updated_at',
  ],
  [SHEET_TABS.budgets]: [
    'id',
    'budget_name',
    'budget_type',
    'cadence',
    'goal_date',
    'annotate',
    'target_amount',
    'target_date',
    'is_indefinite',
    'minimum_payment_amount',
    'current_cadence_goal',
    'linked_account_id',
    'created_at',
    'updated_at',
  ],
  [SHEET_TABS.transactions]: [
    'id',
    'transaction_amount',
    'transaction_date',
    'annotate',
    'account_id',
    'budget_id',
    'payee_id',
    'created_at',
    'updated_at',
  ],
  [SHEET_TABS.accountBudgets]: [
    'id',
    'account_id',
    'budget_id',
    'allocated_amount',
    'created_at',
    'updated_at',
  ],
  [SHEET_TABS.payees]: ['id', 'name', 'created_at', 'updated_at'],
  [SHEET_TABS.metadata]: ['key', 'value'],
};

