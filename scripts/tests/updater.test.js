'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { validateDevelopments, renderLatestDevelopments } = require('../ai-update');
const { mergeLatest, readRows } = require('../lib/latest-feed');
const { responseText, sourceUrls, request } = require('../lib/openai-research');

const make = (n, date = '2026-09-01') => ({ headline: `Development ${n}`, summary: `Event ${n} occurred.`, whyItMatters: 'Changes the situation.', eventDate: date, publishedDate: date, category: 'military', confidence: 'attributed', sourceUrl: `https://www.reuters.com/world/middle-east/event-${n}/`, sourceName: 'Reuters' });
const old = [make(1, '2026-08-29'), make(2, '2026-08-28'), make(3, '2026-08-27')];
const html = renderLatestDevelopments(old, '2026-08-29');
const ticker = old.map(i => i.headline);

test('one or two valid new items publish while previous rows survive', () => {
  for (const count of [1, 2]) {
    const items = [make(4), make(5)].slice(0, count);
    const { valid } = validateDevelopments(items, new Set(items.map(i => i.sourceUrl)), '2026-09-01');
    const merged = mergeLatest(html, ticker, valid, '2026-09-01', renderLatestDevelopments);
    const rows = readRows(merged.html, merged.ticker);
    assert.equal(rows.length, 3 + count);
    for (const row of readRows(html, ticker)) assert.ok(merged.html.includes(row.row));
    assert.equal(rows[0].url, items[0].sourceUrl);
  }
});
test('empty and duplicate results preserve bytes and timestamp', () => {
  for (const items of [[], [old[0]]]) assert.deepEqual(mergeLatest(html, ticker, items, '2026-09-01', renderLatestDevelopments), { html, ticker });
});
test('feed caps at five, sorts newest first, and replaces matching articles', () => {
  const items = [make(4), make(5), make(6), { ...old[0], summary: 'New verified detail.' }];
  const merged = mergeLatest(html, ticker, items, '2026-09-01', renderLatestDevelopments);
  const rows = readRows(merged.html, merged.ticker);
  assert.equal(rows.length, 5);
  assert.equal(rows.filter(r => r.url === old[0].sourceUrl).length, 1);
  assert.ok(merged.html.includes('New verified detail.'));
  assert.ok(!merged.html.includes(old[2].sourceUrl));
});
test('unobserved URLs, impossible/future dates and low-tier anchors fail validation', () => {
  const bad = [make(1), { ...make(2), eventDate: '2026-02-30' }, make(3, '2027-01-01'), { ...make(4), sourceUrl: 'https://www.reuters.com/' }];
  const { valid, rejected } = validateDevelopments(bad, new Set(bad.slice(1).map(i => i.sourceUrl)), '2026-09-01');
  assert.equal(valid.length, 0); assert.equal(rejected.length, 4);
});
test('existing legacy rows migrate without losing content, including year boundaries', () => {
  const legacy = html.replace(/ data-event-date="[^"]+"/g, '');
  assert.equal(readRows(legacy, ticker)[0].date, '2026-08-29');
  const december = renderLatestDevelopments([make(8, '2025-12-31')], '2026-01-01').replace(/ data-event-date="[^"]+"/g, '');
  assert.equal(readRows(december, ['December'])[0].date, '2025-12-31');
});
test('sources come from tool provenance, never URLs fabricated in prose', () => {
  const response = { output: [{ type: 'web_search_call', status: 'completed', action: { sources: [{ url: old[0].sourceUrl }] } }, { type: 'message', content: [{ type: 'output_text', text: 'https://invented.example/fake', annotations: [] }] }] };
  assert.deepEqual([...sourceUrls(response)], [old[0].sourceUrl]);
});
test('incomplete and refused responses fail closed', () => {
  assert.throws(() => responseText({ status: 'incomplete', output: [] }));
  assert.throws(() => responseText({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal' }] }] }));
});
test('Responses transport records output, retries 429 and does not retry 400', async () => {
  const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iran-test-'));
  try {
    let count = 0;
    const output = { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{}' }] }] };
    const post = async (url, headers, body) => {
      assert.equal(url, 'https://api.openai.com/v1/responses');
      assert.equal(JSON.parse(body).store, false);
      return ++count === 1 ? { ok: false, status: 429, text: async () => 'quota' } : { ok: true, json: async () => output };
    };
    await request({ model: 'test' }, { apiKey: 'test-secret', logDir, name: 'test', post, sleep: async () => {} });
    assert.equal(count, 2);
    assert.ok(!fs.readFileSync(path.join(logDir, 'test.json'), 'utf8').includes('test-secret'));
    count = 0;
    await assert.rejects(request({}, { apiKey: 'test', logDir, name: 'bad', post: async () => { count++; return { ok: false, status: 400, text: async () => 'bad request' }; } }));
    assert.equal(count, 1);
  } finally { fs.rmSync(logDir, { recursive: true, force: true }); }
});
