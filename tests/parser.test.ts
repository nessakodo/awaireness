import { describe, it, expect } from 'vitest';
import { parseJson, parseCsv, parseUsageExport } from '../src/lib/parser';

describe('parseJson', () => {
  it('parses generic JSON array of usage records', () => {
    const input = JSON.stringify([
      { date: '2024-01-15', model: 'gpt-4', total_tokens: 1000, prompt_tokens: 400, completion_tokens: 600 },
      { date: '2024-01-16', model: 'gpt-3.5-turbo', total_tokens: 500 },
    ]);

    const result = parseJson(input);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data![0].totalTokens).toBe(1000);
    expect(result.data![0].model).toBe('gpt-4');
    expect(result.data![1].promptTokens).toBe(200); // 40% of 500
  });

  it('parses JSON with nested data key', () => {
    const input = JSON.stringify({
      data: [{ total_tokens: 500, model: 'gpt-4', date: '2024-01-01' }],
    });

    const result = parseJson(input);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it('rejects empty array', () => {
    const result = parseJson('[]');
    expect(result.success).toBe(false);
    expect(result.error).toContain('No valid');
  });

  it('rejects invalid JSON', () => {
    const result = parseJson('not json at all');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON');
  });

  it('rejects object without recognized structure', () => {
    const result = parseJson('{"foo": "bar"}');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unrecognized');
  });

  it('skips records with zero tokens', () => {
    const input = JSON.stringify([
      { total_tokens: 0, model: 'gpt-4' },
      { total_tokens: 1000, model: 'gpt-4', date: '2024-01-01' },
    ]);

    const result = parseJson(input);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it('sanitizes model names', () => {
    const input = JSON.stringify([
      { total_tokens: 1000, model: '<script>alert("xss")</script>' },
    ]);

    const result = parseJson(input);
    expect(result.success).toBe(true);
    expect(result.data![0].model).not.toContain('<');
    expect(result.data![0].model).not.toContain('>');
  });

  it('handles "tokens" field as alias for total_tokens', () => {
    const input = JSON.stringify([{ tokens: 800, model: 'gpt-4' }]);
    const result = parseJson(input);
    expect(result.success).toBe(true);
    expect(result.data![0].totalTokens).toBe(800);
  });
});

describe('parseCsv', () => {
  it('parses standard CSV', () => {
    const csv = `date,model,prompt_tokens,completion_tokens,total_tokens
2024-01-15,gpt-4,400,600,1000
2024-01-16,gpt-3.5-turbo,200,300,500`;

    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data![0].date).toBe('2024-01-15');
    expect(result.data![0].totalTokens).toBe(1000);
  });

  it('handles alternative column names', () => {
    const csv = `timestamp,model_name,input_tokens,output_tokens,tokens
2024-01-15,claude-3,300,700,1000`;

    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.data![0].model).toBe('claude-3');
    expect(result.data![0].totalTokens).toBe(1000);
  });

  it('rejects CSV without token columns', () => {
    const csv = `name,date\nfoo,2024-01-01`;
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
    expect(result.error).toContain('total_tokens');
  });

  it('rejects single-line CSV', () => {
    const csv = 'date,total_tokens';
    const result = parseCsv(csv);
    expect(result.success).toBe(false);
  });

  it('calculates total from prompt + completion if total missing', () => {
    const csv = `date,model,prompt_tokens,completion_tokens
2024-01-15,gpt-4,400,600`;

    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.data![0].totalTokens).toBe(1000);
  });

  it('handles quoted values', () => {
    const csv = `"date","model","total_tokens"
"2024-01-15","gpt-4","1000"`;

    const result = parseCsv(csv);
    expect(result.success).toBe(true);
    expect(result.data![0].totalTokens).toBe(1000);
  });
});

describe('parseUsageExport', () => {
  it('routes .csv to CSV parser', () => {
    const csv = `date,total_tokens\n2024-01-15,1000`;
    const result = parseUsageExport(csv, 'export.csv');
    expect(result.success).toBe(true);
  });

  it('routes .json to JSON parser', () => {
    const json = JSON.stringify([{ total_tokens: 1000 }]);
    const result = parseUsageExport(json, 'data.json');
    expect(result.success).toBe(true);
  });

  it('defaults to JSON for unknown extensions', () => {
    const json = JSON.stringify([{ total_tokens: 1000 }]);
    const result = parseUsageExport(json, 'data.txt');
    expect(result.success).toBe(true);
  });
});
