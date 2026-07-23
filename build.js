#!/usr/bin/env node
/**
 * build.js — assembles HTML pages from section partials using Nunjucks.
 *
 * Usage:  node build.js
 *
 * Section files in sections/ use standard Nunjucks syntax:
 *   {% include "sections/path" %}  — file inclusion (recursive)
 *   {{ key }}                      — replaced with values from data.json
 *   {{ tickerHtml | safe }}        — ticker items from data.json (doubled for CSS scroll loop)
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const nunjucks = require('nunjucks');

const { validateProvenanceBuild } = require('./scripts/lib/provenance');

const BASE_DIR = __dirname;

// Configure Nunjucks — project root as template base, no autoescape (raw HTML).
nunjucks.configure(BASE_DIR, {
  autoescape: false,
  throwOnUndefined: false,
  noCache: true,
});

// Load the central data file used for template substitutions.
const DATA = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'data.json'), 'utf8'));

// Load and validate data.json against the schema.
const SCHEMA = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'data.schema.json'), 'utf8'));

/** Validate data.json against data.schema.json (lightweight, no dependencies). */
function validateDataJson(data, schema) {
  const warnings = [];

  for (const key of schema.required || []) {
    if (!(key in data)) {
      warnings.push(`data.json: missing required key "${key}"`);
    }
  }

  for (const [key, val] of Object.entries(data)) {
    const prop = (schema.properties || {})[key];
    if (!prop) {
      if (schema.additionalProperties === false) {
        warnings.push(`data.json: unknown key "${key}" (not in schema)`);
      }
      continue;
    }
    if (prop.type === 'string') {
      if (typeof val !== 'string') {
        warnings.push(`data.json: "${key}" should be a string, got ${typeof val}`);
      } else if (prop.pattern && !new RegExp(prop.pattern).test(val)) {
        warnings.push(`data.json: "${key}" value "${val}" does not match pattern ${prop.pattern}`);
      }
    } else if (prop.type === 'integer') {
      if (typeof val !== 'number' || !Number.isInteger(val)) {
        warnings.push(`data.json: "${key}" should be an integer, got ${typeof val} (${val})`);
      } else {
        if (prop.minimum !== undefined && val < prop.minimum) {
          warnings.push(`data.json: "${key}" value ${val} is below minimum ${prop.minimum}`);
        }
        if (prop.maximum !== undefined && val > prop.maximum) {
          warnings.push(`data.json: "${key}" value ${val} is above maximum ${prop.maximum}`);
        }
      }
    } else if (prop.type === 'array' && !Array.isArray(val)) {
      warnings.push(`data.json: "${key}" should be an array, got ${typeof val}`);
    }
  }

  // Scenario percentages (excluding scenarioStrikesPct) must sum to 100.
  const scenarioKeys = Object.keys(data).filter(k => k.startsWith('scenario') && k.endsWith('Pct'));
  if (scenarioKeys.length > 0) {
    const sum = scenarioKeys.reduce((s, k) => s + (parseInt(data[k], 10) || 0), 0);
    if (sum !== 100) {
      warnings.push(`data.json: scenario percentages sum to ${sum}, expected 100`);
    }
  }

  return warnings;
}

const dataWarnings = validateDataJson(DATA, SCHEMA);
if (dataWarnings.length > 0) {
  process.stderr.write('\ndata.json Validation:\n');
  dataWarnings.forEach(w => process.stderr.write(`  ⚠ ${w}\n`));
  process.stderr.write('\n');
}

// Derive day-label helpers from the "date" field.
(function injectDayLabels() {
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTHS_UP    = MONTHS_SHORT.map(m => m.toUpperCase());
  const fmt = dt => `${MONTHS_UP[dt.getMonth()]} ${dt.getDate()}`;
  const today = new Date(DATA.date);
  if (isNaN(today.getTime())) {
    throw new Error(`data.json "date" field is not a valid date: "${DATA.date}"`);
  }
  const yesterday  = new Date(today); yesterday.setDate(today.getDate() - 1);
  const twoDaysAgo = new Date(today); twoDaysAgo.setDate(today.getDate() - 2);
  DATA.dayToday      = fmt(today);
  DATA.dayYesterday  = fmt(yesterday);
  DATA.dayTwoDaysAgo = fmt(twoDaysAgo);
  DATA.dateShort = `${MONTHS_SHORT[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
}());

// Pre-compute ticker HTML (doubled for CSS scroll loop).
const tickerSpans = DATA.ticker.map(t => `    <span>${t}</span>`).join('\n');
DATA.tickerHtml = `${tickerSpans}\n${tickerSpans}`;

// ===== BUILD DEFINITIONS =====

const HEADER = ['sections/head-base.html', 'sections/masthead.html', 'sections/ticker.html'];
const FOOTER = ['sections/sources-link.html', 'sections/scripts.html'];
const SIDEBAR = 'sections/sidebar-template.html';

// Sidebar nav helpers — { id, num, label } for links, { group } for group headers.
const g = (group) => ({ group });
const n = (num, id, label) => ({ num, id, label });

function page(output, content, meta, sidebarNav) {
  return { output, content, meta, sidebarNav, sections: [...HEADER, SIDEBAR, ...content, ...FOOTER] };
}

const BUILDS = [
  page('index.html', [
    'sections/stats.html', 'sections/last-24h.html', 'sections/theater.html',
    'sections/military-teaser.html', 'sections/materiel-losses-teaser.html',
    'sections/forces-teaser.html', 'sections/nuclear-teaser.html',
    'sections/inside-iran-teaser.html', 'sections/reactions-teaser.html',
    'sections/analysis-teaser.html', 'sections/scenarios-teaser.html',
    'sections/opposition-teaser.html', 'sections/background-teaser.html',
  ], {
    pageTitle: 'Iran Crisis Report — {{date}}',
    pageDescription: 'A whole-situation briefing on the Iran war: the military campaign, Hormuz, nuclear verification, diplomacy, Iranian society, regional positions, and paths ahead.',
    pageOgDescription: 'Understand the whole Iran crisis across its military, maritime, nuclear, political, humanitarian, and regional dimensions.',
    pageOgType: 'website',
  }, [
    g('Situation'),
    n('01', 'stats', 'Whole Picture'), n('02', 'last-24h', 'Latest'), n('03', 'theater', 'Theater Map'),
    g('Situation lenses'),
    n('04', 'military', 'Iran Military'), n('05', 'materiel-losses', 'Losses & Evidence'),
    n('06', 'strike-forces', 'Regional Forces'), n('07', 'nuclear', 'Diplomacy & Nuclear'),
    n('08', 'inside-iran', 'Inside Iran'), n('09', 'reactions', 'Regional Positions'),
    n('10', 'analysis', 'Assessment'), n('11', 'scenarios', 'Paths Ahead'),
    n('12', 'opposition', 'Opposition'), n('13', 'background', 'Background'),
  ]),
  page('diplomatic.html', ['sections/diplomatic.html'], {
    pageTitle: 'Iran Crisis: Diplomatic Track &amp; Nuclear Negotiations \u2014 {{date}}',
    pageDescription: 'The Iran crisis nuclear and diplomatic track: lost IAEA verification, the June memorandum, July breakdown, bargaining terms, and requirements for a durable off-ramp.',
    pageOgDescription: 'How nuclear verification, Hormuz, sanctions, blockade relief, and regional security fit into a possible Iran war off-ramp.',
    pageOgType: 'article',
  }, [
    n('01', 'nuclear', 'Diplomatic Track'), n('02', 'nuclear-deal-terms', 'Deal Terms'),
    n('03', 'international-response', 'International Response'),
  ]),
  page('scenarios.html', ['sections/scenarios.html'], {
    pageTitle: 'Iran Crisis: Paths Ahead \u2014 {{date}}',
    pageDescription: 'Five conditional paths for the Iran crisis: armed pause, negotiated settlement, managed transition, democratic transition, and chaotic fragmentation—with indicators, not invented probabilities.',
    pageOgDescription: 'Five possible paths out of the Iran war, organized by mechanisms, indicators, and failure conditions.',
    pageOgType: 'article',
  }, [
    n('01', 'scenarios', 'Scenario Matrix'),
  ]),
  page('forces.html', [
    'sections/nation-postures.html', 'sections/air-power.html', 'sections/naval.html',
  ], {
    pageTitle: 'Iran Crisis: Regional Forces \u2014 {{date}}',
    pageDescription: 'The Iran crisis regional force balance: U.S. and Israeli conventional advantage, Iranian distributed resistance, Gulf exposure, air power, and maritime limits.',
    pageOgDescription: 'How conventional dominance, asymmetric resistance, and Gulf exposure shape the Iran war.',
    pageOgType: 'article',
  }, [
    g('Force balance'), n('00', 'nation-postures', 'Regional System'),
    g('Operational domains'), n('01', 'air-power', 'Air Power'), n('02', 'naval', 'Maritime Power'),
  ]),
  page('iran-military.html', [
    'sections/military.html', 'sections/materiel-losses.html',
    'sections/iran-retaliation-playbook.html',
    'sections/iran-retaliation-executed.html', 'sections/hormuz.html',
  ], {
    pageTitle: 'Iran Crisis: Iran Military Assessment \u2014 {{date}}',
    pageDescription: 'Iran\'s military position after severe conventional damage: what is established, what remains unknown, distributed retaliation, reconstitution, and Hormuz.',
    pageOgDescription: 'A bounded assessment of Iranian military damage, resilience, retaliation, reconstitution, and Hormuz.',
    pageOgType: 'article',
  }, [
    g('Assessment'), n('01', 'military', 'Military Status'), n('02', 'materiel-losses', 'Losses Ledger'),
    g('Retaliation'), n('03', 'iran-retaliation', 'Playbook'), n('04', 'iran-retaliation-executed', 'Executed'),
    g('Strategic'), n('05', 'hormuz', 'Hormuz Threat'),
  ]),
  page('inside-iran.html', ['sections/inside-iran.html'], {
    pageTitle: 'Iran Crisis: Inside Iran \u2014 {{date}}',
    pageDescription: 'Inside Iran during the war: civilian harm, wartime government, daily economic life, protest and repression, communications controls, water, health, and infrastructure.',
    pageOgDescription: 'A compound picture of the Iranian state and society under war, repression, economic strain, and damaged public systems.',
    pageOgType: 'article',
  }, [
    n('01', 'inside-iran', 'Inside Iran'),
  ]),
  page('reactions.html', ['sections/reactions-iran.html', 'sections/reactions-gulf.html', 'sections/reactions-israel.html', 'sections/reactions-global.html'], {
    pageTitle: 'Iran Crisis: Regional &amp; Global Positions \u2014 {{date}}',
    pageDescription: 'Iranian, Israeli, Gulf, and global positions in the Iran war: war aims, constraints, energy exposure, mediation, and competing definitions of security.',
    pageOgDescription: 'Compare how Iran, Israel, Gulf states, and outside powers define their interests and acceptable risks.',
    pageOgType: 'article',
  }, [
    n('01', 'reactions-iran', 'Iran'), n('02', 'reactions-gulf', 'Gulf States'),
    n('03', 'reactions-israel', 'Israel'), n('04', 'reactions-global', 'Wider World'),
  ]),
  page('analysis.html', ['sections/analysis.html'], {
    pageTitle: 'Iran Crisis: Strategic Assessment \u2014 {{date}}',
    pageDescription: 'Fresh synthesis across CSIS, RAND, IISS, RUSI, Carnegie, Chatham House, Brookings, CFR, and Atlantic Council on the Iran war\'s unresolved strategic questions.',
    pageOgDescription: 'Where serious institutional analysis of the Iran war converges—and where it disagrees.',
    pageOgType: 'article',
  }, [
    n('01', 'analysis', 'Bottom Line'),
    n('02', 'analysis-military', 'Military Defeat'),
    n('03', 'analysis-succession', 'State Power'),
    n('04', 'analysis-energy', 'Iranian Leverage'),
    n('05', 'analysis-civilian', 'Political Change'),
    n('06', 'analysis-consensus', 'Convergence'),
  ]),
  page('opposition.html', ['sections/opposition.html'], {
    pageTitle: 'Iran Crisis: Opposition &amp; Transition \u2014 {{date}}',
    pageDescription: 'Iran\'s opposition landscape: Reza Pahlavi, republicans, civic networks, minority movements, labor, students, the MEK, and the institutional requirements of transition.',
    pageOgDescription: 'Iran\'s opposition is a political field, not a government-in-waiting. Understand its actors, divisions, and transition challenge.',
    pageOgType: 'article',
  }, [
    n('01', 'opposition', 'Bottom Line'), n('02', 'opposition-landscape', 'Political Field'),
  ]),
  page('background.html', ['sections/background.html'], {
    pageTitle: 'Iran Crisis: Background &amp; History \u2014 {{date}}',
    pageDescription: 'The causal history of the Iran crisis: U.S.–Iran hostility, the failed nuclear bargain, regional deterrence, domestic repression, and the path to the 2026 war.',
    pageOgDescription: 'Four histories converged into the 2026 Iran war.',
    pageOgType: 'article',
  }, [
    n('01', 'background', 'Overview'), n('02', 'bg-us-iran', 'US-Iran Relations'),
    n('03', 'bg-nuclear', 'Nuclear Program'), n('04', 'bg-january', 'Legitimacy Crisis'),
    n('05', 'bg-epic-fury', 'Path to War'),
  ]),
  page('sources.html', ['sections/sources.html'], {
    pageTitle: 'Iran Crisis Report \u2014 Sources &amp; References \u2014 {{date}}',
    pageDescription: 'The Iran Crisis Report source library and publication method: primary bodies, official claims, independent reporting, specialist analysis, and evidence rules.',
    pageOgDescription: 'How the Iran Crisis Report matches claims to evidence and handles uncertainty.',
    pageOgType: 'website',
  }, [
    n('01', 'source-reliability', 'Evidence Rules'), n('02', 'sources', 'Source Library'),
  ]),
];

const ATLAS_GLOBAL_NAV = [
  { slug: 'index', label: 'Overview', href: 'index.html' },
  { slug: 'iran-military', label: 'Iran Military', href: 'iran-military.html' },
  { slug: 'forces', label: 'Regional Forces', href: 'forces.html' },
  { slug: 'diplomatic', label: 'Diplomacy', href: 'diplomatic.html' },
  { slug: 'inside-iran', label: 'Inside Iran', href: 'inside-iran.html' },
  { slug: 'reactions', label: 'Reactions', href: 'reactions.html' },
  { slug: 'analysis', label: 'Analysis', href: 'analysis.html' },
  { slug: 'scenarios', label: 'Scenarios', href: 'scenarios.html' },
  { slug: 'opposition', label: 'Opposition', href: 'opposition.html' },
  { slug: 'background', label: 'Background', href: 'background.html' },
  { slug: 'sources', label: 'Sources', href: 'sources.html' },
];

const ATLAS_BRIEFING_ITEMS = [
  {
    label: 'Whole situation',
    status: 'Overview',
    tone: 'critical',
    icon: 'ph-navigation-arrow',
    href: 'index.html',
    summary: 'The military, maritime, nuclear, political, and human picture in one place.',
  },
  {
    label: 'Iran military',
    status: 'Capability',
    tone: 'critical',
    icon: 'ph-airplane-tilt',
    href: 'iran-military.html',
    summary: 'Damage, resilience, retaliation, and the limits of public evidence.',
  },
  {
    label: 'Regional forces',
    status: 'System',
    tone: 'warning',
    icon: 'ph-globe-hemisphere-east',
    href: 'forces.html',
    summary: 'Conventional advantage, distributed threats, and exposed partners.',
  },
  {
    label: 'Diplomacy',
    status: 'Off-ramp',
    tone: 'diplomatic',
    icon: 'ph-handshake',
    href: 'diplomatic.html',
    summary: 'Verification, Hormuz, sanctions, sequencing, and war termination.',
  },
  {
    label: 'Inside Iran',
    status: 'State & society',
    tone: 'warning',
    icon: 'ph-users-three',
    href: 'inside-iran.html',
    summary: 'Civilian harm, government, daily life, repression, and public systems.',
  },
  {
    label: 'Paths ahead',
    status: 'Indicators',
    tone: 'neutral',
    icon: 'ph-binoculars',
    href: 'scenarios.html',
    summary: 'Five conditional pathways and the evidence that would move them.',
  },
];

const ATLAS_PAGE_DETAILS = {
  'index.html': {
    atlasTitle: 'The Whole Situation',
    atlasKicker: 'Cross-domain briefing',
    atlasSummary: 'Conventional military dominance has not produced political resolution. Iran still imposes costs through distributed systems and Hormuz while nuclear verification, regional security, and life inside Iran remain unsettled.',
  },
  'iran-military.html': {
    atlasTitle: 'Iran’s Military Position',
    atlasKicker: 'Capability and response',
    atlasSummary: 'What severe conventional damage has established, what the public evidence cannot count, how Iran still retaliates, and why Hormuz remains strategically central.',
  },
  'forces.html': {
    atlasTitle: 'Regional Forces',
    atlasKicker: 'Theater posture',
    atlasSummary: 'How U.S. and Israeli conventional advantage, Iranian distributed resistance, and the exposure of Gulf partners shape the regional system.',
  },
  'diplomatic.html': {
    atlasTitle: 'Diplomacy & Nuclear Track',
    atlasKicker: 'Negotiation and leverage',
    atlasSummary: 'The loss of nuclear verification, the bargaining tracks a durable agreement must connect, and why the June memorandum did not survive July.',
  },
  'inside-iran.html': {
    atlasTitle: 'Inside Iran',
    atlasKicker: 'State and society',
    atlasSummary: 'Civilian harm, wartime government, daily economic life, protest and repression, communications controls, water, health, and infrastructure.',
  },
  'reactions.html': {
    atlasTitle: 'Regional & Global Positions',
    atlasKicker: 'Interests and constraints',
    atlasSummary: 'How Iran, Israel, Gulf states, and outside powers define security, victory, leverage, and acceptable risk differently.',
  },
  'analysis.html': {
    atlasTitle: 'Strategic Assessment',
    atlasKicker: 'Synthesis and disagreement',
    atlasSummary: 'Where the strongest institutional analysis converges on operational facts—and where it diverges over leverage, success, and war termination.',
  },
  'scenarios.html': {
    atlasTitle: 'Paths Ahead',
    atlasKicker: 'Conditional scenarios',
    atlasSummary: 'Five pathways organized by mechanism, indicators, and failure conditions rather than unsupported probability.',
  },
  'opposition.html': {
    atlasTitle: 'Opposition & Transition',
    atlasKicker: 'Political alternatives',
    atlasSummary: 'Reza Pahlavi’s real but bounded role, competing political currents, and the institutional work required for a legitimate transition.',
  },
  'background.html': {
    atlasTitle: 'How We Got Here',
    atlasKicker: 'Historical context',
    atlasSummary: 'How U.S.–Iran hostility, a failed nuclear bargain, regional deterrence, and domestic repression converged into the 2026 war.',
  },
  'sources.html': {
    atlasTitle: 'Sources & Method',
    atlasKicker: 'Evidence base',
    atlasSummary: 'The primary bodies, independent reporting, specialist institutions, and publication rules behind the situation picture.',
  },
};

// ===== VALIDATION FUNCTIONS =====

function validateAIZones(content, filename) {
  const warnings = [];
  const openMarkers = content.match(/<!-- @ai-zone:([\w-]+) -->/g) || [];
  const closeMarkers = content.match(/<!-- @\/ai-zone:([\w-]+) -->/g) || [];
  if (openMarkers.length !== closeMarkers.length) {
    warnings.push(`${filename}: Unbalanced AI zone markers (${openMarkers.length} open, ${closeMarkers.length} close)`);
  }
  return warnings;
}

function validateTagBalance(content, filename) {
  const warnings = [];
  const openTags = (content.match(/<(div|section|article)\b/gi) || []).length;
  const closeTags = (content.match(/<\/(div|section|article)>/gi) || []).length;
  if (openTags !== closeTags) {
    warnings.push(`${filename}: Unbalanced HTML tags (${openTags} opening vs ${closeTags} closing div/section/article)`);
  }
  return warnings;
}

function checkFileSize(content, filename) {
  const lineCount = content.split('\n').length;
  if (lineCount > 200) {
    return [`${filename}: Large file (${lineCount} lines) — consider splitting`];
  }
  return [];
}

function extractHtmlMatches(content, pattern) {
  const matches = new Set();
  for (const match of content.matchAll(pattern)) {
    matches.add(match[1]);
  }
  return matches;
}

function validateNavigation(output) {
  const warnings = [];
  const sectionIds = extractHtmlMatches(output, /\bid=["']([^"']+)["']/g);
  const sidebarTargets = extractHtmlMatches(output, /class="sb-link"[^>]*href=["']#([^"']+)["']/g);
  for (const target of sidebarTargets) {
    if (!sectionIds.has(target)) {
      warnings.push(`Navigation: Sidebar links to #${target} but no matching section ID found`);
    }
  }
  return warnings;
}

function validateAtlasNavigation(output) {
  const warnings = [];
  const sectionIds = extractHtmlMatches(output, /\bid=["']([^"']+)["']/g);
  const localTargets = extractHtmlMatches(output, /class="atlas-local-link"[^>]*href=["']#([^"']+)["']/g);
  for (const target of localTargets) {
    if (!sectionIds.has(target)) {
      warnings.push(`Atlas navigation: Link to #${target} has no matching section ID`);
    }
  }
  return warnings;
}

function checkDuplicateIds(output) {
  const seen = new Set();
  const dupes = new Set();
  for (const match of output.matchAll(/\bid=["']([^"']+)["']/g)) {
    if (seen.has(match[1])) dupes.add(match[1]);
    seen.add(match[1]);
  }
  if (dupes.size > 0) {
    return [`Duplicate section IDs found: ${[...dupes].join(', ')}`];
  }
  return [];
}

// ===== BUILD PROCESS =====

const INCREMENTAL = process.argv.includes('--incremental');
const BUILD_HASH_PATH = path.join(BASE_DIR, '.build-hashes.json');

function computeHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

let prevHashes = {};
if (INCREMENTAL) {
  try { prevHashes = JSON.parse(fs.readFileSync(BUILD_HASH_PATH, 'utf8')); } catch { /* first run */ }
}
const newHashes = {};
const allWarnings = [];

for (const build of BUILDS) {
  // Inject per-page meta into a copy of DATA, pre-resolving {{key}} references.
  const ctx = Object.assign({}, DATA);
  ctx.sidebarNav = build.sidebarNav || [];
  for (const [k, v] of Object.entries(build.meta || {})) {
    ctx[k] = v.replace(/\{\{([^}]+)\}\}/g, (_m, key) => (DATA[key] !== undefined ? DATA[key] : _m));
  }

  // Build a virtual template that includes all sections for this page.
  const template = build.sections.map(f => `{% include "${f}" %}`).join('\n');

  // Render through Nunjucks.
  const output = nunjucks.renderString(template, ctx);

  // Run validations on individual section files.
  // Skip tag-balance checks on shared infrastructure files (HEADER/FOOTER/SIDEBAR)
  // because they intentionally have cross-file tag spans (e.g. sidebar-footer opens
  // <div class="container"> which sources-link.html closes).
  const INFRA = new Set([...HEADER, ...FOOTER, SIDEBAR]);
  const buildWarnings = [];
  for (const file of build.sections) {
    const content = fs.readFileSync(path.join(BASE_DIR, file), 'utf8');
    buildWarnings.push(...validateAIZones(content, file));
    if (!INFRA.has(file)) {
      buildWarnings.push(...validateTagBalance(content, file));
    }
    buildWarnings.push(...checkFileSize(content, file));
    buildWarnings.push(...validateProvenanceBuild(content, file));
  }

  // Run global validations.
  buildWarnings.push(...validateNavigation(output));
  buildWarnings.push(...checkDuplicateIds(output));
  allWarnings.push(...buildWarnings);

  // Incremental: skip write if output hash matches previous build.
  const outputHash = computeHash(output);
  newHashes[build.output] = outputHash;
  if (INCREMENTAL && prevHashes[build.output] === outputHash) {
    console.log(`Skipped ${build.output} (unchanged).`);
    continue;
  }

  fs.writeFileSync(path.join(BASE_DIR, build.output), output);
  console.log(`Built ${build.output} from ${build.sections.length} sections.`);
}

const atlasDir = path.join(BASE_DIR, 'atlas');
fs.mkdirSync(atlasDir, { recursive: true });

for (const build of BUILDS) {
  const details = ATLAS_PAGE_DETAILS[build.output];
  if (!details) {
    allWarnings.push(`Atlas build: Missing page details for ${build.output}`);
    continue;
  }

  const atlasSlug = path.basename(build.output, '.html');
  const navIndex = ATLAS_GLOBAL_NAV.findIndex(item => item.slug === atlasSlug);
  const ctx = Object.assign({}, DATA, details, {
    atlasSlug,
    atlasGlobalNav: ATLAS_GLOBAL_NAV,
    atlasBriefingItems: ATLAS_BRIEFING_ITEMS,
    atlasPrevious: navIndex > 0 ? ATLAS_GLOBAL_NAV[navIndex - 1] : null,
    atlasNext: navIndex >= 0 && navIndex < ATLAS_GLOBAL_NAV.length - 1
      ? ATLAS_GLOBAL_NAV[navIndex + 1]
      : null,
    originalHref: `../${build.output}`,
    sidebarNav: build.sidebarNav || [],
  });

  const atlasSections = [
    'sections/atlas-head.html',
    'sections/atlas-header.html',
    ...build.content,
    'sections/atlas-footer.html',
  ];
  const template = atlasSections.map(file => `{% include "${file}" %}`).join('\n');
  const output = nunjucks.renderString(template, ctx);
  const atlasOutput = `atlas/${build.output}`;
  const outputHash = computeHash(output);

  newHashes[atlasOutput] = outputHash;
  allWarnings.push(...validateAtlasNavigation(output));
  allWarnings.push(...checkDuplicateIds(output));

  if (INCREMENTAL && prevHashes[atlasOutput] === outputHash) {
    console.log(`Skipped ${atlasOutput} (unchanged).`);
    continue;
  }

  fs.writeFileSync(path.join(BASE_DIR, atlasOutput), output);
  console.log(`Built ${atlasOutput} from ${atlasSections.length} sections.`);
}

if (INCREMENTAL) {
  fs.writeFileSync(BUILD_HASH_PATH, JSON.stringify(newHashes, null, 2));
}

if (allWarnings.length > 0) {
  process.stderr.write('\nBuild Warnings:\n');
  allWarnings.forEach(w => process.stderr.write(`  ⚠ ${w}\n`));
  process.stderr.write('\n');
}

if (allWarnings.length === 0) {
  console.log('✓ All validation checks passed');
}
