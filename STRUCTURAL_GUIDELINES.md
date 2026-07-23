# Editorial Architecture

Updated: 2026-07-23

## Product model

The Iran Crisis Report is a whole-situation briefing, not a live-operations
dashboard. Every page must give a reader a coherent picture of one domain:

1. the present assessment;
2. the evidence that supports it;
3. the strongest uncertainty or disagreement;
4. why the domain matters to the wider crisis;
5. the observable events that would change the assessment.

The Atlas front end, navigation, map presentation, page composition, and visual
system are human-owned product architecture.

## Fresh synthesis

Standing synthesis is replaced through deliberate editorial review. It is not
extended by appending daily headlines.

- Re-read the source corpus before changing a page-level judgment.
- Retain earlier analysis only when it is explicitly time-bounded and useful for
  showing how an assessment changed.
- Separate observable fact, belligerent claim, institutional assessment,
  forecast, and policy preference.
- Organize analysis around contested propositions, not institution-by-institution
  cards.
- Preserve disagreement when credible sources reach different conclusions.

## Scheduled routine updates

Routine automation may modify only:

- `data.json:ticker` — at most five plain-language material developments;
- `sections/last-24h.html` — the same developments rendered as a compact table;
- `data/update-manifest.json`.

Routine automation may not modify:

- standing synthesis in `sections/`;
- `build.js`;
- `css/`, `js/`, or `atlas/` source architecture;
- map styling, overlays, interactions, or marker code;
- page titles, navigation, or information architecture;
- scenario judgments or probabilities;
- historical timelines;
- source methodology.

If the evidence does not support at least three material items, the existing
latest feed remains in place.

## Structural review mode

`UPDATE_TYPE=structural` is review-only. It performs wider institutional
research and writes a proposal to `research/proposals/`.

The proposal may identify:

- a factual correction;
- an assessment that should be reopened;
- a chronology change;
- a new research question;
- or map data that a human should review.

It must never contain replacement HTML, CSS, JavaScript, or direct page writes.

Before proposing a structural change, prioritize current work from CSIS, RAND,
IISS, RUSI, Carnegie, Chatham House, Brookings, CFR, Atlantic Council, and
CTP–ISW, then reconcile it with primary and independent evidence.

## Latest-development gate

A latest item must:

- materially change the military, maritime, nuclear, diplomatic, internal,
  regional, humanitarian, or economic picture;
- use a direct article, report, advisory, or PDF URL copied from search results;
- include event and publication dates;
- distinguish confirmed fact from an attributed or provisional report;
- explain why the change matters to the whole situation;
- remain short enough for the compact homepage slot.

Exclude:

- routine strike-night counts;
- generic rhetoric;
- military publicity without a new operational event;
- ordinary force-presence updates;
- small revisions to already-known totals;
- unsupported exact inventories;
- undated Hormuz percentages;
- and process-facing copy about search counts, evidence domains, freshness, or
  update health.

## Evidence rules

- Tier 1: IAEA, UN/OCHA/WHO, IEA, EIA, UKMTO/JMIC, and relevant official
  releases. Official belligerent statements establish what that belligerent
  says it did, not independent effect.
- Tier 2: Reuters, AP, AFP.
- Tier 3: specialist and research institutions with relevant expertise.
- Tier 4: major independent news organizations.
- Tier 5–6: leads, perspectives, or advocacy; never the sole anchor for the
  public latest feed.

Use `struck`, `damaged`, and `destroyed` precisely. Separate inventory,
availability, operational readiness, and effect. Date all volatile figures.

## Scenarios

Scenarios are conditional pathways with mechanisms, indicators, and failure
conditions. Do not assign precise probabilities unless a transparent,
defensible model exists. Current scenario labels are ordinal and editorial.

## Map

The map is a navigation and explanation surface. Automation does not rewrite
its design or implementation. A structural proposal may flag a marker or
location for human review, with direct evidence and a statement of what changed.

## Acceptance

Every deployment must pass `npm run validate`, which checks:

- all 11 original and 11 Atlas pages;
- unresolved templates and build warnings;
- Atlas menus and styles;
- the compact latest-feed limit;
- direct latest-feed URLs;
- the absence of scenario percentages;
- and the direct-structural-mutation lock.
