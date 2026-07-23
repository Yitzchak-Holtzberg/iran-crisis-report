# AI Zone Policy

Updated: 2026-07-23

## Current status

All existing `@ai-zone` regions are locked against routine automation.

The markers remain in source files as editorial boundaries and migration
history, but the routine allowlist in `scripts/lib/zones.js` is empty. This is
intentional: the current zones contain standing synthesis, analytical
judgments, or reader-facing structure rather than narrowly time-bounded status.

Scheduled automation updates only:

- `data.json:ticker`;
- `sections/last-24h.html`;
- `data/update-manifest.json`.

## Marker syntax

```html
<!-- @ai-zone:unique-id -->
Content
<!-- @/ai-zone:unique-id -->
```

The build still validates marker balance so editorial boundaries cannot be
accidentally corrupted.

## When a future routine-safe zone is allowed

A zone may be added to `ROUTINE_ZONE_ALLOWLIST` only when all of the following
are true:

1. It contains a single, explicitly time-bounded status.
2. The acceptable source types are declared.
3. The value has an expiry or review trigger.
4. Its update cannot change a page's argument, hierarchy, navigation, or visual
   structure.
5. Its validator rejects unsupported numbers, homepage links, and belligerent
   effect claims.
6. A failed or low-confidence update preserves the prior value.

Examples that may eventually qualify:

- a dated IEA export measure;
- a dated UKMTO/JMIC maritime advisory level;
- a dated IAEA access status;
- a named carrier location from a current official release.

Examples that do not qualify:

- “current assessment” paragraphs;
- scenario labels;
- loss ledgers;
- political-support judgments;
- opposition or regime-stability synthesis;
- historical timelines;
- map styling or interaction;
- and page subtitles that summarize the entire argument.

## Provenance markers

Legacy `@claim` markers remain valid. `human-verified` content is immutable.
New reader-facing research should normally use direct citations and the page's
fact/conflict register rather than densely marking every sentence.

## Structural changes

Direct LLM replacement of section files is disabled in
`scripts/lib/structural-updates.js`.

Manual `UPDATE_TYPE=structural` runs perform institutional research and write a
review proposal under `research/proposals/`. A human or coding agent must then
make and validate any source changes deliberately.
