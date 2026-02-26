import { useState, useCallback } from 'react';
import type { EcoMetrics, VerificationStatus } from '@/types';
import {
  generateShareText,
  generateShareCard,
  shareToX,
  copyToClipboard,
  downloadBlob,
  generateReportJson,
} from '@/lib/share';

interface Props {
  metrics: EcoMetrics;
  verification: VerificationStatus;
  onClose: () => void;
}

export function ShareCardBuilder({ metrics, verification, onClose }: Props) {
  const [shareText, setShareText] = useState(() => generateShareText(metrics, verification));
  const [copied, setCopied] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleCopyText = useCallback(async () => {
    await copyToClipboard(shareText);
    setCopied('text');
    setTimeout(() => setCopied(null), 2000);
  }, [shareText]);

  const handleCopyLink = useCallback(async () => {
    await copyToClipboard('https://awaireness.app');
    setCopied('link');
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleDownloadImage = useCallback(async () => {
    setGenerating(true);
    try {
      const blob = await generateShareCard(metrics, verification);
      downloadBlob(blob, 'awaireness-footprint.png');
    } catch (e) {
      console.error('Failed to generate share card:', e);
    }
    setGenerating(false);
  }, [metrics, verification]);

  const handleDownloadReport = useCallback(() => {
    const blob = generateReportJson(metrics, verification);
    downloadBlob(blob, 'awaireness-report.json');
  }, [metrics, verification]);

  const handleShareX = useCallback(() => {
    shareToX(shareText);
  }, [shareText]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Share your footprint"
    >
      <div className="glass w-full max-w-lg animate-slide-up rounded-t-3xl p-8 md:rounded-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Share</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-surface-2 hover:text-zinc-300"
            aria-label="Close share panel"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-4 text-sm text-zinc-400">
          All sharing is initiated by you. No data is sent automatically. Share links point to the public app — not to your personal data, because none exists.
        </p>

        {/* Editable share text */}
        <div className="mb-4">
          <label className="mb-2 block text-sm text-zinc-400" htmlFor="share-text">
            Share text (editable)
          </label>
          <textarea
            id="share-text"
            value={shareText}
            onChange={(e) => setShareText(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-zinc-800 bg-surface-2 px-4 py-3 font-mono text-sm text-zinc-300 focus:border-eco-500 focus:outline-none"
            spellCheck={false}
          />
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <ShareButton onClick={handleShareX} label="Share on X">
            Post to X
          </ShareButton>
          <ShareButton onClick={handleCopyText} label="Copy summary text">
            {copied === 'text' ? 'Copied' : 'Copy text'}
          </ShareButton>
          <ShareButton onClick={handleCopyLink} label="Copy app link">
            {copied === 'link' ? 'Copied' : 'Copy link'}
          </ShareButton>
          <ShareButton onClick={handleDownloadImage} label="Download share image" disabled={generating}>
            {generating ? 'Generating…' : 'Download image'}
          </ShareButton>
        </div>

        {/* Report download */}
        <div className="mt-4 border-t border-zinc-800/50 pt-4">
          <button
            onClick={handleDownloadReport}
            className="w-full rounded-xl border border-zinc-800 py-3.5 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-200"
          >
            Download full report (JSON)
          </button>
          <p className="mt-1 text-center text-xs text-zinc-600">
            Generated locally in browser memory. Not uploaded anywhere.
          </p>
        </div>
      </div>
    </div>
  );
}

function ShareButton({
  onClick,
  label,
  children,
  disabled,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-xl border border-zinc-800 py-3.5 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
