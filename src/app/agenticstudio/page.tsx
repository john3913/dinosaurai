'use client';
import Link from 'next/link';
import './landing.css';
import { AgenticWordmark } from './Wordmark';

// ── Graph data ────────────────────────────────────────────────────────────────
const GN = [
  // col 0  (input layer)
  { x: 70,  y: 120 }, { x: 70,  y: 290 }, { x: 70,  y: 460 },
  // col 1
  { x: 240, y: 75  }, { x: 240, y: 210 }, { x: 240, y: 345 }, { x: 240, y: 490 },
  // col 2  (hub A: node 8)
  { x: 430, y: 105 }, { x: 430, y: 250 }, { x: 430, y: 390 }, { x: 430, y: 520 },
  // col 3  (hub B: node 13)
  { x: 620, y: 70  }, { x: 620, y: 195 }, { x: 620, y: 330 }, { x: 620, y: 475 },
  // col 4  (hub C: node 16)
  { x: 810, y: 130 }, { x: 810, y: 275 }, { x: 810, y: 415 }, { x: 810, y: 535 },
  // col 5  (hub D: node 20)
  { x: 990, y: 115 }, { x: 990, y: 265 }, { x: 990, y: 435 },
  // col 6  (output layer)
  { x: 1140, y: 185 }, { x: 1140, y: 340 }, { x: 1140, y: 490 },
];

const HUB_NODES = new Set([8, 13, 16, 20]);

const GE: [number, number][] = [
  [0,3],[0,4],[1,4],[1,5],[2,5],[2,6],
  [3,7],[4,7],[4,8],[5,8],[5,9],[6,9],[6,10],
  [7,11],[7,12],[8,12],[8,13],[9,13],[9,14],[10,14],
  [11,15],[12,15],[12,16],[13,16],[13,17],[14,17],[14,18],
  [15,19],[16,19],[16,20],[17,20],[17,21],[18,21],
  [19,22],[20,22],[20,23],[21,23],[21,24],
  [0,7],[2,10],[8,16],[13,20],
];

// Dramatic long arcs that leap over / under the main graph
const LONG_ARCS = [
  { d: 'M 70 120 C 300 -160 900 -160 1140 185', color: '#FF6B35', bbColor: 'rgba(255,107,53,0.045)', dur: 8.5, begin: '-3.1s' },
  { d: 'M 70 460 C 300 710 900 710 1140 490',   color: '#06B6D4', bbColor: 'rgba(6,182,212,0.04)',   dur: 9.8, begin: '-1.4s' },
  { d: 'M 70 290 C 500 -60 750 640 1140 340',   color: '#F59E0B', bbColor: 'rgba(245,158,11,0.035)', dur: 11.2, begin: '-5.8s' },
];

// Floating labels on key nodes
const LABELS = [
  { i: 0,  text: 'user_task',      dx: 10, dy: -10, delay: '0s'    },
  { i: 8,  text: 'orchestrate()',  dx: 10, dy: -14, delay: '-2.4s' },
  { i: 13, text: 'tool:search',    dx: 10, dy: -14, delay: '-5.1s' },
  { i: 16, text: 'memory.get()',   dx: 10, dy: -14, delay: '-1.7s' },
  { i: 20, text: 'synthesize()',   dx: 10, dy: -14, delay: '-3.8s' },
  { i: 22, text: '→ response',     dx: 10, dy: -10, delay: '-7.2s' },
];

// Traveling dot flows
const DOTS = [
  { path: [0,3,7,11,15,19,22], color: '#FF6B35', dur: 5.0, begin: '0s',    r: 3   },
  { path: [1,4,8,12,16,20,23], color: '#F59E0B', dur: 5.6, begin: '-1.8s', r: 2.5 },
  { path: [2,5,9,13,17,21,24], color: '#06B6D4', dur: 4.8, begin: '-3.2s', r: 2.5 },
  { path: [0,4,8,13,17,20,23], color: '#FF6B35', dur: 6.1, begin: '-2.5s', r: 2   },
  { path: [1,5,9,14,18,21,24], color: '#F59E0B', dur: 5.2, begin: '-4.1s', r: 2   },
  { path: [2,6,10,14,17,20,22],color: '#06B6D4', dur: 4.4, begin: '-0.9s', r: 2.5 },
  { path: [0,4,8,12,15,20,23], color: '#F59E0B', dur: 5.9, begin: '-3.6s', r: 2   },
  { path: [1,5,8,13,16,19,22], color: '#FF6B35', dur: 4.2, begin: '-2.1s', r: 3   },
  { path: [2,6,10,14,18,21,23],color: '#06B6D4', dur: 6.3, begin: '-0.4s', r: 2   },
];

function bezier(idxs: number[]) {
  const pts = idxs.map(i => GN[i]);
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i];
    const mx = (p.x + c.x) / 2;
    d += ` C ${mx} ${p.y} ${mx} ${c.y} ${c.x} ${c.y}`;
  }
  return d;
}

function edgePath(a: number, b: number) {
  const p = GN[a], c = GN[b];
  const mx = (p.x + c.x) / 2;
  return `M ${p.x} ${p.y} C ${mx} ${p.y} ${mx} ${c.y} ${c.x} ${c.y}`;
}

function trailBegin(begin: string, offsetSec: number): string {
  return `${parseFloat(begin) + offsetSec}s`;
}

// ── Spark canvas background ────────────────────────────────────────────────────
function SparkCanvas() {
  return (
    <svg
      className="as-hero-canvas"
      viewBox="0 0 1200 560"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <filter id="as-bloom" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="as-node-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="as-arc-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="as-vig" cx="50%" cy="50%" r="58%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="100%" stopColor="#070A0F" />
        </radialGradient>
        {/* Motion paths for node flows */}
        {DOTS.map((dot, i) => (
          <path key={i} id={`as-mp-${i}`} d={bezier(dot.path)} fill="none" stroke="none" />
        ))}
        {/* Motion paths for long arcs */}
        {LONG_ARCS.map((arc, i) => (
          <path key={i} id={`as-arc-${i}`} d={arc.d} fill="none" stroke="none" />
        ))}
      </defs>

      {/* Long arc backbones (very faint, dramatic curves) */}
      {LONG_ARCS.map((arc, i) => (
        <path key={`arcbb${i}`} d={arc.d} fill="none"
          stroke={arc.bbColor} strokeWidth={1} />
      ))}

      {/* Faint backbone edges */}
      {GE.map(([a, b], i) => (
        <path key={`bb${i}`} d={edgePath(a, b)} fill="none"
          stroke="rgba(255,107,53,0.065)" strokeWidth={1} />
      ))}

      {/* Idle spark traces */}
      {GE.map(([a, b], i) => {
        const color = i % 3 === 0 ? 'rgba(255,107,53,0.5)'
                    : i % 3 === 1 ? 'rgba(245,158,11,0.44)'
                    :               'rgba(6,182,212,0.38)';
        return (
          <path key={`sp${i}`} d={edgePath(a, b)} fill="none"
            stroke={color} strokeWidth={1.2} strokeLinecap="round"
            pathLength={100} strokeDasharray="5 95"
            style={{
              animation: `as-spark-fwd ${5.5 + (i % 8) * 0.55}s linear infinite`,
              animationDelay: `-${(i * 1.37) % 7.5}s`,
            }}
          />
        );
      })}

      {/* Regular nodes */}
      {GN.map((n, i) => !HUB_NODES.has(i) && (
        <circle key={`nd${i}`} cx={n.x} cy={n.y} r={2.5}
          fill="rgba(255,107,53,0.22)" />
      ))}

      {/* Hub nodes — outer faint ring + glowing core */}
      {[...HUB_NODES].map(i => (
        <g key={`hub${i}`}>
          <circle cx={GN[i].x} cy={GN[i].y} r={11}
            fill="none" stroke="rgba(255,107,53,0.12)" strokeWidth={1} />
          <circle cx={GN[i].x} cy={GN[i].y} r={4.5}
            fill="rgba(255,107,53,0.55)" filter="url(#as-node-glow)" />
        </g>
      ))}

      {/* Floating monospace labels on key nodes */}
      {LABELS.map(({ i, text, dx, dy, delay }) => (
        <text
          key={`lbl${i}`}
          x={GN[i].x + dx}
          y={GN[i].y + dy}
          fontSize={9}
          fontFamily="'JetBrains Mono', 'Courier New', monospace"
          fill="rgba(255,107,53,0.75)"
          style={{
            animation: 'as-label-fade 9s ease-in-out infinite',
            animationDelay: delay,
          }}
        >
          {text}
        </text>
      ))}

      {/* Ghost trails (follow same path, lag behind) */}
      {DOTS.map((dot, i) => (
        <circle key={`ghost${i}`} r={dot.r * 0.5} fill={dot.color} opacity={0.28}
          filter="url(#as-bloom)">
          <animateMotion dur={`${dot.dur}s`} repeatCount="indefinite"
            begin={trailBegin(dot.begin, 0.38)} calcMode="paced">
            <mpath href={`#as-mp-${i}`} />
          </animateMotion>
        </circle>
      ))}

      {/* Primary traveling dots */}
      {DOTS.map((dot, i) => (
        <circle key={`td${i}`} r={dot.r} fill={dot.color} filter="url(#as-bloom)">
          <animateMotion dur={`${dot.dur}s`} repeatCount="indefinite"
            begin={dot.begin} calcMode="paced">
            <mpath href={`#as-mp-${i}`} />
          </animateMotion>
        </circle>
      ))}

      {/* Long-arc traveling dots (slower, dramatic) */}
      {LONG_ARCS.map((arc, i) => (
        <circle key={`arcdot${i}`} r={2.5} fill={arc.color}
          filter="url(#as-arc-glow)" opacity={0.85}>
          <animateMotion dur={`${arc.dur}s`} repeatCount="indefinite"
            begin={arc.begin} calcMode="paced">
            <mpath href={`#as-arc-${i}`} />
          </animateMotion>
        </circle>
      ))}

      {/* Vignette */}
      <rect x={0} y={0} width={1200} height={560} fill="url(#as-vig)" />
    </svg>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────

const MODELS = [
  { name: 'Claude 4', maker: 'Anthropic', color: '#FF6B35' },
  { name: 'GPT-4o', maker: 'OpenAI', color: '#10A37F' },
  { name: 'Gemini 2.5', maker: 'Google', color: '#4285F4' },
  { name: 'Mistral', maker: 'Mistral AI', color: '#F59E0B' },
  { name: 'Llama 3.3', maker: 'Meta', color: '#0668E1' },
  { name: 'Command R+', maker: 'Cohere', color: '#39C5BB' },
];

const FEATURES = [
  { num: '01', title: 'Agent Builder',           href: '/agenticstudio/app',         desc: 'Design multi-step agentic workflows with a visual node editor. Wire tools, memory, sub-agents, and decision branches without writing orchestration boilerplate.', tags: ['tool-use', 'orchestration', 'visual'],   color: '#FF6B35' },
  { num: '02', title: 'Tool Use Studio',          href: '/agenticstudio/tools',        desc: 'Build, validate, and test JSON tool schemas interactively. Live sandbox shows you exact tool_use and tool_result blocks in a full API trace before you ship.', tags: ['tool-use', 'JSON schema', 'sandbox'],    color: '#F59E0B' },
  { num: '03', title: 'MCP Server Builder',       href: '/agenticstudio/mcp-builder',  desc: 'Scaffold Model Context Protocol servers visually. Define tools and parameters, choose stdio or HTTP transport, and get production-ready TypeScript or Python instantly.', tags: ['MCP', 'server', 'codegen'],             color: '#06B6D4' },
  { num: '04', title: 'Multi-Agent Orchestration', href: '/agenticstudio/orchestration',                           desc: 'Chain specialized sub-agents with typed state handoffs, retry logic, and parallel fan-out. Visualize execution graphs and inspect every message passed between agents.', tags: ['parallel', 'state', 'sub-agents'],      color: '#A78BFA' },
  { num: '05', title: 'Prompt Engineering Lab',   href: '/agenticstudio/prompt-lab',   desc: 'A/B test prompts across multiple models simultaneously. Watch two system prompts stream responses side-by-side with token counts, latency, and word-count diffs.', tags: ['eval', 'A/B test', 'multi-model'],      color: '#34D399' },
  { num: '06', title: 'Memory & Context Manager', href: '/agenticstudio/memory',       desc: 'Visualize your entire context window as a proportional token bar. Inspect every message, see per-role token breakdowns, and get optimization suggestions before you hit limits.', tags: ['context', 'tokens', 'visualization'], color: '#F472B6' },
  { num: '07', title: 'Evaluation Framework',     href: '/agenticstudio/evals',                            desc: 'Define evals as code: expected outputs, rubric graders, factual-consistency checks, and latency SLOs. Run in CI/CD to catch regressions before every release.', tags: ['evals', 'CI/CD', 'grading'],            color: '#FB923C' },
  { num: '08', title: 'API Gateway & Cost Tracker', href: '/agenticstudio/gateway',                          desc: 'Unified API key management across providers. Route requests by cost, latency, or capability. Real-time token burn dashboards with per-project budgets and alerts.', tags: ['routing', 'cost', 'observability'],     color: '#818CF8' },
  { num: '09', title: 'Streaming Console',        href: '/agenticstudio/streaming',    desc: 'Visualize token-by-token streaming output from any model. See latency, time-to-first-token, tokens-per-second, and estimated cost — live, in real time.', tags: ['streaming', 'latency', 'real-time'],    color: '#22D3EE' },
  { num: '10', title: 'Debug Trace',              href: '/agenticstudio/debug',                            desc: 'Step through agent execution one action at a time. Set breakpoints on tool calls, inspect state at every node, replay any sub-sequence with modified inputs.', tags: ['debugger', 'breakpoints', 'replay'],    color: '#FB923C' },
  { num: '11', title: 'Template Library',         href: '/agenticstudio/templates',                            desc: '60+ production-ready agent templates — research bots, data extractors, code reviewers, support agents. Fork, customize, and deploy in minutes.', tags: ['templates', 'quickstart', 'community'], color: '#A3E635' },
];

const STEPS = [
  {
    num: '01',
    title: 'Define your agent',
    desc: 'Describe the goal, select a model, and attach tools from our library or your own schemas.',
  },
  {
    num: '02',
    title: 'Wire up context',
    desc: 'Connect memory, documents, APIs, and sub-agents as context sources with typed handoffs.',
  },
  {
    num: '03',
    title: 'Test in sandbox',
    desc: 'Run live loops against real model APIs. Inspect every message, tool call, and state transition.',
  },
  {
    num: '04',
    title: 'Evaluate & iterate',
    desc: 'Score outputs with rubrics. Track regressions across versions. Ship with confidence.',
  },
  {
    num: '05',
    title: 'Deploy & monitor',
    desc: 'Export to TypeScript, Python, or deploy as a hosted endpoint. Monitor cost and latency live.',
  },
] as const;

const DEEP_MODELS = [
  {
    name: 'Claude 4 (Opus / Sonnet)',
    maker: 'Anthropic',
    accentColor: '#FF6B35',
    features: ['Extended tool use & computer use', 'MCP native support', 'Prompt caching up to 90% cost reduction', 'Vision + document understanding'],
  },
  {
    name: 'GPT-4o & o3',
    maker: 'OpenAI',
    accentColor: '#10A37F',
    features: ['Structured outputs via JSON mode', 'Function calling + parallel tools', 'Assistants API thread management', 'Real-time audio + vision'],
  },
  {
    name: 'Gemini 2.5 Pro',
    maker: 'Google',
    accentColor: '#4285F4',
    features: ['1M token context window', 'Native code execution sandbox', 'Grounding with Google Search', 'Multimodal inputs (video, audio)'],
  },
  {
    name: 'Mistral & Llama 3',
    maker: 'Open Source',
    accentColor: '#F59E0B',
    features: ['Self-hosted on your infrastructure', 'Fine-tuning workflows built in', 'GGUF / vLLM / Ollama support', 'Privacy-first, no data egress'],
  },
] as const;

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AgenticStudioPage() {
  return (
    <div className="as-root">

      {/* Nav */}
      <nav className="as-nav">
        <Link href="/agenticstudio" className="as-nav-logo">
          <AgenticWordmark />
        </Link>
        <ul className="as-nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#models">Models</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="https://github.com/john3913/agenticstudio" target="_blank" rel="noopener">GitHub</a></li>
        </ul>
        <a href="#features" className="as-nav-cta">Get started</a>
      </nav>

      {/* Hero */}
      <section className="as-hero">
        <SparkCanvas />
        <div className="as-hero-content">
          <div className="as-hero-eyebrow">
            <span className="as-hero-eyebrow-dot" />
            Agentic AI Development Platform
          </div>
          <h1 className="as-hero-h1">
            Build <em>autonomous agents</em><br />that actually ship
          </h1>
          <p className="as-hero-sub">
            AgenticStudio is the full-stack workspace for designing, testing, and deploying
            agentic AI features — for Claude, GPT-4, Gemini, and beyond.
          </p>
          <div className="as-hero-actions">
            <Link href="/agenticstudio/app" className="as-btn-primary">
              Open Agent Builder →
            </Link>
            <a
              href="https://github.com/john3913/agenticstudio"
              target="_blank"
              rel="noopener"
              className="as-btn-secondary"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Model strip */}
      <div className="as-models">
        <span className="as-models-label">Works with</span>
        <div className="as-model-chips">
          {MODELS.map((m) => (
            <div key={m.name} className="as-model-chip">
              <span className="as-model-dot" style={{ background: m.color }} />
              {m.name}
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="as-features" id="features">
        <div className="as-features-header">
          <div>
            <div className="as-section-label">Platform features</div>
            <h2 className="as-section-title">
              Everything you need to build production agents
            </h2>
          </div>
          <p className="as-section-body">
            From visual workflow design to live evals and cost monitoring —
            AgenticStudio covers the full development lifecycle so you ship
            reliable agentic systems, not prototypes.
          </p>
        </div>
        <div className="as-feature-grid">
          {FEATURES.map((f) => {
            const inner = (
              <>
                <div className="as-feature-num" style={{ color: f.color }}>{f.num}</div>
                <h3 className="as-feature-title">{f.title}</h3>
                <p className="as-feature-desc">{f.desc}</p>
                <div className="as-feature-tags">
                  {f.tags.map((t) => (
                    <span key={t} className="as-tag">{t}</span>
                  ))}
                </div>
                {f.href && <span className="as-feature-open" style={{ color: f.color }}>Open →</span>}
              </>
            );
            return f.href
              ? <Link key={f.num} href={f.href} className="as-feature-card as-feature-card-link" style={{ ['--fc' as string]: f.color }}>{inner}</Link>
              : <div key={f.num} className="as-feature-card">{inner}</div>;
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="as-steps" id="how">
        <div className="as-steps-inner">
          <div className="as-section-label">How it works</div>
          <h2 className="as-section-title">From idea to production in 5 steps</h2>
          <div className="as-steps-grid">
            {STEPS.map((s) => (
              <div key={s.num} className="as-step">
                <div className="as-step-num">{s.num}</div>
                <div className="as-step-title">{s.title}</div>
                <div className="as-step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Models deep dive */}
      <section className="as-section" id="models">
        <div className="as-section-label">Supported models</div>
        <h2 className="as-section-title">Every frontier model. One workspace.</h2>
        <p className="as-section-body">
          AgenticStudio normalizes API differences across providers so you can
          swap models, compare outputs, and pick the best fit for each task —
          without rewriting your agent logic.
        </p>
        <div className="as-model-grid">
          {DEEP_MODELS.map((m) => (
            <div key={m.name} className="as-model-card">
              <div
                className="as-model-card-accent"
                style={{ background: m.accentColor }}
              />
              <div className="as-model-card-name">{m.name}</div>
              <div className="as-model-card-maker">{m.maker}</div>
              <ul className="as-model-card-features">
                {m.features.map((feat) => (
                  <li
                    key={feat}
                    style={
                      { '--dot-color': m.accentColor } as React.CSSProperties
                    }
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: 4, height: 4,
                        borderRadius: '50%',
                        background: m.accentColor,
                        flexShrink: 0,
                      }}
                    />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="as-cta">
        <div className="as-cta-glow" />
        <div className="as-cta-inner">
          <h2 className="as-cta-title">
            Start building your first agent today
          </h2>
          <p className="as-cta-sub">
            Open source, free to use. Star the repo and follow along as
            AgenticStudio evolves — new features ship every week.
          </p>
          <div className="as-hero-actions">
            <Link href="/agenticstudio/app" className="as-btn-primary">
              Open Agent Builder →
            </Link>
            <a
              href="https://github.com/john3913/agenticstudio"
              target="_blank"
              rel="noopener"
              className="as-btn-secondary"
            >
              Star on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="as-footer">
        <span className="as-footer-copy">
          © 2026 AgenticStudio
        </span>
        <div className="as-footer-links">
          <a href="https://github.com/john3913/agenticstudio" target="_blank" rel="noopener">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
