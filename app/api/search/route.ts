import { NextRequest, NextResponse } from "next/server";
import { verifyAppCheckToken } from "@/lib/appcheck-verify";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const appCheckToken = req.headers.get("X-Firebase-AppCheck");
  if (!appCheckToken || !(await verifyAppCheckToken(appCheckToken))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json([]);

  const apiKey = process.env.OLA_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json([]);

  const res = await fetch(
    `https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(q)}&api_key=${apiKey}`,
  );

  if (!res.ok) return NextResponse.json([]);

  const data = await res.json();
  const predictions: any[] = data.predictions ?? [];

  // Normalize to the shape the search component expects
  const results = predictions.map((p: any) => ({
    display_name: p.description,
    name: p.structured_formatting?.main_text,
    lat: String(p.geometry?.location?.lat ?? ""),
    lon: String(p.geometry?.location?.lng ?? ""),
    address: {
      road: p.terms?.[0]?.value,
      city: p.terms?.[1]?.value,
      state: p.terms?.[2]?.value,
      country: p.terms?.[3]?.value,
    },
  }));

  return NextResponse.json(results);
}
