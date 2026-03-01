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
    } else if (prop.type === 'array' && !Array.isArray(val)) {
      warnings.push(`data.json: "${key}" should be an array, got ${typeof val}`);
    } else if (prop.type === 'string' && prop.pattern) {
      const re = new RegExp(prop.pattern);
      if (!re.test(val)) {
        warnings.push(`data.json: "${key}" value "${val}" does not match pattern ${prop.pattern}`);
      }
    }
  }

  // Validate scenario percentages sum to 100.
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

// Derive day-label helpers from the "date" field so last-24h.html day headers
// never need manual edits (e.g. "FEB 26", "FEB 25", "FEB 24").
(function injectDayLabels() {
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTHS_UP    = MONTHS_SHORT.map(m => m.toUpperCase());
  const fmt = dt => `${MONTHS_UP[dt.getMonth()]} ${dt.getDate()}`;
  const today = new Date(DATA.date);
  const yesterday  = new Date(today); yesterday.setDate(today.getDate() - 1);
  const twoDaysAgo = new Date(today); twoDaysAgo.setDate(today.getDate() - 2);
  DATA.dayToday      = fmt(today);
  DATA.dayYesterday  = fmt(yesterday);
  DATA.dayTwoDaysAgo = fmt(twoDaysAgo);
  // Short date for sidebar and compact displays (e.g. "Feb 28, 2026").
  DATA.dateShort = `${MONTHS_SHORT[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
}());

const BUILDS = [
  {
    output: 'index.html',
    sidebarFile: 'sections/sidebar.html',
    sections: [
      'sections/head.html',
      'sections/masthead.html',
      'sections/ticker.html',
      'sections/sidebar.html',
      'sections/stats.html',
      'sections/last-24h.html',
      'sections/footage.html',
      'sections/confirmed-unconfirmed.html',
      'sections/theater.html',
      'sections/nuclear-teaser.html',
      'sections/scenarios-teaser.html',
      'sections/analysis.html',
      'sections/forces-teaser.html',
      'sections/military.html',
      'sections/inside-iran-teaser.html',
      'sections/reactions-teaser.html',
      'sections/opposition.html',
      'sections/sources-link.html',
      'sections/scripts.html',
    ],
  },
  {
    output: 'diplomatic.html',
    sidebarFile: 'sections/sidebar-diplomatic.html',
    sections: [
      'sections/head-diplomatic.html',
      'sections/masthead.html',
      'sections/ticker.html',
      'sections/sidebar-diplomatic.html',
      'sections/diplomatic.html',
      'sections/sources-link.html',
      'sections/scripts.html',
    ],
  },
  {
    output: 'scenarios.html',
    sidebarFile: 'sections/sidebar-scenarios.html',
    sections: [
      'sections/head-scenarios.html',
      'sections/masthead.html',
      'sections/ticker.html',
      'sections/sidebar-scenarios.html',
      'sections/scenarios.html',
      'sections/sources-link.html',
      'sections/scripts.html',
    ],
  },
  {
    output: 'forces.html',
    sidebarFile: 'sections/sidebar-forces.html',
    sections: [
      'sections/head-forces.html',
      'sections/masthead.html',
      'sections/ticker.html',
      'sections/sidebar-forces.html',
      'sections/air-power.html',
      'sections/naval.html',
      'sections/sources-link.html',
      'sections/scripts.html',
    ],
  },
  {
    output: 'inside-iran.html',
    sidebarFile: 'sections/sidebar-inside-iran.html',
    sections: [
      'sections/head-inside-iran.html',
      'sections/masthead.html',
      'sections/ticker.html',
      'sections/sidebar-inside-iran.html',
      'sections/inside-iran.html',
      'sections/sources-link.html',
      'sections/scripts.html',
    ],
  },
  {
    output: 'reactions.html',
    sidebarFile: 'sections/sidebar-reactions.html',
    sections: [
      'sections/head-reactions.html',
      'sections/masthead.html',
      'sections/ticker.html',
      'sections/sidebar-reactions.html',
      'sections/reactions.html',
      'sections/sources-link.html',
      'sections/scripts.html',
    ],
  },
  {
    output: 'sources.html',
    sidebarFile: 'sections/sidebar-sources.html',
    sections: [
      'sections/head-sources.html',
      'sections/masthead.html',
      'sections/ticker.html',
      'sections/sidebar-sources.html',
      'sections/sources.html',
      'sections/scripts.html',
    ],
  },
];

function processIncludes(content) {
  return content.replace(/<!-- @include\s+(\S+)\s*-->\n?/g, (_match, includePath) => {
    const fullPath = path.resolve(BASE_DIR, includePath);
    if (!fullPath.startsWith(BASE_DIR + path.sep) && fullPath !== BASE_DIR) {
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
  const openMarkers = content.match(/<!-- @ai-zone:(\w+) -->/g) || [];
  const closeMarkers = content.match(/<!-- @\/ai-zone:(\w+) -->/g) || [];

  if (openMarkers.length !== closeMarkers.length) {
    warnings.push(`${filename}: Unbalanced AI zone markers (${openMarkers.length} open, ${closeMarkers.length} close)`);
  }

  return warnings;
}

/** Check for oversized section files */
function checkFileSize(filename) {
  const warnings = [];
  const fullPath = path.join(BASE_DIR, filename);
  const content = fs.readFileSync(fullPath, 'utf8');
  const lineCount = content.split('\n').length;

  if (lineCount > 200) {
    warnings.push(`${filename}: Large file (${lineCount} lines) — consider splitting`);
  }

  return warnings;
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

const unknownKeys = new Set();
const allWarnings = [];

for (const build of BUILDS) {
  const buildWarnings = [];

  // Build output for this page
  const output = build.sections.map(file => {
    const content = fs.readFileSync(path.join(BASE_DIR, file), 'utf8');

    // Run validations on each file (only once, for the first build that uses it)
    buildWarnings.push(...validateAIZones(content, file));
    buildWarnings.push(...checkFileSize(file));

    return applyData(processTicker(processIncludes(content)), unknownKeys);
  }).join('');

  // Run global validations
  buildWarnings.push(...validateNavigation(output, build.sidebarFile));
  buildWarnings.push(...checkDuplicateIds(output));

  allWarnings.push(...buildWarnings);

  fs.writeFileSync(path.join(BASE_DIR, build.output), output);
  console.log(`Built ${build.output} from ${build.sections.length} sections.`);
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
