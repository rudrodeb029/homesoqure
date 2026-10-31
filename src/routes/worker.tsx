import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  PlusCircle,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Users,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  X,
  Share2,
} from "lucide-react";
import {
  getProperties,
  getSubmissions,
  saveProperty,
  deleteProperty,
  getSiteSettings,
  fetchSiteSettingsFromCloud,
  subscribeToCloudProperties,
  subscribeToCloudSubmissions,
  type Property,
  type Submission,
  type SiteSettings,
} from "@/lib/property-store";
import {
  loginWorker,
  logoutWorker,
  fetchWorkerById,
  WORKER_SESSION_KEY,
  type Worker,
} from "@/lib/worker-store";

export const Route = createFileRoute("/worker")({
  head: () => ({
    meta: [
      { title: "Worker Panel · Homqero Rentals" },
      { name: "description", content: "Worker referral panel: post your own rental properties and track your own tenant leads." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkerPage,
});

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  pending_credit: "Pending Credit",
  incomplete: "Incomplete",
};

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  pending_credit: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  incomplete: "bg-orange-500/10 text-orange-700 border-orange-500/30",
};

function WorkerPage() {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Login form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Data
  const [properties, setProperties] = useState<Property[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(getSiteSettings());

  // UI
  const [tab, setTab] = useState<"properties" | "leads">("properties");
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [leadFilter, setLeadFilter] = useState<"all" | "completed" | "pending_credit" | "incomplete">("all");
  const [leadDate, setLeadDate] = useState("");
  const [screenshot, setScreenshot] = useState<{ url: string; name: string } | null>(null);

  // New property form
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("TX");
  const [zip, setZip] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [notes, setNotes] = useState("");

  // Restore session
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = sessionStorage.getItem(WORKER_SESSION_KEY);
    if (!id) {
      setCheckingSession(false);
      return;
    }
    fetchWorkerById(id).then((w) => {
      if (w && w.active) setWorker(w);
      else logoutWorker();
      setCheckingSession(false);
    });
  }, []);

  // Live data once logged in
  useEffect(() => {
    if (!worker) return;
    setProperties(getProperties());
    setSubmissions(getSubmissions());
    fetchSiteSettingsFromCloud().then(setSettings);
    const unsubP = subscribeToCloudProperties(setProperties);
    const unsubS = subscribeToCloudSubmissions(setSubmissions);
    return () => {
      unsubP();
      unsubS();
    };
  }, [worker]);

  const myProperties = useMemo(
    () => (worker ? properties.filter((p) => p.ownerId === worker.id) : []),
    [properties, worker]
  );

  const myLeads = useMemo(() => {
    if (!worker) return [];
    const myPropIds = new Set(myProperties.map((p) => p.id));
    return submissions.filter(
      (s) =>
        s.ownerId === worker.id ||
        (s.referralCode && s.referralCode === worker.referralCode) ||
        (!s.ownerId && myPropIds.has(s.propertyId))
    );
  }, [submissions, myProperties, worker]);

  const filteredLeads = myLeads.filter((s) => {
    if (leadFilter !== "all" && s.status !== leadFilter) return false;
    if (leadDate) {
      const d = (s.submittedAt || s.lastUpdated || "").split("T")[0];
      if (d !== leadDate) return false;
    }
    return true;
  });

  const stats = {
    completed: myLeads.filter((s) => s.status === "completed").length,
    pending: myLeads.filter((s) => s.status === "pending_credit").length,
    incomplete: myLeads.filter((s) => s.status === "incomplete").length,
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    try {
      const w = await loginWorker(username, password);
      setWorker(w);
      setPassword("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    logoutWorker();
    setWorker(null);
  };

  const shareLink = (propertyId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/?p=${propertyId}&ref=${worker?.referralCode || ""}`;
  };

  const copyLink = (propertyId: string) => {
    navigator.clipboard.writeText(shareLink(propertyId));
    setCopiedId(propertyId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker || !address || !city || !zip || !price) return;
    saveProperty({
      address: address.trim(),
      city: city.trim(),
      state: stateCode.trim().toUpperCase(),
      zip: zip.trim(),
      price: Number(price) || 0,
      imageUrl: imageUrl.trim() || undefined,
      creditCheckUrl: settings.creditCheckUrl || "#",
      supportPhone: settings.supportPhone,
      supportEmail: settings.supportEmail,
      notes: notes.trim(),
      ownerId: worker.id,
      ownerName: worker.name,
      referralCode: worker.referralCode,
    });
    setAddress("");
    setCity("");
    setZip("");
    setPrice("");
    setImageUrl("");
    setNotes("");
    setIsCreating(false);
    setProperties(getProperties());
  };

  const handleImageFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this property post?")) {
      deleteProperty(id);
      setProperties(getProperties());
    }
  };

  // ---------------------------------------------------------------
  // LOGIN VIEW
  // ---------------------------------------------------------------
  if (!worker) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
        <div className="bg-espresso py-2.5 px-6 text-xs text-primary-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-accent" />
            <span>Worker Area</span>
          </div>
          <Link to="/" className="text-accent hover:underline flex items-center gap-1 font-semibold">
            <span>Return to Website</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <div className="mx-auto w-full max-w-md px-6 py-12">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-xl text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border text-primary bg-secondary/60 shadow-sm ring-8 ring-primary/5">
              <Users className="h-7 w-7" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Worker Panel Login</h1>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Sign in with the username and password provided by your admin to post properties and track your leads.
            </p>

            {checkingSession ? (
              <p className="mt-6 text-xs text-muted-foreground">Checking session...</p>
            ) : (
              <form onSubmit={handleLogin} className="mt-6 space-y-4 text-left">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground">Username</label>
                  <input
                    required
                    autoFocus
                    autoComplete="username"
                    placeholder="e.g. john"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setLoginError("");
                    }}
                    className="spa-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground flex items-center justify-between">
                    <span>Password</span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[0.7rem] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      <span>{showPassword ? "Hide" : "Show"}</span>
                    </button>
                  </label>
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter password..."
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setLoginError("");
                    }}
                    className="spa-field"
                  />
                </div>
                {loginError && (
                  <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {loginError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loggingIn}
                  className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground shadow-sm hover:bg-espresso transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{loggingIn ? "Signing in..." : "Sign In"}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="py-6 text-center text-xs text-muted-foreground">
          © 2026 Homqero Rentals USA · Worker Portal
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------
  // WORKER DASHBOARD
  // ---------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 lg:w-72 border-r border-border bg-card flex flex-col shrink-0 md:min-h-screen">
        <div className="p-5 border-b border-border flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border font-serif font-bold text-xl text-primary bg-secondary/60">
            {(worker.name || "W").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <span className="block font-serif text-lg font-bold leading-tight truncate">{worker.name}</span>
            <span className="eyebrow text-[0.55rem] text-muted-foreground font-bold">Worker · {worker.referralCode}</span>
          </div>
        </div>

        <nav className="p-3.5 space-y-1.5 flex-1">
          <button
            type="button"
            onClick={() => {
              setTab("properties");
              setIsCreating(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              tab === "properties" && !isCreating ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-secondary"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4" /> My Properties
            </span>
            <span className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold bg-secondary text-foreground">{myProperties.length}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("leads");
              setIsCreating(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              tab === "leads" ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-secondary"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Users className="h-4 w-4" /> My Leads
            </span>
            <span className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold bg-secondary text-foreground">{myLeads.length}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("properties");
              setIsCreating(true);
            }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              isCreating ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-secondary"
            }`}
          >
            <PlusCircle className="h-4 w-4" /> Post New Property
          </button>
        </nav>

        <div className="p-4 border-t border-border bg-secondary/30 flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Signed in
          </span>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="border-b border-border bg-card px-6 py-4">
          <h1 className="font-serif text-2xl font-bold">
            {isCreating ? "Post a New Property" : tab === "leads" ? "My Tenant Leads" : "My Property Posts"}
          </h1>
          <p className="text-xs text-muted-foreground">
            Your referral code: <strong className="text-foreground font-mono">{worker.referralCode}</strong> · Only your own posts and leads are shown here.
          </p>
        </header>

        <main className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "My Properties", value: myProperties.length, icon: Building2, cls: "text-primary" },
              { label: "Incomplete", value: stats.incomplete, icon: AlertCircle, cls: "text-orange-600" },
              { label: "Pending Credit", value: stats.pending, icon: Clock, cls: "text-amber-600" },
              { label: "Completed", value: stats.completed, icon: CheckCircle2, cls: "text-emerald-600" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                <div>
                  <p className={`eyebrow text-[0.6rem] font-bold ${c.cls}`}>{c.label}</p>
                  <p className="font-serif text-2xl font-bold">{c.value}</p>
                </div>
                <c.icon className={`h-6 w-6 ${c.cls}`} />
              </div>
            ))}
          </div>

          {/* CREATE FORM */}
          {isCreating && (
            <form onSubmit={handleCreate} className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="font-serif text-xl font-bold">New Rental Property</h2>
                <button type="button" onClick={() => setIsCreating(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Property Photo (upload)</label>
                  <input type="file" accept="image/*" onChange={(e) => handleImageFile(e.target.files?.[0])} className="spa-field text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Or paste image URL</label>
                  <input
                    placeholder="https://images.example.com/front.jpg"
                    value={imageUrl.startsWith("data:") ? "" : imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="spa-field"
                  />
                </div>
              </div>
              {imageUrl && <img src={imageUrl} alt="Preview" className="h-28 rounded-lg border border-border object-cover" />}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Street Address *</label>
                  <input required placeholder="e.g. 742 Evergreen Terrace" value={address} onChange={(e) => setAddress(e.target.value)} className="spa-field" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">City *</label>
                  <input required placeholder="e.g. Springfield" value={city} onChange={(e) => setCity(e.target.value)} className="spa-field" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">State (2 Letters) *</label>
                  <input required maxLength={2} value={stateCode} onChange={(e) => setStateCode(e.target.value)} className="spa-field" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">ZIP Code *</label>
                  <input required placeholder="e.g. 76933" value={zip} onChange={(e) => setZip(e.target.value)} className="spa-field" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Monthly Rent ($ USD) *</label>
                  <input required type="number" min="0" placeholder="e.g. 850" value={price} onChange={(e) => setPrice(e.target.value)} className="spa-field" />
                </div>
              </div>

              {/* Locked global settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Custom Credit Check Link", value: settings.creditCheckUrl || "" },
                  { label: "Support Contact Phone", value: settings.supportPhone },
                  { label: "Support / Landlord Email", value: settings.supportEmail },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="block text-xs font-semibold mb-1 flex items-center justify-between">
                      <span>{f.label}</span>
                      <span className="text-[0.68rem] text-muted-foreground font-normal flex items-center gap-1">
                        <Lock className="h-2.5 w-2.5" /> Not editable
                      </span>
                    </label>
                    <input readOnly tabIndex={-1} value={f.value} className="spa-field bg-secondary/70 cursor-not-allowed text-muted-foreground" />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Property Description / Notes (Optional)</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="spa-field" />
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsCreating(false)} className="rounded-full border border-border px-5 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="rounded-full bg-primary px-6 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-espresso cursor-pointer">
                  Save &amp; Generate Link
                </button>
              </div>
            </form>
          )}

          {/* PROPERTIES LIST */}
          {tab === "properties" && !isCreating && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-bold">Your Rental Properties ({myProperties.length})</h2>
                <button
                  onClick={() => setIsCreating(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-espresso cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" /> New Post
                </button>
              </div>
              {myProperties.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
                  You haven't posted any properties yet. Click <strong>New Post</strong> to create your first listing.
                </div>
              ) : (
                myProperties.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.address} className="h-16 w-24 rounded-lg object-cover border border-border" />
                    ) : (
                      <div className="h-16 w-24 rounded-lg bg-secondary flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="eyebrow text-[0.6rem] text-muted-foreground">ID: {p.id}</p>
                      <p className="font-serif text-lg font-bold truncate">{p.address}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.city}, {p.state} {p.zip} · <strong className="text-foreground">${p.price}</strong> / month ·{" "}
                        {myLeads.filter((s) => s.propertyId === p.id).length} leads
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyLink(p.id)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-espresso cursor-pointer"
                      >
                        {copiedId === p.id ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                        {copiedId === p.id ? "Copied!" : "Copy Link"}
                      </button>
                      <a
                        href={shareLink(p.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Test
                      </a>
                      <button
                        onClick={() => handleDelete(p.id)}
                        title="Delete"
                        className="rounded-md border border-border p-2 text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* LEADS LIST */}
          {tab === "leads" && !isCreating && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {(["all", "incomplete", "pending_credit", "completed"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setLeadFilter(f)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                      leadFilter === f ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
                    }`}
                  >
                    {f === "all" ? `All (${myLeads.length})` : STATUS_LABEL[f]}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <input type="date" value={leadDate} onChange={(e) => setLeadDate(e.target.value)} className="spa-field py-1.5 text-xs w-auto" />
                  {leadDate && (
                    <button onClick={() => setLeadDate("")} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {filteredLeads.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
                  No leads found. Share your property links to start receiving applications.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/60 text-left">
                      <tr>
                        <th className="p-3">Applicant</th>
                        <th className="p-3">Property</th>
                        <th className="p-3">Income / Credit</th>
                        <th className="p-3">Move-in</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Screenshot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((s) => (
                        <tr key={s.id} className="border-t border-border align-top">
                          <td className="p-3">
                            <p className="font-semibold text-foreground">{`${s.firstName} ${s.lastName}`.trim() || "—"}</p>
                            <p className="text-muted-foreground">{s.email || "—"}</p>
                            <p className="text-muted-foreground">{s.phone || ""}</p>
                          </td>
                          <td className="p-3">{s.propertyAddress}</td>
                          <td className="p-3">
                            <p>{s.income ? `$${s.income}` : "—"}</p>
                            <p className="text-muted-foreground">{s.creditRange || ""}</p>
                          </td>
                          <td className="p-3">{s.moveInDate || "—"}</td>
                          <td className="p-3">
                            <span className={`inline-block rounded-full border px-2 py-0.5 font-semibold ${STATUS_STYLE[s.status] || ""}`}>
                              {STATUS_LABEL[s.status] || s.status}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">{new Date(s.submittedAt).toLocaleString()}</td>
                          <td className="p-3">
                            {s.screenshotUrl ? (
                              <button
                                onClick={() => setScreenshot({ url: s.screenshotUrl!, name: s.screenshotName || "screenshot" })}
                                className="inline-flex items-center gap-1 text-primary font-semibold hover:underline cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" /> View
                              </button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Screenshot modal */}
      {screenshot && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setScreenshot(null)}>
          <div className="bg-card rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">{screenshot.name}</p>
              <button onClick={() => setScreenshot(null)} className="cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            {screenshot.url.startsWith("data:application/pdf") ? (
              <a href={screenshot.url} download={screenshot.name} className="text-primary underline text-sm">
                <Copy className="inline h-4 w-4" /> Download PDF
              </a>
            ) : (
              <img src={screenshot.url} alt={screenshot.name} className="w-full rounded-lg" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

