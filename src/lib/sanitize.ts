/**
 * Input Sanitization
 *
 * All user-provided data is sanitized before display or processing.
 * Defense against XSS and injection from malicious export files.
 */

const ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

const ENTITY_RE = /[&<>"'`/]/g;

/** Escape HTML entities in a string */
export function escapeHtml(str: string): string {
  return str.replace(ENTITY_RE, (char) => ENTITY_MAP[char] || char);
}

/** Sanitize a string for safe display — strips tags, trims, limits length */
export function sanitizeText(input: unknown, maxLength = 1000): string {
  if (typeof input !== 'string') return '';
  return escapeHtml(input.trim().slice(0, maxLength));
}

/** Sanitize a number — returns 0 for non-finite values */
export function sanitizeNumber(input: unknown): number {
  const n = Number(input);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** Sanitize a date string — returns empty string for invalid dates */
export function sanitizeDate(input: unknown): string {
  if (typeof input !== 'string') return '';
  const cleaned = input.trim().slice(0, 30);
  const date = new Date(cleaned);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

/** Validate and sanitize a model name */
export function sanitizeModelName(input: unknown): string {
  if (typeof input !== 'string') return 'unknown';
  // Only allow alphanumeric, hyphens, dots, underscores
  const cleaned = input.trim().slice(0, 100).replace(/[^a-zA-Z0-9._-]/g, '');
  return cleaned || 'unknown';
}
