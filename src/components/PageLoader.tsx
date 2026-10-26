import { useLocation } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";

export function PageLoader() {
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const [opacity, setOpacity] = useState(1);
  const initialLoadRef = useRef(true);

  // Fast, modern initial load dismissal (< 250ms)
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setOpacity(0);
      const hideTimer = setTimeout(() => {
        setVisible(false);
        initialLoadRef.current = false;
      }, 150);
      return () => clearTimeout(hideTimer);
    }, 200);

    return () => clearTimeout(fadeTimer);
  }, []);

  // Snappy route transitions: maximum 180ms active + 120ms fade = 300ms total. Never hangs for seconds!
  useEffect(() => {
    if (initialLoadRef.current) return;

    setVisible(true);
    setOpacity(1);

    const fadeTimer = setTimeout(() => {
      setOpacity(0);
      const hideTimer = setTimeout(() => {
        setVisible(false);
      }, 120);
      return () => clearTimeout(hideTimer);
    }, 180);

    return () => clearTimeout(fadeTimer);
  }, [location.pathname]);

  // Hard safety ceiling: unconditionally hide loader after 320ms so it is impossible to hang
  useEffect(() => {
    if (!visible) return;
    const safetyTimer = setTimeout(() => {
      setOpacity(0);
      setVisible(false);
    }, 320);

    return () => clearTimeout(safetyTimer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs transition-opacity duration-150 ease-out"
      style={{ opacity }}
    >
      {/* Central Badge & Multi-Orbit System */}
      <div className="relative flex h-32 w-32 items-center justify-center">
        {/* Ambient subtle glow behind */}
        <div className="absolute inset-0 rounded-full bg-accent/20 blur-xl animate-pulse" />

        {/* Outer Orbit Path 1 (Fine line) */}
        <div className="absolute inset-0 rounded-full border border-border/60" />

        {/* Orbit Ring 1 - Clockwise with 3 brisk circling points */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: "1.4s", animationTimingFunction: "linear" }}>
          {/* Point 1 (Top) - Primary large glowing point */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2">
            <div className="h-3.5 w-3.5 rounded-full bg-primary shadow-[0_0_12px_rgba(100,60,35,0.7)] ring-2 ring-background" />
          </div>
          {/* Point 2 (120 deg) - Accent medium point */}
          <div className="absolute bottom-4 left-3">
            <div className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_8px_rgba(200,140,80,0.6)]" />
          </div>
          {/* Point 3 (240 deg) - Espresso small trailing point */}
          <div className="absolute bottom-4 right-3">
            <div className="h-2 w-2 rounded-full bg-espresso/70 shadow-[0_0_6px_rgba(50,30,20,0.5)]" />
          </div>
        </div>

        {/* Orbit Ring 2 - Counter-Clockwise with 2 circling points on an offset track */}
        <div
          className="absolute -inset-2.5 animate-spin"
          style={{ animationDuration: "1.8s", animationDirection: "reverse", animationTimingFunction: "linear" }}
        >
          {/* Orbit Track 2 line */}
          <div className="absolute inset-0 rounded-full border border-accent/25" />
          {/* Point A */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2">
            <div className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_10px_rgba(210,150,90,0.8)] ring-1 ring-background" />
          </div>
          {/* Point B */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
            <div className="h-2 w-2 rounded-full bg-primary/80 shadow-[0_0_8px_rgba(100,60,35,0.6)] ring-1 ring-background" />
          </div>
        </div>

        {/* Central Monogrammed Medallion */}
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card shadow-lg">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-secondary/80">
            <span className="font-serif text-2xl font-bold tracking-tight text-primary">H</span>
          </div>
        </div>
      </div>
    </div>
  );
}
