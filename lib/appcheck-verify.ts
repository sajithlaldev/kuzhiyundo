const JWKS_URL = "https://firebaseappcheck.googleapis.com/v1/jwks";

let _keys: Record<string, CryptoKey> | null = null;
let _keysExpiry = 0;

async function getPublicKeys(): Promise<Record<string, CryptoKey>> {
  if (_keys && Date.now() < _keysExpiry) return _keys;

  const res = await fetch(JWKS_URL);
  const { keys } = await res.json();

  const result: Record<string, CryptoKey> = {};
  for (const jwk of keys) {
    result[jwk.kid] = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
  }

  _keys = result;
  _keysExpiry = Date.now() + 3600_000;
  return result;
}

function b64url(s: string) {
  return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
}

export async function verifyAppCheckToken(token: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [headerB64, payloadB64, sigB64] = parts;

    const header = JSON.parse(b64url(headerB64));
    const payload = JSON.parse(b64url(payloadB64));

    const now = Date.now() / 1000;
    if (payload.exp < now) return false;
    if (payload.nbf !== undefined && payload.nbf > now) return false;

    const projectNumber = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    if (!payload.aud?.includes(`projects/${projectNumber}`)) return false;
    if (payload.iss !== `https://firebaseappcheck.googleapis.com/${projectNumber}`) return false;

    const keys = await getPublicKeys();
    const key = keys[header.kid];
    if (!key) return false;

    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const sig = Uint8Array.from(b64url(sigB64), (c) => c.charCodeAt(0));

    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, data);
  } catch {
    return false;
  }
}
