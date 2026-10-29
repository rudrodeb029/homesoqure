import { createFileRoute, Link } from "@tanstack/react-router";
import { SpaShell } from "@/components/SpaShell";
import { ShieldCheck, Home, ArrowLeft, CheckCircle2 } from "@/lib/lucide-react";

export const Route = createFileRoute("/fair-housing")({
  head: () => ({
    meta: [
      { title: "Equal Housing Opportunity & Fair Housing Policy · Homqero Rentals USA" },
      { name: "description", content: "Homqero Rentals USA is committed to compliance with all federal, state, and local fair housing laws." },
      { property: "og:title", content: "Equal Housing Opportunity · Homqero Rentals USA" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: FairHousingPage,
});

function FairHousingPage() {
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
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Federal Fair Housing Act Compliance</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
            Equal Housing Opportunity Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-medium">
            Homqero Rentals USA is committed to ensuring fair, equitable, and non-discriminatory housing opportunities for all applicants.
          </p>
        </div>

        {/* Core Commitment Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary font-bold">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-foreground">Our Equal Housing Commitment</h2>
              <p className="text-xs text-muted-foreground font-medium">Title VIII of the Civil Rights Act of 1968 (Fair Housing Act)</p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-foreground/90 font-medium">
            We conduct business in full compliance with the Federal Fair Housing Act, which prohibits discrimination in the sale, rental, lease, or financing of housing based on protected categories. All properties and rental applications processed through Homqero Rentals USA are offered on an equal opportunity basis.
          </p>
        </div>

        {/* Protected Categories */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
          <h2 className="font-serif text-xl font-bold text-foreground">Federally Protected Classes</h2>
          <p className="text-xs text-muted-foreground font-medium">
            No applicant or tenant shall be denied housing, treated differently, or subject to discriminatory terms on the basis of:
          </p>

          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            {[
              { title: "Race & Color", desc: "Equal access regardless of racial background or skin tone." },
              { title: "National Origin", desc: "Protection regardless of country of birth or citizenship lineage." },
              { title: "Religion", desc: "Freedom from religious discrimination or preference." },
              { title: "Sex & Gender Identity", desc: "Includes gender expression and sexual orientation protections." },
              { title: "Familial Status", desc: "Families with children under 18, pregnant individuals, and guardians." },
              { title: "Disability & Accessibility", desc: "Physical or mental impairments; right to reasonable accommodation." },
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-border/60 bg-secondary/30 p-3 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold text-foreground">{item.title}</h3>
                  <p className="text-[0.7rem] text-muted-foreground font-medium mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Landlord Guidelines */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
          <h2 className="font-serif text-xl font-bold text-foreground">Tenant Prescreening Standards</h2>
          <p className="text-xs leading-relaxed text-foreground/90 font-medium">
            Homqero provides an objective, transparent prescreening platform. All rental evaluations conducted by participating property managers must rely strictly on uniform, non-discriminatory criteria:
          </p>
          <ul className="space-y-2 text-xs font-medium text-foreground/80 pl-5 list-disc leading-relaxed">
            <li>Consistent income-to-rent verification applied equally to all prospective applicants.</li>
            <li>Objective credit score and debt-servicing assessments without selective tiering.</li>
            <li>Equal occupancy standards adhering to federal HUD guidelines (two persons per bedroom).</li>
            <li>Prompt accommodation of assistance animals and service animals without pet fee surcharges.</li>
          </ul>
        </div>

        {/* Contact for Inquiries */}
        <div className="rounded-xl border border-primary/20 bg-secondary/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-foreground">Have Fair Housing Questions?</h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Contact our tenant compliance desk or consult the U.S. Department of Housing and Urban Development (HUD).
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

