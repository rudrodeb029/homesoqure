import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SpaShell } from "@/components/SpaShell";
import { Check, Clock, Home, MessageCircle, Mail, ExternalLink, Copy } from "@/lib/lucide-react";
import { getPropertyById, getLatestSubmission, type Property, type Submission, DEFAULT_PROPERTY } from "@/lib/property-store";
import { openGmailInstantly, buildApplicationEmailUrls } from "@/lib/deep-analysis";

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
  const [copied, setCopied] = useState(false);

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

  const emailUrls = submission ? buildApplicationEmailUrls(submission, property) : null;

  const handleCopyDetails = async () => {
    if (!emailUrls) return;
    try {
      await navigator.clipboard.writeText(`To: ${emailUrls.targetEmail}\nSubject: ${emailUrls.subject}\n\n${emailUrls.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // fallback
    }
  };

  return (
    <SpaShell>
      <div className="mx-auto max-w-[560px] space-y-8">
        {/* Success Header with Animated Emblem */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-secondary/80 text-primary shadow-sm ring-8 ring-primary/5">
            <Check className="h-8 w-8 stroke-[2.5]" />
          </div>

          <h1 className="font-serif text-4xl font-bold text-foreground sm:text-5xl">
            Application Submitted
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base font-medium">
            Your rental prescreening details and credit score verification have been successfully delivered to the property landlord.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
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
            <span className="text-muted-foreground font-medium">{currentDate}</span>
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
              <span className="eyebrow text-[0.6rem] font-bold text-primary">Target Rental Property</span>
              <p className="font-serif text-xl font-bold text-foreground">{property.address}</p>
              <p className="text-xs text-muted-foreground font-medium">{property.city}, {property.state} {property.zip}</p>
              <p className="mt-1 font-bold text-foreground">
                ${property.price} <span className="font-normal text-muted-foreground">/ month</span>
              </p>
            </div>
          </div>
        </div>

        {/* Modern Coded Architecture Timeline */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-serif text-xl font-bold text-foreground">What happens next?</h2>
          <p className="mt-1 text-xs text-muted-foreground font-medium">
            Follow the roadmap below as your rental prescreening progresses:
          </p>

          <div className="mt-6 space-y-6">
            {/* Step 1: Completed */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Check className="h-4 w-4 stroke-[3]" />
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-bold text-foreground">1. Application &amp; $1 Trial Credit Score Received</p>
                <p className="mt-0.5 text-xs text-muted-foreground font-medium">
                  Your household income, desired move-in date, pet preferences, and credit verification screenshot were securely transmitted.
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
                  <p className="text-sm font-bold text-foreground">2. Landlord Review &amp; Verification</p>
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[0.65rem] font-bold text-accent-foreground">In Progress</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground font-medium">
                  The landlord reviews your income-to-rent ratio, verified credit score screenshot, and scheduled move-in availability.
                </p>
              </div>
            </div>

            {/* Step 3: Upcoming */}
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground">
                <span className="text-xs font-bold">3</span>
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-bold text-muted-foreground">3. Showing Tour &amp; Lease Finalization</p>
                <p className="mt-0.5 text-xs text-muted-foreground font-medium">
                  Approved applicants receive direct phone and email follow-up from the landlord to arrange private walkthroughs and sign the lease agreement.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Open in Gmail Card */}
        <div className="rounded-xl border border-primary/20 bg-secondary/50 p-5 text-center">
          <p className="font-bold text-sm text-foreground">Open Application in Gmail</p>
          <p className="mt-1 text-xs text-muted-foreground font-medium">
            Your application details, title, and target landlord recipient are fully prepared:
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (submission) {
                  openGmailInstantly(submission, property);
                }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-espresso transition cursor-pointer shadow-xs"
            >
              <Mail className="h-4 w-4" />
              <span>Open in Gmail App</span>
            </button>

            {emailUrls && (
              <a
                href={emailUrls.gmailComposeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground hover:bg-secondary transition cursor-pointer shadow-xs"
              >
                <ExternalLink className="h-4 w-4 text-primary" />
                <span>Open in Web Gmail</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleCopyDetails}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground hover:bg-secondary transition cursor-pointer shadow-xs"
            >
              <Copy className="h-4 w-4 text-primary" />
              <span>{copied ? "Copied to Clipboard!" : "Copy Details"}</span>
            </button>
          </div>
        </div>

        {/* Live Chat prompt card */}
        <div className="rounded-xl border border-primary/20 bg-secondary/50 p-5 text-center">
          <p className="font-bold text-sm text-foreground">Have a question for the landlord right now?</p>
          <p className="mt-1 text-xs text-muted-foreground font-medium">
            Use the Live Chat bubble in the bottom right corner to message the property manager directly.
          </p>
        </div>

        {/* Return Button */}
        <div className="text-center pt-2">
          <Link
            to="/"
            search={property.id ? { p: property.id } : undefined}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] text-foreground shadow-xs transition hover:bg-secondary cursor-pointer"
          >
            <Home className="h-4 w-4" />
            <span>Return to Rental Listing</span>
          </Link>
        </div>
      </div>
    </SpaShell>
  );
}
