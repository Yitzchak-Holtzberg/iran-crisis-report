'use strict';

/**
 * Tavily API wrappers (search + extract).
 * Requires TAVILY_KEY to be passed via init().
 */

let TAVILY_KEY;

function init(key) {
  TAVILY_KEY = key;
}

/**
 * Run a single Tavily search and return the result object.
 */
async function tavilySearch(query, opts = {}) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_KEY,
      query,
      topic: opts.topic || 'news',
      time_range: opts.time_range || 'day',
      search_depth: opts.search_depth || 'basic',
      max_results: opts.max_results || 5,
      include_answer: true,
      include_domains: opts.include_domains || [],
      exclude_domains: opts.exclude_domains || [],
    }),
  });
  if (!res.ok) {
    throw new Error(`Tavily error ${res.status} for query "${query}": ${await res.text()}`);
  }
  return res.json();
}

/**
 * Use Tavily Extract to pull article content from URLs.
 * @param {string[]} urls - Up to 20 URLs to extract
 * @param {object} [opts]
 * @param {string} [opts.query] - Rerank extracted chunks by relevance to this query
 * @param {number} [opts.chunks_per_source] - 1-5, return only top chunks (max 500 chars each)
 * @param {'basic'|'advanced'} [opts.extract_depth] - 'advanced' for complex layouts (costs more)
 */
async function tavilyExtract(urls, opts = {}) {
  if (!urls.length) return [];
  const body = {
    api_key: TAVILY_KEY,
    urls: urls.slice(0, 20),
  };
  if (opts.extract_depth) body.extract_depth = opts.extract_depth;
  if (opts.query) {
    body.query = opts.query;
    body.chunks_per_source = opts.chunks_per_source || 3;
  }
  const res = await fetch('https://api.tavily.com/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Tavily Extract error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.results || [];
}

module.exports = { init, tavilySearch, tavilyExtract };
