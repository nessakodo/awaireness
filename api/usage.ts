/**
 * Vercel Serverless Function — /api/usage
 *
 * Proxies usage API calls to OpenAI/Anthropic for production.
 *
 * SECURITY:
 * - API key used for one request cycle, then out of scope (GC eligible)
 * - No logging of request bodies or API keys
 * - No database, no file system, no persistent state
 * - Response contains only aggregated token counts
 * - Cache-Control: no-store prevents any caching
 */

export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders(),
    });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: { provider?: string; apiKey?: string; days?: number };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { provider, apiKey, days = 30 } = body;
  if (!provider || !apiKey) {
    return json({ error: 'Missing provider or apiKey' }, 400);
  }

  try {
    let records;
    if (provider === 'openai') {
      records = await fetchOpenAI(apiKey, days);
    } else if (provider === 'anthropic') {
      records = await fetchAnthropic(apiKey, days);
    } else {
      return json({ error: `Unknown provider: ${provider}` }, 400);
    }
    return json({ records });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 502);
  }
}

// ─── Helpers ──────────────────────────────────────────────

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

interface UsageRecord {
  date: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ─── OpenAI ──────────────────────────────────────────────

async function fetchOpenAI(apiKey: string, days: number): Promise<UsageRecord[]> {
  if (apiKey.startsWith('sk-proj-')) {
    throw new Error('Project keys (sk-proj-...) cannot read usage data. You need an Admin key (sk-admin-...).');
  }
  if (apiKey.startsWith('sk-') && !apiKey.startsWith('sk-admin-') && apiKey.length > 20) {
    throw new Error('Standard API keys cannot read usage data. Create an Admin key (sk-admin-...) at platform.openai.com/settings/organization/admin-keys');
  }

  const now = Math.floor(Date.now() / 1000);
  const start = now - days * 86400;

  const completions = await callOpenAI('https://api.openai.com/v1/organization/usage/completions', start, now, days, apiKey);
  const [embeddings, images] = await Promise.allSettled([
    callOpenAI('https://api.openai.com/v1/organization/usage/embeddings', start, now, days, apiKey),
    callOpenAI('https://api.openai.com/v1/organization/usage/images', start, now, days, apiKey),
  ]);

  const records = [
    ...normalizeBuckets(completions),
    ...(embeddings.status === 'fulfilled' ? normalizeBuckets(embeddings.value) : []),
    ...(images.status === 'fulfilled' ? normalizeBuckets(images.value) : []),
  ];

  if (records.length === 0) {
    throw new Error(
      `No API usage found in the last ${days} days. ` +
      'Note: This only shows API calls. ChatGPT web conversations are NOT included. ' +
      'Use Import mode for web/app usage.'
    );
  }

  return records;
}

async function callOpenAI(baseUrl: string, start: number, end: number, days: number, apiKey: string) {
  const url = `${baseUrl}?start_time=${start}&end_time=${end}&bucket_width=1d&limit=${days + 1}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    let detail = text.slice(0, 300);
    try { detail = JSON.parse(text).error?.message || detail; } catch { /* use raw */ }
    if (res.status === 401) throw new Error(`Auth failed (401): ${detail}`);
    if (res.status === 403) throw new Error(`Permission denied (403): ${detail}`);
    throw new Error(`OpenAI ${res.status}: ${detail}`);
  }
  return res.json();
}

interface BucketResponse {
  data?: Array<{
    start_time: number;
    results?: Array<{
      input_tokens?: number;
      output_tokens?: number;
      model?: string;
    }>;
  }>;
}

function normalizeBuckets(data: BucketResponse): UsageRecord[] {
  const records: UsageRecord[] = [];
  for (const bucket of data.data || []) {
    const date = new Date(bucket.start_time * 1000).toISOString().split('T')[0];
    for (const r of bucket.results || []) {
      const input = r.input_tokens || 0;
      const output = r.output_tokens || 0;
      if (input + output === 0) continue;
      records.push({
        date,
        model: (r.model || 'unknown').replace(/[^a-zA-Z0-9._-]/g, ''),
        promptTokens: input,
        completionTokens: output,
        totalTokens: input + output,
      });
    }
  }
  return records;
}

// ─── Anthropic ───────────────────────────────────────────

async function fetchAnthropic(apiKey: string, days: number): Promise<UsageRecord[]> {
  const now = new Date();
  const start = new Date(now.getTime() - days * 86400000);
  const url = `https://api.anthropic.com/v1/organizations/usage?start_date=${start.toISOString().split('T')[0]}&end_date=${now.toISOString().split('T')[0]}`;

  const res = await fetch(url, {
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) throw new Error('Invalid API key (401).');
    if (res.status === 403) throw new Error('Permission denied (403). Need admin key with usage access.');
    throw new Error(`Anthropic ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const records: UsageRecord[] = [];
  for (const item of data.data || []) {
    const input = item.input_tokens || 0;
    const output = item.output_tokens || 0;
    if (input + output === 0) continue;
    records.push({
      date: item.date || '',
      model: (item.model || 'unknown').replace(/[^a-zA-Z0-9._-]/g, ''),
      promptTokens: input,
      completionTokens: output,
      totalTokens: input + output,
    });
  }

  if (records.length === 0) {
    throw new Error(`No usage found in last ${days} days.`);
  }
  return records;
}
