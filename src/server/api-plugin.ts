/**
 * Vite Dev Server API Middleware
 *
 * Handles /api/usage requests during local development.
 * Proxies to OpenAI/Anthropic usage APIs without storing anything.
 *
 * Privacy guarantees:
 * - API key is used for requests, then discarded
 * - No request logging, no body logging
 * - Response is normalized and returned — raw data is not persisted
 */

import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

export function apiPlugin(): Plugin {
  return {
    name: 'awaireness-api',
    configureServer(server) {
      server.middlewares.use('/api/usage', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const chunks: Uint8Array[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Uint8Array);
        }

        let body: { provider?: string; apiKey?: string; days?: number };
        try {
          body = JSON.parse(Buffer.concat(chunks).toString());
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          return;
        }

        const { provider, apiKey, days = 30 } = body;

        if (!provider || !apiKey) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing provider or apiKey' }));
          return;
        }

        try {
          let records;
          if (provider === 'openai') {
            records = await fetchOpenAIUsage(apiKey, days);
          } else if (provider === 'anthropic') {
            records = await fetchAnthropicUsage(apiKey, days);
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Unknown provider: ${provider}` }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ records }));
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: message }));
        }
      });
    },
  };
}

// ─── OpenAI ──────────────────────────────────────────────

/**
 * OpenAI key types:
 *   sk-admin-...  → Admin key, can access /v1/organization/usage/*
 *   sk-proj-...   → Project key, can only access project-scoped APIs
 *   sk-...        → Legacy user key, limited org access
 *
 * The organization/usage endpoints REQUIRE an admin key.
 * Regular "read all" project keys cannot access usage data.
 * We detect the key type and give specific guidance.
 */
async function fetchOpenAIUsage(apiKey: string, days: number) {
  const keyType = detectOpenAIKeyType(apiKey);

  if (keyType === 'project') {
    throw new Error(
      'You have a project API key (sk-proj-...). OpenAI requires an Admin API key to read usage data. ' +
      'Go to platform.openai.com/settings/organization/admin-keys → Create a new admin key with "Usage: Read" permission.'
    );
  }

  if (keyType === 'unknown') {
    throw new Error(
      'This doesn\'t look like a valid OpenAI API key. Keys start with "sk-admin-" (admin) or "sk-proj-" (project). ' +
      'You need an admin key — create one at platform.openai.com/settings/organization/admin-keys'
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const start = now - days * 86400;

  // Try completions usage first (most common), then fall back to costs
  const completions = await fetchOpenAIEndpoint(
    'https://api.openai.com/v1/organization/usage/completions',
    { start_time: start, end_time: now, bucket_width: '1d', limit: days + 1 },
    apiKey,
  );

  // Also try embeddings, images, audio — users may use more than chat
  const [embeddings, images] = await Promise.allSettled([
    fetchOpenAIEndpoint(
      'https://api.openai.com/v1/organization/usage/embeddings',
      { start_time: start, end_time: now, bucket_width: '1d', limit: days + 1 },
      apiKey,
    ),
    fetchOpenAIEndpoint(
      'https://api.openai.com/v1/organization/usage/images',
      { start_time: start, end_time: now, bucket_width: '1d', limit: days + 1 },
      apiKey,
    ),
  ]);

  const records = [
    ...normalizeOpenAIBuckets(completions),
    ...(embeddings.status === 'fulfilled' ? normalizeOpenAIBuckets(embeddings.value) : []),
    ...(images.status === 'fulfilled' ? normalizeOpenAIImages(images.value) : []),
  ];

  if (records.length === 0) {
    // Surface what the API actually returned for debugging
    const dataShape = JSON.stringify({
      completions_buckets: completions.data?.length ?? 0,
      completions_sample: completions.data?.[0] ?? null,
      has_more: completions.has_more ?? false,
    });
    throw new Error(
      `OpenAI returned data but no token usage was found in the last ${days} days. ` +
      `This could mean: (1) No API usage in this period — ChatGPT web usage is NOT included, only API calls. ` +
      `(2) Usage exists on a different organization. ` +
      `Debug info: ${dataShape}`
    );
  }

  return records;
}

function detectOpenAIKeyType(key: string): 'admin' | 'project' | 'legacy' | 'unknown' {
  if (key.startsWith('sk-admin-')) return 'admin';
  if (key.startsWith('sk-proj-')) return 'project';
  if (key.startsWith('sk-') && key.length > 20) return 'legacy';
  return 'unknown';
}

interface OpenAIApiResponse {
  data?: Array<{
    start_time: number;
    end_time: number;
    results?: Array<{
      input_tokens?: number;
      output_tokens?: number;
      model?: string;
      num_model_requests?: number;
      // images use different fields
      num_images?: number;
      image_size?: string;
    }>;
  }>;
  has_more?: boolean;
  next_page?: string;
  object?: string;
  error?: { message?: string; type?: string; code?: string };
}

async function fetchOpenAIEndpoint(
  baseUrl: string,
  params: Record<string, string | number>,
  apiKey: string,
): Promise<OpenAIApiResponse> {
  const url = new URL(baseUrl);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errBody = await response.text();
    let parsed: { error?: { message?: string } } = {};
    try { parsed = JSON.parse(errBody); } catch { /* raw text is fine */ }

    const detail = parsed.error?.message || errBody.slice(0, 300);

    if (response.status === 401) {
      throw new Error(
        `Authentication failed (401). ${detail}. ` +
        'Make sure you\'re using an Admin API key (starts with sk-admin-), not a project or user key.'
      );
    }
    if (response.status === 403) {
      throw new Error(
        `Permission denied (403). ${detail}. ` +
        'Your admin key needs the "Usage: Read" permission. ' +
        'Edit it at platform.openai.com/settings/organization/admin-keys'
      );
    }
    throw new Error(`OpenAI API ${response.status}: ${detail}`);
  }

  return response.json();
}

function normalizeOpenAIBuckets(data: OpenAIApiResponse) {
  const records = [];
  for (const bucket of data.data || []) {
    const date = new Date(bucket.start_time * 1000).toISOString().split('T')[0];
    for (const result of bucket.results || []) {
      const input = result.input_tokens || 0;
      const output = result.output_tokens || 0;
      const total = input + output;
      if (total === 0) continue;
      records.push({
        date,
        model: (result.model || 'unknown').replace(/[^a-zA-Z0-9._-]/g, ''),
        promptTokens: input,
        completionTokens: output,
        totalTokens: total,
      });
    }
  }
  return records;
}

function normalizeOpenAIImages(data: OpenAIApiResponse) {
  // Image generation doesn't have token counts — estimate from request count
  const records = [];
  for (const bucket of data.data || []) {
    const date = new Date(bucket.start_time * 1000).toISOString().split('T')[0];
    for (const result of bucket.results || []) {
      const numImages = result.num_images || 0;
      if (numImages === 0) continue;
      // Rough estimate: each image generation ≈ 1000 tokens of compute equivalent
      const estimated = numImages * 1000;
      records.push({
        date,
        model: (result.model || 'dall-e').replace(/[^a-zA-Z0-9._-]/g, ''),
        promptTokens: estimated,
        completionTokens: 0,
        totalTokens: estimated,
      });
    }
  }
  return records;
}

// ─── Anthropic ───────────────────────────────────────────

async function fetchAnthropicUsage(apiKey: string, days: number) {
  const now = new Date();
  const start = new Date(now.getTime() - days * 86400000);
  const startStr = start.toISOString().split('T')[0];
  const endStr = now.toISOString().split('T')[0];

  const url = `https://api.anthropic.com/v1/organizations/usage?start_date=${startStr}&end_date=${endStr}`;

  const response = await fetch(url, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errBody = await response.text();
    if (response.status === 401) {
      throw new Error('Invalid API key (401). Check your key at console.anthropic.com.');
    }
    if (response.status === 403) {
      throw new Error('Permission denied (403). You need an admin key with organization usage read access.');
    }
    throw new Error(`Anthropic API ${response.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await response.json();

  const records = [];
  for (const item of data.data || []) {
    const input = item.input_tokens || 0;
    const output = item.output_tokens || 0;
    const total = input + output;
    if (total === 0) continue;
    records.push({
      date: item.date || '',
      model: (item.model || 'unknown').replace(/[^a-zA-Z0-9._-]/g, ''),
      promptTokens: input,
      completionTokens: output,
      totalTokens: total,
    });
  }

  if (records.length === 0) {
    const shape = JSON.stringify({ raw_data_length: data.data?.length ?? 0, sample: data.data?.[0] ?? null });
    throw new Error(`Anthropic returned data but no token usage found in the last ${days} days. Debug info: ${shape}`);
  }

  return records;
}
