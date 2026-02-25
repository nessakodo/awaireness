import { useState, useCallback } from 'react';
import type { UsageData, DemoConfig } from '@/types';
import { generateDemoData, DEFAULT_DEMO_CONFIG, USAGE_PRESETS, TOKEN_EXPLAINER } from '@/lib/demo-data';
import { PROVIDERS, fetchUsageViaProxy } from '@/lib/providers';
import type { Provider } from '@/lib/providers';
import { useSecureFileProcessor } from '@/hooks/useSecureFileProcessor';

type Mode = 'select' | 'import' | 'apikey' | 'demo';

interface Props {
  onData: (data: UsageData) => void;
}

export function AirdropLogin({ onData }: Props) {
  const [mode, setMode] = useState<Mode>('select');

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Your AI footprint</h2>
          <p className="mt-2 text-sm text-zinc-500">Choose how to view your impact</p>
        </div>

        {mode === 'select' && <ModeSelector onSelect={setMode} />}
        {mode === 'import' && <ImportMode onData={onData} onBack={() => setMode('select')} />}
        {mode === 'apikey' && <ApiKeyMode onData={onData} onBack={() => setMode('select')} />}
        {mode === 'demo' && <DemoMode onData={onData} onBack={() => setMode('select')} />}
      </div>
    </div>
  );
}

// ─── Mode Selector ──────────────────────────────────────

function ModeSelector({ onSelect }: { onSelect: (m: Mode) => void }) {
  const options = [
    {
      id: 'import' as const,
      title: 'Import your data',
      description: 'Upload a ChatGPT or Claude export. Best for most users. File is processed in a secure sandbox on your device — never uploaded, never stored.',
      badge: 'Most users',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />,
    },
    {
      id: 'apikey' as const,
      title: 'API key (developers)',
      description: 'For developers who use the OpenAI/Anthropic API directly. Reads API call usage only — does not include ChatGPT or Claude web conversations.',
      badge: 'API only',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />,
    },
    {
      id: 'demo' as const,
      title: 'Demo mode',
      description: 'Explore with synthetic data. Nothing real, nothing leaves your device.',
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    },
  ];

  return (
    <div className="space-y-3">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className="glass group flex w-full items-start gap-4 rounded-2xl p-5 text-left transition-all hover:border-zinc-600 hover:bg-surface-2/50 focus-visible:ring-2 focus-visible:ring-eco-500"
          aria-label={opt.title}
        >
          <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-surface-2 transition-colors group-hover:bg-surface-3">
            <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              {opt.icon}
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-white">{opt.title}</h3>
              {'badge' in opt && opt.badge && (
                <span className="rounded-full bg-eco-500/10 px-2 py-0.5 text-[10px] font-medium text-eco-400">
                  {opt.badge}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{opt.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Import Mode (Secure) ───────────────────────────────

function ImportMode({ onData, onBack }: { onData: (d: UsageData) => void; onBack: () => void }) {
  const { processFile, processing, result, clearResult } = useSecureFileProcessor();
  const [showGuide, setShowGuide] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    clearResult();
    await processFile(file);
    // Clear the file input so the same file can be re-selected
    e.target.value = '';
  }, [processFile, clearResult]);

  const confirmImport = useCallback(() => {
    if (!result?.records) return;
    onData({
      records: result.records,
      source: 'import',
      verification: 'verified',
      importedAt: Date.now(),
    });
  }, [result, onData]);

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-6">
        <h3 className="mb-1 text-sm font-medium text-white">Import usage data</h3>
        <p className="mb-2 text-xs text-zinc-500">
          Your file is processed in a secure, sandboxed Web Worker with no network access. Raw content is zeroed from memory after parsing. Only numerical usage data is extracted.
        </p>

        {/* Security proof toggle */}
        <button
          onClick={() => setShowSecurity((v) => !v)}
          className="mb-3 flex w-full items-center gap-1.5 text-xs text-eco-500 hover:text-eco-400"
          aria-expanded={showSecurity}
        >
          <ChevronIcon open={showSecurity} />
          How your file is protected
        </button>

        {showSecurity && (
          <div className="mb-4 rounded-xl bg-surface-2/50 p-4 text-xs text-zinc-400 space-y-2">
            <SecurityItem check label="Processed in an isolated Web Worker thread — no DOM access" />
            <SecurityItem check label="All network APIs (fetch, XHR, WebSocket) are deleted inside the worker before any code runs" />
            <SecurityItem check label="Raw file content is zeroed from memory immediately after parsing" />
            <SecurityItem check label="Worker self-terminates after processing — no persistent state" />
            <SecurityItem check label="Only derived numbers (token counts, dates, model names) are returned" />
            <SecurityItem check label="No server is contacted. Zero network requests. Verifiable in DevTools → Network tab" />
            <SecurityItem check label="No localStorage, cookies, or any storage. Verifiable in DevTools → Application tab" />
            <SecurityItem check label="All string inputs are sanitized — HTML entities escaped, length capped, regex-validated" />
            <SecurityItem check label="No eval(), no Function(), no dynamic code execution anywhere in the parser" />
            <SecurityItem check label="Content Security Policy blocks all inline scripts and external connections" />
            <p className="mt-2 pt-2 border-t border-zinc-800/50 text-zinc-600">
              Since no network requests are made, there is nothing in network logs to intercept. The file never leaves your browser tab's memory, and that memory is freed when you close the tab.
            </p>
          </div>
        )}

        {/* Export instructions */}
        <button
          onClick={() => setShowGuide((v) => !v)}
          className="mb-3 flex w-full items-center gap-1.5 text-xs text-eco-500 hover:text-eco-400"
          aria-expanded={showGuide}
        >
          <ChevronIcon open={showGuide} />
          How to export your data
        </button>

        {showGuide && (
          <div className="mb-4 space-y-3 rounded-xl bg-surface-2/50 p-4">
            <ExportGuide
              provider="ChatGPT (web & app)"
              steps={[
                'Go to chatgpt.com → Settings → Data Controls',
                'Click "Export data" — you\'ll get an email with a download link',
                'Download and unzip the archive',
                'Upload the conversations.json file below',
              ]}
              note="Token counts are estimated from message length (~4 chars ≈ 1 token). This captures all your web and app conversations."
            />
            <ExportGuide
              provider="Claude (web & app)"
              steps={[
                'Go to claude.ai → Settings → Your Data',
                'Request a data export if available',
                'Or manually note your usage from the billing page',
              ]}
              note="Anthropic's export format may vary. We accept any JSON/CSV with token counts."
            />
            <ExportGuide
              provider="OpenAI API usage (developers)"
              steps={[
                'Go to platform.openai.com/usage',
                'Download the usage CSV from the Activity tab',
                'Upload it below',
              ]}
              note="This captures API calls only. If you also use ChatGPT, export that separately."
            />
          </div>
        )}

        {/* File upload */}
        <label className="flex w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-700 py-8 text-sm text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-300">
          <input
            type="file"
            accept=".json,.csv,.tsv"
            onChange={handleFile}
            className="hidden"
            aria-label="Upload usage export file"
          />
          {processing ? 'Processing securely…' : 'Drop file or click to upload'}
        </label>

        {/* Error */}
        {result && !result.success && (
          <div className="mt-3 rounded-lg bg-red-500/10 px-4 py-3 text-xs text-red-400" role="alert">
            {result.error}
          </div>
        )}

        {/* Success + security report */}
        {result?.success && (
          <div className="mt-4 space-y-2">
            <div className="rounded-lg bg-eco-500/10 px-4 py-3" role="status">
              <p className="text-xs text-eco-400">
                Parsed {result.rowCount} records securely.
              </p>
              {result.securityReport && (
                <p className="mt-1 text-[10px] text-zinc-600">
                  Security: network APIs blocked ✓ · raw content zeroed ✓ · processed in {result.securityReport.processingTimeMs.toFixed(0)}ms
                </p>
              )}
            </div>
            <button
              onClick={confirmImport}
              className="w-full rounded-xl bg-white py-3 text-sm font-medium text-black transition-opacity hover:opacity-90"
            >
              Calculate impact
            </button>
          </div>
        )}
      </div>

      <BackButton onClick={onBack} />
    </div>
  );
}

// ─── API Key Mode ──────────────────────────────────────

function ApiKeyMode({ onData, onBack }: { onData: (d: UsageData) => void; onBack: () => void }) {
  const [provider, setProvider] = useState<Provider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [days, setDays] = useState(30);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  const config = PROVIDERS[provider];

  const keyWarning = (() => {
    const k = apiKey.trim();
    if (!k) return null;
    if (provider === 'openai') {
      if (k.startsWith('sk-proj-')) return 'This is a project key (sk-proj-...). It cannot read usage data. You need an Admin key (sk-admin-...) — see instructions above.';
      if (k.startsWith('sk-') && !k.startsWith('sk-admin-') && k.length > 20) return 'This looks like a standard API key. Usage data requires an Admin key (sk-admin-...). Create one at the link above.';
    }
    if (provider === 'anthropic' && k.startsWith('sk-ant-api') && !k.includes('admin')) {
      return 'This looks like a regular API key. Usage data may require an admin key.';
    }
    return null;
  })();

  const handleFetch = useCallback(async () => {
    if (!apiKey.trim()) return;
    setStatus('loading');
    setError('');

    try {
      const result = await fetchUsageViaProxy(provider, apiKey.trim(), days);
      setApiKey('');

      if (result.error) {
        setError(result.error);
        setStatus('error');
        return;
      }

      if (result.records.length === 0) {
        setError(
          'No usage data returned. Common reasons:\n' +
          '• You need an Admin key (sk-admin-...), not a project or standard key\n' +
          '• This only shows API calls — ChatGPT/Claude web chats are NOT included\n' +
          '• Try a longer time range (90 days)\n' +
          '• If you only use the web apps, go back and use Import mode instead'
        );
        setStatus('error');
        return;
      }

      onData({
        records: result.records,
        source: 'token',
        verification: 'verified',
        importedAt: Date.now(),
      });
    } catch (e) {
      setApiKey('');
      setError(e instanceof Error ? e.message : 'Failed to fetch usage');
      setStatus('error');
    }
  }, [apiKey, provider, days, onData]);

  return (
    <div className="space-y-4">
      {/* Important context */}
      <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-4">
        <p className="text-xs leading-relaxed text-yellow-200/80">
          <strong className="text-yellow-300">This is for API developers.</strong> If you use ChatGPT or Claude through the website or app, this option won't show that usage. Go back and choose <strong>Import your data</strong> instead — it covers web and app conversations.
        </p>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="mb-1 text-sm font-medium text-white">Connect with API key</h3>
        <p className="mb-4 text-xs text-zinc-500">
          Your key is used once through a local proxy, then immediately discarded from memory. It is never stored, logged, or sent anywhere other than the provider's API.
        </p>

        {/* Provider selector */}
        <div className="mb-4 flex gap-2">
          {(Object.keys(PROVIDERS) as Provider[]).map((p) => (
            <button
              key={p}
              onClick={() => { setProvider(p); setApiKey(''); setError(''); }}
              className={`flex-1 rounded-xl py-2 text-xs font-medium transition-colors ${
                provider === p ? 'bg-surface-2 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {PROVIDERS[p].name}
            </button>
          ))}
        </div>

        {/* Instructions */}
        <button
          onClick={() => setShowInstructions((v) => !v)}
          className="mb-3 flex w-full items-center gap-1.5 text-xs text-eco-500 hover:text-eco-400"
          aria-expanded={showInstructions}
        >
          <ChevronIcon open={showInstructions} />
          How to get a {config.name} admin key
        </button>

        {showInstructions && (
          <div className="mb-4 rounded-xl bg-surface-2/50 p-4">
            <ol className="space-y-2 text-xs text-zinc-400">
              {config.instructions.map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-surface-3 text-[10px] text-zinc-500">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[10px] text-zinc-600">{config.permissionNote}</p>
            <a href={config.keyUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-eco-500 underline underline-offset-2 hover:text-eco-400">
              Open {config.name} admin keys page →
            </a>
          </div>
        )}

        {/* Key input */}
        <div className="relative mb-3">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={config.keyPlaceholder}
            className="w-full rounded-xl border border-zinc-800 bg-surface-2 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-eco-500 focus:outline-none"
            aria-label={`${config.name} API key`}
            autoComplete="off"
            spellCheck={false}
          />
          {apiKey && (
            <button
              onClick={() => { setApiKey(''); setError(''); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
              aria-label="Clear key from memory"
            >
              Clear
            </button>
          )}
        </div>

        {/* Time range */}
        <div className="mb-4 flex items-center gap-3">
          <label className="text-xs text-zinc-500">Time range</label>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-lg px-3 py-1 text-xs transition-colors ${
                  days === d ? 'bg-surface-2 text-white' : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {keyWarning && (
          <div className="mb-3 rounded-lg bg-yellow-500/10 px-4 py-3 text-xs text-yellow-400" role="alert">{keyWarning}</div>
        )}

        {error && (
          <div className="mb-3 rounded-lg bg-red-500/10 px-4 py-3 text-xs text-red-400 whitespace-pre-line" role="alert">{error}</div>
        )}

        <button
          onClick={handleFetch}
          disabled={!apiKey.trim() || status === 'loading' || !!keyWarning}
          className="w-full rounded-xl bg-white py-3 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {status === 'loading' ? 'Fetching usage…' : 'Fetch my usage'}
        </button>

        <p className="mt-2 text-center text-[10px] text-zinc-600">
          Key is discarded from memory the instant the request completes.
        </p>
      </div>

      <BackButton onClick={onBack} />
    </div>
  );
}

// ─── Demo Mode ──────────────────────────────────────────

function DemoMode({ onData, onBack }: { onData: (d: UsageData) => void; onBack: () => void }) {
  const [config, setConfig] = useState<DemoConfig>(DEFAULT_DEMO_CONFIG);
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  const handleGenerate = useCallback(() => {
    onData(generateDemoData(config));
  }, [config, onData]);

  const applyPreset = useCallback((preset: typeof USAGE_PRESETS[number]) => {
    setConfig({ estimatedPrompts: preset.prompts, avgTokensPerPrompt: preset.tokensPerPrompt });
  }, []);

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-6">
        <h3 className="mb-1 text-sm font-medium text-white">Demo mode</h3>
        <p className="mb-4 text-xs text-zinc-500">
          Generate a realistic usage profile with synthetic data. Pick a preset that matches your habits, or dial in custom numbers. Nothing leaves your device.
        </p>

        {/* Presets */}
        <div className="mb-5">
          <p className="mb-2 text-xs text-zinc-400">What kind of AI user are you?</p>
          <div className="grid grid-cols-2 gap-2">
            {USAGE_PRESETS.map((preset) => {
              const active = config.estimatedPrompts === preset.prompts && config.avgTokensPerPrompt === preset.tokensPerPrompt;
              return (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`rounded-xl p-3 text-left transition-all ${
                    active ? 'border border-eco-500/50 bg-eco-500/5' : 'border border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <p className={`text-xs font-medium ${active ? 'text-eco-400' : 'text-zinc-300'}`}>{preset.label}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">{preset.description}</p>
                  <p className="mt-1 text-[10px] text-zinc-600">{preset.context}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Token explainer */}
        <button
          onClick={() => setShowTokenHelp((v) => !v)}
          className="mb-3 flex w-full items-center gap-1.5 text-xs text-eco-500 hover:text-eco-400"
          aria-expanded={showTokenHelp}
        >
          <ChevronIcon open={showTokenHelp} />
          What are tokens and prompts?
        </button>

        {showTokenHelp && (
          <div className="mb-4 space-y-2 rounded-xl bg-surface-2/50 p-4 text-xs text-zinc-400">
            <p><span className="text-zinc-300">Tokens:</span> {TOKEN_EXPLAINER.what}</p>
            <p><span className="text-zinc-300">Prompts:</span> {TOKEN_EXPLAINER.prompt}</p>
            <p><span className="text-zinc-300">Averages:</span> {TOKEN_EXPLAINER.averages}</p>
            <p><span className="text-zinc-300">Growth:</span> {TOKEN_EXPLAINER.growth}</p>
          </div>
        )}

        {/* Sliders */}
        <div className="space-y-4">
          <SliderControl
            label="Prompts per month"
            value={config.estimatedPrompts}
            min={50}
            max={5000}
            step={50}
            onChange={(v) => setConfig((c) => ({ ...c, estimatedPrompts: v }))}
          />
          <SliderControl
            label="Avg tokens per prompt"
            value={config.avgTokensPerPrompt}
            min={200}
            max={8000}
            step={100}
            onChange={(v) => setConfig((c) => ({ ...c, avgTokensPerPrompt: v }))}
          />
        </div>

        {/* Preview */}
        <div className="mt-4 rounded-lg bg-surface-2/30 px-4 py-3">
          <p className="text-xs text-zinc-500">
            ~{(config.estimatedPrompts * config.avgTokensPerPrompt / 1000).toFixed(0)}K total tokens
            across ~{Math.ceil(config.estimatedPrompts / 5)} conversations over 30 days.
            {config.estimatedPrompts <= 200
              ? ' Light usage — a few quick questions most days.'
              : config.estimatedPrompts <= 600
              ? ' Moderate usage — daily conversations with follow-ups.'
              : config.estimatedPrompts <= 1500
              ? ' Heavy usage — multiple long sessions every day.'
              : ' Very high volume — likely team or API-level usage.'}
          </p>
        </div>

        <button
          onClick={handleGenerate}
          className="mt-5 w-full rounded-xl bg-white py-3 text-sm font-medium text-black transition-opacity hover:opacity-90"
        >
          Generate demo
        </button>
      </div>

      <BackButton onClick={onBack} />
    </div>
  );
}

// ─── Shared UI ──────────────────────────────────────────

function SecurityItem({ check, label }: { check: boolean; label: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${check ? 'bg-eco-500/20 text-eco-400' : 'bg-red-500/20 text-red-400'}`}>
        {check ? '✓' : '✗'}
      </span>
      <span>{label}</span>
    </div>
  );
}

function ExportGuide({ provider, steps, note }: { provider: string; steps: string[]; note: string }) {
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-medium text-zinc-300">{provider}</h4>
      <ol className="mb-1 space-y-1 text-xs text-zinc-400">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-surface-3 text-[9px] text-zinc-500">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="text-[10px] text-zinc-600">{note}</p>
    </div>
  );
}

function SliderControl({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs text-zinc-400">{label}</label>
        <span className="font-mono text-xs text-zinc-300">{value.toLocaleString()}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-eco-500" aria-label={label}
      />
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full py-2 text-center text-xs text-zinc-600 transition-colors hover:text-zinc-400">
      Back
    </button>
  );
}
