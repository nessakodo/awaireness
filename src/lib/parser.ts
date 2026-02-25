/**
 * Usage Export Parser
 *
 * Parses JSON and CSV exports from AI platforms.
 * Runs entirely client-side. Handles ChatGPT-style exports
 * and generic token usage CSVs.
 *
 * All inputs are sanitized before processing.
 */

import type { UsageRecord, ParseResult } from '@/types';
import { sanitizeNumber, sanitizeDate, sanitizeModelName } from './sanitize';

/** Expected JSON schema for ChatGPT-style exports */
interface ChatGPTExportConversation {
  title?: string;
  create_time?: number;
  mapping?: Record<string, {
    message?: {
      author?: { role?: string };
      content?: { parts?: string[] };
      metadata?: { model_slug?: string };
      create_time?: number;
    };
  }>;
}

/** Generic JSON usage record */
interface GenericJsonRecord {
  date?: string;
  timestamp?: string;
  model?: string;
  model_name?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  tokens?: number;
  conversation_id?: string;
}

/**
 * Parse a JSON string into UsageRecords.
 * Supports ChatGPT export format and generic token-count formats.
 */
export function parseJson(content: string): ParseResult {
  try {
    const data = JSON.parse(content);

    // ChatGPT conversations.json format
    if (Array.isArray(data) && data.length > 0 && data[0].mapping) {
      return parseChatGPTExport(data);
    }

    // Generic array of usage records
    if (Array.isArray(data)) {
      return parseGenericJson(data);
    }

    // Single object with a data/records/usage array
    for (const key of ['data', 'records', 'usage', 'items']) {
      if (Array.isArray(data[key])) {
        return parseGenericJson(data[key]);
      }
    }

    return { success: false, error: 'Unrecognized JSON format. Expected an array of usage records or a ChatGPT conversations export.' };
  } catch (e) {
    return { success: false, error: `Invalid JSON: ${e instanceof Error ? e.message : 'parse error'}` };
  }
}

function parseChatGPTExport(conversations: ChatGPTExportConversation[]): ParseResult {
  const records: UsageRecord[] = [];

  for (const conv of conversations) {
    if (!conv.mapping) continue;

    let convTokens = 0;
    let model = 'gpt-3.5-turbo';
    const messages = Object.values(conv.mapping);

    for (const node of messages) {
      if (!node.message) continue;
      const msg = node.message;

      if (msg.metadata?.model_slug) {
        model = sanitizeModelName(msg.metadata.model_slug);
      }

      // Estimate tokens from message content (rough: 1 token ≈ 4 chars)
      if (msg.content?.parts) {
        const text = msg.content.parts.join('');
        convTokens += Math.ceil(text.length / 4);
      }
    }

    if (convTokens === 0) continue;

    const date = conv.create_time
      ? new Date(conv.create_time * 1000).toISOString().split('T')[0]
      : '';

    records.push({
      date: sanitizeDate(date) || date,
      model,
      promptTokens: Math.floor(convTokens * 0.4),
      completionTokens: Math.floor(convTokens * 0.6),
      totalTokens: convTokens,
      conversationId: conv.title ? `conv-${records.length}` : undefined,
    });
  }

  if (records.length === 0) {
    return { success: false, error: 'No usable conversation data found in export.' };
  }

  return { success: true, data: records, rowCount: records.length };
}

function parseGenericJson(items: GenericJsonRecord[]): ParseResult {
  const records: UsageRecord[] = [];

  for (const item of items) {
    const totalTokens = sanitizeNumber(item.total_tokens || item.tokens);
    if (totalTokens === 0) continue;

    const promptTokens = sanitizeNumber(item.prompt_tokens) || Math.floor(totalTokens * 0.4);
    const completionTokens = sanitizeNumber(item.completion_tokens) || totalTokens - promptTokens;
    const date = sanitizeDate(item.date || item.timestamp);
    const model = sanitizeModelName(item.model || item.model_name);

    records.push({
      date,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      conversationId: item.conversation_id ? String(item.conversation_id) : undefined,
    });
  }

  if (records.length === 0) {
    return { success: false, error: 'No valid usage records found. Each record needs at least a token count.' };
  }

  return { success: true, data: records, rowCount: records.length };
}

/**
 * Parse a CSV string into UsageRecords.
 * Expects headers: date, model, prompt_tokens, completion_tokens, total_tokens
 */
export function parseCsv(content: string): ParseResult {
  try {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      return { success: false, error: 'CSV must have a header row and at least one data row.' };
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
    const records: UsageRecord[] = [];

    // Map column names
    const colDate = headers.findIndex((h) => ['date', 'timestamp', 'time', 'created_at'].includes(h));
    const colModel = headers.findIndex((h) => ['model', 'model_name', 'model_id'].includes(h));
    const colPrompt = headers.findIndex((h) => ['prompt_tokens', 'input_tokens'].includes(h));
    const colCompletion = headers.findIndex((h) => ['completion_tokens', 'output_tokens'].includes(h));
    const colTotal = headers.findIndex((h) => ['total_tokens', 'tokens'].includes(h));
    const colConv = headers.findIndex((h) => ['conversation_id', 'conv_id', 'session_id'].includes(h));

    if (colTotal === -1 && colPrompt === -1) {
      return {
        success: false,
        error: 'CSV must include a "total_tokens" or "prompt_tokens" column. Found columns: ' + headers.join(', '),
      };
    }

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map((v) => v.trim().replace(/['"]/g, ''));
      if (vals.length < headers.length) continue;

      const prompt = colPrompt >= 0 ? sanitizeNumber(vals[colPrompt]) : 0;
      const completion = colCompletion >= 0 ? sanitizeNumber(vals[colCompletion]) : 0;
      let total = colTotal >= 0 ? sanitizeNumber(vals[colTotal]) : prompt + completion;
      if (total === 0) total = prompt + completion;
      if (total === 0) continue;

      records.push({
        date: colDate >= 0 ? sanitizeDate(vals[colDate]) : '',
        model: colModel >= 0 ? sanitizeModelName(vals[colModel]) : 'unknown',
        promptTokens: prompt || Math.floor(total * 0.4),
        completionTokens: completion || total - (prompt || Math.floor(total * 0.4)),
        totalTokens: total,
        conversationId: colConv >= 0 ? vals[colConv] || undefined : undefined,
      });
    }

    if (records.length === 0) {
      return { success: false, error: 'No valid rows found in CSV.' };
    }

    return { success: true, data: records, rowCount: records.length };
  } catch (e) {
    return { success: false, error: `CSV parse error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
}

/** Detect format and parse */
export function parseUsageExport(content: string, filename: string): ParseResult {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'csv' || ext === 'tsv') {
    return parseCsv(content);
  }
  // Default to JSON
  return parseJson(content);
}

/** Mock schema for documentation */
export const MOCK_SCHEMA = {
  json: {
    description: 'Array of usage records',
    example: [
      {
        date: '2024-01-15',
        model: 'gpt-4',
        prompt_tokens: 500,
        completion_tokens: 800,
        total_tokens: 1300,
        conversation_id: 'abc-123',
      },
    ],
  },
  csv: {
    description: 'CSV with headers: date, model, prompt_tokens, completion_tokens, total_tokens',
    example: 'date,model,prompt_tokens,completion_tokens,total_tokens\n2024-01-15,gpt-4,500,800,1300',
  },
  chatgpt: {
    description: 'ChatGPT conversations.json from Settings > Data Controls > Export',
    note: 'Token counts are estimated from message character length (1 token ≈ 4 chars)',
  },
};
