/** Source of the usage data */
export type DataSource = 'import' | 'token' | 'demo';

/** Verification status of metrics */
export type VerificationStatus = 'verified' | 'estimated';

/** A single usage record from an AI platform export */
export interface UsageRecord {
  date: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  conversationId?: string;
}

/** Parsed usage data from any source */
export interface UsageData {
  records: UsageRecord[];
  source: DataSource;
  verification: VerificationStatus;
  importedAt: number; // timestamp, ephemeral
}

/** Eco impact metrics derived from usage data */
export interface EcoMetrics {
  waterLiters: number;
  energyKwh: number;
  co2Grams: number;
  totalTokens: number;
  totalPrompts: number;
  totalConversations: number;
  dateRange: { start: string; end: string };
  byDay: DayBreakdown[];
  byModel: ModelBreakdown[];
}

export interface DayBreakdown {
  date: string;
  tokens: number;
  waterLiters: number;
  energyKwh: number;
}

export interface ModelBreakdown {
  model: string;
  tokens: number;
  percentage: number;
  waterLiters: number;
  energyKwh: number;
}

/** Application state — all ephemeral, in-memory only */
export interface AppState {
  phase: 'disclosure' | 'login' | 'dashboard';
  usageData: UsageData | null;
  metrics: EcoMetrics | null;
  showEstimates: boolean;
  showMethodology: boolean;
}

/** Demo mode configuration */
export interface DemoConfig {
  estimatedPrompts: number;
  avgTokensPerPrompt: number;
}

/** Parser result from Web Worker */
export interface ParseResult {
  success: boolean;
  data?: UsageRecord[];
  error?: string;
  rowCount?: number;
}
