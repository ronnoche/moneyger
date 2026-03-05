import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Button, Card } from '@/components/ui';

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto mt-8 max-w-5xl space-y-6 md:mt-14">
      <PageHeader
        title="Privacy Policy"
        description="How Moneyger handles your data."
        actions={
          <Button asChild size="sm" variant="secondary">
            <Link href="/">Back to home</Link>
          </Button>
        }
      />

      <Card className="space-y-6 px-6 py-6 md:px-8 md:py-8" dense>
        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">1. Overview</h2>
          <p>
            This Privacy Policy explains how Moneyger (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects,
            uses, and protects information when you use the Moneyger web application (the &quot;Service&quot;).
          </p>
          <p>
            Moneyger is designed so your budget data lives primarily in your own Google Sheet. We aim to collect and
            store the minimum information necessary to operate the Service.
          </p>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">2. Information we access</h2>
          <p>When you sign in with Google and use the Service, we may access:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Basic Google account information such as your name, email address, and profile image</li>
            <li>
              Your Google Drive to create and update one or more spreadsheets dedicated to Moneyger budgeting data
            </li>
            <li>
              Google Sheets content in the spreadsheet(s) that Moneyger creates and manages in order to read and write
              budgeting information
            </li>
          </ul>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">3. Information we store</h2>
          <p>
            Depending on the implementation and deployment, the Service may store some data in its own database or
            configuration, such as:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your Google account identifier and email address for authentication</li>
            <li>References to the Moneyger spreadsheet created in your Google Drive</li>
            <li>Operational metadata needed to keep the budgeting features working correctly</li>
          </ul>
          <p>
            Budget line items, categories, and amounts are intended to live in your Google Sheet, not in the
            application&apos;s primary data store.
          </p>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">4. How we use information</h2>
          <p>We use the information we access or store to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Authenticate you using your Google account</li>
            <li>Create and maintain a budgeting spreadsheet in your Google Drive</li>
            <li>Read and write budgeting data to your spreadsheet so the Service functions correctly</li>
            <li>Operate, maintain, and improve the Service</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">5. Data sharing</h2>
          <p>
            We do not sell your personal information. We do not share your budgeting data with third parties except:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>With your consent</li>
            <li>With service providers that support hosting, logging, monitoring, or email delivery</li>
            <li>If required by law, regulation, or valid legal process</li>
          </ul>
          <p>
            Your budgeting data lives in your Google Sheet, which is governed by Google&apos;s own terms and privacy
            policy. You control sharing and access to that sheet through your Google account.
          </p>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">6. Security</h2>
          <p>
            We use reasonable technical and organizational measures to protect information processed by the Service. No
            system is perfectly secure, and we cannot guarantee absolute security of your information or your Google
            account.
          </p>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">7. Data retention</h2>
          <p>
            We retain information only as long as necessary to provide the Service, comply with legal obligations, or
            resolve disputes. You can revoke Moneyger&apos;s access to your Google account or delete the spreadsheet in
            your Google Drive at any time using your Google account settings.
          </p>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">8. Your choices</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>You can choose not to sign in with Google and not use the Service</li>
            <li>You can disconnect Moneyger from your Google account in your Google security settings</li>
            <li>You can delete the Moneyger spreadsheet(s) in your Google Drive</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">9. Changes to this Privacy Policy</h2>
          <p>
            This Privacy Policy may be updated from time to time. When it changes, the &quot;Last updated&quot; date
            will be revised. By continuing to use the Service after changes take effect, you agree to the updated
            Privacy Policy.
          </p>
        </section>

        <section className="space-y-1 text-xs text-muted-foreground">
          <p>
            This Privacy Policy text is provided as general information and boilerplate only and is not legal advice.
            You should review it with a qualified attorney to ensure it fits your situation and jurisdiction.
          </p>
        </section>
      </Card>
    </div>
  );
}

