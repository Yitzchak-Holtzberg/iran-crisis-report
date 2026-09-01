# Iran Crisis Report

A whole-situation briefing on the 2026 Iran crisis. The site has two generated
front ends:

- the primary Atlas interface, opened from the repository root and generated
  under `atlas/`;
- the previous interface at `classic.html`, with its deep-dive pages preserved
  at their existing root paths.

Both are generated from shared source sections. Do not edit generated page HTML
directly.

## Editorial model

The report is organized around a clear picture of each domain:

- the present assessment;
- supporting evidence;
- uncertainty and disagreement;
- connection to the wider crisis;
- and the indicators that would change the assessment.

Standing synthesis is rewritten through deliberate research and editorial
review. Daily automation does not append headlines to analytical pages.

See:

- `STRUCTURAL_GUIDELINES.md` for the editorial architecture;
- `AI-ZONES.md` for automation boundaries;
- `research/2026-07-23/` for the current re-foundation corpus, baseline, and
  conflict registers;
- `research/2026-07-26/by-the-numbers-register.md` for the reviewed quantitative
  evidence and its caveats.

## Build and validation

```bash
npm install
npm run build
npm run validate
```

`npm run build` generates 23 pages:

- the root Atlas entry page;
- 11 previous-interface pages;
- 11 Atlas pages.

`npm run validate` is cross-platform and checks:

- all generated outputs;
- unresolved template directives;
- build warnings and structural balance;
- Atlas global menus and styles;
- one four-measure evidence desk plus expert interpretation on every Atlas page;
- the five-item limit for Latest Developments;
- direct article/report URLs in the latest feed;
- the scenario-probability prohibition;
- and the structural-automation lock.

## Source architecture

```text
build.js                    page composition and metadata
data.json                   date plus legacy/shared data and the five-item ticker
data/atlas-evidence.json    human-reviewed evidence desks for all Atlas pages
sections/                   human-owned source sections
sections/atlas-evidence-desk.html  shared evidence-desk presentation
sections/last-24h.html      compact automated Latest Developments table
css/                        original and Atlas styling
js/                         map and interface behavior
atlas/                      generated primary Atlas pages
research/                   research corpus, fact registers, and review proposals
scripts/ai-update.js        evidence-gated editorial update pipeline
scripts/validate-build.js   cross-platform build and architecture validator
```

The previous and Atlas pages share the same source content. Atlas-specific
shell, navigation, and page metadata are assembled by `build.js`; `index.html`
opens Atlas and `classic.html` preserves the previous home page.

## Automated update

`.github/workflows/daily-build.yml` runs once daily at 11:05 UTC and can also be
triggered manually.

The routine pipeline uses `gpt-5.6-luna` through the OpenAI Responses API:

1. searches the last seven days, prioritizing the last 72 hours;
2. follows relevant leads with built-in `web_search` (at most ten tool calls);
3. drafts zero to five new developments in a separate JSON response;
4. validates dates, lengths, source tiers, confidence, and URLs against search provenance;
5. merges even one accepted item into the existing feed, keeping at most five rows;
6. refreshes the date, builds, validates and deploys only when public content changes.

Empty or duplicate results preserve the feed and its timestamps. Failed searches,
incomplete responses, and wholly rejected candidate sets fail the run without
publishing. Research responses, source metadata, candidates, rejection reasons,
and no-change manifests are saved in the run's diagnostics artifact (14 days),
not in the public Pages payload. The API exposes consulted sources and tool
output, not every internal search-engine result.

The model is configurable through `OPENAI_ROUTINE_MODEL`. Routine mode needs only
`OPENAI_API_KEY`; the optional structural research path still uses Brave.

### Protected from routine automation

Routine runs cannot modify:

- standing synthesis;
- `data/atlas-evidence.json` and its human-reviewed measurements;
- scenarios;
- historical timelines;
- `build.js`;
- CSS or JavaScript;
- Atlas information architecture;
- map styling, overlays, or interactions;
- page titles, menus, or layout.

The legacy zone updater has an empty allowlist, and the legacy direct structural
writer throws an error if invoked.

### Update modes

| Mode | Behavior |
|---|---|
| `auto` | Alias for the safe routine latest-feed refresh |
| `routine` | Safe routine latest-feed refresh |
| `structural` | Routine refresh plus a review-only research proposal |

`structural` mode never rewrites a page. It first performs a wider institutional
harvest—prioritizing CSIS, RAND, IISS, RUSI, Carnegie, Chatham House,
Brookings, CFR, Atlantic Council, and CTP–ISW—and writes a proposal under
`research/proposals/`.

Run locally:

```bash
set OPENAI_API_KEY=...
node scripts/ai-update.js
```

PowerShell:

```powershell
$env:BRAVE_API_KEY = '...'
$env:OPENAI_API_KEY = '...'
$env:UPDATE_TYPE = 'structural'
node scripts/ai-update.js
```

Validate updater configuration without API keys:

```bash
npm run validate:update
```

### Required GitHub secrets

- `OPENAI_API_KEY`
- `BRAVE_API_KEY` (only for structural review proposals)

The updater verification workflow runs regression tests and build validation on
PRs. After merge, manually run **Updater verification** on an approved branch
for a real routine API pass. The live job uses the existing `github-pages`
environment and respects its branch protections; PR branches cannot access it.
The live check uploads diagnostics and proposed content, never commits or
deploys the test output. Use `npm test` for local regression tests.

## Editing a page

1. Edit the relevant file under `sections/`.
2. Preserve required section IDs used by `build.js`.
3. Preserve balanced `@ai-zone` and legacy `@claim` markers.
4. Update or add direct source links near consequential claims.
5. Run `npm run validate`.
6. Inspect the corresponding root and Atlas outputs.

Do not edit `index.html`, `atlas/index.html`, or other generated pages directly.

## Evidence language

- `struck`, `damaged`, and `destroyed` are not interchangeable.
- A belligerent release establishes that party's claim, not independent effect.
- Inventory, availability, readiness, and operational effect are separate.
- Hormuz status requires date, measure, vessel scope, and treatment of hidden
  traffic.
- The last-known enriched-uranium inventory is not a current accounting.
- Opposition visibility is not representative public opinion.
- Scenarios use mechanisms and indicators, not unsupported percentages.
