#!/usr/bin/env node
/**
 * build.js — assembles index.html from section and chart partials.
 *
 * Usage:  node build.js
 *
 * Section files in sections/ are concatenated in order.
 * Inside any section file, <!-- @include path --> directives are replaced
 * with the contents of the referenced file (paths are relative to this
 * script's directory).
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const BASE_DIR = __dirname;

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

const output = SECTIONS.map(file => {
  const content = fs.readFileSync(path.join(BASE_DIR, file), 'utf8');
  return processIncludes(content);
}).join('');

fs.writeFileSync(path.join(BASE_DIR, 'index.html'), output);
console.log(`Built index.html from ${SECTIONS.length} sections.`);
