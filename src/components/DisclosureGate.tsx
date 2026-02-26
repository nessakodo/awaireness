import { useState } from 'react';

interface Props {
  onAccept: () => void;
}

export function DisclosureGate({ onAccept }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const [showThreat, setShowThreat] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-0 p-4">
      <div className="w-full max-w-lg animate-fade-in">
        {/* Logo */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-zinc-800 bg-surface-1">
            <svg viewBox="0 0 32 32" className="h-10 w-10" aria-hidden="true">
              <path
                d="M16 6 C11 13, 9 17, 9 21 C9 25 12 27 16 27 C20 27 23 25 23 21 C23 17 21 13 16 6Z"
                fill="none"
                stroke="#22c55e"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">aw<span className="text-eco-400">ai</span>reness</h1>
          <p className="mt-3 text-lg text-zinc-400">See the invisible cost of AI</p>
        </div>

        {/* Disclosure card */}
        <div className="glass rounded-2xl p-8 eco-glow">
          <div className="mb-6 flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-eco-500/10">
              <svg className="h-3.5 w-3.5 text-eco-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-medium text-white">This app stores no personal data</h2>
              <p className="mt-2 text-base leading-relaxed text-zinc-300">
                Your usage stays on your device. No tracking. No cookies. No analytics. No fingerprinting. No server-side storage. Nothing persists after you close this tab.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={onAccept}
              className="w-full rounded-xl bg-white py-4 text-base font-medium text-black transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-eco-500"
              aria-label="Accept privacy disclosure and continue"
            >
              Continue
            </button>

            <button
              onClick={() => setShowDetails((v) => !v)}
              className="w-full rounded-xl border border-zinc-800 py-3.5 text-base text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-300"
              aria-expanded={showDetails}
              aria-controls="details-panel"
            >
              {showDetails ? 'Hide details' : 'Technical details'}
            </button>
            <button
              onClick={() => setShowThreat((v) => !v)}
              className="w-full rounded-xl border border-zinc-800 py-3.5 text-base text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-300"
              aria-expanded={showThreat}
              aria-controls="threat-panel"
            >
              {showThreat ? 'Hide threats' : 'Threat model'}
            </button>
          </div>
        </div>

        {/* Expandable: Technical Details */}
        {showDetails && (
          <div
            id="details-panel"
            className="mt-4 animate-slide-up glass-light rounded-2xl p-6"
            role="region"
            aria-label="Technical privacy details"
          >
            <h3 className="mb-4 text-base font-medium uppercase tracking-wider text-zinc-400">How we keep it true</h3>
            <div className="space-y-4 text-base text-zinc-300">
              <Detail
                title="What is stored"
                text="Nothing. localStorage, sessionStorage, indexedDB, and cookies are programmatically blocked. A runtime enforcement layer throws if any code attempts to use them."
              />
              <Detail
                title="What is processed"
                text="If you upload a usage export, it is parsed entirely in your browser using a Web Worker. The raw file and derived data exist only in JavaScript memory."
              />
              <Detail
                title="What leaves your device"
                text="Nothing — unless you choose the one-time token flow (Mode B), which makes a single API call. The token is discarded from memory immediately after use. No response data is logged or persisted."
              />
              <Detail
                title="Network verification"
                text="In import and demo modes, all network requests (fetch, XHR) are intercepted and blocked. Any attempt triggers a console warning."
              />
              <Detail
                title="Content Security Policy"
                text="Strict CSP headers block inline scripts, external connections, and third-party resources. No CDNs, no analytics scripts, no tracking pixels."
              />
            </div>
            <button
              onClick={() => setShowDetails(false)}
              className="mt-5 w-full rounded-xl border border-zinc-800 py-3 text-base text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-300"
            >
              Close
            </button>
          </div>
        )}

        {/* Expandable: Threat Model */}
        {showThreat && (
          <div
            id="threat-panel"
            className="mt-4 animate-slide-up glass-light rounded-2xl p-6"
            role="region"
            aria-label="Threat model"
          >
            <h3 className="mb-4 text-base font-medium uppercase tracking-wider text-zinc-400">Threat Model</h3>
            <div className="space-y-4 text-base text-zinc-300">
              <Detail
                title="Malicious export file"
                text="All parsed content is sanitized. HTML entities are escaped. String lengths are capped. Only expected fields are extracted. No eval() or dynamic code execution."
              />
              <Detail
                title="XSS via user input"
                text="React escapes all rendered strings by default. We additionally sanitize before processing. No dangerouslySetInnerHTML is used."
              />
              <Detail
                title="Token leakage (Mode B)"
                text="Tokens are stored in a React ref (not state) and explicitly nulled after use. They never appear in the DOM, URLs, or error messages."
              />
              <Detail
                title="Supply chain"
                text="Minimal dependencies: React, Tailwind (build-only). No runtime dependencies beyond React. All assets are self-hosted."
              />
              <Detail
                title="Browser extensions"
                text="We cannot prevent extensions from reading page content. Users concerned about this should use a clean browser profile."
              />
            </div>
            <button
              onClick={() => setShowThreat(false)}
              className="mt-5 w-full rounded-xl border border-zinc-800 py-3 text-base text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-300"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <dt className="font-medium text-zinc-200">{title}</dt>
      <dd className="mt-1 text-zinc-400">{text}</dd>
    </div>
  );
}
