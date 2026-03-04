import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card } from '@/components/ui';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    redirect('/budgets');
  }

  return (
    <div className="mx-auto mt-8 max-w-5xl space-y-6 md:mt-14">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>

      <Card className="space-y-6 px-6 py-8 md:px-10 md:py-12">
        <div className="space-y-4">
          <p className="inline-flex rounded-full border border-surface-border bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
            Personal finance cockpit
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Take control of your finances</h1>
          <p className="max-w-3xl text-base text-muted-foreground md:text-lg">
            Moneyger keeps bucket budgeting simple with monthly planning, clean cash flow tracking, and account clarity in one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-[var(--radius-sm)] bg-brand px-5 text-sm font-medium text-brand-foreground transition-colors duration-200 hover:brightness-110"
            href="/api/auth/signin?provider=google"
          >
            Get started with Google
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-[var(--radius-sm)] border border-surface-border bg-surface-strong px-5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-brand-soft"
            href="/api/auth/signin?provider=google"
          >
            Sign in to continue
          </Link>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card dense>
          <h2 className="text-base font-semibold text-foreground">Buckets first</h2>
          <p className="mt-2 text-sm text-muted-foreground">Assign each dollar to a purpose and track available balance by bucket.</p>
        </Card>
        <Card dense>
          <h2 className="text-base font-semibold text-foreground">Month planning</h2>
          <p className="mt-2 text-sm text-muted-foreground">Carry momentum month to month with fast reassignment and progress signals.</p>
        </Card>
        <Card dense>
          <h2 className="text-base font-semibold text-foreground">Private ownership</h2>
          <p className="mt-2 text-sm text-muted-foreground">Your data stays in your own Google Sheet, powered by a lightweight UI layer.</p>
        </Card>
      </div>
    </div>
  );
}
