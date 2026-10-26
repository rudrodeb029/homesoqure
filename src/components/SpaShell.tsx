import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Architecture } from "./Architecture";

export function SpaShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-espresso py-2 text-center text-xs tracking-wide text-primary-foreground">
        Free credit score check with every rental application · <span className="font-semibold text-accent">All 50 states</span>
      </div>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border font-script text-xl text-primary">H</span>
            <span className="leading-none">
              <span className="block font-serif text-xl text-foreground">Homqero</span>
              <span className="eyebrow text-[0.55rem]">Rentals USA</span>
            </span>
          </Link>
          <a href="tel:+16464313060" className="hidden text-xs tracking-[0.2em] uppercase text-muted-foreground sm:block">
            Renter support · +1 (646) 431-3060
          </a>
        </div>
      </header>
      <main className="relative overflow-hidden px-6 py-12 sm:py-24">
        <Architecture side="left" />
        <Architecture side="right" />
        <div className="relative">{children}</div>
      </main>
      <footer className="pb-10 text-center text-xs text-muted-foreground">
        <p className="space-x-3">
          <a className="underline underline-offset-4" href="#">Fair Housing</a>
          <a className="underline underline-offset-4" href="#">Privacy Policy</a>
          <a className="underline underline-offset-4" href="#">Terms of Service</a>
        </p>
        <p className="mt-3 eyebrow">© 2026 Homqero Rentals USA</p>
      </footer>
    </div>
  );
}
