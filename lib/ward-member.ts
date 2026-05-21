import { fetchWithAppCheck } from "./appcheck-fetch";

export interface WardMember {
  memberName: string | null;
  phone: string | null;
  party: string | null;
  wardName: string | null;
  lsgiName: string | null;
  lsgiCode: string;
}

export async function getWardMember(
  secLsgCode: string,
  wardNo: string | number,
): Promise<WardMember | null> {
  try {
    const res = await fetchWithAppCheck(
      `/api/ward-member?secLsgCode=${encodeURIComponent(secLsgCode)}&wardNo=${encodeURIComponent(wardNo)}`,
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
