import { useMemo } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Props {
  liters: number;
  maxLiters?: number;
}

/**
 * Animated water fill inside a minimal glass vessel.
 * SVG-based with CSS animation. Respects prefers-reduced-motion.
 */
export function WaterVisual({ liters, maxLiters = 10 }: Props) {
  const reducedMotion = useReducedMotion();
  const fillPercent = Math.min(Math.max(liters / maxLiters, 0.02), 1);
  const fillY = 200 - fillPercent * 160; // vessel is from y=40 to y=200

  const displayValue = useMemo(() => {
    if (liters >= 1) return `${liters.toFixed(1)}L`;
    return `${(liters * 1000).toFixed(0)}mL`;
  }, [liters]);

  return (
    <div className="flex flex-col items-center" role="img" aria-label={`Water usage: ${displayValue}`}>
      <svg
        viewBox="0 0 160 240"
        className="h-64 w-40"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.9" />
          </linearGradient>
          <clipPath id="vesselClip">
            <path d="M40,30 Q40,20 50,20 L110,20 Q120,20 120,30 L125,200 Q125,220 105,220 L55,220 Q35,220 35,200 Z" />
          </clipPath>
          <filter id="waterBlur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
          </filter>
        </defs>

        {/* Vessel outline */}
        <path
          d="M40,30 Q40,20 50,20 L110,20 Q120,20 120,30 L125,200 Q125,220 105,220 L55,220 Q35,220 35,200 Z"
          fill="none"
          stroke="#3f3f46"
          strokeWidth="1.5"
          className="transition-all duration-500"
        />

        {/* Water fill */}
        <g clipPath="url(#vesselClip)">
          <rect
            x="30"
            width="100"
            height={240 - fillY}
            y={fillY}
            fill="url(#waterGradient)"
            className={reducedMotion ? '' : 'transition-all duration-1000 ease-out'}
            style={reducedMotion ? {} : {
              animation: 'none',
              transition: 'y 1.5s ease-out, height 1.5s ease-out',
            }}
          />

          {/* Ripple waves */}
          {!reducedMotion && (
            <>
              <path
                d={`M30,${fillY} Q55,${fillY - 4} 80,${fillY} Q105,${fillY + 4} 130,${fillY}`}
                fill="rgba(96, 165, 250, 0.3)"
                filter="url(#waterBlur)"
              >
                <animate
                  attributeName="d"
                  dur="3s"
                  repeatCount="indefinite"
                  values={`
                    M30,${fillY} Q55,${fillY - 4} 80,${fillY} Q105,${fillY + 4} 130,${fillY};
                    M30,${fillY} Q55,${fillY + 3} 80,${fillY} Q105,${fillY - 3} 130,${fillY};
                    M30,${fillY} Q55,${fillY - 4} 80,${fillY} Q105,${fillY + 4} 130,${fillY}
                  `}
                />
              </path>
              <path
                d={`M30,${fillY + 6} Q60,${fillY + 3} 80,${fillY + 6} Q100,${fillY + 9} 130,${fillY + 6}`}
                fill="rgba(96, 165, 250, 0.15)"
                filter="url(#waterBlur)"
              >
                <animate
                  attributeName="d"
                  dur="4s"
                  repeatCount="indefinite"
                  values={`
                    M30,${fillY + 6} Q60,${fillY + 3} 80,${fillY + 6} Q100,${fillY + 9} 130,${fillY + 6};
                    M30,${fillY + 6} Q60,${fillY + 8} 80,${fillY + 6} Q100,${fillY + 3} 130,${fillY + 6};
                    M30,${fillY + 6} Q60,${fillY + 3} 80,${fillY + 6} Q100,${fillY + 9} 130,${fillY + 6}
                  `}
                />
              </path>
            </>
          )}
        </g>

        {/* Glass reflection */}
        <line x1="45" y1="35" x2="48" y2="180" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      </svg>

      {/* Value display */}
      <div className="mt-4 text-center">
        <p className="text-3xl font-light tracking-tight text-blue-400">{displayValue}</p>
        <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">Water used</p>
      </div>
    </div>
  );
}
