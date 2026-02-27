#!/usr/bin/env node
/**
 * scripts/ai-update.js
 *
 * Automatically updates page content with the latest Iran-related news by:
 *   1. Searching the web via the Tavily API (cheap, purpose-built for LLM use).
 *   2. Calling OpenAI GPT-4o-mini to update data.json (ticker headlines, key
 *      statistics, scenario likelihood percentages).
 *   3. Calling GPT-4o-mini again to generate new timeline items for the TODAY
 *      block in sections/last-24h.html and splices them in programmatically.
 *
 * Required environment variables (set as GitHub Actions secrets):
 *   TAVILY_API_KEY   — https://tavily.com  (free tier: 1,000 searches/month)
 *   OPENAI_API_KEY   — https://platform.openai.com  (GPT-4o-mini is very cheap)
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
  'Iran nuclear talks US negotiations latest news',
  'Iran protests crackdown IRGC arrests latest news',
  'US military Iran strike threat carrier deployment latest',
  'Iran economy rial rate sanctions latest news',
  'Iran Israel military threat latest news',
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

/** Call GPT-4o-mini and return the raw text of the first choice. */
async function callGPT(systemPrompt, userContent, jsonMode = false) {
  const body = {
    model: 'gpt-4o-mini',
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

  console.log('Updating data.json via GPT-4o-mini…');
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

  console.log('Generating new timeline items via GPT-4o-mini…');
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

  // ── 5. Write updated files ───────────────────────────────────────────────

  fs.writeFileSync(DATA_PATH, JSON.stringify(updatedData, null, 2) + '\n');
  fs.writeFileSync(LAST24H_PATH, updatedLast24h);

  console.log('AI update complete.');
}

main().catch(err => {
  console.error('ai-update.js fatal error:', err);
  process.exit(1);
});
