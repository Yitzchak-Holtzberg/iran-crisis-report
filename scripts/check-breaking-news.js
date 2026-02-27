#!/usr/bin/env node
/**
 * scripts/check-breaking-news.js
 *
 * Checks whether serious breaking news about Iran has emerged in the last
 * 30 minutes and writes a GitHub Actions step output accordingly.
 *
 * A rebuild is triggered when ALL of the following are true:
 *   1. TAVILY_API_KEY is set (otherwise no check is possible).
 *   2. No automated rebuild occurred in the last 30 minutes (git-log cooldown).
 *   3. At least one Tavily result was published within the last 30 minutes AND
 *      contains at least one urgency keyword in its title or content.
 *
 * GitHub Actions step output (steps.<id>.outputs.breaking):
 *   true  → the calling workflow should proceed with a full rebuild
 *   false → the calling workflow should exit early (no news / cooldown)
 *
 * The script always exits with code 0 so a Tavily or network error never
 * fails the workflow.
 *
 * Usage:  node scripts/check-breaking-news.js
 */

'use strict';

const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

const TAVILY_KEY = process.env.TAVILY_API_KEY;

// ── Tuning constants ─────────────────────────────────────────────────────────

/** Tavily results must have been published within this window to count. */
const RECENCY_MINUTES = 30;

/** Skip the check if an automated rebuild already ran within this window. */
const COOLDOWN_MINUTES = 30;

/**
 * Focused single query for fast, cheap detection.  One query per poll keeps
 * usage at ~1,440 searches/month at 30-minute intervals, within Tavily's
 * paid tier ($0.01/search after the 1,000-search free allowance).
 */
const BREAKING_QUERY = 'Iran breaking news urgent latest';

/**
 * At least one of these must appear in a fresh result's title or content
 * snippet for the result to be considered "breaking".
 */
const URGENCY_KEYWORDS = [
  'breaking', 'just in', 'alert', 'urgent', 'flash',
  'strike', 'attack', 'bombed', 'missile', 'explosion', 'killed',
  'nuclear', 'war', 'invasion', 'deployed', 'warship',
  'sanctions', 'arrested', 'evacuate', 'ultimatum', 'ceasefire',
  'deal', 'agreement', 'collapse', 'crisis',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Write a step-output variable to $GITHUB_OUTPUT (no-op outside of Actions). */
function setOutput(key, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (file) {
    fs.appendFileSync(file, `${key}=${value}\n`);
  }
  console.log(`Output: ${key}=${value}`);
}

/**
 * Return true if the git log contains an automated chore rebuild commit within
 * the last COOLDOWN_MINUTES, preventing rapid rebuild cascades.
 */
function recentRebuildExists() {
  try {
    const out = execSync(
      `git log --oneline --since="${COOLDOWN_MINUTES} minutes ago" --grep="chore:.*rebuild"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Require API key.
  if (!TAVILY_KEY) {
    console.log('TAVILY_API_KEY not set — skipping breaking-news check.');
    setOutput('breaking', 'false');
    return;
  }

  // 2. Cooldown: skip if we rebuilt very recently to avoid cascade rebuilds.
  if (recentRebuildExists()) {
    console.log(`Cooldown active — a rebuild already ran within the last ${COOLDOWN_MINUTES} minutes.`);
    setOutput('breaking', 'false');
    return;
  }

  // 3. Query Tavily for recent Iran breaking news.
  console.log(`Querying Tavily for breaking Iran news (last ${RECENCY_MINUTES} min)…`);
  let results = [];
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key:        TAVILY_KEY,
        query:          BREAKING_QUERY,
        max_results:    5,
        search_depth:   'basic',
        include_answer: false,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const json = await res.json();
    results = json.results || [];
  } catch (err) {
    console.log(`Tavily request failed (${err.message}) — skipping rebuild.`);
    setOutput('breaking', 'false');
    return;
  }

  // 4. Filter to recent results that contain at least one urgency keyword.
  const cutoff = new Date(Date.now() - RECENCY_MINUTES * 60 * 1000);
  let detected = false;

  for (const result of results) {
    // Skip results without a parseable publish date.
    if (!result.published_date) continue;
    const published = new Date(result.published_date);
    if (isNaN(published.getTime()) || published < cutoff) continue;

    // Check for at least one urgency keyword in title + content snippet.
    const text = `${result.title || ''} ${result.content || ''}`.toLowerCase();
    if (URGENCY_KEYWORDS.some(kw => text.includes(kw))) {
      console.log(`Breaking news detected: "${result.title}" (${result.published_date})`);
      detected = true;
      break;
    }
  }

  if (!detected) {
    console.log('No breaking Iran news detected in the last 30 minutes.');
  }

  setOutput('breaking', detected ? 'true' : 'false');
}

main().catch(err => {
  console.error('check-breaking-news.js unexpected error:', err.message);
  setOutput('breaking', 'false');
  // Exit 0 — never fail the workflow due to a watcher script error.
});
