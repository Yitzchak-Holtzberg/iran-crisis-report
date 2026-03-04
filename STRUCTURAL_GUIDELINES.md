# Structural Update Guidelines

These guidelines are injected into the structural update prompt when the AI
auto-update system runs in **structural** mode. They define what the model may
and may not do when rewriting section HTML files.

Edit this file to adjust editorial policy without touching `ai-update.js`.

---

## Source Reliability Tiers

All new content must respect the site's six-tier credibility hierarchy
(visible to readers in `sources.html#source-reliability`). Apply these rules
when adding or evaluating claims:

| Tier | Weight | Examples | Editorial rule |
|---|---|---|---|
| 1 | Highest | US CENTCOM, IAEA, State Dept, UN/OCHA/WHO | Treat as ground truth for *what governments claim* — note which government is speaking |
| 2 | High | Reuters, AP, AFP | Preferred for confirming discrete events; breaking dispatches are less verified than analysis pieces |
| 3 | Good | ISW, USNI News, The War Zone, CSIS, Defense News | Preferred for military order-of-battle, technical claims, and operational assessments |
| 4 | Standard | NYT, WaPo, BBC, CNN, NPR, The Guardian, FT, Axios, Politico | Good for confirmed events and context; analysis may reflect editorial positions |
| 5 | Verify framing | Al Jazeera, Iran International, Al Arabiya, Times of Israel, HRANA | Valuable for regional events and on-the-ground access; note editorial angle — cross-check framing with tiers 1–2 |
| 6 | Caution | JINSA, MEF, Alma Center, Wikipedia | Advocacy/partisan — state their perspective explicitly; do not cite as neutral arbiters; must be corroborated by a tier 1–4 source |

Rules for new content:
- **Establish facts from tiers 1–3.** If only a tier-4 source reports something,
  that is acceptable for confirmed events but note it is not yet wire-confirmed.
- **Tier-5 sources require a framing note** in the attribution, e.g.
  `— Source: <em>Iran International (opposition-aligned), Mar 5</em>`.
- **Tier-6 sources must be corroborated.** Never use a tier-6 source as the
  sole basis for a factual claim. Always pair with a tier 1–4 citation.
- Claims sourced only from tiers 5–6 that appear in `confirmed-unconfirmed.html`
  belong in the **unconfirmed** column until corroborated by a higher tier.

---

## General Principles

1. **Additive bias** — prefer adding new cards/callouts over removing existing
   ones. Only remove content that is clearly outdated or directly contradicted
   by credible sources.
2. **Minimal change** — only modify sections where the news justifies it. Return
   `null` for any section that does not need structural changes.
3. **Source everything** — every new fact must include a source attribution in
   italics (e.g. `— Source: <em>Reuters, Mar 1</em>`). Apply the tier rules
   above to decide how to frame the attribution.

## What to Add

| Trigger event | Action |
|---|---|
| Military operation launched or concluded | Add a **red-bordered callout** (`callout red`) at the top of the relevant section with operation name, date, and key facts. |
| New carrier strike group deployed | Add a new **carrier card** in `naval.html` using the same `.carrier-card` pattern as existing CSGs. |
| Regime change or leadership transition | Add a **critical callout** at the top of `inside-iran.html` summarising the event; update the scenarios section to reflect new probabilities. |
| Peace deal or ceasefire signed | Add a **blue callout** (`callout blue`) at the top of the most relevant section; adjust scenario cards accordingly. |
| Nuclear test or confirmed weapons-grade enrichment | Add a **red callout** in `nuclear.html`; consider adding a new crisis card in `inside-iran.html`. |
| New scenario emerges that doesn't fit existing five | Add a 6th scenario card in `scenarios.html` using the same card/grid pattern as the existing five. Ensure the `{{scenarioXxxPct}}` placeholder is added for build.js. |
| Credible report of US/coalition covertly arming or supplying Kurdish forces, ethnic-minority armed groups, or any anti-regime proxy (even if unconfirmed) | Immediately add an **orange-bordered callout** (`callout orange`) to `confirmed-unconfirmed.html` in the **UNCONFIRMED** column with the claim, source tier, and what corroboration is still needed. If subsequently confirmed by a Tier 1–3 source, move to the confirmed column and add a card to the relevant section (`opposition.html`, `military.html`, or a new `inside-iran.html` crisis card). |
| Significant activity by Kurdish armed groups (Peshmerga, KDPI, PJAK, SDF) in or near Iran | Add a timeline item to `last-24h.html` and, if the activity crosses the border or directly implicates the crisis, add a card to `military.html` or `inside-iran.html`. |
| Iraq enters the conflict as a direct theater (PMF — Popular Mobilization Forces — attacks on US bases, Baghdad government taking sides, Iraqi airspace used) | Add a **red callout** to `reactions.html` under regional reactions and update the map (`js/map.js`) with relevant markers. |
| A significant development occurs in a domain **not currently covered** by any existing section (e.g. space/satellite warfare, bioweapons, AI-enabled weapons, global financial system attack, a completely new country entering the conflict, environmental or infrastructure sabotage, new-technology first-use) | (1) Add a `last-24h.html` timeline item immediately. (2) Add an **orange callout** (`callout orange`) to `confirmed-unconfirmed.html` in the **UNCONFIRMED** column with the claim and what confirmation would look like. (3) If confirmed by a Tier 1–3 source, add a card to the most closely related existing section (e.g. `military.html` for new weapons, `reactions.html` for new actors, `analysis.html` for strategic implications). If the development is large enough to warrant its own section, flag this in the `analysis.html` card and the editorial team will create the section manually. |

## What to Reorder

- If a scenario probability shifts by **≥ 20 percentage points**, move that
  scenario card higher in the display order (closer to the top of
  `scenarios.html`).
- If a new crisis eclipses an existing one in `inside-iran.html`, reorder the
  crisis cards so the most urgent appears first.

## What NOT to Touch

- **Never remove** the Pahlavi/opposition section (`opposition.html`) or any of
  its core content blocks.
- **Never merge** two sections into one — each section file is an independent
  unit linked from the sidebar.
- **Never change** the sidebar navigation structure (`sidebar.html`) — the
  section `id` attributes are the source of truth for sidebar active-link
  highlighting.
- **Never modify** `<script>` tags or inline JavaScript.
- **Never change** SVG diagrams (carrier schematics, aircraft schematics,
  charts).
- **Never alter** `{{placeholder}}` template variables — they are replaced at
  build time by `build.js`.
- **Never remove** `@ai-zone` comment markers — they are used by the routine
  update system.

## Card & Callout Templates

Use these exact patterns when adding new content:

### Info card with accent border

```html
<div class="card" style="border-left:4px solid var(--ACCENT_COLOR);margin-bottom:20px;">
  <h3>TITLE</h3>
  <p>Description with <strong>key details bolded</strong>. — Source: <em>Outlet, Date</em></p>
</div>
```

### Callout box

```html
<div class="callout COLOR">
  <div class="callout-title">TITLE</div>
  <p style="color:var(--text-secondary);">Content with <strong>key facts</strong>. — Source: <em>Outlet, Date</em></p>
</div>
```

Valid callout colors: `red`, `orange`, `blue`, `green`, `gold`.

### Timeline item (for `last-24h.html`)

```html
<div class="tl-item">
  <div class="tl-dot" style="border-color:var(--ACCENT_COLOR);"></div>
  <div class="date">CATEGORY — SHORT HEADLINE IN UPPER CASE</div>
  <div class="content">1–3 sentence description. — Source: <em>Outlet, Date</em></div>
</div>
```

### Scenario card (for `scenarios.html`)

```html
<div class="card" style="border-left:4px solid var(--ACCENT_COLOR);margin-bottom:20px;">
  <div class="scenario-header" style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
    <div style="background:rgba(R,G,B,0.15);border-radius:8px;padding:8px 14px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:var(--ACCENT_COLOR);letter-spacing:1px;text-transform:uppercase;">Scenario N</div>
    <h3 style="margin:0;">Scenario Title</h3>
    <span class="severity LEVEL" style="margin-left:auto;">Likelihood: {{scenarioXxxPct}}%</span>
  </div>
  <!-- Two-column layout for triggers and obstacles, then a callout for consequences -->
</div>
```

## Section-specific Rules

### `naval.html` (deep-updated on every structural run)
- This section is **always** deeply updated during structural runs.
- Only add a new carrier card if a **new carrier strike group** deploys to the
  region. Never remove existing carrier cards — they represent historical
  deployment facts.
- Preserve all SVG carrier schematics exactly as-is.

### `scenarios.html` (deep-updated on every structural run)
- This section is **always** deeply updated during structural runs.
- The five existing scenarios must always be present. You may add a 6th if a
  genuinely new trajectory emerges.
- Probability percentages must always sum to 100 across all scenarios.

### `inside-iran.html`
- The seven-crisis structure is the editorial backbone. You may add a new crisis
  card (Crisis 8, etc.) but never remove or merge existing ones.
- Each crisis card uses `border-left:3px solid var(--accent-COLOR)`.

### `military.html` (deep-updated on every structural run)
- This section is **always** deeply updated during structural runs.
- Update threat assessments, capability estimates, and damage-assessment callouts
  to reflect the latest confirmed strike results and intelligence assessments.
- Never remove existing capability cards — they document confirmed order-of-battle
  facts; add new cards for newly identified units or weapons systems.

### `opposition.html`
- The Pahlavi timeline (`@ai-zone:opposition-track`) is updated by routine zone
  updates — structural changes should only touch content **outside** that zone.
- Never remove the "Case For" / "Case Against" two-column layout.

### `air-power.html` (deep-updated on every structural run)
- This section is **always** deeply updated during structural runs.
- Preserve all aircraft SVG schematics. Only add new aircraft cards if a
  genuinely new aircraft type is deployed.

### `last-24h.html`
- Structural changes here should only add new day-blocks or restructure the
  overall layout — individual timeline items are handled by the routine update.

### `reactions.html` (deep-updated on every structural run)
- This section is **always** deeply updated during structural runs.
- Add new country-level cards when a new nation is directly impacted by strikes
  or retaliatory attacks. Keep existing country cards — they document confirmed
  events.
- Preserve the regional grouping structure (Iran, Gulf states, Israel, global).

### `confirmed-unconfirmed.html`
- Update the verification status of claims as they are confirmed or debunked by
  credible sources. Move items between confirmed and unconfirmed columns as
  warranted.
- **Low-friction rumor intake**: This section is the *first stop* for any
  newsworthy claim that lacks Tier 1–3 confirmation — do **not** wait for
  confirmation before adding it here. The bar for adding an item to the
  **UNCONFIRMED** column is a *plausible, sourced rumor from any tier* — e.g.
  a Tier-5 outlet reporting that the US is arming Kurdish forces should appear
  here immediately with an `? UNCONFIRMED` badge, the outlet's tier framing
  note, and a description of what confirmation would look like.
- Priority rumor categories to watch (previously under-covered):
  - US/coalition covertly arming or supplying Kurdish groups (Peshmerga, Kurdistan
    Regional Government/KRG, KDPI — Kurdish Democratic Party of Iran, PJAK —
    Free Life Party of Kurdistan, SDF — Syrian Democratic Forces), ethnic-minority
    militias, or MEK (Mojahedin-e Khalq) -linked armed cells
  - Iraqi PMF (Popular Mobilization Forces) attacks on US or coalition assets
    (may be underreported early)
  - Iranian strikes or assassination plots on targets outside the named theater
    (Turkey, Central Asia, diaspora communities)
  - Covert diplomacy or back-channel ceasefire terms not yet publicly confirmed
  - Internal IRGC dissent or defections reported by opposition-aligned outlets
- **New-domain discoveries**: If a search result describes a development in a
  domain with **no existing section** (e.g. satellite/space warfare, bioweapons,
  global financial infrastructure attack, a new country entering the conflict that
  isn't represented anywhere on the site), it must still be captured here
  immediately — even if it doesn't fit the existing unconfirmed item categories.
  Write an `? UNCONFIRMED` item with the domain noted in the headline (e.g.
  `SPACE — IRAN SATELLITE JAMMING CLAIM`) so the editorial team can decide
  whether to create a dedicated new section.

### `analysis.html` (deep-updated on every structural run)
- This section is **always** deeply updated during structural runs — never return
  `null` for it.
- The top-of-section Phase Status callout must reflect the current operation day
  and the most recent confirmed developments.
- Each think-tank card (CSIS, ISW, Carnegie, Brookings, Atlantic Council, CFR,
  RAND) must be refreshed with the latest assessment relevant to that
  organisation's focus area.
- Add a new callout at the **top** of each card when there is a major finding
  from that think-tank or when a previously-predicted event has occurred.
- Preserve all `@ai-zone` markers within the section exactly as they appear.

### `map` / `js/map.js` (deep-updated on every structural run)
- This file is **always** deeply updated during structural runs — the map must
  always reflect the current confirmed force disposition.
- Preserve the `document.addEventListener('DOMContentLoaded', ...)` wrapper and
  all icon/helper function definitions (lines 1–41) **exactly as-is**.
- Update `L.marker` popup text for any asset whose status has changed (position,
  operational status, casualty info, etc.).
- Add new `L.marker` / `L.polyline` / `L.circle` entries for newly confirmed
  strike events, force movements, or diplomatic venues.
- Remove a marker only when the asset has **definitively** departed the theater
  (confirmed by CENTCOM, MoD, or equivalent Tier-1 source).
- Do **not** alter any SVG icon strings inside the helper functions.

## CSS Variable Reference

| Variable | Usage |
|---|---|
| `--accent-red` | Combat / critical / crackdown |
| `--accent-orange` | High-threat military moves |
| `--accent-gold` | Diplomacy / negotiations |
| `--accent-blue` | US naval or air assets |
| `--accent-cyan` | Intelligence / cyber |
| `--accent-green` | Economic indicators |
| `--text-primary` | Main text |
| `--text-secondary` | Supporting text |
| `--text-muted` | De-emphasised text |

## Severity Badge Classes

| Class | Meaning |
|---|---|
| `severity critical` | Highest urgency (red) |
| `severity high` | High urgency (orange) |
| `severity elevated` | Elevated (gold/blue) |
| `severity moderate` | Moderate (green) |
