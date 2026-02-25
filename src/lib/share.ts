/**
 * Share Utilities
 *
 * Generates share cards locally using Canvas API.
 * No external services, no tracking pixels, no analytics.
 * Share links point only to the public app URL.
 */

import type { EcoMetrics, VerificationStatus } from '@/types';

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const APP_URL = 'https://awaireness.com';

export function generateShareText(metrics: EcoMetrics, verification: VerificationStatus): string {
  const waterStr = metrics.waterLiters >= 1
    ? `${metrics.waterLiters.toFixed(1)}L`
    : `${(metrics.waterLiters * 1000).toFixed(0)}mL`;

  const label = verification === 'verified' ? 'My verified' : 'My estimated';

  return [
    `${label} AI footprint this month:`,
    `💧 ${waterStr} water`,
    `⚡ ${metrics.energyKwh.toFixed(2)} kWh energy`,
    `🌿 ${metrics.co2Grams.toFixed(0)}g CO₂`,
    '',
    `Check yours → ${APP_URL}`,
    '#awaireness #AIFootprint',
  ].join('\n');
}

export function generateShareCard(
  metrics: EcoMetrics,
  verification: VerificationStatus
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('Canvas not supported'));

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
    bg.addColorStop(0, '#09090b');
    bg.addColorStop(1, '#14532d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    // Glass panel
    ctx.fillStyle = 'rgba(24, 24, 27, 0.6)';
    roundRect(ctx, 60, 60, CARD_WIDTH - 120, CARD_HEIGHT - 120, 24);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
    ctx.lineWidth = 1;
    roundRect(ctx, 60, 60, CARD_WIDTH - 120, CARD_HEIGHT - 120, 24);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 42px -apple-system, system-ui, sans-serif';
    ctx.fillText('My AI Footprint', 120, 150);

    // Verification badge
    ctx.font = '400 18px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = verification === 'verified' ? '#4ade80' : '#a1a1aa';
    ctx.fillText(verification === 'verified' ? '● Verified from export' : '○ Estimated', 120, 185);

    // Metrics
    const waterStr = metrics.waterLiters >= 1
      ? `${metrics.waterLiters.toFixed(1)}L`
      : `${(metrics.waterLiters * 1000).toFixed(0)}mL`;

    const metricItems = [
      { label: 'Water', value: waterStr, color: '#60a5fa' },
      { label: 'Energy', value: `${metrics.energyKwh.toFixed(2)} kWh`, color: '#facc15' },
      { label: 'CO₂', value: `${metrics.co2Grams.toFixed(0)}g`, color: '#4ade80' },
    ];

    let x = 120;
    for (const item of metricItems) {
      ctx.font = '700 56px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = item.color;
      ctx.fillText(item.value, x, 310);

      ctx.font = '400 20px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#a1a1aa';
      ctx.fillText(item.label, x, 345);

      x += 340;
    }

    // Prompts count
    ctx.font = '400 24px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#71717a';
    ctx.fillText(
      `${metrics.totalPrompts.toLocaleString()} prompts · ${metrics.totalConversations} conversations`,
      120,
      420
    );

    // Footer — "aw" white, "ai" violet, "reness" white
    ctx.font = '500 24px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('aw', 120, 510);
    const awWidth = ctx.measureText('aw').width;
    ctx.fillStyle = '#4ade80'; // green-400 (eco)
    ctx.fillText('ai', 120 + awWidth, 510);
    const aiWidth = ctx.measureText('ai').width;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('reness', 120 + awWidth + aiWidth, 510);
    const brandWidth = ctx.measureText('awaireness').width;
    ctx.font = '400 18px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#71717a';
    ctx.fillText('See the invisible cost of AI', 120 + brandWidth + 16, 510);

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate image'));
      },
      'image/png',
      1.0
    );
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function shareToX(text: string): void {
  const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function generateReportJson(metrics: EcoMetrics, verification: VerificationStatus): Blob {
  const report = {
    generated: new Date().toISOString(),
    verification,
    summary: {
      waterLiters: metrics.waterLiters,
      energyKwh: metrics.energyKwh,
      co2Grams: metrics.co2Grams,
      totalTokens: metrics.totalTokens,
      totalPrompts: metrics.totalPrompts,
      totalConversations: metrics.totalConversations,
    },
    dateRange: metrics.dateRange,
    breakdownByDay: metrics.byDay,
    breakdownByModel: metrics.byModel,
    methodology: {
      note: 'All figures are estimates based on published research. See awaireness.com/methodology for details.',
    },
  };
  return new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
}
