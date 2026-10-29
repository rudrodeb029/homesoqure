import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Building2,
  PlusCircle,
  Copy,
  ExternalLink,
  Trash2,
  Users,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Home,
  Image as ImageIcon,
  Upload,
  X,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Key,
  ShieldCheck,
  MessageSquare,
  Send,
  Mail,
  Sparkles,
} from "lucide-react";
import {
  getProperties,
  saveProperty,
  deleteProperty,
  getSubmissions,
  deleteSubmission,
  subscribeToCloudSubmissions,
  subscribeToCloudProperties,
  type Property,
  type Submission,
} from "@/lib/property-store";
import {
  subscribeToAllChatThreads,
  subscribeToChatMessages,
  sendChatMessage,
  markChatReadByAdmin,
  type ChatThread,
  type ChatMessage,
} from "@/lib/chat-store";
import {
  analyzeTenantApplication,
  generateApplicationEmail,
  dispatchApplicationEmail,
  type TenantAnalysisReport,
} from "@/lib/deep-analysis";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Landlord Admin Panel · Homqero Rentals" },
      { name: "description", content: "Manage rental property listings, upload property photos, generate unique prescreening links, and view tenant applications." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Tab state: "properties" | "submissions" | "chat" | "security"
  const [activeTab, setActiveTab] = useState<"properties" | "submissions" | "chat" | "security">("properties");
  const [submissionFilter, setSubmissionFilter] = useState<"all" | "completed" | "pending_credit" | "incomplete">("all");
  const [selectedScreenshotModal, setSelectedScreenshotModal] = useState<{
    url: string;
    name: string;
    applicantName: string;
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live Chat state
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [activeChatMessages, setActiveChatMessages] = useState<ChatMessage[]>([]);
  const [adminReplyText, setAdminReplyText] = useState("");

  // Deep Analysis & Email Report modal state
  const [selectedAnalysisSubmission, setSelectedAnalysisSubmission] = useState<Submission | null>(null);
  const [copyEmailSuccess, setCopyEmailSuccess] = useState(false);
  const [emailSendStatus, setEmailSendStatus] = useState("");

  // Password change state
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState("");
  const [changePasswordMsg, setChangePasswordMsg] = useState("");

  const [properties, setProperties] = useState<Property[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  // New property form state
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("TX");
  const [zip, setZip] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [creditCheckUrl, setCreditCheckUrl] = useState("");
  const [supportPhone, setSupportPhone] = useState("+1 (646) 431-3060");
  const [notes, setNotes] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getStoredPassword = () => {
    if (typeof window === "undefined") return "admin123";
    return localStorage.getItem("homqero_admin_password") || "admin123";
  };

  const refreshData = () => {
    setProperties(getProperties());
    setSubmissions(getSubmissions());
  };

  // Real-time synchronization: periodically reload data & on window focus so partial leads appear live
  useEffect(() => {
    if (typeof window !== "undefined") {
      const session = sessionStorage.getItem("homqero_admin_session");
      if (session === "authenticated") {
        setIsAuthenticated(true);
      }
    }
    refreshData();

    const interval = setInterval(refreshData, 2500);
    window.addEventListener("focus", refreshData);

    const unsubSubs = subscribeToCloudSubmissions((subs) => {
      setSubmissions(subs);
    });
    const unsubProps = subscribeToCloudProperties((props) => {
      setProperties(props);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedScreenshotModal(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshData);
      window.removeEventListener("keydown", handleKeyDown);
      unsubSubs();
      unsubProps();
    };
  }, []);

  // Real-time Chat Threads Listener
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubChats = subscribeToAllChatThreads((threads) => {
      setChatThreads(threads);
      setSelectedChatId((current) => current || (threads[0]?.id ?? null));
    });
    return () => unsubChats();
  }, [isAuthenticated]);

  // Real-time Active Chat Messages Listener
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

  const handleSendAdminReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminReplyText.trim() || !selectedChatId) return;
    const text = adminReplyText.trim();
    setAdminReplyText("");
    await sendChatMessage(selectedChatId, "admin", text);
  };

  const handleSelectQuickReply = (text: string) => {
    setAdminReplyText(text);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correct = getStoredPassword();
    if (passwordInput === correct) {
      setIsAuthenticated(true);
      setPasswordError("");
      setPasswordInput("");
      if (typeof window !== "undefined") {
        sessionStorage.setItem("homqero_admin_session", "authenticated");
      }
    } else {
      setPasswordError("Incorrect access password. Please try again.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("homqero_admin_session");
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const correct = getStoredPassword();
    if (currentPasswordInput !== correct) {
      setChangePasswordMsg("Current password does not match.");
      return;
    }
    if (!newPasswordInput || newPasswordInput.length < 4) {
      setChangePasswordMsg("New password must be at least 4 characters.");
      return;
    }
    if (newPasswordInput !== confirmNewPasswordInput) {
      setChangePasswordMsg("New passwords do not match.");
      return;
    }
    localStorage.setItem("homqero_admin_password", newPasswordInput);
    setChangePasswordMsg("Password updated successfully!");
    setTimeout(() => {
      setCurrentPasswordInput("");
      setNewPasswordInput("");
      setConfirmNewPasswordInput("");
      setChangePasswordMsg("");
    }, 2000);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageUrl("");
    setImageFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !city || !zip || !price) return;

    saveProperty({
      address: address.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      zip: zip.trim(),
      price: Number(price) || 0,
      imageUrl: imageUrl.trim() || undefined,
      creditCheckUrl: creditCheckUrl.trim() || "#",
      supportPhone: supportPhone.trim() || "+1 (646) 431-3060",
      notes: notes.trim(),
    });

    // Reset form
    setAddress("");
    setCity("");
    setZip("");
    setPrice("");
    setImageUrl("");
    setImageFileName("");
    setCreditCheckUrl("");
    setNotes("");
    setIsCreating(false);
    refreshData();
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this property listing?")) {
      deleteProperty(id);
      refreshData();
    }
  };

  const handleDeleteSubmission = (id: string) => {
    if (confirm("Are you sure you want to remove this tenant lead?")) {
      deleteSubmission(id);
      refreshData();
    }
  };

  const getFullShareLink = (propertyId: string) => {
    if (typeof window === "undefined") return `/?p=${propertyId}`;
    return `${window.location.origin}/?p=${propertyId}`;
  };

  const copyToClipboard = (propertyId: string) => {
    const link = getFullShareLink(propertyId);
    navigator.clipboard.writeText(link);
    setCopiedId(propertyId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const completedCount = submissions.filter((s) => s.status === "completed").length;
  const pendingCount = submissions.filter((s) => s.status === "pending_credit").length;
  const incompleteCount = submissions.filter((s) => s.status === "incomplete").length;
  const unreadChatsCount = chatThreads.reduce((sum, t) => sum + (t.unreadAdminCount > 0 ? 1 : 0), 0);

  const filteredSubmissions = submissions.filter((s) => {
    if (submissionFilter === "all") return true;
    return s.status === submissionFilter;
  });

  // -------------------------------------------------------------
  // PASSWORD LOGIN VIEW
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
        {/* Top minimal bar */}
        <div className="bg-espresso py-2.5 px-6 text-xs text-primary-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-accent" />
            <span>Landlord Protected Area</span>
          </div>
          <Link to="/" className="text-accent hover:underline flex items-center gap-1 font-semibold">
            <span>Return to Website</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Centered Login Card */}
        <div className="mx-auto w-full max-w-md px-6 py-12">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-xl text-center">
            {/* Circular Emblem */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border font-script text-3xl text-primary bg-secondary/60 shadow-sm ring-8 ring-primary/5">
              H
            </div>

            <h1 className="font-serif text-3xl font-bold text-foreground">Admin Portal Access</h1>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Please enter your landlord access password to manage property posts, photos, and tenant credit submissions.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground flex items-center justify-between">
                  <span>Access Password</span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[0.7rem] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span>{showPassword ? "Hide" : "Show"}</span>
                  </button>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoFocus
                    placeholder="Enter password..."
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError("");
                    }}
                    className="spa-field pl-9"
                  />
                </div>
                {passwordError && (
                  <p className="mt-1.5 text-xs text-destructive font-medium">{passwordError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground shadow-sm hover:bg-espresso transition cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Unlock Admin Panel</span>
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="py-6 text-center text-xs text-muted-foreground">
          © 2026 Homqero Rentals USA · Secure Landlord Portal
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VERTICAL SIDEBAR ADMIN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* ----------------------------------------------------------- */}
      {/* LEFT VERTICAL SIDEBAR NAVIGATION */}
      {/* ----------------------------------------------------------- */}
      <aside className="w-full md:w-64 lg:w-72 border-r border-border bg-card flex flex-col shrink-0 md:min-h-screen">
        {/* Sidebar Brand Header */}
        <div className="p-5 border-b border-border flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border font-serif font-bold text-2xl text-primary bg-secondary/60 shadow-xs">
            H
          </span>
          <div>
            <span className="block font-serif text-lg font-bold leading-tight text-foreground">Homqero</span>
            <span className="eyebrow text-[0.55rem] text-muted-foreground font-bold">Landlord Admin</span>
          </div>
        </div>

        {/* Navigation Items (Vertical Way) */}
        <nav className="p-3.5 space-y-1.5 flex-1">
          {/* 1. All Rental Properties */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("properties");
              setIsCreating(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "properties" && !isCreating
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-foreground/80 hover:bg-secondary hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4" />
              <span>Rental Properties</span>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${
              activeTab === "properties" && !isCreating ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-foreground"
            }`}>
              {properties.length}
            </span>
          </button>

          {/* 2. Tenant Applications */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("submissions");
              setSubmissionFilter("all");
              setIsCreating(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "submissions"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-foreground/80 hover:bg-secondary hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4" />
              <span>Tenant Applications</span>
            </div>
            <div className="flex items-center gap-1.5">
              {incompleteCount > 0 && (
                <span
                  className="rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 text-[0.6rem] font-bold"
                  title={`${incompleteCount} incomplete leads`}
                >
                  {incompleteCount} inc
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${
                activeTab === "submissions" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-foreground"
              }`}>
                {submissions.length}
              </span>
            </div>
          </button>

          {/* 3. Live Tenant Chat */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("chat");
              setIsCreating(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "chat"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-foreground/80 hover:bg-secondary hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="h-4 w-4" />
              <span>Live Chat</span>
            </div>
            {unreadChatsCount > 0 ? (
              <span className="rounded-full bg-red-600 text-white px-2 py-0.5 text-[0.65rem] font-bold animate-pulse">
                {unreadChatsCount} new
              </span>
            ) : (
              <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${
                activeTab === "chat" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-foreground"
              }`}>
                {chatThreads.length}
              </span>
            )}
          </button>

          {/* 4. Post New Property */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("properties");
              setIsCreating(true);
            }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              isCreating
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-foreground/80 hover:bg-secondary hover:text-foreground"
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            <span>Post New Property</span>
          </button>

          {/* 5. Password & Security */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("security");
              setIsCreating(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "security"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-foreground/80 hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Key className="h-4 w-4" />
            <span>Password &amp; Security</span>
          </button>

          <div className="pt-3 border-t border-border/60 my-2" />

          {/* 6. Live Website Link */}
          <Link
            to="/"
            target="_blank"
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold text-foreground/80 hover:bg-secondary hover:text-foreground transition"
          >
            <div className="flex items-center gap-2.5">
              <ExternalLink className="h-4 w-4 text-accent" />
              <span>View Live Website</span>
            </div>
            <span className="text-[0.65rem] text-muted-foreground">↗</span>
          </Link>
        </nav>

        {/* Sidebar Footer: User Status & Lock */}
        <div className="p-4 border-t border-border bg-secondary/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-foreground">Landlord Active</span>
            </div>
            <button
              onClick={handleLogout}
              title="Lock / Logout"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded transition cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Lock</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ----------------------------------------------------------- */}
      {/* RIGHT MAIN CONTENT AREA */}
      {/* ----------------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="border-b border-border bg-card px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-bold leading-tight">
              {activeTab === "security"
                ? "Password & Security Settings"
                : activeTab === "chat"
                ? "Live Landlord Chat Support"
                : activeTab === "submissions"
                ? "Tenant Prescreening Submissions"
                : isCreating
                ? "Create New Property Post"
                : "Rental Property Postings"}
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              {activeTab === "security"
                ? "Manage your admin portal access password."
                : activeTab === "chat"
                ? "Chat directly in real-time with prospective tenants visiting your rental listings."
                : activeTab === "submissions"
                ? "Review submitted applicant income, move-in details, deep analysis, and credit score screenshots."
                : "Manage property listings, photos, and shareable tenant prescreening links."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isCreating && (
              <button
                onClick={() => {
                  setActiveTab("properties");
                  setIsCreating(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-xs hover:bg-espresso transition cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>New Property Post</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Content Workspace */}
        <main className="p-6 max-w-6xl w-full">
          {/* Quick Metrics Bar */}
          {activeTab !== "security" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div
                onClick={() => {
                  setActiveTab("properties");
                  setIsCreating(false);
                }}
                className={`cursor-pointer rounded-xl border p-4 transition shadow-xs ${
                  activeTab === "properties" && !isCreating ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="eyebrow text-[0.6rem]">Rental Properties</p>
                    <p className="mt-1 font-serif text-2xl font-bold text-foreground">{properties.length}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div
                onClick={() => {
                  setActiveTab("submissions");
                  setSubmissionFilter("incomplete");
                  setIsCreating(false);
                }}
                className={`cursor-pointer rounded-xl border p-4 transition shadow-xs ${
                  activeTab === "submissions" && submissionFilter === "incomplete" ? "border-orange-500 bg-orange-500/10 ring-1 ring-orange-500/30" : "border-border bg-card hover:border-orange-500/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="eyebrow text-[0.6rem] text-orange-600 dark:text-orange-400 font-semibold">Incomplete Leads</p>
                    <p className="mt-1 font-serif text-2xl font-bold text-orange-600 dark:text-orange-400">{incompleteCount}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/15 text-orange-600">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div
                onClick={() => {
                  setActiveTab("submissions");
                  setSubmissionFilter("pending_credit");
                  setIsCreating(false);
                }}
                className={`cursor-pointer rounded-xl border p-4 transition shadow-xs ${
                  activeTab === "submissions" && submissionFilter === "pending_credit" ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30" : "border-border bg-card hover:border-amber-500/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="eyebrow text-[0.6rem] text-amber-600 dark:text-amber-400 font-semibold">Pending Credit</p>
                    <p className="mt-1 font-serif text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div
                onClick={() => {
                  setActiveTab("submissions");
                  setSubmissionFilter("completed");
                  setIsCreating(false);
                }}
                className={`cursor-pointer rounded-xl border p-4 transition shadow-xs ${
                  activeTab === "submissions" && submissionFilter === "completed" ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30" : "border-border bg-card hover:border-emerald-500/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="eyebrow text-[0.6rem] text-emerald-600 dark:text-emerald-400 font-semibold">Completed Apps</p>
                    <p className="mt-1 font-serif text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedCount}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* VIEW 1: CREATE PROPERTY FORM */}
          {/* ------------------------------------------------------- */}
          {isCreating && (
            <div className="mb-8 rounded-xl border border-primary/40 bg-card p-6 shadow-md animate-in fade-in">
              <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
                <div>
                  <h2 className="font-serif text-xl font-bold">Post a New Rental Property</h2>
                  <p className="text-xs text-muted-foreground">Add details &amp; upload a photo to generate its unique tenant application link.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateProperty} className="space-y-5">
                {/* Photo Upload Box */}
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                  <label className="block text-xs font-semibold mb-2 text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Property Photo (Upload or Paste Link)
                    </span>
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-[0.7rem] text-destructive hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <X className="h-3 w-3" /> Remove Photo
                      </button>
                    )}
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                    <div className="flex items-center justify-center h-28 w-full sm:w-36 rounded-md border border-dashed border-input bg-card overflow-hidden relative">
                      {imageUrl ? (
                        <img src={imageUrl} alt="Property preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="text-center p-2 text-muted-foreground">
                          <ImageIcon className="h-6 w-6 mx-auto mb-1 text-muted-foreground/60" />
                          <span className="text-[0.65rem] block">No Photo</span>
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-2 space-y-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary transition shadow-2xs cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5 text-primary" />
                        <span>{imageFileName ? `Change (${imageFileName})` : "Choose Photo from Computer (PNG, JPG, WEBP)"}</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={handleImageFileChange}
                      />

                      <p className="text-[0.68rem] text-muted-foreground">Or paste image URL:</p>
                      <input
                        placeholder="https://images.example.com/property-front.jpg"
                        value={imageUrl.startsWith("data:") ? "" : imageUrl}
                        onChange={(e) => {
                          setImageUrl(e.target.value);
                          setImageFileName("");
                        }}
                        className="spa-field text-xs py-1.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Street Address & City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-foreground">Street Address *</label>
                    <input
                      required
                      placeholder="e.g. 742 Evergreen Terrace"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="spa-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-foreground">City *</label>
                    <input
                      required
                      placeholder="e.g. Springfield"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="spa-field"
                    />
                  </div>
                </div>

                {/* State, Zip, Price */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-foreground">State (2 Letters) *</label>
                    <input
                      required
                      maxLength={2}
                      placeholder="e.g. TX"
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      className="spa-field uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-foreground">ZIP Code *</label>
                    <input
                      required
                      placeholder="e.g. 76933"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      className="spa-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-foreground">Monthly Rent ($ USD) *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="e.g. 850"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="spa-field"
                    />
                  </div>
                </div>

                {/* Custom Links & Contacts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-foreground">
                      Custom Credit Check Link <span className="font-normal text-muted-foreground">(Optional affiliate link)</span>
                    </label>
                    <input
                      placeholder="https://creditcheck.example.com/ref"
                      value={creditCheckUrl}
                      onChange={(e) => setCreditCheckUrl(e.target.value)}
                      className="spa-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-foreground">Support Contact Phone</label>
                    <input
                      placeholder="+1 (646) 431-3060"
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      className="spa-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground">Property Description / Notes <span className="font-normal text-muted-foreground">(Optional)</span></label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Quiet neighborhood, updated kitchen, pet-friendly..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="spa-field"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="rounded-full border border-border px-5 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-primary px-6 py-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:bg-espresso cursor-pointer"
                  >
                    Save &amp; Generate Link
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* VIEW 2: ALL PROPERTIES LIST (Default) */}
          {/* ------------------------------------------------------- */}
          {activeTab === "properties" && !isCreating && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold">Your Rental Properties ({properties.length})</h2>
                <span className="text-xs text-muted-foreground">Each property below has its own distinct link</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {properties.map((prop) => {
                  const link = getFullShareLink(prop.id);
                  const isCopied = copiedId === prop.id;

                  return (
                    <div key={prop.id} className="rounded-xl border border-border bg-card p-5 shadow-xs hover:border-primary/40 transition">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* Property Basic Info & Thumbnail Photo */}
                        <div className="flex items-start gap-4">
                          {prop.imageUrl ? (
                            <img
                              src={prop.imageUrl}
                              alt={prop.address}
                              className="h-16 w-24 shrink-0 rounded-lg object-cover border border-border shadow-xs"
                            />
                          ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                              <Home className="h-7 w-7" />
                            </div>
                          )}
                          <div>
                            <span className="eyebrow text-[0.58rem] text-primary">ID: {prop.id}</span>
                            <h3 className="font-serif text-xl font-bold text-foreground">{prop.address}</h3>
                            <p className="text-xs text-muted-foreground">{prop.city}, {prop.state} {prop.zip}</p>
                            <p className="mt-1 font-semibold text-primary">
                              ${prop.price} <span className="font-normal text-xs text-muted-foreground">/ month</span>
                            </p>
                          </div>
                        </div>

                        {/* Shareable Link Box & Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:max-w-md w-full">
                          <div className="relative flex-1">
                            <input
                              readOnly
                              value={link}
                              className="w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-xs font-mono text-foreground outline-none select-all"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => copyToClipboard(prop.id)}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition shrink-0 cursor-pointer ${
                              isCopied
                                ? "bg-emerald-600 text-white"
                                : "bg-primary text-primary-foreground hover:bg-espresso"
                            }`}
                          >
                            {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{isCopied ? "Copied!" : "Copy Link"}</span>
                          </button>

                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/80 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition shrink-0"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Test</span>
                          </a>

                          {properties.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDelete(prop.id)}
                              aria-label="Delete property"
                              className="inline-flex items-center justify-center rounded-lg border border-destructive/20 text-destructive p-2 hover:bg-destructive/10 transition shrink-0 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* VIEW 3: TENANT SUBMISSIONS */}
          {/* ------------------------------------------------------- */}
          {activeTab === "submissions" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h2 className="font-serif text-xl font-bold">Tenant Prescreening Submissions</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real-time applicants, uploaded credit screenshots, and partial/incomplete leads captured as tenants type.
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 bg-secondary/60 p-1 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setSubmissionFilter("all")}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                      submissionFilter === "all"
                        ? "bg-card text-foreground shadow-2xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({submissions.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubmissionFilter("incomplete")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                      submissionFilter === "incomplete"
                        ? "bg-orange-500/15 text-orange-700 dark:text-orange-300 shadow-2xs font-bold"
                        : "text-muted-foreground hover:text-orange-600"
                    }`}
                  >
                    <AlertCircle className="h-3 w-3 text-orange-500" />
                    <span>Incomplete ({incompleteCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubmissionFilter("pending_credit")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                      submissionFilter === "pending_credit"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-2xs font-bold"
                        : "text-muted-foreground hover:text-amber-600"
                    }`}
                  >
                    <Clock className="h-3 w-3 text-amber-500" />
                    <span>Pending ({pendingCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubmissionFilter("completed")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                      submissionFilter === "completed"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold"
                        : "text-muted-foreground hover:text-emerald-600"
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span>Completed ({completedCount})</span>
                  </button>
                </div>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="font-semibold text-foreground">
                    {submissionFilter === "all"
                      ? "No tenant applications received yet."
                      : `No submissions found with status "${submissionFilter}".`}
                  </p>
                  <p className="text-xs mt-1">
                    {submissionFilter === "incomplete"
                      ? "When a tenant starts typing their details on the rental page, their info will instantly appear here."
                      : "Copy a property link from the Rental Properties tab and test a submission to see it appear here."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSubmissions.map((sub) => {
                    const hasFullName = Boolean(sub.firstName || sub.lastName);
                    const displayName = hasFullName
                      ? `${sub.firstName} ${sub.lastName}`.trim()
                      : sub.email || sub.phone || "Incomplete Visitor Lead";

                    const isDraft = sub.status === "incomplete";
                    const isPending = sub.status === "pending_credit";
                    const isCompleted = sub.status === "completed";

                    return (
                      <div
                        key={sub.id}
                        className={`rounded-xl border bg-card p-5 shadow-xs transition hover:shadow-sm ${
                          isDraft
                            ? "border-orange-500/40 bg-gradient-to-r from-orange-500/5 via-card to-card"
                            : isPending
                            ? "border-amber-500/40"
                            : "border-border"
                        }`}
                      >
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between border-b border-border pb-3 mb-3 gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="eyebrow text-[0.6rem] text-muted-foreground font-mono">{sub.id}</span>

                              {/* Status Badge */}
                              {isDraft && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 text-orange-800 dark:text-orange-300 border border-orange-500/30 px-2.5 py-0.5 text-[0.68rem] font-semibold">
                                  <AlertCircle className="h-3 w-3 text-orange-600 shrink-0" />
                                  <span>Incomplete / Partial Lead</span>
                                </span>
                              )}
                              {isPending && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2.5 py-0.5 text-[0.68rem] font-semibold">
                                  <Clock className="h-3 w-3 text-amber-600 shrink-0" />
                                  <span>Step 1 Finished · Pending Credit Screenshot</span>
                                </span>
                              )}
                              {isCompleted && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 text-[0.68rem] font-semibold">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                                  <span>100% Completed Application</span>
                                </span>
                              )}
                            </div>

                            <h3 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
                              <span>{displayName}</span>
                              {!hasFullName && (
                                <span className="text-xs font-normal text-orange-600 dark:text-orange-400">
                                  (No name entered yet)
                                </span>
                              )}
                            </h3>

                            <p className="text-xs text-muted-foreground mt-0.5">
                              Applying for: <strong className="text-foreground">{sub.propertyAddress}</strong>
                            </p>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                            <div className="text-[0.7rem] text-muted-foreground text-left sm:text-right">
                              <div>Started: {new Date(sub.submittedAt).toLocaleDateString()} {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              {sub.lastUpdated && sub.lastUpdated !== sub.submittedAt && (
                                <div className="text-primary font-medium">
                                  Active: {new Date(sub.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteSubmission(sub.id)}
                              title="Delete this submission"
                              className="inline-flex items-center gap-1 text-[0.7rem] text-destructive hover:bg-destructive/10 px-2 py-1 rounded transition cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>

                        {/* Metrics Data Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs mb-3">
                          <div className="rounded-lg bg-secondary/50 p-2.5 border border-border/40">
                            <span className="text-muted-foreground block text-[0.68rem]">Monthly Income</span>
                            <span className="font-semibold text-foreground text-sm">
                              {sub.income ? `$${sub.income}` : <span className="text-muted-foreground/60 italic font-normal text-xs">Not entered</span>}
                            </span>
                          </div>

                          <div className="rounded-lg bg-secondary/50 p-2.5 border border-border/40">
                            <span className="text-muted-foreground block text-[0.68rem]">Credit Score Range</span>
                            <span className="font-semibold text-foreground text-sm">
                              {sub.creditRange || <span className="text-muted-foreground/60 italic font-normal text-xs">Not selected</span>}
                            </span>
                          </div>

                          <div className="rounded-lg bg-secondary/50 p-2.5 border border-border/40">
                            <span className="text-muted-foreground block text-[0.68rem]">Move-in Date</span>
                            <span className="font-semibold text-foreground">
                              {sub.moveInDate || <span className="text-muted-foreground/60 italic font-normal text-xs">Not specified</span>}
                            </span>
                          </div>

                          <div className="rounded-lg bg-secondary/50 p-2.5 border border-border/40">
                            <span className="text-muted-foreground block text-[0.68rem]">Occupants &amp; Pets</span>
                            <span className="font-semibold text-foreground">
                              {sub.people || 1} Person(s) · {sub.hasPets ? (sub.petDetails ? `Pets (${sub.petDetails})` : "Has Pets") : "No Pets"}
                            </span>
                          </div>
                        </div>

                        {/* Contact Details & Extra Info */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                            <span>
                              Email:{" "}
                              {sub.email ? (
                                <strong className="text-foreground">{sub.email}</strong>
                              ) : (
                                <span className="italic text-muted-foreground/60">Not provided</span>
                              )}
                            </span>

                            <span>
                              Phone:{" "}
                              {sub.phone ? (
                                <strong className="text-foreground">{sub.phone}</strong>
                              ) : (
                                <span className="italic text-muted-foreground/60">Not provided</span>
                              )}
                            </span>

                            {sub.smoking && (
                              <span>
                                Smoking: <strong className="text-foreground">{sub.smoking}</strong>
                              </span>
                            )}

                            {sub.wantsShowing && (
                              <span>
                                Showing:{" "}
                                <strong className="text-foreground">
                                  {sub.showingTypes && sub.showingTypes.length > 0
                                    ? sub.showingTypes.join(", ")
                                    : "Yes"}
                                </strong>
                              </span>
                            )}

                            {sub.source && (
                              <span>
                                Source: <strong className="text-foreground">{sub.source}</strong>
                              </span>
                            )}
                          </div>

                          {sub.screenshotName ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 px-3 py-1 text-[0.7rem] font-medium">
                              <Check className="h-3 w-3" />
                              <span>Credit Screenshot Attached</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/70 text-[0.7rem] italic">
                              {isDraft ? "Tenant currently typing..." : "No credit screenshot uploaded yet"}
                            </span>
                          )}
                        </div>

                        {/* Submitted Credit Score Screenshot Box */}
                        {(sub.screenshotUrl || sub.screenshotName) && (
                          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                  <CheckCircle2 className="h-4 w-4" />
                                </span>
                                <div>
                                  <span className="text-xs font-bold text-foreground block">
                                    Submitted Credit Score Screenshot
                                  </span>
                                  <span className="text-[0.68rem] text-muted-foreground font-mono">
                                    {sub.screenshotName || "credit-score-verification.jpg"}
                                  </span>
                                </div>
                              </div>

                              {sub.screenshotUrl && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedScreenshotModal({
                                        url: sub.screenshotUrl!,
                                        name: sub.screenshotName || "credit-score-screenshot.jpg",
                                        applicantName: displayName,
                                      })
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-espresso transition cursor-pointer shadow-xs"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>View Full Screenshot</span>
                                  </button>

                                  <a
                                    href={sub.screenshotUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={sub.screenshotName || "credit-score-screenshot.jpg"}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition"
                                    title="Open or download original image"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                </div>
                              )}
                            </div>

                            {sub.screenshotUrl ? (
                              <div
                                onClick={() =>
                                  setSelectedScreenshotModal({
                                    url: sub.screenshotUrl!,
                                    name: sub.screenshotName || "credit-score-screenshot.jpg",
                                    applicantName: displayName,
                                  })
                                }
                                className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-black/5 hover:border-primary transition max-w-sm"
                              >
                                <img
                                  src={sub.screenshotUrl}
                                  alt={`Credit score screenshot for ${displayName}`}
                                  className="max-h-52 w-full object-cover transition duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <span className="rounded-full bg-black/80 px-3.5 py-1.5 text-xs font-semibold text-white flex items-center gap-1.5 shadow-md">
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>Click to Enlarge</span>
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-md border border-dashed border-border bg-card p-3 text-xs text-muted-foreground">
                                <span>File attachment name: <strong>{sub.screenshotName}</strong></span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Questions for Landlord */}
                        {sub.questions && (
                          <div className="mt-3 rounded-md bg-secondary/30 p-2.5 text-xs border border-border/40">
                            <span className="text-[0.68rem] font-semibold text-muted-foreground block mb-0.5">Tenant's Question:</span>
                            <p className="text-foreground italic">{sub.questions}</p>
                          </div>
                        )}

                        {/* Deep Analysis & Email Report Action Bar */}
                        <div className="mt-4 pt-3.5 border-t border-border flex flex-wrap items-center justify-between gap-2.5">
                          <button
                            type="button"
                            onClick={() => setSelectedAnalysisSubmission(sub)}
                            className="inline-flex items-center gap-2 rounded-lg bg-espresso px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-espresso/90 shadow-xs transition cursor-pointer"
                          >
                            <Sparkles className="h-4 w-4 text-accent" />
                            <span>Deep Analysis &amp; Email Report</span>
                          </button>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                            <Mail className="h-3.5 w-3.5 text-primary" />
                            <span>Contact: <strong className="text-foreground">{sub.email || sub.phone || "No direct contact"}</strong></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* VIEW: LIVE TENANT CHAT DASHBOARD */}
          {/* ------------------------------------------------------- */}
          {activeTab === "chat" && (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col md:flex-row h-[720px]">
              {/* Left Column: Chat Threads List */}
              <div className="w-full md:w-80 border-r border-border flex flex-col shrink-0 bg-secondary/15">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-base font-bold text-foreground">Conversations</h3>
                    <p className="text-[0.68rem] text-muted-foreground font-medium">{chatThreads.length} active visitor chat(s)</p>
                  </div>
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" title="Live Firestore connection active" />
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                  {chatThreads.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="font-bold">No active chats yet</p>
                      <p className="mt-1 text-[0.7rem] font-medium leading-relaxed">
                        When prospective tenants message from your rental listings, their conversations appear here in real-time.
                      </p>
                    </div>
                  ) : (
                    chatThreads.map((thread) => {
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

              {/* Right Column: Active Conversation Thread */}
              <div className="flex-1 flex flex-col min-w-0 bg-background">
                {selectedChatId ? (
                  (() => {
                    const activeThread = chatThreads.find((t) => t.id === selectedChatId);

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
                                Respond to the tenant below or pick a quick response template to start chatting.
                              </p>
                            </div>
                          ) : (
                            activeChatMessages.map((msg) => {
                              const isAdmin = msg.sender === "admin";
                              const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                              return (
                                <div
                                  key={msg.id}
                                  className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                                >
                                  <div className="flex items-center gap-1.5 mb-1 px-1">
                                    <span className="text-[0.65rem] font-bold text-muted-foreground">
                                      {isAdmin ? "You (Landlord Support)" : (activeThread?.tenantName || "Tenant")}
                                    </span>
                                    <span className="text-[0.6rem] text-muted-foreground/60">{timeStr}</span>
                                  </div>
                                  <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-2xs ${
                                      isAdmin
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
                            "Your application is currently being reviewed by our team. We'll update you shortly!",
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
                          onSubmit={handleSendAdminReply}
                          className="p-3.5 border-t border-border bg-card flex items-center gap-2"
                        >
                          <input
                            type="text"
                            value={adminReplyText}
                            onChange={(e) => setAdminReplyText(e.target.value)}
                            placeholder="Type reply to tenant..."
                            className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={!adminReplyText.trim()}
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
                      Choose an applicant from the left to start real-time two-way messaging.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* VIEW 4: PASSWORD & SECURITY SETTINGS */}
          {/* ------------------------------------------------------- */}
          {activeTab === "security" && (
            <div className="max-w-xl rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
                <Key className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-xl font-bold">Update Landlord Access Password</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                Choose a strong password. This password locks and protects your Admin Panel from unauthorized access.
              </p>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Current Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter current password..."
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    className="spa-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">New Password (Min 4 characters) *</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new password..."
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="spa-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Confirm New Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Re-type new password..."
                    value={confirmNewPasswordInput}
                    onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                    className="spa-field"
                  />
                </div>

                {changePasswordMsg && (
                  <p className={`text-xs ${changePasswordMsg.includes("successfully") ? "text-emerald-600 font-semibold" : "text-destructive"}`}>
                    {changePasswordMsg}
                  </p>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    className="rounded-full bg-primary px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:bg-espresso cursor-pointer"
                  >
                    Save New Password
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FULLSCREEN LIGHTBOX SCREENSHOT PREVIEW MODAL */}
      {/* ------------------------------------------------------------- */}
      {selectedScreenshotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedScreenshotModal(null)}
        >
          <div
            className="relative max-h-[95vh] max-w-4xl w-full rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Credit Score Screenshot · {selectedScreenshotModal.applicantName}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">{selectedScreenshotModal.name}</p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={selectedScreenshotModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={selectedScreenshotModal.name}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/80 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open in New Tab</span>
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedScreenshotModal(null)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Image Display */}
            <div className="overflow-auto flex-1 max-h-[75vh] flex items-center justify-center rounded-lg bg-black/5 p-2">
              <img
                src={selectedScreenshotModal.url}
                alt={selectedScreenshotModal.name}
                className="max-h-full max-w-full object-contain rounded shadow-md"
              />
            </div>

            <div className="pt-3 border-t border-border mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Press <kbd className="rounded border px-1.5 py-0.5 font-mono text-[0.65rem] bg-secondary">ESC</kbd> or click outside to close</span>
              <button
                type="button"
                onClick={() => setSelectedScreenshotModal(null)}
                className="font-semibold text-primary hover:underline cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DEEP TENANT ANALYSIS & FORMATTED EMAIL REPORT MODAL */}
      {/* ------------------------------------------------------------- */}
      {selectedAnalysisSubmission && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedAnalysisSubmission(null)}
        >
          <div
            className="relative max-h-[92vh] max-w-3xl w-full rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-espresso text-accent shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-foreground">
                    Deep Tenant Analysis &amp; Email Report
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    {selectedAnalysisSubmission.firstName} {selectedAnalysisSubmission.lastName} · {selectedAnalysisSubmission.propertyAddress}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAnalysisSubmission(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-5 text-xs">
              {(() => {
                const targetProp = properties.find((p) => p.id === selectedAnalysisSubmission.propertyId) || properties[0] || {
                  id: "prop",
                  address: selectedAnalysisSubmission.propertyAddress || "406 SE Railroad St",
                  city: "Manning",
                  state: "SC",
                  zip: "29102",
                  price: 1500,
                  creditCheckUrl: "#",
                  supportPhone: "+1 (646) 431-3060",
                  createdAt: new Date().toISOString(),
                };
                const report = analyzeTenantApplication(selectedAnalysisSubmission, targetProp);
                const emailData = generateApplicationEmail(selectedAnalysisSubmission, targetProp);

                return (
                  <>
                    {/* Score & Verdict Banner */}
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <span className="eyebrow text-[0.62rem] font-bold text-primary">Algorithmic Tenant Assessment</span>
                        <h4 className="font-serif text-2xl font-bold text-foreground mt-0.5">
                          {report.overallVerdict}
                        </h4>
                        <p className="text-muted-foreground mt-1 text-xs font-medium">
                          {report.executiveSummary}
                        </p>
                      </div>
                      <div className="flex sm:flex-col items-center justify-center rounded-xl bg-card border border-border p-3 shrink-0 text-center min-w-[100px]">
                        <span className="text-[0.65rem] font-bold uppercase text-muted-foreground">Score</span>
                        <span className="text-2xl font-bold text-primary">{report.overallScore}<span className="text-xs font-normal text-muted-foreground">/100</span></span>
                      </div>
                    </div>

                    {/* Breakdown Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-border bg-secondary/30 p-3">
                        <span className="font-bold text-foreground block text-xs">Income Multiple</span>
                        <span className="text-lg font-bold text-primary mt-1 block">{report.incomeMultiplier}x rent</span>
                        <p className="text-[0.7rem] text-muted-foreground mt-1 leading-relaxed font-medium">{report.incomeAssessment}</p>
                      </div>

                      <div className="rounded-lg border border-border bg-secondary/30 p-3">
                        <span className="font-bold text-foreground block text-xs">Credit Score Risk</span>
                        <span className="text-lg font-bold text-primary mt-1 block">{report.creditTier}</span>
                        <p className="text-[0.7rem] text-muted-foreground mt-1 leading-relaxed font-medium">{report.creditAssessment}</p>
                      </div>

                      <div className="rounded-lg border border-border bg-secondary/30 p-3">
                        <span className="font-bold text-foreground block text-xs">Occupancy &amp; Pet Risk</span>
                        <span className="text-lg font-bold text-primary mt-1 block">{selectedAnalysisSubmission.people || 1} Occupant(s)</span>
                        <p className="text-[0.7rem] text-muted-foreground mt-1 leading-relaxed font-medium">{report.petAssessment}</p>
                      </div>
                    </div>

                    {/* Landlord Recommendations */}
                    <div className="rounded-xl border border-border bg-card p-4">
                      <h5 className="font-bold text-foreground text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>Action Checklist &amp; Landlord Recommendations</span>
                      </h5>
                      <ul className="space-y-1.5 pl-5 list-disc text-muted-foreground text-xs font-medium">
                        {report.recommendations.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Formatted Email Notification Section */}
                    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-4 w-4 text-primary" />
                          <h5 className="font-bold text-foreground text-xs uppercase tracking-wider">
                            Generated Application Notification Email
                          </h5>
                        </div>
                        <span className="text-[0.65rem] text-muted-foreground font-bold">Proper Title &amp; Description</span>
                      </div>

                      <div>
                        <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          Email Subject / Title:
                        </label>
                        <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2 font-mono text-xs font-bold text-foreground select-all">
                          {emailData.subject}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          Email Description &amp; Full Report Body:
                        </label>
                        <pre className="max-h-60 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-3 font-mono text-[0.72rem] leading-relaxed text-foreground whitespace-pre-wrap select-all">
                          {emailData.text}
                        </pre>
                      </div>

                      {/* Modal Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`Subject: ${emailData.subject}\n\n${emailData.text}`);
                            setCopyEmailSuccess(true);
                            setTimeout(() => setCopyEmailSuccess(false), 2500);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-espresso transition cursor-pointer"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>{copyEmailSuccess ? "Copied Email!" : "Copy Full Email Report"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            setEmailSendStatus("Sending...");
                            const success = await dispatchApplicationEmail(selectedAnalysisSubmission, targetProp);
                            setEmailSendStatus(success ? "Email Dispatched to Landlord Mailbox!" : "Saved to Dispatch Queue");
                            setTimeout(() => setEmailSendStatus(""), 3000);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/80 px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground hover:bg-secondary transition cursor-pointer"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>{emailSendStatus || "Send Email to Landlord"}</span>
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
