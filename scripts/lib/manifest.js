'use strict';

const fs = require('fs');

// ── Manifest & metadata helpers ──────────────────────────────────────────────

const FRESHNESS_RE = /<!-- @last-updated:\d{4}-\d{2}-\d{2} -->/;

/** Read the existing manifest or create a blank one. */
function readManifest(manifestPath) {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return { updates: [] };
  }
}

/** Append an entry to the manifest and write it to disk. Keep last 50 entries. */
function writeManifest(manifestPath, entry) {
  const manifest = readManifest(manifestPath);
  manifest.updates.push(entry);
  if (manifest.updates.length > 50) {
    manifest.updates = manifest.updates.slice(-50);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

/**
 * Update or insert a <!-- @last-updated:YYYY-MM-DD --> comment at the top of a
 * section file.
 */
function stampFreshness(filePath) {
  const today = new Date().toISOString().slice(0, 10);
  const stamp = `<!-- @last-updated:${today} -->`;
  let content = fs.readFileSync(filePath, 'utf8');
  if (FRESHNESS_RE.test(content)) {
    content = content.replace(FRESHNESS_RE, stamp);
  } else {
    const firstNewline = content.indexOf('\n');
    if (firstNewline > 0) {
      content = content.slice(0, firstNewline + 1) + stamp + '\n' + content.slice(firstNewline + 1);
    } else {
      content = stamp + '\n' + content;
    }
  }
  fs.writeFileSync(filePath, content);
}

/**
 * Compute a simple summary of what changed between two strings.
 */
function diffSummary(before, after) {
  const beforeLines = before.split('\n').length;
  const afterLines  = after.split('\n').length;
  return {
    linesAdded:   Math.max(0, afterLines - beforeLines),
    linesRemoved: Math.max(0, beforeLines - afterLines),
    sizeChange:   after.length - before.length,
  };
}

module.exports = { readManifest, writeManifest, stampFreshness, diffSummary };
