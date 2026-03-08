'use strict';

const fs   = require('fs');
const path = require('path');

// ── Zone update helpers ───────────────────────────────────────────────────────

/**
 * Convert any residual markdown bold/italic syntax to HTML tags.
 */
function sanitizeMarkdown(html) {
  if (!html) return html;
  let out = html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
  return out;
}

const ZONE_RE = /<!-- @ai-zone:([\w-]+) -->([\s\S]{0,10000}?)<!-- @\/ai-zone:\1 -->/g;
const VALID_ZONE_ID = /^[\w-]+$/;

/**
 * Scan all sections/*.html files and return a map of:
 *   { zoneId → [{ filePath, outerMatch, innerContent }, ...] }
 */
function discoverZones(baseDir) {
  const zones      = {};
  const sectionsDir = path.join(baseDir, 'sections');
  for (const file of fs.readdirSync(sectionsDir)) {
    if (!file.endsWith('.html')) continue;
    const filePath = path.join(sectionsDir, file);
    const content  = fs.readFileSync(filePath, 'utf8');
    ZONE_RE.lastIndex = 0;
    let m;
    while ((m = ZONE_RE.exec(content)) !== null) {
      if (!zones[m[1]]) zones[m[1]] = [];
      zones[m[1]].push({ filePath, outerMatch: m[0], innerContent: m[2] });
    }
  }
  return zones;
}

const ZONES_SYSTEM_PROMPT = `\
You are the editor of the Iran Crisis Report dashboard.
Update specific HTML zones in section files with the latest news from the web
search results provided.

Return a JSON object where:
- Each key is a zone ID from the list below
- The value is the updated inner HTML/text content, OR null if no update is needed

General rules:
- Return null for any zone where the search results contain no clearly newer
  confirmed information — do NOT fabricate facts
- Preserve all HTML tags exactly — only update facts, dates, numbers, names
- Do NOT insert @ai-zone or @/ai-zone comment markers into your output
- Keep writing style consistent with the existing content
- Do NOT use markdown formatting — use HTML tags instead (e.g. <strong>bold</strong> not **bold**, <em>italic</em> not *italic*)
- For analysis zones (analysis-csis, analysis-isw, analysis-consensus): break
  content into a short lead sentence in a <p> tag followed by a
  <ul class="detail-list"> with each distinct fact as a <li>. End with a
  <p class="source-cite"> for source attribution. Do NOT pack multiple facts
  into a single paragraph.

Freshness rules — these OVERRIDE the "return null" default above:
- If a zone contains a date more than 2 days old AND search results mention the
  same topic, update the date/facts even if the meaning is broadly similar
- Remove "NEW" labels from items older than 7 days (replace with plain text)
- Carrier position zones (carrier-*-position, carrier-*-badge): ALWAYS update if
  the existing date is more than 2 days old — use the most recent source available
- hormuz-wti-price: ALWAYS update with the most recent WTI price from search results
- military-parchin: update the date and remove "NEW" prefix if older than 7 days
- Today's date is: ${new Date().toISOString().slice(0, 10)}

Source reliability tiers (mirrors the Source Reliability Guide on the sources page):
- Tier 1 — Highest: US CENTCOM, IAEA, State Dept, UN/OCHA/WHO — treat as ground truth for confirmed claims
- Tier 2 — High: Reuters, AP, AFP — preferred for confirming discrete events
- Tier 3 — Good: ISW, USNI News, The War Zone, CSIS, Defense News — preferred for military/technical claims
- Tier 4 — Standard: NYT, WaPo, BBC, CNN, NPR, The Guardian, Axios — acceptable for confirmed events with editorial context
- Tier 5 — Verify framing: Al Jazeera, Iran International, Al Arabiya, Times of Israel, HRANA — must add framing note in attribution (e.g. "Iran International (opposition-aligned)")
- Tier 6 — Caution: JINSA, MEF, Alma Center, Wikipedia — never sole basis for a fact; must be corroborated by a tier 1–4 source
Establish new facts from tiers 1–3 whenever possible. Tier-5 attributions must include the outlet's editorial angle. Tier-6 sources require corroboration.
Search results are pre-tagged with [Tier N] labels — use these to decide confidence level.
Exception: Tiers 5 and 6 CAN update unconfirmed/fog-of-war zones (confirmed-unconfirmed sections) — these zones exist specifically to surface unverified claims with appropriate caveats.

Source diversity rule: tier 1–4 sources may be cited freely with no per-outlet limit. Tier 5–6 outlets should not be cited more than twice per zone update — when a tier 5–6 outlet covers the same event as a higher-tier source, cite the higher-tier source instead.

Zone-specific rules:
- *-subtitle zones: update the section header subtitle if key facts changed
  (counts, status, date, location). Keep under 140 characters.
- nuclear-track: APPEND new <div class="tl-item"> entries AT THE BOTTOM if new
  talks or diplomatic events occurred since the last entry. Keep all existing
  entries. Chronological order (oldest first). Same single-line HTML format as
  existing items. Do not duplicate existing events.
- opposition-track: APPEND new <div class="tl-item"> entries AT THE BOTTOM for
  new Pahlavi or opposition developments. Keep all existing entries. Chronological
  order. Same multi-line HTML format as existing items.
- carrier-*-badge: location label only (e.g. "ARABIAN SEA", "E. MED", "RED SEA")
- carrier-*-position: one &#128205; sentence — location and operational status
- iran-crisis2-title: update the day count only (e.g. "Day 6" → "Day 7"). Full
  title format: "Crisis 2: The Student Uprising (Mon DD-DD, Day N)"
- hormuz-wti-price: the WTI crude spot price only (e.g. "$67.28")
- military-parchin: the Parchin status update sentence including source and date
`;

/**
 * Discover all @ai-zone regions, ask GPT to update them, and write back.
 */
async function updateZones(searchContext, { baseDir, callGPT }) {
  const zones = discoverZones(baseDir);
  const zoneCount = Object.keys(zones).length;
  if (zoneCount === 0) {
    console.log('No @ai-zone markers found in sections/ — skipping zone updates.');
    return { zonesUpdated: [], filesUpdated: [] };
  }

  const zonesBlock = Object.entries(zones)
    .map(([id, occurrences]) => {
      const z     = occurrences[0];
      const files = occurrences.map(o => path.basename(o.filePath)).join(', ');
      return `=== Zone: ${id} (${files}) ===\n${z.innerContent.trim()}`;
    })
    .join('\n\n');

  const validZoneIds = Object.keys(zones);
  const userContent =
    `VALID ZONE IDS (return ONLY these keys): ${validZoneIds.join(', ')}\n\n` +
    `CURRENT ZONE CONTENTS (${zoneCount} zones):\n${zonesBlock}\n\n` +
    `WEB SEARCH RESULTS:\n${searchContext}`;

  console.log(`Updating ${zoneCount} section zones via GPT-5-mini…`);
  let updates;
  try {
    const raw = await callGPT(ZONES_SYSTEM_PROMPT, userContent, true);
    updates = JSON.parse(raw);
  } catch (err) {
    console.warn(`Zone update GPT call failed (${err.message}) — keeping all originals.`);
    throw err;
  }

  const fileContents = {};
  const updatedZoneIdSet = new Set();

  for (const [zoneId, newContent] of Object.entries(updates)) {
    if (!newContent || !zones[zoneId]) continue;

    if (newContent.includes('@ai-zone')) {
      console.warn(`Zone "${zoneId}" replacement contains zone markers — skipping.`);
      continue;
    }
    if (!VALID_ZONE_ID.test(zoneId)) {
      console.warn(`Zone ID "${zoneId}" contains invalid characters — skipping.`);
      continue;
    }

    for (const zone of zones[zoneId]) {
      if (newContent.trim() === zone.innerContent.trim()) continue;

      if (newContent.length < zone.innerContent.length * 0.3) {
        console.warn(`Zone "${zoneId}" replacement is too small (${newContent.length} vs ${zone.innerContent.length} chars) — skipping.`);
        continue;
      }

      if (!fileContents[zone.filePath]) {
        fileContents[zone.filePath] = fs.readFileSync(zone.filePath, 'utf8');
      }
      const escapedId = zoneId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const zonePattern = new RegExp(
        `<!-- @ai-zone:${escapedId} -->[\\s\\S]*?<!-- @\\/ai-zone:${escapedId} -->`
      );
      const newOuter = `<!-- @ai-zone:${zoneId} -->${sanitizeMarkdown(newContent)}<!-- @/ai-zone:${zoneId} -->`;
      fileContents[zone.filePath] = fileContents[zone.filePath].replace(zonePattern, newOuter);
      updatedZoneIdSet.add(zoneId);
    }
  }

  for (const [filePath, newContent] of Object.entries(fileContents)) {
    fs.writeFileSync(filePath, newContent);
    console.log(`  Updated zones in ${path.basename(filePath)}.`);
  }

  const filesUpdated = Object.keys(fileContents).map(p => path.basename(p));
  const zonesUpdated = [...updatedZoneIdSet];
  if (zonesUpdated.length > 0) {
    console.log(`Zone updates: ${zonesUpdated.length} zone(s) across ${filesUpdated.length} file(s).`);
  } else {
    console.log('Zone updates: no changes needed.');
  }
  return { zonesUpdated, filesUpdated };
}

module.exports = { sanitizeMarkdown, updateZones, ZONE_RE };
