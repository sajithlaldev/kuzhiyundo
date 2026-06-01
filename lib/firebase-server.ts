/**
 * Server-side Firestore access via the Firestore REST API.
 *
 * Mints an OAuth2 access token from a service account (RS256 JWT signed with
 * Web Crypto), then talks to the Firestore REST endpoint over `fetch`. This is
 * Edge-runtime safe — unlike `firebase-admin` / `@google-cloud/firestore`,
 * which `require("stream")` and therefore cannot be bundled for the Next.js
 * Edge webpack target (Cloudflare Pages forces Edge on all dynamic routes).
 *
 * Uses only Web-standard APIs: `crypto.subtle`, `fetch`, `TextEncoder`,
 * `atob` / `btoa`, `Uint8Array`. No Node built-ins.
 *
 * Required env var (server-only, no NEXT_PUBLIC_ prefix):
 *   FIREBASE_SERVICE_ACCOUNT_KEY — base64-encoded service account JSON
 *   (Firebase Console → Project Settings → Service Accounts → Generate key)
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type FSTimestamp = { toDate: () => Date; toMillis: () => number };

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

/**
 * Plain JSON-safe version of PotholeReport for SSR props.
 * imageUrl is intentionally excluded (base64, can be 100KB+ per doc).
 * createdAt is serialized as an ISO string.
 */
export type SerializedReport = Omit<PotholeReport, "createdAt" | "imageUrl"> & {
  createdAt: string | null;
};

// ---------------------------------------------------------------------------
// Service account
// ---------------------------------------------------------------------------

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri: string;
  project_id: string;
}

let cachedServiceAccount: ServiceAccount | null = null;

function getServiceAccount(): ServiceAccount {
  if (cachedServiceAccount) return cachedServiceAccount;

  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    throw new Error(
      "[firebase-server] FIREBASE_SERVICE_ACCOUNT_KEY is not set. " +
        "Generate a service account key in Firebase Console → Project Settings → Service Accounts."
    );
  }

  // The env var is base64-encoded JSON. JSON.parse restores the `\n` escapes
  // inside private_key to real newlines.
  const sa = JSON.parse(base64ToUtf8(key)) as ServiceAccount;
  cachedServiceAccount = sa;
  return sa;
}

// ---------------------------------------------------------------------------
// Encoding helpers (Web-standard, no Buffer)
// ---------------------------------------------------------------------------

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function base64ToUtf8(b64: string): string {
  return new TextDecoder().decode(base64ToBytes(b64));
}

function bytesToBase64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function stringToBase64url(s: string): string {
  return bytesToBase64url(new TextEncoder().encode(s));
}

// ---------------------------------------------------------------------------
// OAuth2 access token (service account JWT → token, with caching)
// ---------------------------------------------------------------------------

interface CachedToken {
  token: string;
  /** Absolute expiry, unix seconds. */
  exp: number;
}

let cachedToken: CachedToken | null = null;
/** Shared in-flight refresh so concurrent cold requests don't stampede. */
let inFlightToken: Promise<string> | null = null;

const TOKEN_SKEW_SECONDS = 90;

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - TOKEN_SKEW_SECONDS > now) {
    return cachedToken.token;
  }
  if (inFlightToken) return inFlightToken;

  inFlightToken = mintAccessToken()
    .then((t) => {
      cachedToken = t;
      return t.token;
    })
    .finally(() => {
      inFlightToken = null;
    });

  return inFlightToken;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pkcs8 = pem
    .replace(/\\n/g, "\n") // normalize any literal "\n" that survived env handling
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = base64ToBytes(pkcs8);
  return crypto.subtle.importKey(
    "pkcs8",
    der as unknown as ArrayBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function mintAccessToken(): Promise<CachedToken> {
  const sa = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const iat = now - 30; // backdate slightly to absorb edge clock skew
  const exp = now + 3600; // Google requires exp ≤ 1h from iat

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: sa.token_uri,
    iat,
    exp,
  };

  const signingInput =
    `${stringToBase64url(JSON.stringify(header))}.` +
    `${stringToBase64url(JSON.stringify(claims))}`;

  const key = await importPrivateKey(sa.private_key);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );
  const jwt = `${signingInput}.${bytesToBase64url(new Uint8Array(signature))}`;

  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`[firebase-server] token request failed: ${res.status} ${detail}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  return { token: data.access_token, exp: now + (data.expires_in ?? 3600) };
}

// ---------------------------------------------------------------------------
// Firestore REST helpers
// ---------------------------------------------------------------------------

function restBase(): string {
  const sa = getServiceAccount();
  const dbId = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID || "(default)";
  // encodeURIComponent leaves "(default)" untouched (parens are unreserved).
  return `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/${encodeURIComponent(
    dbId
  )}/documents`;
}

interface FirestoreValue {
  nullValue?: null;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  stringValue?: string;
  bytesValue?: string;
  referenceValue?: string;
  geoPointValue?: { latitude: number; longitude: number };
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
}

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
}

function parseValue(v: FirestoreValue): unknown {
  if (v == null || "nullValue" in v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("timestampValue" in v) {
    const iso = v.timestampValue as string;
    const ts: FSTimestamp = {
      toDate: () => new Date(iso),
      toMillis: () => Date.parse(iso),
    };
    return ts;
  }
  if ("arrayValue" in v) return (v.arrayValue?.values ?? []).map(parseValue);
  if ("mapValue" in v) return parseFields(v.mapValue?.fields ?? {});
  if ("geoPointValue" in v) return v.geoPointValue;
  if ("referenceValue" in v) return v.referenceValue;
  if ("bytesValue" in v) return v.bytesValue;
  return null;
}

function parseFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k in fields) out[k] = parseValue(fields[k]);
  return out;
}

/** Extract the document ID (last path segment of `document.name`). */
function docIdFromName(name: string): string {
  const parts = name.split("/");
  return decodeURIComponent(parts[parts.length - 1]);
}

interface StructuredQuery {
  from: { collectionId: string }[];
  orderBy?: { field: { fieldPath: string }; direction: "ASCENDING" | "DESCENDING" }[];
  limit?: number;
  select?: { fields: { fieldPath: string }[] };
}

/** Run a structured query and return parsed documents (readTime-only rows skipped). */
async function runQuery(
  structuredQuery: StructuredQuery
): Promise<{ id: string; data: Record<string, unknown> }[]> {
  const token = await getAccessToken();
  const res = await fetch(`${restBase()}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ structuredQuery }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`[firebase-server] runQuery failed: ${res.status} ${detail}`);
  }

  const rows = (await res.json()) as { document?: FirestoreDocument }[];
  return rows
    .filter((r) => r.document)
    .map((r) => ({
      id: docIdFromName(r.document!.name),
      data: parseFields(r.document!.fields ?? {}),
    }));
}

// ---------------------------------------------------------------------------
// getReport — fetch a single document by ID
// ---------------------------------------------------------------------------

export async function getReport(id: string): Promise<PotholeReport | null> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${restBase()}/potholes/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`getReport failed: ${res.status} ${detail}`);
    }

    const doc = (await res.json()) as FirestoreDocument;
    const data = parseFields(doc.fields ?? {});
    return { id: docIdFromName(doc.name), ...data } as unknown as PotholeReport;
  } catch (err) {
    console.error("[firebase-server] getReport error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// getRecentReports — most recent `limit` reports for SSR hydration
// ---------------------------------------------------------------------------

export async function getRecentReports(limit = 200): Promise<SerializedReport[]> {
  try {
    const rows = await runQuery({
      from: [{ collectionId: "potholes" }],
      orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
      limit,
    });

    return rows.map(({ id, data }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { imageUrl, createdAt, ...rest } = data;
      return {
        id,
        ...rest,
        // Convert FSTimestamp → ISO string (JSON-serializable; component handles it)
        createdAt: (createdAt as FSTimestamp | undefined)?.toDate?.()?.toISOString() ?? null,
      } as SerializedReport;
    });
  } catch (err) {
    console.error("[firebase-server] getRecentReports error:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// getAllReportStubs — IDs + timestamps for sitemap (capped at 5000)
// ---------------------------------------------------------------------------

export async function getAllReportStubs(): Promise<{ id: string; updatedAt: Date }[]> {
  try {
    const rows = await runQuery({
      from: [{ collectionId: "potholes" }],
      orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
      limit: 5000,
      select: { fields: [{ fieldPath: "createdAt" }] }, // only the timestamp — faster + cheaper
    });

    return rows.map(({ id, data }) => ({
      id,
      updatedAt: (data.createdAt as FSTimestamp | undefined)?.toDate?.() ?? new Date(),
    }));
  } catch (err) {
    console.error("[firebase-server] getAllReportStubs error:", err);
    return [];
  }
}
