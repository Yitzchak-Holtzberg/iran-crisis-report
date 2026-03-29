'use strict';

/**
 * Anthropic Claude API wrapper — drop-in replacement for the previous
 * OpenAI wrapper.  Exports the same { init, callGPT, safeParseJSON,
 * GPT_TIMEOUT_MS, STRUCTURAL_GPT_TIMEOUT_MS } interface so all callers
 * are unchanged.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const GPT_TIMEOUT_MS            = 60_000;   // 1 minute  — Haiku is fast
const STRUCTURAL_GPT_TIMEOUT_MS = 180_000;  // 3 minutes — structural calls
const MAX_ATTEMPTS = 3;
const GPT_LOG_MAX_BYTES = 10 * 1024 * 1024;

let ANTHROPIC_KEY;
let GPT_LOG_PATH;

function init(apiKey, logPath) {
  ANTHROPIC_KEY = apiKey;
  GPT_LOG_PATH  = logPath;
}

/**
 * Minimal HTTPS POST helper with explicit socket timeout.
 */
function httpsPost(url, headers, bodyStr, timeoutMs = GPT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const { hostname, pathname, search } = new URL(url);
    const req = https.request(
      {
        hostname,
        path: pathname + (search || ''),
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        const chunks = [];
        res.on('error', reject);
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({
            ok:     res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text:   () => Promise.resolve(body),
            json:   () => {
              try { return Promise.resolve(JSON.parse(body)); }
              catch (e) { return Promise.reject(e); }
            },
          });
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error(`Request timeout after ${timeoutMs}ms`)));
    req.setTimeout(timeoutMs);
    req.write(bodyStr);
    req.end();
  });
}

/** Append a single JSON line to logs/gpt-calls.jsonl. Rotates at 10 MB. */
function appendGptLog(entry) {
  try {
    const logsDir = path.dirname(GPT_LOG_PATH);
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    try {
      const stat = fs.statSync(GPT_LOG_PATH);
      if (stat.size > GPT_LOG_MAX_BYTES) {
        fs.renameSync(GPT_LOG_PATH, GPT_LOG_PATH + '.' + Date.now());
      }
    } catch { /* file doesn't exist yet */ }
    const summary = {
      timestamp:    new Date().toISOString(),
      model:        entry.model,
      bodySizeKB:   entry.bodySizeKB,
      resultLength: entry.result ? entry.result.length : 0,
      error:        entry.error || null,
    };
    fs.appendFileSync(GPT_LOG_PATH, JSON.stringify(summary) + '\n');
  } catch (e) {
    console.warn(`[callGPT] Failed to write gpt-calls.jsonl: ${e.message}`);
  }
}

/**
 * Call a Claude model and return the raw text of the response.
 * Retries up to 3 times with exponential backoff on transient errors.
 *
 * jsonMode=true appends a JSON-only instruction to the system prompt.
 * Claude reliably honours this without needing a response_format parameter.
 */
async function callGPT(
  systemPrompt,
  userContent,
  jsonMode   = false,
  model      = 'claude-haiku-4-5-20251001',
  maxTokens  = 16384,
  timeoutMs  = GPT_TIMEOUT_MS,
) {
  const effectiveSystem = jsonMode
    ? systemPrompt + '\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown fences, no preamble, no trailing text.'
    : systemPrompt;

  const body = {
    model,
    max_tokens: maxTokens,
    system: effectiveSystem,
    messages: [{ role: 'user', content: userContent }],
  };

  const promptSizeKB = +(
    (effectiveSystem.length + userContent.length) / 1024
  ).toFixed(1);

  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const bodyStr = JSON.stringify(body);
      if (attempt === 1) {
        console.log(`  [callGPT] model=${model} body=${(bodyStr.length / 1024).toFixed(1)}KB`);
      }
      const res = await httpsPost(
        'https://api.anthropic.com/v1/messages',
        {
          'Content-Type':      'application/json',
          'x-api-key':         ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        bodyStr,
        timeoutMs,
      );

      if (!res.ok) {
        const text = (await res.text()).slice(0, 500);
        // 429 = rate limit, 529 = overloaded — both are retriable
        if ((res.status >= 500 || res.status === 429 || res.status === 529) && attempt < MAX_ATTEMPTS) {
          const backoff = (res.status === 429 || res.status === 529) ? 2 ** attempt * 5000 : 2 ** attempt * 1000;
          lastErr = new Error(`Claude error ${res.status}: ${text}`);
          console.warn(`  [callGPT] attempt ${attempt}/${MAX_ATTEMPTS} — ${lastErr.message} — retrying in ${backoff}ms…`);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }
        throw new Error(`Claude error ${res.status}: ${text}`);
      }

      const json   = await res.json();
      const result = json.content[0].text;
      appendGptLog({ model, bodySizeKB: promptSizeKB, systemPrompt, userContent, result, error: null });
      return result;
    } catch (err) {
      if (err.message && err.message.startsWith('Claude error')) throw err;
      const cause = err.cause ? ` (cause: ${err.cause.message || err.cause})` : '';
      lastErr = new Error(`${err.message}${cause}`, { cause: err.cause });
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`  [callGPT] attempt ${attempt}/${MAX_ATTEMPTS} — ${lastErr.message} — retrying…`);
        await new Promise(r => setTimeout(r, 2 ** attempt * 1000));
      }
    }
  }
  appendGptLog({ model, bodySizeKB: promptSizeKB, systemPrompt, userContent, result: null, error: lastErr.message });
  throw lastErr;
}

/**
 * Parse JSON from Claude output, handling markdown fences and truncation.
 */
function safeParseJSON(raw) {
  let s = raw.trim();
  // Strip markdown fences
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  try { return JSON.parse(s); } catch { /* try repairs */ }
  // Truncated array: close open brackets
  let repaired = s;
  if ((repaired.match(/\[/g) || []).length > (repaired.match(/\]/g) || []).length) {
    repaired = repaired.replace(/,?\s*$/, '') + ']';
    try { return JSON.parse(repaired); } catch { /* continue */ }
  }
  // Truncated object: close open braces
  repaired = s.replace(/,?\s*$/, '') + '}';
  try { return JSON.parse(repaired); } catch { /* continue */ }
  // Truncated object inside array
  repaired = s.replace(/,?\s*$/, '') + '"}]';
  try { return JSON.parse(repaired); } catch { /* continue */ }
  throw new SyntaxError(`Cannot parse Claude JSON (${s.length} chars): ${s.slice(0, 100)}…`);
}

module.exports = { init, callGPT, safeParseJSON, GPT_TIMEOUT_MS, STRUCTURAL_GPT_TIMEOUT_MS };
