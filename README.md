# Iran Crisis Report — AI Agent Update Guide

This is a single-page HTML news dashboard that is **assembled by a build script** from modular section files. `index.html` is a generated file — **never edit it directly**. All content lives in the `sections/` directory; run the build to regenerate the page.

---

## Repository layout

```
iran-crisis-report/
├── build.js            # Build script — assembles index.html from sections/
├── index.html          # GENERATED — do not edit manually
├── package.json        # npm scripts (build only)
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

Inside any section file, an include directive pulls in a chart partial:

```html
<!-- @include sections/charts/rial-collapse.html -->
```

Paths in `<!-- @include … -->` directives are **relative to the repository root**.

### Run the build

```bash
npm run build
# or equivalently:
node build.js
```

Always run the build after editing any file in `sections/`. The generated `index.html` is what gets served.

---

## How to update common content

### 1. Dateline and "last updated" timestamp — `sections/masthead.html`

Change the date and UTC time in the `<div class="dateline">` line:

```html
<div class="dateline">February 25, 2026 &nbsp;|&nbsp; Compiled from 40+ international sources &nbsp;|&nbsp; Last updated 20:00 UTC</div>
```

### 2. Breaking-news ticker — `sections/ticker.html`

Add, remove, or edit `<span>` elements inside the `.ticker` div. The ticker content is **duplicated** (listed twice) to enable a seamless CSS scroll loop — keep both copies in sync.

```html
<span>BREAKING: Your new headline here</span>
```

### 3. Key statistics — `sections/stats.html`

Each `.stat-box` holds a number and a label. Update the `.number` div with the new value:

```html
<div class="number" style="color:var(--accent-red);">7,015+</div>
<div class="label">Confirmed Dead<br>(HRANA)</div>
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

### 6. Source links — `sections/sources.html`

Add `<a href="…">Description</a>` entries inside the two-column grid div in the footer. Also update the compiled-date line at the bottom of the file.

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

- [ ] Update the dateline / timestamp in `sections/masthead.html`
- [ ] Add new headlines to both copies in `sections/ticker.html`
- [ ] Refresh numbers in `sections/stats.html`
- [ ] Prepend new timeline entries in `sections/last-24h.html`; shift yesterday's entries to the YESTERDAY block
- [ ] Update any charts in `sections/charts/` that have new data
- [ ] Add new source links to `sections/sources.html` and update the compiled-date line
- [ ] Run `npm run build`
- [ ] Verify `index.html` looks correct in a browser before committing
