'use strict';

const fs   = require('fs');
const path = require('path');
const { sanitizeMarkdown } = require('./zones');
const { RESEARCH_SITES, deepResearch } = require('./deep-research');

// ── Structural update config ────────────────────────────────────────────────

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
  'map':              { rel: 'js/map.js',                        desc: 'Theater of Operations interactive map data (MapLibre GL markers, popups, corridors, strike lines)' },
  'nuclear-teaser':   { rel: 'sections/nuclear-teaser.html',    desc: 'Nuclear/diplomatic teaser (main page)' },
  'scenarios-teaser': { rel: 'sections/scenarios-teaser.html',  desc: 'Scenarios teaser (main page)' },
  'forces-teaser':    { rel: 'sections/forces-teaser.html',     desc: 'US Strike Forces teaser (main page)' },
  'inside-iran-teaser': { rel: 'sections/inside-iran-teaser.html', desc: 'Inside Iran teaser (main page)' },
  'reactions-teaser': { rel: 'sections/reactions-teaser.html',  desc: 'Regional reactions teaser (main page)' },
  'analysis':         { rel: 'sections/analysis.html',          desc: 'Expert analysis: CSIS, ISW, Carnegie, Brookings, Atlantic Council what-happens-next' },
};

const STRUCTURAL_BASE_RULES = `\
- Follow the EDITORIAL GUIDELINES for card/callout patterns and source tiers
- Preserve ALL existing @ai-zone markers exactly as they are
- Preserve ALL {{placeholder}} template variables exactly as they are
- Preserve the section-header <div> with its id attribute at the top
- Keep HTML style consistent with the existing file (same class names, CSS
  variable usage, indentation)
- Update all content to reflect the latest news; add new callouts at the top
  for the most significant developments
- Do NOT use markdown — use HTML tags (<strong>, <em>, etc.)
- Do NOT change <script> tags, inline JavaScript, or SVG diagrams
- Do NOT fabricate facts, dates, URLs, or attribution — if unsure, keep existing content
- Search results are pre-tagged with [Tier N] source reliability labels:
  Tiers 1-3: trusted for facts. Tier 4: good for confirmed events. Tier 5: include framing note.
  Tier 6: only for unconfirmed/fog-of-war content, must note "requires corroboration".
  Tiers 5 and 6 CAN update confirmed-unconfirmed sections (fog of war) with appropriate caveats.`;

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
${STRUCTURAL_BASE_RULES}
- Only make changes that are clearly justified by the search results
- New cards/callouts MUST use the exact templates from the guidelines
- Do NOT remove content unless it is clearly outdated or contradicted
- When adding new content, use the correct severity-color CSS variables
- Maximum response size: return at most 3 section files per call`;

const DEEP_UPDATE_GROUPS = [
  {
    names:  ['analysis'],
    label:  'analysis',
    prompt: 'analysis-map',
    researchSites: 'analysis',
  },
  {
    names:  ['map'],
    label:  'map',
    prompt: 'analysis-map',
    researchSites: 'map',
  },
  {
    names:  ['scenarios'],
    label:  'scenarios',
    prompt: 'html',
    researchSites: 'scenarios',
  },
  {
    names:  ['reactions'],
    label:  'reactions',
    prompt: 'html',
    researchSites: 'reactions',
  },
  {
    names:  ['naval', 'air-power'],
    label:  'naval + air-power',
    prompt: 'html',
    researchSites: 'naval',
  },
  {
    names:  ['military'],
    label:  'military',
    prompt: 'html',
    researchSites: 'military',
  },
];

const DEEP_UPDATE_SYSTEM_PROMPT = `\
You are the editor of the Iran Crisis Report dashboard. A MAJOR development has
occurred. You MUST return deeply updated content for ALL files listed below —
they must always reflect the latest confirmed developments.

For each file you will receive the current content. Return a JSON object where
each key matches the file name. The value for each key MUST be the FULL updated
content — never null.

Shared rules:
${STRUCTURAL_BASE_RULES}

Additional rules for map (js/map.js):
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
${STRUCTURAL_BASE_RULES}`;

/**
 * Structural update phase.
 * @param {object} deps - { baseDir, callGPT, structuralModel, structuralTimeout,
 *                          guidelinesPath, tavilySearch, tavilyExtract,
 *                          getSourceTier, routineModel }
 */
async function updateStructural(searchContext, pass1Context, deps) {
  const {
    baseDir, callGPT, structuralModel, structuralTimeout,
    guidelinesPath, tavilySearch, tavilyExtract, getSourceTier, routineModel,
  } = deps;
  if (!pass1Context) pass1Context = searchContext;

  console.log(`Running STRUCTURAL update phase (model: ${structuralModel})…`);

  // Sanity-check config.
  for (const group of DEEP_UPDATE_GROUPS) {
    for (const name of group.names) {
      if (!STRUCTURAL_FILES[name]) {
        console.error(`DEEP_UPDATE_GROUPS includes "${name}" which is not in STRUCTURAL_FILES — fix the configuration.`);
      }
    }
  }

  const allDeepUpdateNames = DEEP_UPDATE_GROUPS.flatMap(g => g.names);

  // Load editorial guidelines.
  let guidelines = '';
  if (fs.existsSync(guidelinesPath)) {
    guidelines = fs.readFileSync(guidelinesPath, 'utf8');
  } else {
    console.warn('STRUCTURAL_GUIDELINES.md not found — proceeding without editorial guidelines.');
  }

  // Read all eligible files.
  const fileContents = {};
  for (const [name, info] of Object.entries(STRUCTURAL_FILES)) {
    const fullPath = path.join(baseDir, info.rel);
    if (fs.existsSync(fullPath)) {
      fileContents[name] = fs.readFileSync(fullPath, 'utf8');
    }
  }

  /** Validate and write a proposed update for a single file. */
  function applyUpdate(name, newContent) {
    if (!newContent || !STRUCTURAL_FILES[name]) return null;
    const info     = STRUCTURAL_FILES[name];
    const fullPath = path.join(baseDir, info.rel);
    const original = fileContents[name];
    if (!original) return null;

    const isJs = info.rel.endsWith('.js');

    if (isJs) {
      if (!newContent.includes('document.addEventListener(')) {
        console.warn(`Structural: ${name} — DOMContentLoaded wrapper missing — skipping.`);
        return null;
      }
      if (!newContent.includes('maplibregl.Map(')) {
        console.warn(`Structural: ${name} — MapLibre GL map initialisation missing — skipping.`);
        return null;
      }
    } else {
      // HTML validation: check section header ID.
      const origIdMatch = original.match(/class="section-header"[^>]*id="([^"]+)"/);
      if (origIdMatch) {
        const sectionId = origIdMatch[1];
        if (!newContent.includes(`id="${sectionId}"`)) {
          console.warn(`Structural: ${name} — section header id="${sectionId}" missing — skipping.`);
          return null;
        }
      }

      // Check placeholder preservation.
      const placeholders = [...original.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[0]);
      const missingPlaceholders = placeholders.filter(p => !newContent.includes(p));
      if (missingPlaceholders.length > 0) {
        console.warn(`Structural: ${name} — missing placeholders: ${missingPlaceholders.join(', ')} — skipping.`);
        return null;
      }

      // Check AI zone marker preservation.
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

    // Check HTML tag balance (opening vs closing div/section/article tags).
    const openDivs = (newContent.match(/<(div|section|article)\b/gi) || []).length;
    const closeDivs = (newContent.match(/<\/(div|section|article)>/gi) || []).length;
    if (openDivs !== closeDivs) {
      console.warn(`Structural: ${name} — unbalanced HTML tags (${openDivs} opening vs ${closeDivs} closing) — skipping.`);
      return null;
    }

    // Reject suspiciously small content.
    if (newContent.length < original.length * 0.3) {
      console.warn(`Structural: ${name} — replacement is too small (${newContent.length} vs ${original.length} chars) — skipping.`);
      return null;
    }

    fs.writeFileSync(fullPath, isJs ? newContent : sanitizeMarkdown(newContent));
    console.log(`  Structural update applied to ${info.rel}.`);
    return name;
  }

  const changedSet = new Set();
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
    `WEB SEARCH RESULTS:\n${pass1Context}`;

  try {
    const raw     = await callGPT(STRUCTURAL_SYSTEM_PROMPT, pass1UserContent, true, structuralModel, 32768, structuralTimeout);
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

  // ── Passes 2-N: dedicated deep-update per group ───────────────────────
  const researchDeps = { tavilySearch, tavilyExtract, getSourceTier, callGPT, routineModel };

  for (const group of DEEP_UPDATE_GROUPS) {
    console.log(`Running STRUCTURAL deep-update pass (${group.label})…`);

    // Per-group deep research
    let groupContext = searchContext;
    const researchKey = group.researchSites;
    if (researchKey && RESEARCH_SITES[researchKey]) {
      try {
        const research = await deepResearch(RESEARCH_SITES[researchKey], group.label, researchDeps);
        if (research.articleContext) {
          groupContext = searchContext + research.articleContext;
          console.log(`  ${group.label} enriched context: ${(groupContext.length / 1024).toFixed(1)}KB`);
        }
        passes[group.label + '_research'] = {
          research: { sitesSearched: research.sitesSearched, articlesExtracted: research.articlesExtracted },
        };
      } catch (err) {
        console.warn(`  Deep research for ${group.label} failed (${err.message}) — using standard context.`);
      }
    }

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
      `WEB SEARCH RESULTS:\n${groupContext}`;

    const systemPrompt = group.prompt === 'analysis-map'
      ? DEEP_UPDATE_SYSTEM_PROMPT
      : DEEP_UPDATE_HTML_SYSTEM_PROMPT;

    try {
      const raw     = await callGPT(systemPrompt, groupUserContent, true, structuralModel, 32768, structuralTimeout);
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

module.exports = { STRUCTURAL_FILES, updateStructural };
