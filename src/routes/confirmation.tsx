import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SpaShell } from "@/components/SpaShell";
import { Check, Clock, Home } from "lucide-react";
import { getPropertyById, getLatestSubmission, type Property, type Submission, DEFAULT_PROPERTY } from "@/lib/property-store";

export const Route = createFileRoute("/confirmation")({
  head: () => ({
    meta: [
      { title: "Application Confirmed · Homqero Rentals USA" },
      { name: "description", content: "Your rental prescreener and credit score verification have been successfully sent to the landlord." },
      { property: "og:title", content: "Application Confirmed · Homqero Rentals USA" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ConfirmationPage,
});

function HouseMark() {
  return (
    <svg viewBox="0 0 112 80" className="h-16 w-24 shrink-0 rounded bg-secondary text-primary" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 44 L56 16 L92 44" />
      <rect x="28" y="44" width="56" height="28" />
      <rect x="50" y="54" width="12" height="18" />
      <rect x="34" y="50" width="10" height="10" />
      <rect x="68" y="50" width="10" height="10" />
      <line x1="8" y1="72" x2="104" y2="72" />
    </svg>
  );
}

export function ConfirmationPage() {
  const [property, setProperty] = useState<Property>(DEFAULT_PROPERTY);
  const [submission, setSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const propId = params.get("p") || params.get("property");
      setProperty(getPropertyById(propId));
      setSubmission(getLatestSubmission());
    }
  }, []);

  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <SpaShell>
      <div className="mx-auto max-w-[560px] space-y-8">
        {/* Success Header with Animated Emblem */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-secondary/80 text-primary shadow-sm ring-8 ring-primary/5">
            <Check className="h-8 w-8 stroke-[2.5]" />
          </div>

          <h1 className="font-serif text-4xl text-foreground sm:text-5xl">
            Application <span className="font-script text-5xl text-primary sm:text-6xl">Submitted</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Your rental prescreening details and credit score verification have been successfully delivered to the property landlord.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Status: Under Landlord Review
          </div>
        </div>

        {/* Coded Architectural Property Card */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/40 px-5 py-3 flex items-center justify-between text-xs">
            <span className="font-mono text-muted-foreground">
              Confirmation ID: <strong className="text-foreground">{submission?.id || `HQ-2026-${property.zip}`}</strong>
            </span>
            <span className="text-muted-foreground">{currentDate}</span>
          </div>

          <div className="p-5 flex items-center gap-4">
            {property.imageUrl ? (
              <img
                src={property.imageUrl}
                alt={property.address}
                className="h-16 w-24 shrink-0 rounded-md object-cover border border-border shadow-xs"
              />
            ) : (
              <HouseMark />
            )}
            <div className="text-sm">
              <span className="eyebrow text-[0.6rem] text-primary">Target Rental Property</span>
              <p className="font-serif text-xl font-semibold text-foreground">{property.address}</p>
              <p className="text-xs text-muted-foreground">{property.city}, {property.state} {property.zip}</p>
              <p className="mt-1 font-semibold text-foreground">
                ${property.price} <span className="font-normal text-muted-foreground">/ month</span>
              </p>
            </div>
          </div>
        </div>

        {/* Modern Coded Architecture Timeline */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-serif text-xl text-foreground">What happens next?</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Follow the roadmap below as your rental prescreening progresses:
          </p>

          <div className="mt-6 space-y-6">
            {/* Step 1: Completed */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Check className="h-4 w-4 stroke-[3]" />
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-semibold text-foreground">1. Application & Credit Score Received</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Your household income, desired move-in date, pet preferences, and credit verification were securely transmitted.
                </p>
              </div>
            </div>

            {/* Step 2: Active */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-accent/20 text-accent-foreground shadow-sm">
                <Clock className="h-4 w-4 text-primary animate-spin" style={{ animationDuration: "8s" }} />
              </div>
              <div className="pt-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">2. Landlord Prescreen Review</p>
                  <span className="rounded bg-accent/30 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-foreground">Active</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  The landlord reviews applications in the order received. Expect an email or text update within <strong>24 to 48 hours</strong>.
                </p>
              </div>
            </div>

            {/* Step 3: Upcoming */}
            <div className="flex items-start gap-4 opacity-75">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground">
                <Home className="h-4 w-4" />
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-semibold text-foreground">3. Showing Schedule & Next Steps</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  If pre-approved, you will receive a direct invitation to view the property (in-person or virtual) and finalize lease paperwork.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Support & Action Buttons */}
        <div className="space-y-4 text-center">
          <div className="rounded-lg bg-secondary/50 p-4 text-xs text-muted-foreground">
            Questions regarding this rental? Call Renter Support at{" "}
            <a href={`tel:${property.supportPhone || "+16464313060"}`} className="font-semibold text-foreground underline underline-offset-2">
              {property.supportPhone || "+1 (646) 431-3060"}
            </a>{" "}
            (Mon–Fri 9am–6pm EST).
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              search={property.id ? { p: property.id } : undefined}
              className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-8 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground transition hover:bg-espresso shadow-sm"
            >
              Return to Property
            </Link>
          </div>
        </div>
      </div>
    </SpaShell>
  );
}
