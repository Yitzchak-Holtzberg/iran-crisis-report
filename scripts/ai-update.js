#!/usr/bin/env node
/**
 * scripts/ai-update.js
 *
 * Automatically updates page content with the latest Iran-related news.
 *
 * Update types (set via UPDATE_TYPE env var, default "auto"):
 *   auto       — (default) runs a significance assessment after web search; if
 *                a major event is detected the run is promoted to "structural",
 *                otherwise it stays "routine"
 *   routine    — daily refresh: data.json values, timeline items, AI zone content
 *   structural — major events: all routine updates PLUS section-level HTML changes
 *                (new cards, reordered content, added/removed blocks)
 *
 * Phases:
 *   1. Web search via Tavily API
 *   1b. (auto only) Significance assessment — decides routine vs structural
 *   2. Update data.json (ticker, stats, scenario percentages)
 *   3. Generate new timeline items for sections/last-24h.html
 *   4. Update @ai-zone content regions across section files
 *   5. (structural only) Section-level HTML modifications
 *   6. Write update manifest (update-manifest.json)
 *
 * Required environment variables (set as GitHub Actions secrets):
 *   TAVILY_API_KEY   — https://tavily.com  (free tier: 1,000 searches/month)
 *   OPENAI_API_KEY   — https://platform.openai.com  (GPT-5-mini is very cheap)
 *
 * Optional environment variables:
 *   UPDATE_TYPE              — "auto" (default), "routine", or "structural"
 *   OPENAI_STRUCTURAL_MODEL  — model for structural HTML generation (default: "gpt-5")
 *
 * Usage:  node scripts/ai-update.js
 *         UPDATE_TYPE=structural node scripts/ai-update.js
 */

'use strict';

const fs    = require('fs');
const https = require('https');
const path  = require('path');

const BASE_DIR         = path.join(__dirname, '..');
const DATA_PATH        = path.join(BASE_DIR, 'data.json');
const LAST24H_PATH     = path.join(BASE_DIR, 'sections', 'last-24h.html');
const MANIFEST_PATH    = path.join(BASE_DIR, 'update-manifest.json');
const GUIDELINES_PATH  = path.join(BASE_DIR, 'STRUCTURAL_GUIDELINES.md');
const GPT_LOG_PATH     = path.join(BASE_DIR, 'logs', 'gpt-calls.jsonl');

// Matches the existing TODAY items block inside last-24h.html.
// Used both by the significance assessment (to check what's already on the page)
// and by the timeline update phase (to avoid duplicating items).
const TODAY_TIMELINE_RE =
  /<!-- ── TODAY ── -->[\s\S]*?<div class="timeline"[^>]*>([\s\S]*?)<!-- ── YESTERDAY ── -->/;

// Number of recent ticker headlines to include in the page-context snapshot
// passed to the significance classifier.  10 is enough to cover the last few
// updates without inflating the prompt token count.
const PAGE_CONTEXT_TICKER_LIMIT = 10;

// ── Environment ──────────────────────────────────────────────────────────────

const TAVILY_KEY  = process.env.TAVILY_API_KEY;
const OPENAI_KEY  = process.env.OPENAI_API_KEY;
const UPDATE_TYPE_INPUT = (process.env.UPDATE_TYPE || 'auto').toLowerCase();
const STRUCTURAL_MODEL  = process.env.OPENAI_STRUCTURAL_MODEL || 'gpt-5';

if (!['auto', 'routine', 'structural'].includes(UPDATE_TYPE_INPUT)) {
  console.error(`Error: UPDATE_TYPE must be "auto", "routine" or "structural" (got "${UPDATE_TYPE_INPUT}").`);
  process.exit(1);
}

if (!TAVILY_KEY || !OPENAI_KEY) {
  console.error('Error: TAVILY_API_KEY and OPENAI_API_KEY environment variables must be set.');
  process.exit(1);
}

// ── Search queries ────────────────────────────────────────────────────────────
// Targeted queries that cover the dashboard's main topic areas.

const SEARCH_QUERIES = [
  'Iran breaking news military political crisis latest today',
  'Iran nuclear enrichment IAEA program talks deal latest news',
  'Iran protests crackdown IRGC arrests dissidents latest news',
  'US military Iran strikes operations carrier deployment latest news',
  'Iran economy rial oil exports sanctions latest news',
  'Iran Israel strikes attack military operations latest news',
  'Iran opposition Pahlavi MEK resistance movement latest news',
  'Strait of Hormuz shipping oil tanker Iran disruption latest',
  'Gulf states Saudi Arabia Qatar Bahrain UAE Russia China Iran coalition reaction latest',
  'Iran proxy Hezbollah Houthi Yemen Iraq militia strikes attack latest',
  'Iran IRGC assassination plot cyber espionage covert operations latest',
  'Iran new supreme leader ayatollah successor Khamenei Assembly of Experts leadership transition',
  // ── Gap-coverage queries added to avoid systematic blind spots ────────────
  // Kurdish groups and US-Kurdish arming (previously missed category)
  // KRG = Kurdistan Regional Government (Iraq); KDPI/PJAK = Kurdish groups inside Iran; SDF = Syria
  'US arming Kurdish forces Peshmerga KRG KDPI PJAK SDF Syria Iraq Iran region latest',
  // Iraq as an active theater: PMF attacks, US bases, Baghdad politics
  'Iraq PMF Shia militia US bases attacks Iran influence Baghdad government latest news',
  // Iran ethnic-minority armed resistance (Baluch, Khuzestan Arab, Azerbaijani, Kurdish)
  'Iran ethnic minority armed resistance Baluchistan Khuzestan Arab Azerbaijani KDPI uprising latest',
  // US/coalition covert support, arms transfers to opposition or proxy groups
  'CIA special operations covert arms support anti-Iran opposition proxy groups latest news',
  // ── Horizon-scan queries: catch any Iran-relevant development in arenas not
  //    explicitly covered above (space, bioweapons, AI/tech warfare, unexpected
  //    new actors, financial system attacks, environmental/infrastructure, etc.)
  'Iran unexpected surprise development any domain technology space cyber bioweapons latest news',
  'Iran crisis new actor development unexpected arena finance infrastructure international latest',
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

// Timeout (ms) for each OpenAI HTTPS request.  Built-in fetch uses undici whose
// default headersTimeout is only 10 s — far too short for large prompts (100-170 KB)
// that take the model extra time to process before sending response headers.
const GPT_TIMEOUT_MS = 120_000; // 2 minutes

/**
 * Minimal HTTPS POST helper that returns a fetch-compatible response object.
 * Uses Node.js's built-in `https` module so we can set an explicit socket
 * timeout, avoiding the undici default 10-second headers-timeout error.
 */
function httpsPost(url, headers, bodyStr) {
  return new Promise((resolve, reject) => {
    const { hostname, pathname, search } = new URL(url);
    const req = https.request(
      {
        hostname,
        path: pathname + (search || ''),
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        const chunks = [];
        res.on('error', reject);
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: () => Promise.resolve(body),
            json: () => {
              try { return Promise.resolve(JSON.parse(body)); }
              catch (e) { return Promise.reject(e); }
            },
          });
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error(`Request timeout after ${GPT_TIMEOUT_MS} ms`));
    });
    req.setTimeout(GPT_TIMEOUT_MS);
    req.write(bodyStr);
    req.end();
  });
}

/** Call an OpenAI model and return the raw text of the first choice.
 *  Tries up to MAX_GPT_ATTEMPTS times (exponential backoff: 2s, 4s between retries)
 *  on transient network errors or 5xx responses.
 *  Each call (success or final failure) is appended as a JSON line to logs/gpt-calls.jsonl. */
const MAX_GPT_ATTEMPTS = 3;
async function callGPT(systemPrompt, userContent, jsonMode = false, model = 'gpt-5-mini', maxTokens = 16384) {
  const body = {
    model,
    max_completion_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent  },
    ],
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const promptSizeKB = +(body.messages.reduce((s, m) => s + m.content.length, 0) / 1024).toFixed(1);
  let lastErr;
  for (let attempt = 1; attempt <= MAX_GPT_ATTEMPTS; attempt++) {
    try {
      const bodyStr = JSON.stringify(body);
      if (attempt === 1) {
        console.log(`  [callGPT] model=${model} body=${(bodyStr.length / 1024).toFixed(1)}KB`);
      }
      const res = await httpsPost(
        'https://api.openai.com/v1/chat/completions',
        {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
        bodyStr,
      );
      if (!res.ok) {
        const text = await res.text();
        // Only retry on server-side errors (5xx); surface client errors immediately.
        if (res.status >= 500 && attempt < MAX_GPT_ATTEMPTS) {
          lastErr = new Error(`OpenAI error ${res.status}: ${text}`);
          console.warn(`  [callGPT] attempt ${attempt}/${MAX_GPT_ATTEMPTS} — ${lastErr.message} — retrying…`);
          await new Promise(r => setTimeout(r, 2 ** attempt * 1000));
          continue;
        }
        throw new Error(`OpenAI error ${res.status}: ${text}`);
      }
      const json = await res.json();
      const result = json.choices[0].message.content;
      appendGptLog({ model, bodySizeKB: promptSizeKB, systemPrompt, userContent, result, error: null });
      return result;
    } catch (err) {
      // Retry on network-level errors (e.g. "fetch failed") but not on the
      // explicit throws above which are already final.
      if (err.message && err.message.startsWith('OpenAI error')) throw err;
      const cause = err.cause ? ` (cause: ${err.cause.message || err.cause})` : '';
      lastErr = new Error(`${err.message}${cause}`, { cause: err.cause });
      if (attempt < MAX_GPT_ATTEMPTS) {
        console.warn(`  [callGPT] attempt ${attempt}/${MAX_GPT_ATTEMPTS} — ${lastErr.message} — retrying…`);
        await new Promise(r => setTimeout(r, 2 ** attempt * 1000));
      }
    }
  }
  appendGptLog({ model, bodySizeKB: promptSizeKB, systemPrompt, userContent, result: null, error: lastErr.message });
  throw lastErr;
}

/** Append a single JSON line to logs/gpt-calls.jsonl (creates the file/dir if needed). */
function appendGptLog(entry) {
  try {
    const logsDir = path.dirname(GPT_LOG_PATH);
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    fs.appendFileSync(GPT_LOG_PATH, JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + '\n');
  } catch (e) {
    console.warn(`[callGPT] Failed to write gpt-calls.jsonl: ${e.message}`);
  }
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
 * Convert any residual markdown bold/italic syntax to HTML tags.
 * GPT occasionally outputs **text** or *text* despite instructions;
 * this is a last-resort safety net applied to all AI-generated HTML.
 */
function sanitizeMarkdown(html) {
  if (!html) return html;
  // **bold** → <strong>bold</strong>  (non-greedy, no newlines inside)
  let out = html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  // *italic* → <em>italic</em>  (only remaining single stars after bold pass)
  out = out.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
  return out;
}

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
 *   { zoneId → [{ filePath, outerMatch, innerContent }, ...] }
 *
 * Any section file can participate — just add the markers in HTML.
 * When the same zone ID appears in multiple files (e.g. a subtitle zone
 * shared between a full section and its teaser), all occurrences are
 * collected so every file is kept in sync on update.
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

Source reliability tiers (mirrors the Source Reliability Guide on the sources page):
- Tier 1 — Highest: US CENTCOM, IAEA, State Dept, UN/OCHA/WHO — treat as ground truth for confirmed claims
- Tier 2 — High: Reuters, AP, AFP — preferred for confirming discrete events
- Tier 3 — Good: ISW, USNI News, The War Zone, CSIS, Defense News — preferred for military/technical claims
- Tier 4 — Standard: NYT, WaPo, BBC, CNN, NPR, The Guardian, Axios — acceptable for confirmed events with editorial context
- Tier 5 — Verify framing: Al Jazeera, Iran International, Al Arabiya, Times of Israel, HRANA — must add framing note in attribution (e.g. "Iran International (opposition-aligned)")
- Tier 6 — Caution: JINSA, MEF, Alma Center, Wikipedia — never sole basis for a fact; must be corroborated by a tier 1–4 source
Establish new facts from tiers 1–3 whenever possible. Tier-5 attributions must include the outlet's editorial angle. Tier-6 sources require corroboration.

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
    return { zonesUpdated: [], filesUpdated: [] };
  }

  const zonesBlock = Object.entries(zones)
    .map(([id, occurrences]) => {
      const z     = occurrences[0]; // use first occurrence for prompt content
      const files = occurrences.map(o => path.basename(o.filePath)).join(', ');
      return `=== Zone: ${id} (${files}) ===\n${z.innerContent.trim()}`;
    })
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
    throw err;
  }

  // Group replacements by file so each file is read and written only once.
  const fileContents = {};
  const updatedZoneIdSet = new Set();

  for (const [zoneId, newContent] of Object.entries(updates)) {
    if (!newContent || !zones[zoneId]) continue;

    // Safety: prevent zone marker pollution and invalid IDs in replacement.
    if (newContent.includes('@ai-zone')) {
      console.warn(`Zone "${zoneId}" replacement contains zone markers — skipping.`);
      continue;
    }
    if (!VALID_ZONE_ID.test(zoneId)) {
      console.warn(`Zone ID "${zoneId}" contains invalid characters — skipping.`);
      continue;
    }

    for (const zone of zones[zoneId]) {
      if (newContent.trim() === zone.innerContent.trim()) continue; // unchanged

      if (!fileContents[zone.filePath]) {
        fileContents[zone.filePath] = fs.readFileSync(zone.filePath, 'utf8');
      }
      const newOuter = `<!-- @ai-zone:${zoneId} -->${sanitizeMarkdown(newContent)}<!-- @/ai-zone:${zoneId} -->`;
      fileContents[zone.filePath] = fileContents[zone.filePath].replace(zone.outerMatch, newOuter);
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

// ── Manifest helpers ──────────────────────────────────────────────────────────

/** Read the existing manifest or create a blank one. */
function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return { updates: [] };
  }
}

/** Append an entry to the manifest and write it to disk. Keep last 50 entries. */
function writeManifest(entry) {
  const manifest = readManifest();
  manifest.updates.push(entry);
  if (manifest.updates.length > 50) {
    manifest.updates = manifest.updates.slice(-50);
  }
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
}

// ── Significance assessment ──────────────────────────────────────────────────

const SIGNIFICANCE_SYSTEM_PROMPT = `\
You are a news significance classifier for the Iran Crisis Report dashboard.
Evaluate whether the latest web search results contain a MAJOR development that
would require restructuring the page — not just updating numbers/text within
existing sections, but adding new cards, callouts, or fundamentally changing
the analysis structure.

IMPORTANT: You will also receive a summary of EXISTING PAGE CONTENT (the current
ticker headlines and today's timeline items). Only return structural:true if the
major development is NOT already covered by that existing content. If the event
is already represented in the page, a routine zone-level update is sufficient.

ESCALATION RULE: A country or actor *escalating* from a lesser action to a
more serious one is a NEW structural event, not a duplicate — e.g. if the page
already says a country is "considering" or "weighing" joining a military
campaign, confirmed reports that the same country has now *actively joined*
(launched strikes, deployed forces, or formally entered the coalition) is a
NEW structural development and must be treated as NOT already covered.

Examples of events that ARE structural:
- A military operation is launched or concluded
- A regime change or leadership transition occurs
- A new scenario emerges that doesn't fit existing categories
- A ceasefire or peace deal is signed
- A nuclear test or confirmed weapons-grade enrichment
- A major new front opens (e.g. ground invasion, new country enters conflict)
- A country moves from diplomatic support / condemnation to active military
  participation (strikes, deployments, or formal coalition entry)
- A significant development in a domain NOT currently covered by the dashboard
  (e.g. space/satellite warfare, bioweapons, AI-enabled weapons, attacks on
  global financial systems, a completely new country or actor entering the
  conflict, environmental/infrastructure sabotage, new technology first-use)

Examples of events that are NOT structural (routine updates handle these):
- Updated casualty figures or economic data
- New round of existing diplomatic talks
- Additional carrier or troop deployments within existing posture
- Protest activity continuing at similar scale
- Sanctions additions or removals
- Rhetoric or threats without concrete action
- A country reiterating condemnation or diplomatic support it already expressed

Return a JSON object with exactly two keys:
  "structural": true or false
  "reason": one sentence explaining why (max 120 chars)

Be CONSERVATIVE — default to false. Only return true when the news clearly
represents a paradigm shift that the existing page structure cannot adequately
convey with zone-level updates alone, AND the event is not already in the page.`;

/**
 * Ask GPT to assess whether the search results contain a development
 * significant enough to warrant structural page changes.
 * @param {string} searchContext - aggregated Tavily search results
 * @param {string} pageContext   - summary of existing page content (ticker + timeline)
 * Returns { structural: boolean, reason: string }.
 */
async function assessSignificance(searchContext, pageContext = '') {
  console.log('Assessing news significance (auto mode)…');
  try {
    const userContent = (pageContext ? `EXISTING PAGE CONTENT:\n${pageContext}\n\n` : '') +
      `WEB SEARCH RESULTS:\n${searchContext}`;
    const raw = await callGPT(
      SIGNIFICANCE_SYSTEM_PROMPT,
      userContent,
      true
    );
    const result = JSON.parse(raw);
    if (typeof result.structural !== 'boolean' || typeof result.reason !== 'string') {
      console.warn('Significance assessment returned invalid format — defaulting to routine.');
      return { structural: false, reason: 'invalid response format' };
    }
    // Enforce reason length limit.
    result.reason = result.reason.slice(0, 120);
    return result;
  } catch (err) {
    console.warn(`Significance assessment failed (${err.message}) — defaulting to routine.`);
    return { structural: false, reason: `error: ${err.message}` };
  }
}

// ── Structural update helpers ────────────────────────────────────────────────

/**
 * Files eligible for structural updates.  Each entry maps a logical name to
 * its path and a short description the model sees as context.  Only these
 * files can be modified in structural mode — everything else is off-limits.
 */
const STRUCTURAL_FILES = {
  'last-24h':   { rel: 'sections/last-24h.html',   desc: 'Last 24 Hours timeline' },
  'scenarios':  { rel: 'sections/scenarios.html',   desc: 'Five Scenarios analysis' },
  'inside-iran':{ rel: 'sections/inside-iran.html', desc: 'Inside Iran: seven crises' },
  'nuclear':    { rel: 'sections/nuclear.html',     desc: 'Nuclear negotiations' },
  'naval':      { rel: 'sections/naval.html',       desc: 'Naval strike power' },
  'air-power':  { rel: 'sections/air-power.html',   desc: 'Air power section' },
  'opposition': { rel: 'sections/opposition.html',  desc: 'Opposition & Reza Pahlavi' },
  'hormuz':     { rel: 'sections/hormuz.html',      desc: 'Strait of Hormuz' },
  'military':   { rel: 'sections/military.html',    desc: 'Iran military capability' },
  'reactions':  { rel: 'sections/reactions.html',    desc: 'Regional reactions & damage assessments' },
  'confirmed-unconfirmed': { rel: 'sections/confirmed-unconfirmed.html', desc: 'Fog of war: confirmed vs unconfirmed' },
  'theater':          { rel: 'sections/theater.html',           desc: 'Theater of Operations map section' },
  'map':              { rel: 'js/map.js',                        desc: 'Theater of Operations interactive map data (Leaflet markers, popups, corridors, strike lines)' },
  'nuclear-teaser':   { rel: 'sections/nuclear-teaser.html',    desc: 'Nuclear/diplomatic teaser (main page)' },
  'scenarios-teaser': { rel: 'sections/scenarios-teaser.html',  desc: 'Scenarios teaser (main page)' },
  'forces-teaser':    { rel: 'sections/forces-teaser.html',     desc: 'US Strike Forces teaser (main page)' },
  'inside-iran-teaser': { rel: 'sections/inside-iran-teaser.html', desc: 'Inside Iran teaser (main page)' },
  'reactions-teaser': { rel: 'sections/reactions-teaser.html',  desc: 'Regional reactions teaser (main page)' },
  'analysis':         { rel: 'sections/analysis.html',          desc: 'Expert analysis: CSIS, ISW, Carnegie, Brookings, Atlantic Council what-happens-next' },
};

const STRUCTURAL_SYSTEM_PROMPT = `\
You are the editor of the Iran Crisis Report dashboard. A MAJOR development has
occurred that requires structural changes to section HTML files — not just
content-within-zones updates but additions, removals, or reordering of cards,
callouts, and subsections.

You will receive the current HTML of one or more section files, editorial
guidelines, and the latest web search results. Return a JSON object where each
key is the section name and the value is either:
  - The FULL updated HTML for that section file, OR
  - null if no structural change is needed

Rules:
- Follow the EDITORIAL GUIDELINES closely — they define what to add, what to
  reorder, what NOT to touch, and which HTML patterns to use
- Preserve ALL existing @ai-zone markers exactly as they are
- Preserve ALL {{placeholder}} template variables exactly as they are
- Preserve the section-header <div> with its id attribute at the top
- Keep HTML style consistent with the existing file (same class names, CSS
  variable usage, indentation)
- Only make changes that are clearly justified by the search results
- New cards/callouts MUST use the exact templates from the guidelines
- Do NOT remove content unless it is clearly outdated or contradicted
- Do NOT change <script> tags or JavaScript
- Do NOT modify SVG diagrams
- When adding new content, use the correct severity-color CSS variables
- Maximum response size: return at most 3 section files per call
- Do NOT use markdown formatting — use HTML tags instead (e.g. <strong>bold</strong> not **bold**, <em>italic</em> not *italic*)`;

// Names of files that must always be deeply updated in every structural run.
// Each name MUST exist as a key in STRUCTURAL_FILES above.
// Groups are processed as separate GPT calls to stay within token limits.
const DEEP_UPDATE_GROUPS = [
  {
    names:  ['analysis', 'map'],
    label:  'analysis + map',
    prompt: 'analysis-map',   // uses DEEP_UPDATE_SYSTEM_PROMPT (analysis+map specific)
  },
  {
    names:  ['scenarios', 'reactions'],
    label:  'scenarios + reactions',
    prompt: 'html',           // uses DEEP_UPDATE_HTML_SYSTEM_PROMPT
  },
  {
    names:  ['naval', 'air-power', 'military'],
    label:  'forces (naval, air-power, military)',
    prompt: 'html',           // uses DEEP_UPDATE_HTML_SYSTEM_PROMPT
  },
];

const DEEP_UPDATE_SYSTEM_PROMPT = `\
You are the editor of the Iran Crisis Report dashboard. A MAJOR development has
occurred. You MUST return deeply updated content for BOTH files listed below —
they are the expert-analysis section and the interactive theater map and both
must always reflect the latest confirmed developments.

For each file you will receive the current content. Return a JSON object with
exactly two keys matching the file names. The value for each key MUST be the
FULL updated content — never null.

Rules for analysis.html:
- Follow the EDITORIAL GUIDELINES for card/callout patterns and source tiers
- Preserve ALL existing @ai-zone markers exactly as they are
- Preserve ALL {{placeholder}} template variables exactly as they are
- Preserve the section-header <div> with its id attribute
- Update every think-tank card to reflect the latest news; add new callouts at
  the top for the most significant developments
- Do NOT use markdown — use HTML tags (<strong>, <em>, etc.)

Rules for map (js/map.js):
- Preserve the outer document.addEventListener('DOMContentLoaded', ...) wrapper
- Preserve the opening map initialisation block (L.map, tile layer, etc.) and
  all icon/helper function definitions exactly as-is — do NOT alter SVG or CSS
- Update or add L.marker / L.polyline / L.circle calls to reflect confirmed
  force positions, strike corridors, and events from the search results
- Update popup text for existing markers that have changed status
- Add new markers or trajectory lines for new confirmed events
- Remove markers ONLY for assets that have definitively departed the theater
- Do NOT modify any icon helper functions or the SVG within them`;

const DEEP_UPDATE_HTML_SYSTEM_PROMPT = `\
You are the editor of the Iran Crisis Report dashboard. A MAJOR development has
occurred. You MUST return deeply updated HTML for ALL files listed below — these
are high-priority sections that must always reflect the latest confirmed
developments.

For each file you will receive the current HTML. Return a JSON object where each
key matches the file name and the value is the FULL updated HTML — never null.

Rules:
- Follow the EDITORIAL GUIDELINES for card/callout patterns and source tiers
- Preserve ALL existing @ai-zone markers exactly as they are
- Preserve ALL {{placeholder}} template variables exactly as they are
- Preserve the section-header <div> with its id attribute at the top
- Keep HTML style consistent with the existing file (same class names, CSS
  variable usage, indentation)
- Update all content to reflect the latest news; add new callouts at the top
  for the most significant developments
- Do NOT use markdown — use HTML tags (<strong>, <em>, etc.)
- Do NOT change <script> tags, inline JavaScript, or SVG diagrams`;

/**
 * Structural update phase — only runs when UPDATE_TYPE === 'structural'.
 * Asks GPT (using the stronger STRUCTURAL_MODEL) to propose section-level HTML
 * changes for files where the news warrants more than a zone-content tweak.
 * Editorial guidelines from STRUCTURAL_GUIDELINES.md are injected into the
 * prompt so the model follows consistent patterns.
 *
 * Four passes are always run:
 *   Pass 1 — broad pass over all STRUCTURAL_FILES not in any deep-update group
 *   Pass 2 — analysis + map (always updated)
 *   Pass 3 — scenarios + reactions (always updated)
 *   Pass 4 — forces: naval, air-power, military (always updated)
 */
async function updateStructural(searchContext) {
  console.log(`Running STRUCTURAL update phase (model: ${STRUCTURAL_MODEL})…`);

  // Sanity-check that every deep-update name exists in STRUCTURAL_FILES.
  for (const group of DEEP_UPDATE_GROUPS) {
    for (const name of group.names) {
      if (!STRUCTURAL_FILES[name]) {
        console.error(`DEEP_UPDATE_GROUPS includes "${name}" which is not in STRUCTURAL_FILES — fix the configuration.`);
      }
    }
  }

  // Flat list of all names that belong to any deep-update group.
  const allDeepUpdateNames = DEEP_UPDATE_GROUPS.flatMap(g => g.names);

  // Load editorial guidelines (non-fatal if missing).
  let guidelines = '';
  if (fs.existsSync(GUIDELINES_PATH)) {
    guidelines = fs.readFileSync(GUIDELINES_PATH, 'utf8');
  } else {
    console.warn('STRUCTURAL_GUIDELINES.md not found — proceeding without editorial guidelines.');
  }

  // Read all eligible files.
  const fileContents = {};
  for (const [name, info] of Object.entries(STRUCTURAL_FILES)) {
    const fullPath = path.join(BASE_DIR, info.rel);
    if (fs.existsSync(fullPath)) {
      fileContents[name] = fs.readFileSync(fullPath, 'utf8');
    }
  }

  /**
   * Validate a proposed update for a single file and write it if valid.
   * Returns the name if applied, null if validation failed.
   */
  function applyUpdate(name, newContent) {
    if (!newContent || !STRUCTURAL_FILES[name]) return null;
    const info     = STRUCTURAL_FILES[name];
    const fullPath = path.join(BASE_DIR, info.rel);
    const original = fileContents[name];
    if (!original) return null;

    const isJs = info.rel.endsWith('.js');

    if (isJs) {
      // JS-specific validation: preserve the Leaflet wrapper and map init.
      if (!newContent.includes('document.addEventListener(')) {
        console.warn(`Structural: ${name} — DOMContentLoaded wrapper missing — skipping.`);
        return null;
      }
      if (!newContent.includes('L.map(')) {
        console.warn(`Structural: ${name} — Leaflet map initialisation missing — skipping.`);
        return null;
      }
    } else {
      // HTML validation guards
      // 1. Must still contain the section-header id.
      const idMatch = original.match(/id=["']([^"']+)["']/);
      if (idMatch && !newContent.includes(`id="${idMatch[1]}"`)) {
        console.warn(`Structural: ${name} — section id "${idMatch[1]}" missing in replacement — skipping.`);
        return null;
      }
      // 2. All {{placeholders}} from the original must still be present.
      const origPlaceholders = [...original.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
      const missingPH = origPlaceholders.filter(p => !newContent.includes(`{{${p}}}`));
      if (missingPH.length > 0) {
        console.warn(`Structural: ${name} — missing placeholders: ${missingPH.join(', ')} — skipping.`);
        return null;
      }
      // 3. All @ai-zone markers from the original must still be present.
      const origZones = [...original.matchAll(/<!-- @ai-zone:([\w-]+) -->/g)].map(m => m[1]);
      const missingZones = origZones.filter(z =>
        !newContent.includes(`<!-- @ai-zone:${z} -->`) ||
        !newContent.includes(`<!-- @/ai-zone:${z} -->`)
      );
      if (missingZones.length > 0) {
        console.warn(`Structural: ${name} — missing AI zones: ${missingZones.join(', ')} — skipping.`);
        return null;
      }
    }

    // Common: Reject if content is suspiciously small (< 30% of original).
    if (newContent.length < original.length * 0.3) {
      console.warn(`Structural: ${name} — replacement is too small (${newContent.length} vs ${original.length} chars) — skipping.`);
      return null;
    }

    fs.writeFileSync(fullPath, isJs ? newContent : sanitizeMarkdown(newContent));
    console.log(`  Structural update applied to ${info.rel}.`);
    return name;
  }

  const changedSet = new Set();
  /** Per-pass result objects collected and returned for the manifest. */
  const passes = {};

  // ── Pass 1: broad pass over non-deep-update files ─────────────────────
  const pass1Block = Object.entries(fileContents)
    .filter(([name]) => !allDeepUpdateNames.includes(name))
    .map(([name, content]) => {
      const info  = STRUCTURAL_FILES[name];
      const lines = content.split('\n').length;
      return `=== ${name} (${info.desc}, ${lines} lines) ===\n${content}`;
    })
    .join('\n\n');

  const pass1UserContent =
    `UPDATE TYPE: STRUCTURAL — a major event requires section-level changes.\n\n` +
    (guidelines ? `EDITORIAL GUIDELINES:\n${guidelines}\n\n` : '') +
    `CURRENT SECTION FILES:\n${pass1Block}\n\n` +
    `WEB SEARCH RESULTS:\n${searchContext}`;

  try {
    const raw     = await callGPT(STRUCTURAL_SYSTEM_PROMPT, pass1UserContent, true, STRUCTURAL_MODEL, 32768);
    const updates = JSON.parse(raw);
    const pass1Changed = [];
    for (const [name, newContent] of Object.entries(updates)) {
      const applied = applyUpdate(name, newContent);
      if (applied) { changedSet.add(applied); pass1Changed.push(applied); }
    }
    passes['pass1'] = { status: 'ok', filesChanged: pass1Changed };
  } catch (err) {
    console.warn(`Structural pass 1 GPT call failed (${err.message}) — continuing to deep-update pass.`);
    passes['pass1'] = { status: 'error', error: err.message };
  }

  // ── Passes 2-N: dedicated deep-update per group (always runs) ────────
  for (const group of DEEP_UPDATE_GROUPS) {
    console.log(`Running STRUCTURAL deep-update pass (${group.label})…`);
    const groupBlock = group.names
      .filter(name => fileContents[name])
      .map(name => {
        const info  = STRUCTURAL_FILES[name];
        const lines = fileContents[name].split('\n').length;
        return `=== ${name} (${info.desc}, ${lines} lines) ===\n${fileContents[name]}`;
      })
      .join('\n\n');

    const groupUserContent =
      `UPDATE TYPE: STRUCTURAL DEEP UPDATE — you MUST return updated content for ALL files below.\n\n` +
      (guidelines ? `EDITORIAL GUIDELINES:\n${guidelines}\n\n` : '') +
      `FILES TO DEEPLY UPDATE:\n${groupBlock}\n\n` +
      `WEB SEARCH RESULTS:\n${searchContext}`;

    const systemPrompt = group.prompt === 'analysis-map'
      ? DEEP_UPDATE_SYSTEM_PROMPT
      : DEEP_UPDATE_HTML_SYSTEM_PROMPT;

    try {
      const raw     = await callGPT(systemPrompt, groupUserContent, true, STRUCTURAL_MODEL, 32768);
      const updates = JSON.parse(raw);
      const groupChanged = [];
      for (const name of group.names) {
        const newContent = updates[name];
        if (!newContent) {
          console.warn(`Structural deep-update (${group.label}): ${name} — model returned null/empty — skipping.`);
          continue;
        }
        const applied = applyUpdate(name, newContent);
        if (applied && !changedSet.has(applied)) { changedSet.add(applied); groupChanged.push(applied); }
      }
      passes[group.label] = { status: 'ok', filesChanged: groupChanged };
    } catch (err) {
      console.warn(`Structural deep-update pass (${group.label}) GPT call failed (${err.message}) — skipping.`);
      passes[group.label] = { status: 'error', error: err.message };
    }
  }

  const filesChanged = [...changedSet];
  if (filesChanged.length > 0) {
    console.log(`Structural updates: ${filesChanged.length} file(s) modified.`);
  } else {
    console.log('Structural updates: no changes applied.');
  }
  return { filesChanged, passes };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Effective update type — may be promoted from 'auto' after significance assessment.
  let effectiveType = UPDATE_TYPE_INPUT === 'auto' ? 'routine' : UPDATE_TYPE_INPUT;
  console.log(`Update type requested: ${UPDATE_TYPE_INPUT}`);
  const manifest = { timestamp: new Date().toISOString(), type: UPDATE_TYPE_INPUT, effectiveType, phases: {} };

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

  manifest.phases.search = { queries: SEARCH_QUERIES.length, status: 'ok' };

  // ── 2b. Significance assessment (auto mode only) ──────────────────────────

  // Build a compact snapshot of what's already on the page so the significance
  // classifier can tell whether a major event is new or already covered.
  const todayMatchEarly = current24h.match(TODAY_TIMELINE_RE);
  const existingTodayItemsEarly = todayMatchEarly ? todayMatchEarly[1].trim() : '';
  const pageContext =
    `Ticker headlines:\n${(currentData.ticker || []).slice(0, PAGE_CONTEXT_TICKER_LIMIT).join('\n')}\n\n` +
    `Today's timeline items:\n${existingTodayItemsEarly}`;

  if (UPDATE_TYPE_INPUT === 'auto') {
    const assessment = await assessSignificance(searchContext, pageContext);
    manifest.phases.significance = { ...assessment, status: 'ok' };
    if (assessment.structural) {
      effectiveType = 'structural';
      console.log(`  ⚡ Promoted to STRUCTURAL: ${assessment.reason}`);
    } else {
      console.log(`  → Staying ROUTINE: ${assessment.reason}`);
    }
    manifest.effectiveType = effectiveType;
  }

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
  Do not duplicate headlines already in the array. IMPORTANT: an escalation is
  NOT a duplicate — if the array already contains "Country X weighing/considering
  joining", a new confirmed report that Country X has *actively joined* (launched
  strikes, deployed forces) is a new headline and must be prepended.
- Stat keys (statUsTroops, statMissilesFired, statCarrierGroups, statOilAtRisk,
  statCitizensOffline, statIrgcKilled): update ONLY if the search results contain a clearly
  newer confirmed figure with a credible source.
- Scenario percentages (scenarioRevolutionPct, scenarioPahlaviPct, scenarioJuntaPct,
  scenarioCivilWarPct, scenarioRegionalEscalationPct): adjust ONLY if
  a major development materially changes the outlook. Values must be integers
  that sum to exactly 100. Keep scenarioDealPct, scenarioStrikesPct, and scenarioFrozenPct
  at 0 (these scenarios are eliminated).`;

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
      manifest.phases.dataJson = { status: 'skipped', reason: 'missing keys' };
    } else {
      updatedData = parsed;
      console.log('data.json updated successfully.');
      manifest.phases.dataJson = { status: 'ok' };
    }
  } catch (err) {
    console.warn(`data.json update failed (${err.message}) — keeping original.`);
    manifest.phases.dataJson = { status: 'error', error: err.message };
  }

  // ── 4. Generate new timeline items for last-24h.html ────────────────────

  // Extract the existing TODAY items so the model knows what's already there.
  const todayMatch = current24h.match(TODAY_TIMELINE_RE);
  const existingTodayItems = todayMatch ? todayMatch[1].trim() : '';

  const last24hSystemPrompt = `\
You are the editor of the Iran Crisis Report dashboard. Generate new timeline
items for today's "Last 24 Hours" section based on the web search results.

Return a JSON object with exactly ONE key: "newItems" — an array of HTML strings.
Each string is a complete <div class="tl-item"> … </div> block (no outer wrapper).

Rules:
- Return AT MOST 5 items. Only include events that are GENUINELY NEW and not
  already covered by the existing TODAY items shown below.
- An ESCALATION is NOT a duplicate: if an existing item says a country is
  "considering" or "weighing" joining a military campaign, a confirmed report
  of that country *actively joining* (launching strikes, deploying forces) is a
  NEW item and must be included.
- SIGNIFICANCE THRESHOLD — only include an item if it represents a discrete,
  consequential development. The following types of content are NOT significant
  enough and must be EXCLUDED:
    • Routine force-presence status updates (e.g. "Carrier X is operating in
      the region", "CSG continues patrols", "deployment extended amid rising
      operational tempo") — these describe ongoing background conditions, not
      new events.
    • Military media/PR releases (e.g. "CENTCOM releases strike footage",
      "DoD publishes video of carrier operations", "Pentagon releases imagery")
      — publishing a press release or video is not an operational event.
    • Generic operational-tempo reports with no new factual development (e.g.
      "forces remain on heightened alert", "operations continue").
    • Items whose only news value is that a government or military confirmed
      something already widely known or already covered in existing items.
  Ask yourself: "Does this represent something that *changed* or *happened*
  today, or is it just describing a continuing background situation or a
  media release?" Only include it if the answer is the former.
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
  need it.
- Do NOT use markdown formatting — use HTML tags instead (e.g. <strong>bold</strong> not **bold**, <em>italic</em> not *italic*).`;

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
      manifest.phases.timeline = { status: 'ok', added: 0 };
    } else {
      const newItemsHtml = newItems.map(sanitizeMarkdown).join('\n');
      const candidate    = spliceTimelineItems(current24h, newItemsHtml);
      // Validate the template placeholders are still intact.
      const placeholders = ['{{dayToday}}', '{{dayYesterday}}'];
      const allPresent   = placeholders.every(p => candidate.includes(p));
      if (!allPresent) {
        console.warn('last-24h.html placeholder check failed — keeping original.');
        manifest.phases.timeline = { status: 'skipped', reason: 'placeholder check failed' };
      } else {
        updatedLast24h = candidate;
        console.log(`last-24h.html updated with ${newItems.length} new item(s).`);
        manifest.phases.timeline = { status: 'ok', added: newItems.length };
      }
    }
  } catch (err) {
    console.warn(`last-24h.html update failed (${err.message}) — keeping original.`);
    manifest.phases.timeline = { status: 'error', error: err.message };
  }

  // ── 5. Update HTML section zones ──────────────────────────────────────────

  try {
    const zoneResult = await updateZones(searchContext);
    manifest.phases.zones = { status: 'ok', zonesUpdated: zoneResult.zonesUpdated, filesUpdated: zoneResult.filesUpdated };
  } catch (err) {
    console.warn(`Section zone updates failed (${err.message}) — keeping originals.`);
    manifest.phases.zones = { status: 'error', error: err.message };
  }

  // ── 6. Structural updates (only when effective type is structural) ──────

  if (effectiveType === 'structural') {
    try {
      const { filesChanged, passes } = await updateStructural(searchContext);
      manifest.phases.structural = { status: 'ok', filesChanged, passes };
    } catch (err) {
      console.warn(`Structural updates failed (${err.message}) — keeping originals.`);
      manifest.phases.structural = { status: 'error', error: err.message };
    }
  } else {
    manifest.phases.structural = { status: 'skipped', reason: 'routine update' };
  }

  // ── 7. Write updated files ────────────────────────────────────────────────

  fs.writeFileSync(DATA_PATH, JSON.stringify(updatedData, null, 2) + '\n');
  fs.writeFileSync(LAST24H_PATH, updatedLast24h);

  // ── 8. Write update manifest ──────────────────────────────────────────────

  writeManifest(manifest);
  console.log(`Update manifest written to ${path.basename(MANIFEST_PATH)}.`);

  console.log(`AI update complete (requested: ${UPDATE_TYPE_INPUT}, effective: ${effectiveType}).`);
}

main().catch(err => {
  console.error('ai-update.js fatal error:', err);
  process.exit(1);
});
