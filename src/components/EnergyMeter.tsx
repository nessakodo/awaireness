import { useMemo } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Props {
  kwh: number;
  maxKwh?: number;
}

/**
 * Sleek ring gauge for energy consumption.
 * SVG arc with animated sweep. Premium hardware-UI feel.
 */
export function EnergyMeter({ kwh, maxKwh = 5 }: Props) {
  const reducedMotion = useReducedMotion();
  const percent = Math.min(Math.max(kwh / maxKwh, 0.01), 1);

  // SVG arc math
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - percent);

  const displayValue = useMemo(() => {
    if (kwh >= 1) return `${kwh.toFixed(2)}`;
    return `${(kwh * 1000).toFixed(0)}`;
  }, [kwh]);

  const unit = kwh >= 1 ? 'kWh' : 'Wh';

  return (
    <div className="flex flex-col items-center" role="img" aria-label={`Energy usage: ${displayValue} ${unit}`}>
      <div className="relative">
        <svg viewBox="0 0 200 200" className="h-64 w-64" aria-hidden="true">
          <defs>
            <linearGradient id="energyGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>

          {/* Background track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Energy arc */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="url(#energyGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={reducedMotion ? strokeOffset : circumference}
            transform="rotate(-90 100 100)"
            className={reducedMotion ? '' : 'transition-[stroke-dashoffset] duration-[1.5s] ease-out'}
            style={reducedMotion ? {} : {
              strokeDashoffset: strokeOffset,
            }}
          />

          {/* Tick marks */}
          {Array.from({ length: 36 }, (_, i) => {
            const angle = (i * 10 * Math.PI) / 180 - Math.PI / 2;
            const inner = radius - (i % 3 === 0 ? 12 : 8);
            const outer = radius - 4;
            return (
              <line
                key={i}
                x1={100 + inner * Math.cos(angle)}
                y1={100 + inner * Math.sin(angle)}
                x2={100 + outer * Math.cos(angle)}
                y2={100 + outer * Math.sin(angle)}
                stroke={i % 3 === 0 ? '#52525b' : '#3f3f46'}
                strokeWidth={i % 3 === 0 ? 1 : 0.5}
              />
            );
          })}

          {/* Center glow */}
          <circle cx="100" cy="100" r="3" fill="#facc15" opacity="0.4">
            {!reducedMotion && (
              <animate attributeName="opacity" dur="2s" repeatCount="indefinite" values="0.2;0.5;0.2" />
            )}
          </circle>
        </svg>

        {/* Center text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-4xl font-light tracking-tight text-yellow-400">{displayValue}</p>
          <p className="text-sm uppercase tracking-widest text-zinc-400">{unit}</p>
        </div>
      </div>

      {/* Label */}
      <p className="mt-2 text-sm uppercase tracking-widest text-zinc-400">Energy used</p>
    </div>
  );
}
