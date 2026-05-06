'use client';
import Link from 'next/link';
import './hermes.css';

/* ── Orbital geometry ────────────────────────────────────────────────────── */

const CX = 820, CY = 280;

function orb(r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

const INNER = [0, 60, 120, 180, 240, 300].map(d => orb(130, d));
const OUTER = [30, 90, 150, 210, 270, 330].map(d => orb(230, d));

const INNER_LABELS = ['bash()', 'memory.get()', 'tool:search', 'skills.run()', 'file.read()', 'plan()'];
const OUTER_LABELS = ['stream()', 'jobs.queue()', 'context.load()', 'subagent', 'models', 'user_task'];

// Spoke paths: center → inner
const SPOKES = INNER.map(n => `M ${CX} ${CY} L ${n.x} ${n.y}`);

// Cross paths: inner → nearest outer (same index + next)
const CROSS: string[] = [];
for (let i = 0; i < 6; i++) {
  const inn = INNER[i];
  CROSS.push(`M ${inn.x} ${inn.y} L ${OUTER[i].x} ${OUTER[i].y}`);
  CROSS.push(`M ${inn.x} ${inn.y} L ${OUTER[(i + 1) % 6].x} ${OUTER[(i + 1) % 6].y}`);
}

// Motion paths for animateMotion dots
const SPOKE_PATHS = INNER.map((n, i) => ({
  id: `hm-sp-${i}`,
  d: `M ${CX} ${CY} L ${n.x} ${n.y}`,
  color: '#00D4FF',
  dur: 1.8 + i * 0.25,
  begin: `${-i * 0.55}s`,
}));

const CROSS_PATHS = OUTER.map((n, i) => ({
  id: `hm-cp-${i}`,
  d: `M ${INNER[i].x} ${INNER[i].y} L ${n.x} ${n.y}`,
  color: i % 2 === 0 ? '#FF6B35' : '#9B5CF6',
  dur: 2.2 + i * 0.3,
  begin: `${-i * 0.7 - 0.3}s`,
}));

// Long dramatic arcs (cross the orbital)
const LONG_ARCS = [
  {
    d: `M ${OUTER[5].x} ${OUTER[5].y} A 240 240 0 0 1 ${OUTER[2].x} ${OUTER[2].y}`,
    color: 'rgba(0,212,255,0.045)',
    dur: 14,
    begin: '-4s',
    dotColor: '#00D4FF',
  },
  {
    d: `M ${OUTER[0].x} ${OUTER[0].y} A 240 240 0 0 1 ${OUTER[3].x} ${OUTER[3].y}`,
    color: 'rgba(155,92,246,0.04)',
    dur: 18,
    begin: '-9s',
    dotColor: '#9B5CF6',
  },
];

function HermesCanvas() {
  return (
    <svg
      className="hm-hero-canvas"
      viewBox="0 0 1200 560"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <filter id="hm-bloom" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="hm-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="hm-vig" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="100%" stopColor="#07090F" />
        </radialGradient>

        {/* Spoke motion paths */}
        {SPOKE_PATHS.map(p => (
          <path key={p.id} id={p.id} d={p.d} fill="none" stroke="none" />
        ))}
        {/* Cross motion paths */}
        {CROSS_PATHS.map(p => (
          <path key={p.id} id={p.id} d={p.d} fill="none" stroke="none" />
        ))}
        {/* Long arc motion paths */}
        {LONG_ARCS.map((a, i) => (
          <path key={i} id={`hm-arc-${i}`} d={a.d} fill="none" stroke="none" />
        ))}
      </defs>

      {/* Faint orbital ring guidelines */}
      <circle cx={CX} cy={CY} r={130} fill="none" stroke="rgba(0,212,255,0.055)" strokeWidth={1} />
      <circle cx={CX} cy={CY} r={230} fill="none" stroke="rgba(0,212,255,0.035)" strokeWidth={1} />

      {/* Long arc backbones */}
      {LONG_ARCS.map((a, i) => (
        <path key={i} d={a.d} fill="none" stroke={a.color} strokeWidth={1} />
      ))}

      {/* Backbone spokes */}
      {SPOKES.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="rgba(0,212,255,0.065)" strokeWidth={1} />
      ))}

      {/* Backbone cross edges */}
      {CROSS.map((d, i) => (
        <path key={i} d={d} fill="none"
          stroke={i % 2 === 0 ? 'rgba(255,107,53,0.05)' : 'rgba(155,92,246,0.045)'}
          strokeWidth={1}
        />
      ))}

      {/* Traveling sparks on spokes */}
      {SPOKES.map((d, i) => (
        <path key={i} d={d} fill="none"
          stroke="rgba(0,212,255,0.6)" strokeWidth={1.3} strokeLinecap="round"
          pathLength={100} strokeDasharray="4 96"
          style={{
            animation: `hm-spark ${2.0 + i * 0.28}s linear infinite`,
            animationDelay: `-${(i * 0.62) % 2.5}s`,
          }}
        />
      ))}

      {/* Traveling sparks on cross edges */}
      {CROSS.map((d, i) => (
        <path key={i} d={d} fill="none"
          stroke={i % 2 === 0 ? 'rgba(255,107,53,0.52)' : 'rgba(155,92,246,0.46)'}
          strokeWidth={1.2} strokeLinecap="round"
          pathLength={100} strokeDasharray="4 96"
          style={{
            animation: `hm-spark ${2.6 + (i % 7) * 0.32}s linear infinite`,
            animationDelay: `-${(i * 0.55) % 3.2}s`,
          }}
        />
      ))}

      {/* Outer ring nodes */}
      {OUTER.map((n, i) => (
        <g key={i} filter="url(#hm-bloom)">
          <circle cx={n.x} cy={n.y} r={4.5} fill="#9B5CF6" opacity={0.85} />
          {i !== 3 && ( // skip label for subagent (overlaps content)
            <text
              x={n.x + (n.x < CX ? -8 : 10)} y={n.y + 4}
              fill="rgba(155,92,246,0.65)"
              fontSize={8.5}
              fontFamily="var(--font-jetbrains-mono)"
              textAnchor={n.x < CX ? 'end' : 'start'}
              style={{ animation: 'hm-label 4s ease-in-out infinite', animationDelay: `-${i * 0.9}s` }}
            >
              {OUTER_LABELS[i]}
            </text>
          )}
        </g>
      ))}

      {/* Inner ring nodes */}
      {INNER.map((n, i) => (
        <g key={i} filter="url(#hm-bloom)">
          <circle cx={n.x} cy={n.y} r={5.5} fill="#FF6B35" opacity={0.9} />
          {i !== 3 && ( // skip label for skills.run() (overlaps content)
            <text
              x={n.x + (n.x < CX ? -9 : 10)} y={n.y + 4}
              fill="rgba(255,107,53,0.72)"
              fontSize={9}
              fontFamily="var(--font-jetbrains-mono)"
              textAnchor={n.x < CX ? 'end' : 'start'}
              style={{ animation: 'hm-label 3.5s ease-in-out infinite', animationDelay: `-${i * 0.65}s` }}
            >
              {INNER_LABELS[i]}
            </text>
          )}
        </g>
      ))}

      {/* Center node */}
      <g filter="url(#hm-glow)">
        <circle cx={CX} cy={CY} r={24} fill="rgba(0,212,255,0.08)" stroke="#00D4FF" strokeWidth={1.5} />
        <circle cx={CX} cy={CY} r={10} fill="#00D4FF" opacity={0.95} />
        <text
          x={CX + 32} y={CY + 4}
          fill="rgba(0,212,255,0.75)"
          fontSize={11}
          fontFamily="var(--font-jetbrains-mono)"
          style={{ animation: 'hm-label 5s ease-in-out infinite' }}
        >
          hermes
        </text>
      </g>

      {/* Traveling dots on spokes */}
      {SPOKE_PATHS.map(p => (
        <circle key={p.id} r={2.5} fill={p.color} filter="url(#hm-bloom)" opacity={0.9}>
          <animateMotion dur={`${p.dur}s`} repeatCount="indefinite" begin={p.begin}>
            <mpath href={`#${p.id}`} />
          </animateMotion>
        </circle>
      ))}

      {/* Traveling dots on cross paths */}
      {CROSS_PATHS.map(p => (
        <circle key={p.id} r={2} fill={p.color} filter="url(#hm-bloom)" opacity={0.8}>
          <animateMotion dur={`${p.dur}s`} repeatCount="indefinite" begin={p.begin}>
            <mpath href={`#${p.id}`} />
          </animateMotion>
        </circle>
      ))}

      {/* Traveling dots on long arcs */}
      {LONG_ARCS.map((a, i) => (
        <circle key={i} r={2.5} fill={a.dotColor} filter="url(#hm-bloom)" opacity={0.7}>
          <animateMotion dur={`${a.dur}s`} repeatCount="indefinite" begin={a.begin}>
            <mpath href={`#hm-arc-${i}`} />
          </animateMotion>
        </circle>
      ))}

      {/* Vignette overlay */}
      <rect x={0} y={0} width={1200} height={560} fill="url(#hm-vig)" />
    </svg>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function HermesPage() {
  return (
    <div className="hm-root">
      <nav className="hm-nav">
        <Link href="/" className="hm-nav-logo">
          <span className="hm-dino">DINOSAUR</span>
          <span className="hm-ai">AI</span>
        </Link>
        <div className="hm-nav-links">
          <Link href="/agenticstudio">AgenticStudio</Link>
          <a href="https://hermes-mu-lime.vercel.app" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </div>
        <a
          href="https://hermes-mu-lime.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="hm-nav-cta"
        >
          View App
        </a>
      </nav>

      <section className="hm-hero">
        <HermesCanvas />
        <div className="hm-hero-content">
          <div className="hm-badge">NousResearch · Hermes Agent</div>
          <h1 className="hm-headline">
            <span className="hm-wordmark">HERMES</span>
          </h1>
          <p className="hm-sub">
            An interactive UI for the Hermes self-improving AI agent — streaming tool execution,
            persistent memory, and multi-model orchestration.
          </p>
          <div className="hm-actions">
            <a
              href="https://hermes-mu-lime.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hm-btn-primary"
            >
              Get Started
            </a>
            <a
              href="https://github.com/nousresearch/hermes-agent"
              target="_blank"
              rel="noopener noreferrer"
              className="hm-btn-ghost"
            >
              Hermes Agent ↗
            </a>
          </div>
        </div>
      </section>

      <section className="hm-features">
        <div className="hm-features-grid">
          {[
            {
              color: '#00D4FF',
              label: 'Streaming',
              desc: 'Real-time SSE token streaming with live tool execution events as they happen.',
            },
            {
              color: '#FF6B35',
              label: 'Tools',
              desc: 'Bash, file ops, web search — every tool call surfaced with inputs and outputs.',
            },
            {
              color: '#9B5CF6',
              label: 'Memory',
              desc: 'Persistent cross-session memory and a skill library that grows over time.',
            },
            {
              color: '#7EFF50',
              label: 'Multi-model',
              desc: 'Switch between 200+ models via OpenRouter, OpenAI, Anthropic, and more.',
            },
          ].map((f, i) => (
            <div
              key={i}
              className="hm-feature-card"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="hm-feature-dot" style={{ background: f.color }} />
              <div className="hm-feature-label">{f.label}</div>
              <div className="hm-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="hm-footer">
        <Link href="/">← Dinosaurai</Link>
        <span>
          Built on{' '}
          <a
            href="https://github.com/nousresearch/hermes-agent"
            target="_blank"
            rel="noopener noreferrer"
          >
            NousResearch Hermes Agent
          </a>
        </span>
      </footer>
    </div>
  );
}
