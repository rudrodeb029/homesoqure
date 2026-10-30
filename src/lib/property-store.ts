export interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  imageUrl?: string;
  creditCheckUrl?: string;
  supportPhone?: string;
  supportEmail?: string;
  notes?: string;
  /** Worker who posted this property (undefined = Admin) */
  ownerId?: string;
  ownerName?: string;
  referralCode?: string;
  createdAt: string;
}

export interface SiteSettings {
  supportPhone: string;
  supportEmail: string;
  landlordName?: string;
  creditCheckUrl?: string;
  chatAutoReply?: string;
  lastUpdated?: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  supportPhone: "+1 (646) 431-3060",
  supportEmail: "landlord@homqero.com",
  landlordName: "Homqero Rentals Management",
  creditCheckUrl: "https://www.myscoreiq.com",
  chatAutoReply: "Your application is currently being reviewed by Landloard. We'll update you shortly!",
};

const SETTINGS_KEY = "homqero_site_settings_v1";

export type SubmissionStatus = "completed" | "pending_credit" | "incomplete";

export interface Submission {
  id: string;
  propertyId: string;
  propertyAddress: string;
  status: SubmissionStatus;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  income: string;
  creditRange: string;
  moveInDate: string;
  people: number;
  adults?: number;
  children?: number;
  hasPets: boolean;
  petDetails?: string;
  smoking: string;
  wantsShowing: boolean;
  showingTypes?: string[];
  viewingDate?: string;
  viewingTime?: string;
  source: string;
  questions?: string;
  screenshotName?: string;
  screenshotUrl?: string;
  /** Worker attribution (copied from the property / ?ref= link) */
  ownerId?: string;
  ownerName?: string;
  referralCode?: string;
  submittedAt: string;
  lastUpdated: string;
}

export const DEFAULT_PROPERTY: Property = {
  id: "406-se-railroad-st",
  address: "406 SE Railroad St",
  city: "Bronte",
  state: "TX",
  zip: "76933",
  price: 750,
  creditCheckUrl: "#",
  supportPhone: "+1 (646) 431-3060",
  notes: "Quiet residential area, close to local shops and schools.",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const PROPERTIES_KEY = "homqero_properties_v1";
const SUBMISSIONS_KEY = "homqero_submissions_v1";
const ACTIVE_SUBMISSION_KEY = "homqero_active_submission_v1";
const DRAFT_LEAD_SESSION_ID = "homqero_draft_lead_id";

export function getProperties(): Property[] {
  if (typeof window === "undefined") return [DEFAULT_PROPERTY];
  try {
    const raw = localStorage.getItem(PROPERTIES_KEY);
    if (!raw) {
      localStorage.setItem(PROPERTIES_KEY, JSON.stringify([DEFAULT_PROPERTY]));
      return [DEFAULT_PROPERTY];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_PROPERTY];
  } catch {
    return [DEFAULT_PROPERTY];
  }
}

export function getPropertyById(id?: string | null): Property {
  const properties = getProperties();
  if (!id) return properties[0] ?? DEFAULT_PROPERTY;
  const found = properties.find((p) => p.id.toLowerCase() === id.toLowerCase());
  return found || properties[0] || DEFAULT_PROPERTY;
}

export function getSiteSettings(): SiteSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return {
      supportPhone: parsed.supportPhone || DEFAULT_SETTINGS.supportPhone,
      supportEmail: parsed.supportEmail || DEFAULT_SETTINGS.supportEmail,
      landlordName: parsed.landlordName || DEFAULT_SETTINGS.landlordName,
      creditCheckUrl: parsed.creditCheckUrl || DEFAULT_SETTINGS.creditCheckUrl,
      chatAutoReply: parsed.chatAutoReply || DEFAULT_SETTINGS.chatAutoReply,
      lastUpdated: parsed.lastUpdated,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSiteSettings(updates: Partial<SiteSettings>): Promise<SiteSettings> {
  const current = getSiteSettings();
  const updated: SiteSettings = {
    ...current,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("homqero_settings_updated", { detail: updated }));
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("./firebase");
      await setDoc(doc(db, "settings", "general"), cleanForFirestore(updated as unknown as Record<string, unknown>), { merge: true });
    } catch (err) {
      console.warn("Firestore saveSiteSettings error:", err);
    }
  }

  return updated;
}

export async function fetchSiteSettingsFromCloud(): Promise<SiteSettings> {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const { db } = await import("./firebase");
    const snap = await getDoc(doc(db, "settings", "general"));
    if (snap.exists()) {
      const data = snap.data() as Partial<SiteSettings>;
      const merged: SiteSettings = {
        supportPhone: data.supportPhone || DEFAULT_SETTINGS.supportPhone,
        supportEmail: data.supportEmail || DEFAULT_SETTINGS.supportEmail,
        landlordName: data.landlordName || DEFAULT_SETTINGS.landlordName,
        creditCheckUrl: data.creditCheckUrl || DEFAULT_SETTINGS.creditCheckUrl,
        chatAutoReply: data.chatAutoReply || DEFAULT_SETTINGS.chatAutoReply,
        lastUpdated: data.lastUpdated,
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent("homqero_settings_updated", { detail: merged }));
      return merged;
    }
  } catch (err) {
    console.warn("Firestore fetchSiteSettings error:", err);
  }
  return getSiteSettings();
}

function cleanForFirestore<T extends Record<string, unknown>>(obj: T): T {
  const res: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      res[k] = v;
    }
  }
  return res as T;
}

async function savePropertyCloud(property: Property) {
  if (typeof window === "undefined") return;
  try {
    const { doc, setDoc } = await import("firebase/firestore");
    const { db } = await import("./firebase");
    await setDoc(doc(db, "properties", property.id), cleanForFirestore(property as unknown as Record<string, unknown>), { merge: true });
  } catch (err) {
    console.warn("Firestore saveProperty error:", err);
  }
}

async function deletePropertyCloud(id: string) {
  if (typeof window === "undefined") return;
  try {
    const { doc, deleteDoc } = await import("firebase/firestore");
    const { db } = await import("./firebase");
    await deleteDoc(doc(db, "properties", id));
  } catch (err) {
    console.warn("Firestore deleteProperty error:", err);
  }
}

async function saveSubmissionCloud(submission: Submission) {
  if (typeof window === "undefined") return;
  try {
    const { doc, setDoc } = await import("firebase/firestore");
    const { db } = await import("./firebase");
    await setDoc(doc(db, "submissions", submission.id), cleanForFirestore(submission as unknown as Record<string, unknown>), { merge: true });
  } catch (err) {
    console.warn("Firestore saveSubmission error:", err);
  }
}

async function deleteSubmissionCloud(id: string) {
  if (typeof window === "undefined") return;
  try {
    const { doc, deleteDoc } = await import("firebase/firestore");
    const { db } = await import("./firebase");
    await deleteDoc(doc(db, "submissions", id));
  } catch (err) {
    console.warn("Firestore deleteSubmission error:", err);
  }
}

export function saveProperty(property: Omit<Property, "id" | "createdAt">, existingId?: string): Property {
  const properties = getProperties();
  if (existingId) {
    const idx = properties.findIndex((p) => p.id === existingId);
    if (idx !== -1) {
      const updated: Property = {
        ...properties[idx]!,
        ...property,
      };
      properties[idx] = updated;
      localStorage.setItem(PROPERTIES_KEY, JSON.stringify(properties));
      savePropertyCloud(updated);
      return updated;
    }
  }

  // Generate clean slug ID from address or random string
  const baseSlug = property.address
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  let slug = baseSlug || `prop-${Date.now()}`;
  let counter = 1;
  while (properties.some((p) => p.id === slug)) {
    slug = `${baseSlug}-${counter++}`;
  }

  const newProperty: Property = {
    ...property,
    id: slug,
    createdAt: new Date().toISOString(),
  };

  properties.unshift(newProperty);
  localStorage.setItem(PROPERTIES_KEY, JSON.stringify(properties));
  savePropertyCloud(newProperty);
  return newProperty;
}

export function deleteProperty(id: string): void {
  const properties = getProperties().filter((p) => p.id !== id);
  localStorage.setItem(
    PROPERTIES_KEY,
    JSON.stringify(properties.length > 0 ? properties : [DEFAULT_PROPERTY])
  );
  deletePropertyCloud(id);
}

export function getSubmissions(): Submission[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Saves or updates a real-time partial/incomplete lead as the tenant types.
 * Captures information immediately so incomplete leads are never lost!
 */
export function saveOrUpdateDraftLead(draft: Partial<Submission>): Submission | null {
  if (typeof window === "undefined") return null;

  // Save if ANY identifying information or field was entered
  const hasInfo = Boolean(
    (draft.firstName && draft.firstName.trim()) ||
    (draft.lastName && draft.lastName.trim()) ||
    (draft.email && draft.email.trim()) ||
    (draft.phone && draft.phone.trim()) ||
    (draft.income && draft.income.trim()) ||
    draft.creditRange ||
    draft.moveInDate ||
    (draft.petDetails && draft.petDetails.trim()) ||
    (draft.questions && draft.questions.trim()) ||
    draft.source ||
    draft.smoking ||
    (draft.people && draft.people > 1) ||
    draft.hasPets ||
    draft.wantsShowing
  );

  if (!hasInfo) return null;

  const list = getSubmissions();
  let draftId = sessionStorage.getItem(DRAFT_LEAD_SESSION_ID);
  const now = new Date().toISOString();

  let existingIndex = -1;
  if (draftId) {
    existingIndex = list.findIndex((s) => s.id === draftId);
  }

  if (existingIndex !== -1) {
    const current = list[existingIndex]!;
    const updated: Submission = {
      ...current,
      ...draft,
      id: current.id,
      // preserve higher status if already progressed
      status: current.status === "completed" ? "completed" : draft.status || current.status || "incomplete",
      submittedAt: current.submittedAt,
      lastUpdated: now,
    };
    list[existingIndex] = updated;
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(list));
    localStorage.setItem(ACTIVE_SUBMISSION_KEY, JSON.stringify(updated));
    saveSubmissionCloud(updated);
    return updated;
  } else {
    // New draft lead
    const newId = `LEAD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const newLead: Submission = {
      id: newId,
      propertyId: draft.propertyId || "406-se-railroad-st",
      propertyAddress: draft.propertyAddress || "406 SE Railroad St",
      status: draft.status || "incomplete",
      firstName: draft.firstName || "",
      lastName: draft.lastName || "",
      email: draft.email || "",
      phone: draft.phone || "",
      income: draft.income || "",
      creditRange: draft.creditRange || "",
      moveInDate: draft.moveInDate || "",
      people: draft.people !== undefined ? draft.people : 0,
      adults: draft.adults !== undefined ? draft.adults : 0,
      children: draft.children !== undefined ? draft.children : 0,
      hasPets: !!draft.hasPets,
      petDetails: draft.petDetails || "",
      smoking: draft.smoking || "",
      wantsShowing: !!draft.wantsShowing,
      showingTypes: draft.showingTypes || [],
      viewingDate: draft.viewingDate || "",
      viewingTime: draft.viewingTime || "",
      source: draft.source || "",
      questions: draft.questions || "",
      screenshotName: draft.screenshotName || "",
      screenshotUrl: draft.screenshotUrl || "",
      ownerId: draft.ownerId,
      ownerName: draft.ownerName,
      referralCode: draft.referralCode,
      submittedAt: now,
      lastUpdated: now,
    };

    list.unshift(newLead);
    sessionStorage.setItem(DRAFT_LEAD_SESSION_ID, newId);
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(list));
    localStorage.setItem(ACTIVE_SUBMISSION_KEY, JSON.stringify(newLead));
    saveSubmissionCloud(newLead);
    return newLead;
  }
}

/**
 * Marks submission as progressed to Step 2 (Pending Credit Screenshot)
 */
export function saveStepOneSubmission(submission: Partial<Submission>): Submission {
  const result = saveOrUpdateDraftLead({
    ...submission,
    status: "pending_credit",
  });
  return result!;
}

export function getLatestSubmission(): Submission | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_SUBMISSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Marks submission as 100% Completed with the uploaded screenshot attached
 */
export function markSubmissionCompleted(screenshotName: string, screenshotUrl?: string): void {
  if (typeof window === "undefined") return;
  try {
    const active = getLatestSubmission();
    const now = new Date().toISOString();
    const list = getSubmissions();

    if (active) {
      active.screenshotName = screenshotName;
      if (screenshotUrl) active.screenshotUrl = screenshotUrl;
      active.status = "completed";
      active.lastUpdated = now;
      localStorage.setItem(ACTIVE_SUBMISSION_KEY, JSON.stringify(active));

      const idx = list.findIndex((s) => s.id === active.id);
      if (idx !== -1) {
        list[idx]!.screenshotName = screenshotName;
        if (screenshotUrl) list[idx]!.screenshotUrl = screenshotUrl;
        list[idx]!.status = "completed";
        list[idx]!.lastUpdated = now;
      }
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(list));
      saveSubmissionCloud(active);
    }
  } catch (err) {
    console.error("Failed to mark submission completed:", err);
  }
}

export const updateLatestSubmissionScreenshot = markSubmissionCompleted;

export function deleteSubmission(id: string): void {
  if (typeof window === "undefined") return;
  const list = getSubmissions().filter((s) => s.id !== id);
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(list));
  deleteSubmissionCloud(id);
}

export function subscribeToCloudSubmissions(callback: (submissions: Submission[]) => void): () => void {
  if (typeof window === "undefined") return () => {};
  let unsubscribe: (() => void) | undefined;
  import("firebase/firestore").then(async ({ collection, onSnapshot, query }) => {
    const { db } = await import("./firebase");
    try {
      const q = query(collection(db, "submissions"));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const cloudList: Submission[] = [];
          snapshot.forEach((d) => {
            cloudList.push(d.data() as Submission);
          });
          cloudList.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
          localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(cloudList));
          callback(cloudList);
        },
        (err) => {
          console.warn("Firestore submissions snapshot warning:", err);
        }
      );
    } catch (err) {
      console.warn("Failed to subscribe to cloud submissions:", err);
    }
  });
  return () => {
    if (unsubscribe) unsubscribe();
  };
}

export function subscribeToCloudProperties(callback: (properties: Property[]) => void): () => void {
  if (typeof window === "undefined") return () => {};
  let unsubscribe: (() => void) | undefined;
  import("firebase/firestore").then(async ({ collection, onSnapshot, query }) => {
    const { db } = await import("./firebase");
    try {
      const q = query(collection(db, "properties"));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const cloudProps: Property[] = [];
            snapshot.forEach((d) => {
              cloudProps.push(d.data() as Property);
            });
            cloudProps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            localStorage.setItem(PROPERTIES_KEY, JSON.stringify(cloudProps));
            callback(cloudProps);
          } else {
            // Seed default property if cloud is empty
            savePropertyCloud(DEFAULT_PROPERTY);
          }
        },
        (err) => {
          console.warn("Firestore properties snapshot warning:", err);
        }
      );
    } catch (err) {
      console.warn("Failed to subscribe to cloud properties:", err);
    }
  });
  return () => {
    if (unsubscribe) unsubscribe();
  };
}

export async function fetchPropertyFromCloud(id?: string | null): Promise<Property> {
  const local = getPropertyById(id);
  if (typeof window === "undefined" || !id) return local;
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const { db } = await import("./firebase");
    const snap = await getDoc(doc(db, "properties", id));
    if (snap.exists()) {
      const prop = snap.data() as Property;
      const current = getProperties();
      const idx = current.findIndex((p) => p.id === prop.id);
      if (idx !== -1) current[idx] = prop;
      else current.unshift(prop);
      localStorage.setItem(PROPERTIES_KEY, JSON.stringify(current));
      return prop;
    }
  } catch (err) {
    console.warn("fetchPropertyFromCloud warning:", err);
  }
  return local;
}
