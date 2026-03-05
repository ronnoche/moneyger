import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { Card } from '@/components/ui';
import { GoogleAuthCta } from '@/components/google-auth-cta';

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
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Give every dollar a job with
            <span className="marker-highlight block">
              Moneyger
            </span>
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground md:text-lg">
            Moneyger is a YNAB-lite budget: envelope-style buckets, a clear plan for this month&apos;s money, and a calm view of what you can safely spend right now.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <GoogleAuthCta />
        </div>
      </Card>

      <Card className="space-y-4 px-6 py-6 md:px-8">
        <h2 className="text-2xl font-semibold text-foreground md:text-3xl">What is envelope-style budgeting?</h2>
        <p className="text-sm text-muted-foreground md:text-base">
          Envelope-style budgeting means every dollar gets assigned to a specific job before you spend it. Instead of one big balance, you plan with focused buckets for groceries, rent, savings goals, and other priorities.
        </p>
        <p className="text-sm text-muted-foreground md:text-base">
          This method makes trade-offs visible. If one bucket is low, you can move money from another bucket on purpose and keep your full plan realistic for the rest of the month.
        </p>
        <p className="text-sm text-muted-foreground md:text-base">
          Moneyger applies this model on top of your own Google Sheet, so your budget stays simple to manage while your data remains in your control.
        </p>
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

      <Card className="space-y-5 px-6 py-6 md:px-8">
        <h2 className="text-2xl font-semibold text-foreground md:text-3xl">FAQ</h2>
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">What is Moneyger and who is it for?</h3>
            <p className="text-sm text-muted-foreground">
              Moneyger is a lightweight envelope-style budgeting app for people who want a clear monthly plan without a complex setup. It is built for anyone who wants practical control over spending and savings.
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">How does Moneyger use my Google account and spreadsheets?</h3>
            <p className="text-sm text-muted-foreground">
              Moneyger uses Google sign-in to connect to your account and create or update your budgeting sheet. It requests access needed to run your budget workflow in Google Sheets.
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">Who owns my financial data?</h3>
            <p className="text-sm text-muted-foreground">
              You do. Your budget data lives in your own Google Sheet, under your Google account, and you keep ownership and export access at all times.
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">Do you store my banking credentials or transaction data?</h3>
            <p className="text-sm text-muted-foreground">
              No. Moneyger does not ask for or store banking usernames, passwords, or direct bank connections. You manage entries through your budget sheet.
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">Is there a subscription or cost?</h3>
            <p className="text-sm text-muted-foreground">
              Moneyger is currently in beta and free for now. Pricing can change later as the product evolves.
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">How do I stop using Moneyger?</h3>
            <p className="text-sm text-muted-foreground">
              You can stop at any time by revoking Google access for Moneyger and deleting your budgeting sheet if you no longer want it.
            </p>
          </div>
        </div>
      </Card>

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
