'use strict';

// ── Source Tier Classification ────────────────────────────────────────────────
// Maps domains to the 6-tier credibility hierarchy from STRUCTURAL_GUIDELINES.md.
// Tier 0 = unknown (treated as tier 4 for filtering purposes).

const SOURCE_TIERS = {
  // Tier 1 — Official government / intergovernmental
  'centcom.mil': 1, 'state.gov': 1, 'defense.gov': 1, 'whitehouse.gov': 1,
  'iaea.org': 1, 'un.org': 1, 'who.int': 1, 'unocha.org': 1,
  'reliefweb.int': 1, 'treasury.gov': 1,
  // Tier 2 — Wire services
  'reuters.com': 2, 'apnews.com': 2, 'france24.com': 2, 'afp.com': 2,
  // Tier 3 — Specialist defence / think-tank
  'understandingwar.org': 3, 'news.usni.org': 3, 'thedrive.com': 3,
  'csis.org': 3, 'defensenews.com': 3, 'armscontrol.org': 3,
  'crisisgroup.org': 3, 'sipri.org': 3, 'janes.com': 3,
  'carnegieendowment.org': 3, 'brookings.edu': 3, 'atlanticcouncil.org': 3,
  'cfr.org': 3, 'rand.org': 3, 'iiss.org': 3, 'foreignaffairs.com': 3,
  'airforcemag.com': 3, 'maritime-executive.com': 3, 'usni.org': 3,
  // Tier 4 — Quality broadsheets / networks
  'nytimes.com': 4, 'washingtonpost.com': 4, 'bbc.com': 4, 'bbc.co.uk': 4,
  'cnn.com': 4, 'npr.org': 4, 'theguardian.com': 4, 'ft.com': 4,
  'axios.com': 4, 'politico.com': 4, 'economist.com': 4, 'wsj.com': 4,
  'nbcnews.com': 4, 'cbsnews.com': 4, 'abcnews.go.com': 4, 'pbs.org': 4,
  // Tier 5 — Regional / verify framing
  'aljazeera.com': 5, 'iranintl.com': 5, 'alarabiya.net': 5,
  'timesofisrael.com': 5, 'hrana.org': 5, 'middleeasteye.net': 5,
  'i24news.tv': 5, 'presstv.ir': 5, 'tasnimnews.com': 5,
  // Tier 6 — Advocacy / caution
  'jinsa.org': 6, 'meforum.org': 6, 'alma-center.org': 6,
  'wikipedia.org': 6, 'en.wikipedia.org': 6,
};

/**
 * Classify a URL into a source tier (1-6, or 0 for unknown).
 * Walks up subdomain levels so e.g. "www.reuters.com" matches "reuters.com".
 */
function getSourceTier(url) {
  try {
    let hostname = new URL(url).hostname.replace(/^www\./, '');
    while (hostname.includes('.')) {
      if (SOURCE_TIERS[hostname]) return SOURCE_TIERS[hostname];
      hostname = hostname.replace(/^[^.]+\./, '');
    }
  } catch { /* malformed URL */ }
  return 0;
}

/**
 * Annotate each search result with its source tier and apply filtering rules.
 * Returns { dropped: number }
 */
function classifyAndFilterResults(searchResults) {
  let dropped = 0;
  for (const sr of searchResults) {
    if (!sr.results) continue;
    const filtered = [];
    const hasTrustedSource = sr.results.some(r => {
      const t = getSourceTier(r.url || '');
      return t >= 1 && t <= 4;
    });
    for (const r of sr.results) {
      const tier = getSourceTier(r.url || '');
      r._sourceTier = tier;
      if (tier >= 1 && tier <= 4) {
        r._tierTag = '';
        filtered.push(r);
      } else if (tier === 5) {
        r._tierTag = '[Tier 5 — verify framing]';
        filtered.push(r);
      } else if (tier === 6) {
        if (!hasTrustedSource) {
          r._tierTag = '[Tier 6 — requires corroboration]';
          filtered.push(r);
        } else {
          dropped++;
        }
      } else {
        r._tierTag = '';
        filtered.push(r);
      }
    }
    sr.results = filtered;
  }
  return { dropped };
}

module.exports = { SOURCE_TIERS, getSourceTier, classifyAndFilterResults };
