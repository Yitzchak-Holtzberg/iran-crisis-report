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

function page(output, sidebar, content, meta) {
  return { output, sidebarFile: sidebar, meta, sections: [...HEADER, sidebar, ...content, ...FOOTER] };
}

const BUILDS = [
  page('index.html', 'sections/sidebar.html', [
    'sections/stats.html', 'sections/last-24h.html', 'sections/confirmed-unconfirmed.html',
    'sections/theater.html', 'sections/scenarios-teaser.html', 'sections/analysis-teaser.html',
    'sections/nuclear-teaser.html', 'sections/forces-teaser.html', 'sections/military-teaser.html',
    'sections/inside-iran-teaser.html', 'sections/reactions-teaser.html', 'sections/opposition-teaser.html',
  ], {
    pageTitle: 'Iran Crisis Report — {{date}}',
    pageDescription: 'Live situation report: US\u2013Iran military standoff, nuclear negotiations, protest crackdowns, and economic collapse. Updated multiple times daily.',
    pageOgDescription: 'Live situation report: US\u2013Iran military standoff, nuclear negotiations, protest crackdowns, and economic collapse. Updated multiple times daily.',
    pageOgType: 'website',
  }),
  page('diplomatic.html', 'sections/sidebar-diplomatic.html', [
    'sections/diplomatic.html',
  ], {
    pageTitle: 'Iran Crisis: Diplomatic Track &amp; Nuclear Negotiations \u2014 {{date}}',
    pageDescription: 'Diplomatic track suspended: US-Iran Geneva rounds timeline, deal terms, Mojtaba Khamenei succession, NATO Article 4 consultations after Turkish missile strike, IAEA nuclear access blocked, Gulf states joint condemnation, and Israel\u2019s strikes. Updated daily.',
    pageOgDescription: 'Diplomatic track suspended: US-Iran Geneva rounds timeline, deal terms, Mojtaba Khamenei succession, NATO Article 4 consultations after Turkish missile strike, IAEA nuclear access blocked, and Gulf states joint condemnation.',
    pageOgType: 'article',
  }),
  page('scenarios.html', 'sections/sidebar-scenarios.html', [
    'sections/scenarios.html',
  ], {
    pageTitle: 'Iran Crisis: Five Scenarios \u2014 {{date}}',
    pageDescription: 'Five active scenarios for the Iran crisis post-Operation Epic Fury: regime collapse/revolution, Pahlavi democratic transition, IRGC junta, Iranian civil war, and regional escalation. Analyst consensus probabilities.',
    pageOgDescription: 'Five active scenarios for the Iran crisis post-Operation Epic Fury: regime collapse/revolution, Pahlavi democratic transition, IRGC junta succession, Iranian civil war/fragmentation, and regional escalation/proxy war spread.',
    pageOgType: 'article',
  }),
  page('forces.html', 'sections/sidebar-forces.html', [
    'sections/nation-postures.html', 'sections/air-power.html', 'sections/naval.html',
    'sections/military.html', 'sections/iran-retaliation-playbook.html',
    'sections/iran-retaliation-executed.html', 'sections/hormuz.html',
  ], {
    pageTitle: 'Iran Crisis: Order of Battle \u2014 {{date}}',
    pageDescription: 'Full order of battle: US air and naval forces (160+ aircraft, triple carrier strike groups) vs. Iran\'s remaining military capability — missiles, drones, IRGC Navy, and the Strait of Hormuz threat.',
    pageOgDescription: 'Full order of battle: US strike forces vs. Iran\'s remaining military capability — missiles, drones, IRGC Navy, and the Strait of Hormuz threat.',
    pageOgType: 'article',
  }),
  page('inside-iran.html', 'sections/sidebar-inside-iran.html', [
    'sections/inside-iran.html',
  ], {
    pageTitle: 'Iran Crisis: Inside Iran \u2014 {{date}}',
    pageDescription: 'Eight converging crises inside Iran: Operation Epic Fury strikes, Khamenei succession crisis, the January Massacre, student uprising, economic freefall, internet blackout, ethnic crackdowns, water catastrophe, and axis of resistance collapse.',
    pageOgDescription: 'Eight converging crises: Operation Epic Fury direct strikes (Day 2), Khamenei confirmed dead, January Massacre (36,500+ killed), student uprising, economic freefall (rial at 1.7M/USD), digital iron curtain, ethnic crackdowns, water catastrophe, and proxy network collapse.',
    pageOgType: 'article',
  }),
  page('reactions.html', 'sections/sidebar-reactions.html', [
    'sections/reactions.html',
  ], {
    pageTitle: 'Iran Crisis: Regional Reactions &amp; Damage Assessments \u2014 {{date}}',
    pageDescription: 'Country-by-country reactions to US-Israel Operation Epic Fury strikes on Iran: Bahrain 5th Fleet hit, Abu Dhabi casualties, Qatar, Saudi Arabia, Israel, and full strike damage assessments.',
    pageOgDescription: 'Country-by-country reactions to Operation Epic Fury and Iran\u2019s retaliatory strikes: Gulf states hit, damage assessments, diplomatic fallout, and casualty reports.',
    pageOgType: 'article',
  }),
  page('analysis.html', 'sections/sidebar-analysis.html', [
    'sections/analysis.html',
  ], {
    pageTitle: 'Iran Crisis: Expert Analysis \u2014 {{date}}',
    pageDescription: 'Leading think-tank assessments on Operation Epic Fury from CSIS, ISW, Carnegie, Brookings, Atlantic Council, CFR, and RAND — costs, escalation risks, and Week 2 outlook.',
    pageOgDescription: 'Leading think-tank assessments on Operation Epic Fury — costs, escalation risks, Hormuz endgame, nuclear implications, and regime survival prospects.',
    pageOgType: 'article',
  }),
  page('opposition.html', 'sections/sidebar-opposition.html', [
    'sections/opposition.html',
  ], {
    pageTitle: 'Iran Crisis: Reza Pahlavi &amp; the Opposition \u2014 {{date}}',
    pageDescription: 'Reza Pahlavi timeline, opposition landscape (MEK, monarchists, secularists, ethnic movements), and the question of post-regime Iran leadership.',
    pageOgDescription: 'Reza Pahlavi timeline, the fractured opposition landscape, and the question of who leads a post-regime Iran.',
    pageOgType: 'article',
  }),
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
      ...HEADER,
      'sections/sidebar-sources.html',
      'sections/sources.html',
      'sections/scripts.html',
    ],
  },
];

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

function validateNavigation(output, sidebarFile) {
  const warnings = [];
  const sidebarContent = fs.readFileSync(path.join(BASE_DIR, sidebarFile), 'utf8');
  const sectionIds = extractHtmlMatches(output, /\bid=["']([^"']+)["']/g);
  const sidebarTargets = extractHtmlMatches(sidebarContent, /href=["']#([^"']+)["']/g);
  for (const target of sidebarTargets) {
    if (!sectionIds.has(target)) {
      warnings.push(`Navigation: Sidebar links to #${target} but no matching section ID found`);
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
  for (const [k, v] of Object.entries(build.meta || {})) {
    ctx[k] = v.replace(/\{\{([^}]+)\}\}/g, (_m, key) => (DATA[key] !== undefined ? DATA[key] : _m));
  }

  // Build a virtual template that includes all sections for this page.
  const template = build.sections.map(f => `{% include "${f}" %}`).join('\n');

  // Render through Nunjucks.
  const output = nunjucks.renderString(template, ctx);

  // Run validations on individual section files.
  const buildWarnings = [];
  for (const file of build.sections) {
    const content = fs.readFileSync(path.join(BASE_DIR, file), 'utf8');
    buildWarnings.push(...validateAIZones(content, file));
    buildWarnings.push(...validateTagBalance(content, file));
    buildWarnings.push(...checkFileSize(content, file));
  }

  // Run global validations.
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
