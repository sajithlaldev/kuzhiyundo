import { NextRequest, NextResponse } from "next/server";
import { verifyAppCheckToken } from "@/lib/appcheck-verify";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const appCheckToken = req.headers.get("X-Firebase-AppCheck");
  if (!appCheckToken || !(await verifyAppCheckToken(appCheckToken))) {
    // Log suspicious access but don't block — enforcement can be tightened later
    console.warn("search: missing or invalid App Check token");
  }

  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json([]);

  const apiKey = process.env.OLA_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json([]);

  const res = await fetch(
    `https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(q)}&api_key=${apiKey}`,
    { headers: { Origin: "https://kuzhiyundo.com" } },
  );

  if (!res.ok) return NextResponse.json([]);

  const data = await res.json();
  const predictions: any[] = data.predictions ?? [];

  const results = predictions.map((p: any) => ({
    display_name: p.description,
    name: p.structured_formatting?.main_text,
    subtitle: p.structured_formatting?.secondary_text,
    lat: String(p.geometry?.location?.lat ?? ""),
    lon: String(p.geometry?.location?.lng ?? ""),
  }));

  return NextResponse.json(results);
}
