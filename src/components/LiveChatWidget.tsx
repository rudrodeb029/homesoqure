import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, X, ChevronDown, Check, User } from "@/lib/lucide-react";
import {
  getOrCreateTenantChatId,
  subscribeToChatMessages,
  sendChatMessage,
  type ChatMessage,
} from "@/lib/chat-store";
import { getLatestSubmission, getProperties } from "@/lib/property-store";

export function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatId, setChatId] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cid = getOrCreateTenantChatId();
      setChatId(cid);

      const unsubscribe = subscribeToChatMessages(cid, (msgs) => {
        setMessages(msgs);
        // Check if latest message is from admin and chat is closed
        if (msgs.length > 0) {
          const last = msgs[msgs.length - 1];
          if (last?.sender === "admin" && !isOpen) {
            setHasUnread(true);
          }
        }
      });

      return () => unsubscribe();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText("");

    // Look up latest submission or lead details
    const active = getLatestSubmission();
    const props = getProperties();
    const propAddress = active?.propertyAddress || props[0]?.address || "Homqero Rental Property";
    const tenantName = active?.firstName ? `${active.firstName} ${active.lastName || ""}`.trim() : "Prospective Tenant";

    await sendChatMessage(chatId, "tenant", text, {
      tenantName,
      tenantEmail: active?.email || "",
      tenantPhone: active?.phone || "",
      propertyAddress: propAddress,
    });
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {/* Floating Chat Trigger Button - Icon Only */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-espresso text-accent shadow-2xl transition-all duration-200 hover:scale-110 hover:shadow-[0_10px_25px_rgba(38,23,15,0.4)] active:scale-95 focus:outline-none cursor-pointer border border-accent/40"
          aria-label="Open live chat"
          title="Chat with Landlord"
        >
          <MessageCircle className="h-6 w-6 text-accent transition-transform duration-200 group-hover:scale-110" />

          {/* Green online presence indicator */}
          <span className="absolute bottom-1 right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-espresso" />
          </span>

          {/* Unread Message Notification Dot */}
          {hasUnread && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[0.65rem] font-bold text-white shadow-md animate-bounce ring-2 ring-background">
              !
            </span>
          )}
        </button>
      )}

      {/* Floating Chat Window Modal */}
      {isOpen && (
        <div className="flex h-[480px] w-[350px] sm:w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-espresso px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary font-serif font-bold text-sm text-primary">
                H
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-espresso" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold leading-tight text-accent">Homqero Landlord Support</h3>
                <p className="text-[0.65rem] text-primary-foreground/70">Online · Typically replies in seconds</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-primary-foreground/80 hover:bg-white/10 hover:text-white transition cursor-pointer"
                title="Minimize chat"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/20 text-xs">
            {/* Introductory system card */}
            <div className="rounded-xl border border-border bg-card p-3 text-center shadow-2xs">
              <p className="font-bold text-foreground">Welcome to Live Landlord Chat</p>
              <p className="mt-1 text-[0.7rem] text-muted-foreground leading-relaxed">
                Connect directly with the property manager. Inquire about lease terms, schedule private viewings, or ask any application questions in real-time.
              </p>
            </div>

            {/* Message Stream */}
            {messages.map((m) => {
              const isTenant = m.sender === "tenant";
              const timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isTenant ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1 mb-1 px-1">
                    <span className="text-[0.65rem] font-semibold text-muted-foreground">
                      {isTenant ? "You" : "Landlord Support"}
                    </span>
                    <span className="text-[0.6rem] text-muted-foreground/60">{timeStr}</span>
                  </div>
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs ${
                      isTenant
                        ? "bg-espresso text-primary-foreground rounded-br-xs"
                        : "bg-card border border-border text-foreground rounded-bl-xs"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box Footer */}
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 border-t border-border bg-card p-3"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 rounded-full border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs transition hover:bg-espresso disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

