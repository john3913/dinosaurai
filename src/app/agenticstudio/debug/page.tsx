'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import './debug.css';

type StepType = 'input' | 'tool_call' | 'tool_result' | 'reasoning' | 'output';
interface TraceStep {
  id: number;
  type: StepType;
  label: string;
  t: number;
  durationMs: number;
  data: Record<string, unknown>;
}

const TRACE: TraceStep[] = [
  { id: 1, type: 'input',       label: 'User Input',        t: 0,    durationMs: 0,    data: { message: 'What are the most impactful AI safety papers from 2024?' } },
  { id: 2, type: 'reasoning',   label: 'Initial Planning',  t: 82,   durationMs: 312,  data: { text: 'The user wants AI safety papers from 2024. I should search arXiv and key AI safety organizations. Let me construct a targeted search query.' } },
  { id: 3, type: 'tool_call',   label: 'search_arxiv',      t: 394,  durationMs: 1247, data: { tool: 'search_arxiv', input: { query: 'AI safety alignment interpretability 2024', limit: 15, sort: 'citations' } } },
  { id: 4, type: 'tool_result', label: 'Search Results',    t: 1641, durationMs: 0,    data: { count: 15, top: 'Towards Guaranteed Safe AI (Dalrymple et al., 2024)', tokens: 2840 } },
  { id: 5, type: 'reasoning',   label: 'Result Analysis',   t: 1658, durationMs: 891,  data: { text: 'I have 15 results. Filtering by citation count and institutional weight to identify the 3 most impactful. Key papers emerge: Dalrymple (safety guarantees), Anthropic (mechanistic interp), Leike (scalable oversight).' } },
  { id: 6, type: 'tool_call',   label: 'fetch_paper_meta',  t: 2549, durationMs: 623,  data: { tool: 'fetch_paper_meta', input: { arxiv_ids: ['2405.06624', '2404.14219', '2406.13814'] } } },
  { id: 7, type: 'tool_result', label: 'Paper Details',     t: 3172, durationMs: 0,    data: { fetched: 3, totalCitations: 847, abstract_tokens: 1240 } },
  { id: 8, type: 'output',      label: 'Final Response',    t: 3204, durationMs: 1890, data: { outputTokens: 412, text: '**1. Towards Guaranteed Safe AI** (Dalrymple et al.) — Proposes a comprehensive framework for provably safe AI using formal verification methods...\n\n**2. Scaling Monosemanticity** (Anthropic) — Breakthrough in mechanistic interpretability, identifying ~34M features in Claude 3 Sonnet...\n\n**3. Scalable Oversight via Debate** (Leike et al.) — Demonstrates that AI debate significantly improves human ability to evaluate complex AI outputs...' } },
];

const TYPE_META: Record<StepType, { color: string; bg: string; label: string }> = {
  input:       { color: '#FF6B35', bg: 'rgba(255,107,53,0.12)',   label: 'INPUT' },
  reasoning:   { color: '#A78BFA', bg: 'rgba(167,139,250,0.10)', label: 'REASON' },
  tool_call:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  label: 'TOOL' },
  tool_result: { color: '#34D399', bg: 'rgba(52,211,153,0.08)',  label: 'RESULT' },
  output:      { color: '#06B6D4', bg: 'rgba(6,182,212,0.08)',   label: 'OUTPUT' },
};

export default function DebugTrace() {
  const [currentStep, setCurrentStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentStep >= 0 && listRef.current) {
      const el = listRef.current.children[currentStep] as HTMLElement;
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStep]);

  function advance() {
    setCurrentStep(s => {
      const next = s + 1;
      if (next >= TRACE.length) { setPlaying(false); return s; }

      const nextStep = TRACE[next];
      const delayMs = nextStep.durationMs > 0 ? nextStep.durationMs / speed : 600 / speed;

      if (breakpoints.has(TRACE[next].id)) {
        setPlaying(false);
        return next;
      }

      timerRef.current = setTimeout(advance, delayMs);
      return next;
    });
  }

  function play() {
    if (currentStep >= TRACE.length - 1) { reset(); return; }
    setPlaying(true);
    const delayMs = currentStep >= 0 ? (TRACE[currentStep + 1]?.durationMs ?? 600) / speed : 400;
    timerRef.current = setTimeout(advance, delayMs);
  }

  function pause() {
    setPlaying(false);
    clearTimeout(timerRef.current);
  }

  function stepForward() {
    if (currentStep >= TRACE.length - 1) return;
    setCurrentStep(s => s + 1);
  }

  function reset() {
    clearTimeout(timerRef.current);
    setPlaying(false);
    setCurrentStep(-1);
    setSelected(null);
  }

  function toggleBreakpoint(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setBreakpoints(bp => {
      const next = new Set(bp);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const totalMs = TRACE[TRACE.length - 1].t + TRACE[TRACE.length - 1].durationMs;
  const progress = currentStep >= 0 ? ((TRACE[currentStep].t + TRACE[currentStep].durationMs) / totalMs) * 100 : 0;
  const selectedStep = selected !== null ? TRACE.find(s => s.id === selected) : null;

  return (
    <div className="db-root">
      <header className="db-bar">
        <Link href="/agenticstudio" className="db-bar-logo"><AgenticWordmark /></Link>
        <div className="db-bar-sep" />
        <span className="db-bar-title">Debug Trace</span>
        <div className="db-bar-space" />
        <span className="db-agent-label">Research Agent · {TRACE.length} steps · {totalMs}ms total</span>
      </header>

      {/* Playback controls */}
      <div className="db-controls">
        <button className="db-ctrl-btn" onClick={reset} title="Restart">⏮</button>
        <button className="db-ctrl-btn db-ctrl-primary" onClick={playing ? pause : play}>
          {playing ? '⏸' : currentStep >= TRACE.length - 1 ? '↺' : '▶'}
        </button>
        <button className="db-ctrl-btn" onClick={stepForward} disabled={playing || currentStep >= TRACE.length - 1} title="Step forward">→</button>
        <div className="db-progress-wrap">
          <div className="db-progress-bar" style={{ width: `${progress}%` }} />
          {TRACE.map(s => (
            <div key={s.id} className={`db-bp-marker${breakpoints.has(s.id) ? ' active' : ''}`}
              style={{ left: `${(s.t / totalMs) * 100}%` }}
              onClick={e => toggleBreakpoint(s.id, e)}
              title={`Breakpoint: ${s.label}`} />
          ))}
        </div>
        <div className="db-speed">
          {[0.5, 1, 2].map(s => (
            <button key={s} className={`db-speed-btn${speed === s ? ' on' : ''}`} onClick={() => setSpeed(s)}>{s}×</button>
          ))}
        </div>
        <span className="db-step-count">
          {currentStep >= 0 ? `${currentStep + 1} / ${TRACE.length}` : `0 / ${TRACE.length}`}
        </span>
      </div>

      <div className="db-layout">
        {/* Step list */}
        <div className="db-steps" ref={listRef}>
          {TRACE.map((step, i) => {
            const meta = TYPE_META[step.type];
            const isActive = i === currentStep;
            const isDone = i < currentStep;
            const isReachable = i <= currentStep;
            const hasBp = breakpoints.has(step.id);
            return (
              <div key={step.id}
                className={`db-step${isActive ? ' db-step-active' : ''}${isDone ? ' db-step-done' : ''}${!isReachable ? ' db-step-future' : ''}${selected === step.id ? ' db-step-selected' : ''}`}
                style={isActive ? { borderColor: meta.color } : {}}
                onClick={() => setSelected(selected === step.id ? null : step.id)}>

                {/* Breakpoint dot */}
                <div className={`db-bp${hasBp ? ' db-bp-on' : ''}`}
                  onClick={e => toggleBreakpoint(step.id, e)}
                  title={hasBp ? 'Remove breakpoint' : 'Set breakpoint'} />

                {/* Timeline connector */}
                <div className="db-timeline">
                  <div className="db-timeline-dot" style={{ background: isDone || isActive ? meta.color : undefined, borderColor: meta.color }} />
                  {i < TRACE.length - 1 && <div className="db-timeline-line" style={{ background: isDone ? meta.color : undefined }} />}
                </div>

                {/* Step content */}
                <div className="db-step-body">
                  <div className="db-step-header">
                    <span className="db-step-badge" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                    <span className="db-step-name">{step.label}</span>
                    <span className="db-step-time">+{step.t}ms</span>
                    {step.durationMs > 0 && <span className="db-step-dur">{step.durationMs}ms</span>}
                    {isDone && <span className="db-step-check">✓</span>}
                  </div>

                  {/* Inline preview */}
                  {isReachable && (
                    <div className="db-step-preview">
                      {step.type === 'input' && <span>{String(step.data.message)}</span>}
                      {step.type === 'tool_call' && <span className="db-mono">{String(step.data.tool)}({JSON.stringify(step.data.input).slice(0, 60)}…)</span>}
                      {step.type === 'tool_result' && <span>Received {String(step.data.count ?? step.data.fetched)} results — {String(step.data.tokens ?? '')} tokens</span>}
                      {step.type === 'reasoning' && <span>{String(step.data.text).slice(0, 100)}…</span>}
                      {step.type === 'output' && <span>{String(step.data.outputTokens)} output tokens</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* State inspector */}
        <aside className="db-inspector">
          <div className="db-inspector-title">State Inspector</div>
          {!selectedStep && (
            <div className="db-inspector-empty">Click a step to inspect its full state</div>
          )}
          {selectedStep && (
            <>
              <div className="db-inspector-badge" style={{ color: TYPE_META[selectedStep.type].color, background: TYPE_META[selectedStep.type].bg }}>
                {TYPE_META[selectedStep.type].label}
              </div>
              <div className="db-inspector-name">{selectedStep.label}</div>
              <div className="db-inspector-meta">
                <span>t = +{selectedStep.t}ms</span>
                {selectedStep.durationMs > 0 && <span>duration = {selectedStep.durationMs}ms</span>}
              </div>
              <div className="db-inspector-label">State</div>
              <pre className="db-inspector-json">{JSON.stringify(selectedStep.data, null, 2)}</pre>
            </>
          )}

          <div className="db-inspector-divider" />
          <div className="db-inspector-label">Breakpoints</div>
          {breakpoints.size === 0 && <div className="db-inspector-empty">None set — click the red dot on any step</div>}
          {[...breakpoints].map(id => {
            const s = TRACE.find(x => x.id === id);
            return s ? (
              <div key={id} className="db-bp-item">
                <span className="db-bp-dot-sm" />
                <span>{s.label}</span>
                <button onClick={() => setBreakpoints(bp => { const n = new Set(bp); n.delete(id); return n; })}>×</button>
              </div>
            ) : null;
          })}
        </aside>
      </div>
    </div>
  );
}
