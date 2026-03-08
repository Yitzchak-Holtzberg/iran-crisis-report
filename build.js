#!/usr/bin/env node
/**
 * build.js — assembles index.html from section and chart partials.
 *
 * Usage:  node build.js
 *
 * Section files in sections/ are concatenated in order.
 * Inside any section file:
 *   <!-- @include path -->   — replaced with the contents of the referenced file.
 *   <!-- @ticker -->         — replaced with ticker items from data.json (auto-duplicated
 *                              for the seamless CSS scroll loop).
 *   {{key}}                  — replaced with the matching string value from data.json.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const BASE_DIR = __dirname;

// Load the central data file used for template substitutions.
const DATA = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'data.json'), 'utf8'));

// Load and validate data.json against the schema.
const SCHEMA = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'data.schema.json'), 'utf8'));

/** Validate data.json against data.schema.json (lightweight, no dependencies). */
function validateDataJson(data, schema) {
  const warnings = [];

  // Check required keys.
  for (const key of schema.required || []) {
    if (!(key in data)) {
      warnings.push(`data.json: missing required key "${key}"`);
    }
  }

  // Check property patterns and types.
  for (const [key, val] of Object.entries(data)) {
    const prop = (schema.properties || {})[key];
    if (!prop) {
      if (schema.additionalProperties === false) {
        warnings.push(`data.json: unknown key "${key}" (not in schema)`);
      }
      continue;
    }
    if (prop.type === 'string' && typeof val !== 'string') {
      warnings.push(`data.json: "${key}" should be a string, got ${typeof val}`);
    } else if (prop.type === 'integer' && (typeof val !== 'number' || !Number.isInteger(val))) {
      warnings.push(`data.json: "${key}" should be an integer, got ${typeof val} (${val})`);
    } else if (prop.type === 'array' && !Array.isArray(val)) {
      warnings.push(`data.json: "${key}" should be an array, got ${typeof val}`);
    } else if (prop.type === 'string' && prop.pattern) {
      const re = new RegExp(prop.pattern);
      if (!re.test(val)) {
        warnings.push(`data.json: "${key}" value "${val}" does not match pattern ${prop.pattern}`);
      }
    }
    if (prop.type === 'integer' && typeof val === 'number') {
      if (prop.minimum !== undefined && val < prop.minimum) {
        warnings.push(`data.json: "${key}" value ${val} is below minimum ${prop.minimum}`);
      }
      if (prop.maximum !== undefined && val > prop.maximum) {
        warnings.push(`data.json: "${key}" value ${val} is above maximum ${prop.maximum}`);
      }
    }
  }

  // Validate scenario percentages sum to 100 (excluding scenarioStrikesPct — Military Strikes is in progress and excluded from probability analysis).
  const scenarioKeys = Object.keys(data).filter(k => k.startsWith('scenario') && k.endsWith('Pct') && k !== 'scenarioStrikesPct');
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

// Derive day-label helpers from the "date" field so last-24h.html day headers
// never need manual edits (e.g. "FEB 26", "FEB 25", "FEB 24").
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
  // Short date for sidebar and compact displays (e.g. "Feb 28, 2026").
  DATA.dateShort = `${MONTHS_SHORT[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
}());

const HEADER_SECTIONS = ['sections/head-base.html', 'sections/masthead.html', 'sections/ticker.html'];
const FOOTER_SECTIONS = ['sections/sources-link.html', 'sections/scripts.html'];

const BUILDS = [
  {
    output: 'index.html',
    sidebarFile: 'sections/sidebar.html',
    meta: {
      pageTitle: 'Iran Crisis Report — {{date}}',
      pageDescription: 'Live situation report: US\u2013Iran military standoff, nuclear negotiations, protest crackdowns, and economic collapse. Updated multiple times daily.',
      pageOgDescription: 'Live situation report: US\u2013Iran military standoff, nuclear negotiations, protest crackdowns, and economic collapse. Updated multiple times daily.',
      pageOgType: 'website',
    },
    sections: [
      ...HEADER_SECTIONS,
      'sections/sidebar.html',
      'sections/stats.html',
      'sections/last-24h.html',
      'sections/confirmed-unconfirmed.html',
      'sections/theater.html',
      'sections/scenarios-teaser.html',
      'sections/analysis.html',
      'sections/nuclear-teaser.html',
      'sections/forces-teaser.html',
      'sections/military-teaser.html',
      'sections/inside-iran-teaser.html',
      'sections/reactions-teaser.html',
      'sections/opposition.html',
      ...FOOTER_SECTIONS,
    ],
  },
  {
    output: 'diplomatic.html',
    sidebarFile: 'sections/sidebar-diplomatic.html',
    meta: {
      pageTitle: 'Iran Crisis: Diplomatic Track &amp; Nuclear Negotiations \u2014 {{date}}',
      pageDescription: 'Diplomatic track suspended: US-Iran Geneva rounds timeline, deal terms, Mojtaba Khamenei succession, NATO Article 4 consultations after Turkish missile strike, IAEA nuclear access blocked, Gulf states joint condemnation, and Israel\u2019s strikes. Updated daily.',
      pageOgDescription: 'Diplomatic track suspended: US-Iran Geneva rounds timeline, deal terms, Mojtaba Khamenei succession, NATO Article 4 consultations after Turkish missile strike, IAEA nuclear access blocked, and Gulf states joint condemnation.',
      pageOgType: 'article',
    },
    sections: [
      ...HEADER_SECTIONS,
      'sections/sidebar-diplomatic.html',
      'sections/diplomatic.html',
      ...FOOTER_SECTIONS,
    ],
  },
  {
    output: 'scenarios.html',
    sidebarFile: 'sections/sidebar-scenarios.html',
    meta: {
      pageTitle: 'Iran Crisis: Five Scenarios \u2014 {{date}}',
      pageDescription: 'Five active scenarios for the Iran crisis post-Operation Epic Fury: regime collapse/revolution, Pahlavi democratic transition, IRGC junta, Iranian civil war, and regional escalation. Analyst consensus probabilities.',
      pageOgDescription: 'Five active scenarios for the Iran crisis post-Operation Epic Fury: regime collapse/revolution, Pahlavi democratic transition, IRGC junta succession, Iranian civil war/fragmentation, and regional escalation/proxy war spread.',
      pageOgType: 'article',
    },
    sections: [
      ...HEADER_SECTIONS,
      'sections/sidebar-scenarios.html',
      'sections/scenarios.html',
      ...FOOTER_SECTIONS,
    ],
  },
  {
    output: 'forces.html',
    sidebarFile: 'sections/sidebar-forces.html',
    meta: {
      pageTitle: 'Iran Crisis: Order of Battle \u2014 {{date}}',
      pageDescription: 'Full order of battle: US air and naval forces (160+ aircraft, triple carrier strike groups) vs. Iran\'s remaining military capability — missiles, drones, IRGC Navy, and the Strait of Hormuz threat.',
      pageOgDescription: 'Full order of battle: US strike forces vs. Iran\'s remaining military capability — missiles, drones, IRGC Navy, and the Strait of Hormuz threat.',
      pageOgType: 'article',
    },
    sections: [
      ...HEADER_SECTIONS,
      'sections/sidebar-forces.html',
      'sections/nation-postures.html',
      'sections/air-power.html',
      'sections/naval.html',
      'sections/military.html',
      'sections/iran-retaliation-playbook.html',
      'sections/iran-retaliation-executed.html',
      'sections/hormuz.html',
      ...FOOTER_SECTIONS,
    ],
  },
  {
    output: 'inside-iran.html',
    sidebarFile: 'sections/sidebar-inside-iran.html',
    meta: {
      pageTitle: 'Iran Crisis: Inside Iran \u2014 {{date}}',
      pageDescription: 'Eight converging crises inside Iran: Operation Epic Fury strikes, Khamenei succession crisis, the January Massacre, student uprising, economic freefall, internet blackout, ethnic crackdowns, water catastrophe, and axis of resistance collapse.',
      pageOgDescription: 'Eight converging crises: Operation Epic Fury direct strikes (Day 2), Khamenei confirmed dead, January Massacre (36,500+ killed), student uprising, economic freefall (rial at 1.7M/USD), digital iron curtain, ethnic crackdowns, water catastrophe, and proxy network collapse.',
      pageOgType: 'article',
    },
    sections: [
      ...HEADER_SECTIONS,
      'sections/sidebar-inside-iran.html',
      'sections/inside-iran.html',
      ...FOOTER_SECTIONS,
    ],
  },
  {
    output: 'reactions.html',
    sidebarFile: 'sections/sidebar-reactions.html',
    meta: {
      pageTitle: 'Iran Crisis: Regional Reactions &amp; Damage Assessments \u2014 {{date}}',
      pageDescription: 'Country-by-country reactions to US-Israel Operation Epic Fury strikes on Iran: Bahrain 5th Fleet hit, Abu Dhabi casualties, Qatar, Saudi Arabia, Israel, and full strike damage assessments.',
      pageOgDescription: 'Country-by-country reactions to Operation Epic Fury and Iran\u2019s retaliatory strikes: Gulf states hit, damage assessments, diplomatic fallout, and casualty reports.',
      pageOgType: 'article',
    },
    sections: [
      ...HEADER_SECTIONS,
      'sections/sidebar-reactions.html',
      'sections/reactions.html',
      ...FOOTER_SECTIONS,
    ],
  },
  {
    output: 'sources.html',
    sidebarFile: 'sections/sidebar-sources.html',
    meta: {
      pageTitle: 'Iran Crisis Report \u2014 Sources &amp; References \u2014 {{date}}',
      pageDescription: 'Full list of sources and references for the Iran Crisis Report, compiled from 40+ international news outlets, think tanks, and official statements.',
      pageOgDescription: 'Full list of sources and references for the Iran Crisis Report, compiled from 40+ international news outlets, think tanks, and official statements.',
      pageOgType: 'website',
    },
    sections: [
      ...HEADER_SECTIONS,
      'sections/sidebar-sources.html',
      'sections/sources.html',
      'sections/scripts.html',
    ],
  },
];

function processIncludes(content) {
  return content.replace(/<!-- @include\s+(\S+)\s*-->\n?/g, (_match, includePath) => {
    const fullPath = path.resolve(BASE_DIR, includePath);
    const relative = path.relative(BASE_DIR, fullPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Security: include path "${includePath}" resolves outside project directory`);
    }
    try {
      const included = fs.readFileSync(fullPath, 'utf8');
      return processIncludes(included);
    } catch (err) {
      throw new Error(`Failed to include "${includePath}": ${err.message}`);
    }
  });
}

/** Replace <!-- @ticker --> with ticker items from DATA.ticker, doubled for the CSS scroll loop. */
function processTicker(content) {
  if (!content.includes('<!-- @ticker -->')) return content;
  const spans = DATA.ticker.map(t => `    <span>${t}</span>`).join('\n');
  return content.replace(/<!-- @ticker -->/, `${spans}\n${spans}`);
}

/** Replace {{key}} placeholders with matching string values from DATA.
 *  Collects names of any keys that were NOT found so the caller can warn. */
function applyData(content, unknownKeys) {
  return content.replace(/\{\{([^}]+)\}\}/g, (_match, key) => {
    const val = DATA[key];
    if (val !== undefined) return val;
    if (unknownKeys) unknownKeys.add(key);
    return _match;
  });
}

// ===== VALIDATION FUNCTIONS =====

/** Validate that AI zone markers are properly balanced */
function validateAIZones(content, filename) {
  const warnings = [];
  const openMarkers = content.match(/<!-- @ai-zone:([\w-]+) -->/g) || [];
  const closeMarkers = content.match(/<!-- @\/ai-zone:([\w-]+) -->/g) || [];

  if (openMarkers.length !== closeMarkers.length) {
    warnings.push(`${filename}: Unbalanced AI zone markers (${openMarkers.length} open, ${closeMarkers.length} close)`);
  }

  return warnings;
}

/** Check for oversized section files */
function checkFileSize(content, filename) {
  const lineCount = content.split('\n').length;
  if (lineCount > 200) {
    return [`${filename}: Large file (${lineCount} lines) — consider splitting`];
  }
  return [];
}

/** Extract section IDs from HTML content */
function extractSectionIds(content) {
  const ids = new Set();
  const matches = content.matchAll(/\bid=["']([^"']+)["']/g);
  for (const match of matches) {
    ids.add(match[1]);
  }
  return ids;
}

/** Extract sidebar href targets */
function extractSidebarTargets(sidebarContent) {
  const targets = new Set();
  const matches = sidebarContent.matchAll(/href=["']#([^"']+)["']/g);
  for (const match of matches) {
    targets.add(match[1]);
  }
  return targets;
}

/** Validate sidebar links point to existing sections */
function validateNavigation(output, sidebarFile) {
  const warnings = [];
  const sidebarContent = fs.readFileSync(path.join(BASE_DIR, sidebarFile), 'utf8');
  const sectionIds = extractSectionIds(output);
  const sidebarTargets = extractSidebarTargets(sidebarContent);

  for (const target of sidebarTargets) {
    if (!sectionIds.has(target)) {
      warnings.push(`Navigation: Sidebar links to #${target} but no matching section ID found`);
    }
  }

  return warnings;
}

/** Check for duplicate section IDs */
function checkDuplicateIds(output) {
  const warnings = [];
  const ids = [];
  const matches = output.matchAll(/\bid=["']([^"']+)["']/g);

  for (const match of matches) {
    ids.push(match[1]);
  }

  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  const uniqueDuplicates = [...new Set(duplicates)];

  if (uniqueDuplicates.length > 0) {
    warnings.push(`Duplicate section IDs found: ${uniqueDuplicates.join(', ')}`);
  }

  return warnings;
}

// ===== BUILD PROCESS =====

// Fix #15: Incremental builds — only rebuild pages whose sections or data changed.
const INCREMENTAL = process.argv.includes('--incremental');
const BUILD_HASH_PATH = path.join(BASE_DIR, '.build-hashes.json');
const crypto = require('crypto');

function computeHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

let prevHashes = {};
if (INCREMENTAL) {
  try { prevHashes = JSON.parse(fs.readFileSync(BUILD_HASH_PATH, 'utf8')); } catch { /* first run */ }
}
const newHashes = {};

const unknownKeys = new Set();
const allWarnings = [];

for (const build of BUILDS) {
  const buildWarnings = [];

  // Temporarily inject per-page meta into DATA, pre-resolving any {{key}} references
  // in meta values (e.g. {{date}} inside pageTitle) against the current DATA state.
  const savedMeta = {};
  for (const [k, v] of Object.entries(build.meta || {})) {
    savedMeta[k] = DATA[k];
    DATA[k] = v.replace(/\{\{([^}]+)\}\}/g, (_m, key) => (DATA[key] !== undefined ? DATA[key] : _m));
  }

  // Build output for this page
  const output = build.sections.map(file => {
    const content = fs.readFileSync(path.join(BASE_DIR, file), 'utf8');

    // Run validations on each file (only once, for the first build that uses it)
    buildWarnings.push(...validateAIZones(content, file));
    buildWarnings.push(...checkFileSize(content, file));

    return applyData(processTicker(processIncludes(content)), unknownKeys);
  }).join('');

  // Restore DATA to its pre-build state.  Keys that didn't exist before this build
  // (savedMeta[k] === undefined) must be deleted rather than assigned, so they don't
  // bleed into subsequent builds as stale placeholders.
  for (const [k, v] of Object.entries(savedMeta)) {
    if (v === undefined) delete DATA[k];
    else DATA[k] = v;
  }

  // Run global validations
  buildWarnings.push(...validateNavigation(output, build.sidebarFile));
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

// Write hashes for next incremental run.
if (INCREMENTAL) {
  fs.writeFileSync(BUILD_HASH_PATH, JSON.stringify(newHashes, null, 2));
}

// Report warnings
if (unknownKeys.size > 0) {
  process.stderr.write(`Warning: unresolved placeholders in output — check data.json for: ${[...unknownKeys].join(', ')}\n`);
}

if (allWarnings.length > 0) {
  process.stderr.write('\nBuild Warnings:\n');
  allWarnings.forEach(w => process.stderr.write(`  ⚠ ${w}\n`));
  process.stderr.write('\n');
}

if (allWarnings.length === 0 && unknownKeys.size === 0) {
  console.log('✓ All validation checks passed');
}
