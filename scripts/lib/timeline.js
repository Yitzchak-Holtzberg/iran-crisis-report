'use strict';

// ── Timeline helpers (date-aware rotation system) ────────────────────────────

const MAX_TODAY_ITEMS     = 20;
const MAX_YESTERDAY_ITEMS = 15;

const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
};

// Matches a single .tl-item block (with optional data-date attribute).
const TL_ITEM_RE = /<div class="tl-item"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g;

/**
 * Parse a human-readable date string like "March 7, 2026" into a Date object.
 */
function parseHumanDate(str) {
  if (!str) return null;
  const m = str.match(/(\w+)\s+(\d{1,2}),?\s*(\d{4})/);
  if (!m) return null;
  const month = MONTH_MAP[m[1].toLowerCase()];
  if (month === undefined) return null;
  return new Date(Date.UTC(+m[3], month, +m[2]));
}

/**
 * Extract the newest date from an HTML string by scanning source citations.
 */
function extractItemDate(html, fallbackYear) {
  const attrMatch = html.match(/data-date="(\d{4}-\d{2}-\d{2})"/);
  if (attrMatch) return new Date(attrMatch[1] + 'T00:00:00Z');

  const dateRe = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2})(?:,?\s*(\d{4}))?\b/gi;
  let newest = null;
  let match;
  while ((match = dateRe.exec(html)) !== null) {
    const month = MONTH_MAP[match[1].toLowerCase()];
    if (month === undefined) continue;
    const year = match[3] ? +match[3] : fallbackYear;
    const d = new Date(Date.UTC(year, month, +match[2]));
    if (!newest || d > newest) newest = d;
  }
  return newest;
}

function isSameDay(a, b) {
  return a.getUTCFullYear() === b.getUTCFullYear() &&
         a.getUTCMonth()    === b.getUTCMonth() &&
         a.getUTCDate()     === b.getUTCDate();
}

function extractTlItems(section) {
  return [...section.matchAll(new RegExp(TL_ITEM_RE.source, 'gs'))].map(m => m[0]);
}

function stripTlItems(section) {
  return section.replace(new RegExp(TL_ITEM_RE.source, 'gs'), '').replace(/\n{3,}/g, '\n');
}

function injectTlItems(section, items) {
  if (!items.length) return section;
  const marker = /<div class="timeline[^"]*"[^>]*>/;
  const m = section.match(marker);
  if (!m) return section;
  const insertAt = m.index + m[0].length;
  return section.slice(0, insertAt) + '\n' +
         items.join('\n') + '\n' +
         section.slice(insertAt);
}

/**
 * Rotate timeline items based on date.
 */
function rotateTimelineDays(fileContent, todayDateStr) {
  const today = parseHumanDate(todayDateStr);
  if (!today) {
    console.warn('rotateTimelineDays: could not parse date — skipping rotation.');
    return fileContent;
  }
  const yesterday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1));
  const fallbackYear = today.getUTCFullYear();

  const YESTERDAY_MARKER = '<!-- ── YESTERDAY ── -->';
  const splitIdx = fileContent.indexOf(YESTERDAY_MARKER);
  if (splitIdx === -1) return fileContent;

  let todaySection    = fileContent.slice(0, splitIdx);
  let yesterdaySection = fileContent.slice(splitIdx);

  const todayItems     = extractTlItems(todaySection);
  const yesterdayItems = extractTlItems(yesterdaySection);

  const keepToday     = [];
  const moveToYesterday = [];

  for (const html of todayItems) {
    const d = extractItemDate(html, fallbackYear);
    if (!d || isSameDay(d, today)) {
      keepToday.push(html);
    } else if (isSameDay(d, yesterday)) {
      moveToYesterday.push(html);
    }
  }

  const keepYesterday = [];
  for (const html of yesterdayItems) {
    const d = extractItemDate(html, fallbackYear);
    if (!d || isSameDay(d, yesterday)) {
      keepYesterday.push(html);
    }
  }

  const finalYesterday = [...moveToYesterday, ...keepYesterday];

  todaySection    = injectTlItems(stripTlItems(todaySection), keepToday.slice(0, MAX_TODAY_ITEMS));
  yesterdaySection = injectTlItems(stripTlItems(yesterdaySection), finalYesterday.slice(0, MAX_YESTERDAY_ITEMS));

  const rotatedToday = keepToday.length;
  const discarded = (todayItems.length + yesterdayItems.length) - rotatedToday - finalYesterday.length;
  if (discarded > 0 || moveToYesterday.length > 0) {
    console.log(`Timeline rotation: ${rotatedToday} today, ${moveToYesterday.length} moved to yesterday, ${discarded} discarded.`);
  }

  return todaySection + yesterdaySection;
}

/**
 * Prepend new timeline items to the TODAY section.
 */
function spliceTimelineItems(fileContent, newItemsHtml) {
  if (!newItemsHtml || !newItemsHtml.trim()) return fileContent;

  const marker = /<div class="timeline[^"]*"[^>]*>/;
  const match  = fileContent.match(marker);
  if (!match) {
    console.warn('Could not find TODAY timeline div — skipping last-24h.html update.');
    return fileContent;
  }

  const insertAt = match.index + match[0].length;
  return (
    fileContent.slice(0, insertAt) +
    '\n' + newItemsHtml.trimEnd() + '\n' +
    fileContent.slice(insertAt)
  );
}

/**
 * Prune .tl-item entries so the file doesn't grow unbounded.
 */
function pruneTimelineItems(fileContent) {
  const yesterdayMarker = '<!-- ── YESTERDAY ── -->';
  const splitIdx = fileContent.indexOf(yesterdayMarker);
  if (splitIdx === -1) return fileContent;

  let todaySection     = fileContent.slice(0, splitIdx);
  let yesterdaySection  = fileContent.slice(splitIdx);

  const todayItems     = extractTlItems(todaySection);
  const yesterdayItems = extractTlItems(yesterdaySection);

  if (todayItems.length > MAX_TODAY_ITEMS) {
    todaySection = injectTlItems(stripTlItems(todaySection), todayItems.slice(0, MAX_TODAY_ITEMS));
  }
  if (yesterdayItems.length > MAX_YESTERDAY_ITEMS) {
    yesterdaySection = injectTlItems(stripTlItems(yesterdaySection), yesterdayItems.slice(0, MAX_YESTERDAY_ITEMS));
  }

  return todaySection + yesterdaySection;
}

/**
 * Lightweight hallucination check for timeline items.
 */
function filterHallucinations(items, searchContext) {
  if (!items.length) return items;
  const searchLower = searchContext.toLowerCase();
  return items.filter((html, idx) => {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const claims = text.match(/\b[A-Z][a-z]{3,}\b/g) || [];
    const numbers = text.match(/\b\d{2,}\b/g) || [];
    const checkTerms = [...new Set([...claims, ...numbers])];
    if (checkTerms.length === 0) return true;
    const found = checkTerms.filter(t => searchLower.includes(t.toLowerCase()));
    const ratio = found.length / checkTerms.length;
    if (ratio < 0.3) {
      console.warn(`  Timeline item ${idx + 1} may be hallucinated (${found.length}/${checkTerms.length} terms found in search) — dropping.`);
      return false;
    }
    return true;
  });
}

module.exports = {
  parseHumanDate,
  extractTlItems,
  rotateTimelineDays,
  spliceTimelineItems,
  pruneTimelineItems,
  filterHallucinations,
  TL_ITEM_RE,
};
