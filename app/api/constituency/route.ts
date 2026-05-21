import { NextRequest, NextResponse } from "next/server";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import { geojson as fgb } from "flatgeobuf";
import { verifyAppCheckToken } from "@/lib/appcheck-verify";
export const runtime = "edge";
const AC_URL =
  "https://raw.githubusercontent.com/opendatakerala/kerala-assembly-map/main/KLA_2026_Review/KLA_AC_2026_V2.geojson";
const LSGI_URL =
  "https://raw.githubusercontent.com/opendatakerala/kerala-assembly-map/main/KLA_2026_Review/LSGI_2025.geojson";
const WARDS_FGB_URL =
  "https://github.com/sajithlaldev/kuzhiyundo/releases/download/v1.0-wards/KL_Wards.fgb";

let _acFeatures: any[] | null = null;
let _lsgiFeatures: any[] | null = null;

async function getFeatures() {
  if (!_acFeatures || !_lsgiFeatures) {
    const [acRes, lsgiRes] = await Promise.all([
      fetch(AC_URL),
      fetch(LSGI_URL),
    ]);
    if (!acRes.ok) throw new Error("Failed to fetch AC GeoJSON");
    if (!lsgiRes.ok) throw new Error("Failed to fetch LSGI GeoJSON");
    const [acData, lsgiData] = await Promise.all([acRes.json(), lsgiRes.json()]);
    _acFeatures = acData.features;
    _lsgiFeatures = lsgiData.features;
  }
  return { acFeatures: _acFeatures!, lsgiFeatures: _lsgiFeatures! };
}

async function getWard(lat: number, lng: number): Promise<{ wardNo: string | number; wardName: string } | null> {
  const pad = 0.01;
  const rect = { minX: lng - pad, minY: lat - pad, maxX: lng + pad, maxY: lat + pad };
  const pt = point([lng, lat]);

  try {
    for await (const feature of fgb.deserialize(WARDS_FGB_URL, rect) as AsyncIterable<any>) {
      if (booleanPointInPolygon(pt, feature)) {
        const p = feature.properties;
        return { wardNo: p.Ward_No, wardName: p.Ward_Name };
      }
    }
  } catch {
    // ward lookup is best-effort — don't fail the whole request
  }
  return null;
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
    const [{ acFeatures, lsgiFeatures }, wardResult] = await Promise.all([
      getFeatures(),
      getWard(lat, lng),
    ]);
    const pt = point([lng, lat]);

    let acResult: any = null;
    for (const feature of acFeatures) {
      if (booleanPointInPolygon(pt, feature)) {
        const p = feature.properties;
        acResult = {
          acName: p.AC_NAME,
          acNo: p.AC_NO,
          district: p.District,
          pcName: p.PC_NAME,
        };
        break;
      }
    }

    let lsgiResult: any = null;
    for (const feature of lsgiFeatures) {
      if (booleanPointInPolygon(pt, feature)) {
        const p = feature.properties;
        lsgiResult = {
          lsgd: p.LSGD,
          lsgdType: p.Lsgd_Type,
          lsgdLabel: p["English Label"],
          lsgCode: p.LSG_code,
        };
        break;
      }
    }

    if (!acResult && !lsgiResult) return NextResponse.json(null);

    return NextResponse.json(
      { ...acResult, ...lsgiResult, ...wardResult },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  } catch (e) {
    console.error("Constituency lookup error:", e);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
