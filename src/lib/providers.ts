/**
 * AI Provider Usage APIs
 *
 * Normalizes usage data from OpenAI and Anthropic into our standard format.
 * All calls go through our local proxy to avoid CORS issues.
 * The proxy stores nothing, logs nothing, and strips the key after use.
 */

import type { UsageRecord } from '@/types';
import { sanitizeModelName } from './sanitize';

export type Provider = 'openai' | 'anthropic';

export interface ProviderConfig {
  id: Provider;
  name: string;
  keyPrefix: string;
  keyPlaceholder: string;
  instructions: string[];
  keyUrl: string;
  permissionNote: string;
}

export const PROVIDERS: Record<Provider, ProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    keyPrefix: 'sk-admin-',
    keyPlaceholder: 'sk-admin-...',
    keyUrl: 'https://platform.openai.com/settings/organization/admin-keys',
    permissionNote: 'Important: A regular API key (sk-proj-...) will NOT work. You need an Admin key (sk-admin-...). This only reads API usage — ChatGPT web conversations are not included in the API.',
    instructions: [
      'Go to platform.openai.com/settings/organization/admin-keys (not the regular API keys page)',
      'Click "Create admin key" — name it anything (e.g. "awaireness-temp")',
      'Under permissions, enable "Usage: Read" — that\'s all we need',
      'Copy the key (it starts with sk-admin-) and paste it below',
      'After we fetch your data, go back and revoke the key immediately',
    ],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    keyPrefix: 'sk-ant-admin-',
    keyPlaceholder: 'sk-ant-admin-...',
    keyUrl: 'https://console.anthropic.com/settings/admin-keys',
    permissionNote: 'Requires an Admin API key with organization usage read access. Regular API keys cannot access usage data.',
    instructions: [
      'Go to console.anthropic.com → Settings → Admin API Keys',
      'Create an admin key with usage read permissions',
      'Copy the key and paste it below',
      'After we fetch your data, revoke the key immediately',
    ],
  },
};

/** Fetch usage data through our local proxy */
export async function fetchUsageViaProxy(
  provider: Provider,
  apiKey: string,
  days: number = 30,
): Promise<{ records: UsageRecord[]; error?: string }> {
  const res = await fetch('/api/usage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, apiKey, days }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { records: [], error: body.error || `Provider returned ${res.status}` };
  }

  const body = await res.json();
  return { records: body.records || [], error: body.error };
}

/** Normalize OpenAI usage API response into our records format */
export function normalizeOpenAIUsage(data: OpenAIUsageResponse): UsageRecord[] {
  const records: UsageRecord[] = [];

  for (const bucket of data.data || []) {
    const date = new Date(bucket.start_time * 1000).toISOString().split('T')[0];

    for (const result of bucket.results || []) {
      const inputTokens = result.input_tokens || 0;
      const outputTokens = result.output_tokens || 0;
      const total = inputTokens + outputTokens;
      if (total === 0) continue;

      records.push({
        date,
        model: sanitizeModelName(result.model || 'unknown'),
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: total,
      });
    }
  }

  return records;
}

/** Normalize Anthropic usage API response */
export function normalizeAnthropicUsage(data: AnthropicUsageResponse): UsageRecord[] {
  const records: UsageRecord[] = [];

  for (const item of data.data || []) {
    const inputTokens = item.input_tokens || 0;
    const outputTokens = item.output_tokens || 0;
    const total = inputTokens + outputTokens;
    if (total === 0) continue;

    records.push({
      date: item.date || new Date(item.timestamp * 1000).toISOString().split('T')[0],
      model: sanitizeModelName(item.model || 'unknown'),
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens: total,
    });
  }

  return records;
}

// --- Provider response types ---

interface OpenAIUsageResponse {
  data: Array<{
    start_time: number;
    end_time: number;
    results: Array<{
      input_tokens?: number;
      output_tokens?: number;
      model?: string;
      num_model_requests?: number;
    }>;
  }>;
  has_more?: boolean;
  next_page?: string;
}

interface AnthropicUsageResponse {
  data: Array<{
    date?: string;
    timestamp: number;
    model?: string;
    input_tokens?: number;
    output_tokens?: number;
  }>;
}
