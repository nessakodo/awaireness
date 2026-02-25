
# aw**ai**reness

**See the invisible cost of AI.**

Every prompt uses water, energy, and emits carbon. Awaireness shows you the footprint — without ever touching your data.

[awaireness.com](https://awaireness.com)

---

## What it does

Awaireness translates your AI usage into tangible environmental impact — liters of water, kilowatt-hours of energy, grams of CO₂ — and compares them to things you already understand: toilet flushes, phone charges, miles driven.

Three ways to see your data:

1. **Import** — Upload a ChatGPT or Anthropic export file. Parsed entirely in a sandboxed Web Worker on your device. Nothing is uploaded.
2. **API Key** — For developers. Paste a read-only admin key to fetch usage from OpenAI or Anthropic once. The key is discarded from memory immediately after.
3. **Demo** — Explore with synthetic data. Pick a usage profile (casual, regular, power user, team) and see what the impact looks like.

---

## Quick start

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

---

## Privacy

**This app stores no personal data. Period.**

| Storage API | Status |
|---|---|
| localStorage | Blocked at runtime — throws `PersistenceViolationError` |
| sessionStorage | Blocked at runtime — throws `PersistenceViolationError` |
| indexedDB | Blocked at runtime — throws `PersistenceViolationError` |
| Cookies | Blocked at runtime — throws `PersistenceViolationError` |
| Service Workers | Registration blocked |

| Surface | Status |
|---|---|
| Analytics | None |
| Tracking pixels | None |
| Fingerprinting | None |
| External CDNs | None |
| Server-side storage | None |
| Request logging | None |

### How it's enforced

- **`no-persist.ts`** — Runtime interception layer that replaces all browser storage APIs with Proxy objects that throw on any read or write. Runs before React mounts.
- **`useNetworkGuard`** — Patches `fetch()` and `XMLHttpRequest` to reject all outbound requests in Import and Demo modes.
- **Secure Web Worker** — File parsing runs in an isolated worker where `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, and `importScripts` are deleted before any user code runs. Raw file content is zeroed from memory after parsing. The worker self-terminates after returning results.
- **All state is ephemeral** — React `useState` and `useRef` only. Nothing survives a tab close. The Reset button explicitly nulls everything.

### Verify it yourself

1. Open DevTools → Network tab → use Demo mode → observe zero outbound requests
2. Open DevTools → Application → Storage → observe every category empty
3. Open Console → run `verifyNoPersistence()` → returns `{ clean: true, issues: [] }`

---

## Security

### Threat model

| Threat | Mitigation |
|---|---|
| Data persistence | All storage APIs blocked at runtime. No cookies, no service workers. |
| XSS from malicious export files | All inputs sanitized (HTML entities escaped, strings length-capped, regex-validated model names). No `dangerouslySetInnerHTML`. No `eval()`. |
| Prompt injection / SQL injection | No database. No server-side template rendering. No dynamic code execution. All user strings are treated as data, never as code. |
| API key exfiltration | Keys stored in `useRef` (never in DOM, URLs, or error messages), used for a single request cycle, then nulled. In production, the Edge Function processes the key in an isolated invocation with no logging. |
| Network exfiltration | Import/Demo modes block all network. API Key mode connects only to `api.openai.com` and `api.anthropic.com`, enforced by CSP `connect-src`. |
| File tampering | Uploaded files are parsed in a sandboxed Web Worker with all network APIs deleted. Only structured token counts are extracted. Raw content is zeroed after parsing. |
| Supply chain | Zero runtime dependencies beyond React. No CDNs, no analytics scripts, no third-party CSS or fonts. |
| Clickjacking | `frame-ancestors 'none'` and `X-Frame-Options: DENY`. |
| Man-in-the-middle | HSTS with 2-year max-age, includeSubDomains, and preload. |

### What we cannot defend against

| Threat | Explanation |
|---|---|
| Malicious browser extensions | Extensions can read page DOM. Use a clean browser profile if concerned. |
| Compromised build pipeline | If `npm install` is compromised, all bets are off. Dependencies are minimal and pinned. |
| Physical device access | If someone can read your RAM, they can read in-memory state. |

### Production security headers

Configured in `vercel.json` and applied to all routes:

- **Content-Security-Policy** — `default-src 'self'`; script, font, and base restricted to same-origin; images allow `blob:` and `data:` for canvas export; connect allows only `self` + OpenAI/Anthropic APIs
- **Cross-Origin-Opener-Policy** — `same-origin`
- **Cross-Origin-Embedder-Policy** — `credentialless`
- **Cross-Origin-Resource-Policy** — `same-origin`
- **Strict-Transport-Security** — 2 years, includeSubDomains, preload
- **Permissions-Policy** — camera, microphone, geolocation, browsing-topics all disabled
- **X-Content-Type-Options** — `nosniff`
- **X-Frame-Options** — `DENY`
- **Referrer-Policy** — `no-referrer`
- **X-DNS-Prefetch-Control** — `off`

---

## Methodology

All environmental figures are estimates based on published research. Actual values depend on data center location, hardware generation, model architecture, and cooling infrastructure.

| Metric | Formula | Source |
|---|---|---|
| Water | 0.5 mL per 1,000 tokens | Shaolei Ren, UC Riverside (2023) |
| Energy | 0.001 kWh per 1,000 tokens | IEA (2024) |
| CO₂ | Energy × 400 g/kWh | IEA global grid average |

The dashboard converts these into relatable comparisons — toilet flushes, phone charges, miles driven, streaming hours — so the numbers mean something without a science degree.

---

## Tech stack

- **React 18** + **TypeScript** (strict) — type-safe, no runtime dependencies beyond React
- **Vite** — dev server with HMR, optimized production builds
- **Tailwind CSS** — utility-first, purged in production (19 KB gzipped)
- **Web Workers** — sandboxed file parsing off the main thread
- **Canvas API** — share card image generation, fully client-side
- **Vercel Edge Runtime** — API proxy function for the key flow (no cold starts, no logging)

Production bundle: **64 KB** gzipped JS + **4.4 KB** gzipped CSS.

---

## Project structure

```
src/
├── components/
│   ├── DisclosureGate.tsx       Privacy disclosure with technical details + threat model
│   ├── AirdropLogin.tsx         Three-mode data input (import / API key / demo)
│   ├── ImpactDashboard.tsx      Main dashboard with metrics, comparisons, breakdowns
│   ├── WaterVisual.tsx          Animated SVG water vessel
│   ├── EnergyMeter.tsx          Ring gauge energy meter
│   ├── MethodologyDrawer.tsx    Formulas, sources, and methodology notes
│   └── ShareCardBuilder.tsx     Share card generator + JSON report export
├── hooks/
│   ├── useSession.ts            Ephemeral session state machine
│   ├── useReducedMotion.ts      prefers-reduced-motion media query
│   ├── useNetworkGuard.ts       Network isolation for offline modes
│   └── useSecureFileProcessor.ts  Secure Web Worker file processing
├── lib/
│   ├── no-persist.ts            Storage API interception layer
│   ├── sanitize.ts              Input sanitization (HTML, text, numbers, dates, model names)
│   ├── parser.ts                JSON/CSV export parser (ChatGPT, Anthropic, generic)
│   ├── calculator.ts            Eco impact formulas + aggregation
│   ├── comparisons.ts           Everyday equivalents (water, energy, CO₂)
│   ├── demo-data.ts             Synthetic data generator + usage presets
│   ├── providers.ts             OpenAI/Anthropic provider configs + normalization
│   └── share.ts                 Canvas share card, clipboard, X integration
├── workers/
│   └── secure-parse-worker.ts   Sandboxed worker (network APIs deleted, memory zeroed)
├── server/
│   └── api-plugin.ts            Vite dev server API middleware
├── types/
│   └── index.ts                 TypeScript type definitions
├── App.tsx                      Root component + phase routing
├── main.tsx                     Entry point (persistence block runs first)
└── index.css                    Tailwind layers + glass effects + reduced motion

api/
└── usage.ts                     Vercel Edge Runtime serverless function

tests/
├── parser.test.ts               17 tests — format detection, edge cases, XSS sanitization
└── calculator.test.ts           13 tests — formula correctness, aggregation, date ranges
```

---

## Testing

```bash
npm test          # 30 tests, runs in <1s
npm run build     # TypeScript check + production build
```

---

## Deployment

Configured for Vercel. Security headers, SPA rewrites, and the API edge function are all defined in `vercel.json`.

```bash
npx vercel --prod
```

Then add `awaireness.com` as a custom domain in the Vercel dashboard under Settings → Domains.

---

## Accessibility

- WCAG AA color contrast on all text
- Full keyboard navigation with visible `:focus-visible` outlines
- `aria-label`, `aria-expanded`, `aria-modal`, `aria-selected`, `role="dialog"`, `role="tab"`, `role="img"` throughout
- `prefers-reduced-motion: reduce` disables all animations globally
- System font stack — no font downloads

---

## License

MIT
