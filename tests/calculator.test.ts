import { describe, it, expect } from 'vitest';
import {
  waterLitersFromTokens,
  energyKwhFromTokens,
  co2GramsFromKwh,
  calculateMetrics,
} from '../src/lib/calculator';
import type { UsageRecord } from '../src/types';

describe('waterLitersFromTokens', () => {
  it('returns 0 for 0 tokens', () => {
    expect(waterLitersFromTokens(0)).toBe(0);
  });

  it('calculates correctly for 1M tokens', () => {
    // (1_000_000 / 1000) * 0.5 mL / 1000 = 0.5 L
    expect(waterLitersFromTokens(1_000_000)).toBeCloseTo(0.5, 4);
  });

  it('handles small token counts', () => {
    // (1000 / 1000) * 0.5 / 1000 = 0.0005 L
    expect(waterLitersFromTokens(1000)).toBeCloseTo(0.0005, 6);
  });
});

describe('energyKwhFromTokens', () => {
  it('returns 0 for 0 tokens', () => {
    expect(energyKwhFromTokens(0)).toBe(0);
  });

  it('calculates correctly for 1M tokens', () => {
    // (1_000_000 / 1000) * 0.001 = 1.0 kWh
    expect(energyKwhFromTokens(1_000_000)).toBeCloseTo(1.0, 4);
  });
});

describe('co2GramsFromKwh', () => {
  it('returns 0 for 0 kWh', () => {
    expect(co2GramsFromKwh(0)).toBe(0);
  });

  it('calculates correctly for 1 kWh', () => {
    // 1 * 400 = 400g
    expect(co2GramsFromKwh(1)).toBe(400);
  });
});

describe('calculateMetrics', () => {
  it('handles empty records', () => {
    const result = calculateMetrics([]);
    expect(result.totalTokens).toBe(0);
    expect(result.waterLiters).toBe(0);
    expect(result.energyKwh).toBe(0);
    expect(result.co2Grams).toBe(0);
    expect(result.byDay).toEqual([]);
    expect(result.byModel).toEqual([]);
  });

  it('calculates correct totals from records', () => {
    const records: UsageRecord[] = [
      { date: '2024-01-15', model: 'gpt-4', promptTokens: 400, completionTokens: 600, totalTokens: 1000 },
      { date: '2024-01-15', model: 'gpt-4', promptTokens: 500, completionTokens: 500, totalTokens: 1000 },
      { date: '2024-01-16', model: 'gpt-3.5-turbo', promptTokens: 200, completionTokens: 300, totalTokens: 500 },
    ];

    const result = calculateMetrics(records);

    expect(result.totalTokens).toBe(2500);
    expect(result.totalPrompts).toBe(3);
    expect(result.waterLiters).toBeCloseTo(waterLitersFromTokens(2500), 6);
    expect(result.energyKwh).toBeCloseTo(energyKwhFromTokens(2500), 6);
    expect(result.co2Grams).toBeCloseTo(co2GramsFromKwh(energyKwhFromTokens(2500)), 4);
  });

  it('produces correct daily breakdown', () => {
    const records: UsageRecord[] = [
      { date: '2024-01-15', model: 'gpt-4', promptTokens: 400, completionTokens: 600, totalTokens: 1000 },
      { date: '2024-01-15', model: 'gpt-4', promptTokens: 500, completionTokens: 500, totalTokens: 1000 },
      { date: '2024-01-16', model: 'gpt-4', promptTokens: 200, completionTokens: 300, totalTokens: 500 },
    ];

    const result = calculateMetrics(records);

    expect(result.byDay).toHaveLength(2);
    expect(result.byDay[0].date).toBe('2024-01-15');
    expect(result.byDay[0].tokens).toBe(2000);
    expect(result.byDay[1].date).toBe('2024-01-16');
    expect(result.byDay[1].tokens).toBe(500);
  });

  it('produces correct model breakdown', () => {
    const records: UsageRecord[] = [
      { date: '2024-01-15', model: 'gpt-4', promptTokens: 600, completionTokens: 400, totalTokens: 1000 },
      { date: '2024-01-15', model: 'gpt-3.5', promptTokens: 300, completionTokens: 200, totalTokens: 500 },
    ];

    const result = calculateMetrics(records);

    expect(result.byModel).toHaveLength(2);
    expect(result.byModel[0].model).toBe('gpt-4'); // sorted by tokens desc
    expect(result.byModel[0].percentage).toBeCloseTo(66.67, 1);
    expect(result.byModel[1].model).toBe('gpt-3.5');
    expect(result.byModel[1].percentage).toBeCloseTo(33.33, 1);
  });

  it('counts unique conversations', () => {
    const records: UsageRecord[] = [
      { date: '2024-01-15', model: 'gpt-4', promptTokens: 500, completionTokens: 500, totalTokens: 1000, conversationId: 'a' },
      { date: '2024-01-15', model: 'gpt-4', promptTokens: 500, completionTokens: 500, totalTokens: 1000, conversationId: 'a' },
      { date: '2024-01-15', model: 'gpt-4', promptTokens: 500, completionTokens: 500, totalTokens: 1000, conversationId: 'b' },
    ];

    const result = calculateMetrics(records);
    expect(result.totalConversations).toBe(2);
  });

  it('sets correct date range', () => {
    const records: UsageRecord[] = [
      { date: '2024-01-20', model: 'gpt-4', promptTokens: 500, completionTokens: 500, totalTokens: 1000 },
      { date: '2024-01-10', model: 'gpt-4', promptTokens: 500, completionTokens: 500, totalTokens: 1000 },
      { date: '2024-01-15', model: 'gpt-4', promptTokens: 500, completionTokens: 500, totalTokens: 1000 },
    ];

    const result = calculateMetrics(records);
    expect(result.dateRange.start).toBe('2024-01-10');
    expect(result.dateRange.end).toBe('2024-01-20');
  });
});
