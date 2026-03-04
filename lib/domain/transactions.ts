import type { Transaction } from '@/lib/domain/types';
import { parseAmount, toAmountString } from '@/lib/domain/utils';

export interface AccountBalanceAdjustment {
  accountId: string;
  amountDelta: number;
}

export const buildCreateTransactionAdjustments = (
  transactionAmount: string,
  accountId: string,
): AccountBalanceAdjustment[] => [
  {
    accountId,
    amountDelta: parseAmount(transactionAmount),
  },
];

export const buildDeleteTransactionAdjustments = (transaction: Transaction): AccountBalanceAdjustment[] => [
  {
    accountId: transaction.account_id,
    amountDelta: -parseAmount(transaction.transaction_amount),
  },
];

export const buildUpdateTransactionAdjustments = (
  existingTransaction: Transaction,
  nextAmount: string,
  nextAccountId: string,
): AccountBalanceAdjustment[] => {
  const adjustments: AccountBalanceAdjustment[] = [
    {
      accountId: existingTransaction.account_id,
      amountDelta: -parseAmount(existingTransaction.transaction_amount),
    },
    {
      accountId: nextAccountId,
      amountDelta: parseAmount(nextAmount),
    },
  ];

  return adjustments;
};

export const applyAccountBalanceDelta = (balance: string, amountDelta: number): string =>
  toAmountString(parseAmount(balance) + amountDelta);

