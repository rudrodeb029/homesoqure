export interface ChatMessage {
  id: string;
  chatId: string;
  sender: "tenant" | "admin";
  senderName: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface ChatThread {
  id: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  propertyAddress: string;
  propertyId?: string;
  /** Worker attribution */
  ownerId?: string;
  ownerName?: string;
  referralCode?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadAdminCount: number;
  unreadTenantCount: number;
  status: "active" | "archived";
}

const CHAT_ID_KEY = "homqero_active_chat_id";
const LOCAL_CHATS_KEY = "homqero_local_chat_threads";
const LOCAL_MESSAGES_PREFIX = "homqero_chat_msg_";

export function getOrCreateTenantChatId(): string {
  if (typeof window === "undefined") return "chat-server";
  let id = sessionStorage.getItem(CHAT_ID_KEY) || localStorage.getItem(CHAT_ID_KEY);
  if (!id) {
    const draftId = sessionStorage.getItem("homqero_draft_lead_id");
    id = draftId ? `chat-${draftId}` : `chat-guest-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    sessionStorage.setItem(CHAT_ID_KEY, id);
    localStorage.setItem(CHAT_ID_KEY, id);
  }
  return id;
}

export function getLocalChatThreads(): ChatThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_CHATS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getLocalMessages(chatId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_MESSAGES_PREFIX}${chatId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMessage(msg: ChatMessage, threadInfo?: Partial<ChatThread>) {
  if (typeof window === "undefined") return;
  const msgs = getLocalMessages(msg.chatId);
  msgs.push(msg);
  localStorage.setItem(`${LOCAL_MESSAGES_PREFIX}${msg.chatId}`, JSON.stringify(msgs));

  const threads = getLocalChatThreads();
  const idx = threads.findIndex((t) => t.id === msg.chatId);
  const now = msg.timestamp;
  const existingThread = idx !== -1 ? threads[idx] : undefined;

  const updatedThread: ChatThread = {
    id: msg.chatId,
    tenantName: threadInfo?.tenantName || existingThread?.tenantName || "Prospective Tenant",
    tenantEmail: threadInfo?.tenantEmail || existingThread?.tenantEmail || "",
    tenantPhone: threadInfo?.tenantPhone || existingThread?.tenantPhone || "",
    propertyAddress: threadInfo?.propertyAddress || existingThread?.propertyAddress || "General Inquiry",
    propertyId: threadInfo?.propertyId || existingThread?.propertyId,
    ownerId: threadInfo?.ownerId || existingThread?.ownerId,
    ownerName: threadInfo?.ownerName || existingThread?.ownerName,
    referralCode: threadInfo?.referralCode || existingThread?.referralCode,
    lastMessage: msg.text,
    lastMessageAt: now,
    unreadAdminCount: msg.sender === "tenant" ? ((existingThread?.unreadAdminCount || 0) + 1) : 0,
    unreadTenantCount: msg.sender === "admin" ? ((existingThread?.unreadTenantCount || 0) + 1) : 0,
    status: "active",
  };

  if (idx !== -1) {
    threads[idx] = updatedThread;
  } else {
    threads.unshift(updatedThread);
  }
  threads.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  localStorage.setItem(LOCAL_CHATS_KEY, JSON.stringify(threads));
}

/**
 * Sends a message in real-time, syncing to Firestore and localStorage
 */
export async function sendChatMessage(
  chatId: string,
  sender: "tenant" | "admin",
  text: string,
  meta?: {
    tenantName?: string;
    tenantEmail?: string;
    tenantPhone?: string;
    propertyAddress?: string;
    propertyId?: string;
    ownerId?: string;
    ownerName?: string;
    referralCode?: string;
    senderName?: string;
  }
): Promise<ChatMessage> {
  const now = new Date().toISOString();
  const msgId = `msg-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
  const msg: ChatMessage = {
    id: msgId,
    chatId,
    sender,
    senderName: meta?.senderName || (sender === "admin" ? "Landlord Support" : (meta?.tenantName || "Tenant")),
    text: text.trim(),
    timestamp: now,
    read: false,
  };

  // Save locally first
  saveLocalMessage(msg, meta);

  if (typeof window !== "undefined") {
    try {
      const { doc, setDoc, collection } = await import("firebase/firestore");
      const { db } = await import("./firebase");

      // Save message to subcollection
      const msgRef = doc(collection(db, "chats", chatId, "messages"), msgId);
      await setDoc(msgRef, msg);

      // Update parent chat document
      const chatDocRef = doc(db, "chats", chatId);
      const chatData: Record<string, any> = {
        id: chatId,
        tenantName: meta?.tenantName || "Prospective Tenant",
        tenantEmail: meta?.tenantEmail || "",
        tenantPhone: meta?.tenantPhone || "",
        propertyAddress: meta?.propertyAddress || "General Inquiry",
        lastMessage: msg.text,
        lastMessageAt: now,
        status: "active",
        ...(sender === "tenant" ? { unreadAdmin: true } : { unreadTenant: true }),
      };
      if (meta?.propertyId) chatData.propertyId = meta.propertyId;
      if (meta?.ownerId) chatData.ownerId = meta.ownerId;
      if (meta?.ownerName) chatData.ownerName = meta.ownerName;
      if (meta?.referralCode) chatData.referralCode = meta.referralCode;

      await setDoc(chatDocRef, chatData, { merge: true });
    } catch (err) {
      console.warn("Firestore sendChatMessage notice:", err);
    }
  }

  return msg;
}

/**
 * Real-time listener for messages in a specific chat
 */
export function subscribeToChatMessages(
  chatId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  // Deliver local messages immediately for instant UI render
  const local = getLocalMessages(chatId);
  callback(local);

  let unsubscribe: (() => void) | undefined;
  import("firebase/firestore").then(async ({ collection, onSnapshot, query, orderBy }) => {
    try {
      const { db } = await import("./firebase");
      const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: ChatMessage[] = [];
          snapshot.forEach((d) => {
            list.push(d.data() as ChatMessage);
          });
          if (list.length > 0) {
            localStorage.setItem(`${LOCAL_MESSAGES_PREFIX}${chatId}`, JSON.stringify(list));
            callback(list);
          }
        },
        (err) => {
          console.warn("subscribeToChatMessages warning:", err);
        }
      );
    } catch (err) {
      console.warn("Failed to subscribe to chat messages:", err);
    }
  });

  return () => {
    if (unsubscribe) unsubscribe();
  };
}

/**
 * Real-time listener for all active chat threads (used in Landlord Admin Panel)
 */
export function subscribeToAllChatThreads(
  callback: (threads: ChatThread[]) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  callback(getLocalChatThreads());

  let unsubscribe: (() => void) | undefined;
  import("firebase/firestore").then(async ({ collection, onSnapshot, query, orderBy }) => {
    try {
      const { db } = await import("./firebase");
      const q = query(collection(db, "chats"), orderBy("lastMessageAt", "desc"));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: ChatThread[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              tenantName: data.tenantName || "Prospective Tenant",
              tenantEmail: data.tenantEmail || "",
              tenantPhone: data.tenantPhone || "",
              propertyAddress: data.propertyAddress || "General Inquiry",
              propertyId: data.propertyId || undefined,
              ownerId: data.ownerId || undefined,
              ownerName: data.ownerName || undefined,
              referralCode: data.referralCode || undefined,
              lastMessage: data.lastMessage || "",
              lastMessageAt: data.lastMessageAt || new Date().toISOString(),
              unreadAdminCount: data.unreadAdmin ? 1 : 0,
              unreadTenantCount: data.unreadTenant ? 1 : 0,
              status: data.status || "active",
            });
          });
          localStorage.setItem(LOCAL_CHATS_KEY, JSON.stringify(list));
          callback(list);
        },
        (err) => {
          console.warn("subscribeToAllChatThreads warning:", err);
        }
      );
    } catch (err) {
      console.warn("Failed to subscribe to chat threads:", err);
    }
  });

  return () => {
    if (unsubscribe) unsubscribe();
  };
}

/**
 * Mark chat read by Admin in Firestore
 */
export async function markChatReadByAdmin(chatId: string): Promise<void> {
  if (typeof window === "undefined") return;
  const threads = getLocalChatThreads();
  const idx = threads.findIndex((t) => t.id === chatId);
  if (idx !== -1) {
    threads[idx]!.unreadAdminCount = 0;
    localStorage.setItem(LOCAL_CHATS_KEY, JSON.stringify(threads));
  }

  try {
    const { doc, updateDoc } = await import("firebase/firestore");
    const { db } = await import("./firebase");
    await updateDoc(doc(db, "chats", chatId), { unreadAdmin: false });
  } catch (err) {
    console.warn("markChatReadByAdmin warning:", err);
  }
}

