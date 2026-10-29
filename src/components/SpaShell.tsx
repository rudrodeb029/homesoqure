import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { Architecture } from "./Architecture";
import { LiveChatWidget } from "./LiveChatWidget";
import {
  getSiteSettings,
  fetchSiteSettingsFromCloud,
  type SiteSettings,
  DEFAULT_SETTINGS,
} from "@/lib/property-store";

export function SpaShell({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSettings(getSiteSettings());
      fetchSiteSettingsFromCloud().then((s) => {
        if (s) setSettings(s);
      });

      const handleUpdate = (e: Event) => {
        const customEvent = e as CustomEvent<SiteSettings>;
        if (customEvent.detail) {
          setSettings(customEvent.detail);
        }
      };
      window.addEventListener("homqero_settings_updated", handleUpdate);
      return () => window.removeEventListener("homqero_settings_updated", handleUpdate);
    }
  }, []);

  const cleanPhoneTel = settings.supportPhone.replace(/[^0-9+]/g, "");

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-espresso py-2 text-center text-xs tracking-wide text-primary-foreground font-medium">
        $1 credit score check trial with every rental application · <span className="font-bold text-accent">All 50 states</span>
      </div>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border font-serif font-bold text-xl text-primary bg-secondary/50">H</span>
            <span className="leading-none">
              <span className="block font-serif text-xl font-bold text-foreground">Homqero</span>
              <span className="eyebrow text-[0.55rem] font-bold">Rentals USA</span>
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-4">
            <a
              href={`tel:${cleanPhoneTel}`}
              className="text-xs tracking-[0.2em] uppercase font-bold text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1.5"
            >
              <span>Renter support · {settings.supportPhone}</span>
            </a>
          </div>
        </div>
      </header>
      <main className="relative overflow-hidden px-6 py-12 sm:py-24">
        <Architecture side="left" />
        <Architecture side="right" />
        <div className="relative">{children}</div>
      </main>
      <footer className="pb-10 text-center text-xs text-muted-foreground font-medium">
        <p className="space-x-4">
          <Link to="/fair-housing" className="underline underline-offset-4 hover:text-foreground transition font-medium">Fair Housing</Link>
          <Link to="/privacy" className="underline underline-offset-4 hover:text-foreground transition font-medium">Privacy Policy</Link>
          <Link to="/terms" className="underline underline-offset-4 hover:text-foreground transition font-medium">Terms of Service</Link>
        </p>
        <p className="mt-3 eyebrow font-bold">© 2026 Homqero Rentals USA</p>
      </footer>

      {/* Real-Time Live Chat with Landlord Widget */}
      <LiveChatWidget />
    </div>
  );
}
