import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json([]);

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
    { headers: { "User-Agent": "kuzhiyundo.com" } },
  );

  if (!res.ok) return NextResponse.json([]);

  const data = await res.json();
  return NextResponse.json(data);
}
