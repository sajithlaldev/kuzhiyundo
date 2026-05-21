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
  secLsgCode: string | null | undefined,
  wardNo: string | number,
  lsgd?: string | null,
): Promise<WardMember | null> {
  try {
    const params = new URLSearchParams({ wardNo: String(wardNo) });
    if (secLsgCode) params.set("secLsgCode", secLsgCode);
    if (lsgd) params.set("lsgd", lsgd);
    const res = await fetchWithAppCheck(`/api/ward-member?${params}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
