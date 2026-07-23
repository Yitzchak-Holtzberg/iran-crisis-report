# Iran Crisis Report

A whole-situation briefing on the 2026 Iran crisis. The site has two generated
front ends:

- the original interface at the repository root;
- the Atlas interface under `atlas/`.

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
  conflict registers.

## Build and validation

```bash
npm install
npm run build
npm run validate
```

`npm run build` generates 22 pages:

- 11 root pages;
- the same 11 pages in `atlas/`.

`npm run validate` is cross-platform and checks:

- all generated outputs;
- unresolved template directives;
- build warnings and structural balance;
- Atlas global menus and styles;
- the five-item limit for Latest Developments;
- direct article/report URLs in the latest feed;
- the scenario-probability prohibition;
- and the structural-automation lock.

## Source architecture

```text
build.js                    page composition and metadata
data.json                   date plus legacy/shared data and the five-item ticker
sections/                   human-owned source sections
sections/last-24h.html      compact automated Latest Developments table
css/                        original and Atlas styling
js/                         map and interface behavior
atlas/                      generated Atlas pages
research/                   research corpus, fact registers, and review proposals
scripts/ai-update.js        evidence-gated editorial update pipeline
scripts/validate-build.js   cross-platform build and architecture validator
```

Root and Atlas pages share the same source content. Atlas-specific shell,
navigation, and page metadata are assembled by `build.js`.

## Automated update

`.github/workflows/daily-build.yml` runs once daily at 11:05 UTC and can also be
triggered manually.

The routine pipeline:

1. updates the date;
2. searches current primary, wire, institutional, and specialist sources;
3. asks the model for a complete feed of three to five material developments;
4. rejects homepage URLs, unsupported confidence, low-tier anchors, duplicates,
   missing dates, and oversized copy;
5. updates only `data.json:ticker` and `sections/last-24h.html`;
6. builds and validates all 22 pages;
7. commits expected data and generated outputs;
8. deploys to GitHub Pages.

If fewer than three developments pass the gate, the existing feed is preserved.

### Protected from routine automation

Routine runs cannot modify:

- standing synthesis;
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
set BRAVE_API_KEY=...
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

- `BRAVE_API_KEY`
- `OPENAI_API_KEY`

The workflow keeps the editorial update step non-blocking so a search or model
failure cannot prevent a clean date refresh and rebuild.

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
