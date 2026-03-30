# Architecture Assessment Report

**Date:** March 30, 2026
**Scope:** Full codebase review of the Iran Crisis Report dashboard

---

## Executive Summary

This is a well-built static news dashboard with a sophisticated automated content pipeline. The core architecture — data-driven templates, AI-managed content zones, multi-layer validation, and automated deployment — is sound. However, the codebase has outgrown several of its original design decisions. Below are the specific areas where the architecture could be dramatically improved, organized by impact.

---

## Current Architecture at a Glance

```
data.json (single source of truth)
    │
    ▼
build.js (Nunjucks templating + validation)
    │
    ├── sections/*.html (~51 partial files)
    ├── css/ (5 stylesheets, 681 lines)
    ├── js/ (3 scripts, 1033 lines)
    │
    ▼
11 output HTML pages → GitHub Pages

Automated pipeline:
  scripts/update-date.js → scripts/ai-update.js → build.js → deploy
  (Brave Search + GPT-5-mini, every 6 hours)
```

---

## 1. CRITICAL: Monolithic Section Files

**Problem:** Several section files have grown far too large for maintainability:

| File | Size |
|------|------|
| `last-24h.html` | 72 KB |
| `scenarios.html` | 36 KB |
| `naval.html` | 36 KB |
| `nuclear.html` | 32 KB |
| `sources.html` | 28 KB |
| `opposition.html` | 24 KB |

A 72 KB HTML partial is extremely difficult to review, diff, or selectively update. AI zone updates become riskier when the surrounding file is enormous — one misplaced tag corrupts a huge page.

**Ideal architecture:** Break each large file into sub-partials organized by logical section. Use Nunjucks `{% include %}` (which the build system already supports) to compose them:

```
sections/
  scenarios/
    scenario-declared-victory.html
    scenario-negotiated-deal.html
    scenario-democratic-revolution.html
    scenario-managed-transition.html
    scenario-regime-collapse.html
  scenarios.html  ← just includes the above
```

This aligns AI zones 1:1 with files, makes diffs surgical, and enables independent updates per scenario.

---

## 2. CRITICAL: Inline Style Pollution

**Problem:** 92+ inline `style=""` attributes scattered across section files. Examples:

```html
<p style="color:var(--text-secondary);font-size:13px;margin-left:16px;">
<div style="border-left:4px solid var(--accent-blue);padding-left:14px;margin-top:14px;">
<div class="tl-dot" style="border-color:var(--accent-cyan);">
```

This is the single biggest maintainability drag on the codebase. Every visual change requires editing dozens of HTML files instead of one CSS rule. It also inflates page weight and defeats dark/light theme switching for any property not using a CSS variable.

**Ideal architecture:** Extract all inline styles into semantic CSS utility classes in `css/components.css`:

```css
/* components.css additions */
.callout-red    { border-color: var(--accent-red); }
.callout-blue   { border-color: var(--accent-blue); }
.text-secondary { color: var(--text-secondary); }
.text-sm        { font-size: 13px; }
.tl-dot-cyan    { border-color: var(--accent-cyan); }
```

Then in HTML: `<p class="text-secondary text-sm">` instead of inline styles. This is a large but high-leverage refactor.

---

## 3. HIGH: Data-Driven Repeated Structures

**Problem:** The codebase contains ~200 timeline items, ~87 callout cards, and ~46 stat boxes — all hand-written HTML with identical structure and only content varying. For example, `background.html` has nearly 200 timeline entries like:

```html
<div class="tl-item">
  <div class="tl-dot" style="border-color:var(--accent-cyan);"></div>
  <div class="date">FEB 28, 2026</div>
  <div class="content">Some event description</div>
</div>
```

This creates enormous file sizes, makes bulk updates error-prone, and prevents structural changes (e.g., adding a new field to timeline items requires editing 200 blocks).

**Ideal architecture:** Move repeated structured data into `data.json` (or a separate `timeline.json`) and render with Nunjucks loops:

```json
{ "timeline": [
  { "date": "FEB 28, 2026", "color": "cyan", "content": "Event..." },
  ...
]}
```

```html
{% for item in timeline %}
<div class="tl-item">
  <div class="tl-dot tl-dot-{{ item.color }}"></div>
  <div class="date">{{ item.date }}</div>
  <div class="content">{{ item.content }}</div>
</div>
{% endfor %}
```

This would shrink `background.html` from 20 KB to ~1 KB of template + a data file, and make the timeline queryable, sortable, and machine-updatable.

---

## 4. HIGH: Validation That Doesn't Block Deployment

**Problem:** The build system has comprehensive validation (schema, HTML balance, navigation links, duplicate IDs, provenance), but **warnings never fail the build**. The CI/CD gate only checks for 3 specific error strings:

```bash
# daily-build.yml line 79 — only these block deployment:
grep -qE 'unresolved placeholders|Unbalanced AI zone|Unbalanced HTML tags'
```

Duplicate IDs, broken navigation links, and other validation failures are silently committed and deployed.

**Ideal architecture:**
- **Separate warnings from errors.** Introduce exit codes: `0` = clean, `1` = errors (block deploy), `2` = warnings (log but deploy).
- **Expand the CI gate** to check all validation categories, not just 3 hardcoded strings.
- **Add `npm run validate` as a proper command** that returns a meaningful exit code (the current one is a fragile grep pipe that always exits 0).

---

## 5. HIGH: CSS Architecture Lacks Structure

**Problem:** The entire CSS layer is only 681 lines across 5 files, but the actual styling is split between these files and 92+ inline styles in HTML. There's no systematic component library, no naming convention (BEM, utility-first, etc.), and `components.css` is a catch-all.

| File | Lines | Role |
|------|-------|------|
| `variables.css` | 59 | Theme tokens |
| `base.css` | 125 | Resets + typography |
| `components.css` | 380 | Everything else |
| `sidebar.css` | 46 | Sidebar nav |
| `responsive.css` | 71 | Media queries |

**Ideal architecture:**
- Adopt a lightweight naming convention (e.g., BEM-lite: `.callout`, `.callout--red`, `.callout__title`)
- Split `components.css` into logical modules: `cards.css`, `timeline.css`, `stats.css`, `callouts.css`, `charts.css`
- Move ALL presentational inline styles into these modules
- Keep `variables.css` as the single theming control point (it already does this well)

---

## 6. MEDIUM: Hardcoded Page Definitions in build.js

**Problem:** All 11 pages are defined as hardcoded arrays in `build.js` (~130 lines of static configuration). Adding a new page means editing `build.js` in multiple places: the `BUILDS` array, the sidebar nav definition, and the validation exclusion list.

**Ideal architecture:** Move page definitions to a declarative config file (`pages.json` or `pages.yml`):

```json
{
  "pages": [
    {
      "output": "index.html",
      "sections": ["head-base", "masthead", "ticker", "sidebar-template", "last-24h", "sources-link", "scripts"],
      "meta": { "pageTitle": "Iran Crisis Dashboard" },
      "sidebar": [ { "group": "Key Sections", "items": [...] } ]
    }
  ]
}
```

This makes page configuration data-driven and reviewable without touching build logic.

---

## 7. MEDIUM: `map.js` Is Disproportionately Complex

**Problem:** `map.js` is 882 lines — 85% of all client-side JavaScript. It contains hardcoded military base coordinates, icon definitions, popup HTML templates, and layer management all in one file. This makes it impossible to update map data without touching application logic.

**Ideal architecture:**
- Extract map data (bases, coordinates, icons, popup content) into a `map-data.json` file
- Keep `map.js` as pure Leaflet initialization + layer management (~200 lines)
- Consider making map data AI-updatable via the zone system

---

## 8. MEDIUM: AI Pipeline Lacks Separation of Concerns

**Problem:** `scripts/ai-update.js` (586 lines) handles search, content generation, zone replacement, validation, and manifest tracking in one file. The `scripts/lib/` directory has good decomposition (zones, provenance, structural-updates, etc.) but `ai-update.js` itself orchestrates everything monolithically.

**Ideal architecture:**
- Split `ai-update.js` into a pipeline of discrete stages: `fetch-news.js` → `generate-content.js` → `apply-updates.js` → `validate-updates.js`
- Each stage reads from and writes to a shared manifest (`data/update-manifest.json`)
- Failed stages can be retried independently
- Enables dry-run mode: run fetch + generate without applying

---

## 9. MEDIUM: No Local Development Workflow

**Problem:** There's no dev server, no file watcher, no hot reload. Developers must run `npm run build` manually after every change and open the HTML files directly. There's also no pre-commit validation hook.

**Ideal architecture:**
- Add a `watch` script using `fs.watch()` (no dependencies needed) that rebuilds on section/data changes
- Add a simple static file server (Node's built-in `http` module) for local preview
- Add a git pre-commit hook that runs validation and blocks commits with errors

---

## 10. LOW: Inline JavaScript Event Handlers

**Problem:** 4 `onclick` handlers directly in HTML for toggle functionality:

```html
<button onclick="var d=this.previousElementSibling;d.classList.toggle('collapsed');...">
```

This mixes behavior with markup, is inaccessible to keyboard users, and can't be cached or minified.

**Fix:** Move to event delegation in `sidebar.js` using `data-toggle` attributes.

---

## 11. LOW: Nunjucks `throwOnUndefined: false` Hides Bugs

**Problem:** Missing template variables silently render as empty strings. A typo like `{{statUsTrops}}` (missing 'o') produces no error — just blank output in production.

**Fix:** Set `throwOnUndefined: true` and handle optional variables explicitly with Nunjucks `default` filter: `{{ optionalVar | default('') }}`.

---

## Prioritized Improvement Roadmap

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Extract inline styles → CSS classes | Large | Dramatic maintainability gain |
| **P0** | Split monolithic section files into sub-partials | Medium | Enables safer AI updates, cleaner diffs |
| **P1** | Data-drive repeated structures (timelines, cards) | Medium | Shrinks codebase 30-40%, enables automation |
| **P1** | Make validation block deployment on errors | Small | Prevents broken deploys |
| **P1** | Restructure CSS into component modules | Medium | Professional styling architecture |
| **P2** | Declarative page config (pages.json) | Small | Cleaner build system |
| **P2** | Extract map data from map.js | Medium | Separates data from logic |
| **P2** | Split ai-update.js into pipeline stages | Medium | Better error recovery, testability |
| **P3** | Add dev server + file watcher | Small | Better DX |
| **P3** | Fix inline onclick handlers | Tiny | Accessibility + correctness |
| **P3** | Enable throwOnUndefined | Tiny | Catches template typos |

---

## What's Already Done Well

These aspects of the architecture should be preserved:

1. **Data-driven content via `data.json`** — clean separation of data and templates
2. **AI zone system** — elegant mechanism for automated content updates with guardrails
3. **Provenance tracking** — claim-level source attribution with confidence tiers
4. **Multi-layer validation** — schema, HTML balance, navigation, provenance (just needs to actually block on failure)
5. **Incremental build optimization** — hash-based skip logic already exists
6. **Graceful degradation** — AI pipeline failures don't block deployment
7. **Rollback mechanism** — `last-good-deploy` git tag
8. **Zero runtime dependencies** — pure static HTML, no client-side framework overhead
9. **Theme system** — CSS variables + `data-theme` attribute is clean and effective

---

## Conclusion

The codebase has a strong foundation. The most impactful changes are not architectural rewrites but disciplined refactoring: moving inline styles to CSS classes, breaking large files into composable partials, and data-driving repeated structures. These three changes alone would reduce total HTML volume by ~40%, make every file reviewable in a single screen, and turn the AI zone system from "good" to "excellent" by giving each zone its own focused file.
