# Agent Prompt: Editorial Re-foundation of the Iran Crisis Report

You are taking over a live repository and performing an editorial re-foundation of the entire Iran Crisis Report. This is not a routine update, a visual reskin, or an exercise in refreshing a few headlines. Re-research every substantive page and rebuild its editorial content from the evidence up while preserving the working frontend and the user's unfinished design work.

Repository:

`C:\Users\yitzy\Documents\Codex\2026-06-28\p\work\iran-crisis-report`

Before acting, read:

- `CLAUDE.md`
- `README.md`
- `AI-ZONES.md`
- `STRUCTURAL_GUIDELINES.md`
- `research/2026-07-23/00-editorial-method.md`
- `research/2026-07-23/00-fact-register.md`
- `research/2026-07-23/institutional-corpus.md`
- `research/2026-07-23/progress.md`

## Objective

Rebuild the report into a genuinely comprehensive, current, source-disciplined explanation of the whole Iran crisis.

Every deep-dive page must give a reader a clear picture of its subject:

- what the present situation is;
- how it arrived here;
- what is known;
- what remains uncertain or disputed;
- what the important actors want and can do;
- what changed during the conflict;
- which analytical interpretations compete;
- and what developments would materially change the assessment.

“Latest developments” are useful but subordinate. Do not let rolling news consume the page or replace explanation.

## Non-negotiable repository safety

1. Fetch the latest remote state and compare it with the current branch before editing.
2. Inspect `git status` before every major phase.
3. The working tree may contain unfinished, user-approved Atlas and hybrid frontend work. Preserve it. Do not reset, stash, overwrite, delete, or silently re-create those changes.
4. Do not edit generated root HTML pages directly. Edit `sections/`, `data.json`, templates, and the relevant source files, then rebuild.
5. Preserve section IDs, navigation contracts, Nunjucks placeholders, AI-zone markers, responsive behavior, theme behavior, and map behavior unless a narrowly necessary change is documented and tested.
6. Do not replace or delete the existing interface. This task is primarily an editorial re-foundation within the new clean frontend architecture.
7. Keep research notes under a dated `research/YYYY-MM-DD/` directory. Keep research metadata out of the reader-facing interface unless it helps an ordinary reader understand the situation.

## Governing editorial rule: replace synthesis with synthesis

Where the current report contains synthesis, replace it with newly researched synthesis.

Do not turn a coherent analytical section into:

- a list of article excerpts;
- a stack of institutional cards;
- a source-by-source digest;
- a link dump;
- or disconnected factual bullets.

The research process may decompose claims. The reader-facing result must recombine the best-supported evidence and competing interpretations into clear, authored explanation.

The exception is explicitly time-bounded material. A passage that accurately records what was believed, forecast, known, or argued at a specific earlier moment may be retained as historical evidence, but it must:

- have a visible date or “as of” boundary;
- be presented as a past assessment rather than current truth;
- be audited against later evidence;
- and remain only when the evolution of the assessment helps the reader.

Never silently preserve old synthesis because it sounds polished.

## Source order: institutional corpus before page prose

Before rewriting analysis, scenarios, the overview, or any other interpretive page, exhaust the serious institutional corpus.

Start by “devouring” rather than sampling:

- CSIS
- RAND
- IISS
- CTP–ISW
- Carnegie Endowment
- Brookings
- Council on Foreign Relations
- Atlantic Council
- Chatham House
- RUSI
- Washington Institute for Near East Policy
- Middle East Institute
- International Crisis Group
- SIPRI

For each institution:

1. Use its Iran-war hub, Iran topic index, programme page, internal search, relevant author pages, publication feeds, and cited/backlinked work.
2. Capture every materially relevant current publication, not merely the top search results.
3. Record publication date and, when different, the date or phase of the conflict being described.
4. Extract:
   - central thesis;
   - supporting evidence;
   - assumptions;
   - confidence and caveats;
   - policy recommendation;
   - institutional or author perspective;
   - whether the claim is factual, analytical, or predictive;
   - and which report pages it should inform.
5. Track how an institution's assessment changed over time.
6. Audit early forecasts against later events.
7. Record disagreement between institutions as competing propositions to test. Do not flatten disagreement into artificial consensus.
8. If an institution has little or no current relevant work, say so. Do not manufacture equal representation.

Think-tank work is not automatically factual authority. It is most valuable for arguments, models, capability interpretation, scenario logic, and questions to test.

## Then harvest authoritative and specialist evidence by domain

After the broad institutional corpus is indexed, build domain corpora with the best available primary or specialist evidence.

### Military and operations

- U.S. Department of Defense, CENTCOM, NAVCENT, White House, State Department, and congressional material
- Israeli government and military statements, clearly labeled as belligerent claims
- Iranian official, military, state-media, and parliamentary material, clearly labeled as belligerent or state claims
- independent imagery, satellite analysis, geolocation, maritime tracking, and credible specialist reporting
- IISS Military Balance and other durable capability baselines where accessible

### Nuclear

- IAEA reports, Board of Governors material, safeguards statements, and official records
- U.S. intelligence-community assessments where public
- specialist nuclear analysis
- independently supportable facility-damage evidence

Keep separate:

- physical facility damage;
- material location and condition;
- retained personnel and expertise;
- enrichment capacity;
- weaponization intent or decision;
- inspection and verification access;
- and deliverable-weapon capability.

### Maritime, energy, trade, food, and macroeconomics

- IEA, EIA, OPEC, IMF, World Bank, FAO, UNCTAD
- port, vessel, commodity, and trade data
- shipping, insurance, P&I, crew-risk, and maritime-law specialists
- fertilizer, LNG, aviation, logistics, tourism, and supply-chain evidence

Do not reduce “Hormuz open” to a military or vessel-count binary. Treat physical threat, traffic, insurance, legal exposure, crew willingness, commercial normalization, and political settlement separately.

### Iranian society and humanitarian conditions

- UN/OCHA, WHO, UNHCR and other relevant official sources
- HRANA and other human-rights monitors, with methodology and access limits
- internet measurement organizations such as IODA and NetBlocks
- Iranian journalists, scholars, political economists, civil-society sources, diaspora analysts, and multiple political tendencies
- Persian-language sources where useful and verifiable

Do not treat visibility under censorship as evidence of absence. Do not treat opposition advocacy, government claims, or diaspora claims as neutral reporting.

### Regional and political perspectives

- Gulf-based research institutions and local reporting
- Iraqi, Turkish, Lebanese, Yemeni, Pakistani, Indian, Chinese, Russian, European, and North African sources where the subject requires them
- Israeli security research, explicitly labeled by perspective
- Iranian state, reformist, conservative, opposition, monarchist, MEK, ethnic-minority, labor, feminist, student, and civil-society perspectives, explicitly labeled

## Evidence model

Classify every consequential claim before it enters prose.

### Fact

An observable event or condition supported by suitable evidence. Record:

- exact claim;
- event date;
- publication date;
- source;
- source type;
- directness;
- corroboration;
- geographic scope;
- uncertainty;
- and whether the claim is safe to publish.

### Assessment

An interpretation connecting facts. Record:

- whose assessment it is;
- the evidence it relies on;
- assumptions;
- confidence;
- credible alternatives;
- and what evidence would change the judgment.

### Forecast

A statement about what may happen. Record:

- forecast date;
- time horizon;
- conditions;
- indicators;
- disconfirming signals;
- and outcome when the horizon passes.

Never turn an assessment into a fact through confident wording.

## Canonical baseline required before page rewrites

Build and maintain:

1. A canonical timeline with event time, publication time, source, status, and corrections.
2. A fact register for high-risk and cross-page claims.
3. An actor and position register.
4. A terminology guide.
5. An unresolved-claims register.
6. A contradiction inventory for claims that currently differ across pages.
7. An institutional proposition map showing agreement, disagreement, and changed assessments.

High-risk claims include:

- casualties;
- leadership deaths or succession;
- strikes and battle damage;
- military inventories and losses;
- nuclear facilities, material, and capabilities;
- force posture;
- Hormuz traffic and control;
- sanctions and negotiation terms;
- protests, repression, displacement, and internet access;
- economic, food, and energy effects;
- and scenario probabilities.

No high-risk claim should be published merely because it already appears in the repository.

## Page workflow

Do not rewrite all pages at once.

For each page:

1. Inventory every question the page must answer.
2. Inventory every existing claim, chart, statistic, section, and implied judgment.
3. Mark each item:
   - retain as a question or useful structure;
   - verify and rewrite;
   - retain only as explicitly time-bounded historical material;
   - replace;
   - or remove.
4. Complete page-specific research.
5. Add consequential claims to the fact register.
6. Write a fresh page outline.
7. Write new synthesis from the evidence.
8. Give competing interpretations fair, proportionate treatment.
9. Use direct, inline source attribution where it aids comprehension.
10. Keep dense provenance, search logs, and methodology in the research layer or Sources and Method page.
11. Rebuild.
12. Validate.
13. Inspect the page visually at desktop and mobile widths.
14. Check links, menus, anchors, charts, map interactions, overflow, and responsive typography.
15. Conduct a final claim audit against the research notes.

At the end of each page, leave a concise research record containing:

- questions answered;
- claims changed;
- claims removed;
- unresolved uncertainties;
- source coverage;
- and the next review trigger.

## Page order

### 1. Iran Military pilot

Start with `iran-military.html` and its source sections:

- military status;
- losses ledger;
- intended retaliation doctrine;
- observed or executed retaliation;
- Hormuz and maritime coercion.

This pilot must establish the repeatable research, synthesis, citation, and QA method. It must clearly distinguish:

- prewar inventory;
- independently supported losses;
- belligerent claims;
- remaining capability;
- operational capacity;
- reconstitution potential;
- and strategic leverage.

Do not infer inability from non-use or intact capability from an old inventory.

### 2. Remaining deep dives

Proceed only after the pilot is audited:

1. Regional Forces
2. Diplomacy and Nuclear
3. Inside Iran
4. Regional and Global Reactions
5. Opposition
6. Background and Historical Context
7. Expert Analysis
8. Scenarios
9. Sources and Method

### 3. Overview last

Rewrite the home page only after every deep dive has passed its content audit. The overview must be derived from the finished pages rather than researched independently in fragments.

Its purpose is orientation:

- the clearest current picture;
- the few developments that materially changed it;
- the main strategic relationships;
- the most important uncertainties;
- and clear routes into the deep dives.

Do not lead with update-health indicators, search-result counts, evidence-domain counts, internal freshness scores, or methodology dashboards. Those are not useful to the average reader.

## Page-quality standard

Each page should feel like a concise expert briefing, not a feed, database dump, or think-tank scrapbook.

It should have:

- one clear editorial proposition;
- a strong explanatory hierarchy;
- a compact present-situation summary;
- sufficient historical and strategic context;
- visible distinctions between known, disputed, and forecast;
- useful maps, tables, or charts only when they materially improve understanding;
- specific and human-readable section labels;
- and a short latest-development treatment that updates rather than overwhelms the whole picture.

Avoid:

- vague “key takeaway” cards;
- decorative metrics;
- repetitious badges;
- excessive bordered boxes;
- arbitrary percentages;
- generic AI headings;
- compressed telegraphic prose;
- false precision;
- and a “vibe-coded” visual or editorial texture.

Preserve the clean, sharp Atlas design direction. New content must fit the design system rather than accumulating ad hoc components.

## Scenario rules

Do not publish precise scenario probabilities unless there is a defensible method.

For each scenario:

- define the outcome;
- state the horizon;
- state necessary conditions;
- identify leading indicators;
- identify disconfirming indicators;
- describe consequences;
- note dependencies with other scenarios;
- and state the basis for any ranking.

If the evidence supports only ordinal judgments, use terms such as more likely, plausible, or low-probability rather than invented percentages.

## Citation and sourcing rules

1. Prefer direct links to the underlying publication or official record.
2. Never cite a search-results page as evidence.
3. Use the institutional hub only to check coverage.
4. Distinguish event date from article publication date.
5. Distinguish original reporting from aggregation.
6. Label government and belligerent claims.
7. Do not cite an analyst for a primary fact when the primary source is available.
8. Do not cite a primary source as if it proves the source's interpretation.
9. Where responsible sources conflict, explain the conflict and what is or is not knowable.
10. Preserve source diversity, but do not use diversity as a substitute for source quality.

## Stop conditions

Pause a claim or section rather than publishing it when:

- the evidence chain cannot be reconstructed;
- the only support is circular citation;
- the numbers use incompatible definitions;
- a claim depends on inaccessible or undated material;
- a live event is too fluid to synthesize responsibly;
- or the page would imply a confidence level the evidence does not support.

Record the gap and continue with work that can be done safely.

## Verification

At minimum, after every implementation batch:

1. Run `npm run build`.
2. Run the repository validation workflow or equivalent checks.
3. Run `git diff --check`.
4. Inspect generated outputs for unresolved placeholders, malformed markup, broken anchors, and accidental edits to generated-only files.
5. Serve the site locally over HTTP.
6. Visually inspect affected pages at representative desktop and mobile sizes.
7. Test menus, map interactions, links, theme behavior, and responsive layout.
8. Recheck the rendered claims against the fact register.

## Progress discipline

Maintain `research/YYYY-MM-DD/progress.md`.

After each meaningful batch, report:

- institutional corpus coverage completed;
- factual baseline work completed;
- page researched;
- page implemented;
- validation completed;
- unresolved questions;
- and exact files changed.

Do not claim the project is complete because the prose is longer, the build passes, or every page has been touched. Completion means every page has been re-researched, rewritten where necessary, fact-audited, integrated into the full picture, rebuilt, and visually verified.

## First action

Do not begin by editing a reader-facing page.

Resume and complete the institutional corpus in `research/2026-07-23/institutional-corpus.md`, beginning with full CSIS and RAND extraction, then the remaining institutions. Build the canonical timeline and registers. Only after those gates are met should you start the Iran Military pilot.
