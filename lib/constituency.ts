import { fetchWithAppCheck } from "./appcheck-fetch";

export interface ConstituencyInfo {
  acName: string;
  acNo: number;
  district: string;
  pcName: string;
  lsgd?: string;
  lsgdType?: string;
  lsgdLabel?: string;
  lsgCode?: string;
}

export async function getConstituency(
  lat: number,
  lng: number,
): Promise<ConstituencyInfo | null> {
  try {
    const res = await fetchWithAppCheck(`/api/constituency?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
