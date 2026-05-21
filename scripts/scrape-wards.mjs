/**
 * Scrapes all Kerala ward boundaries from wardmap.ksmart.live and writes KL_Wards.fgb.
 * Run once: node scripts/scrape-wards.mjs
 * Output: scripts/KL_Wards.fgb  (host this on Firebase Storage / CDN and update WARDS_FGB_URL)
 */

import { writeFileSync } from "fs";
import { geojson as fgb } from "flatgeobuf";

const MAPPING_URL =
  "https://wardmap.ksmart.live/files/district_localbody_mapping.json";
const OUT_PATH = new URL("./KL_Wards.fgb", import.meta.url).pathname;
const CONCURRENCY = 8;
const RETRY = 3;
const DELAY_MS = 150;

async function fetchJson(url, attempt = 1) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (attempt < RETRY) {
      await new Promise((r) => setTimeout(r, DELAY_MS * attempt));
      return fetchJson(url, attempt + 1);
    }
    throw err;
  }
}


async function runBatch(tasks, concurrency) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

async function main() {
  console.log("Fetching district–localbody mapping…");
  const mapping = await fetchJson(MAPPING_URL);

  // Build flat list of { district, localBody, url }
  // HTMLPage is already the full URL — just swap .html → .json
  const entries = [];
  for (const [district, bodies] of Object.entries(mapping)) {
    for (const { LocalBody, HTMLPage } of bodies) {
      if (!HTMLPage) {
        console.warn(`  Skipping — no HTMLPage: ${district}/${LocalBody}`);
        continue;
      }
      const url = HTMLPage.replace(/\.html$/i, ".json");
      entries.push({ district, localBody: LocalBody, url });
    }
  }
  console.log(`Found ${entries.length} localbodies across ${Object.keys(mapping).length} districts.`);

  // Fetch all ward GeoJSONs concurrently
  let done = 0;
  const allFeatures = [];

  const tasks = entries.map((entry) => async () => {
    try {
      const fc = await fetchJson(entry.url);
      const features = (fc.features ?? []).map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          District: entry.district,
          LSGD: entry.localBody,
        },
      }));
      allFeatures.push(...features);
    } catch (err) {
      console.warn(`  FAILED ${entry.district}/${entry.localBody}: ${err.message}`);
    }
    done++;
    if (done % 50 === 0 || done === entries.length) {
      process.stdout.write(`\r  ${done}/${entries.length} localbodies fetched, ${allFeatures.length} wards collected`);
    }
  });

  await runBatch(tasks, CONCURRENCY);
  console.log("\nAll fetches done.");

  // Merge into FeatureCollection
  const fc = { type: "FeatureCollection", features: allFeatures };
  console.log(`Total wards: ${allFeatures.length}. Serializing to FlatGeobuf…`);

  const buf = fgb.serialize(fc);
  writeFileSync(OUT_PATH, Buffer.from(buf));
  const mb = (buf.byteLength / 1024 / 1024).toFixed(1);
  console.log(`Written: ${OUT_PATH} (${mb} MB)`);
  console.log("Next step: host KL_Wards.fgb on Firebase Storage / CDN and update WARDS_FGB_URL in route.ts.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
