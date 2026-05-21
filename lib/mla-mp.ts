import mlasData from "@/data/mlas.json";
import mpsData from "@/data/mps.json";

export interface PoliticianInfo {
  name: string;
  party: string;
  phone: string | null;
  email?: string | null;
}

const mlas: Record<string, PoliticianInfo> = mlasData as any;
const mps: Record<string, PoliticianInfo> = mpsData as any;

export function getMla(acNo: number | string | undefined | null): PoliticianInfo | null {
  if (acNo == null) return null;
  return mlas[String(acNo)] ?? null;
}

export function getMp(pcName: string | undefined | null): PoliticianInfo | null {
  if (!pcName) return null;
  return mps[pcName] ?? null;
}
