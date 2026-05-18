import { NextRequest, NextResponse } from "next/server";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";

export const runtime = "nodejs";

const GEOJSON_URL =
  "https://raw.githubusercontent.com/opendatakerala/kerala-assembly-map/main/KLA_2026_Review/KLA_AC_2026_V2.geojson";

// Module-level cache — persists across requests within the same server instance
let _features: any[] | null = null;

async function getFeatures() {
  if (_features) return _features;
  const res = await fetch(GEOJSON_URL);
  if (!res.ok) throw new Error("Failed to fetch AC GeoJSON");
  const data = await res.json();
  _features = data.features;
  return _features;
}

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const features = await getFeatures();
    const pt = point([lng, lat]);

    for (const feature of features!) {
      if (booleanPointInPolygon(pt, feature)) {
        const p = feature.properties;
        return NextResponse.json(
          {
            acName:   p.AC_NAME,
            acNo:     p.AC_NO,
            district: p.District,
            pcName:   p.PC_NAME,
          },
          { headers: { "Cache-Control": "public, max-age=86400" } },
        );
      }
    }

    return NextResponse.json(null);
  } catch (e) {
    console.error("Constituency lookup error:", e);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
