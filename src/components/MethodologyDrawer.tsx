import { useEffect, useRef } from 'react';
import { METHODOLOGY } from '@/lib/calculator';

interface Props {
  onClose: () => void;
}

export function MethodologyDrawer({ onClose }: Props) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Trap focus and handle Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    drawerRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Methodology and data sources"
    >
      <div
        ref={drawerRef}
        tabIndex={-1}
        className="modal-panel max-h-[85vh] w-full max-w-2xl animate-slide-up overflow-y-auto rounded-t-3xl p-6 pb-8 md:max-h-[90vh] md:rounded-3xl md:p-8"
      >
        {/* Mobile drag handle */}
        <div className="mb-4 flex justify-center md:hidden">
          <div className="h-1 w-10 rounded-full bg-zinc-600" />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Methodology</h2>
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
            aria-label="Close methodology panel"
          >
            Done
          </button>
        </div>

        <p className="mb-6 text-base text-zinc-400">
          All environmental impact figures are estimates based on published research.
          Actual values depend on data center location, hardware, model architecture,
          and cooling infrastructure. We show these numbers to build awareness, not to
          claim precision.
        </p>

        <div className="space-y-6">
          <MethodologySection
            title="Water consumption"
            color="text-blue-400"
            formula={METHODOLOGY.water.formula}
            source={METHODOLOGY.water.source}
            note={METHODOLOGY.water.note}
          />
          <MethodologySection
            title="Energy consumption"
            color="text-yellow-400"
            formula={METHODOLOGY.energy.formula}
            source={METHODOLOGY.energy.source}
            note={METHODOLOGY.energy.note}
          />
          <MethodologySection
            title="CO₂ emissions"
            color="text-eco-400"
            formula={METHODOLOGY.co2.formula}
            source={METHODOLOGY.co2.source}
            note={METHODOLOGY.co2.note}
          />
        </div>

        <div className="mt-8 rounded-xl border border-zinc-800/50 p-4">
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wider text-zinc-400">Verification levels</h3>
          <div className="space-y-2 text-base">
            <div className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-eco-400" />
              <div>
                <span className="text-zinc-300">Verified from import</span>
                <span className="text-zinc-600"> — Token counts come from your platform export. Impact estimates are derived from those counts.</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-zinc-600" />
              <div>
                <span className="text-zinc-300">Estimated</span>
                <span className="text-zinc-600"> — Token counts are simulated or user-configured. All derived numbers are approximations of approximations.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom close button — always visible at end of scroll */}
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-zinc-700 py-3.5 text-base text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function MethodologySection({
  title,
  color,
  formula,
  source,
  note,
}: {
  title: string;
  color: string;
  formula: string;
  source: string;
  note: string;
}) {
  return (
    <div>
      <h3 className={`mb-2 text-base font-medium ${color}`}>{title}</h3>
      <div className="rounded-lg bg-surface-2/50 p-3">
        <code className="block text-sm text-zinc-300">{formula}</code>
      </div>
      <p className="mt-2 text-sm text-zinc-400">
        <span className="text-zinc-300">Source:</span> {source}
      </p>
      <p className="mt-1 text-sm text-zinc-500">{note}</p>
    </div>
  );
}
