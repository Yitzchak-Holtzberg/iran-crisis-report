# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static HTML news dashboard for the Iran crisis, built from modular HTML section files using a custom Node.js build system. No frameworks, no npm dependencies — only Node.js built-ins.

## Commands

- **Build all pages:** `npm run build` (runs `node build.js`, generates 9 HTML pages from section templates)
- **Validate:** `npm run validate` (checks for build warnings: schema errors, unbalanced AI zones, unbalanced HTML tags, broken nav links)

There are no test or lint commands.

## Architecture

### Build System (`build.js`)

The build script concatenates HTML section fragments into complete pages. It processes three directive types:

- `<!-- @include path -->` — file inclusion (recursive, with directory traversal protection)
- `<!-- @ticker -->` — populates ticker from `data.json` array, doubled for CSS scroll loop
- `{{key}}` — replaced with values from `data.json`

The `BUILDS` array in `build.js` defines 9 output pages (index, diplomatic, scenarios, forces, inside-iran, reactions, analysis, opposition, sources), each specifying which section files to concatenate and per-page meta values.

### Data Flow

`data.json` is the single source of truth for all dynamic values (date, statistics, scenario percentages, ticker headlines). The build script also auto-derives `dayToday`, `dayYesterday`, `dayTwoDaysAgo`, and `dateShort` from the `date` field. Validation runs against `data.schema.json`. Scenario percentages (excluding `scenarioStrikesPct`) must sum to 100.

### Section Files (`sections/`)

~50 HTML fragment files. Each output page assembles a different subset. Key patterns:
- Each page has its own `head-base.html` and `sidebar-*.html` variant
- Shared sections: `masthead.html`, `ticker.html`, `scripts.html`
- Teaser cards (`*-teaser.html`) link from index to deep-dive pages
- SVG charts live in `sections/charts/`

### AI Content Zones

Sections of HTML wrapped in `<!-- @ai-zone:id -->...<!-- @/ai-zone:id -->` markers can be updated by the automated AI pipeline (`scripts/ai-update.js`) without destroying surrounding structure. See `AI-ZONES.md` for the full zone inventory and rules. See `STRUCTURAL_GUIDELINES.md` for editorial policy on structural HTML changes.

### Automated Updates (`.github/workflows/daily-build.yml`)

Runs once daily. Routine research uses Luna and OpenAI built-in web search,
then merges 1–5 validated developments while retaining earlier feed entries.
Only real public content changes trigger a date update, build, commit and Pages
deployment. Requires OPENAI_API_KEY; optional structural research also uses
BRAVE_API_KEY. See README.md and AI-ZONES.md for current automation boundaries.
`npm test` runs updater regressions; the PR verification workflow also runs a
live API check without deploying its output.

### Client-Side Code

- `js/theme.js` — dark/light toggle via `data-theme` attribute, persisted to localStorage
- `js/sidebar.js` — mobile sidebar navigation, back-to-top button
- `js/map.js` — Leaflet.js interactive map, swaps tile style on theme change
- `css/variables.css` — CSS custom properties defining the theme

## Key Constraints

- Generated HTML files (`index.html`, `diplomatic.html`, `scenarios.html`, `forces.html`, `inside-iran.html`, `reactions.html`, `analysis.html`, `opposition.html`, `sources.html`) should never be edited directly — edit the source sections in `sections/` and rebuild.
- Section header `id` attributes must be preserved (sidebar navigation depends on them).
- `{{placeholder}}` templates and `@ai-zone` markers in section files must not be removed.
- AI zone replacements must not shrink content below 30% of original size (guardrail in `ai-update.js`).
- HTML tag balance (opening vs closing `<div>`/`<section>`/`<article>`) is enforced at four levels: structural update rejection (`scripts/lib/structural-updates.js`), AI self-repair with GPT fallback (`scripts/ai-update.js`), build-time warning (`build.js`), and deployment blocking (`.github/workflows/daily-build.yml`).
