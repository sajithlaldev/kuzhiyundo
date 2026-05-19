import { NextRequest, NextResponse } from "next/server";
import { verifyAppCheckToken } from "@/lib/appcheck-verify";

export const runtime = "edge";

const AUTHORITY_MAP: Record<string, string> = {
  motorway: "national",
  motorway_link: "national",
  trunk: "national",
  trunk_link: "national",
  primary: "national",
  primary_link: "national",
  secondary: "pwd",
  secondary_link: "pwd",
  tertiary: "lsgd",
  tertiary_link: "lsgd",
};

export async function GET(req: NextRequest) {
  const appCheckToken = req.headers.get("X-Firebase-AppCheck");
  if (!appCheckToken || !(await verifyAppCheckToken(appCheckToken))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const query = `[out:json];way(around:30,${lat},${lng})[highway];out tags 1;`;
    const res = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
    );
    if (!res.ok) return NextResponse.json(null);

    const data = await res.json();
    if (!data.elements?.length) return NextResponse.json(null);

    const highwayTag: string = data.elements[0].tags?.highway ?? "unclassified";
    const roadAuthority = AUTHORITY_MAP[highwayTag] ?? "ward";

    return NextResponse.json(
      { highwayTag, roadAuthority },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  } catch (e) {
    console.error("Road classification error:", e);
    return NextResponse.json(null);
  }
}
