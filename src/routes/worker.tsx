import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
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
  MessageSquare,
  Send,
  MessageCircle,
  Pencil,
  Upload,
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
import {
  subscribeToAllChatThreads,
  subscribeToChatMessages,
  sendChatMessage,
  markChatReadByAdmin,
  type ChatThread,
  type ChatMessage,
} from "@/lib/chat-store";

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
  const [tab, setTab] = useState<"properties" | "leads" | "chat">("properties");
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [leadFilter, setLeadFilter] = useState<"all" | "completed" | "pending_credit" | "incomplete">("all");
  const [leadDate, setLeadDate] = useState("");
  const [screenshot, setScreenshot] = useState<{ url: string; name: string } | null>(null);

  // Live Chat state
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [activeChatMessages, setActiveChatMessages] = useState<ChatMessage[]>([]);
  const [workerReplyText, setWorkerReplyText] = useState("");

  // New property form
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("TX");
  const [zip, setZip] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [notes, setNotes] = useState("");

  // Edit property state
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editStateCode, setEditStateCode] = useState("TX");
  const [editZip, setEditZip] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editPreviewUrl, setEditPreviewUrl] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const editFileInputRef = useRef<HTMLInputElement>(null);

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
    const unsubChats = subscribeToAllChatThreads(setChatThreads);
    return () => {
      unsubP();
      unsubS();
      unsubChats();
    };
  }, [worker]);

  // Subscribe to messages of active chat
  useEffect(() => {
    if (!selectedChatId) {
      setActiveChatMessages([]);
      return;
    }
    markChatReadByAdmin(selectedChatId);
    const unsubMsgs = subscribeToChatMessages(selectedChatId, (msgs) => {
      setActiveChatMessages(msgs);
    });
    return () => unsubMsgs();
  }, [selectedChatId]);

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

  const myChats = useMemo(() => {
    if (!worker) return [];
    const myPropIds = new Set(myProperties.map((p) => p.id));
    return (chatThreads || []).filter(
      (t) =>
        t &&
        (t.ownerId === worker.id ||
          (t.referralCode && t.referralCode.toUpperCase() === worker.referralCode.toUpperCase()) ||
          (t.propertyId && myPropIds.has(t.propertyId)))
    );
  }, [chatThreads, myProperties, worker]);

  const unreadChatsCount = myChats.reduce(
    (sum, t) => sum + ((t?.unreadAdminCount || 0) > 0 ? 1 : 0),
    0
  );

  const handleSendWorkerReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!workerReplyText.trim() || !selectedChatId || !worker) return;
    const text = workerReplyText.trim();
    setWorkerReplyText("");
    await sendChatMessage(selectedChatId, "admin", text, {
      senderName: `${worker.name} (Support)`,
      ownerId: worker.id,
      ownerName: worker.name,
      referralCode: worker.referralCode,
    });
  };

  const handleSelectQuickReply = (text: string) => {
    setWorkerReplyText(text);
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
      previewUrl: previewUrl.trim() || undefined,
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
    setPreviewUrl("");
    setNotes("");
    setIsCreating(false);
    setProperties(getProperties());
  };

  const handleOpenEdit = (prop: Property) => {
    setEditingProperty(prop);
    setEditAddress(prop.address);
    setEditCity(prop.city);
    setEditStateCode(prop.state || "TX");
    setEditZip(prop.zip);
    setEditPrice(String(prop.price));
    setEditImageUrl(prop.imageUrl || "");
    setEditPreviewUrl(prop.previewUrl || "");
    setEditNotes(prop.notes || "");
  };

  const handleSaveEditedProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker || !editingProperty || !editAddress || !editCity || !editZip || !editPrice) return;
    saveProperty(
      {
        address: editAddress.trim(),
        city: editCity.trim(),
        state: editStateCode.trim().toUpperCase(),
        zip: editZip.trim(),
        price: Number(editPrice) || 0,
        imageUrl: editImageUrl.trim() || undefined,
        creditCheckUrl: editingProperty.creditCheckUrl || settings.creditCheckUrl || "#",
        previewUrl: editPreviewUrl.trim() || undefined,
        supportPhone: editingProperty.supportPhone || settings.supportPhone,
        supportEmail: editingProperty.supportEmail || settings.supportEmail,
        notes: editNotes.trim(),
        ownerId: worker.id,
        ownerName: worker.name,
        referralCode: worker.referralCode,
      },
      editingProperty.id
    );
    setEditingProperty(null);
    setProperties(getProperties());
  };

  const handleEditImageFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEditImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveEditImage = () => {
    setEditImageUrl("");
    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
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
              setTab("chat");
              setIsCreating(false);
              if (!selectedChatId && myChats.length > 0) {
                setSelectedChatId(myChats[0]!.id);
              }
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              tab === "chat" ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-secondary"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <MessageSquare className="h-4 w-4" /> Live Chat
            </span>
            <div className="flex items-center gap-1.5">
              {unreadChatsCount > 0 && (
                <span className="rounded-full bg-red-600 text-white px-1.5 py-0.5 text-[0.6rem] font-bold">
                  {unreadChatsCount}
                </span>
              )}
              <span className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold bg-secondary text-foreground">{myChats.length}</span>
            </div>
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
            {isCreating ? "Post a New Property" : tab === "chat" ? "Live Lead Chat" : tab === "leads" ? "My Tenant Leads" : "My Property Posts"}
          </h1>
          <p className="text-xs text-muted-foreground">
            Your referral code: <strong className="text-foreground font-mono">{worker.referralCode}</strong> · Only your own posts and leads are shown here.
          </p>
        </header>

        <main className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: "My Properties", value: myProperties.length, icon: Building2, cls: "text-primary" },
              { label: "Live Chats", value: myChats.length, icon: MessageSquare, cls: "text-sky-600" },
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
                <label className="block text-xs font-semibold mb-1 flex items-center justify-between">
                  <span>External Listing Preview Link (Optional)</span>
                  <span className="text-[0.68rem] text-muted-foreground font-normal">Shown as "Preview" on rental post</span>
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://www.zillow.com/homedetails/... or external listing URL"
                  value={previewUrl}
                  onChange={(e) => setPreviewUrl(e.target.value)}
                  className="spa-field"
                />
                <p className="mt-1 text-[0.68rem] text-muted-foreground">
                  When applicants view this property, a "Preview" link will open this external URL.
                </p>
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
                      {p.previewUrl && (
                        <a
                          href={p.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[0.68rem] font-bold text-accent hover:underline bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          <span>Preview Link</span>
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyLink(p.id)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-espresso cursor-pointer"
                      >
                        {copiedId === p.id ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                        {copiedId === p.id ? "Copied!" : "Copy Link"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
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

          {/* LIVE CHAT VIEW */}
          {tab === "chat" && (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col md:flex-row h-[720px]">
              {/* Left Column: Chat Threads List */}
              <div className="w-full md:w-80 border-r border-border flex flex-col shrink-0 bg-secondary/15">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-base font-bold text-foreground">My Lead Chats</h3>
                    <p className="text-[0.68rem] text-muted-foreground font-medium">{myChats.length} active lead conversation(s)</p>
                  </div>
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" title="Live connection active" />
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                  {myChats.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="font-bold">No active chats yet</p>
                      <p className="mt-1 text-[0.7rem] font-medium leading-relaxed">
                        When tenants message from your rental listings or referral link, their conversations appear here in real-time.
                      </p>
                    </div>
                  ) : (
                    myChats.map((thread) => {
                      const isSelected = selectedChatId === thread.id;
                      const hasUnread = thread.unreadAdminCount > 0;
                      const timeStr = new Date(thread.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                      return (
                        <div
                          key={thread.id}
                          onClick={() => setSelectedChatId(thread.id)}
                          className={`p-3.5 cursor-pointer transition flex items-start gap-3 ${
                            isSelected
                              ? "bg-primary/10 border-l-4 border-l-primary"
                              : "hover:bg-secondary/50"
                          }`}
                        >
                          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary font-serif font-bold text-xs text-primary border border-border">
                            {thread.tenantName ? thread.tenantName[0]?.toUpperCase() : "T"}
                            {hasUnread && (
                              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-600 ring-2 ring-card" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className={`text-xs truncate ${hasUnread ? "font-bold text-foreground" : "font-semibold text-foreground/90"}`}>
                                {thread.tenantName}
                              </span>
                              <span className="text-[0.62rem] text-muted-foreground shrink-0">{timeStr}</span>
                            </div>
                            <p className="text-[0.68rem] text-muted-foreground truncate mb-1 font-medium">
                              {thread.propertyAddress}
                            </p>
                            <p className={`text-xs truncate ${hasUnread ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                              {thread.lastMessage || "No messages yet"}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Active Conversation */}
              <div className="flex-1 flex flex-col min-w-0 bg-background">
                {selectedChatId ? (
                  (() => {
                    const activeThread = myChats.find((t) => t.id === selectedChatId);

                    return (
                      <>
                        {/* Conversation Header */}
                        <div className="p-4 border-b border-border bg-card flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-serif text-lg font-bold text-foreground">
                                {activeThread?.tenantName || "Prospective Tenant"}
                              </h3>
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[0.62rem] font-bold">
                                Live Session
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5 font-medium">
                              <span>Property: <strong className="text-foreground">{activeThread?.propertyAddress || "General Inquiry"}</strong></span>
                              {activeThread?.tenantPhone && <span>Phone: <strong className="text-foreground">{activeThread.tenantPhone}</strong></span>}
                              {activeThread?.tenantEmail && <span>Email: <strong className="text-foreground">{activeThread.tenantEmail}</strong></span>}
                            </div>
                          </div>
                        </div>

                        {/* Message Stream */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-secondary/10">
                          {activeChatMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6">
                              <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-2" />
                              <p className="font-bold text-sm text-foreground">Beginning of Conversation</p>
                              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                Reply to this prospective tenant below to start chatting.
                              </p>
                            </div>
                          ) : (
                            activeChatMessages.map((msg) => {
                              const isStaff = msg.sender === "admin";
                              const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                              return (
                                <div
                                  key={msg.id}
                                  className={`flex flex-col ${isStaff ? "items-end" : "items-start"}`}
                                >
                                  <div className="flex items-center gap-1.5 mb-1 px-1">
                                    <span className="text-[0.65rem] font-bold text-muted-foreground">
                                      {isStaff ? (msg.senderName || `${worker.name} (Support)`) : (activeThread?.tenantName || "Tenant")}
                                    </span>
                                    <span className="text-[0.6rem] text-muted-foreground/60">{timeStr}</span>
                                  </div>
                                  <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-2xs ${
                                      isStaff
                                        ? "bg-primary text-primary-foreground rounded-br-xs"
                                        : "bg-card border border-border text-foreground rounded-bl-xs"
                                    }`}
                                  >
                                    {msg.text}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Quick Response Templates */}
                        <div className="px-4 py-2.5 border-t border-border bg-secondary/20 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="text-[0.65rem] font-bold uppercase text-muted-foreground tracking-wider mr-1">Quick Replies:</span>
                          {[
                            "Hello! Thank you for applying. When would you like to schedule an in-person tour?",
                            "Your application is currently being reviewed. We'll update you shortly!",
                            "We received your credit score screenshot. Everything looks great!",
                            "Could you confirm your intended move-in date?",
                          ].map((tmpl) => (
                            <button
                              key={tmpl}
                              type="button"
                              onClick={() => handleSelectQuickReply(tmpl)}
                              className="rounded-full border border-border bg-card px-2.5 py-1 text-[0.68rem] font-medium text-foreground hover:border-primary hover:text-primary transition cursor-pointer truncate max-w-xs"
                              title={tmpl}
                            >
                              {tmpl}
                            </button>
                          ))}
                        </div>

                        {/* Reply Input Bar */}
                        <form
                          onSubmit={handleSendWorkerReply}
                          className="p-3.5 border-t border-border bg-card flex items-center gap-2"
                        >
                          <input
                            type="text"
                            value={workerReplyText}
                            onChange={(e) => setWorkerReplyText(e.target.value)}
                            placeholder="Type reply to your lead..."
                            className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={!workerReplyText.trim()}
                            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-xs hover:bg-espresso transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Send</span>
                          </button>
                        </form>
                      </>
                    );
                  })()
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="font-bold text-base text-foreground">Select a Chat Conversation</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm font-medium">
                      Choose an applicant from the left to start real-time messaging with your leads.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Edit Property Modal */}
      {editingProperty && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setEditingProperty(null)}
        >
          <div
            className="bg-card rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Pencil className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-serif text-lg font-bold text-foreground">Edit Rental Property</h3>
                  <p className="text-xs text-muted-foreground">Update listing details and preview link</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProperty(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedProperty} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Street Address *</label>
                <input
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="spa-field"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1 text-foreground">City *</label>
                  <input
                    required
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="spa-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground">State (2 letters) *</label>
                  <input
                    required
                    maxLength={2}
                    value={editStateCode}
                    onChange={(e) => setEditStateCode(e.target.value.toUpperCase())}
                    className="spa-field uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground">ZIP Code *</label>
                  <input
                    required
                    value={editZip}
                    onChange={(e) => setEditZip(e.target.value)}
                    className="spa-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Monthly Rent ($ USD) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="spa-field"
                />
              </div>

              {/* Photo Upload & URL */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Property Photo (Optional)</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or paste image URL"
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    className="spa-field flex-1 text-xs"
                  />
                  <input
                    type="file"
                    ref={editFileInputRef}
                    accept="image/*"
                    onChange={(e) => handleEditImageFile(e.target.files?.[0])}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary/80 transition cursor-pointer shrink-0"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload</span>
                  </button>
                  {editImageUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveEditImage}
                      className="inline-flex items-center justify-center rounded-lg border border-border bg-secondary px-2.5 py-2 text-xs text-muted-foreground hover:text-destructive transition cursor-pointer shrink-0"
                      title="Remove photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* External Preview Link */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground flex items-center justify-between">
                  <span>External Listing Preview Link (Optional)</span>
                  <span className="text-[0.68rem] text-muted-foreground font-normal">Shown as "Preview" on rental post</span>
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://www.zillow.com/homedetails/... or external listing URL"
                  value={editPreviewUrl}
                  onChange={(e) => setEditPreviewUrl(e.target.value)}
                  className="spa-field"
                />
                <p className="mt-1 text-[0.68rem] text-muted-foreground">
                  When applicants view this property, a "Preview" link will open this external URL.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Property Description / Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Quiet neighborhood, updated kitchen, pet-friendly..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="spa-field"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setEditingProperty(null)}
                  className="rounded-full border border-border px-5 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-primary px-6 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:bg-espresso cursor-pointer shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

