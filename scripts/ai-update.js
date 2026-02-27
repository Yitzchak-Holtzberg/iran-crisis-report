#!/usr/bin/env node
/**
 * scripts/ai-update.js
 *
 * Automatically updates page content with the latest Iran-related news by:
 *   1. Searching the web via the Tavily API (cheap, purpose-built for LLM use).
 *   2. Calling GPT-5-mini to update data.json (ticker headlines, key statistics,
 *      scenario likelihood percentages).
 *   3. Calling GPT-5-mini to generate new timeline items for sections/last-24h.html.
 *   4. Calling GPT-5-mini to update all @ai-zone-marked regions across other
 *      section files (nuclear track, naval positions, air-power subtitle, etc.).
 *
 * Required environment variables (set as GitHub Actions secrets):
 *   TAVILY_API_KEY   — https://tavily.com  (free tier: 1,000 searches/month)
 *   OPENAI_API_KEY   — https://platform.openai.com  (GPT-5-mini is very cheap)
 *
 * Usage:  node scripts/ai-update.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const BASE_DIR     = path.join(__dirname, '..');
const DATA_PATH    = path.join(BASE_DIR, 'data.json');
const LAST24H_PATH = path.join(BASE_DIR, 'sections', 'last-24h.html');

// ── Environment ──────────────────────────────────────────────────────────────

const TAVILY_KEY = process.env.TAVILY_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!TAVILY_KEY || !OPENAI_KEY) {
  console.error('Error: TAVILY_API_KEY and OPENAI_API_KEY environment variables must be set.');
  process.exit(1);
}

// ── Search queries ────────────────────────────────────────────────────────────
// Targeted queries that cover the dashboard's main topic areas.

const SEARCH_QUERIES = [
  'Iran breaking news major development today',
  'Iran nuclear talks US negotiations latest news',
  'Iran protests crackdown IRGC arrests latest news',
  'US military Iran strike threat carrier deployment latest',
  'Iran economy rial rate sanctions latest news',
  'Iran Israel military threat latest news',
  'Reza Pahlavi Iran opposition latest news',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Run a single Tavily search and return the result object. */
async function tavilySearch(query) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_KEY,
      query,
      max_results: 6,
      search_depth: 'basic',
      include_answer: true,
    }),
  });
  if (!res.ok) {
    throw new Error(`Tavily error ${res.status} for query "${query}": ${await res.text()}`);
  }
  return res.json();
}

/** Call GPT-5-mini and return the raw text of the first choice. */
async function callGPT(systemPrompt, userContent, jsonMode = false) {
  const body = {
    model: 'gpt-5-mini',
    temperature: 0.15,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent  },
    ],
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.choices[0].message.content;
}

/**
 * Splice new .tl-item HTML blocks into the TODAY timeline in last-24h.html.
 * New items are prepended immediately after the opening <div class="timeline">
 * tag of the first (TODAY) day block.
 */
function spliceTimelineItems(fileContent, newItemsHtml) {
  if (!newItemsHtml || !newItemsHtml.trim()) return fileContent;

  // Match the opening tag of the TODAY timeline div (first occurrence).
  const marker = /<div class="timeline"[^>]*>/;
  const match  = fileContent.match(marker);
  if (!match) {
    console.warn('Could not find TODAY timeline div — skipping last-24h.html update.');
    return fileContent;
  }

  const insertAt = match.index + match[0].length;
  return (
    fileContent.slice(0, insertAt) +
    '\n' + newItemsHtml.trimEnd() + '\n' +
    fileContent.slice(insertAt)
  );
}

// ── Zone update helpers ───────────────────────────────────────────────────────

/**
 * Regex that matches <!-- @ai-zone:id --> ... <!-- @/ai-zone:id --> blocks.
 * Zone IDs use lowercase letters, digits, and hyphens ([\w-]+).
 * Content between markers is captured lazily and limited to 10,000 chars so
 * the match never back-tracks across unrelated HTML in large files.
 * The 'g' flag is reset via lastIndex before each use.
 */
const ZONE_RE = /<!-- @ai-zone:([\w-]+) -->([\s\S]{0,10000}?)<!-- @\/ai-zone:\1 -->/g;

/** Characters that are safe in a zone ID (same as the capture group above). */
const VALID_ZONE_ID = /^[\w-]+$/;

/**
 * Scan all sections/*.html files and return a map of:
 *   { zoneId → { filePath, outerMatch, innerContent } }
 *
 * Any section file can participate — just add the markers in HTML.
 */
function discoverZones() {
  const zones      = {};
  const sectionsDir = path.join(BASE_DIR, 'sections');
  for (const file of fs.readdirSync(sectionsDir)) {
    if (!file.endsWith('.html')) continue;
    const filePath = path.join(sectionsDir, file);
    const content  = fs.readFileSync(filePath, 'utf8');
    ZONE_RE.lastIndex = 0;
    let m;
    while ((m = ZONE_RE.exec(content)) !== null) {
      zones[m[1]] = { filePath, outerMatch: m[0], innerContent: m[2] };
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
- military-parchin: the Parchin status update sentence including source and date`;

/**
 * Discover all @ai-zone regions in sections/, ask GPT-5-mini to update them
 * based on the search context, and write back only the changed files.
 */
async function updateZones(searchContext) {
  const zones = discoverZones();
  const zoneCount = Object.keys(zones).length;
  if (zoneCount === 0) {
    console.log('No @ai-zone markers found in sections/ — skipping zone updates.');
    return;
  }

  const zonesBlock = Object.entries(zones)
    .map(([id, z]) => `=== Zone: ${id} (${path.basename(z.filePath)}) ===\n${z.innerContent.trim()}`)
    .join('\n\n');

  const userContent =
    `CURRENT ZONE CONTENTS (${zoneCount} zones):\n${zonesBlock}\n\n` +
    `WEB SEARCH RESULTS:\n${searchContext}`;

  console.log(`Updating ${zoneCount} section zones via GPT-5-mini…`);
  let updates;
  try {
    const raw = await callGPT(ZONES_SYSTEM_PROMPT, userContent, true);
    updates = JSON.parse(raw);
  } catch (err) {
    console.warn(`Zone update GPT call failed (${err.message}) — keeping all originals.`);
    return;
  }

  // Group replacements by file so each file is read and written only once.
  const fileContents = {};
  let updatedZoneCount = 0;

  for (const [zoneId, newContent] of Object.entries(updates)) {
    if (!newContent || !zones[zoneId]) continue;
    const zone = zones[zoneId];
    if (newContent.trim() === zone.innerContent.trim()) continue; // unchanged

    // Safety: prevent zone marker pollution and invalid IDs in replacement.
    if (newContent.includes('@ai-zone')) {
      console.warn(`Zone "${zoneId}" replacement contains zone markers — skipping.`);
      continue;
    }
    if (!VALID_ZONE_ID.test(zoneId)) {
      console.warn(`Zone ID "${zoneId}" contains invalid characters — skipping.`);
      continue;
    }

    if (!fileContents[zone.filePath]) {
      fileContents[zone.filePath] = fs.readFileSync(zone.filePath, 'utf8');
    }
    const newOuter = `<!-- @ai-zone:${zoneId} -->${newContent}<!-- @/ai-zone:${zoneId} -->`;
    fileContents[zone.filePath] = fileContents[zone.filePath].replace(zone.outerMatch, newOuter);
    updatedZoneCount++;
  }

  for (const [filePath, newContent] of Object.entries(fileContents)) {
    fs.writeFileSync(filePath, newContent);
    console.log(`  Updated zones in ${path.basename(filePath)}.`);
  }

  if (updatedZoneCount > 0) {
    console.log(`Zone updates: ${updatedZoneCount} zone(s) across ${Object.keys(fileContents).length} file(s).`);
  } else {
    console.log('Zone updates: no changes needed.');
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Read current file contents.
  const currentData  = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const current24h   = fs.readFileSync(LAST24H_PATH, 'utf8');

  // 2. Fetch news from all search queries in parallel.
  console.log('Searching the web for the latest Iran news…');
  const searchResults = await Promise.all(SEARCH_QUERIES.map(tavilySearch));

  // Build a single context block from all search results.
  const searchContext = searchResults.map((sr, i) => {
    const lines = (sr.results || []).slice(0, 5).map(r => {
      const snippet = (r.content || '').slice(0, 350).replace(/\s+/g, ' ');
      return `  - [${r.url}] ${r.title || ''}: ${snippet}`;
    }).join('\n');
    return `### Topic ${i + 1}: ${SEARCH_QUERIES[i]}\nSummary: ${sr.answer || '(none)'}\n${lines}`;
  }).join('\n\n');

  // ── 3. Update data.json ──────────────────────────────────────────────────

  const dataSystemPrompt = `\
You are the editor of the Iran Crisis Report dashboard. Update the JSON data file
using the latest news provided in the web search results.

Rules:
- Return ONLY valid JSON with the EXACT same keys as the input — no extra keys,
  no removed keys, no markdown fences.
- Do NOT change "date" or "lastUpdated" — they are set by a separate script.
- "ticker": prepend up to 5 NEW breaking headline strings. Format each as:
  "CATEGORY IN ALL CAPS: concise summary with key names/numbers (Source, Date)".
  Remove the oldest items so the total array length stays between 20 and 25.
  Do not duplicate headlines already in the array.
- Stat keys (statConfirmedDead, statTotalKilled, statDetained, statUsAircraft,
  statUsShips, statRialRate): update ONLY if the search results contain a clearly
  newer confirmed figure with a credible source.
- Scenario percentages (scenarioDealPct, scenarioStrikesPct,
  scenarioRevolutionPct, scenarioFrozenPct): adjust ONLY if a major development
  materially changes the outlook. Values must be integers that sum to exactly 100.`;

  const dataUserContent =
    `CURRENT data.json:\n${JSON.stringify(currentData, null, 2)}\n\n` +
    `WEB SEARCH RESULTS:\n${searchContext}`;

  console.log('Updating data.json via GPT-5-mini…');
  let updatedData = currentData;
  try {
    const raw = await callGPT(dataSystemPrompt, dataUserContent, true);
    const parsed = JSON.parse(raw);
    // Sanity-check: the returned object must have the same keys as the original.
    const origKeys    = new Set(Object.keys(currentData));
    const returnedKeys = new Set(Object.keys(parsed));
    const missing = [...origKeys].filter(k => !returnedKeys.has(k));
    if (missing.length > 0) {
      console.warn(`data.json response missing keys: ${missing.join(', ')} — keeping original.`);
    } else {
      updatedData = parsed;
      console.log('data.json updated successfully.');
    }
  } catch (err) {
    console.warn(`data.json update failed (${err.message}) — keeping original.`);
  }

  // ── 4. Generate new timeline items for last-24h.html ────────────────────

  // Extract the existing TODAY items so the model knows what's already there.
  const todayMatch = current24h.match(
    /<!-- ── TODAY ── -->[\s\S]*?<div class="timeline"[^>]*>([\s\S]*?)<!-- ── YESTERDAY ── -->/
  );
  const existingTodayItems = todayMatch ? todayMatch[1].trim() : '';

  const last24hSystemPrompt = `\
You are the editor of the Iran Crisis Report dashboard. Generate new timeline
items for today's "Last 24 Hours" section based on the web search results.

Return a JSON object with exactly ONE key: "newItems" — an array of HTML strings.
Each string is a complete <div class="tl-item"> … </div> block (no outer wrapper).

Rules:
- Return AT MOST 5 items. Only include events that are GENUINELY NEW and not
  already covered by the existing TODAY items shown below.
- If there are no new events worth adding, return { "newItems": [] }.
- HTML format for each item:
    <div class="tl-item">
      <div class="tl-dot" style="border-color:var(--COLOR);"></div>
      <div class="date">CATEGORY — SHORT HEADLINE IN UPPER CASE</div>
      <div class="content">1–3 sentence description with <strong>key details bolded</strong>. — Source: <em>Outlet, Date</em></div>
    </div>
- Dot color convention (use exact CSS variable names):
    --accent-red    → combat / critical / crackdown events
    --accent-orange → high-threat military moves
    --accent-gold   → diplomacy / negotiations
    --accent-blue   → US naval or air assets
    --accent-cyan   → intelligence / cyber
    --accent-green  → economic indicators
    --text-muted    → background / low-priority
- Do NOT include the {{dayToday}} placeholder or any day-header HTML.
- Do NOT add style="margin-bottom:0;" to any item you generate — that style is
  reserved for the existing last item in each block so it doesn't add double
  spacing before the next day-header, and new items inserted at the top don't
  need it.`;

  const last24hUserContent =
    `EXISTING TODAY ITEMS (do not duplicate these):\n${existingTodayItems}\n\n` +
    `WEB SEARCH RESULTS:\n${searchContext}`;

  console.log('Generating new timeline items via GPT-5-mini…');
  let updatedLast24h = current24h;
  try {
    const raw = await callGPT(last24hSystemPrompt, last24hUserContent, true);
    const parsed = JSON.parse(raw);
    const newItems = Array.isArray(parsed.newItems) ? parsed.newItems : [];
    if (newItems.length === 0) {
      console.log('No new timeline items to add.');
    } else {
      const newItemsHtml = newItems.join('\n');
      const candidate    = spliceTimelineItems(current24h, newItemsHtml);
      // Validate the template placeholders are still intact.
      const placeholders = ['{{dayToday}}', '{{dayYesterday}}', '{{dayTwoDaysAgo}}'];
      const allPresent   = placeholders.every(p => candidate.includes(p));
      if (!allPresent) {
        console.warn('last-24h.html placeholder check failed — keeping original.');
      } else {
        updatedLast24h = candidate;
        console.log(`last-24h.html updated with ${newItems.length} new item(s).`);
      }
    }
  } catch (err) {
    console.warn(`last-24h.html update failed (${err.message}) — keeping original.`);
  }

  // ── 5. Update HTML section zones ──────────────────────────────────────────

  try {
    await updateZones(searchContext);
  } catch (err) {
    console.warn(`Section zone updates failed (${err.message}) — keeping originals.`);
  }

  // ── 6. Write updated data.json and last-24h.html ──────────────────────────

  fs.writeFileSync(DATA_PATH, JSON.stringify(updatedData, null, 2) + '\n');
  fs.writeFileSync(LAST24H_PATH, updatedLast24h);

  console.log('AI update complete.');
}

main().catch(err => {
  console.error('ai-update.js fatal error:', err);
  process.exit(1);
});
