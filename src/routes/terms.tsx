import { createFileRoute, Link } from "@tanstack/react-router";
import { SpaShell } from "@/components/SpaShell";
import { FileText, ArrowLeft, CheckCircle2, ShieldCheck } from "@/lib/lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use & Service · Homqero Rentals USA" },
      { name: "description", content: "Review the Terms of Use and platform policies for Homqero Rentals USA rental prescreening services." },
      { property: "og:title", content: "Terms of Use · Homqero Rentals USA" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const lastUpdated = "October 2026";

  return (
    <SpaShell>
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:text-espresso transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Rental Application</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="border-b border-border pb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-secondary/80 px-3 py-1 text-xs font-bold text-primary mb-3">
            <FileText className="h-4 w-4 text-primary" />
            <span>Platform Agreement &amp; Rental Guidelines</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
            Terms of Use &amp; Service
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-medium">
            Effective: {lastUpdated} · Please review the conditions governing your use of the Homqero prescreening service.
          </p>
        </div>

        {/* Platform Purpose */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-3">
          <h2 className="font-serif text-xl font-bold text-foreground">1. Rental Prescreening Platform</h2>
          <p className="text-xs leading-relaxed text-foreground/90 font-medium">
            Homqero Rentals USA operates an independent digital rental prescreening portal. We provide tools for prospective tenants to share employment status, household profile, and credit verification with property managers and landlords. Homqero does not own, lease, or manage the residential listings unless expressly stated, and does not serve as a real estate brokerage.
          </p>
        </div>

        {/* Applicant Accuracy */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-3">
          <h2 className="font-serif text-xl font-bold text-foreground">2. Applicant Representations &amp; Accuracy</h2>
          <p className="text-xs leading-relaxed text-foreground/90 font-medium">
            By submitting an application through this platform, you affirm and agree that:
          </p>
          <ul className="space-y-2 text-xs font-medium text-foreground/80 pl-5 list-disc leading-relaxed">
            <li>All submitted information, including household income, occupancy count, and move-in timeline, is accurate, current, and provided in good faith.</li>
            <li>Any uploaded credit score verification or document is genuine, unmodified, and belongs to the applicant.</li>
            <li>You authorize the participating property manager or landlord to review your submission for residential tenancy consideration.</li>
          </ul>
        </div>

        {/* Credit Score Checking */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-3">
          <h2 className="font-serif text-xl font-bold text-foreground">3. Free Credit Score Check Protocol</h2>
          <p className="text-xs leading-relaxed text-foreground/90 font-medium">
            Homqero facilitates convenient links to free, soft-pull consumer credit reporting resources. Utilizing these third-party consumer tools does not adversely affect your credit score. Homqero does not generate consumer credit reports directly and does not charge applicants fees for credit score verification.
          </p>
        </div>

        {/* Landlord Independent Decisions */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-3">
          <h2 className="font-serif text-xl font-bold text-foreground">4. Tenancy &amp; Lease Approvals</h2>
          <p className="text-xs leading-relaxed text-foreground/90 font-medium">
            Final decisions regarding lease approval, security deposit amounts, and tenancy terms are made independently by property owners and managers in compliance with applicable federal, state, and local residential tenancy legislation. Homqero does not guarantee approval or lease execution.
          </p>
        </div>

        {/* Support */}
        <div className="rounded-xl border border-primary/20 bg-secondary/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-foreground">Questions Regarding These Terms?</h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Our landlord support desk is available Monday through Saturday.
            </p>
          </div>
          <a
            href="tel:+16464313060"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-espresso transition shrink-0"
          >
            +1 (646) 431-3060
          </a>
        </div>
      </div>
    </SpaShell>
  );
}
