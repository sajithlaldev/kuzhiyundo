import { NextRequest, NextResponse } from "next/server";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import { verifyAppCheckToken } from "@/lib/appcheck-verify";

export const runtime = "edge";

const AC_URL =
  "https://raw.githubusercontent.com/opendatakerala/kerala-assembly-map/main/KLA_2026_Review/KLA_AC_2026_V2.geojson";
const LSGI_URL =
  "https://raw.githubusercontent.com/opendatakerala/kerala-assembly-map/main/KLA_2026_Review/LSGI_2025.geojson";

let _acFeatures: any[] | null = null;
let _lsgiFeatures: any[] | null = null;

async function getFeatures() {
  if (!_acFeatures || !_lsgiFeatures) {
    const [acRes, lsgiRes] = await Promise.all([
      fetch(AC_URL),
      fetch(LSGI_URL),
    ]);
    if (!acRes.ok)   throw new Error("Failed to fetch AC GeoJSON");
    if (!lsgiRes.ok) throw new Error("Failed to fetch LSGI GeoJSON");
    const [acData, lsgiData] = await Promise.all([acRes.json(), lsgiRes.json()]);
    _acFeatures   = acData.features;
    _lsgiFeatures = lsgiData.features;
  }
  return { acFeatures: _acFeatures!, lsgiFeatures: _lsgiFeatures! };
}

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
    const { acFeatures, lsgiFeatures } = await getFeatures();
    const pt = point([lng, lat]);

    let acResult: any = null;
    for (const feature of acFeatures) {
      if (booleanPointInPolygon(pt, feature)) {
        const p = feature.properties;
        acResult = {
          acName:   p.AC_NAME,
          acNo:     p.AC_NO,
          district: p.District,
          pcName:   p.PC_NAME,
        };
        break;
      }
    }

    let lsgiResult: any = null;
    for (const feature of lsgiFeatures) {
      if (booleanPointInPolygon(pt, feature)) {
        const p = feature.properties;
        lsgiResult = {
          lsgd:      p.LSGD,
          lsgdType:  p.Lsgd_Type,
          lsgdLabel: p["English Label"],
          lsgCode:   p.LSG_code,
        };
        break;
      }
    }

    if (!acResult && !lsgiResult) return NextResponse.json(null);

    return NextResponse.json(
      { ...acResult, ...lsgiResult },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  } catch (e) {
    console.error("Constituency lookup error:", e);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
