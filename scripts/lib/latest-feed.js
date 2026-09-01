'use strict';

// Preserve already-published rows rather than asking a model to recreate them.
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const plain = (s) => decode(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
const key = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function readRows(html, ticker) {
  const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1];
  if (!body) throw new Error('Latest feed has no tbody; refusing to replace it');
  const stamp = html.match(/@last-updated:(\d{4}-\d{2}-\d{2})/)?.[1];
  const rows = [...body.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(([row], i) => {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1]);
    const url = row.match(/href="([^"]+)"/)?.[1];
    if (cells.length !== 3 || !url || !stamp) throw new Error('Cannot safely parse existing latest feed');
    let date = row.match(/data-event-date="([^"]+)"/)?.[1];
    if (!date) {
      let parsed = new Date(`${plain(cells[0])}, ${stamp.slice(0, 4)} 12:00:00 GMT`);
      if (Number.isNaN(parsed.getTime())) throw new Error('Invalid existing feed date');
      if (parsed.toISOString().slice(0, 10) > stamp) parsed.setUTCFullYear(parsed.getUTCFullYear() - 1);
      date = parsed.toISOString().slice(0, 10);
    }
    return { row, date, url: decode(url), headline: ticker[i] || plain(cells[1]), summary: plain(cells[1]) };
  });
  if (!rows.length) throw new Error('Existing feed is empty');
  return rows;
}

function mergeLatest(html, ticker, developments, today, render) {
  if (!developments.length) return { html, ticker };
  const existing = readRows(html, ticker);
  const incoming = developments.map(item => {
    const old = existing.find(row => row.url === item.sourceUrl && row.date === item.eventDate && key(row.summary) === key(item.summary));
    if (old) return old;
    const row = render([item], today).match(/<tbody>\s*([\s\S]*?)\s*<\/tbody>/)[1];
    return { row, date: item.eventDate, url: item.sourceUrl, headline: item.headline, summary: item.summary };
  });
  const seenUrls = new Set();
  const seenHeadlines = new Set();
  const merged = [...incoming, ...existing].filter(row => {
    if (seenUrls.has(row.url) || seenHeadlines.has(key(row.headline))) return false;
    seenUrls.add(row.url);
    seenHeadlines.add(key(row.headline));
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  if (merged.length === existing.length && merged.every((row, i) => row.row === existing[i].row)) return { html, ticker };
  return {
    html: html.replace(/<tbody>[\s\S]*?<\/tbody>/, () => `<tbody>\n${merged.map(r => '      ' + r.row).join('\n')}\n    </tbody>`)
      .replace(/@last-updated:\d{4}-\d{2}-\d{2}/, `@last-updated:${today}`),
    ticker: merged.map(row => row.headline),
  };
}

module.exports = { mergeLatest, readRows };
