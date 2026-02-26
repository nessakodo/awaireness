import { useState, useMemo } from 'react';
import type { EcoMetrics, VerificationStatus } from '@/types';
import { WaterVisual } from './WaterVisual';
import { EnergyMeter } from './EnergyMeter';
import { MethodologyDrawer } from './MethodologyDrawer';
import { ShareCardBuilder } from './ShareCardBuilder';
import { waterComparison, energyComparison, co2Comparison } from '@/lib/comparisons';

interface Props {
  metrics: EcoMetrics;
  verification: VerificationStatus;
  showEstimates: boolean;
  onToggleEstimates: () => void;
  onReset: () => void;
  onBack: () => void;
}

export function ImpactDashboard({
  metrics,
  verification,
  showEstimates,
  onToggleEstimates,
  onReset,
  onBack,
}: Props) {
  const [showMethodology, setShowMethodology] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'models'>('overview');

  const waterComp = useMemo(() => waterComparison(metrics.waterLiters), [metrics.waterLiters]);
  const energyComp = useMemo(() => energyComparison(metrics.energyKwh), [metrics.energyKwh]);
  const co2Comp = useMemo(() => co2Comparison(metrics.co2Grams), [metrics.co2Grams]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Top bar */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg p-2.5 text-zinc-400 transition-colors hover:bg-surface-2 hover:text-zinc-200"
            aria-label="Go back"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">Your AI footprint</h1>
        </div>
        <div className="flex items-center gap-2">
          <VerificationBadge status={verification} />
          <button
            onClick={onReset}
            className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-300"
            aria-label="Reset all data and return to start"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Hero metrics with comparisons */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="glass rounded-3xl p-8 eco-glow">
          <div className="flex items-center justify-center">
            <WaterVisual liters={metrics.waterLiters} />
          </div>
          <div className="mt-4 rounded-xl bg-blue-500/5 px-4 py-3 text-center">
            <p className="text-base font-medium text-blue-400">{waterComp.text}</p>
            <p className="mt-1 text-sm text-zinc-400">{waterComp.detail}</p>
          </div>
        </div>
        <div className="glass rounded-3xl p-8">
          <div className="flex items-center justify-center">
            <EnergyMeter kwh={metrics.energyKwh} />
          </div>
          <div className="mt-4 rounded-xl bg-yellow-500/5 px-4 py-3 text-center">
            <p className="text-base font-medium text-yellow-400">{energyComp.text}</p>
            <p className="mt-1 text-sm text-zinc-400">{energyComp.detail}</p>
          </div>
        </div>
      </div>

      {/* CO₂ comparison card */}
      <div className="mb-6 glass-light rounded-2xl px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wider text-zinc-400">CO₂ equivalent</p>
            <p className="mt-1 text-3xl font-light tracking-tight text-eco-400">{metrics.co2Grams.toFixed(0)}g</p>
          </div>
          <div className="text-right">
            <p className="text-base font-medium text-eco-400">{co2Comp.text}</p>
            <p className="mt-1 text-sm text-zinc-400">{co2Comp.detail}</p>
          </div>
        </div>
      </div>

      {/* Usage stats row */}
      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-4">
        <MetricCard label="Total tokens" value={formatTokens(metrics.totalTokens)} />
        <MetricCard label="Prompts" value={metrics.totalPrompts.toLocaleString()} />
        <MetricCard label="Conversations" value={metrics.totalConversations.toLocaleString()} />
      </div>

      {/* "In plain terms" summary */}
      <PlainSummary metrics={metrics} waterComp={waterComp} energyComp={energyComp} co2Comp={co2Comp} />

      {/* Estimates toggle */}
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-zinc-800/50 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base text-zinc-400">Show breakdowns</span>
          <button
            onClick={() => setShowMethodology(true)}
            className="text-sm text-eco-500 underline-offset-2 hover:underline"
          >
            Methodology
          </button>
        </div>
        <button
          onClick={onToggleEstimates}
          role="switch"
          aria-checked={showEstimates}
          aria-label="Toggle breakdowns"
          className={`relative h-6 w-11 rounded-full transition-colors ${
            showEstimates ? 'bg-eco-500' : 'bg-zinc-700'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              showEstimates ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {/* Tabs for breakdowns */}
      {showEstimates && (
        <div className="mb-8">
          <div className="mb-4 flex gap-1 rounded-xl bg-surface-1 p-1" role="tablist">
            {(['overview', 'daily', 'models'] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-surface-2 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && <OverviewTab metrics={metrics} />}
          {activeTab === 'daily' && <DailyTab metrics={metrics} />}
          {activeTab === 'models' && <ModelsTab metrics={metrics} />}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowShare(true)}
          className="flex-1 rounded-xl bg-white py-4 text-base font-medium text-black transition-opacity hover:opacity-90"
        >
          Share
        </button>
        <button
          onClick={() => setShowMethodology(true)}
          className="flex-1 rounded-xl border border-zinc-800 py-4 text-base font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-300"
        >
          Methodology
        </button>
      </div>

      {/* Drawers */}
      {showMethodology && <MethodologyDrawer onClose={() => setShowMethodology(false)} />}
      {showShare && (
        <ShareCardBuilder
          metrics={metrics}
          verification={verification}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

// ─── Helper to format large token numbers ──────────────

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

// ─── Plain language summary ──────────────────────────────

function PlainSummary({
  metrics,
  waterComp,
  energyComp,
  co2Comp,
}: {
  metrics: EcoMetrics;
  waterComp: { text: string };
  energyComp: { text: string };
  co2Comp: { text: string };
}) {
  const avgPerDay = metrics.byDay.length > 0
    ? Math.round(metrics.totalTokens / metrics.byDay.length)
    : 0;

  return (
    <div className="mb-6 rounded-2xl border border-zinc-800/30 bg-surface-1/50 p-5">
      <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">In plain terms</h3>
      <p className="text-base leading-relaxed text-zinc-300">
        Over this period, your AI usage consumed roughly the equivalent of{' '}
        <span className="text-blue-400">{waterComp.text.toLowerCase()}</span> in data center cooling water,{' '}
        <span className="text-yellow-400">{energyComp.text.toLowerCase()}</span> of electricity, and produced about as much CO₂ as{' '}
        <span className="text-eco-400">{co2Comp.text.toLowerCase()}</span>.
      </p>
      {avgPerDay > 0 && (
        <p className="mt-2 text-xs text-zinc-500">
          That's roughly {formatTokens(avgPerDay)} tokens per active day, or about{' '}
          {Math.round(avgPerDay / 1500)} average-length conversations per day.
        </p>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────

function VerificationBadge({ status }: { status: VerificationStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${
        status === 'verified'
          ? 'bg-eco-500/10 text-eco-400'
          : 'bg-zinc-800 text-zinc-500'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${
        status === 'verified' ? 'bg-eco-400' : 'bg-zinc-600'
      }`} />
      {status === 'verified' ? 'Verified from import' : 'Estimated'}
    </span>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-light min-w-0 rounded-2xl px-3 py-4 sm:px-5 sm:py-5">
      <p className="truncate text-xl font-light tracking-tight text-white sm:text-2xl">{value}</p>
      <p className="mt-1 truncate text-xs text-zinc-400 sm:text-sm">{label}</p>
    </div>
  );
}

function OverviewTab({ metrics }: { metrics: EcoMetrics }) {
  if (!metrics.dateRange.start) return null;
  return (
    <div className="glass-light rounded-2xl p-5">
      <p className="mb-3 text-xs text-zinc-500">
        Period: {metrics.dateRange.start} to {metrics.dateRange.end}
      </p>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-lg font-light text-blue-400">{metrics.waterLiters >= 1 ? `${metrics.waterLiters.toFixed(1)}L` : `${(metrics.waterLiters * 1000).toFixed(0)}mL`}</p>
          <p className="text-xs text-zinc-600">Water</p>
        </div>
        <div>
          <p className="text-lg font-light text-yellow-400">{metrics.energyKwh.toFixed(3)} kWh</p>
          <p className="text-xs text-zinc-600">Energy</p>
        </div>
        <div>
          <p className="text-lg font-light text-eco-400">{metrics.co2Grams.toFixed(1)}g</p>
          <p className="text-xs text-zinc-600">CO₂</p>
        </div>
      </div>
    </div>
  );
}

function DailyTab({ metrics }: { metrics: EcoMetrics }) {
  if (metrics.byDay.length === 0) {
    return <p className="py-8 text-center text-sm text-zinc-600">No daily breakdown available</p>;
  }

  const maxTokens = Math.max(...metrics.byDay.map((d) => d.tokens));

  return (
    <div className="glass-light max-h-72 space-y-1 overflow-y-auto rounded-2xl p-4">
      {metrics.byDay.map((day) => (
        <div key={day.date} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-2/50">
          <span className="w-24 flex-shrink-0 font-mono text-xs text-zinc-500">{day.date}</span>
          <div className="flex-1">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-eco-500/60 to-eco-500"
              style={{ width: `${(day.tokens / maxTokens) * 100}%` }}
            />
          </div>
          <span className="w-20 text-right font-mono text-xs text-zinc-400">
            {day.tokens.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function ModelsTab({ metrics }: { metrics: EcoMetrics }) {
  if (metrics.byModel.length === 0) {
    return <p className="py-8 text-center text-sm text-zinc-600">No model breakdown available</p>;
  }

  return (
    <div className="glass-light space-y-3 rounded-2xl p-5">
      {metrics.byModel.map((m) => (
        <div key={m.model}>
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-xs text-zinc-300">{m.model}</span>
            <span className="text-xs text-zinc-500">{m.percentage.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-eco-500"
              style={{ width: `${m.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
