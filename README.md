# Iran Crisis Report

An open-source intelligence briefing on the Iran crisis, compiled from 40+ international sources. Updated daily during active developments.

**Current edition:** February 25, 2026

## Project Structure

```
iran-crisis-report/
├── index.html              # Main report page — HTML structure only
│
├── assets/
│   ├── css/
│   │   ├── style.css       # Master stylesheet — @imports all modules below
│   │   ├── variables.css   # CSS custom properties (dark & light theme tokens)
│   │   ├── base.css        # Reset, body, container, links, footer
│   │   ├── components.css  # Cards, callouts, stats, charts, timeline, tables, quotes
│   │   ├── sections.css    # Masthead, ticker, aircraft, map, carriers, section headers
│   │   └── responsive.css  # Mobile breakpoints (768px, 400px)
│   │
│   └── js/
│       ├── map.js          # Theater-of-operations map rendering (Leaflet)
│       └── theme.js        # Dark/light theme toggle + localStorage persistence
│
└── data/
    ├── map-markers.js      # All map coordinates & popup text (window.MAP_MARKERS)
    └── ticker.js           # Breaking news headlines + DOM injection (TICKER_ITEMS)
```

## Architecture

The project follows a **data ↔ logic ↔ presentation** separation:

| Layer | Files | Responsibility |
|---|---|---|
| **Data** | `data/*.js` | Raw content — coordinates, headlines, popup text |
| **Logic** | `assets/js/*.js` | Behaviour — map rendering, theme switching |
| **Style** | `assets/css/*.css` | Visual design — modular CSS with clear purpose per file |
| **Structure** | `index.html` | HTML skeleton only — no inline CSS or JS |

To **update the map**, edit `data/map-markers.js` — no JS rendering knowledge needed.  
To **update the ticker**, edit `data/ticker.js` — just update the `TICKER_ITEMS` array.  
To **change colours or theme**, edit `assets/css/variables.css`.

## What's Inside

- **Breaking news ticker** — latest developments
- **Top-level statistics** — casualties, deployments, economic indicators
- **Interactive map** — force deployment across the Persian Gulf & Eastern Mediterranean
- **Air power breakdown** — aircraft profiles and deployment charts
- **Naval strike power** — carrier strike groups, escort ships, fleet totals
- **Inside Iran** — seven converging crises (protests, economy, internet blackout, ethnic crackdown, water crisis, proxy collapse, IRGC power struggle)
- **Reza Pahlavi & the opposition** — timeline and analysis
- **Nuclear negotiations** — Geneva talks timeline
- **Strait of Hormuz** — oil chokepoint data
- **Iran's remaining military capability** — post-June 2025 assessment
- **Three scenarios** — Deal / Limited Strikes / Regime Collapse
- **Threat matrix** — severity assessments across ten dimensions

## Usage

Open `index.html` in any modern browser. No build tools, server, or dependencies required — the page is entirely static and loads Leaflet from CDN.

## Sources

All claims are linked in the footer. Primary sources include USNI Fleet Tracker, CSIS, Washington Post, Al Jazeera, NBC, PBS, Amnesty International, Stars & Stripes, The War Zone, and Alma Research Center.

## Contributing

Pull requests are welcome for corrections, updated data, or new sections. Please cite sources for any new factual claims. When adding new map markers, edit only `data/map-markers.js`. When updating headlines, edit only `data/ticker.js`.
