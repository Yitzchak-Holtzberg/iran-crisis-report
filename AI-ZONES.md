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

## Files Without AI Zones

The following files are **NOT** AI-managed and should remain human-curated:

- `sections/head.html` - HTML head, meta tags, CSS links
- `sections/masthead.html` - Page header
- `sections/ticker.html` - Ticker container (content in data.json)
- `sections/sidebar.html` - Navigation structure
- `sections/stats.html` - Statistics grid (values in data.json)
- `sections/theater.html` - Map container
- `sections/air-power.html` - Air power section
- `sections/naval.html` - Naval forces section
- `sections/opposition.html` - Opposition section
- `sections/hormuz.html` - Strait of Hormuz section
- `sections/military.html` - Iran military section
- `sections/scenarios.html` - Scenarios section (percentages in data.json)
- `sections/sources.html` - Source citations
- `sections/scripts.html` - Closing scripts

**Exception:** `sections/last-24h.html` is AI-updated but does NOT use zone markers because the entire timeline content is replaced daily.

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

## Future Improvements

- [ ] Add JSON schema for zone configuration
- [ ] Create zone registry file listing all zones
- [ ] Add automated zone coverage report
- [ ] Build visual diff tool for AI zone changes
- [ ] Add pre-commit hook to validate zone balance

---

**Last Updated:** February 27, 2026
**Maintained By:** Repository maintainers
**Related Files:** `build.js`, `scripts/ai-update.js`
