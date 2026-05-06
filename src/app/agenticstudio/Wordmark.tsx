'use client';
import { useId } from 'react';
import './wordmark.css';

export function AgenticWordmark({ className = '' }: { className?: string }) {
  const uid = useId().replace(/:/g, '');

  const W = 260, H = 40;
  const sparks = [
    { d: `M0 20C45 8 110 34 175 16C215 5 240 22 ${W} 18`,    color: '#FF6B35', dur: 4.1, begin: '0s',    r: 2.2 },
    { d: `M0 28C55 38 130 12 195 30C230 38 248 24 ${W} 26`,   color: '#F59E0B', dur: 5.5, begin: '-2.1s', r: 1.8 },
    { d: `M0 14C65 3 145 28 210 12C238 5 250 18 ${W} 15`,     color: '#06B6D4', dur: 3.8, begin: '-1.3s', r: 1.8 },
    { d: `M0 22C80 36 160 10 220 24C245 30 255 20 ${W} 22`,   color: '#FF6B35', dur: 6.3, begin: '-3.7s', r: 1.3 },
  ];

  return (
    <span className={`as-wm ${className}`}>
      <svg className="as-wm-svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <filter id={`${uid}g`} x="-60%" y="-120%" width="220%" height="340%">
            <feGaussianBlur stdDeviation="2.8" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {sparks.map((s, i) => (
            <path key={i} id={`${uid}p${i}`} d={s.d} fill="none" />
          ))}
        </defs>

        {/* Faint spine traces */}
        {sparks.map((s, i) => (
          <path key={i} d={s.d} stroke={s.color} strokeWidth="0.6" fill="none" opacity="0.18" />
        ))}

        {/* Traveling glow dots */}
        {sparks.map((s, i) => (
          <g key={i} filter={`url(#${uid}g)`}>
            <circle r={s.r} fill={s.color} opacity="0.95">
              <animateMotion dur={`${s.dur}s`} begin={s.begin} repeatCount="indefinite">
                <mpath href={`#${uid}p${i}`} />
              </animateMotion>
            </circle>
          </g>
        ))}
      </svg>

      <span className="as-wm-text">
        <span className="as-wm-agentic">Agentic</span><span className="as-wm-studio">Studio</span>
      </span>
    </span>
  );
}
