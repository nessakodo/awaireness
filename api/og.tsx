import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #09090b 0%, #14532d 100%)',
        }}
      >
        {/* Glass panel */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '60px',
            borderRadius: '24px',
            background: 'rgba(24, 24, 27, 0.7)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            {/* Droplet icon */}
            <svg
              width="48"
              height="48"
              viewBox="0 0 32 32"
              style={{ marginRight: '16px' }}
            >
              <circle cx="16" cy="16" r="14" fill="#09090b" stroke="#22c55e" strokeWidth="1.5" />
              <path
                d="M16 8 C12 14, 10 18, 10 21 C10 24.3 12.7 26 16 26 C19.3 26 22 24.3 22 21 C22 18 20 14 16 8Z"
                fill="none"
                stroke="#22c55e"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span style={{ fontSize: '48px', fontWeight: 600, color: '#ffffff' }}>
              aw
            </span>
            <span style={{ fontSize: '48px', fontWeight: 600, color: '#4ade80' }}>
              ai
            </span>
            <span style={{ fontSize: '48px', fontWeight: 600, color: '#ffffff' }}>
              reness
            </span>
          </div>

          {/* Tagline */}
          <p style={{ fontSize: '28px', color: '#a1a1aa', margin: '0 0 48px 0' }}>
            See the invisible cost of AI
          </p>

          {/* Metrics row */}
          <div style={{ display: 'flex', gap: '80px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '44px', fontWeight: 700, color: '#60a5fa' }}>
                Water
              </span>
              <span style={{ fontSize: '18px', color: '#71717a', marginTop: '4px' }}>
                Liters consumed
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '44px', fontWeight: 700, color: '#facc15' }}>
                Energy
              </span>
              <span style={{ fontSize: '18px', color: '#71717a', marginTop: '4px' }}>
                kWh used
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{ fontSize: '44px', fontWeight: 700, color: '#4ade80' }}
              >
                CO₂
              </span>
              <span style={{ fontSize: '18px', color: '#71717a', marginTop: '4px' }}>
                Grams emitted
              </span>
            </div>
          </div>

          {/* Footer */}
          <p style={{ fontSize: '18px', color: '#52525b', marginTop: '48px' }}>
            Privacy-first · No data stored · awaireness.app
          </p>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
