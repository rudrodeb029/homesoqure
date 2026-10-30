/**
 * Worker / referral accounts.
 * Workers are created by the Admin. Each worker gets a unique referral code,
 * can log in at /worker, post their own properties and see only their own leads.
 *
 * NOTE: Credentials are verified client-side against Firestore (no Firebase Auth yet).
 */

export interface Worker {
  id: string;
  name: string;
  username: string;
  password: string;
  referralCode: string;
  phone?: string;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

const WORKERS_KEY = "homqero_workers_v1";
export const WORKER_SESSION_KEY = "homqero_worker_session";

function readLocal(): Worker[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WORKERS_KEY);
    return raw ? (JSON.parse(raw) as Worker[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(list: Worker[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WORKERS_KEY, JSON.stringify(list));
}

function clean<T extends Record<string, unknown>>(obj: T): T {
  const res: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) res[k] = v;
  return res as T;
}

async function saveWorkerCloud(worker: Worker) {
  if (typeof window === "undefined") return;
  try {
    const { doc, setDoc } = await import("firebase/firestore");
    const { db } = await import("./firebase");
    await setDoc(doc(db, "workers", worker.id), clean(worker as unknown as Record<string, unknown>), { merge: true });
  } catch (err) {
    console.warn("Firestore saveWorker error:", err);
  }
}

export function getWorkers(): Worker[] {
  return readLocal();
}

function generateReferralCode(name: string, existing: Worker[]): string {
  const base = (name.replace(/[^a-zA-Z]/g, "").slice(0, 4) || "WRK").toUpperCase();
  let code = "";
  do {
    code = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  } while (existing.some((w) => w.referralCode === code));
  return code;
}

export async function createWorker(input: {
  name: string;
  username: string;
  password: string;
  phone?: string;
}): Promise<Worker> {
  const list = readLocal();
  const username = input.username.trim().toLowerCase();
  if (list.some((w) => w.username === username)) {
    throw new Error("This username is already taken.");
  }
  const worker: Worker = {
    id: `wrk-${Date.now().toString(36)}-${Math.floor(Math.random() * 900 + 100)}`,
    name: input.name.trim(),
    username,
    password: input.password,
    phone: input.phone?.trim() || undefined,
    referralCode: generateReferralCode(input.name, list),
    active: true,
    createdAt: new Date().toISOString(),
  };
  list.unshift(worker);
  writeLocal(list);
  await saveWorkerCloud(worker);
  return worker;
}

export async function updateWorker(id: string, updates: Partial<Worker>): Promise<Worker | null> {
  const list = readLocal();
  const idx = list.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  const updated: Worker = { ...list[idx]!, ...updates, id };
  list[idx] = updated;
  writeLocal(list);
  await saveWorkerCloud(updated);
  return updated;
}

export async function deleteWorker(id: string): Promise<void> {
  writeLocal(readLocal().filter((w) => w.id !== id));
  if (typeof window === "undefined") return;
  try {
    const { doc, deleteDoc } = await import("firebase/firestore");
    const { db } = await import("./firebase");
    await deleteDoc(doc(db, "workers", id));
  } catch (err) {
    console.warn("Firestore deleteWorker error:", err);
  }
}

export function subscribeToWorkers(callback: (workers: Worker[]) => void): () => void {
  if (typeof window === "undefined") return () => {};
  let unsubscribe: (() => void) | undefined;
  import("firebase/firestore").then(async ({ collection, onSnapshot, query }) => {
    const { db } = await import("./firebase");
    try {
      unsubscribe = onSnapshot(
        query(collection(db, "workers")),
        (snapshot) => {
          const list: Worker[] = [];
          snapshot.forEach((d) => list.push(d.data() as Worker));
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          writeLocal(list);
          callback(list);
        },
        (err) => console.warn("Firestore workers snapshot warning:", err)
      );
    } catch (err) {
      console.warn("Failed to subscribe to workers:", err);
    }
  });
  return () => {
    if (unsubscribe) unsubscribe();
  };
}

/** Verifies worker credentials against the cloud (falls back to local cache). */
export async function loginWorker(username: string, password: string): Promise<Worker> {
  const uname = username.trim().toLowerCase();
  let found: Worker | undefined;
  try {
    const { collection, getDocs, query, where } = await import("firebase/firestore");
    const { db } = await import("./firebase");
    const snap = await getDocs(query(collection(db, "workers"), where("username", "==", uname)));
    snap.forEach((d) => {
      found = d.data() as Worker;
    });
  } catch (err) {
    console.warn("Worker login cloud lookup failed, using local cache:", err);
    found = readLocal().find((w) => w.username === uname);
  }
  if (!found || found.password !== password) {
    throw new Error("Incorrect username or password.");
  }
  if (!found.active) {
    throw new Error("Your account has been deactivated. Please contact the admin.");
  }
  const updated = { ...found, lastLoginAt: new Date().toISOString() };
  saveWorkerCloud(updated);
  if (typeof window !== "undefined") {
    sessionStorage.setItem(WORKER_SESSION_KEY, updated.id);
  }
  return updated;
}

export async function fetchWorkerById(id: string): Promise<Worker | null> {
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const { db } = await import("./firebase");
    const snap = await getDoc(doc(db, "workers", id));
    if (snap.exists()) return snap.data() as Worker;
  } catch (err) {
    console.warn("fetchWorkerById warning:", err);
  }
  return readLocal().find((w) => w.id === id) || null;
}

export function logoutWorker() {
  if (typeof window !== "undefined") sessionStorage.removeItem(WORKER_SESSION_KEY);
}
