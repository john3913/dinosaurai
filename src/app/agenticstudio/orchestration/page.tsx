'use client';
import { useState, useRef, useEffect, useId } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import './orchestration.css';

// SVG layout: viewBox="0 0 870 660"
const NODES = [
  { id: 'coord', label: 'Coordinator',  role: 'Plans & delegates',    model: 'claude-opus-4-7',          color: '#FF6B35', x: 335, y: 30,  w: 200, h: 56 },
  { id: 'web',   label: 'Web Search',   role: 'Searches the web',     model: 'claude-sonnet-4-6',        color: '#F59E0B', x: 30,  y: 220, w: 200, h: 56 },
  { id: 'code',  label: 'Code Agent',   role: 'Analyzes repositories', model: 'claude-sonnet-4-6',       color: '#F59E0B', x: 335, y: 220, w: 200, h: 56 },
  { id: 'news',  label: 'News Monitor', role: 'Scans latest news',    model: 'claude-haiku-4-5-20251001', color: '#F59E0B', x: 640, y: 220, w: 200, h: 56 },
  { id: 'synth', label: 'Synthesizer',  role: 'Merges all findings',  model: 'claude-opus-4-7',          color: '#06B6D4', x: 335, y: 410, w: 200, h: 56 },
  { id: 'write', label: 'Writer Agent', role: 'Produces final output', model: 'claude-sonnet-4-6',       color: '#34D399', x: 335, y: 580, w: 200, h: 56 },
];

const EDGES = [
  { id: 'c-w',  path: 'M435,86 C435,165 130,155 130,220',   activePhases: ['delegate'],          color: '#FF6B35', dur: 1.8, begin: '0s' },
  { id: 'c-c',  path: 'M435,86 L435,220',                    activePhases: ['delegate'],          color: '#FF6B35', dur: 1.4, begin: '-0.3s' },
  { id: 'c-n',  path: 'M435,86 C435,165 740,155 740,220',   activePhases: ['delegate'],          color: '#FF6B35', dur: 1.8, begin: '-0.6s' },
  { id: 'w-s',  path: 'M130,276 C130,365 335,380 335,410',  activePhases: ['converge'],          color: '#F59E0B', dur: 1.8, begin: '0s' },
  { id: 'c-s',  path: 'M435,276 L435,410',                   activePhases: ['converge'],          color: '#F59E0B', dur: 1.4, begin: '-0.2s' },
  { id: 'n-s',  path: 'M740,276 C740,365 535,380 535,410',  activePhases: ['converge'],          color: '#F59E0B', dur: 1.8, begin: '-0.4s' },
  { id: 's-w',  path: 'M435,466 L435,580',                   activePhases: ['write'],             color: '#06B6D4', dur: 1.2, begin: '0s' },
];

const AGENT_PHASES: Record<string, string[]> = {
  coord: ['plan'],
  web:   ['parallel'],
  code:  ['parallel'],
  news:  ['parallel'],
  synth: ['synthesize'],
  write: ['write'],
};

type Phase = 'idle' | 'plan' | 'delegate' | 'parallel' | 'converge' | 'synthesize' | 'write' | 'done';

const PHASE_ORDER: Phase[] = ['plan', 'delegate', 'parallel', 'converge', 'synthesize', 'write', 'done'];
const PHASE_DURATIONS: Record<Phase, number> = {
  idle: 0, plan: 1800, delegate: 1400, parallel: 2800, converge: 1400, synthesize: 2200, write: 1800, done: 0,
};

const LOG_MESSAGES: Partial<Record<Phase, string[]>> = {
  plan: [
    '[Coordinator] Task received: "Research latest AI safety breakthroughs"',
    '[Coordinator] Decomposing task into 3 parallel workstreams...',
    '[Coordinator] Assigning: web search, code analysis, news monitoring',
  ],
  delegate: [
    '[Coordinator → Web Search] Query: "AI safety 2024 breakthroughs site:arxiv.org"',
    '[Coordinator → Code Agent] Repos: anthropics/evals, openai/safety-gym, deepmind/safety-research',
    '[Coordinator → News Monitor] Sources: Twitter/X, arXiv RSS, LessWrong, AI Safety Newsletter',
  ],
  parallel: [
    '[Web Search] Fetching results... 847 results found',
    '[Code Agent] Cloning repos... analyzing 24,400 commits',
    '[News Monitor] Scanning 3 feeds... 142 articles indexed',
    '[Web Search] Top result: "Towards Guaranteed Safe AI" (2,840 citations)',
    '[Code Agent] Activity spike detected in anthropics/evals — 47 commits this week',
    '[News Monitor] Breaking: Anthropic publishes new alignment research methodology',
  ],
  converge: [
    '[Web Search → Synthesizer] 15 ranked papers with abstracts (3,240 tokens)',
    '[Code Agent → Synthesizer] Repository analysis: 3 key projects, activity report (1,820 tokens)',
    '[News Monitor → Synthesizer] 8 curated news items with summaries (2,100 tokens)',
  ],
  synthesize: [
    '[Synthesizer] Merging 7,160 tokens of parallel research...',
    '[Synthesizer] Deduplicating and cross-referencing findings...',
    '[Synthesizer] Ranking by impact and recency...',
    '[Synthesizer] Structured summary ready — passing to Writer Agent',
  ],
  write: [
    '[Writer Agent] Drafting final report...',
    '[Writer Agent] Formatting citations and key findings...',
    '[Writer Agent] Report complete: 487 tokens, 4 sections',
  ],
  done: [
    '[Orchestration Complete] Total wall-clock: 9.4s | Input: 12,480 tok | Output: 2,847 tok',
    '[Orchestration Complete] Estimated cost: $0.0124 | 6 agents | 0 errors',
  ],
};

export default function Orchestration() {
  const uid = useId().replace(/:/g, '');
  const [phase, setPhase] = useState<Phase>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[] | undefined>([]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  function addLog(msgs: string[], baseDelay = 0) {
    msgs.forEach((m, i) => {
      timerRefs.current.push(setTimeout(() => setLog(l => [...l, m]), baseDelay + i * 340));
    });
  }

  async function runOrchestration() {
    if (running) return;
    setRunning(true);
    setPhase('idle');
    setLog([]);
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];

    let elapsed = 200;
    for (const p of PHASE_ORDER) {
      const delay = elapsed;
      timerRefs.current.push(setTimeout(() => setPhase(p), delay));
      const msgs = LOG_MESSAGES[p] ?? [];
      addLog(msgs, delay + 100);
      elapsed += PHASE_DURATIONS[p] + 200;
    }

    timerRefs.current.push(setTimeout(() => setRunning(false), elapsed));
  }

  function reset() {
    timerRefs.current.forEach(clearTimeout);
    setPhase('idle');
    setLog([]);
    setRunning(false);
  }

  function isEdgeActive(edge: typeof EDGES[0]): boolean {
    return edge.activePhases.includes(phase);
  }

  function isNodeActive(nodeId: string): boolean {
    return (AGENT_PHASES[nodeId] ?? []).includes(phase);
  }

  function isNodeDone(nodeId: string): boolean {
    const nodePhase = AGENT_PHASES[nodeId]?.[0] as Phase | undefined;
    if (!nodePhase) return false;
    const nodeIdx = PHASE_ORDER.indexOf(nodePhase);
    const curIdx = PHASE_ORDER.indexOf(phase);
    return curIdx > nodeIdx;
  }

  return (
    <div className="orc-root">
      <header className="orc-bar">
        <Link href="/agenticstudio" className="orc-bar-logo"><AgenticWordmark /></Link>
        <div className="orc-bar-sep" />
        <span className="orc-bar-title">Multi-Agent Orchestration</span>
        <div className="orc-bar-space" />
        <span className="orc-phase-badge">{phase === 'idle' ? 'Ready' : phase === 'done' ? 'Complete ✓' : phase.charAt(0).toUpperCase() + phase.slice(1) + '…'}</span>
      </header>

      <div className="orc-controls">
        <button className="orc-run" onClick={runOrchestration} disabled={running}>
          {running ? <><span className="orc-spin" />Running…</> : phase === 'done' ? '↺  Run Again' : '▶  Run Orchestration'}
        </button>
        {(running || phase !== 'idle') && <button className="orc-reset" onClick={reset}>Reset</button>}
        <div className="orc-phase-track">
          {PHASE_ORDER.filter(p => p !== 'done').map(p => {
            const curIdx = PHASE_ORDER.indexOf(phase);
            const pIdx = PHASE_ORDER.indexOf(p);
            const state = curIdx > pIdx ? 'done' : curIdx === pIdx ? 'active' : 'future';
            return (
              <div key={p} className={`orc-phase-step orc-phase-${state}`}>
                <div className="orc-phase-dot" />
                <span>{p}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="orc-layout">
        {/* SVG graph */}
        <div className="orc-graph-wrap">
          <svg className="orc-svg" viewBox="0 0 870 660" preserveAspectRatio="xMidYMid meet">
            <defs>
              <filter id={`${uid}glow`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>

              {/* Edge paths for animateMotion */}
              {EDGES.map(e => (
                <path key={e.id} id={`${uid}${e.id}`} d={e.path} fill="none" />
              ))}
            </defs>

            {/* Edge lines */}
            {EDGES.map(e => (
              <path key={e.id} d={e.path} stroke={e.color}
                strokeWidth={isEdgeActive(e) ? 1.5 : 0.6}
                fill="none"
                opacity={isEdgeActive(e) ? 0.6 : 0.15}
                style={{ transition: 'opacity 0.4s, stroke-width 0.4s' }}
              />
            ))}

            {/* Traveling dots */}
            {EDGES.map(e => (
              <g key={e.id} filter={isEdgeActive(e) ? `url(#${uid}glow)` : undefined}
                opacity={isEdgeActive(e) ? 1 : 0}
                style={{ transition: 'opacity 0.3s' }}>
                <circle r="4" fill={e.color}>
                  <animateMotion dur={`${e.dur}s`} begin={e.begin} repeatCount="indefinite">
                    <mpath href={`#${uid}${e.id}`} />
                  </animateMotion>
                </circle>
              </g>
            ))}

            {/* Nodes */}
            {NODES.map(n => {
              const active = isNodeActive(n.id);
              const done = isNodeDone(n.id);
              return (
                <g key={n.id} filter={active ? `url(#${uid}glow)` : undefined}>
                  <rect
                    x={n.x} y={n.y} width={n.w} height={n.h}
                    rx="8"
                    fill={active ? `color-mix(in srgb, ${n.color} 18%, #070A0F)` : done ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)'}
                    stroke={active ? n.color : done ? `${n.color}60` : 'rgba(255,255,255,0.1)'}
                    strokeWidth={active ? 1.5 : 1}
                    style={{ transition: 'all 0.4s' }}
                  />
                  {/* Status dot */}
                  <circle cx={n.x + n.w - 14} cy={n.y + 14} r={4}
                    fill={active ? n.color : done ? '#34D399' : 'rgba(255,255,255,0.15)'}
                    style={{ transition: 'fill 0.3s' }}>
                    {active && <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />}
                  </circle>
                  <text x={n.x + 14} y={n.y + 22} fill={active ? n.color : done ? 'rgba(232,234,240,0.8)' : 'rgba(232,234,240,0.5)'}
                    fontSize="13" fontWeight="600" fontFamily="var(--font-inter-tight, sans-serif)"
                    style={{ transition: 'fill 0.3s' }}>
                    {n.label}
                  </text>
                  <text x={n.x + 14} y={n.y + 38} fill="rgba(232,234,240,0.35)" fontSize="10.5"
                    fontFamily="var(--font-inter-tight, sans-serif)">{n.role}</text>
                  <text x={n.x + 14} y={n.y + 50} fill="rgba(232,234,240,0.25)" fontSize="9.5"
                    fontFamily="var(--font-jetbrains-mono, monospace)">{n.model.split('-').slice(0, 2).join('-')}</text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Log panel */}
        <aside className="orc-log-panel">
          <div className="orc-log-title">Execution Log</div>
          <div className="orc-log" ref={logRef}>
            {log.length === 0 && <div className="orc-log-empty">Hit Run to watch agents collaborate in real time</div>}
            {log.map((msg, i) => {
              const bracket = msg.match(/^\[([^\]]+)\]/)?.[1] ?? '';
              const isCoord = bracket.startsWith('Coordinator');
              const isComplete = bracket.startsWith('Orchestration');
              const color = isCoord ? '#FF6B35' : isComplete ? '#34D399' : 'rgba(232,234,240,0.55)';
              return (
                <div key={i} className="orc-log-line" style={{ color }}>
                  <span className="orc-log-time">{String(i).padStart(2, '0')}</span>
                  {msg}
                </div>
              );
            })}
            {running && log.length > 0 && <div className="orc-log-cursor" />}
          </div>
        </aside>
      </div>
    </div>
  );
}
