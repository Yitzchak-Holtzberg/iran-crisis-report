'use strict';

// ── Significance assessment (UNUSED — retained for reference) ────────────────
//
// This module is no longer called from ai-update.js. "auto" mode is now a
// direct alias for "routine"; structural updates must be dispatched manually
// via UPDATE_TYPE=structural. The assessSignificance() function below is
// preserved for potential future use but has no callers in the current pipeline.

const SIGNIFICANCE_SYSTEM_PROMPT = `\
You are a news significance classifier for the Iran Crisis Report dashboard.
Evaluate whether the latest web search results contain a MAJOR development that
would require restructuring the page — not just updating numbers/text within
existing sections, but adding new cards, callouts, or fundamentally changing
the analysis structure.

IMPORTANT: You will also receive a summary of EXISTING PAGE CONTENT (the current
ticker headlines and today's timeline items). Only return structural:true if the
major development is NOT already covered by that existing content. If the event
is already represented in the page, a routine zone-level update is sufficient.

ESCALATION RULE: Escalation is structural ONLY when it represents a
fundamentally new TYPE of military engagement — e.g. a major power shifting
from airstrikes to a ground invasion, a new country entering the conflict
militarily for the first time, or first use of a new weapon class (WMD,
nuclear). Escalation that is more of the same (expanding an existing ground
operation, hitting new targets in a theater already under attack, moving from
"planning" to "launching" something already reported on the page) is NOT
structural — routine updates handle intensity changes within existing
engagement types.

Examples of events that ARE structural:
- A BRAND NEW military operation is launched (not continued strikes in an
  ongoing campaign — those are routine)
- A regime change or leadership transition occurs (new leader confirmed, not
  ongoing succession speculation)
- A new scenario emerges that doesn't fit existing categories
- A ceasefire or peace deal is signed
- A nuclear test or confirmed weapons-grade enrichment
- A genuinely new front opens (e.g. ground invasion, new country enters conflict
  for the FIRST TIME — not continued proxy attacks from groups already involved)
- A country moves from diplomatic support / condemnation to active military
  participation (strikes, deployments, or formal coalition entry) for the
  FIRST TIME
- A significant development in a domain NOT currently covered by the dashboard
  (e.g. space/satellite warfare, bioweapons, AI-enabled weapons, attacks on
  global financial systems, a completely new country or actor entering the
  conflict, environmental/infrastructure sabotage, new technology first-use)

Examples of events that are NOT structural (routine updates handle these):
- Updated casualty figures or economic data
- New round of existing diplomatic talks
- Additional carrier or troop deployments within existing posture
- Protest activity continuing at similar scale
- Sanctions additions or removals
- Rhetoric or threats without concrete action
- A country reiterating condemnation or diplomatic support it already expressed
- Continued airstrikes or missile exchanges within an ONGOING campaign/operation
  (e.g. Day N+1 of the same military operation is routine, not structural)
- Escalation within an existing theater (more intense bombing, new targets hit
  within the same country, higher casualty numbers)
- New weapons used within the same campaign (unless it is a nuclear weapon or
  WMD first-use)

Return a JSON object with exactly two keys:
  "structural": true or false
  "reason": one sentence explaining why (max 120 chars)

Be CONSERVATIVE — default to false. Only return true when the news clearly
represents a paradigm shift that the existing page structure cannot adequately
convey with zone-level updates alone, AND the event is not already in the page.`;

/**
 * Ask GPT to assess whether the search results contain a development
 * significant enough to warrant structural page changes.
 */
async function assessSignificance(searchContext, pageContext, { callGPT }) {
  console.log('Assessing news significance (auto mode)…');
  try {
    const userContent = (pageContext ? `EXISTING PAGE CONTENT:\n${pageContext}\n\n` : '') +
      `WEB SEARCH RESULTS:\n${searchContext}`;
    const raw = await callGPT(
      SIGNIFICANCE_SYSTEM_PROMPT,
      userContent,
      true
    );
    const result = JSON.parse(raw);
    if (typeof result.structural !== 'boolean' || typeof result.reason !== 'string') {
      console.warn('Significance assessment returned invalid format — defaulting to routine.');
      return { structural: false, reason: 'invalid response format' };
    }
    result.reason = result.reason.slice(0, 120);
    return result;
  } catch (err) {
    console.warn(`Significance assessment failed (${err.message}) — defaulting to routine.`);
    return { structural: false, reason: `error: ${err.message}` };
  }
}

module.exports = { assessSignificance };
