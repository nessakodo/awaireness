/**
 * Demo Data Generator
 *
 * Generates plausible AI usage data entirely client-side.
 * Never contacts any server. All randomness is local.
 *
 * Model mix reflects real-world usage as of early 2026:
 * GPT-4o is the default ChatGPT model, Claude 3.5/4 Sonnet is
 * Anthropic's workhorse, with smaller shares for reasoning models.
 */

import type { UsageRecord, UsageData, DemoConfig } from '@/types';

// Model distribution reflecting early 2026 usage patterns
const MODELS = ['gpt-4o', 'gpt-4o-mini', 'claude-3.5-sonnet', 'claude-4-sonnet', 'o1', 'gpt-4'];
const MODEL_WEIGHTS = [0.30, 0.20, 0.18, 0.15, 0.10, 0.07];

function weightedRandomModel(): string {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < MODELS.length; i++) {
    cumulative += MODEL_WEIGHTS[i];
    if (r <= cumulative) return MODELS[i];
  }
  return MODELS[0];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function generateDemoData(config: DemoConfig): UsageData {
  const { estimatedPrompts, avgTokensPerPrompt } = config;
  const records: UsageRecord[] = [];

  // Spread over last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Group into conversations (3-8 prompts per conversation)
  let promptsRemaining = estimatedPrompts;
  let convIndex = 0;

  while (promptsRemaining > 0) {
    const convSize = Math.min(randomInt(3, 8), promptsRemaining);
    const convDate = new Date(
      thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime())
    );
    const model = weightedRandomModel();
    const convId = `demo-conv-${convIndex++}`;

    for (let i = 0; i < convSize; i++) {
      // Vary tokens around the average (±50%)
      const variance = 0.5 + Math.random();
      const totalTokens = Math.round(avgTokensPerPrompt * variance);
      const promptRatio = 0.3 + Math.random() * 0.2; // 30-50% prompt
      const promptTokens = Math.round(totalTokens * promptRatio);
      const completionTokens = totalTokens - promptTokens;

      records.push({
        date: formatDate(convDate),
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        conversationId: convId,
      });
    }

    promptsRemaining -= convSize;
  }

  // Sort by date
  records.sort((a, b) => a.date.localeCompare(b.date));

  return {
    records,
    source: 'demo',
    verification: 'estimated',
    importedAt: Date.now(),
  };
}

export const DEFAULT_DEMO_CONFIG: DemoConfig = {
  estimatedPrompts: 300,
  avgTokensPerPrompt: 1200,
};

/**
 * Usage presets based on real-world AI usage patterns as of early 2026.
 *
 * Sources:
 * - OpenAI "State of Enterprise AI 2025" report
 * - OpenRouter "State of AI 2025" (100T+ token analysis)
 * - Faros AI engineering analysis of Claude Code token usage
 * - Nathan Lambert's token processing research (Interconnects)
 *
 * A "prompt" = one user message + one AI response (a conversation turn).
 * Token counts include both input and output tokens per turn.
 * Coding/research tasks skew heavily toward input tokens (loading context).
 */
export const USAGE_PRESETS = [
  {
    id: 'casual',
    label: 'Casual',
    description: 'A few chats a week — quick questions, writing help, brainstorming',
    prompts: 120,
    tokensPerPrompt: 800,
    context: '~30 prompts/week. Typical free-tier user asking short questions.',
  },
  {
    id: 'regular',
    label: 'Regular',
    description: 'Daily use for work or personal — emails, research, summaries',
    prompts: 450,
    tokensPerPrompt: 1200,
    context: '~15 prompts/day. ChatGPT Plus or Claude Pro subscriber with follow-up conversations.',
  },
  {
    id: 'power',
    label: 'Power user',
    description: 'Heavy daily use — long coding sessions, document analysis, creative projects',
    prompts: 1000,
    tokensPerPrompt: 4000,
    context: '~33 prompts/day. Developers and researchers loading code + context into every prompt.',
  },
  {
    id: 'team',
    label: 'Team / API',
    description: 'Team or API usage — automated workflows, agents, batch processing',
    prompts: 3000,
    tokensPerPrompt: 6000,
    context: '~100 calls/day. Apps sending system prompts + conversation history per request.',
  },
] as const;

/** Context blurb for the demo mode UI */
export const TOKEN_EXPLAINER = {
  what: 'A token is roughly ¾ of a word. "Hello, how are you?" is about 6 tokens.',
  prompt: 'One prompt = your message + the AI\'s response. A quick question might be 400 tokens total; a long coding conversation could be 4,000+.',
  averages: 'As of early 2026, the average ChatGPT conversation is about 8 turns with ~1,200 tokens per turn. Claude conversations tend to run slightly longer.',
  growth: 'AI usage has roughly doubled each year since 2023. If you\'ve been using AI for a year or more, your cumulative usage may be larger than you think.',
};
