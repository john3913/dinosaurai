'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import '../ft.css';

const MODELS = ['claude-haiku', 'claude-sonnet', 'claude-opus'];
const BATCH_SIZES = [4, 8, 16, 32];
const TOTAL_EPOCHS = 20;

// Pre-generate loss data
function genLoss(start: number, end: number, noise: number, epochs: number): number[] {
  return Array.from({ length: epochs }, (_, i) => {
    const t = i / (epochs - 1);
    const base = start * Math.exp(-Math.log(start / end) * t);
    return Math.max(0.05, base + (Math.random() - 0.5) * noise * base);
  });
}

const TRAIN_LOSSES = genLoss(2.4, 0.18, 0.3, TOTAL_EPOCHS);
const EVAL_LOSSES = genLoss(2.2, 0.24, 0.55, TOTAL_EPOCHS);

const TRAINING_EXAMPLES = [
  { input: 'Classify sentiment: "The product broke after one day."', output: 'NEGATIVE' },
  { input: 'Summarize in one sentence: Constitutional AI uses principles to guide model behavior.', output: 'CAI trains models using explicit value principles.' },
  { input: 'Translate to formal English: gonna fix this asap', output: 'I will resolve this issue promptly.' },
];

function buildPath(losses: number[], maxLoss: number, minLoss: number, W: number, H: number, progress: number): string {
  const pad = { l: 48, r: 16, t: 16, b: 32 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;
  const epochs = Math.max(1, Math.round(progress * TOTAL_EPOCHS));
  const pts = losses.slice(0, epochs).map((v, i) => {
    const x = pad.l + (i / (TOTAL_EPOCHS - 1)) * chartW;
    const y = pad.t + chartH - ((v - minLoss) / (maxLoss - minLoss)) * chartH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  if (pts.length === 0) return '';
  return `M${pts.join('L')}`;
}

function useAnimatedValue(target: number, duration: number, active: boolean): number {
  const [val, setVal] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    startRef.current = null;
    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      setVal(target * t);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
      else setVal(target);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, active]);
  return val;
}

export default function FinetuneDashboard() {
  const [baseModel, setBaseModel] = useState('claude-sonnet');
  const [lr, setLr] = useState('1e-4');
  const [batchSize, setBatchSize] = useState(8);
  const [epochs, setEpochs] = useState(8);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const W = 800, H = 300;
  const allLoss = [...TRAIN_LOSSES, ...EVAL_LOSSES];
  const maxLoss = Math.max(...allLoss) + 0.1;
  const minLoss = Math.min(...allLoss) - 0.02;
  const pad = { l: 48, r: 16, t: 16, b: 32 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;

  const currentEpoch = Math.round(progress * TOTAL_EPOCHS);
  const trainLossNow = TRAIN_LOSSES[Math.max(0, currentEpoch - 1)] ?? 0;
  const evalLossNow = EVAL_LOSSES[Math.max(0, currentEpoch - 1)] ?? 0;

  const metricsActive = started && progress > 0.3;
  const bleu = useAnimatedValue(0.847, 3200, metricsActive);
  const accuracy = useAnimatedValue(92.3, 3600, metricsActive);
  const perplexity = useAnimatedValue(1, 4000, metricsActive); // used for lerp

  const perplexityVal = metricsActive ? 124 - (124 - 8.4) * Math.min(1, (progress - 0.3) / 0.7) : 124;

  const startFinetuning = useCallback(() => {
    if (running) return;
    setProgress(0);
    setStarted(true);
    setRunning(true);
    const start = Date.now();
    const duration = 4000;
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / duration);
      setProgress(p);
      if (p >= 1) {
        clearInterval(intervalRef.current);
        setRunning(false);
      }
    }, 50);
  }, [running]);

  const replay = useCallback(() => {
    clearInterval(intervalRef.current);
    setProgress(0);
    setStarted(false);
    setRunning(false);
    setTimeout(startFinetuning, 100);
  }, [startFinetuning]);

  // Grid lines
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const loss = minLoss + (i / 4) * (maxLoss - minLoss);
    const y = pad.t + chartH - (i / 4) * chartH;
    return { y: y.toFixed(1), label: loss.toFixed(1) };
  });

  const trainPath = buildPath(TRAIN_LOSSES, maxLoss, minLoss, W, H, progress);
  const evalPath = buildPath(EVAL_LOSSES, maxLoss, minLoss, W, H, progress);

  // X-axis epoch labels
  const epochLabels = [1, 5, 10, 15, 20].map(e => ({
    x: pad.l + ((e - 1) / (TOTAL_EPOCHS - 1)) * chartW,
    label: e,
  }));

  return (
    <div className="ft-root">
      <header className="ft-bar">
        <Link href="/agenticstudio" className="ft-bar-logo"><AgenticWordmark /></Link>
        <div className="ft-bar-sep" />
        <span className="ft-bar-title">Fine-tuning Dashboard</span>
        <div className="ft-bar-space" />
      </header>

      <div className="ft-layout">
        {/* LEFT */}
        <aside className="ft-config">
          <div className="ft-field">
            <label className="ft-label">Base Model</label>
            <select className="ft-select" value={baseModel} onChange={e => setBaseModel(e.target.value)}>
              {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="ft-field">
            <label className="ft-label">Dataset Size</label>
            <div className="ft-stat">2,847</div>
            <div className="ft-stat-sub">training examples</div>
          </div>

          <div className="ft-field">
            <label className="ft-label">Learning Rate</label>
            <input className="ft-input" value={lr} onChange={e => setLr(e.target.value)} />
          </div>

          <div className="ft-field">
            <label className="ft-label">Batch Size</label>
            <select className="ft-select" value={batchSize} onChange={e => setBatchSize(+e.target.value)}>
              {BATCH_SIZES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="ft-field">
            <label className="ft-label">Epochs ({epochs})</label>
            <div className="ft-slider-row">
              <input type="range" className="ft-slider" min={1} max={20} value={epochs} onChange={e => setEpochs(+e.target.value)} />
              <span className="ft-slider-val">{epochs}</span>
            </div>
          </div>

          <button className="ft-run" onClick={startFinetuning} disabled={running}>
            {running ? 'Training…' : '▶ Start Fine-tune'}
          </button>
          <button className="ft-replay" onClick={replay}>▶ Replay</button>
          {started && (
            <div className="ft-epoch-display">
              Epoch {currentEpoch} / {TOTAL_EPOCHS}
            </div>
          )}
        </aside>

        {/* CENTER CHART */}
        <div className="ft-center">
          <div className="ft-chart-title">
            Loss Curve
            <span className="ft-legend-item">
              <span className="ft-legend-line" style={{ background: '#FF6B35' }} />
              Train Loss
            </span>
            <span className="ft-legend-item">
              <span className="ft-legend-line" style={{ background: '#06B6D4' }} />
              Eval Loss
            </span>
          </div>

          <div className="ft-chart-wrap">
            <svg className="ft-chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
              {/* Grid lines */}
              {gridLines.map((g, i) => (
                <g key={i}>
                  <line x1={pad.l} y1={g.y} x2={W - pad.r} y2={g.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <text x={pad.l - 6} y={+g.y + 4} textAnchor="end" fontSize="9" fill="rgba(232,234,240,0.3)" fontFamily="monospace">{g.label}</text>
                </g>
              ))}
              {/* X axis */}
              <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              {epochLabels.map(e => (
                <g key={e.label}>
                  <line x1={e.x} y1={H - pad.b} x2={e.x} y2={H - pad.b + 4} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                  <text x={e.x} y={H - pad.b + 14} textAnchor="middle" fontSize="9" fill="rgba(232,234,240,0.3)" fontFamily="monospace">{e.label}</text>
                </g>
              ))}
              {/* Y axis label */}
              <text x={12} y={H / 2} textAnchor="middle" fontSize="9" fill="rgba(232,234,240,0.3)" fontFamily="monospace" transform={`rotate(-90, 12, ${H / 2})`}>Loss</text>
              {/* Paths */}
              {trainPath && <path d={trainPath} fill="none" stroke="#FF6B35" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
              {evalPath && <path d={evalPath} fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5,3" />}
            </svg>
          </div>

          <div className="ft-live-stats">
            <div className="ft-live-stat">
              <span className="ft-live-label">Epoch</span>
              <span className="ft-live-val" style={{ color: '#FB7185' }}>{currentEpoch} / {TOTAL_EPOCHS}</span>
            </div>
            <div className="ft-live-stat">
              <span className="ft-live-label">Train Loss</span>
              <span className="ft-live-val" style={{ color: '#FF6B35' }}>{started ? trainLossNow.toFixed(4) : '—'}</span>
            </div>
            <div className="ft-live-stat">
              <span className="ft-live-label">Eval Loss</span>
              <span className="ft-live-val" style={{ color: '#06B6D4' }}>{started ? evalLossNow.toFixed(4) : '—'}</span>
            </div>
          </div>
        </div>

        {/* RIGHT METRICS */}
        <aside className="ft-metrics">
          <div className="ft-metrics-title">Metrics</div>

          <div className="ft-metric-card">
            <div className="ft-metric-label">BLEU Score</div>
            <div className="ft-metric-val">{started ? bleu.toFixed(3) : '—'}</div>
          </div>
          <div className="ft-metric-card">
            <div className="ft-metric-label">Accuracy</div>
            <div className="ft-metric-val">{started ? accuracy.toFixed(1) + '%' : '—'}</div>
          </div>
          <div className="ft-metric-card">
            <div className="ft-metric-label">Perplexity</div>
            <div className="ft-metric-val">{started ? perplexityVal.toFixed(1) : '124'}</div>
          </div>
          <div className="ft-metric-card">
            <div className="ft-metric-label">Gradient Norm</div>
            <div className="ft-metric-val static">0.042</div>
          </div>
          <div className="ft-metric-card">
            <div className="ft-metric-label">Tokens / sec</div>
            <div className="ft-metric-val static">24,800</div>
          </div>

          <div className="ft-examples-title">Training Examples</div>
          {TRAINING_EXAMPLES.map((ex, i) => (
            <div key={i} className="ft-example">
              <span className="k">input</span>: <span style={{ color: 'rgba(232,234,240,0.5)' }}>&quot;{ex.input}&quot;</span>
              <br />
              <span className="k">output</span>: <span className="v">&quot;{ex.output}&quot;</span>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
