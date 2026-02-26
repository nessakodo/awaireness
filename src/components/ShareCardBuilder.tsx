import { useState, useCallback, useEffect } from 'react';
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Auto-generate the share card image when the panel opens
  useEffect(() => {
    let cancelled = false;
    setGenerating(true);
    generateShareCard(metrics, verification)
      .then((blob) => {
        if (!cancelled) {
          setImageUrl(URL.createObjectURL(blob));
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setGenerating(false); });

    return () => {
      cancelled = true;
    };
  }, [metrics, verification]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

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

  const handleSaveImage = useCallback(async () => {
    if (!imageUrl) return;
    // Re-generate a fresh blob for download
    const blob = await generateShareCard(metrics, verification);
    downloadBlob(blob, 'awaireness-footprint.png');
  }, [imageUrl, metrics, verification]);

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
      <div className="glass w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-3xl p-8 md:max-h-[90vh] md:rounded-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Share</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2.5 text-zinc-400 transition-colors hover:bg-surface-2 hover:text-zinc-200"
            aria-label="Close share panel"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-4 text-sm text-zinc-400">
          All sharing is initiated by you. No data is sent automatically.
        </p>

        {/* Image preview */}
        <div className="mb-4 overflow-hidden rounded-xl border border-zinc-800">
          {generating && (
            <div className="flex h-40 items-center justify-center bg-surface-2/50">
              <p className="text-sm text-zinc-500">Generating image...</p>
            </div>
          )}
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Your AI footprint share card"
              className="w-full"
              draggable
            />
          )}
        </div>

        {imageUrl && (
          <button
            onClick={handleSaveImage}
            className="mb-4 w-full rounded-xl bg-white py-4 text-base font-medium text-black transition-opacity hover:opacity-90"
          >
            Save image
          </button>
        )}

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
            {copied === 'text' ? 'Copied!' : 'Copy text'}
          </ShareButton>
          <ShareButton onClick={handleCopyLink} label="Copy app link">
            {copied === 'link' ? 'Copied!' : 'Copy link'}
          </ShareButton>
          <ShareButton onClick={handleDownloadReport} label="Download JSON report">
            Download report
          </ShareButton>
        </div>

        <p className="mt-3 text-center text-xs text-zinc-600">
          Image and text are generated locally. Nothing is uploaded.
        </p>
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
