import { createFileRoute, Link } from "@tanstack/react-router";
import { SpaShell } from "@/components/SpaShell";
import { Lock, ArrowLeft, ShieldCheck, Eye, Check } from "@/lib/lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · Homqero Rentals USA" },
      { name: "description", content: "Learn how Homqero Rentals USA securely collects, protects, and handles your rental application and prescreening data." },
      { property: "og:title", content: "Privacy Policy · Homqero Rentals USA" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
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
            <Lock className="h-4 w-4 text-primary" />
            <span>Data Protection &amp; Confidentiality</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-medium">
            Last Updated: {lastUpdated} · Your privacy and rental data confidentiality are fundamental to our services.
          </p>
        </div>

        {/* Overview Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-3">
          <h2 className="font-serif text-xl font-bold text-foreground">1. Information We Collect</h2>
          <p className="text-xs leading-relaxed text-foreground/90 font-medium">
            When you complete a rental prescreener on Homqero, we collect only information necessary for the landlord to review your application:
          </p>
          <ul className="space-y-2 text-xs font-medium text-foreground/80 pl-5 list-disc leading-relaxed">
            <li><strong>Contact Details:</strong> Full name, telephone number (USA format), and email address.</li>
            <li><strong>Household Profile:</strong> Estimated household income, number of occupants, pet details, smoking preference, and preferred move-in date.</li>
            <li><strong>Credit Verification:</strong> Declared credit score range and applicant-uploaded verification screenshot from the 1 dollar ($1) trial.</li>
            <li><strong>Direct Communications:</strong> Real-time messages submitted via our landlord live chat feature.</li>
          </ul>
        </div>

        {/* Purpose */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-3">
          <h2 className="font-serif text-xl font-bold text-foreground">2. How We Use Your Information</h2>
          <p className="text-xs leading-relaxed text-foreground/90 font-medium">
            Your personal information is used exclusively for legitimate rental application and landlord communication purposes:
          </p>
          <div className="grid gap-3 sm:grid-cols-2 pt-1">
            <div className="rounded-lg bg-secondary/30 p-3.5 border border-border/40">
              <span className="font-bold text-xs text-foreground block mb-1">Landlord Evaluation</span>
              <p className="text-[0.72rem] text-muted-foreground font-medium">
                Transmitting your prescreening submission and 1 dollar ($1) trial credit verification directly to the property landlord or manager for lease review.
              </p>
            </div>
            <div className="rounded-lg bg-secondary/30 p-3.5 border border-border/40">
              <span className="font-bold text-xs text-foreground block mb-1">Application Follow-Up</span>
              <p className="text-[0.72rem] text-muted-foreground font-medium">
                Enabling direct phone, email, and live chat contact regarding property showings and lease terms.
              </p>
            </div>
          </div>
        </div>

        {/* No Selling Data */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span>Zero Third-Party Data Selling Guarantee</span>
          </div>
          <p className="text-xs leading-relaxed text-foreground/90 font-medium">
            Homqero Rentals USA never sells, rents, or licenses your personal or financial information to third-party advertisers, data brokers, or marketing networks. Your data remains strictly between you and the property management team.
          </p>
        </div>

        {/* Data Security */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-3">
          <h2 className="font-serif text-xl font-bold text-foreground">3. Security &amp; Encryption</h2>
          <p className="text-xs leading-relaxed text-foreground/90 font-medium">
            We implement enterprise-grade security controls to safeguard your data. All communications and uploaded documents are encrypted in transit via SSL/TLS (HTTPS) and stored in encrypted cloud databases backed by Google Cloud &amp; Firebase security architecture. Access to landlord dashboards is password-protected and restricted.
          </p>
        </div>

        {/* Tenant Rights */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-3">
          <h2 className="font-serif text-xl font-bold text-foreground">4. Your Data Rights</h2>
          <p className="text-xs leading-relaxed text-foreground/90 font-medium">
            You retain full authority over your personal information. You may at any time request access to your submitted details, request corrections, or ask for the removal of your application records by contacting landlord support at <a href="tel:+16464313060" className="text-primary font-bold underline">+1 (646) 431-3060</a>.
          </p>
        </div>
      </div>
    </SpaShell>
  );
}

