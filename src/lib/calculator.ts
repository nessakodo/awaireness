/**
 * Eco Impact Calculator
 *
 * Derives environmental metrics from AI usage data.
 *
 * Sources and methodology:
 * - Water: ~0.5 mL per 1,000 tokens (data center cooling estimates, Shaolei Ren et al. 2023)
 * - Energy: ~0.001 kWh per 1,000 tokens (GPU inference estimates, IEA 2024 extrapolations)
 * - CO2: energy × grid carbon intensity (~400g CO2/kWh global average, IEA 2023)
 *
 * These are order-of-magnitude estimates. Actual values depend on
 * data center location, hardware, model size, and cooling efficiency.
 * All numbers are clearly labeled as estimates in the UI.
 */

import type { UsageRecord, EcoMetrics, DayBreakdown, ModelBreakdown } from '@/types';

// Constants — per 1,000 tokens
const WATER_ML_PER_1K_TOKENS = 0.5;
const ENERGY_KWH_PER_1K_TOKENS = 0.001;
const CO2_GRAMS_PER_KWH = 400;

export function waterLitersFromTokens(tokens: number): number {
  return (tokens / 1000) * WATER_ML_PER_1K_TOKENS / 1000; // mL → liters
}

export function energyKwhFromTokens(tokens: number): number {
  return (tokens / 1000) * ENERGY_KWH_PER_1K_TOKENS;
}

export function co2GramsFromKwh(kwh: number): number {
  return kwh * CO2_GRAMS_PER_KWH;
}

export function calculateMetrics(records: UsageRecord[]): EcoMetrics {
  if (records.length === 0) {
    return {
      waterLiters: 0,
      energyKwh: 0,
      co2Grams: 0,
      totalTokens: 0,
      totalPrompts: records.length,
      totalConversations: 0,
      dateRange: { start: '', end: '' },
      byDay: [],
      byModel: [],
    };
  }

  const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0);
  const waterLiters = waterLitersFromTokens(totalTokens);
  const energyKwh = energyKwhFromTokens(totalTokens);
  const co2Grams = co2GramsFromKwh(energyKwh);

  // Unique conversations
  const conversations = new Set(records.filter((r) => r.conversationId).map((r) => r.conversationId));

  // Sort dates
  const dates = records.map((r) => r.date).filter(Boolean).sort();

  // Aggregate by day
  const dayMap = new Map<string, number>();
  for (const r of records) {
    if (!r.date) continue;
    dayMap.set(r.date, (dayMap.get(r.date) || 0) + r.totalTokens);
  }
  const byDay: DayBreakdown[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, tokens]) => ({
      date,
      tokens,
      waterLiters: waterLitersFromTokens(tokens),
      energyKwh: energyKwhFromTokens(tokens),
    }));

  // Aggregate by model
  const modelMap = new Map<string, number>();
  for (const r of records) {
    modelMap.set(r.model, (modelMap.get(r.model) || 0) + r.totalTokens);
  }
  const byModel: ModelBreakdown[] = Array.from(modelMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([model, tokens]) => ({
      model,
      tokens,
      percentage: totalTokens > 0 ? (tokens / totalTokens) * 100 : 0,
      waterLiters: waterLitersFromTokens(tokens),
      energyKwh: energyKwhFromTokens(tokens),
    }));

  return {
    waterLiters,
    energyKwh,
    co2Grams,
    totalTokens,
    totalPrompts: records.length,
    totalConversations: conversations.size,
    dateRange: {
      start: dates[0] || '',
      end: dates[dates.length - 1] || '',
    },
    byDay,
    byModel,
  };
}

/** Methodology text for display */
export const METHODOLOGY = {
  water: {
    formula: 'Water (L) = (total_tokens / 1000) × 0.5 mL / 1000',
    source: 'Shaolei Ren et al., "Making AI Less Thirsty," 2023',
    note: 'Estimates data center cooling water for inference workloads. Actual usage varies by location, season, and cooling system.',
  },
  energy: {
    formula: 'Energy (kWh) = (total_tokens / 1000) × 0.001',
    source: 'IEA, "Electricity 2024," extrapolated for LLM inference',
    note: 'Based on GPU power draw during inference. Varies significantly by model size, hardware generation, and data center PUE.',
  },
  co2: {
    formula: 'CO₂ (g) = energy_kWh × 400',
    source: 'IEA global average grid carbon intensity, 2023',
    note: 'Uses global average. Actual emissions depend on the grid mix where the data center operates. Ranges from ~20g/kWh (hydro) to ~900g/kWh (coal).',
  },
};
