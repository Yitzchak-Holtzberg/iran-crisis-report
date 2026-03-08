'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const GPT_TIMEOUT_MS = 120_000;            // 2 minutes — routine calls
const STRUCTURAL_GPT_TIMEOUT_MS = 300_000; // 5 minutes — structural deep-update calls
const MAX_GPT_ATTEMPTS = 3;
const GPT_LOG_MAX_BYTES = 10 * 1024 * 1024;

let OPENAI_KEY;
let GPT_LOG_PATH;

function init(openaiKey, logPath) {
  OPENAI_KEY = openaiKey;
  GPT_LOG_PATH = logPath;
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
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: () => Promise.resolve(body),
            json: () => {
              try { return Promise.resolve(JSON.parse(body)); }
              catch (e) { return Promise.reject(e); }
            },
          });
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error(`Request timeout after ${timeoutMs} ms`));
    });
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
      timestamp: new Date().toISOString(),
      model: entry.model,
      bodySizeKB: entry.bodySizeKB,
      resultLength: entry.result ? entry.result.length : 0,
      error: entry.error || null,
    };
    fs.appendFileSync(GPT_LOG_PATH, JSON.stringify(summary) + '\n');
  } catch (e) {
    console.warn(`[callGPT] Failed to write gpt-calls.jsonl: ${e.message}`);
  }
}

/**
 * Call an OpenAI model and return the raw text of the first choice.
 * Retries up to 3 times with exponential backoff on transient errors.
 */
async function callGPT(systemPrompt, userContent, jsonMode = false, model = 'gpt-5-mini', maxTokens = 16384, timeoutMs = GPT_TIMEOUT_MS) {
  const body = {
    model,
    max_completion_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent  },
    ],
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const promptSizeKB = +(body.messages.reduce((s, m) => s + m.content.length, 0) / 1024).toFixed(1);
  let lastErr;
  for (let attempt = 1; attempt <= MAX_GPT_ATTEMPTS; attempt++) {
    try {
      const bodyStr = JSON.stringify(body);
      if (attempt === 1) {
        console.log(`  [callGPT] model=${model} body=${(bodyStr.length / 1024).toFixed(1)}KB`);
      }
      const res = await httpsPost(
        'https://api.openai.com/v1/chat/completions',
        {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
        bodyStr,
        timeoutMs,
      );
      if (!res.ok) {
        const text = (await res.text()).slice(0, 500);
        if ((res.status >= 500 || res.status === 429) && attempt < MAX_GPT_ATTEMPTS) {
          const backoff = res.status === 429 ? 2 ** attempt * 5000 : 2 ** attempt * 1000;
          lastErr = new Error(`OpenAI error ${res.status}: ${text}`);
          console.warn(`  [callGPT] attempt ${attempt}/${MAX_GPT_ATTEMPTS} — ${lastErr.message} — retrying in ${backoff}ms…`);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }
        throw new Error(`OpenAI error ${res.status}: ${text}`);
      }
      const json = await res.json();
      const result = json.choices[0].message.content;
      appendGptLog({ model, bodySizeKB: promptSizeKB, systemPrompt, userContent, result, error: null });
      return result;
    } catch (err) {
      if (err.message && err.message.startsWith('OpenAI error')) throw err;
      const cause = err.cause ? ` (cause: ${err.cause.message || err.cause})` : '';
      lastErr = new Error(`${err.message}${cause}`, { cause: err.cause });
      if (attempt < MAX_GPT_ATTEMPTS) {
        console.warn(`  [callGPT] attempt ${attempt}/${MAX_GPT_ATTEMPTS} — ${lastErr.message} — retrying…`);
        await new Promise(r => setTimeout(r, 2 ** attempt * 1000));
      }
    }
  }
  appendGptLog({ model, bodySizeKB: promptSizeKB, systemPrompt, userContent, result: null, error: lastErr.message });
  throw lastErr;
}

module.exports = { init, callGPT, GPT_TIMEOUT_MS, STRUCTURAL_GPT_TIMEOUT_MS };
