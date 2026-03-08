'use strict';

// ── Per-section deep research sites ──────────────────────────────────────────

const RESEARCH_SITES = {
  analysis: [
    { domain: 'carnegieendowment.org', query: 'Iran war succession analysis' },
    { domain: 'brookings.edu',         query: 'Iran conflict assessment' },
    { domain: 'atlanticcouncil.org',   query: 'Iran crisis expert analysis' },
    { domain: 'cfr.org',               query: 'Iran war what happens next' },
    { domain: 'rand.org',              query: 'Iran leadership succession scenarios' },
    { domain: 'csis.org',              query: 'Iran strikes nuclear cost assessment' },
    { domain: 'understandingwar.org',  query: 'Iran situation report' },
  ],
  map: [
    { domain: 'reuters.com',          query: 'Iran strikes military targets locations' },
    { domain: 'understandingwar.org',  query: 'Iran force positions deployments' },
    { domain: 'centcom.mil',          query: 'Iran operations press release' },
  ],
  scenarios: [
    { domain: 'cfr.org',              query: 'Iran war outcomes scenarios' },
    { domain: 'rand.org',             query: 'Iran conflict escalation scenarios' },
    { domain: 'brookings.edu',        query: 'Iran post-war scenarios' },
    { domain: 'foreignaffairs.com',   query: 'Iran war future outlook' },
  ],
  reactions: [
    { domain: 'reuters.com',          query: 'Iran war regional reactions' },
    { domain: 'aljazeera.com',        query: 'Middle East reaction Iran conflict' },
    { domain: 'atlanticcouncil.org',  query: 'Iran war regional impact analysis' },
  ],
  naval: [
    { domain: 'reuters.com',          query: 'Strait of Hormuz warships Iran navy' },
    { domain: 'usni.org',             query: 'US Navy carrier group Iran deployment' },
    { domain: 'maritime-executive.com', query: 'Strait of Hormuz shipping disruption' },
  ],
  'air-power': [
    { domain: 'reuters.com',          query: 'Iran air strikes sorties aircraft' },
    { domain: 'airforcemag.com',      query: 'Air Force Iran operations' },
  ],
  military: [
    { domain: 'csis.org',             query: 'Iran military missiles air defense assessment' },
    { domain: 'understandingwar.org',  query: 'Iran IRGC military forces assessment' },
    { domain: 'iiss.org',             query: 'Iran military capability balance' },
  ],
  general: [
    { domain: 'reuters.com',          query: 'Iran war latest developments' },
    { domain: 'ap.com',               query: 'Iran conflict breaking news' },
  ],
};

/**
 * AI triage — ask GPT-5-mini which articles from a search are worth extracting.
 */
async function triageArticles(urlMeta, sectionLabel, { callGPT, routineModel }) {
  if (urlMeta.length <= 3) return urlMeta;

  const listing = urlMeta.map((m, i) =>
    `${i + 1}. [${m.domain}] ${m.title} — ${m.snippet || '(no snippet)'}`
  ).join('\n');

  const systemPrompt = `You are a research assistant for the Iran Crisis Report dashboard. ` +
    `Given a list of search result articles, pick only the ones worth reading in full ` +
    `for updating the "${sectionLabel}" section. Prefer:\n` +
    `- Tier 1-3 sources (official, wire services, think-tanks)\n` +
    `- Articles with new facts, data, or analysis (not rehashed summaries)\n` +
    `- Recent articles (this week) over older ones\n` +
    `Return a JSON array of article numbers (1-indexed) to extract. ` +
    `Extract at most 8 articles. If none are worth extracting, return [].`;

  try {
    const raw = await callGPT(systemPrompt, listing, true, routineModel, 512, 15000);
    const picks = JSON.parse(raw);
    if (!Array.isArray(picks)) return urlMeta.slice(0, 8);
    const selected = picks
      .filter(n => typeof n === 'number' && n >= 1 && n <= urlMeta.length)
      .map(n => urlMeta[n - 1]);
    console.log(`  AI triage (${sectionLabel}): ${urlMeta.length} candidates → ${selected.length} selected for extraction.`);
    return selected.length > 0 ? selected : urlMeta.slice(0, 3);
  } catch (err) {
    console.warn(`  AI triage failed (${err.message}) — extracting top 8 by default.`);
    return urlMeta.slice(0, 8);
  }
}

/**
 * Run deep research for a specific set of sites.
 * @param {Array<{domain: string, query: string}>} sites
 * @param {string} label
 * @param {object} deps - { tavilySearch, tavilyExtract, getSourceTier, callGPT, routineModel }
 */
async function deepResearch(sites, label, deps) {
  const { tavilySearch, tavilyExtract, getSourceTier, callGPT, routineModel } = deps;

  if (!sites || sites.length === 0) {
    return { articleContext: '', articlesExtracted: 0, sitesSearched: 0 };
  }
  console.log(`  Deep research (${label}) — ${sites.length} site-specific searches…`);

  const siteSearches = await Promise.allSettled(
    sites.map(site =>
      tavilySearch(site.query, {
        search_depth: 'advanced',
        time_range: 'week',
        max_results: 5,
        include_domains: [site.domain],
      })
    )
  );

  const MIN_RELEVANCE_SCORE = 0.5;
  const urlSet = new Set();
  const urlMeta = [];
  for (let i = 0; i < siteSearches.length; i++) {
    const settled = siteSearches[i];
    if (settled.status !== 'fulfilled' || !settled.value.results) continue;
    for (const r of settled.value.results) {
      if (r.url && !urlSet.has(r.url) && (r.score || 0) >= MIN_RELEVANCE_SCORE) {
        urlSet.add(r.url);
        urlMeta.push({
          url: r.url,
          title: r.title || '',
          snippet: (r.content || '').slice(0, 200),
          domain: sites[i].domain,
          score: r.score || 0,
        });
      }
    }
  }

  console.log(`  Found ${urlMeta.length} articles (score ≥ ${MIN_RELEVANCE_SCORE}) across ${sites.length} sites.`);

  if (urlMeta.length === 0) {
    return { articleContext: '', articlesExtracted: 0, sitesSearched: sites.length };
  }

  const toExtract = await triageArticles(urlMeta, label, { callGPT, routineModel });

  const extractQuery = `Iran crisis ${label} latest developments analysis`;
  let extracted = [];
  try {
    extracted = await tavilyExtract(toExtract.map(u => u.url), {
      query: extractQuery,
      chunks_per_source: 5,
    });
    console.log(`  Tavily Extract returned ${extracted.length} articles.`);
  } catch (err) {
    console.warn(`  Tavily Extract failed (${err.message}) — falling back to search snippets only.`);
  }

  const MAX_ARTICLE_LEN = 4000;
  const articleBlocks = extracted.map(ex => {
    const meta = urlMeta.find(u => u.url === ex.url);
    const tier = getSourceTier(ex.url);
    const tierTag = tier > 0 ? `[Tier ${tier}]` : '';
    const content = (ex.raw_content || '').slice(0, MAX_ARTICLE_LEN);
    return `=== ${tierTag} ${meta?.title || 'Article'} (${meta?.domain || ex.url}) ===\nURL: ${ex.url}\n${content}`;
  });

  const extractedUrls = new Set(extracted.map(e => e.url));
  for (const meta of toExtract) {
    if (!extractedUrls.has(meta.url)) {
      const tier = getSourceTier(meta.url);
      const tierTag = tier > 0 ? `[Tier ${tier}]` : '';
      articleBlocks.push(`=== ${tierTag} ${meta.title} (${meta.domain}) ===\nURL: ${meta.url}\n(extraction failed — title only)`);
    }
  }

  const articleContext = `\n\n## DEEP RESEARCH (${label}) — Full Article Content (${extracted.length} articles extracted)\n\n` +
    articleBlocks.join('\n\n');

  return { articleContext, articlesExtracted: extracted.length, sitesSearched: sites.length };
}

module.exports = { RESEARCH_SITES, deepResearch };
