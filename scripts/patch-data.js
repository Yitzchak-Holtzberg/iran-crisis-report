#!/usr/bin/env node
/**
 * scripts/patch-data.js
 *
 * Patches specific fields in data.json without requiring the AI pipeline.
 * Useful for quick manual corrections and for the quick-update GitHub Actions
 * workflow.  Only keys already defined in data.schema.json are accepted.
 *
 * Input is read from environment variables named PATCH_<key> (case-sensitive):
 *   PATCH_date          → data.json "date"
 *   PATCH_lastUpdated   → data.json "lastUpdated"
 *   PATCH_ticker        → pipe-separated string split into an array
 *   PATCH_statUsTroops  → data.json "statUsTroops"
 *   …etc.
 *
 * Empty / unset env vars are silently skipped.
 *
 * Alternatively, pass --key=value arguments on the command line:
 *   node scripts/patch-data.js --date="March 1, 2026" --statUsTroops="36,000+"
 *   node scripts/patch-data.js --ticker="HEADLINE 1|HEADLINE 2"
 *
 * After patching, data.json is updated in place.
 * Run  npm run build  to regenerate HTML pages.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_PATH   = path.join(__dirname, '..', 'data.json');
const SCHEMA_PATH = path.join(__dirname, '..', 'data.schema.json');

const data   = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

const schemaProps = schema.properties || {};

/** Parse CLI --key=value arguments into a plain object. */
function parseCLIArgs() {
  const out = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=([\s\S]*)$/);
    if (!m) {
      console.error(`Ignoring unrecognised argument: ${arg}`);
      continue;
    }
    out[m[1]] = m[2];
  }
  return out;
}

/** Collect patches from PATCH_<key> environment variables. */
function parseEnvPatches() {
  const out = {};
  for (const key of Object.keys(schemaProps)) {
    const envVal = process.env[`PATCH_${key}`];
    if (envVal !== undefined && envVal !== '') {
      out[key] = envVal;
    }
  }
  return out;
}

// CLI args take precedence over env vars.
const patches = { ...parseEnvPatches(), ...parseCLIArgs() };

if (Object.keys(patches).length === 0) {
  console.error(
    'No fields to patch.\n' +
    'Usage: node scripts/patch-data.js --key=value [--key2=value2 ...]\n' +
    '  or set PATCH_<key> environment variables.\n' +
    'The "ticker" field accepts pipe-separated headlines: --ticker="HEADLINE 1|HEADLINE 2"'
  );
  process.exit(1);
}

let changed = 0;
for (const [key, raw] of Object.entries(patches)) {
  if (!(key in schemaProps)) {
    console.error(`Skipping unknown key "${key}" (not defined in data.schema.json).`);
    continue;
  }
  const prop = schemaProps[key];
  if (prop.type === 'array') {
    // ticker: split on pipe, trim, drop empties
    data[key] = raw.split('|').map(s => s.trim()).filter(Boolean);
  } else {
    data[key] = raw;
  }
  console.log(`  ${key} = ${JSON.stringify(data[key])}`);
  changed++;
}

if (changed === 0) {
  console.error('No valid keys were patched. Exiting without writing.');
  process.exit(1);
}

fs.writeFileSync(DATA_PATH + '.tmp', JSON.stringify(data, null, 2) + '\n');
fs.renameSync(DATA_PATH + '.tmp', DATA_PATH);
console.log(`data.json updated — ${changed} field${changed === 1 ? '' : 's'} patched.`);
