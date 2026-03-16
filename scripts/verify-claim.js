#!/usr/bin/env node
'use strict';

// Usage: node scripts/verify-claim.js <file> <claim-id>
//
// Marks a @claim marker as human-verified, preventing the AI pipeline from
// modifying its content. Only humans can set or remove human-verified status.

const fs = require('fs');
const path = require('path');
const { parseClaims, CLAIM_RE } = require('./lib/provenance');

const [,, filePath, claimId] = process.argv;

if (!filePath || !claimId) {
  console.error('Usage: node scripts/verify-claim.js <file> <claim-id>');
  console.error('Example: node scripts/verify-claim.js sections/scenarios.html hormuz-closed');
  process.exit(1);
}

const fullPath = path.resolve(filePath);
if (!fs.existsSync(fullPath)) {
  console.error(`File not found: ${fullPath}`);
  process.exit(1);
}

let content = fs.readFileSync(fullPath, 'utf8');
const claims = parseClaims(content);
const claim = claims.find(c => c.id === claimId);

if (!claim) {
  console.error(`Claim "${claimId}" not found in ${filePath}`);
  if (claims.length > 0) {
    console.error(`Available claims: ${claims.map(c => c.id).join(', ')}`);
  } else {
    console.error('No @claim markers found in this file.');
  }
  process.exit(1);
}

if (claim.confidence === 'human-verified') {
  console.log(`Claim "${claimId}" is already human-verified.`);
  process.exit(0);
}

const today = new Date().toISOString().slice(0, 10);
const oldMarker = `<!-- @claim:${claim.id} confidence=${claim.confidence} origin=${claim.origin} date=${claim.date} evidence=${claim.evidence} -->`;
const newMarker = `<!-- @claim:${claim.id} confidence=human-verified origin=human date=${today} evidence=${claim.evidence} -->`;

content = content.replace(oldMarker, newMarker);
fs.writeFileSync(fullPath, content);

console.log(`Claim "${claimId}" verified:`);
console.log(`  ${claim.confidence} → human-verified`);
console.log(`  origin: ${claim.origin} → human`);
console.log(`  date: ${claim.date} → ${today}`);
