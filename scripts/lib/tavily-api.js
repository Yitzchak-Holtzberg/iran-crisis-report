'use strict';

/**
 * Brave Web Search wrappers — drop-in replacement for the Tavily client.
 * Exports the same { init, tavilySearch, tavilyExtract } interface so all
 * callers are unchanged.
 *
 * Free tier: 2,000 requests/month (routine runs use ~8/day ≈ 240/month).
 * Docs: https://api.search.brave.com/app/documentation/web-search
 */

let BRAVE_KEY;

function init(key) {
  BRAVE_KEY = key;
}

/**
 * Run a Brave Web Search and return a Tavily-compatible result object.
 *
 * Supported opts:
 *   time_range     'day' | 'week' | 'month'  → Brave freshness pd/pw/pm
 *   max_results    number (default 5)
 *   include_domains string[]  → appended as site: operators in the query
 *   search_depth   ignored (no Brave equivalent)
 *   topic          ignored
 */
async function tavilySearch(query, opts = {}) {
  // Map include_domains → site: operators (deep-research passes one domain per call)
  const domains = opts.include_domains || [];
  const siteFilter = domains.length
    ? domains.map(d => `site:${d}`).join(' OR ')
    : '';
  const fullQuery = siteFilter ? `${query} (${siteFilter})` : query;

  // Map time_range → Brave freshness parameter
  const freshnessMap = { day: 'pd', week: 'pw', month: 'pm' };
  const freshness = freshnessMap[opts.time_range] || 'pd';

  const count = opts.max_results || 5;

  const params = new URLSearchParams({
    q:       fullQuery,
    count:   String(Math.min(count, 20)),
    freshness,
  });

  // Use the dedicated news endpoint for general queries — it returns focused,
  // up-to-the-hour news articles in a flat `results` array.
  // Fall back to the web endpoint for domain-specific deep-research queries
  // (include_domains), where broader web coverage matters more.
  const useNewsEndpoint = domains.length === 0;
  const endpoint = useNewsEndpoint
    ? `https://api.search.brave.com/res/v1/news/search?${params}`
    : `https://api.search.brave.com/res/v1/web/search?${params}&result_filter=web`;

  const res = await fetch(endpoint, {
    headers: {
      'Accept':               'application/json',
      'Accept-Encoding':      'gzip',
      'X-Subscription-Token': BRAVE_KEY,
    },
  });

  if (!res.ok) {
    throw new Error(`Brave Search error ${res.status} for query "${query}": ${await res.text()}`);
  }

  const data = await res.json();

  // Normalise to Tavily-compatible { url, title, content, score } shape.
  // News endpoint → flat `data.results`; web endpoint → `data.web.results`.
  const raw = useNewsEndpoint ? (data.results || []) : (data.web?.results || []);
  const results = raw.map(r => ({
    url:     r.url,
    title:   r.title || '',
    content: r.description || '',
    score:   1.0,
  }));

  return {
    results: results.slice(0, count),
    answer:  '',   // Tavily synthesises an AI answer; Brave does not
  };
}

/**
 * Extract full article text from URLs (used in structural deep-research mode only).
 * Brave has no extract API — fetches pages directly instead.
 * Returns an empty array on total failure; callers already handle this gracefully
 * with "falling back to search snippets only".
 */
async function tavilyExtract(urls, opts = {}) {
  if (!urls.length) return [];

  const results = await Promise.allSettled(
    urls.slice(0, 10).map(async url => {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return null;
      const html = await res.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 5000);
      return text.length > 100 ? { url, raw_content: text } : null;
    })
  );

  return results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}

module.exports = { init, tavilySearch, tavilyExtract };
