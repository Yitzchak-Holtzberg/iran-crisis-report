# AI Content Update Zones

## Overview

This document defines the conventions for marking AI-managed content zones in section files. These markers allow the AI update scripts to modify specific parts of files while preserving human-curated content.

## Marker Syntax

AI-managed content regions are wrapped with balanced comment markers:

```html
<!-- @ai-zone:unique-id -->
  Content that can be automatically updated by AI scripts
<!-- @/ai-zone:unique-id -->
```

### Rules

1. **Zone IDs must be unique** within each file
2. **Zone IDs must match** between opening and closing tags
3. **Zones must be properly balanced** (every open tag must have a close tag)
4. **Zone IDs should be descriptive** (e.g., `nuclear-track`, `iran-crisis2-title`)
5. **Zones can span multiple lines** or contain complex HTML

### Zone ID Naming Convention

Format: `section-subsection-type`

Examples:
- `nuclear-track` - Nuclear talks timeline
- `nuclear-subtitle` - Nuclear section subtitle
- `iran-crisis2-title` - Inside Iran crisis 2 title
- `iran-crisis2-body` - Inside Iran crisis 2 body content

## Current AI Zones in Repository

### sections/inside-iran.html
```html
<!-- @ai-zone:iran-crisis2-title -->
Crisis 2: The Student Uprising (Feb 21 – 27, Day 7)
<!-- @/ai-zone:iran-crisis2-title -->
```
- **Purpose**: Updates the title with current day count
- **Updated**: Daily
- **Script**: scripts/ai-update.js

### sections/nuclear.html
```html
<!-- @ai-zone:nuclear-subtitle -->
Vienna technical talks begin Monday Mar 2 — expert working groups...
<!-- @/ai-zone:nuclear-subtitle -->
```
- **Purpose**: Updates nuclear section subtitle with latest developments
- **Updated**: After major diplomatic events
- **Script**: scripts/ai-update.js

```html
<!-- @ai-zone:nuclear-track -->
  <div class="tl-item">...</div>
  <div class="tl-item">...</div>
  ...
<!-- @/ai-zone:nuclear-track -->
```
- **Purpose**: Updates nuclear talks timeline
- **Updated**: Daily
- **Script**: scripts/ai-update.js

### sections/background.html
```html
<!-- @ai-zone:bg-us-iran-timeline -->
  <div class="tl-item">...</div>
  ...
<!-- @/ai-zone:bg-us-iran-timeline -->
```
- **Purpose**: Updates US-Iran relations timeline (1953–2020)
- **Updated**: As needed
- **Script**: scripts/ai-update.js

```html
<!-- @ai-zone:bg-nuclear-timeline -->
  <div class="tl-item">...</div>
  ...
<!-- @/ai-zone:bg-nuclear-timeline -->
```
- **Purpose**: Updates nuclear program timeline (2002–2026)
- **Updated**: As needed
- **Script**: scripts/ai-update.js

```html
<!-- @ai-zone:bg-january-protests -->
  Content about protest waves and January Massacre
<!-- @/ai-zone:bg-january-protests -->
```
- **Purpose**: Updates January Massacre and protest movement details
- **Updated**: As needed
- **Script**: scripts/ai-update.js

```html
<!-- @ai-zone:bg-path-to-war -->
  Escalation timeline and Operation Epic Fury countdown
<!-- @/ai-zone:bg-path-to-war -->
```
- **Purpose**: Updates the path-to-war escalation timeline
- **Updated**: As needed
- **Script**: scripts/ai-update.js

## Build Validation

The build script (`build.js`) validates AI zones during the build process:

✓ Checks that all `<!-- @ai-zone:id -->` tags have matching `<!-- @/ai-zone:id -->` tags
✓ Warns if zones are unbalanced
✓ Reports affected files

Example validation output:
```
Build Warnings:
  ⚠ sections/nuclear.html: Unbalanced AI zone markers (3 open, 2 close)
```

## Adding New AI Zones

When adding a new AI-managed content region:

1. **Identify the content** that should be AI-updatable
2. **Choose a descriptive zone ID** following the naming convention
3. **Wrap the content** with balanced markers:
   ```html
   <!-- @ai-zone:your-zone-id -->
   Your AI-updatable content here
   <!-- @/ai-zone:your-zone-id -->
   ```
4. **Update scripts/ai-update.js** to target the new zone
5. **Test the build** to ensure markers are balanced
6. **Document the zone** in this file

## AI Zone Best Practices

### DO:
- ✓ Use descriptive, semantic zone IDs
- ✓ Keep zones focused on specific content types
- ✓ Balance opening and closing tags
- ✓ Document new zones in this file
- ✓ Validate with `npm run build` after adding zones

### DON'T:
- ✗ Nest AI zones inside each other
- ✗ Use generic IDs like "zone1", "content", "update"
- ✗ Include surrounding structural HTML in zones (only content)
- ✗ Create zones that span multiple logical sections
- ✗ Forget to update scripts/ai-update.js when adding zones

## Provenance Tracking (`@claim` markers)

### Overview

Provenance markers track the origin and confidence level of factual claims within AI zones. They prevent **LLM self-reinforcement hallucination** — where the AI reads its own prior speculation and promotes it to "confirmed" with fabricated sources.

### Marker Syntax

```html
<!-- @claim:claim-id confidence=LEVEL origin=ORIGIN date=YYYY-MM-DD evidence=REFS -->
Factual claim content here
<!-- @/claim:claim-id -->
```

### Confidence Levels

| Level | Meaning | Who can set | Evidence required |
|---|---|---|---|
| `speculative` | AI prediction/analysis | AI only | None |
| `reported-unconfirmed` | Tier 4-6 source reported it | AI or human | At least one domain |
| `confirmed` | Tier 1-3 source corroborates | AI (with evidence) or human | Tier 1-3 domain |
| `human-verified` | Human editor confirmed | Human only | Preserved from prior level |

### Promotion Rules

- **Max one level per AI pass**: `speculative` -> `reported-unconfirmed` -> `confirmed` (never skip)
- **Evidence required**: promotions must include source domains in the `evidence=` field
- **`human-verified` is immutable**: the AI cannot modify, downgrade, or remove these claims
- **Stale speculative claims**: removed after 7 days without fresh evidence

### Human Verification

To mark a claim as human-verified (protecting it from AI modification):

```bash
node scripts/verify-claim.js sections/scenarios.html claim-id
```

Or manually edit the marker to set `confidence=human-verified origin=human`.

### Build Validation

The build script checks:
- Balanced `@claim` open/close markers
- `confirmed` claims have evidence (warns if missing)
- `confirmed` claims have Tier 1-3 evidence (warns if only lower tiers)
- `speculative` claims older than 7 days (warns as stale)

### Pipeline Enforcement

The AI update pipeline (`scripts/ai-update.js`) enforces:
- Zone updates rejected if `human-verified` claims are modified
- Zone updates rejected if confidence is promoted by more than one level
- Structural updates rejected if `human-verified` claims are altered
- Evidence domains cross-referenced against actual Tavily search results

### sections/reactions-iran.html
```html
<!-- @ai-zone:reactions-iran-callouts -->
  Top callout stack (latest strike reports and breaking developments)
<!-- @/ai-zone:reactions-iran-callouts -->
```
- **Purpose**: Updates the latest Iran strike callouts (newest-first)
- **Updated**: Daily / on major strike events
- **Script**: scripts/ai-update.js

```html
<!-- @ai-zone:reactions-iran-casualties -->
  Casualties card with stat boxes and displacement figures
<!-- @/ai-zone:reactions-iran-casualties -->
```
- **Purpose**: Updates casualty and displacement figures
- **Updated**: Daily
- **Script**: scripts/ai-update.js

### sections/reactions-gulf.html
```html
<!-- @ai-zone:reactions-gulf-callouts -->
  Top callouts on Gulf-area retaliation developments
<!-- @/ai-zone:reactions-gulf-callouts -->
```
- **Purpose**: Updates Gulf retaliation callouts
- **Updated**: Daily / on major retaliation events
- **Script**: scripts/ai-update.js

```html
<!-- @ai-zone:reactions-gulf-shipping -->
  Shipping & insurance disruption card
<!-- @/ai-zone:reactions-gulf-shipping -->
```
- **Purpose**: Updates shipping and insurance market status
- **Updated**: Daily
- **Script**: scripts/ai-update.js

### sections/reactions-israel.html
```html
<!-- @ai-zone:reactions-israel-callouts -->
  Top callouts on Israeli home-front impacts
<!-- @/ai-zone:reactions-israel-callouts -->
```
- **Purpose**: Updates latest Israel-related strike and retaliation callouts
- **Updated**: Daily
- **Script**: scripts/ai-update.js

```html
<!-- @ai-zone:reactions-israel-homefront -->
  Israeli home front impact card with stat boxes
<!-- @/ai-zone:reactions-israel-homefront -->
```
- **Purpose**: Updates Israeli home-front statistics and impact summary
- **Updated**: Daily
- **Script**: scripts/ai-update.js

### sections/reactions-global.html
```html
<!-- @ai-zone:reactions-global-callouts -->
  Top callouts on US domestic political developments
<!-- @/ai-zone:reactions-global-callouts -->
```
- **Purpose**: Updates US political/congressional reaction callouts
- **Updated**: Daily / on major political developments
- **Script**: scripts/ai-update.js

```html
<!-- @ai-zone:reactions-global-energy -->
  Energy & shipping markets callout
<!-- @/ai-zone:reactions-global-energy -->
```
- **Purpose**: Updates energy/shipping market status and Hormuz transit
- **Updated**: Daily
- **Script**: scripts/ai-update.js

```html
<!-- @ai-zone:reactions-global-mediation -->
  Regional mediation efforts card
<!-- @/ai-zone:reactions-global-mediation -->
```
- **Purpose**: Updates diplomatic mediation status
- **Updated**: Daily / on diplomatic developments
- **Script**: scripts/ai-update.js

## Files Without AI Zones

The following files are **NOT** AI-managed via zone markers and should remain human-curated in **routine** updates:

- `sections/head.html` - HTML head, meta tags (includes `head-css.html` partial)
- `sections/head-css.html` - Shared CSS link tags (included by all head files)
- `sections/masthead.html` - Page header
- `sections/ticker.html` - Ticker container (content in data.json)
- `sections/sidebar.html` - Navigation structure (includes `sidebar-header.html` + `sidebar-footer.html`)
- `sections/sidebar-header.html` - Shared sidebar shell: brand, subtitle, page pills
- `sections/sidebar-footer.html` - Shared sidebar closing elements: overlay, toggle, container
- `sections/stats.html` - Statistics grid (values in data.json)
- `sections/theater.html` - Map container
- `sections/sources.html` - Source citations
- `sections/scripts.html` - Closing scripts

**Exception:** `sections/last-24h.html` is AI-updated but does NOT use zone markers because the entire timeline content is replaced daily.

**Structural updates:** In `structural` mode, the AI can modify entire section files (not just zones) for the files listed in `STRUCTURAL_FILES` in `scripts/ai-update.js`. See the **Structural Updates** section below.

## Structural Updates

### Overview

When a major event occurs (e.g. military operation launched, regime change, new scenario), **routine** zone-level updates are not enough — the page structure itself needs to change. The `structural` update mode enables section-level HTML modifications.

### How it works

1. On every scheduled run, `UPDATE_TYPE` defaults to `auto`
2. After the web search, a lightweight **significance assessment** asks GPT whether the news warrants structural changes (conservative — defaults to "no")
3. If promoted to `structural`, or if `UPDATE_TYPE=structural` was set explicitly, the script runs all routine phases first (data.json, timeline, zones)
4. An additional **structural phase** sends eligible section files to GPT with the latest news context
5. GPT returns full replacement HTML for sections that need structural changes
6. Validation checks ensure the replacement preserves:
   - Section header `id` attributes (for sidebar navigation)
   - All `{{placeholder}}` template variables
   - All `@ai-zone` markers (open and close)
   - Minimum content size (rejects replacements < 30% of original)
7. Only validated replacements are written to disk
8. The manifest records whether structural mode was triggered, and why

### Eligible files for structural updates

| Section | File | Description |
|---|---|---|
| last-24h | `sections/last-24h.html` | Last 24 Hours timeline |
| scenarios | `sections/scenarios.html` | Five Scenarios analysis |
| inside-iran | `sections/inside-iran.html` | Inside Iran: seven crises |
| nuclear | `sections/nuclear.html` | Nuclear negotiations |
| naval | `sections/naval.html` | Naval strike power |
| air-power | `sections/air-power.html` | Air power section |
| opposition | `sections/opposition.html` | Opposition & Reza Pahlavi |
| hormuz | `sections/hormuz.html` | Strait of Hormuz |
| military | `sections/military.html` | Iran military capability |
| reactions-iran | `sections/reactions-iran.html` | Iran strike damage assessment |
| reactions-gulf | `sections/reactions-gulf.html` | Gulf states retaliation damage |
| reactions-israel | `sections/reactions-israel.html` | Israel strike outcomes & response |
| reactions-global | `sections/reactions-global.html` | Global diplomatic response |
| confirmed-unconfirmed | `sections/confirmed-unconfirmed.html` | Fog of war: confirmed vs unconfirmed |

### When to use structural updates

- A military operation begins or ends
- A new scenario needs to be added or an existing one fundamentally restructured
- A section needs new cards, callouts, or subsections
- Content needs to be reordered based on changing priorities
- A major diplomatic development changes the entire analysis framework

### Safety guardrails

Structural updates have multiple validation layers:
0. **Significance assessment** — in `auto` mode, GPT must explicitly classify the news as structural before the phase runs (conservative default: routine)
1. **File allowlist** — only files in `STRUCTURAL_FILES` can be modified
2. **Section ID preservation** — sidebar navigation links must still work
3. **Placeholder preservation** — all `{{key}}` templates must be retained
4. **Zone marker preservation** — all `@ai-zone` markers must survive
5. **Size check** — replacement must be at least 30% of original (prevents accidental deletion)
6. **Per-file granularity** — if validation fails for one file, only that file is skipped

## Migration Guide

If you need to convert human-curated content to AI-managed:

1. **Identify stable vs. dynamic content** in the section
2. **Preserve structural HTML** outside zones (headers, containers, etc.)
3. **Wrap only dynamic content** in AI zones
4. **Update the AI script** to populate the zone
5. **Test thoroughly** before deploying
6. **Document the change** in git commit message

Example:
```html
<!-- BEFORE: Fully human-curated -->
<h3>Crisis 2: The Student Uprising (Feb 21 – 27, Day 7)</h3>

<!-- AFTER: Title is AI-managed -->
<h3><!-- @ai-zone:iran-crisis2-title -->Crisis 2: The Student Uprising (Feb 21 – 27, Day 7)<!-- @/ai-zone:iran-crisis2-title --></h3>
```

## Troubleshooting

### Error: "Unbalanced AI zone markers"

**Cause**: Opening tag has no closing tag, or vice versa

**Solution**:
1. Search file for `@ai-zone:`
2. Ensure each `<!-- @ai-zone:id -->` has `<!-- @/ai-zone:id -->`
3. Verify zone IDs match exactly
4. Run `npm run build` to validate

### Content Not Updating

**Cause**: AI script not targeting the zone, or zone ID mismatch

**Solution**:
1. Check `scripts/ai-update.js` for zone ID
2. Verify zone ID spelling matches exactly
3. Ensure AI script is running in daily workflow
4. Check GitHub Actions logs for errors

### Zone Content Corrupted

**Cause**: AI script generated invalid HTML

**Solution**:
1. Review `scripts/ai-update.js` output formatting
2. Check AI API logs for errors
3. Manually restore content from git history
4. Add validation to AI script

## Update Manifest

Every AI update run writes an entry to `update-manifest.json` tracking:
- **timestamp** — ISO 8601 time of the update
- **type** — `auto`, `routine`, or `structural` (as requested)
- **effectiveType** — `routine` or `structural` (after significance assessment)
- **phases** — per-phase status object:
  - `search` — web search results
  - `significance` — (auto mode only) assessment result and reason
  - `dataJson` — data.json update
  - `timeline` — last-24h.html timeline items
  - `zones` — AI zone content updates
  - `structural` — section-level HTML changes (structural mode only)

Each phase has a `status` field (`ok`, `skipped`, or `error`) and relevant details.

## Future Improvements

- [ ] Add JSON schema for zone configuration
- [ ] Create zone registry file listing all zones
- [ ] Add automated zone coverage report
- [ ] Build visual diff tool for AI zone changes
- [ ] Add pre-commit hook to validate zone balance
- [ ] Add rollback capability for structural updates

---

**Last Updated:** March 16, 2026
**Maintained By:** Repository maintainers
**Related Files:** `build.js`, `scripts/ai-update.js`, `update-manifest.json`
