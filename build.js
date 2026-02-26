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

// Derive day-label helpers from the "date" field so last-24h.html day headers
// never need manual edits (e.g. "FEB 26", "FEB 25", "FEB 24").
(function injectDayLabels() {
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const fmt = dt => `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
  const today = new Date(DATA.date);
  const yesterday  = new Date(today); yesterday.setDate(today.getDate() - 1);
  const twoDaysAgo = new Date(today); twoDaysAgo.setDate(today.getDate() - 2);
  DATA.dayToday      = fmt(today);
  DATA.dayYesterday  = fmt(yesterday);
  DATA.dayTwoDaysAgo = fmt(twoDaysAgo);
}());

const SECTIONS = [
  'sections/head.html',
  'sections/masthead.html',
  'sections/ticker.html',
  'sections/sidebar.html',
  'sections/stats.html',
  'sections/last-24h.html',
  'sections/theater.html',
  'sections/air-power.html',
  'sections/naval.html',
  'sections/inside-iran.html',
  'sections/opposition.html',
  'sections/nuclear.html',
  'sections/hormuz.html',
  'sections/military.html',
  'sections/scenarios.html',
  'sections/sources.html',
  'sections/scripts.html',
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

const unknownKeys = new Set();
const output = SECTIONS.map(file => {
  const content = fs.readFileSync(path.join(BASE_DIR, file), 'utf8');
  return applyData(processTicker(processIncludes(content)), unknownKeys);
}).join('');

if (unknownKeys.size > 0) {
  process.stderr.write(`Warning: unresolved placeholders in output — check data.json for: ${[...unknownKeys].join(', ')}\n`);
}

fs.writeFileSync(path.join(BASE_DIR, 'index.html'), output);
console.log(`Built index.html from ${SECTIONS.length} sections.`);
