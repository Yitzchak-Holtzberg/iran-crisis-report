# Iran Crisis Report — AI Agent Update Guide

This is a single-page HTML news dashboard that is **assembled by a build script** from modular section files. `index.html` is a generated file — **never edit it directly**. All content lives in the `sections/` directory; run the build to regenerate the page.

**For the most frequently changed data** (date, statistics, ticker headlines) edit only `data.json` — no HTML required. See `data.schema.json` for the complete schema and validation rules.

---

## Automated daily build

A GitHub Actions workflow (`.github/workflows/daily-build.yml`) runs every day at **00:05 UTC** and performs a full automated update:

1. Updates `data.json → date` and `lastUpdated` to the current UTC date/time via `scripts/update-date.js`.
2. **Searches the web** for the latest Iran news using the [Tavily](https://tavily.com) API (5 targeted queries).
3. **Calls GPT-4o-mini** (OpenAI) to update `data.json` — new ticker headlines, refreshed statistics, and adjusted scenario percentages — based on the search results.
4. **Calls GPT-4o-mini** again to generate new `.tl-item` entries for today's timeline in `sections/last-24h.html`.
5. Runs `npm run build` to regenerate `index.html`.
6. Commits updated `data.json`, `sections/last-24h.html`, and `index.html` back to the branch.
7. Deploys the site to **GitHub Pages**.

You can also trigger it manually at any time from the **Actions** tab → **Daily Build & Deploy** → **Run workflow**.

### Breaking-news webhook

For an **immediate** rebuild whenever serious breaking news warrants it, send a `repository_dispatch` event to the GitHub API.  This triggers the same full pipeline (AI content update → build → deploy) right away, without waiting for the next scheduled run.

```bash
curl -X POST \
  -H "Authorization: Bearer <YOUR_GITHUB_PAT>" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/Yitzchak-Holtzberg/iran-crisis-report/dispatches \
  -d '{"event_type":"breaking-news","client_payload":{"headline":"Optional short description of the event"}}'
```

`<YOUR_GITHUB_PAT>` must be a [fine-grained personal access token](https://github.com/settings/tokens?type=beta) (or a classic PAT with the `repo` scope) that has **Contents: Read and write** permission on this repository.  Keep it secret — treat it like a password.

The `client_payload.headline` field is optional and purely informational; it is not used by the workflow but shows up in the Actions run log for traceability.

### Required GitHub Actions secrets

Add these two secrets to the repository (**Settings → Secrets and variables → Actions → New repository secret**):

| Secret name | Where to get it | Cost |
|---|---|---|
| `TAVILY_API_KEY` | [tavily.com](https://tavily.com) — free tier includes 1,000 searches/month | ~$0.01/search after free tier |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) | GPT-4o-mini: $0.15/$0.60 per 1M tokens — ≈ $0.01–$0.02 per daily run |

> **Graceful degradation:** the AI content update step runs with `continue-on-error: true` in the workflow, so if either secret is missing, a quota is exceeded, or a network error occurs, the step exits and the rest of the workflow still completes — falling back to a date-only update and a clean rebuild.

---

## Repository layout

```
iran-crisis-report/
├── .github/
│   └── workflows/
│       └── daily-build.yml  # Scheduled daily build & GitHub Pages deploy
├── build.js            # Build script — assembles index.html from sections/
├── data.json           # ★ EDIT THIS FIRST — date, stats, ticker headlines
├── index.html          # GENERATED — do not edit manually
├── package.json        # npm scripts (build only)
├── scripts/
│   ├── update-date.js  # Updates date/lastUpdated in data.json to today UTC
│   └── ai-update.js    # Fetches news (Tavily) + updates data.json & last-24h.html (GPT-4o-mini)
├── sections/           # Content source files — edit these
│   ├── head.html       # <head>, CSS links, meta tags
│   ├── masthead.html   # Page title, dateline, last-updated timestamp
│   ├── ticker.html     # Breaking-news scrolling ticker
│   ├── sidebar.html    # Left navigation sidebar
│   ├── stats.html      # Key statistics grid (top of page)
│   ├── last-24h.html   # Timeline of recent events
│   ├── theater.html    # Theater map section
│   ├── air-power.html  # Air power section
│   ├── naval.html      # Naval forces section
│   ├── inside-iran.html
│   ├── opposition.html
│   ├── nuclear.html    # Nuclear talks section
│   ├── hormuz.html     # Strait of Hormuz section
│   ├── military.html   # Iran military section
│   ├── scenarios.html  # Scenarios section
│   ├── sources.html    # Footer with source links
│   ├── scripts.html    # Closing <script> tags
│   └── charts/         # Inline SVG chart partials
│       ├── rial-collapse.html
│       ├── air-power-bar.html
│       ├── nuclear-reconstruction-bar.html
│       ├── retaliation-sequence-bar.html
│       ├── scenario-likelihood-bar.html
│       └── threat-matrix.html
├── css/                # Stylesheets (edit for visual changes)
│   ├── variables.css
│   ├── base.css
│   ├── components.css
│   ├── sidebar.css
│   └── responsive.css
└── js/                 # JavaScript (map, sidebar, theme toggle)
    ├── map.js
    ├── sidebar.js
    └── theme.js
```

---

## Build system

`build.js` reads every file listed in its `SECTIONS` array in order, concatenates them, and writes the result to `index.html`.

Inside any section file, three directives are processed:

```html
<!-- @include sections/charts/rial-collapse.html -->
```
Replaced with the contents of the referenced file (paths relative to the repository root).

```html
<!-- @ticker -->
```
Replaced with `<span>` elements for every headline in `data.json → ticker`, automatically **doubled** so the CSS scroll loop works seamlessly. You no longer need to keep two copies in sync.

```html
{{key}}
```
Replaced with the matching string value from `data.json` (e.g. `{{date}}`, `{{statConfirmedDead}}`).

### Run the build

```bash
npm run build
# or equivalently:
node build.js
```

Always run the build after editing any file in `sections/` **or** `data.json`. The generated `index.html` is what gets served.

---

## data.json — quick-update config

`data.json` is the single file to edit for the most common daily tasks. No HTML knowledge required.

```json
{
  "date": "February 26, 2026",
  "lastUpdated": "13:00 UTC",

  "statConfirmedDead": "7,015+",
  "statConfirmedDeadSource": "HRANA",
  "statTotalKilled": "36,500",
  "statTotalKilledSource": "Iran Intl.",
  "statDetained": "24,669",
  "statUsAircraft": "150+",
  "statUsShips": "25+",
  "statRialRate": "1.65M",

  "scenarioDealPct": "15",
  "scenarioStrikesPct": "55",
  "scenarioRevolutionPct": "20",
  "scenarioFrozenPct": "10",

  "ticker": [
    "HEADLINE ONE",
    "HEADLINE TWO"
  ]
}
```

| Key | Where it appears | Update frequency |
|---|---|---|
| `date` | Masthead dateline, sources footer, scenario chart heading | Every update pass |
| `lastUpdated` | Masthead dateline | Every update pass |
| `statConfirmedDead` / `statConfirmedDeadSource` | Stats grid | When HRANA publishes new figures |
| `statTotalKilled` / `statTotalKilledSource` | Stats grid | When Iran Intl. updates |
| `statDetained` | Stats grid | When HRANA/Amnesty update |
| `statUsAircraft` | Stats grid | After Pentagon briefings |
| `statUsShips` | Stats grid | After USNI Fleet Tracker updates |
| `statRialRate` | Stats grid | When Bonbast.com rate changes |
| `scenarioDealPct` | Scenario 1 badge + bar chart | After major diplomatic development |
| `scenarioStrikesPct` | Scenario 2 badge + bar chart | After major military development |
| `scenarioRevolutionPct` | Scenario 3 badge + bar chart | After major protest/IRGC development |
| `scenarioFrozenPct` | Scenario 4 badge + bar chart | After major diplomatic development |
| `ticker` | Scrolling headline bar | Every update pass |

> **Note:** `dayToday`, `dayYesterday`, and `dayTwoDaysAgo` are **automatically computed** by the build script from the `date` field — they appear as the day-group labels in the "Last 24 Hours" timeline. You never need to update them manually.

---

## Section-by-section update reference

Each section below lists what it contains and what an agent should check before updating it.

### `sections/masthead.html` — Page header
**Contains:** Page title, dateline (date), last-updated UTC timestamp.  
**Update via `data.json`:** `date` and `lastUpdated` keys — no HTML editing required.

---

### `sections/ticker.html` — Breaking-news ticker
**Contains:** A `<!-- @ticker -->` directive; actual headlines come from the `ticker` array in `data.json`.  
**Update via `data.json`:** Edit the `ticker` array. The build script auto-duplicates the list for the CSS scroll loop.  
**Check before updating:**
- All other sections for newly added events; pull the most newsworthy items into the ticker.
- Remove stale headlines that are no longer "breaking."

---

### `sections/sidebar.html` — Navigation
**Contains:** Left-panel anchor links to every section with sequential numbering.  
**Check before updating:**
- Only edit if a section is added, removed, or renamed. The `id` in the section file must match the `href` fragment here.

---

### `sections/stats.html` — Key statistics grid
**Contains:** Six headline numbers (confirmed dead, estimated total killed, detained, US aircraft, US ships, rial/USD rate).  
**Check before updating:**
- **Casualties / detained:** HRANA (hrana.org), Iran International, Amnesty International, UN Human Rights.
- **US aircraft / ships:** USNI Fleet Tracker, Pentagon / CENTCOM press releases, The War Zone, Stars & Stripes.
- **Rial / USD exchange rate:** Google Finance "IRRUSD", Bonbast.com (unofficial free-market rate), financial news wires.

---

### `sections/last-24h.html` — Last 24 hours timeline
**Contains:** Day-by-day timeline entries for the most recent two days of significant events.  
**Check before updating:**
- **Diplomatic:** Reuters, Al Jazeera, NBC News, AP for talks, statements, deadlines.
- **Military / naval:** USNI, The War Zone, Stars & Stripes for ship movements and deployments.
- **Protests / inside Iran:** Iran International, BBC Persian, HRANA for protest activity and crackdowns.
- **US politics:** White House / State Dept releases, major US outlets for presidential statements. **Also check Politico and CBS News national-security desk** — these break inside-source White House strategy stories (e.g. preferred strike sequencing, backchannel ultimatums) that do not appear in official releases.
- **Intelligence / cyber:** CNBC, Axios, national-security beat reporters.
- **Inside-source / political-strategy exclusives** *(most likely to be missed)*: **Politico** (White House deliberations, polling-driven military strategy), **CBS News** (Pentagon/NSC sourcing, Trump–Netanyahu backchannel), **Axios** (Witkoff/Kushner readouts, deal-term leaks). These outlets publish stories that have no official press-release equivalent; they require active monitoring of the reporters' own feeds (X/Twitter) in addition to the publication front pages.
- Prepend new events at the **top** of the relevant day block; shift the previous day's block to "YESTERDAY" and drop any block older than two days.

---

### `sections/theater.html` — Theater of operations map
**Contains:** A Leaflet.js interactive map; marker positions and popup text are defined in `js/map.js`.  
**Check before updating:**
- Carrier and ship positions: USNI Fleet Tracker (news.usni.org), The War Zone.
- Air base status: open-source military-tracking accounts, Pentagon statements.
- If marker data changes, edit `js/map.js` rather than this file (this file only holds the map container HTML).

---

### `sections/air-power.html` — Air power section
**Contains:** Aircraft profile cards for key US platforms; bar chart via `<!-- @include sections/charts/air-power-bar.html -->`.  
**Check before updating:**
- Total aircraft count and base breakdown: The War Zone, CSIS, Pentagon briefings, Washington Post national-security desk.
- If a new aircraft type is deployed or a platform is withdrawn, add/remove a card.
- Update the bar chart file if aircraft numbers change significantly.

---

### `sections/naval.html` — Naval strike power
**Contains:** Carrier strike group cards (position, range data, air wing); escort ship list; coalition / regional posture table.  
**Check before updating:**
- Carrier positions: USNI Fleet Tracker, The War Zone, Stars & Stripes.
- Ship count and new arrivals / departures: USNI, NAVCENT, open-source maritime tracking (MarineTraffic).
- Coalition posture (UK, Israel, Saudi, Jordan, Turkey, China): Reuters, Al Jazeera, CNN, national defense ministries.
- Update the distance/transit fields in the SVG carrier diagrams if a carrier's position changes significantly.

---

### `sections/inside-iran.html` — Inside Iran: seven crises
**Contains:** Deep-dive cards on (1) The January Massacre, (2) Student Uprising, (3) Economic Collapse/rial chart, (4) Internet blackout/CIA operation, (5) Ethnic minority crackdown, (6) Water crisis, (7) Proxy network collapse; plus IRGC power struggle.  
**Check before updating:**
- **Casualty figures (Crisis 1):** HRANA, Iran International, Amnesty International, UN OHCHR.
- **Student protests (Crisis 2):** Iran International, BBC Persian, Reuters; check for new university locations, new protest dates, government statements.
- **Economic data (Crisis 3):** Rial rate via Bonbast.com; oil export data from Vortexa, Kpler, or energy-beat reporters; US Treasury sanctions announcements.
- **Internet / cyber (Crisis 4):** NetBlocks, Freedom House, Georgia Tech Internet Outage Detection and Analysis (IODA), CNBC, US News; CIA and ODNI public statements.
- **Ethnic crackdowns (Crisis 5):** HRANA, Amnesty, Kurdistan Human Rights Network, Baloch Activists Campaign.
- **Water crisis (Crisis 6):** Iran environmental NGOs, UN FAO, academic hydrology papers — this section changes slowly; update only if major new data emerges.
- **Proxy network (Crisis 7):** Reuters, Al Jazeera, Times of Israel, USNI for Hezbollah, Houthi, and PMF developments.
- **IRGC power struggle:** National Interest, Alma Center, RAND, Israeli intelligence assessments.

---

### `sections/opposition.html` — Opposition & Reza Pahlavi
**Contains:** Pahlavi biography, key events timeline, opposition landscape overview.  
**Check before updating:**
- Pahlavi public statements: his official social media (X / Instagram), Washington Post, Axios.
- US government contacts: Axios and Politico (Steve Witkoff, Jared Kushner meetings and readouts), White House readouts.
- Opposition group statements: NCRI/MEK releases, Congress of Nationalities press releases, diaspora Persian-language media (Iran International TV, Manoto).

---

### `sections/nuclear.html` — Nuclear negotiations
**Contains:** Talks timeline (Muscat → Geneva rounds); deal-terms comparison table; UK-US rift card; Israeli position card; bar chart via `<!-- @include sections/charts/nuclear-reconstruction-bar.html -->`.  
**Check before updating:**
- **Talks outcomes:** Reuters, NBC, Al Jazeera, Axios for post-round readouts from Witkoff, Kushner, and Araghchi.
- **Iranian statements:** Iran Foreign Ministry (@IRIForeignMin), Iran International, IRNA (official).
- **IAEA reports:** iaea.org for quarterly safeguards reports; The Wire (IAEA watch publication).
- **Nuclear site status / satellite imagery:** The War Zone, 38 North, Planet Labs analysis, Alma Center.
- Update the reconstruction bar chart if enrichment or centrifuge estimates change.

---

### `sections/hormuz.html` — Strait of Hormuz
**Contains:** Oil throughput data, Iranian capabilities list, price data, blockade scenario analysis.  
**Check before updating:**
- **Oil prices / throughput:** US EIA weekly reports (eia.gov), Bloomberg Energy, Reuters commodities.
- **Iranian naval drills:** IRGC Navy statements, USNI, The War Zone.
- **Goldman Sachs / analyst price forecasts:** Bloomberg, FT energy desk.
- **Tanker incidents:** Lloyd's List, MarineTraffic, USNI, UK Maritime Trade Operations (UKMTO).

---

### `sections/military.html` — Iran's remaining military capability
**Contains:** Degraded vs. still-operational capability lists; nuclear hardening update (Parchin); retaliation sequence bar chart via `<!-- @include sections/charts/retaliation-sequence-bar.html -->`; threat matrix via `<!-- @include sections/charts/threat-matrix.html -->`.  
**Check before updating:**
- **Satellite imagery (Parchin, Natanz, Fordow):** The War Zone, 38 North, Planet Labs, Maxar Technologies public releases.
- **Missile inventory / drone production:** IISS Military Balance, Alma Center, Belfer Center, US DIA / DNI unclassified assessments.
- **Chinese military assistance:** Reuters, WSJ, Bloomberg; Treasury sanctions list additions.
- **IRGC Navy:** USNI, US 5th Fleet statements.

---

### `sections/scenarios.html` — Four scenarios
**Contains:** Likelihood percentages and analysis for four outcomes: (1) Deal, (2) Strikes, (3) Revolution, (4) Frozen conflict.  
**Update via `data.json`:** Change `scenarioDealPct`, `scenarioStrikesPct`, `scenarioRevolutionPct`, `scenarioFrozenPct` — the badges in this file and the bar chart are both updated automatically.  
**Check before updating:**
- Scenario likelihoods should be reassessed after every major event (talks breakdown, military movement, regime concession).
- **Sources to consult:** CSIS, MEF, Brookings, Belfer Center, National Interest, Alma Center assessments; polling by IranWire; prediction markets (Polymarket).
- **Also check:** Politico and CBS News for inside-source White House deliberations about strike timing, sequencing preferences (e.g. Israel-first vs. joint strike), and domestic-political calculus — these directly affect the likelihood estimates for Scenarios 2 and 4.

---

### `sections/sources.html` — Source footer
**Contains:** Two-column grid of source hyperlinks; compiled-date line.  
**Check before updating:**
- Add a link for every new claim added to any section in the same update pass.
- The compiled-date line updates automatically from `data.json → date`; no manual edit needed.

---

## How to update common content

### 1. Dateline and "last updated" timestamp

Edit **`data.json`** — no HTML required:

```json
"date": "February 26, 2026",
"lastUpdated": "13:00 UTC",
```

### 2. Breaking-news ticker

Edit the `"ticker"` array in **`data.json`**. Each string becomes one `<span>` in the ticker bar. The build script automatically duplicates the list for the CSS scroll loop — **no manual duplication needed**.

```json
"ticker": [
  "BREAKING: Your new headline here",
  "EXISTING HEADLINE TWO",
  "..."
]
```

Prepend new items at the **top** of the array so they appear first. Remove stale items that are no longer breaking.

### 3. Key statistics

Edit the matching keys in **`data.json`** — no HTML required:

```json
"statConfirmedDead": "7,015+",
"statConfirmedDeadSource": "HRANA",
"statTotalKilled": "36,500",
"statTotalKilledSource": "Iran Intl.",
"statDetained": "24,669",
"statUsAircraft": "150+",
"statUsShips": "25+",
"statRialRate": "1.65M",
```

### 4. Last 24 hours timeline — `sections/last-24h.html`

Timeline items follow this pattern. Add new `.tl-item` blocks at the top of the relevant day group, and push old days down or remove them as needed:

```html
<div class="tl-item">
  <div class="tl-dot" style="border-color:var(--accent-red);"></div>
  <div class="date">EVENT CATEGORY</div>
  <div class="content">Description with <strong>bold highlights</strong>.</div>
</div>
```

Severity-color convention:

| CSS variable | Color | Use for |
|---|---|---|
| `--accent-red` | Red | Critical / combat events |
| `--accent-orange` | Orange | High-threat / military moves |
| `--accent-gold` | Gold | Diplomacy / negotiations |
| `--accent-blue` | Blue | US naval / air assets |
| `--accent-cyan` | Cyan | Intelligence / cyber |
| `--accent-green` | Green | Economic indicators |
| `--text-muted` | Grey | Background / low-priority |

### 5. Charts — `sections/charts/*.html`

Charts are inline SVGs. Update data values (coordinates, labels, text) directly in the relevant `sections/charts/` file. They are included into section files via `<!-- @include … -->` directives.

**Exception — scenario likelihood chart:** `sections/charts/scenario-likelihood-bar.html` uses `{{scenarioDealPct}}`, `{{scenarioStrikesPct}}`, `{{scenarioRevolutionPct}}`, and `{{scenarioFrozenPct}}` placeholders. Update those keys in `data.json` instead of editing the chart file.

### 6. Source links — `sections/sources.html`

Add `<a href="…">Description</a>` entries inside the two-column grid div in the footer. The compiled-date line updates automatically from `data.json → date`.

---

## Build validation

The build script runs several validation checks to ensure quality:

### Placeholder Validation
If you add a `{{key}}` placeholder to any section file but forget to add the corresponding entry to `data.json`, the build script will print a warning:

```
Warning: unresolved placeholders in output — check data.json for: myNewKey
```

The build will still succeed, but the raw placeholder text (`{{myNewKey}}`) will appear in the page. Resolve the warning before committing.

### Structural Validation
The build also validates:

- **Navigation integrity**: All sidebar links point to existing section IDs
- **AI zone balance**: All `<!-- @ai-zone:id -->` markers are properly closed with `<!-- @/ai-zone:id -->`
- **File size**: Warns if section files exceed 200 lines (consider splitting)
- **Duplicate IDs**: Detects duplicate section IDs that would break navigation

Example validation output:
```
Build Warnings:
  ⚠ sections/naval.html: Large file (325 lines) — consider splitting
  ⚠ Navigation: Sidebar links to #missing but no matching section ID found
```

**Note**: Warnings don't block the build, but should be addressed before committing.

### AI Content Zones
AI-managed content regions use marker syntax to define update boundaries. See `AI-ZONES.md` for complete documentation on AI zone conventions and best practices.

---

## How to add a new section

1. Create a new file in `sections/`, e.g. `sections/diplomacy.html`.
2. Give the section's root element a unique `id` so the sidebar can link to it:
   ```html
   <div class="section-header" id="diplomacy"> … </div>
   ```
3. Open `build.js` and add the new filename to the `SECTIONS` array at the position where it should appear on the page:
   ```js
   'sections/diplomacy.html',
   ```
4. If you want the section in the sidebar navigation, add an `<a>` entry to `sections/sidebar.html`.
5. Run `npm run build`.

---

## Styling reference

CSS custom properties are defined in `css/variables.css`. Use them for colours instead of hard-coding hex values so that light/dark theme toggling works automatically. Common variables:

```css
var(--accent-red)
var(--accent-orange)
var(--accent-gold)
var(--accent-blue)
var(--accent-cyan)
var(--accent-green)
var(--text-primary)
var(--text-secondary)
var(--text-muted)
var(--bg-card)
var(--border-color)
```

---

## Checklist for a typical daily update

- [ ] Open `data.json` and update:
  - [ ] `date` and `lastUpdated`
  - [ ] `ticker` array — prepend new headlines, remove stale ones
  - [ ] Any stat values that have changed (`statConfirmedDead`, `statRialRate`, etc.)
  - [ ] Scenario likelihoods if there has been a major development (`scenarioDealPct`, `scenarioStrikesPct`, etc.)
- [ ] Prepend new timeline entries in `sections/last-24h.html`; shift yesterday's entries to the YESTERDAY block (day-header labels update automatically)
- [ ] Update any non-scenario charts in `sections/charts/` that have new data
- [ ] Add new source links to `sections/sources.html` (compiled date updates automatically)
- [ ] Run `npm run build` — check for any "unresolved placeholders" warnings
- [ ] Verify `index.html` looks correct in a browser before committing
