#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PAGE_NAMES = [
  'index.html', 'diplomatic.html', 'scenarios.html', 'forces.html',
  'iran-military.html', 'inside-iran.html', 'reactions.html', 'analysis.html',
  'opposition.html', 'background.html', 'sources.html',
];
const LEGACY_PAGE_NAMES = ['classic.html', ...PAGE_NAMES.slice(1)];
const EXPECTED_OUTPUTS = [
  'index.html',
  ...LEGACY_PAGE_NAMES,
  ...PAGE_NAMES.map((name) => path.join('atlas', name)),
];

const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

const build = spawnSync(process.execPath, ['build.js'], {
  cwd: ROOT,
  encoding: 'utf8',
});
const buildOutput = `${build.stdout || ''}${build.stderr || ''}`;
process.stdout.write(buildOutput);
if (build.status !== 0) fail(`build.js exited with status ${build.status}`);
if (/Build Warnings:|⚠|unresolved placeholders|Unbalanced AI zone|Unbalanced HTML tags/i.test(buildOutput)) {
  fail('build.js reported a validation warning');
}

for (const output of EXPECTED_OUTPUTS) {
  const fullPath = path.join(ROOT, output);
  if (!fs.existsSync(fullPath)) {
    fail(`${output} is missing`);
    continue;
  }
  const stat = fs.statSync(fullPath);
  const minimumSize = output === 'index.html' ? 500 : 1500;
  if (stat.size < minimumSize) fail(`${output} is unexpectedly small (${stat.size} bytes)`);
  const html = fs.readFileSync(fullPath, 'utf8');
  if (/\{\{\s*\w+|\{%\s*/.test(html)) fail(`${output} contains an unresolved template directive`);
}

const mainEntry = read('index.html');
if (!mainEntry.includes('url=atlas/index.html') || !mainEntry.includes('classic.html')) {
  fail('index.html does not promote Atlas while preserving the classic interface');
}

const classicHome = read('classic.html');
if (!classicHome.includes('class="masthead"') || !classicHome.includes('href="classic.html"')) {
  fail('classic.html does not preserve the previous interface and its home navigation');
}

for (const page of PAGE_NAMES) {
  const atlasPath = path.join('atlas', page);
  const html = read(atlasPath);
  if (!html.includes('class="atlas-site-header"')) fail(`${atlasPath} is missing the Atlas header`);
  if (!html.includes('../css/atlas.css')) fail(`${atlasPath} is missing Atlas styles`);
  if (!html.includes('class="atlas-global-nav"')) fail(`${atlasPath} is missing the global page menu`);
}

const latest = read(path.join('sections', 'last-24h.html'));
const latestRows = (latest.match(/<tr>/g) || []).length - 1;
if (latestRows < 1 || latestRows > 5) {
  fail(`Latest Developments must contain 1–5 body rows (found ${latestRows})`);
}
if (latest.split(/\r?\n/).length > 120) fail('Latest Developments is too large for the compact homepage slot');
for (const match of latest.matchAll(/href="([^"]+)"/g)) {
  try {
    const url = new URL(match[1]);
    if (url.pathname === '/' || url.pathname === '') fail(`Latest Developments uses a homepage URL: ${match[1]}`);
  } catch {
    fail(`Latest Developments contains an invalid external URL: ${match[1]}`);
  }
}

const scenarios = read(path.join('sections', 'scenarios.html'));
if (/scenario[A-Za-z]+Pct|\bLikelihood:\s*\d+%/.test(scenarios)) {
  fail('Scenario page reintroduced unsupported percentage judgments');
}

const atlasHome = read(path.join('atlas', 'index.html')).toLowerCase();
for (const phrase of ['update health', 'search results reviewed', 'evidence domains']) {
  if (atlasHome.includes(phrase)) fail(`Atlas overview reintroduced process-facing copy: "${phrase}"`);
}

const updateConfig = spawnSync(process.execPath, ['scripts/ai-update.js', '--validate-config'], {
  cwd: ROOT,
  encoding: 'utf8',
  env: { ...process.env, UPDATE_TYPE: 'auto' },
});
if (updateConfig.status !== 0) {
  fail(`editorial update configuration is invalid: ${updateConfig.stderr || updateConfig.stdout}`);
}

const structuralModule = read(path.join('scripts', 'lib', 'structural-updates.js'));
if (!structuralModule.includes('Direct structural updates are disabled')) {
  fail('legacy direct structural mutation is not locked');
}

if (failures.length > 0) {
  console.error('\nValidation failed:');
  failures.forEach((message) => console.error(`  ✗ ${message}`));
  process.exit(1);
}

console.log(`\n✓ Validated ${EXPECTED_OUTPUTS.length} generated pages, Atlas entry routing, compact latest feed, menus, and editorial update safeguards`);
