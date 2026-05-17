import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ features: [] });

  const res = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`,
    { headers: { "User-Agent": "kuzhiyundo.com" } },
  );

  if (!res.ok) return NextResponse.json({ features: [] }, { status: res.status });

  const data = await res.json();
  return NextResponse.json(data);
}
