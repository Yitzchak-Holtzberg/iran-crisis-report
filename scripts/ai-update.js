#!/usr/bin/env node
/**
 * scripts/ai-update.js
 *
 * Automatically updates page content with the latest Iran-related news.
 *
 * Update types (set via UPDATE_TYPE env var, default "auto"):
 *   auto       — alias for "routine" (structural must be triggered manually)
 *   routine    — daily refresh: data.json values, timeline items, AI zone content
 *   structural — major events: all routine updates PLUS section-level HTML changes
 *
 * Required environment variables:
 *   BRAVE_API_KEY    — https://api.search.brave.com/app/keys
 *   OPENAI_API_KEY   — https://platform.openai.com
 *
 * Optional environment variables:
 *   UPDATE_TYPE              — "auto" (default), "routine", or "structural"
 *   OPENAI_ROUTINE_MODEL     — model for routine updates (default: "gpt-5-mini")
 *   OPENAI_STRUCTURAL_MODEL  — model for structural updates (default: "gpt-5")
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Library modules ──────────────────────────────────────────────────────────

const { getSourceTier, classifyAndFilterResults } = require('./lib/source-tiers');
const tavily                                      = require('./lib/tavily-api');
const openai                                      = require('./lib/openai-api');
const { parseHumanDate, extractTlItems, rotateTimelineDays, spliceTimelineItems,
        pruneTimelineItems, filterHallucinations } = require('./lib/timeline');
const { sanitizeMarkdown, updateZones }           = require('./lib/zones');
const { writeManifest, stampFreshness, diffSummary } = require('./lib/manifest');
const { RESEARCH_SITES, deepResearch }            = require('./lib/deep-research');
const { STRUCTURAL_FILES, updateStructural }      = require('./lib/structural-updates');
const { callGPT, safeParseJSON, STRUCTURAL_GPT_TIMEOUT_MS } = openai;

// ── Paths ────────────────────────────────────────────────────────────────────

const BASE_DIR         = path.join(__dirname, '..');
const DATA_PATH        = path.join(BASE_DIR, 'data.json');
const LAST24H_PATH     = path.join(BASE_DIR, 'sections', 'last-24h.html');
const MANIFEST_PATH    = path.join(BASE_DIR, 'data', 'update-manifest.json');
const GUIDELINES_PATH  = path.join(BASE_DIR, 'STRUCTURAL_GUIDELINES.md');
const GPT_LOG_PATH     = path.join(BASE_DIR, 'logs', 'gpt-calls.jsonl');

const TODAY_TIMELINE_RE =
  /<!-- ── TODAY ── -->[\s\S]*?<div class="timeline"[^>]*>([\s\S]*?)<!-- ── YESTERDAY ── -->/;

// ── Environment ──────────────────────────────────────────────────────────────

const BRAVE_KEY         = process.env.BRAVE_API_KEY;
const OPENAI_KEY        = process.env.OPENAI_API_KEY;
const UPDATE_TYPE_INPUT = (process.env.UPDATE_TYPE || 'auto').toLowerCase();
const ROUTINE_MODEL     = process.env.OPENAI_ROUTINE_MODEL    || 'gpt-5-mini';
const STRUCTURAL_MODEL  = process.env.OPENAI_STRUCTURAL_MODEL || 'gpt-5';

if (!['auto', 'routine', 'structural'].includes(UPDATE_TYPE_INPUT)) {
  console.error(`Error: UPDATE_TYPE must be "auto", "routine" or "structural" (got "${UPDATE_TYPE_INPUT}").`);
  process.exit(1);
}

if (!BRAVE_KEY || !OPENAI_KEY) {
  console.error('Error: BRAVE_API_KEY and OPENAI_API_KEY environment variables must be set.');
  process.exit(1);
}

// Initialise library modules with credentials.
tavily.init(BRAVE_KEY);
openai.init(OPENAI_KEY, GPT_LOG_PATH);

// ── Search queries ───────────────────────────────────────────────────────────
// 12 focused queries covering all dashboard sections. Gap detection may add up
// to 3 more at runtime. Think-tank deep dives handled by RESEARCH_SITES in structural mode.
const SEARCH_QUERIES = [
  'US Israel Iran military strikes operations sorties targets today',
  'Iran nuclear IAEA enrichment diplomatic talks ceasefire UN Security Council',
  'Iran protests IRGC crackdown Khamenei succession leadership crisis',
  'Iran opposition Pahlavi Kurdish resistance armed groups uprising',
  'Iran proxy Hezbollah Houthi militia attacks Iraq Syria Lebanon',
  'Strait of Hormuz Red Sea shipping oil tanker disruption',
  'Iran economy sanctions oil price energy market rial crisis',
  'Iran war regional reactions Saudi China Russia Turkey diplomacy',
  'Iran war battle damage assessment CENTCOM equipment losses aircraft vessels destroyed',
  'Iran civilian casualties humanitarian crisis displacement war crimes',
  'Iran IRGC cyber espionage covert operations intelligence',
  'US carrier strike group deployment Iran CENTCOM forces',
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  let effectiveType = UPDATE_TYPE_INPUT === 'auto' ? 'routine' : UPDATE_TYPE_INPUT;
  console.log(`Update type requested: ${UPDATE_TYPE_INPUT}`);
  const manifest = { timestamp: new Date().toISOString(), type: UPDATE_TYPE_INPUT, effectiveType, phases: {} };

  // 1. Read current file contents.
  const currentData  = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const current24h   = fs.readFileSync(LAST24H_PATH, 'utf8');

  const dataDate = parseHumanDate(currentData.date);
  if (dataDate) {
    const ageMs = Date.now() - dataDate.getTime();
    if (ageMs > 48 * 60 * 60 * 1000) {
      console.warn(`Warning: data.json date "${currentData.date}" is more than 48h from now. Run update-date.js first.`);
    }
  }

  // 2. Fetch news from all search queries in parallel.
  const isStructural = UPDATE_TYPE_INPUT === 'structural';
  const searchOpts = {
    topic: 'news',
    time_range: isStructural ? 'week' : 'day',
    search_depth: isStructural ? 'advanced' : 'basic',
  };
  console.log(`Searching the web for the latest Iran news (topic=news, range=${searchOpts.time_range}, depth=${searchOpts.search_depth})…`);
  const searchSettled = await Promise.allSettled(SEARCH_QUERIES.map(q => tavily.tavilySearch(q, searchOpts)));
  const failedCount = searchSettled.filter(r => r.status === 'rejected').length;
  if (failedCount > 0) {
    console.warn(`${failedCount}/${SEARCH_QUERIES.length} search queries failed — continuing with ${SEARCH_QUERIES.length - failedCount} results.`);
    for (const [i, r] of searchSettled.entries()) {
      if (r.status === 'rejected') {
        console.warn(`  ✗ Query ${i + 1} ("${SEARCH_QUERIES[i].slice(0, 50)}"): ${r.reason?.message || r.reason}`);
      }
    }
  }
  if (failedCount === SEARCH_QUERIES.length) {
    console.error('FATAL: All Brave Search queries failed — aborting update. Check BRAVE_API_KEY and quota.');
    process.exit(1);
  }
  const searchResults = searchSettled.map(r => r.status === 'fulfilled' ? r.value : { results: [], answer: '(search failed)' });

  // ── Gap detection: ask AI what angles the initial searches missed ────────
  // One cheap GPT-mini call that may add up to 3 bonus searches, providing
  // corroborating sources for fact-checking claims in under-covered domains.
  const BASE_QUERY_COUNT = SEARCH_QUERIES.length;
  try {
    const topicsCovered = searchResults.map((sr, i) => {
      const titles = (sr.results || []).slice(0, 3).map(r => r.title || '').filter(Boolean).join('; ');
      return `${SEARCH_QUERIES[i]}: ${titles || '(no results)'}`;
    }).join('\n');

    const gapRaw = await callGPT(
      `You are a news editor for the Iran Crisis Report dashboard. Given the search topics ` +
      `and top results below, identify 2-3 important angles about the Iran crisis that are ` +
      `NOT covered. Think about: unexpected diplomatic moves, new actors, economic ripple ` +
      `effects, domestic politics in other countries, technology/cyber, humanitarian, ` +
      `international law, or any breaking development that doesn't fit the existing categories.\n\n` +
      `Return a JSON object: { "queries": ["query1", "query2", "query3"] }\n` +
      `Each query should be under 80 characters, focused, and use news-style keywords.\n` +
      `If the existing coverage is comprehensive, return { "queries": [] }.`,
      topicsCovered,
      true, ROUTINE_MODEL, 2048, 15000
    );
    const gapParsed = safeParseJSON(gapRaw);
    const gapQueries = Array.isArray(gapParsed.queries) ? gapParsed.queries.slice(0, 3) : [];

    if (gapQueries.length > 0) {
      console.log(`  Gap detection found ${gapQueries.length} missing angles: ${gapQueries.join(' | ')}`);
      const gapSettled = await Promise.allSettled(gapQueries.map(q => tavily.tavilySearch(q, searchOpts)));
      for (let i = 0; i < gapSettled.length; i++) {
        if (gapSettled[i].status === 'fulfilled') {
          searchResults.push(gapSettled[i].value);
          SEARCH_QUERIES.push(gapQueries[i]);
        }
      }
      console.log(`  Gap searches returned ${gapSettled.filter(r => r.status === 'fulfilled').length} result sets.`);
    } else {
      console.log('  Gap detection: existing coverage is comprehensive.');
    }
  } catch (err) {
    console.warn(`Gap detection failed (${err.message}) — continuing with standard queries.`);
  }

  // ── Deduplicate search results across queries by URL ────────────────────
  const seenUrls = new Set();
  for (const sr of searchResults) {
    if (!sr.results) continue;
    sr.results = sr.results.filter(r => {
      if (!r.url || seenUrls.has(r.url)) return false;
      seenUrls.add(r.url);
      return true;
    });
  }
  const dedupedCount = seenUrls.size;

  // ── Source tier classification and filtering ─────────────────────────────
  const { dropped: tierDropped } = classifyAndFilterResults(searchResults);
  if (tierDropped > 0) {
    console.log(`  Source tier filter: dropped ${tierDropped} low-tier results (tier 6 where higher-tier coverage exists).`);
  }

  // Build context block from all search results.
  const searchContext = searchResults.map((sr, i) => {
    const lines = (sr.results || []).slice(0, 5).map(r => {
      const snippet = (r.content || '').slice(0, 350).replace(/\s+/g, ' ');
      const tag = r._tierTag || '';
      return `  - ${tag} [${r.url}] ${r.title || ''}: ${snippet}`;
    }).join('\n');
    return `### Topic ${i + 1}: ${SEARCH_QUERIES[i]}\nSummary: ${sr.answer || '(none)'}\n${lines}`;
  }).join('\n\n');

  // Build evidence domain registry for provenance tracking.
  const { extractSearchDomains } = require('./lib/provenance');
  const searchDomains = extractSearchDomains(searchResults);
  console.log(`  Evidence registry: ${searchDomains.size} unique domains from search results.`);

  const gapQueryCount = SEARCH_QUERIES.length - BASE_QUERY_COUNT;
  manifest.phases.search = { queries: SEARCH_QUERIES.length, gapQueries: gapQueryCount, uniqueResults: dedupedCount, tierDropped, status: 'ok', evidenceDomains: searchDomains.size };

  // Use search context directly for downstream updates.
  const searchSummary = searchContext;

  // ── 3. Update data.json ─────────────────────────────────────────────────

  const dataSystemPrompt = `\
You are the editor of the Iran Crisis Report dashboard. Update ONLY the mutable
fields shown below using the latest news from the web search results.

Rules:
- Return ONLY valid JSON with the EXACT same keys as the input — no extra keys,
  no removed keys, no markdown fences.
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
- Scenario percentages (scenarioDeclaredVictoryPct, scenarioNegotiatedDealPct,
  scenarioDemocraticRevolutionPct, scenarioManagedTransitionPct,
  scenarioRegimeCollapsePct): adjust ONLY if a major development materially
  changes the outlook. Values must be integers that sum to exactly 100.
  Five scenarios: declared victory, negotiated deal, democratic revolution,
  managed transition, and regime collapse.`;

  const MUTABLE_DATA_KEYS = [
    'ticker', 'statUsTroops', 'statMissilesFired', 'statCarrierGroups',
    'statOilAtRisk', 'statCitizensOffline', 'statIrgcKilled',
    'scenarioDeclaredVictoryPct', 'scenarioNegotiatedDealPct',
    'scenarioDemocraticRevolutionPct', 'scenarioManagedTransitionPct',
    'scenarioRegimeCollapsePct',
  ];
  const mutableData = {};
  for (const k of MUTABLE_DATA_KEYS) {
    if (k in currentData) mutableData[k] = currentData[k];
  }
  const dataUserContent =
    `MUTABLE FIELDS (update these; all other data.json keys are managed separately):\n${JSON.stringify(mutableData, null, 2)}\n\n` +
    `WEB SEARCH RESULTS:\n${searchSummary}`;

  console.log('Updating data.json via GPT-5-mini…');
  let updatedData = currentData;
  try {
    const raw = await callGPT(dataSystemPrompt, dataUserContent, true);
    const parsed = JSON.parse(raw);
    const returnedKeys = new Set(Object.keys(parsed));
    const missingMutable = MUTABLE_DATA_KEYS.filter(k => k in currentData && !returnedKeys.has(k));
    if (missingMutable.length > 0) {
      console.warn(`data.json response missing mutable keys: ${missingMutable.join(', ')} — keeping original.`);
      manifest.phases.dataJson = { status: 'skipped', reason: 'missing keys' };
    } else {
      const scenarioKeys = MUTABLE_DATA_KEYS.filter(k => k.startsWith('scenario') && k.endsWith('Pct'));
      const scenarioSum = scenarioKeys.reduce((s, k) => s + (parseInt(parsed[k], 10) || 0), 0);
      if (scenarioSum !== 100) {
        console.warn(`data.json: scenario percentages sum to ${scenarioSum} (expected 100) — keeping original scenarios.`);
        for (const k of scenarioKeys) parsed[k] = currentData[k];
      }
      updatedData = { ...currentData };
      for (const k of MUTABLE_DATA_KEYS) {
        if (k in parsed) updatedData[k] = parsed[k];
      }
      console.log('data.json updated successfully.');
      manifest.phases.dataJson = { status: 'ok' };
    }
  } catch (err) {
    console.warn(`data.json update failed (${err.message}) — keeping original.`);
    manifest.phases.dataJson = { status: 'error', error: err.message };
  }

  // ── 4. Generate new timeline items for last-24h.html ────────────────────

  const currentDate = updatedData.date || currentData.date;
  console.log(`Timeline rotation: current date is "${currentDate}".`);
  let rotated24h = rotateTimelineDays(current24h, currentDate);

  const todayMatch = rotated24h.match(TODAY_TIMELINE_RE);
  const existingTodayItems = todayMatch ? todayMatch[1].trim() : '';
  const todayIsEmpty = extractTlItems(existingTodayItems).length === 0;

  const maxNewItems = todayIsEmpty ? 10 : 5;
  if (todayIsEmpty) {
    console.log('TODAY section is empty after rotation — using full rebuild prompt.');
  }

  const last24hSystemPrompt = `\
You are the editor of the Iran Crisis Report dashboard. Generate new timeline
items for today's "Last 24 Hours" section based on the web search results.

Return a JSON object with exactly ONE key: "newItems" — an array of HTML strings.
Each string is a complete <div class="tl-item" data-date="YYYY-MM-DD"> … </div>
block (no outer wrapper).

Rules:
- Return AT MOST ${maxNewItems} items. Only include events that are GENUINELY NEW and not
  already covered by the existing TODAY items shown below.
${todayIsEmpty ? `- The TODAY section is currently EMPTY (a new day started). Generate up to ${maxNewItems}
  items covering the most significant developments from today's search results.\n` : ''}\
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
- HTML format for each item (CRITICAL: include data-date attribute with today's
  date in ISO format YYYY-MM-DD on the outer div):
    <div class="tl-item" data-date="YYYY-MM-DD">
      <div class="tl-dot" style="border-color:var(--COLOR);"></div>
      <div class="date">CATEGORY — SHORT HEADLINE IN UPPER CASE</div>
      <div class="content">1–3 sentence description with <strong>key details bolded</strong>. — Source: <a href="URL" style="color:var(--accent-cyan);" target="_blank" rel="noopener noreferrer">Outlet, Date</a></div>
    </div>
  For multiple sources use: <a href="URL1" style="color:var(--accent-cyan);" target="_blank" rel="noopener noreferrer">Outlet1, Date</a>; <a href="URL2" style="color:var(--accent-cyan);" target="_blank" rel="noopener noreferrer">Outlet2, Date</a>
  Always use the outlet homepage URL (e.g. https://www.reuters.com/ for Reuters, https://www.centcom.mil/ for CENTCOM). Do NOT fabricate or guess specific article paths — the content in this dashboard is a hypothetical scenario and specific article URLs will not exist.
  Do NOT use <em> tags to wrap source citations — use <a href> links instead.
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
- Do NOT use markdown formatting — use HTML tags instead (e.g. <strong>bold</strong> not **bold**, <em>italic</em> not *italic*).
- Source tier guidance: search results are tagged [Tier N]. Prefer tier 1-3 sources for
  confirmed facts. Tier 4 is acceptable. Tier 5 items need a framing note (e.g. "opposition-aligned").
  Tier 6 items should NOT appear in the timeline unless corroborated by a higher-tier source.
- Source diversity rule: tier 1–4 sources (official, wire services, defence specialists,
  quality broadsheets) may be cited freely with no per-outlet limit. Tier 5 regional
  outlets (Al Jazeera, Iran International, etc.) should not be cited more than twice
  across all timeline items — when a tier 5 outlet covers the same event as a tier 1–4
  source, cite the higher-tier source instead. Al Jazeera should only be cited when it
  has unique on-the-ground reporting not available from higher-tier sources.`;

  const last24hUserContent =
    `EXISTING TODAY ITEMS (do not duplicate these):\n${existingTodayItems}\n\n` +
    `WEB SEARCH RESULTS:\n${searchSummary}`;

  console.log(`Generating new timeline items via GPT-5-mini (max ${maxNewItems})…`);
  let updatedLast24h = rotated24h;
  try {
    const raw = await callGPT(last24hSystemPrompt, last24hUserContent, true);
    const parsed = JSON.parse(raw);
    let newItems = Array.isArray(parsed.newItems) ? parsed.newItems : [];
    newItems = filterHallucinations(newItems, searchContext);
    if (newItems.length === 0) {
      console.log('No new timeline items to add.');
      manifest.phases.timeline = { status: 'ok', added: 0, rotated: !todayIsEmpty ? 0 : 'full-rebuild' };
    } else {
      const newItemsHtml = newItems.map(sanitizeMarkdown).join('\n');
      let candidate      = spliceTimelineItems(rotated24h, newItemsHtml);
      candidate = pruneTimelineItems(candidate);
      const placeholders = ['{{dayToday}}', '{{dayYesterday}}'];
      const allPresent   = placeholders.every(p => candidate.includes(p));
      if (!allPresent) {
        console.warn('last-24h.html placeholder check failed — keeping rotated version.');
        manifest.phases.timeline = { status: 'skipped', reason: 'placeholder check failed' };
      } else {
        updatedLast24h = candidate;
        console.log(`last-24h.html updated with ${newItems.length} new item(s).`);
        manifest.phases.timeline = { status: 'ok', added: newItems.length, fullRebuild: todayIsEmpty };
      }
    }
  } catch (err) {
    console.warn(`last-24h.html update failed (${err.message}) — keeping rotated version.`);
    manifest.phases.timeline = { status: 'error', error: err.message };
  }

  // ── 5. Update HTML section zones ──────────────────────────────────────────

  try {
    const zoneResult = await updateZones(searchSummary, { baseDir: BASE_DIR, callGPT });
    manifest.phases.zones = { status: 'ok', zonesUpdated: zoneResult.zonesUpdated, filesUpdated: zoneResult.filesUpdated };
  } catch (err) {
    console.warn(`Section zone updates failed (${err.message}) — keeping originals.`);
    manifest.phases.zones = { status: 'error', error: err.message };
  }

  // ── 6. Structural updates (only when effective type is structural) ──────

  if (effectiveType === 'structural') {
    const researchDeps = {
      tavilySearch: tavily.tavilySearch,
      tavilyExtract: tavily.tavilyExtract,
      getSourceTier, callGPT, routineModel: ROUTINE_MODEL,
    };

    // 6a. General deep research for pass 1 (broad structural)
    const MIN_DEEP_RESEARCH_ARTICLES = 5;
    let pass1Context = searchContext;
    let deepResearchArticleTotal = 0;
    try {
      const generalResearch = await deepResearch(RESEARCH_SITES.general, 'general', researchDeps);
      deepResearchArticleTotal += generalResearch.articlesExtracted || 0;
      if (generalResearch.articleContext) {
        pass1Context = searchContext + generalResearch.articleContext;
      }
      manifest.phases.deepResearch = {
        status: 'ok',
        general: { sitesSearched: generalResearch.sitesSearched, articlesExtracted: generalResearch.articlesExtracted },
        perGroup: {},
      };
    } catch (err) {
      console.warn(`General deep research failed (${err.message}) — continuing with standard search context.`);
      manifest.phases.deepResearch = { status: 'partial', error: err.message, perGroup: {} };
    }

    // Guard: if deep research extracted too few articles, the structural
    // passes would be running on thin data.  Downgrade to routine instead.
    if (deepResearchArticleTotal < MIN_DEEP_RESEARCH_ARTICLES) {
      console.warn(`Deep research extracted only ${deepResearchArticleTotal} articles (minimum ${MIN_DEEP_RESEARCH_ARTICLES}) — downgrading to ROUTINE to avoid low-quality structural changes.`);
      effectiveType = 'routine';
      manifest.effectiveType = 'routine';
      manifest.phases.structural = { status: 'skipped', reason: `deep research insufficient (${deepResearchArticleTotal}/${MIN_DEEP_RESEARCH_ARTICLES} articles)` };
    }

    // 6b. Run structural updates (only if still structural after guard)
    if (effectiveType === 'structural') {
      const structuralDeps = {
        baseDir: BASE_DIR,
        callGPT,
        structuralModel: STRUCTURAL_MODEL,
        structuralTimeout: STRUCTURAL_GPT_TIMEOUT_MS,
        guidelinesPath: GUIDELINES_PATH,
        ...researchDeps,
      };
      try {
        const { filesChanged, passes } = await updateStructural(searchContext, pass1Context, structuralDeps);
        manifest.phases.structural = { status: 'ok', filesChanged, passes };
        if (passes) {
          for (const [label, passInfo] of Object.entries(passes)) {
            if (passInfo.research && manifest.phases.deepResearch) {
              manifest.phases.deepResearch.perGroup[label] = passInfo.research;
            }
          }
        }
      } catch (err) {
        console.warn(`Structural updates failed (${err.message}) — keeping originals.`);
        manifest.phases.structural = { status: 'error', error: err.message };
      }
    }
  } else {
    manifest.phases.structural = { status: 'skipped', reason: 'routine update' };
  }

  // ── Cross-file consistency validation ───────────────────────────────────
  const consistencyWarnings = [];
  const navalSubPath = path.join(BASE_DIR, 'sections', 'naval.html');
  if (fs.existsSync(navalSubPath)) {
    const navalContent = fs.readFileSync(navalSubPath, 'utf8');
    const carrierCount = parseInt(updatedData.statCarrierGroups, 10);
    if (carrierCount && navalContent.includes('@ai-zone:naval-subtitle')) {
      // Informational check only.
    }
  }
  if (updatedData.scenarioDeclaredVictoryPct !== undefined) {
    const scenariosPath = path.join(BASE_DIR, 'sections', 'scenarios.html');
    if (fs.existsSync(scenariosPath)) {
      const scenariosContent = fs.readFileSync(scenariosPath, 'utf8');
      const pctInHtml = scenariosContent.match(/\{\{scenarioDeclaredVictoryPct\}\}/);
      if (!pctInHtml) {
        consistencyWarnings.push('scenarios.html: {{scenarioDeclaredVictoryPct}} placeholder missing — percentages may not render');
      }
    }
  }
  if (consistencyWarnings.length > 0) {
    console.warn('Cross-file consistency warnings:');
    consistencyWarnings.forEach(w => console.warn(`  ⚠ ${w}`));
    manifest.consistencyWarnings = consistencyWarnings;
  }

  // ── 7. Write updated files ──────────────────────────────────────────────

  const changelog = [];

  const dataJsonStr = JSON.stringify(updatedData, null, 2) + '\n';
  const origDataStr = JSON.stringify(currentData, null, 2) + '\n';
  if (dataJsonStr !== origDataStr) {
    changelog.push({ file: 'data.json', ...diffSummary(origDataStr, dataJsonStr) });
  }
  fs.writeFileSync(DATA_PATH, dataJsonStr);

  // ── Tag balance check + AI self-repair for last-24h.html ──────────────────
  const openTags  = (updatedLast24h.match(/<(div|section|article)\b/gi) || []).length;
  const closeTags = (updatedLast24h.match(/<\/(div|section|article)>/gi) || []).length;
  if (openTags !== closeTags) {
    console.warn(`last-24h.html has unbalanced tags (${openTags} open vs ${closeTags} close) — attempting AI repair…`);
    try {
      const repaired = await callGPT(
        'You are an HTML repair tool. Fix the unbalanced opening/closing div, section, and article tags in the provided HTML fragment. Return ONLY the corrected HTML with no explanation. Preserve all content, classes, IDs, attributes, and {{placeholder}} variables exactly as-is. Do not add, remove, or reorder any content — only fix missing or extra closing tags.',
        updatedLast24h,
        false
      );
      const repairedOpen  = (repaired.match(/<(div|section|article)\b/gi) || []).length;
      const repairedClose = (repaired.match(/<\/(div|section|article)>/gi) || []).length;
      const placeholders  = ['{{dayToday}}', '{{dayYesterday}}'];
      const placeholdersOk = placeholders.every(p => repaired.includes(p));
      if (repairedOpen === repairedClose && placeholdersOk) {
        updatedLast24h = repaired;
        console.log('  AI repair succeeded — tags now balanced.');
        manifest.phases.tagRepair = { status: 'ok', before: { open: openTags, close: closeTags } };
      } else {
        console.warn('  AI repair still unbalanced or lost placeholders — falling back to previous version.');
        updatedLast24h = current24h;
        manifest.phases.tagRepair = { status: 'fallback', reason: 'repair did not fix balance' };
      }
    } catch (err) {
      console.warn(`  AI repair failed (${err.message}) — falling back to previous version.`);
      updatedLast24h = current24h;
      manifest.phases.tagRepair = { status: 'error', error: err.message };
    }
  }

  if (updatedLast24h !== current24h) {
    changelog.push({ file: 'sections/last-24h.html', ...diffSummary(current24h, updatedLast24h) });
    stampFreshness(LAST24H_PATH);
  }
  fs.writeFileSync(LAST24H_PATH, updatedLast24h);

  const modifiedSections = new Set();
  if (manifest.phases.zones?.filesUpdated) {
    for (const f of manifest.phases.zones.filesUpdated) {
      modifiedSections.add(path.join(BASE_DIR, 'sections', f));
    }
  }
  if (manifest.phases.structural?.filesChanged) {
    for (const name of manifest.phases.structural.filesChanged) {
      const info = STRUCTURAL_FILES[name];
      if (info) modifiedSections.add(path.join(BASE_DIR, info.rel));
    }
  }
  for (const fp of modifiedSections) {
    if (fs.existsSync(fp) && fp.endsWith('.html')) {
      stampFreshness(fp);
    }
  }

  manifest.changelog = changelog;

  // ── 8. Write update manifest ────────────────────────────────────────────

  writeManifest(MANIFEST_PATH, manifest);
  console.log(`Update manifest written to ${path.basename(MANIFEST_PATH)}.`);

  console.log(`AI update complete (requested: ${UPDATE_TYPE_INPUT}, effective: ${effectiveType}).`);
}

main().catch(err => {
  console.error('ai-update.js fatal error:', err);
  process.exit(1);
});
