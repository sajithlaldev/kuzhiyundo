import { NextRequest, NextResponse } from "next/server";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import { geojson as fgb } from "flatgeobuf";
import { verifyAppCheckToken } from "@/lib/appcheck-verify";
export const runtime = "edge";

const AC_URL =
  "https://raw.githubusercontent.com/opendatakerala/kerala-assembly-map/main/KLA_2026_Review/KLA_AC_2026_V2.geojson";
const WARDS_FGB_URL =
  "https://github.com/sajithlaldev/kuzhiyundo/releases/download/v1.2-wards/KL_Wards_indexed.fgb";

let _acFeatures: any[] | null = null;

async function getAcFeatures() {
  if (!_acFeatures) {
    const res = await fetch(AC_URL);
    if (!res.ok) throw new Error("Failed to fetch AC GeoJSON");
    const data = await res.json();
    _acFeatures = data.features;
  }
  return _acFeatures!;
}

async function getWard(lat: number, lng: number): Promise<{
  wardNo: string | number | null;
  wardName: string | null;
  lsgd: string | null;
  lsgdType: string | null;
  lsgdLabel: string | null;
  lsgCode: string | null;
  secLsgCode: string | null;
} | null> {
  const pad = 0.01;
  const rect = { minX: lng - pad, minY: lat - pad, maxX: lng + pad, maxY: lat + pad };
  const pt = point([lng, lat]);

  try {
    for await (const feature of fgb.deserialize(WARDS_FGB_URL, rect) as AsyncIterable<any>) {
      if (booleanPointInPolygon(pt, feature)) {
        const p = feature.properties;
        return {
          wardNo: p.Ward_No,
          wardName: p.Ward_Name,
          lsgd: p.LSGD ?? null,
          lsgdType: p.Lsgd_Type ?? null,
          lsgdLabel: p.Lsgd_Label ?? null,
          lsgCode: p.Lsg_Code ?? null,
          secLsgCode: p.Sec_Lsg_Code ?? null,
        };
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
    const [acFeatures, wardResult] = await Promise.all([
      getAcFeatures(),
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

    if (!acResult && !wardResult) return NextResponse.json(null);

    return NextResponse.json(
      { ...acResult, ...wardResult },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  } catch (e) {
    console.error("Constituency lookup error:", e);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
