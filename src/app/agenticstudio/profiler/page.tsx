'use client';
import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import '../lp.css';

interface Phase { name: string; color: string; start_ms: number; duration_ms: number; isTTFT?: boolean; isTotal?: boolean; }

interface Scenario {
  label: string;
  phases: Phase[];
  totalMs: number;
  runs: number[];
}

const SCENARIOS: Record<string, Scenario> = {
  simple: {
    label: 'Simple Prompt',
    totalMs: 1265,
    runs: [1120, 1180, 1210, 1240, 1265, 1290, 1310, 1350, 1420, 1510],
    phases: [
      { name: 'DNS Lookup',           color: '#A78BFA', start_ms: 0,   duration_ms: 8   },
      { name: 'TLS Handshake',        color: '#06B6D4', start_ms: 8,   duration_ms: 45  },
      { name: 'Request Upload',       color: '#F59E0B', start_ms: 53,  duration_ms: 12  },
      { name: 'TTFT',                 color: '#FF6B35', start_ms: 65,  duration_ms: 380, isTTFT: true },
      { name: 'Streaming (1024 tok)', color: '#34D399', start_ms: 445, duration_ms: 820 },
    ],
  },
  tooluse: {
    label: 'Tool Use',
    totalMs: 2350,
    runs: [2100, 2150, 2200, 2280, 2350, 2410, 2480, 2560, 2720, 2950],
    phases: [
      { name: 'DNS',                   color: '#A78BFA', start_ms: 0,    duration_ms: 8   },
      { name: 'TLS',                   color: '#06B6D4', start_ms: 8,    duration_ms: 45  },
      { name: 'Request',               color: '#F59E0B', start_ms: 53,   duration_ms: 12  },
      { name: 'TTFT',                  color: '#FF6B35', start_ms: 65,   duration_ms: 420, isTTFT: true },
      { name: 'Streaming (decision)',  color: '#34D399', start_ms: 485,  duration_ms: 240 },
      { name: 'Tool: search_web',      color: '#F472B6', start_ms: 725,  duration_ms: 890 },
      { name: 'Tool result processing',color: '#F59E0B', start_ms: 1615, duration_ms: 95  },
      { name: 'Final streaming',       color: '#34D399', start_ms: 1710, duration_ms: 640 },
    ],
  },
  multistep: {
    label: 'Multi-step Agent',
    totalMs: 4795,
    runs: [4200, 4380, 4500, 4650, 4795, 4900, 5050, 5240, 5600, 6100],
    phases: [
      { name: 'DNS',                  color: '#A78BFA', start_ms: 0,    duration_ms: 8    },
      { name: 'TLS',                  color: '#06B6D4', start_ms: 8,    duration_ms: 45   },
      { name: 'Request',              color: '#F59E0B', start_ms: 53,   duration_ms: 12   },
      { name: 'TTFT (planning)',      color: '#FF6B35', start_ms: 65,   duration_ms: 510, isTTFT: true },
      { name: 'Stream (plan)',        color: '#34D399', start_ms: 575,  duration_ms: 180  },
      { name: 'Tool: fetch_data',     color: '#F472B6', start_ms: 755,  duration_ms: 1240 },
      { name: 'Tool: analyze_results',color: '#F472B6', start_ms: 1995, duration_ms: 780  },
      { name: 'Tool: generate_report',color: '#F472B6', start_ms: 2775, duration_ms: 1100 },
      { name: 'Final streaming',      color: '#34D399', start_ms: 3875, duration_ms: 920  },
    ],
  },
};

const MODELS = ['claude-haiku', 'claude-sonnet', 'claude-opus'];

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

export default function LatencyProfiler() {
  const [scenarioKey, setScenarioKey] = useState('simple');
  const [model, setModel] = useState('claude-sonnet');
  const [showPercentiles, setShowPercentiles] = useState(true);
  const [animatedPhases, setAnimatedPhases] = useState<Set<number>>(new Set());
  const [running, setRunning] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[] | undefined>([]);

  const scenario = SCENARIOS[scenarioKey];
  const maxMs = scenario.totalMs;

  const runProfile = useCallback(() => {
    if (running) return;
    setRunning(true);
    setAnimatedPhases(new Set());
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];

    scenario.phases.forEach((phase, i) => {
      const delay = phase.start_ms / 10;
      const t = setTimeout(() => {
        setAnimatedPhases(prev => new Set([...prev, i]));
      }, delay);
      timeoutsRef.current.push(t);
    });

    const totalDelay = maxMs / 10 + 300;
    const done = setTimeout(() => {
      setRunning(false);
    }, totalDelay);
    timeoutsRef.current.push(done);
  }, [running, scenario, maxMs]);

  const p50 = percentile(scenario.runs, 50);
  const p95 = percentile(scenario.runs, 95);
  const p99 = percentile(scenario.runs, 99);

  const ttftPhase = scenario.phases.find(p => p.isTTFT);
  const streamingPhase = scenario.phases.find(p => p.name.includes('streaming') || p.name.includes('Streaming'));
  const tokensPerSec = streamingPhase ? Math.round((1024 / streamingPhase.duration_ms) * 1000) : 0;

  const costPerToken = model === 'claude-haiku' ? 0.001 : model === 'claude-sonnet' ? 0.015 : 0.075;
  const estimatedCost = ((1024 / 1000) * costPerToken).toFixed(4);

  return (
    <div className="lp-root">
      <header className="lp-bar">
        <Link href="/agenticstudio" className="lp-bar-logo"><AgenticWordmark /></Link>
        <div className="lp-bar-sep" />
        <span className="lp-bar-title">Latency Profiler</span>
        <div className="lp-bar-space" />
      </header>

      {/* CONTROLS */}
      <div className="lp-controls">
        <select className="lp-select" value={scenarioKey} onChange={e => { setScenarioKey(e.target.value); setAnimatedPhases(new Set()); }}>
          {Object.entries(SCENARIOS).map(([k, s]) => (
            <option key={k} value={k}>{s.label}</option>
          ))}
        </select>

        <select className="lp-select" value={model} onChange={e => setModel(e.target.value)}>
          {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <button className="lp-run" onClick={runProfile} disabled={running}>
          {running ? 'Profiling…' : '▶ Run Profile'}
        </button>

        {animatedPhases.size === scenario.phases.length && (
          <span className="lp-total-badge">{maxMs.toLocaleString()} ms total</span>
        )}

        <div className="lp-toggle-row">
          <input type="checkbox" className="lp-checkbox" id="showP" checked={showPercentiles} onChange={e => setShowPercentiles(e.target.checked)} />
          <label htmlFor="showP" className="lp-toggle-label">Show P95/P99</label>
        </div>
      </div>

      {/* WATERFALL */}
      <div className="lp-waterfall">
        <div className="lp-table">
          {scenario.phases.map((phase, i) => {
            const leftPct = (phase.start_ms / maxMs) * 100;
            const widthPct = (phase.duration_ms / maxMs) * 100;
            const animated = animatedPhases.has(i);

            return (
              <div key={i} className={`lp-row${phase.isTTFT ? ' lp-row-ttft' : ''}`}>
                <div className="lp-row-label">{phase.name}</div>
                <div className="lp-row-track">
                  <div
                    className="lp-bar-fill"
                    style={{
                      left: `${leftPct}%`,
                      width: animated ? `${widthPct}%` : '0%',
                      background: phase.color,
                      opacity: 0.85,
                    }}
                  >
                    {widthPct > 4 && (
                      <span className="lp-bar-label">{phase.duration_ms}ms</span>
                    )}
                  </div>
                </div>
                <div className="lp-row-ms">{phase.duration_ms}ms</div>
              </div>
            );
          })}

          {/* Total bar */}
          <div className="lp-row lp-total-row">
            <div className="lp-row-label">Total</div>
            <div className="lp-row-track">
              <div
                className="lp-bar-fill"
                style={{
                  left: 0,
                  width: animatedPhases.size === scenario.phases.length ? '100%' : '0%',
                  background: 'linear-gradient(90deg, #4ADE80, #06B6D4)',
                  opacity: 0.7,
                }}
              >
                <span className="lp-bar-label">{maxMs.toLocaleString()}ms</span>
              </div>
            </div>
            <div className="lp-row-ms">{maxMs.toLocaleString()}ms</div>
          </div>
        </div>
      </div>

      {/* BOTTOM STATS */}
      <div className="lp-stats">
        <div className="lp-stat-col">
          <div className="lp-stat-col-title">Latency Percentiles</div>
          <div className="lp-stat">
            <span className="lp-stat-label">P50</span>
            <span className="lp-stat-val">{p50.toLocaleString()}ms</span>
          </div>
          {showPercentiles && (
            <>
              <div className="lp-stat">
                <span className="lp-stat-label">P95</span>
                <span className="lp-stat-val">{p95.toLocaleString()}ms</span>
              </div>
              <div className="lp-stat">
                <span className="lp-stat-label">P99</span>
                <span className="lp-stat-val">{p99.toLocaleString()}ms</span>
              </div>
            </>
          )}
        </div>

        <div className="lp-stat-col">
          <div className="lp-stat-col-title">Performance</div>
          <div className="lp-stat">
            <span className="lp-stat-label">TTFT</span>
            <span className="lp-stat-val">{ttftPhase ? ttftPhase.duration_ms + 'ms' : '—'}</span>
          </div>
          <div className="lp-stat">
            <span className="lp-stat-label">Streaming rate</span>
            <span className="lp-stat-val">{tokensPerSec > 0 ? tokensPerSec + ' tok/s' : '—'}</span>
          </div>
          <div className="lp-stat">
            <span className="lp-stat-label">Total tokens</span>
            <span className="lp-stat-val">1,024</span>
          </div>
        </div>

        <div className="lp-stat-col">
          <div className="lp-stat-col-title">Cost</div>
          <div className="lp-stat">
            <span className="lp-stat-label">Model</span>
            <span className="lp-stat-val" style={{ color: '#E8EAF0', fontSize: 12 }}>{model}</span>
          </div>
          <div className="lp-stat">
            <span className="lp-stat-label">Estimated cost</span>
            <span className="lp-stat-val">${estimatedCost}</span>
          </div>
          <div className="lp-stat">
            <span className="lp-stat-label">Scenario</span>
            <span className="lp-stat-val" style={{ color: '#E8EAF0', fontSize: 11 }}>{scenario.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
