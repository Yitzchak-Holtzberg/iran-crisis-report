'use strict';

/**
 * Direct structural mutation was retired with the Atlas editorial architecture.
 *
 * Reader-facing section files, build composition, CSS, JavaScript, map
 * presentation, and generated Atlas pages must never be replaced by an LLM in
 * an automated update. Manual structural mode in scripts/ai-update.js now
 * produces a review-only research proposal under research/proposals/.
 */

const STRUCTURAL_FILES = Object.freeze({});

async function updateStructural() {
  throw new Error(
    'Direct structural updates are disabled. Run UPDATE_TYPE=structural to generate an editorial review proposal.',
  );
}

module.exports = { STRUCTURAL_FILES, updateStructural };
