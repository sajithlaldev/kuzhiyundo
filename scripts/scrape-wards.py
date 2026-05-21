"""
Scrapes all Kerala ward boundaries from wardmap.ksmart.live and writes
KL_Wards_indexed.fgb — an indexed FlatGeobuf that supports HTTP range/bbox queries.

Also fetches the LSGI GeoJSON from Open Data Kerala and embeds secLsgCode,
lsgdLabel, and lsgCode into each ward feature, so the constituency API no longer
needs a separate LSGI GeoJSON lookup.

Requirements:
    pip3 install fiona shapely

Run:
    python3 scripts/scrape-wards.py

Output:
    scripts/KL_Wards_indexed.fgb

After generation, upload to GitHub releases and update WARDS_FGB_URL in
app/api/constituency/route.ts.
"""

import json, urllib.request, urllib.parse, concurrent.futures, os
import fiona
from fiona.crs import from_epsg
from shapely.geometry import shape

MAPPING_URL = "https://wardmap.ksmart.live/files/district_localbody_mapping.json"
LSGI_URL = "https://raw.githubusercontent.com/opendatakerala/kerala-assembly-map/main/KLA_2026_Review/LSGI_2025.geojson"
CONCURRENCY = 12
OUT = os.path.join(os.path.dirname(__file__), "KL_Wards_indexed.fgb")


def fetch_json(url, timeout=30):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return json.loads(r.read())


def build_lsgi_lookup(lsgi_features):
    """Build LSGD-name → {secLsgCode, lsgdLabel, lsgCode} lookup.

    For LSGD names with multiple entries, prefer the one with a non-null
    secLsgCode (SEC_Kerala_code).
    """
    lookup = {}
    for f in lsgi_features:
        p = f.get("properties") or {}
        name = p.get("LSGD")
        if not name:
            continue
        sec = p.get("SEC_Kerala_code")
        entry = {
            "secLsgCode": sec,
            "lsgdLabel": p.get("English Label"),
            "lsgCode": p.get("LSG_code"),
        }
        # Keep first seen; overwrite if current entry has a sec code and stored doesn't
        existing = lookup.get(name)
        if existing is None or (sec and not existing["secLsgCode"]):
            lookup[name] = entry
    return lookup


def fetch_one(entry):
    try:
        fc = fetch_json(entry["url"])
        feats = []
        for f in fc.get("features", []):
            if f.get("geometry") is None:
                continue
            p = f.get("properties", {}) or {}
            feats.append({
                "type": "Feature",
                "geometry": f["geometry"],
                "properties": {
                    "Ward_No": p.get("Ward_No"),
                    "Ward_Name": p.get("Ward_Name"),
                    "District": entry["district"],
                    "LSGD": entry["localBody"],
                    "Lsgd_Type": p.get("Lsgd_Type"),
                },
            })
        return feats, None
    except Exception as e:
        return [], f"{entry['district']}/{entry['localBody']}: {e}"


def main():
    print("Fetching LSGI GeoJSON for secLsgCode lookup...")
    lsgi_data = fetch_json(LSGI_URL)
    lsgi_lookup = build_lsgi_lookup(lsgi_data.get("features", []))
    print(f"  {len(lsgi_lookup)} LSGD entries indexed "
          f"({sum(1 for v in lsgi_lookup.values() if v['secLsgCode'])} with secLsgCode)")

    print("Fetching district-localbody mapping...")
    mapping = fetch_json(MAPPING_URL)

    entries = []
    for district, bodies in mapping.items():
        for b in bodies:
            hp = b.get("HTMLPage")
            if hp:
                url = urllib.parse.quote(hp.replace(".html", ".json"), safe=":/.")
                entries.append({"district": district, "localBody": b["LocalBody"], "url": url})

    print(f"Fetching {len(entries)} localbodies with {CONCURRENCY} workers...")
    all_features = []
    failed = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
        futures = {ex.submit(fetch_one, e): e for e in entries}
        done = 0
        for fut in concurrent.futures.as_completed(futures):
            feats, err = fut.result()
            all_features.extend(feats)
            if err:
                failed.append(err)
            done += 1
            if done % 100 == 0 or done == len(entries):
                print(f"  {done}/{len(entries)} done, {len(all_features)} wards", flush=True)

    print(f"\nTotal wards: {len(all_features)}, Failed: {len(failed)}")
    if failed:
        print("Failures:")
        for f in failed:
            print(" ", f)

    schema = {
        "geometry": "Polygon",
        "properties": {
            "Ward_No": "int",
            "Ward_Name": "str",
            "District": "str",
            "LSGD": "str",
            "Lsgd_Type": "str",
            "Sec_Lsg_Code": "str",
            "Lsgd_Label": "str",
            "Lsg_Code": "str",
        },
    }

    print(f"Writing indexed FGB to {OUT}...")
    written = skipped = unmatched = 0
    with fiona.open(OUT, "w", driver="FlatGeobuf", schema=schema, crs=from_epsg(4326)) as dst:
        for feat in all_features:
            try:
                geom = shape(feat["geometry"])
                if not geom.is_valid:
                    geom = geom.buffer(0)
                p = feat["properties"]
                lsgd_name = p.get("LSGD")
                lsgi = lsgi_lookup.get(lsgd_name, {})
                if not lsgi:
                    unmatched += 1
                dst.write({
                    "type": "Feature",
                    "geometry": geom.__geo_interface__,
                    "properties": {
                        "Ward_No": int(p["Ward_No"]) if p.get("Ward_No") is not None else None,
                        "Ward_Name": str(p["Ward_Name"]) if p.get("Ward_Name") else None,
                        "District": p.get("District"),
                        "LSGD": lsgd_name,
                        "Lsgd_Type": p.get("Lsgd_Type") or lsgi.get("lsgdType"),
                        "Sec_Lsg_Code": lsgi.get("secLsgCode"),
                        "Lsgd_Label": lsgi.get("lsgdLabel"),
                        "Lsg_Code": lsgi.get("lsgCode"),
                    },
                })
                written += 1
            except Exception:
                skipped += 1

    mb = os.path.getsize(OUT) / 1024 / 1024
    print(f"Done. Written: {written}, Skipped: {skipped}, Unmatched LSGD: {unmatched}, Size: {mb:.1f} MB")
    print(f"\nNext: upload {OUT} to GitHub releases and update WARDS_FGB_URL in route.ts")


if __name__ == "__main__":
    main()
