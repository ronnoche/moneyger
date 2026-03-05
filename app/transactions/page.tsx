'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/components/data-states';
import { PageHeader } from '@/components/page-header';
import { Card, Input, Select } from '@/components/ui';
import { buttonClassName } from '@/components/ui';

interface Transaction {
  id: string;
  account_id: string;
  account_name: string;
  transaction_date: string;
  payee_name: string;
  annotate: string;
  transaction_amount: string;
  bucket_list_name: string;
}

interface OptionItem {
  id: string;
  label: string;
}

export default function TransactionsPage() {
  const [accountId, setAccountId] = useState('');
  const [bucketListId, setBucketListId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<OptionItem[]>([]);
  const [bucketLists, setBucketLists] = useState<OptionItem[]>([]);

  useEffect(() => {
    Promise.all([fetch('/api/accounts'), fetch('/api/bucket-lists')])
      .then(async ([accountsResponse, bucketListsResponse]) => {
        const accountsResult = await accountsResponse.json();
        const bucketListsResult = await bucketListsResponse.json();
        setAccounts(
          (accountsResult.accounts ?? []).map((item: { id: string; account_name: string }) => ({
            id: item.id,
            label: item.account_name,
          })),
        );
        setBucketLists(
          (bucketListsResult.bucket_lists ?? []).map((item: { id: string; name: string }) => ({
            id: item.id,
            label: item.name,
          })),
        );
      })
      .catch(() => {
        setAccounts([]);
        setBucketLists([]);
      });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (accountId) params.set('accountId', accountId);
    if (bucketListId) params.set('bucketListId', bucketListId);
    if (startDate && endDate) {
      params.set('startDate', startDate);
      params.set('endDate', endDate);
    }

    fetch(`/api/transactions?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Failed to load transactions'))))
      .then((result) => setTransactions(result.transactions ?? []))
      .catch((fetchError) => {
        setTransactions([]);
        setError(fetchError.message);
      })
      .finally(() => setLoading(false));
  }, [accountId, bucketListId, startDate, endDate]);

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <Link className={buttonClassName({})} href="/transactions/new">
            New Transaction
          </Link>
        }
        title="Transactions"
      />

      <Card dense>
        <div className="grid gap-2 md:grid-cols-4">
          <Select
            value={accountId}
            onChange={(event) => {
              setLoading(true);
              setError('');
              setAccountId(event.target.value);
            }}
          >
            <option value="">All wallets</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.label}
              </option>
            ))}
          </Select>
          <Select
            value={bucketListId}
            onChange={(event) => {
              setLoading(true);
              setError('');
              setBucketListId(event.target.value);
            }}
          >
            <option value="">All bucket lists</option>
            {bucketLists.map((bucketList) => (
              <option key={bucketList.id} value={bucketList.id}>
                {bucketList.label}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            value={startDate}
            onChange={(event) => {
              setLoading(true);
              setError('');
              setStartDate(event.target.value);
            }}
          />
          <Input
            type="date"
            value={endDate}
            onChange={(event) => {
              setLoading(true);
              setError('');
              setEndDate(event.target.value);
            }}
          />
        </div>
      </Card>

      {loading ? <LoadingState label="Loading transactions..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <Card>
          {transactions.length === 0 ? (
            <EmptyState
              action={
                <Link className={buttonClassName({ size: 'sm' })} href="/transactions/new">
                  Add first transaction
                </Link>
              }
              description="Try changing filters or create a new transaction."
              title="No matching transactions"
            />
          ) : (
            <>
              <div className="table-scroll hidden md:block">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-left text-muted-foreground">
                      <th className="px-2 py-2 font-medium">Wallet</th>
                      <th className="px-2 py-2 font-medium">Date</th>
                      <th className="px-2 py-2 font-medium">Payee</th>
                      <th className="px-2 py-2 font-medium">Notes</th>
                      <th className="px-2 py-2 font-medium">Amount</th>
                      <th className="px-2 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr className="border-b border-surface-border" key={transaction.id}>
                        <td className="px-2 py-3 text-foreground">{transaction.account_name}</td>
                        <td className="px-2 py-3 text-foreground">{transaction.transaction_date}</td>
                        <td className="px-2 py-3 text-foreground">{transaction.payee_name}</td>
                        <td className="px-2 py-3 text-foreground">{transaction.annotate || '—'}</td>
                        <td className="px-2 py-3 font-medium text-foreground">{Number(transaction.transaction_amount).toFixed(2)}</td>
                        <td className="px-2 py-3">
                          <Link className={buttonClassName({ size: 'sm', variant: 'secondary' })} href={`/transactions/${transaction.id}/edit`}>
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 md:hidden">
                {transactions.map((transaction) => (
                  <div className="glass-muted space-y-2 p-3" key={transaction.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">{transaction.payee_name || 'Unknown payee'}</p>
                        <p className="text-xs text-muted-foreground">{transaction.account_name}</p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{Number(transaction.transaction_amount).toFixed(2)}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{transaction.transaction_date}</p>
                    <p className="text-sm text-foreground">{transaction.annotate || 'No notes'}</p>
                    <Link className={buttonClassName({ size: 'sm', variant: 'secondary' })} href={`/transactions/${transaction.id}/edit`}>
                      Edit
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      ) : null}
    </div>
  );
}

