"""
Merges scraped corporation ward member data into ward_members.json.

Corporation SEC district → LSGD + secLsgCode mapping:
  2  → Kannur Corporation    → secLsgCode: C13006 (has real code)
  4  → Kozhikode Corporation → secLsgCode: null   (use LSGD key)
  7  → Thrissur Corporation  → secLsgCode: C08004 (has real code)
  8  → Kochi Corporation     → secLsgCode: null   (use LSGD key)
  13 → Kollam Corporation    → secLsgCode: null   (use LSGD key)
  14 → TVM Corporation       → secLsgCode: null   (use LSGD key)

For corps with real secLsgCode, store as "{secLsgCode}|{wardNo}" in district idx 1.
For corps without, store as "LSGD:{lsgdName}|{wardNo}" with a special district idx.
"""

import json, os

CORP_RAW = "/tmp/corp_wards_raw.json"
WARD_MEMBERS = os.path.join(os.path.dirname(__file__), "ward_members.json")

# SEC district number → (LSGD name, secLsgCode or None)
SEC_DIST_MAP = {
    2:  ("Kannur",            "C13006"),
    4:  ("Kozhikode",         None),
    7:  ("Thrissur",          "C08004"),
    8:  ("Cochin",            None),
    13: ("Kollam",            None),
    14: ("Thiruvananthapuram", None),
}

def main():
    with open(CORP_RAW) as f:
        raw = json.load(f)

    existing = json.load(open(WARD_MEMBERS))
    added = 0

    for endpoint, wards in raw.items():
        # endpoint = "/public/wyrlb/14/C"
        parts = endpoint.strip("/").split("/")
        # parts = ["public", "wyrlb", "14", "C"]
        sec_dist = int(parts[2])
        lsgd_name, sec_lsg_code = SEC_DIST_MAP[sec_dist]

        for ward in wards:
            ward_no = ward["wardNo"].lstrip("0") or "0"
            padded = str(ward["wardNo"])  # keep original padding

            if sec_lsg_code:
                key = f"1|{sec_lsg_code}|{padded}"
            else:
                key = f"0|LSGD:{lsgd_name}|{padded}"

            existing[key] = {
                "memberName": ward.get("memberName", ""),
                "phone": None,
                "party": ward.get("party", "") or "",
                "wardName": ward.get("wardName", ""),
                "lsgiName": lsgd_name,
                "lsgiCode": sec_lsg_code or f"LSGD:{lsgd_name}",
            }
            added += 1

    with open(WARD_MEMBERS, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, separators=(",", ":"))

    print(f"Added {added} corporation ward entries.")
    print(f"Total entries: {len(existing)}")
    print(f"Written to: {WARD_MEMBERS}")

if __name__ == "__main__":
    main()
