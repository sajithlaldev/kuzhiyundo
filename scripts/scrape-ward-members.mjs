/**
 * Scrapes elected ward member details (name, phone, party) from SEC Kerala.
 * Run once: node scripts/scrape-ward-members.mjs
 * Output: scripts/ward_members.json
 *
 * Key structure: "DISTRICT|LSGI_CODE|WARD_NO" → { memberName, phone, party, reservation, wardName, lsgiName }
 * Match against your existing ward data using district + lsgCode (SEC LSGI code) + wardNo.
 */

import { writeFileSync, existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dir, "ward_members.json");
const CHECKPOINT_PATH = join(__dir, "ward_members_checkpoint.json");

const BASE = "https://sec.kerala.gov.in/public";
const TYPES = ["G", "M", "C", "B", "D"]; // GP, Municipality, Corporation, Block Panchayat, District Panchayat
const DISTRICTS = Array.from({ length: 14 }, (_, i) => i + 1);
const CONCURRENCY = 6;
const DELAY_MS = 200;
const RETRY = 3;

async function fetchHtml(url, attempt = 1) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ward-scraper/1.0)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    if (attempt < RETRY) {
      await sleep(DELAY_MS * attempt * 2);
      return fetchHtml(url, attempt + 1);
    }
    return null;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Extract all { lsgiId, lsgiCode, lsgiName } from /wyrlb/{district}/{type}
function parseLsgiList(html) {
  const results = [];
  const re = /href="\/public\/wyrw\/(\d+)"[^>]*>\s*([\w\d]+)\s*-\s*([^<]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    results.push({
      lsgiId: m[1].trim(),
      lsgiCode: m[2].trim(),
      lsgiName: m[3].trim(),
    });
  }
  return results;
}

// Extract { wardNo, wardName, memberId } rows from /wyrw/{lsgi_id}
function parseWardMembers(html) {
  const results = [];
  // Each row: <tr> ... ward number ... ward name ... href="/public/wyr/view/{id}">{name}</a> ... party ... reservation
  const rowRe = /<tr[\s\S]*?<\/tr>/gi;
  const rows = html.match(rowRe) || [];
  for (const row of rows) {
    const memberMatch = row.match(/href="\/public\/wyr\/view\/(\d+)"/);
    if (!memberMatch) continue;
    const memberId = memberMatch[1];

    const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      m[1].replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ")
    );

    if (tds.length < 2) continue;
    const wardNo = tds[0].replace(/\D/g, "").padStart(3, "0");
    const wardName = tds[1] || "";

    results.push({ wardNo, wardName, memberId });
  }
  return results;
}

// Extract member details from /wyr/view/{member_id}
function parseMemberProfile(html) {
  const get = (re) => {
    const m = html.match(re);
    return m ? m[1].replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ") : null;
  };

  // Phone: appears after bi-telephone-fill icon inside the personal card
  const phoneMatch = html.match(
    /bi-telephone-fill text-success[^<]*<\/i>\s*<span[^>]*>Phone:<\/span>\s*<strong>([\d\s]+)<\/strong>/
  );
  const phone = phoneMatch ? phoneMatch[1].trim() : null;

  // Party: plain text node near the party section
  const partyMatch = html.match(/ward-header[\s\S]{0,300}?>([\w\s]+Party[\w\s]*)</);
  const party = partyMatch ? partyMatch[1].trim() : get(/Party[\s\S]{0,100}?<strong[^>]*>([^<]+)<\/strong>/i);

  // District and LSGI name from ward section
  const districtMatch = html.match(/<strong class="fs-5">([A-Z\s]+)<\/strong>/);
  const district = districtMatch ? districtMatch[1].trim() : null;

  return { phone, party, district };
}

async function runBatch(tasks, concurrency) {
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const task = tasks[idx++];
      await task();
      await sleep(DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}

async function main() {
  // Load checkpoint if exists
  let checkpoint = existsSync(CHECKPOINT_PATH)
    ? JSON.parse(readFileSync(CHECKPOINT_PATH, "utf8"))
    : { processed: {}, members: {} };

  const { processed, members } = checkpoint;

  console.log("Phase 1: Collecting LSGI list across all districts and types…");

  const allLsgis = [];
  for (const district of DISTRICTS) {
    for (const type of TYPES) {
      const html = await fetchHtml(`${BASE}/wyrlb/${district}/${type}`);
      if (!html) continue;
      const list = parseLsgiList(html);
      list.forEach((l) => allLsgis.push({ ...l, district, type }));
      await sleep(DELAY_MS);
    }
  }
  console.log(`Found ${allLsgis.length} LSGIs.`);

  console.log("Phase 2: Collecting ward member IDs from each LSGI…");

  const allWards = []; // { lsgiId, lsgiCode, lsgiName, district, type, wardNo, wardName, memberId }
  let lsgiDone = 0;

  const lsgiTasks = allLsgis.map((lsgi) => async () => {
    if (processed[lsgi.lsgiId]) {
      // already done — restore from checkpoint
      const saved = Object.values(members).filter((m) => m.lsgiId === lsgi.lsgiId);
      allWards.push(...saved.map((m) => ({ ...lsgi, ...m })));
      lsgiDone++;
      return;
    }
    const html = await fetchHtml(`${BASE}/wyrw/${lsgi.lsgiId}`);
    if (!html) { lsgiDone++; return; }
    const wards = parseWardMembers(html);
    wards.forEach((w) => allWards.push({ ...lsgi, ...w }));
    processed[lsgi.lsgiId] = true;
    lsgiDone++;
    if (lsgiDone % 100 === 0) {
      process.stdout.write(`\r  ${lsgiDone}/${allLsgis.length} LSGIs, ${allWards.length} wards`);
      writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint, null, 2));
    }
  });

  await runBatch(lsgiTasks, CONCURRENCY);
  console.log(`\nTotal ward entries: ${allWards.length}`);

  console.log("Phase 3: Fetching member profiles (name, phone, party)…");

  let memberDone = 0;
  const memberTasks = allWards
    .filter((w) => w.memberId && !members[w.memberId])
    .map((ward) => async () => {
      const html = await fetchHtml(`${BASE}/wyr/view/${ward.memberId}`);
      if (!html) { memberDone++; return; }
      const profile = parseMemberProfile(html);

      // Extract name from the page (appears in member card heading)
      const nameMatch = html.match(/class="member-name[^"]*"[^>]*>([\s\S]*?)<\/h/i) ||
        html.match(/<h[23][^>]*class="[^"]*fw-bold[^"]*"[^>]*>([\s\S]*?)<\/h/i);
      const memberName = nameMatch
        ? nameMatch[1].replace(/<[^>]+>/g, "").trim()
        : null;

      members[ward.memberId] = {
        memberId: ward.memberId,
        lsgiId: ward.lsgiId,
        memberName,
        phone: profile.phone,
        party: profile.party,
      };

      memberDone++;
      if (memberDone % 200 === 0) {
        process.stdout.write(`\r  ${memberDone} profiles fetched`);
        writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint, null, 2));
      }
    });

  await runBatch(memberTasks, CONCURRENCY);
  console.log(`\nProfiles fetched: ${Object.keys(members).length}`);

  // Build final lookup: "DISTRICT|LSGI_CODE|WARD_NO" → member info
  console.log("Building lookup index…");
  const lookup = {};
  for (const ward of allWards) {
    if (!ward.memberId) continue;
    const profile = members[ward.memberId] || {};
    const key = `${ward.district}|${ward.lsgiCode}|${ward.wardNo}`;
    lookup[key] = {
      memberName: profile.memberName || null,
      phone: profile.phone || null,
      party: profile.party || null,
      wardName: ward.wardName || null,
      lsgiName: ward.lsgiName || null,
      lsgiCode: ward.lsgiCode,
    };
  }

  writeFileSync(OUT_PATH, JSON.stringify(lookup, null, 2));
  writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint, null, 2));

  console.log(`Done. ${Object.keys(lookup).length} ward entries written to ${OUT_PATH}`);
  console.log("Next: commit ward_members.json to a GitHub release and add a /api/ward-member lookup route.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
