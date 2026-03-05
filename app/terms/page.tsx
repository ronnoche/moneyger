import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Button, Card } from '@/components/ui';

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto mt-8 max-w-5xl space-y-6 md:mt-14">
      <PageHeader
        title="Terms of Service"
        description="The rules for using Moneyger."
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
            Moneyger is a personal budgeting tool that helps you organize and plan your finances using your own Google
            Sheet. These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Moneyger web
            application (the &quot;Service&quot;).
          </p>
          <p>
            By accessing or using the Service you agree to be bound by these Terms. If you do not agree, you must not
            use the Service.
          </p>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">2. Eligibility and accounts</h2>
          <p>
            You must be legally able to enter into a binding contract in your jurisdiction to use the Service. You are
            responsible for:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Maintaining the confidentiality of your Google account credentials</li>
            <li>Restricting access to your devices and browser sessions</li>
            <li>All activity that occurs using your connected Google account</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">3. Use of Google Sheets and Drive</h2>
          <p>
            The Service connects to your Google account to create and update a dedicated spreadsheet in your Google
            Drive. Subject to these Terms:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>You retain ownership of the content stored in your Google Sheet</li>
            <li>
              The Service reads and writes only the spreadsheet(s) required for budgeting features and related metadata
            </li>
            <li>You are responsible for managing access to your Google Drive and any sharing settings</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">4. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to the Service or related systems</li>
            <li>Reverse engineer or interfere with the normal operation of the Service</li>
            <li>Use the Service in a way that could damage or impair the infrastructure</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">5. No financial advice</h2>
          <p>
            The Service provides budgeting tools and views of your data but does not provide financial, investment, tax,
            or legal advice. You are solely responsible for any financial decisions you make using information from the
            Service.
          </p>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">6. Availability and changes</h2>
          <p>
            The Service is provided on an &quot;as available&quot; basis. Features, integrations, and availability may
            change over time. The Service may be suspended or discontinued, temporarily or permanently, with or without
            notice.
          </p>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">7. Disclaimers</h2>
          <p>
            The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of
            any kind, whether express or implied, including implied warranties of merchantability, fitness for a
            particular purpose, and non-infringement.
          </p>
          <p>
            The Service depends on third-party providers such as Google for authentication, storage, and APIs. The
            operation and availability of those services are outside our control.
          </p>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">8. Limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, the owner(s) and maintainer(s) of Moneyger will not be liable for
            any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues,
            whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses,
            resulting from:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your access to or use of, or inability to access or use, the Service</li>
            <li>Any conduct or content of any third party in connection with the Service</li>
            <li>Unauthorized access, use, or alteration of your transmissions or data</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">9. Governing law</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of the jurisdiction where the
            Service&apos;s owner is based, without regard to conflict of law principles.
          </p>
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">10. Changes to these Terms</h2>
          <p>
            These Terms may be updated from time to time. When they change, the &quot;Last updated&quot; date will be
            revised. By continuing to use the Service after changes take effect, you agree to the updated Terms.
          </p>
        </section>

        <section className="space-y-1 text-xs text-muted-foreground">
          <p>
            This Terms of Service text is provided as general information and boilerplate only and is not legal advice.
            You should review it with a qualified attorney to ensure it fits your situation and jurisdiction.
          </p>
        </section>
      </Card>
    </div>
  );
}

