#!/usr/bin/env node
/**
 * Scrapes MLA phone/email from niyamasabha.nic.in/index.php/content/member_contacts
 * and patches data/mlas.json in place.
 *
 * Usage:
 *   node scripts/update-mla-contacts.mjs
 *
 * Run this whenever niyamasabha.nic.in updates to pick up new contacts.
 * Commit the updated data/mlas.json afterwards.
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTACTS_URL =
  "https://niyamasabha.nic.in/index.php/content/member_contacts";
const MLAS_PATH = resolve(__dirname, "../data/mlas.json");

function extractPhone(cell) {
  const m = cell.match(/[6-9]\d{9}/);
  return m ? m[0] : null;
}

function extractEmail(cell) {
  const m = cell.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return m ? m[0].toLowerCase() : null;
}

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

// Collapse repeated vowels (steephen→stephn) to tolerate transliteration variants
function normCollapse(s) {
  return normalize(s).replace(/([aeiou])\1+/g, "$1");
}

async function main() {
  console.log("Fetching contacts from niyamasabha.nic.in …");
  const res = await fetch(CONTACTS_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // Extract <tr> rows
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const contacts = [];
  let m;
  while ((m = trRe.exec(html)) !== null) {
    const cells = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let td;
    while ((td = tdRe.exec(m[1])) !== null) {
      cells.push(td[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    }
    if (cells.length < 4) continue;
    // cells: [idx, name(constituency), address, phone-block, email]
    const phone = extractPhone(cells[3]);
    const email = extractEmail(cells[4] ?? "");
    if (!phone && !email) continue;

    // Extract just the name (before the constituency in parens)
    const nameMatch = cells[1].match(/^([^(]+)/);
    const name = nameMatch ? nameMatch[1].trim() : cells[1];
    contacts.push({ name, phone, email });
  }

  console.log(`Found ${contacts.length} rows with contact data.`);

  const mlas = JSON.parse(readFileSync(MLAS_PATH, "utf8"));
  let updated = 0;

  const unmatched = [];
  for (const c of contacts) {
    const normContact = normalize(c.name);
    const collContact = normCollapse(c.name);
    let matched = false;
    for (const [, mla] of Object.entries(mlas)) {
      const normMla = normalize(mla.name);
      const collMla = normCollapse(mla.name);
      if (
        normMla.includes(normContact) ||
        normContact.includes(normMla) ||
        normMla.startsWith(normContact.substring(0, 8)) ||
        normContact.startsWith(normMla.substring(0, 8)) ||
        collMla.includes(collContact) ||
        collContact.includes(collMla) ||
        collMla.startsWith(collContact.substring(0, 7)) ||
        collContact.startsWith(collMla.substring(0, 7))
      ) {
        let changed = false;
        if (c.phone && !mla.phone) { mla.phone = c.phone; changed = true; }
        if (c.email && !mla.email) { mla.email = c.email; changed = true; }
        if (changed) {
          console.log(`  Updated: ${mla.name} — phone: ${mla.phone}, email: ${mla.email}`);
          updated++;
        }
        matched = true;
        break;
      }
    }
    if (!matched) unmatched.push(c.name);
  }
  if (unmatched.length) {
    console.log(`\nUnmatched contacts (check spelling):\n${unmatched.map(n => `  - ${n}`).join("\n")}`);
  }

  writeFileSync(MLAS_PATH, JSON.stringify(mlas, null, 2));
  console.log(`\nDone — ${updated} MLAs updated. data/mlas.json saved.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
