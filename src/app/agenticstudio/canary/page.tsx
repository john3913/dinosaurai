'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import './canary.css';

const STAGES = [5, 25, 50, 100] as const;
type StageVal = typeof STAGES[number];

interface Particle {
  x: number; y: number; vx: number; vy: number;
  lane: 'undecided' | 'stable' | 'canary';
  color: string; opacity: number; r: number;
}

interface MetricState {
  p50: number; p95: number; errorRate: number; quality: number; costReq: number;
}

function variance(v: number, pct = 0.05): number {
  return v * (1 + (Math.random() - 0.5) * pct * 2);
}

const STABLE_BASE: MetricState = { p50: 380, p95: 890, errorRate: 0.1, quality: 7.8, costReq: 0.0024 };
const CANARY_BASE: MetricState = { p50: 620, p95: 1480, errorRate: 0.2, quality: 8.9, costReq: 0.0187 };

export default function CanaryPage() {
  const [stableModel, setStableModel] = useState('claude-sonnet-4-6');
  const [canaryModel, setCanaryModel] = useState('claude-opus-4-7');
  const [stage, setStage] = useState<StageVal>(5);
  const [stableMetrics, setStableMetrics] = useState<MetricState>(STABLE_BASE);
  const [canaryMetrics, setCanaryMetrics] = useState<MetricState>(CANARY_BASE);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef(stage);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const frameRef = useRef(0);

  useEffect(() => { stageRef.current = stage; }, [stage]);

  // Metrics update
  useEffect(() => {
    const id = setInterval(() => {
      setStableMetrics({
        p50: variance(STABLE_BASE.p50, 0.04),
        p95: variance(STABLE_BASE.p95, 0.06),
        errorRate: Math.max(0, variance(STABLE_BASE.errorRate, 0.3)),
        quality: Math.max(0, Math.min(10, variance(STABLE_BASE.quality, 0.02))),
        costReq: variance(STABLE_BASE.costReq, 0.02),
      });
      setCanaryMetrics({
        p50: variance(CANARY_BASE.p50, 0.05),
        p95: variance(CANARY_BASE.p95, 0.07),
        errorRate: Math.max(0, variance(CANARY_BASE.errorRate, 0.35)),
        quality: Math.max(0, Math.min(10, variance(CANARY_BASE.quality, 0.02))),
        costReq: variance(CANARY_BASE.costReq, 0.02),
      });
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const W = canvas.width; const H = canvas.height;
      const splitterX = W * 0.38;
      const canaryY = 130;
      const stableY = H - 130;
      const collectorX = W * 0.85;
      const pct = stageRef.current;

      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = '#070A0F';
      ctx.fillRect(0, 0, W, H);

      // Subtle grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Lane bezier paths (faint)
      ctx.lineWidth = 1.5;
      // Canary lane
      ctx.strokeStyle = 'rgba(251,191,36,0.12)';
      ctx.beginPath();
      ctx.moveTo(splitterX, H / 2);
      ctx.bezierCurveTo(splitterX + 60, H / 2, splitterX + 60, canaryY, collectorX, canaryY);
      ctx.stroke();
      // Stable lane
      ctx.strokeStyle = 'rgba(6,182,212,0.12)';
      ctx.beginPath();
      ctx.moveTo(splitterX, H / 2);
      ctx.bezierCurveTo(splitterX + 60, H / 2, splitterX + 60, stableY, collectorX, stableY);
      ctx.stroke();
      // Source lane
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(20, H / 2);
      ctx.lineTo(splitterX, H / 2);
      ctx.stroke();

      // Lane labels
      ctx.font = '700 12px var(--font-inter-tight, sans-serif)';
      ctx.fillStyle = '#FBBF24';
      ctx.textAlign = 'center';
      ctx.fillText(`Canary ${pct}%`, splitterX + (collectorX - splitterX) / 2, canaryY - 18);
      ctx.fillStyle = '#06B6D4';
      ctx.fillText(`Stable ${100 - pct}%`, splitterX + (collectorX - splitterX) / 2, stableY + 28);

      // Spawn particles
      if (frameRef.current % 3 === 0) {
        particlesRef.current.push({
          x: 20, y: H / 2 + (Math.random() - 0.5) * 20,
          vx: 1.8, vy: 0,
          lane: 'undecided',
          color: 'rgba(232,234,240,0.7)',
          opacity: 0.8,
          r: 2.5 + Math.random() * 1.5,
        });
      }

      // Update particles
      particlesRef.current = particlesRef.current.filter(p => p.opacity > 0.05);
      for (const p of particlesRef.current) {
        if (p.lane === 'undecided' && p.x >= splitterX) {
          p.lane = Math.random() < pct / 100 ? 'canary' : 'stable';
          p.color = p.lane === 'canary' ? '#FBBF24' : '#06B6D4';
        }
        if (p.lane === 'canary') {
          p.vy += (canaryY - p.y) * 0.04;
          p.vy *= 0.85;
        } else if (p.lane === 'stable') {
          p.vy += (stableY - p.y) * 0.04;
          p.vy *= 0.85;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.x > W * 0.9) p.opacity -= 0.02;
      }

      // Draw particles
      for (const p of particlesRef.current) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Splitter node
      const t = (Date.now() / 2000) % 1;
      const outerOpacity = 0.3 + 0.5 * Math.sin(t * Math.PI * 2);
      ctx.beginPath();
      ctx.arc(splitterX, H / 2, 18, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${outerOpacity})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(splitterX, H / 2, 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(splitterX, H / 2, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();

      // Collector nodes
      for (const [cy2, col] of [[canaryY, '#FBBF24'], [stableY, '#06B6D4']] as [number, string][]) {
        ctx.beginPath();
        ctx.arc(collectorX, cy2, 14, 0, Math.PI * 2);
        ctx.strokeStyle = col + '80';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(collectorX, cy2, 7, 0, Math.PI * 2);
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(collectorX, cy2, 3, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
      }

      // Source label
      ctx.font = '600 11px var(--font-inter-tight, sans-serif)';
      ctx.fillStyle = 'rgba(232,234,240,0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('Traffic', 40, H / 2 - 18);

      frameRef.current++;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  const advanceStage = useCallback(() => {
    const idx = STAGES.indexOf(stage);
    if (idx < STAGES.length - 1) setStage(STAGES[idx + 1]);
  }, [stage]);

  const rollback = useCallback(() => { setStage(5); }, []);

  const statusLabel = stage === 100 ? 'Full Cutover' : stage >= 50 ? 'Monitoring' : stage >= 25 ? 'Monitoring' : 'Stable';
  const statusClass = stage === 100 ? 'cutover' : stage >= 25 ? 'monitoring' : 'stable';

  const canaryHealthStatus = () => {
    if (canaryMetrics.quality > stableMetrics.quality + 0.5 && canaryMetrics.errorRate < 1) return { label: 'Promoting ✓', cls: 'promoting' };
    if (canaryMetrics.errorRate > 2) return { label: 'Rollback!', cls: 'rollback' };
    return { label: 'Monitoring', cls: 'monitoring' };
  };

  const health = canaryHealthStatus();

  const metricColor = (val: number, type: 'latency' | 'error' | 'quality' | 'cost') => {
    if (type === 'quality') return val >= 8.5 ? 'good' : val >= 7.5 ? 'highlight' : 'warn';
    if (type === 'error') return val < 0.5 ? 'good' : val < 1.5 ? 'warn' : 'bad';
    if (type === 'latency') return val < 500 ? 'good' : val < 1000 ? 'warn' : 'bad';
    return '';
  };

  return (
    <div className="cd-root">
      <header className="cd-bar">
        <Link href="/agenticstudio" className="cd-bar-logo"><AgenticWordmark /></Link>
        <div className="cd-bar-sep" />
        <span className="cd-bar-title">Canary Deployer</span>
      </header>

      <div className="cd-body">
        {/* Controls */}
        <div className="cd-controls">
          <div className="cd-ctrl-group">
            <span className="cd-ctrl-label">Stable</span>
            <select className="cd-model-sel" value={stableModel} onChange={e => setStableModel(e.target.value)}>
              <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
              <option value="claude-haiku-4-5-20251001">claude-haiku-4-5</option>
              <option value="claude-opus-4-7">claude-opus-4-7</option>
            </select>
          </div>
          <div className="cd-ctrl-group">
            <span className="cd-ctrl-label">Canary</span>
            <select className="cd-model-sel" value={canaryModel} onChange={e => setCanaryModel(e.target.value)}>
              <option value="claude-opus-4-7">claude-opus-4-7</option>
              <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
              <option value="claude-haiku-4-5-20251001">claude-haiku-4-5</option>
            </select>
          </div>
          <div className="cd-ctrl-group">
            <span className="cd-ctrl-label">Stage</span>
            <div className="cd-stage-btns">
              {STAGES.map(s => (
                <button key={s} className={`cd-stage-btn${stage === s ? ' on' : ''}`} onClick={() => setStage(s)}>{s}%</button>
              ))}
            </div>
          </div>
          <button className="cd-advance-btn" onClick={advanceStage} disabled={stage === 100}>Advance Stage</button>
          <button className="cd-rollback-btn" onClick={rollback}>Rollback</button>
          <span className={`cd-status-badge ${statusClass}`}>{statusLabel}</span>
        </div>

        {/* Canvas */}
        <div className="cd-canvas-wrap">
          <canvas ref={canvasRef} className="cd-canvas" />
        </div>

        {/* Metrics */}
        <div className="cd-metrics">
          {/* Stable */}
          <div className="cd-panel">
            <div className="cd-panel-header">
              <div className="cd-health-dot" style={{ background: '#06B6D4' }} />
              <span className="cd-panel-model">{stableModel}</span>
              <span className="cd-health-badge monitoring" style={{ marginLeft: 'auto' }}>Stable</span>
            </div>
            <div className="cd-metric-row"><span className="cd-metric-name">P50 Latency</span><span className={`cd-metric-val ${metricColor(stableMetrics.p50,'latency')}`}>{stableMetrics.p50.toFixed(0)}ms</span></div>
            <div className="cd-metric-row"><span className="cd-metric-name">P95 Latency</span><span className={`cd-metric-val ${metricColor(stableMetrics.p95,'latency')}`}>{stableMetrics.p95.toFixed(0)}ms</span></div>
            <div className="cd-metric-row"><span className="cd-metric-name">Error Rate</span><span className={`cd-metric-val ${metricColor(stableMetrics.errorRate,'error')}`}>{stableMetrics.errorRate.toFixed(2)}%</span></div>
            <div className="cd-metric-row"><span className="cd-metric-name">Quality Score</span><span className={`cd-metric-val ${metricColor(stableMetrics.quality,'quality')}`}>{stableMetrics.quality.toFixed(1)}/10</span></div>
            <div className="cd-metric-row"><span className="cd-metric-name">Cost/Request</span><span className="cd-metric-val">${stableMetrics.costReq.toFixed(4)}</span></div>
          </div>

          {/* Canary */}
          <div className="cd-panel">
            <div className="cd-panel-header">
              <div className="cd-health-dot" style={{ background: '#FBBF24' }} />
              <span className="cd-panel-model">{canaryModel}</span>
              <span className={`cd-health-badge ${health.cls}`} style={{ marginLeft: 'auto' }}>{health.label}</span>
            </div>
            <div className="cd-metric-row"><span className="cd-metric-name">P50 Latency</span><span className={`cd-metric-val ${metricColor(canaryMetrics.p50,'latency')}`}>{canaryMetrics.p50.toFixed(0)}ms</span></div>
            <div className="cd-metric-row"><span className="cd-metric-name">P95 Latency</span><span className={`cd-metric-val ${metricColor(canaryMetrics.p95,'latency')}`}>{canaryMetrics.p95.toFixed(0)}ms</span></div>
            <div className="cd-metric-row"><span className="cd-metric-name">Error Rate</span><span className={`cd-metric-val ${metricColor(canaryMetrics.errorRate,'error')}`}>{canaryMetrics.errorRate.toFixed(2)}%</span></div>
            <div className="cd-metric-row"><span className="cd-metric-name">Quality Score</span><span className={`cd-metric-val ${metricColor(canaryMetrics.quality,'quality')}`}>{canaryMetrics.quality.toFixed(1)}/10</span></div>
            <div className="cd-metric-row"><span className="cd-metric-name">Cost/Request</span><span className="cd-metric-val warn">${canaryMetrics.costReq.toFixed(4)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
