'use strict';

// ── Provenance Tracking ─────────────────────────────────────────────────────
// Prevents AI self-reinforcement hallucination by tracking claim origin,
// confidence level, and evidence. Claims are marked with HTML comments:
//
//   <!-- @claim:id confidence=LEVEL origin=ORIGIN date=YYYY-MM-DD evidence=REFS -->
//   content
//   <!-- @/claim:id -->
//
// Confidence levels (strictly ordered, max one-level promotion per AI pass):
//   speculative → reported-unconfirmed → confirmed → human-verified

const { getSourceTier } = require('./source-tiers');

const CONFIDENCE_LEVELS = ['speculative', 'reported-unconfirmed', 'confirmed', 'human-verified'];

const CLAIM_RE = /<!-- @claim:([\w-]+) confidence=(speculative|reported-unconfirmed|confirmed|human-verified) origin=([\w.:\/-]+) date=(\d{4}-\d{2}-\d{2}) evidence=([\w.,\/:+-]+|none) -->([\s\S]*?)<!-- @\/claim:\1 -->/g;

const CLAIM_OPEN_RE = /<!-- @claim:[\w-]+ /g;
const CLAIM_CLOSE_RE = /<!-- @\/claim:[\w-]+ -->/g;

/**
 * Parse all @claim markers from HTML content.
 * @param {string} html
 * @returns {Array<{id,confidence,origin,date,evidence,content,outer}>}
 */
function parseClaims(html) {
  const claims = [];
  let m;
  const re = new RegExp(CLAIM_RE.source, CLAIM_RE.flags);
  while ((m = re.exec(html)) !== null) {
    claims.push({
      id: m[1],
      confidence: m[2],
      origin: m[3],
      date: m[4],
      evidence: m[5],
      content: m[6],
      outer: m[0],
    });
  }
  return claims;
}

/**
 * Validate that a confidence promotion follows the rules:
 * - Max one level per pass
 * - reported-unconfirmed requires evidence
 * - confirmed requires Tier 1-3 evidence
 * - human-verified cannot be set by AI
 * @param {object} oldClaim - previous claim state
 * @param {object} newClaim - proposed new claim state
 * @returns {{valid:boolean, reason?:string}}
 */
function validatePromotion(oldClaim, newClaim) {
  const oldIdx = CONFIDENCE_LEVELS.indexOf(oldClaim.confidence);
  const newIdx = CONFIDENCE_LEVELS.indexOf(newClaim.confidence);

  // human-verified is immutable by AI
  if (oldClaim.confidence === 'human-verified' && newClaim.confidence !== 'human-verified') {
    return { valid: false, reason: 'cannot downgrade human-verified claim' };
  }
  if (newClaim.confidence === 'human-verified' && newClaim.origin !== 'human') {
    return { valid: false, reason: 'only humans can set human-verified' };
  }

  // Max one level promotion per pass
  if (newIdx - oldIdx > 1) {
    return { valid: false, reason: `jumped ${newIdx - oldIdx} levels (${oldClaim.confidence} → ${newClaim.confidence}); max 1 per pass` };
  }

  // Evidence required for promotion to reported-unconfirmed
  if (newIdx > oldIdx && newClaim.confidence === 'reported-unconfirmed') {
    if (newClaim.evidence === 'none') {
      return { valid: false, reason: 'promotion to reported-unconfirmed requires evidence' };
    }
  }

  // Tier 1-3 evidence required for promotion to confirmed
  if (newIdx > oldIdx && newClaim.confidence === 'confirmed') {
    if (newClaim.evidence === 'none') {
      return { valid: false, reason: 'promotion to confirmed requires evidence' };
    }
    const domains = newClaim.evidence.split(',').map(e => e.split('/')[0]);
    const hasHighTier = domains.some(d => {
      const tier = getSourceTier('https://' + d);
      return tier >= 1 && tier <= 3;
    });
    if (!hasHighTier) {
      return { valid: false, reason: `promotion to confirmed requires Tier 1-3 evidence (has: ${newClaim.evidence})` };
    }
  }

  return { valid: true };
}

/**
 * Check that all human-verified claims in oldHtml are preserved exactly in newHtml.
 * @param {string} oldHtml
 * @param {string} newHtml
 * @returns {{valid:boolean, violations:string[]}}
 */
function enforceHumanVerified(oldHtml, newHtml) {
  const oldClaims = parseClaims(oldHtml).filter(c => c.confidence === 'human-verified');
  const violations = [];

  for (const claim of oldClaims) {
    if (!newHtml.includes(claim.outer)) {
      // Check if the claim exists but was modified
      const newClaims = parseClaims(newHtml);
      const match = newClaims.find(c => c.id === claim.id);
      if (!match) {
        violations.push(`human-verified claim "${claim.id}" was removed`);
      } else if (match.content.trim() !== claim.content.trim()) {
        violations.push(`human-verified claim "${claim.id}" content was modified`);
      } else if (match.confidence !== 'human-verified') {
        violations.push(`human-verified claim "${claim.id}" was downgraded to ${match.confidence}`);
      }
    }
  }

  return { valid: violations.length === 0, violations };
}

/**
 * Check that @claim open/close markers are balanced.
 * @param {string} html
 * @param {string} filename
 * @returns {string[]} warnings
 */
function validateClaimBalance(html, filename) {
  const warnings = [];
  const opens = (html.match(CLAIM_OPEN_RE) || []).length;
  const closes = (html.match(CLAIM_CLOSE_RE) || []).length;
  if (opens !== closes) {
    warnings.push(`${filename}: Unbalanced @claim markers (${opens} opening vs ${closes} closing)`);
  }
  return warnings;
}

/**
 * Validate that evidence domains in a claim exist in the search results.
 * @param {object} claim - parsed claim
 * @param {Set<string>} searchDomains - domains found in current search batch
 * @returns {{valid:boolean, missingDomains:string[]}}
 */
function validateEvidence(claim, searchDomains) {
  if (claim.evidence === 'none') return { valid: true, missingDomains: [] };
  const domains = claim.evidence.split(',').map(e => e.split('/')[0]);
  const missing = domains.filter(d => !searchDomains.has(d));
  return { valid: missing.length === 0, missingDomains: missing };
}

/**
 * Extract all unique domains from Tavily search results.
 * @param {Array} searchResults - array of Tavily search result objects
 * @returns {Set<string>}
 */
function extractSearchDomains(searchResults) {
  const domains = new Set();
  for (const sr of searchResults) {
    for (const r of (sr.results || [])) {
      try {
        const domain = new URL(r.url).hostname.replace(/^www\./, '');
        domains.add(domain);
      } catch { /* skip malformed URLs */ }
    }
  }
  return domains;
}

/**
 * Build-time validation of provenance markers in a section file.
 * @param {string} content - file content
 * @param {string} filename - for warning messages
 * @returns {string[]} warnings
 */
function validateProvenanceBuild(content, filename) {
  const warnings = [];

  // 1. Balanced markers
  warnings.push(...validateClaimBalance(content, filename));

  const claims = parseClaims(content);

  for (const claim of claims) {
    // 2. Confirmed claims must have evidence
    if (claim.confidence === 'confirmed' && claim.evidence === 'none') {
      warnings.push(`${filename}: claim "${claim.id}" is confirmed but has no evidence`);
    }

    // 3. Confirmed claims should have Tier 1-3 evidence
    if (claim.confidence === 'confirmed' && claim.evidence !== 'none') {
      const domains = claim.evidence.split(',').map(e => e.split('/')[0]);
      const hasHighTier = domains.some(d => {
        const tier = getSourceTier('https://' + d);
        return tier >= 1 && tier <= 3;
      });
      if (!hasHighTier) {
        warnings.push(`${filename}: claim "${claim.id}" is confirmed but has no Tier 1-3 evidence (${claim.evidence})`);
      }
    }

    // 4. Stale speculative claims (>7 days)
    if (claim.confidence === 'speculative') {
      const ageDays = (Date.now() - new Date(claim.date).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > 7) {
        warnings.push(`${filename}: speculative claim "${claim.id}" is ${Math.floor(ageDays)} days old — consider removing`);
      }
    }
  }

  return warnings;
}

module.exports = {
  CONFIDENCE_LEVELS,
  CLAIM_RE,
  parseClaims,
  validatePromotion,
  enforceHumanVerified,
  validateClaimBalance,
  validateEvidence,
  extractSearchDomains,
  validateProvenanceBuild,
};
