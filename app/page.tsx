import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { Card } from '@/components/ui';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    redirect('/budgets');
  }

  return (
    <div className="mx-auto mt-8 max-w-5xl space-y-6 md:mt-14">
      <Card className="space-y-6 px-6 py-8 md:px-10 md:py-12">
        <div className="space-y-4">
          <p className="inline-flex rounded-full border border-surface-border bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
            Simple envelope-style budgeting
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Give every dollar a job with Moneyger</h1>
          <p className="max-w-3xl text-base text-muted-foreground md:text-lg">
            Moneyger is a YNAB-lite budget: envelope-style buckets, a clear plan for this month&apos;s money, and a calm view of what you can safely spend right now.
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
          <h2 className="text-base font-semibold text-foreground">Buckets like envelopes</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Give every dollar a job in simple buckets so you always know what is set aside for bills, goals, and day-to-day spending.
          </p>
        </Card>
        <Card dense>
          <h2 className="text-base font-semibold text-foreground">One month at a time</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Plan the month you are in, roll with real life, and adjust buckets without losing sight of what still needs to be covered.
          </p>
        </Card>
        <Card dense>
          <h2 className="text-base font-semibold text-foreground">Your sheet, your data</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Moneyger lives on top of your own Google Sheet, so you keep full ownership, easy exports, and a transparent source of truth.
          </p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-border pt-4 text-xs text-muted-foreground">
        <p className="max-w-xl">
          Moneyger connects to your own Google Sheet. Review the legal terms before you start using the app.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/terms" className="underline-offset-4 hover:underline">
            Terms of Service
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
