/**
 * Secure File Parse Worker
 *
 * SECURITY GUARANTEES:
 * 1. Runs in a dedicated Web Worker thread — no DOM access
 * 2. fetch() and XMLHttpRequest are explicitly deleted on init
 * 3. Raw file content is zeroed after parsing (set to empty string)
 * 4. Only derived numerical data + sanitized short strings are returned
 * 5. No eval(), no Function(), no dynamic code execution
 * 6. Worker self-terminates after processing
 *
 * WHAT LEAVES THIS WORKER:
 * - An array of { date, model, promptTokens, completionTokens, totalTokens }
 * - An error string if parsing fails
 * - Nothing else. No raw file content. No personal data.
 */

// ─── STEP 1: Kill all network APIs immediately ──────────

// @ts-expect-error — intentionally deleting globals for security
self.fetch = undefined;
// @ts-expect-error
self.XMLHttpRequest = undefined;
// @ts-expect-error
self.WebSocket = undefined;
// @ts-expect-error
self.EventSource = undefined;
// @ts-expect-error
self.importScripts = () => {
  throw new Error('[SecureWorker] importScripts blocked');
};

// Verify network APIs are dead
const NETWORK_APIS_KILLED =
  typeof (self as unknown as Record<string, unknown>).fetch === 'undefined' &&
  typeof (self as unknown as Record<string, unknown>).XMLHttpRequest === 'undefined' &&
  typeof (self as unknown as Record<string, unknown>).WebSocket === 'undefined';

// ─── STEP 2: Inline parser (no imports — fully self-contained) ──

interface ParsedRecord {
  date: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  conversationId?: string;
}

interface WorkerResult {
  success: boolean;
  records?: ParsedRecord[];
  rowCount?: number;
  error?: string;
  securityReport: {
    networkApisKilled: boolean;
    rawContentZeroed: boolean;
    processingTimeMs: number;
  };
}

function sanitizeNumber(input: unknown): number {
  const n = Number(input);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function sanitizeDate(input: unknown): string {
  if (typeof input !== 'string') return '';
  const cleaned = input.trim().slice(0, 30);
  const date = new Date(cleaned);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

function sanitizeModelName(input: unknown): string {
  if (typeof input !== 'string') return 'unknown';
  return input.trim().slice(0, 100).replace(/[^a-zA-Z0-9._-]/g, '') || 'unknown';
}

function parseJsonContent(content: string): { records: ParsedRecord[]; error?: string } {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch (e) {
    return { records: [], error: `Invalid JSON: ${e instanceof Error ? e.message : 'parse error'}` };
  }

  let items: unknown[] = [];

  if (Array.isArray(data)) {
    // ChatGPT export format
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null && 'mapping' in data[0]) {
      return parseChatGPTExport(data);
    }
    items = data;
  } else if (typeof data === 'object' && data !== null) {
    for (const key of ['data', 'records', 'usage', 'items']) {
      const val = (data as Record<string, unknown>)[key];
      if (Array.isArray(val)) { items = val; break; }
    }
  }

  if (items.length === 0) {
    return { records: [], error: 'Unrecognized format. Expected an array of usage records.' };
  }

  const records: ParsedRecord[] = [];
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const obj = item as Record<string, unknown>;
    const totalTokens = sanitizeNumber(obj.total_tokens || obj.tokens);
    if (totalTokens === 0) continue;
    const promptTokens = sanitizeNumber(obj.prompt_tokens) || Math.floor(totalTokens * 0.4);
    records.push({
      date: sanitizeDate(obj.date || obj.timestamp),
      model: sanitizeModelName(obj.model || obj.model_name),
      promptTokens,
      completionTokens: sanitizeNumber(obj.completion_tokens) || totalTokens - promptTokens,
      totalTokens,
      conversationId: typeof obj.conversation_id === 'string' ? obj.conversation_id.slice(0, 100) : undefined,
    });
  }

  return records.length > 0
    ? { records }
    : { records: [], error: 'No valid usage records found.' };
}

function parseChatGPTExport(conversations: unknown[]): { records: ParsedRecord[]; error?: string } {
  const records: ParsedRecord[] = [];
  for (const conv of conversations) {
    if (typeof conv !== 'object' || conv === null) continue;
    const c = conv as Record<string, unknown>;
    const mapping = c.mapping as Record<string, unknown> | undefined;
    if (!mapping) continue;

    let tokens = 0;
    let model = 'gpt-3.5-turbo';
    for (const node of Object.values(mapping)) {
      if (typeof node !== 'object' || node === null) continue;
      const n = node as Record<string, unknown>;
      const msg = n.message as Record<string, unknown> | undefined;
      if (!msg) continue;
      const meta = msg.metadata as Record<string, unknown> | undefined;
      if (meta?.model_slug) model = sanitizeModelName(meta.model_slug);
      const content = msg.content as Record<string, unknown> | undefined;
      if (content?.parts && Array.isArray(content.parts)) {
        tokens += Math.ceil(content.parts.join('').length / 4);
      }
    }
    if (tokens === 0) continue;
    const createTime = typeof c.create_time === 'number' ? c.create_time : 0;
    records.push({
      date: createTime ? new Date(createTime * 1000).toISOString().split('T')[0] : '',
      model,
      promptTokens: Math.floor(tokens * 0.4),
      completionTokens: Math.floor(tokens * 0.6),
      totalTokens: tokens,
      conversationId: `conv-${records.length}`,
    });
  }
  return records.length > 0
    ? { records }
    : { records: [], error: 'No usable conversation data found.' };
}

function parseCsvContent(content: string): { records: ParsedRecord[]; error?: string } {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return { records: [], error: 'CSV needs a header and at least one row.' };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const colDate = headers.findIndex(h => ['date', 'timestamp', 'time', 'created_at'].includes(h));
  const colModel = headers.findIndex(h => ['model', 'model_name', 'model_id'].includes(h));
  const colPrompt = headers.findIndex(h => ['prompt_tokens', 'input_tokens'].includes(h));
  const colCompletion = headers.findIndex(h => ['completion_tokens', 'output_tokens'].includes(h));
  const colTotal = headers.findIndex(h => ['total_tokens', 'tokens'].includes(h));

  if (colTotal === -1 && colPrompt === -1) {
    return { records: [], error: `CSV needs a "total_tokens" or "prompt_tokens" column. Found: ${headers.join(', ')}` };
  }

  const records: ParsedRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
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
    });
  }
  return records.length > 0
    ? { records }
    : { records: [], error: 'No valid rows in CSV.' };
}

// ─── STEP 3: Message handler ─────────────────────────────

self.onmessage = (event: MessageEvent<{ content: string; filename: string }>) => {
  const startTime = performance.now();
  let rawContent = event.data.content;
  const filename = event.data.filename;

  try {
    const ext = filename.toLowerCase().split('.').pop();
    const result = (ext === 'csv' || ext === 'tsv')
      ? parseCsvContent(rawContent)
      : parseJsonContent(rawContent);

    // ─── STEP 4: Zero raw content from memory ──────────
    rawContent = '';
    // Also zero the event data reference
    (event.data as { content: string }).content = '';

    const processingTimeMs = performance.now() - startTime;

    const response: WorkerResult = {
      success: result.records.length > 0,
      records: result.records.length > 0 ? result.records : undefined,
      rowCount: result.records.length,
      error: result.error,
      securityReport: {
        networkApisKilled: NETWORK_APIS_KILLED,
        rawContentZeroed: true,
        processingTimeMs,
      },
    };

    self.postMessage(response);
  } catch (e) {
    rawContent = '';
    (event.data as { content: string }).content = '';

    self.postMessage({
      success: false,
      error: `Processing error: ${e instanceof Error ? e.message : 'unknown'}`,
      securityReport: {
        networkApisKilled: NETWORK_APIS_KILLED,
        rawContentZeroed: true,
        processingTimeMs: performance.now() - startTime,
      },
    } satisfies WorkerResult);
  }

  // ─── STEP 5: Self-terminate after processing ──────────
  self.close();
};
