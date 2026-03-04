export const seedAccounts = [
  { account_name: 'BDO', account_type: 'savings', account_balance: '100000.00' },
  { account_name: 'BPI', account_type: 'savings', account_balance: '56000.00' },
  { account_name: 'Wallet', account_type: 'cash', account_balance: '3500.00' },
  { account_name: 'GCash', account_type: 'cash', account_balance: '15000.00' },
  { account_name: 'Car Loan', account_type: 'loan', account_balance: '500000.00' },
  { account_name: 'SeaBank', account_type: 'savings', account_balance: '65000.00' },
  { account_name: 'Master Card', account_type: 'credit', account_balance: '12000.00' },
  { account_name: 'Visa', account_type: 'credit', account_balance: '8000.00' },
] as const;

export const seedBudgets = [
  'Emergency Fund',
  'Bills',
  'Family',
  'Subscription',
  'Socialization',
  'Dates',
  'Groceries',
] as const;

export const seedPayees = ['Work Park', 'Work Lunch', 'Groceries', 'Bills', 'Church', 'Friends', 'Families', 'Dates'] as const;

