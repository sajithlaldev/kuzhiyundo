/**
 * Server-side Firestore access via Firebase Admin SDK.
 *
 * Uses a service account so requests are fully trusted — bypasses App Check
 * enforcement and Firestore security rules (server has full read access).
 *
 * Required env var (server-only, no NEXT_PUBLIC_ prefix):
 *   FIREBASE_SERVICE_ACCOUNT_KEY — base64-encoded service account JSON
 *   (Firebase Console → Project Settings → Service Accounts → Generate key)
 */

import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

// ---------------------------------------------------------------------------
// Singleton initialisation
// ---------------------------------------------------------------------------

export type FSTimestamp = { toDate: () => Date; toMillis: () => number };

let adminApp: App;
let adminDb: Firestore;

function getAdminDb(): Firestore {
  if (adminDb) return adminDb;

  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    throw new Error(
      "[firebase-server] FIREBASE_SERVICE_ACCOUNT_KEY is not set. " +
      "Generate a service account key in Firebase Console → Project Settings → Service Accounts."
    );
  }

  const serviceAccount = JSON.parse(
    Buffer.from(key, "base64").toString("utf-8")
  );

  adminApp =
    getApps().find((a) => a.name === "admin") ??
    initializeApp({ credential: cert(serviceAccount) }, "admin");

  const dbId = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID || "(default)";
  adminDb = getFirestore(adminApp, dbId);
  return adminDb;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PotholeReport {
  id: string;
  userId: string;
  userName: string;
  encodedPath: string;
  createdAt: FSTimestamp | null;
  severity: "low" | "medium" | "high";
  status: "reported" | "confirmed" | "fixed";
  address: string;
  district: string;
  pincode?: string;
  acName?: string;
  acNo?: string | number;
  pcName?: string;
  lsgd?: string;
  lsgdType?: string;
  lsgdLabel?: string;
  lsgCode?: string;
  wardNo?: string | number;
  wardName?: string;
  distanceM?: number;
  upvoterIds?: string[];
  downvoterIds?: string[];
  notes?: string;
  imageUrl?: string;
}

// ---------------------------------------------------------------------------
// getReport — fetch a single document by ID
// ---------------------------------------------------------------------------

export async function getReport(id: string): Promise<PotholeReport | null> {
  try {
    const db = getAdminDb();
    const snap = await db.collection("potholes").doc(id).get();
    if (!snap.exists) return null;

    const data = snap.data()!;
    // Admin SDK Timestamps have .toDate() natively — compatible with our FSTimestamp type
    return { id: snap.id, ...data } as unknown as PotholeReport;
  } catch (err) {
    console.error("[firebase-server] getReport error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// SerializedReport — plain JSON-safe version of PotholeReport for SSR props.
// imageUrl is intentionally excluded (base64, can be 100KB+ per doc).
// createdAt is serialized as ISO string — component fallback handles this.
// ---------------------------------------------------------------------------

export type SerializedReport = Omit<PotholeReport, "createdAt" | "imageUrl"> & {
  createdAt: string | null;
};

/**
 * Fetch the most recent `limit` reports for SSR hydration.
 * Returns plain, JSON-serializable objects safe to pass as Next.js props.
 */
export async function getRecentReports(limit = 200): Promise<SerializedReport[]> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("potholes")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map((d) => {
      const data = d.data();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { imageUrl, createdAt, ...rest } = data;
      return {
        id: d.id,
        ...rest,
        // Convert Timestamp → ISO string (JSON-serializable, component handles it)
        createdAt: createdAt?.toDate?.()?.toISOString() ?? null,
      } as SerializedReport;
    });
  } catch (err) {
    console.error("[firebase-server] getRecentReports error:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// getAllReportStubs — fetch IDs + timestamps for sitemap (capped at 5000)
// ---------------------------------------------------------------------------

export async function getAllReportStubs(): Promise<{ id: string; updatedAt: Date }[]> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("potholes")
      .orderBy("createdAt", "desc")
      .limit(5000)
      .select("createdAt") // only fetch the timestamp field — faster + cheaper
      .get();

    return snap.docs.map((d) => ({
      id: d.id,
      updatedAt: d.data().createdAt?.toDate?.() ?? new Date(),
    }));
  } catch (err) {
    console.error("[firebase-server] getAllReportStubs error:", err);
    return [];
  }
}
