#!/usr/bin/env node
/**
 * scripts/update-date.js
 *
 * Updates the "date" and "lastUpdated" fields in data.json to the current
 * UTC date and time.  Run automatically by the daily-build workflow before
 * the npm run build step.
 *
 * Usage:  node scripts/update-date.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data.json');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const now = new Date();

const date        = `${MONTHS[now.getUTCMonth()]} ${now.getUTCDate()}, ${now.getUTCFullYear()}`;
const lastUpdated = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')} UTC`;

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
data.date        = date;
data.lastUpdated = lastUpdated;

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');

console.log(`data.json updated — date: "${date}", lastUpdated: "${lastUpdated}"`);
