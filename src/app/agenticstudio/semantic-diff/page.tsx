'use client';
import { useState } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import './semantic-diff.css';

const EXAMPLE_A = `API security requires multiple layers of defense. First, implement OAuth 2.0 or API key authentication with proper key rotation every 90 days. Use HTTPS exclusively and enforce TLS 1.3. Rate limiting is essential — 1000 req/min per user is a common starting point. Validate all inputs server-side against a strict schema. Log all API calls with timestamps and user IDs for audit trails. Consider IP allowlisting for sensitive endpoints.`;

const EXAMPLE_B = `Securing your API involves authentication, authorization, and monitoring. Use JWT tokens with short expiry times (15-60 minutes) and refresh token rotation. HTTPS is mandatory. Implement rate limiting and request throttling to prevent abuse. Input validation and sanitization prevents injection attacks. API gateways can centralize security policies. Monitor for anomalous traffic patterns with alerting. Consider OAuth 2.0 for third-party integrations.`;

const TOPICS = [
  { name: 'Authentication', a: 95, b: 88 },
  { name: 'Rate Limiting',  a: 90, b: 85 },
  { name: 'HTTPS / TLS',   a: 85, b: 80 },
  { name: 'Input Validation', a: 80, b: 90 },
  { name: 'Monitoring / Logging', a: 75, b: 82 },
  { name: 'Key Management', a: 88, b: 65 },
];

const RADAR_AXES = [
  { label: 'Formality',       a: 0.82, b: 0.75 },
  { label: 'Confidence',      a: 0.88, b: 0.72 },
  { label: 'Specificity',     a: 0.91, b: 0.78 },
  { label: 'Conciseness',     a: 0.65, b: 0.82 },
  { label: 'Technical Depth', a: 0.85, b: 0.70 },
  { label: 'Actionability',   a: 0.78, b: 0.88 },
];

const KEY_DIFFS = [
  { aspect: 'TLS version specified', a: 'TLS 1.3', b: 'HTTPS only', badge: 'diverge', badgeLabel: 'DIVERGE' },
  { aspect: 'Auth mechanism', a: 'OAuth 2.0, API keys', b: 'JWT + OAuth 2.0', badge: 'partial', badgeLabel: 'PARTIAL MATCH' },
  { aspect: 'Rate limit example', a: '1000 req/min', b: 'General throttling', badge: 'diverge', badgeLabel: 'DIVERGE' },
  { aspect: 'IP allowlisting', a: 'Mentioned', b: 'Not mentioned', badge: 'aonly', badgeLabel: 'A-ONLY' },
];

const cx = 120, cy = 110, R = 80;
const n = RADAR_AXES.length;
const angle = (i: number) => (i / n) * 2 * Math.PI - Math.PI / 2;
function radarPt(val: number, i: number) {
  return [cx + val * R * Math.cos(angle(i)), cy + val * R * Math.sin(angle(i))];
}
function radarPoly(vals: number[]) {
  return vals.map((v, i) => radarPt(v, i).join(',')).join(' ');
}

function computeSimilarity(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? []);
  const wb = new Set(b.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? []);
  let overlap = 0;
  wa.forEach(w => { if (wb.has(w)) overlap++; });
  const raw = wa.size ? overlap / wa.size : 0;
  return Math.min(99, Math.round(raw * 6 * 100));
}

export default function SemanticDiffPage() {
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [modelA, setModelA] = useState('claude-opus-4-7');
  const [modelB, setModelB] = useState('gpt-4o');
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);
  const [simPct, setSimPct] = useState(0);

  const loadExample = () => {
    setTextA(EXAMPLE_A);
    setTextB(EXAMPLE_B);
    setDone(false);
  };

  const analyze = async () => {
    if (!textA.trim() || !textB.trim()) return;
    setAnalyzing(true);
    setDone(false);
    await new Promise(r => setTimeout(r, 900));
    const pct = computeSimilarity(textA, textB);
    setSimPct(pct);
    setDone(true);
    setAnalyzing(false);
  };

  const circumference = 2 * Math.PI * 46;
  const dashOffset = circumference - (simPct / 100) * circumference;

  return (
    <div className="sd-root">
      <header className="sd-bar">
        <Link href="/agenticstudio" className="sd-bar-logo"><AgenticWordmark /></Link>
        <div className="sd-bar-sep" />
        <span className="sd-bar-title">Semantic Diff</span>
      </header>

      <div className="sd-body">
        {/* Inputs */}
        <div className="sd-inputs">
          <div className="sd-col">
            <div className="sd-col-label">Response A (Model)</div>
            <select className="sd-model-sel" value={modelA} onChange={e => setModelA(e.target.value)}>
              <option value="claude-opus-4-7">claude-opus-4-7</option>
              <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
              <option value="claude-haiku-4-5-20251001">claude-haiku-4-5</option>
              <option value="gpt-4o">gpt-4o</option>
            </select>
            <textarea className="sd-textarea" placeholder="Paste response A here…" value={textA} onChange={e => { setTextA(e.target.value); setDone(false); }} />
          </div>

          <div className="sd-center-col">
            <button className="sd-example-btn" onClick={loadExample}>Load Example</button>
            <button className="sd-analyze-btn" onClick={analyze} disabled={analyzing || (!textA && !textB)}>
              {analyzing ? 'Analyzing…' : 'Analyze'}
            </button>
          </div>

          <div className="sd-col">
            <div className="sd-col-label">Response B (Model)</div>
            <select className="sd-model-sel" value={modelB} onChange={e => setModelB(e.target.value)}>
              <option value="gpt-4o">gpt-4o</option>
              <option value="claude-opus-4-7">claude-opus-4-7</option>
              <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
              <option value="claude-haiku-4-5-20251001">claude-haiku-4-5</option>
            </select>
            <textarea className="sd-textarea" placeholder="Paste response B here…" value={textB} onChange={e => { setTextB(e.target.value); setDone(false); }} />
          </div>
        </div>

        {!done && !analyzing && (
          <div className="sd-placeholder">Enter two responses and click Analyze — or Load Example to try it.</div>
        )}
        {analyzing && (
          <div className="sd-placeholder" style={{ color: 'rgba(139,92,246,0.7)' }}>Comparing responses…</div>
        )}

        {done && (
          <>
            {/* 1. Semantic Similarity */}
            <div className="sd-section" style={{ animationDelay: '0ms' }}>
              <div className="sd-section-title">Semantic Similarity</div>
              <div className="sd-sim-wrap">
                <div className="sd-sim-ring-wrap">
                  <svg className="sd-sim-ring-svg" viewBox="0 0 100 100">
                    <circle className="sd-sim-track" cx="50" cy="50" r="46" />
                    <circle
                      className="sd-sim-fill"
                      cx="50" cy="50" r="46"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                    />
                  </svg>
                  <div className="sd-sim-pct">{simPct}%</div>
                </div>
                <div className="sd-sim-desc">
                  <strong>{simPct >= 80 ? 'High' : simPct >= 60 ? 'Moderate' : 'Low'} similarity</strong><br />
                  Both responses cover overlapping topics but differ in specificity, examples, and emphasis. Compare topic coverage below for details.
                </div>
              </div>
            </div>

            {/* 2. Topic Coverage */}
            <div className="sd-section" style={{ animationDelay: '100ms' }}>
              <div className="sd-section-title">Topic Coverage</div>
              <div className="sd-topics">
                {TOPICS.map(t => (
                  <div key={t.name} className="sd-topic-row">
                    <div className="sd-topic-name">{t.name}</div>
                    <div className="sd-topic-bars">
                      <div className="sd-bar-row">
                        <span className="sd-bar-label" style={{ color: '#FF6B35' }}>A</span>
                        <div className="sd-bar-track"><div className="sd-bar-fill" style={{ width: `${t.a}%`, background: '#FF6B35' }} /></div>
                        <span className="sd-bar-pct">{t.a}%</span>
                      </div>
                      <div className="sd-bar-row">
                        <span className="sd-bar-label" style={{ color: '#06B6D4' }}>B</span>
                        <div className="sd-bar-track"><div className="sd-bar-fill" style={{ width: `${t.b}%`, background: '#06B6D4' }} /></div>
                        <span className="sd-bar-pct">{t.b}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Tone Radar */}
            <div className="sd-section" style={{ animationDelay: '200ms' }}>
              <div className="sd-section-title">Tone Radar</div>
              <div className="sd-radar-wrap">
                <svg className="sd-radar-svg" viewBox="0 0 240 220" width={240} height={220}>
                  {/* Grid rings */}
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map(r => (
                    <polygon
                      key={r}
                      points={Array.from({ length: n }, (_, i) => radarPt(r, i).join(',')).join(' ')}
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="1"
                    />
                  ))}
                  {/* Axis lines */}
                  {RADAR_AXES.map((_, i) => {
                    const [px, py] = radarPt(1, i);
                    return <line key={i} x1={cx} y1={cy} x2={px} y2={py} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />;
                  })}
                  {/* Axis labels */}
                  {RADAR_AXES.map((ax, i) => {
                    const [px, py] = radarPt(1.22, i);
                    return <text key={i} x={px} y={py} textAnchor="middle" dominantBaseline="middle" fill="rgba(232,234,240,0.45)" fontSize="9" fontFamily="var(--font-inter-tight,sans-serif)">{ax.label}</text>;
                  })}
                  {/* A polygon */}
                  <polygon
                    points={radarPoly(RADAR_AXES.map(ax => ax.a))}
                    fill="rgba(255,107,53,0.2)"
                    stroke="#FF6B35"
                    strokeWidth="1.5"
                    style={{ opacity: done ? 1 : 0, transition: 'opacity 0.6s ease 0.3s' }}
                  />
                  {/* B polygon */}
                  <polygon
                    points={radarPoly(RADAR_AXES.map(ax => ax.b))}
                    fill="rgba(6,182,212,0.2)"
                    stroke="#06B6D4"
                    strokeWidth="1.5"
                    style={{ opacity: done ? 1 : 0, transition: 'opacity 0.6s ease 0.5s' }}
                  />
                </svg>
                <div className="sd-radar-legend">
                  <div className="sd-legend-item">
                    <div className="sd-legend-dot" style={{ background: '#FF6B35' }} />
                    <span>Response A ({modelA})</span>
                  </div>
                  <div className="sd-legend-item">
                    <div className="sd-legend-dot" style={{ background: '#06B6D4' }} />
                    <span>Response B ({modelB})</span>
                  </div>
                  {RADAR_AXES.map(ax => (
                    <div key={ax.label} style={{ fontSize: 11, color: 'rgba(232,234,240,0.35)', fontFamily: 'var(--font-jetbrains-mono,monospace)' }}>
                      {ax.label}: <span style={{ color: '#FF6B35' }}>{ax.a.toFixed(2)}</span> / <span style={{ color: '#06B6D4' }}>{ax.b.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Key Differences */}
            <div className="sd-section" style={{ animationDelay: '300ms' }}>
              <div className="sd-section-title">Key Differences</div>
              <table className="sd-diff-table">
                <thead>
                  <tr>
                    <th>Aspect</th>
                    <th style={{ color: '#FF6B35' }}>A</th>
                    <th style={{ color: '#06B6D4' }}>B</th>
                    <th>Match</th>
                  </tr>
                </thead>
                <tbody>
                  {KEY_DIFFS.map(row => (
                    <tr key={row.aspect}>
                      <td>{row.aspect}</td>
                      <td className="sd-a-val">{row.a}</td>
                      <td className="sd-b-val">{row.b}</td>
                      <td><span className={`sd-diff-badge ${row.badge}`}>{row.badgeLabel}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
