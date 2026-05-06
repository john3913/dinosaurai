'use client';
import { useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import './cost-forecast.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatCost(v: number): string {
  if (v >= 1000000) return `$${(v/1000000).toFixed(2)}M`;
  if (v >= 1000) return `$${(v/1000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}
function formatNum(n: number): string {
  return n.toLocaleString();
}

export default function CostForecastPage() {
  const [dau, setDau] = useState(5000);
  const [msgPerUser, setMsgPerUser] = useState(8);
  const [avgIn, setAvgIn] = useState(800);
  const [avgOut, setAvgOut] = useState(250);
  const [opusPct, setOpusPct] = useState(10);
  const [sonnetPct, setSonnetPct] = useState(40);
  const [haikuPct, setHaikuPct] = useState(50);
  const [caching, setCaching] = useState(false);
  const [batch, setBatch] = useState(false);
  const [budget, setBudget] = useState('500');
  const [growth, setGrowth] = useState(5);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const adjustMix = useCallback((which: 'opus' | 'sonnet' | 'haiku', val: number) => {
    if (which === 'opus') {
      const newOpus = Math.min(100, val);
      const remaining = 100 - newOpus;
      const ratio = (sonnetPct + haikuPct) > 0 ? sonnetPct / (sonnetPct + haikuPct) : 0.5;
      setOpusPct(newOpus);
      setSonnetPct(Math.round(remaining * ratio));
      setHaikuPct(100 - newOpus - Math.round(remaining * ratio));
    } else if (which === 'sonnet') {
      const newSonnet = Math.min(100 - opusPct, val);
      setSonnetPct(newSonnet);
      setHaikuPct(100 - opusPct - newSonnet);
    } else {
      const newHaiku = Math.min(100 - opusPct, val);
      setHaikuPct(newHaiku);
      setSonnetPct(100 - opusPct - newHaiku);
    }
  }, [opusPct, sonnetPct, haikuPct]);

  const { months, dailyCostBase, savingsCaching, savingsBatch, perReqCost } = useMemo(() => {
    const dailyMessages = dau * msgPerUser;
    const dailyInputTok = dailyMessages * avgIn;
    const dailyOutputTok = dailyMessages * avgOut;
    const effectiveInputTok = caching ? dailyInputTok * 0.4 : dailyInputTok;

    const opusCost = (effectiveInputTok * (opusPct / 100) * 15 + dailyOutputTok * (opusPct / 100) * 75) / 1_000_000;
    const sonnetCost = (effectiveInputTok * (sonnetPct / 100) * 3 + dailyOutputTok * (sonnetPct / 100) * 15) / 1_000_000;
    const haikuCost = (effectiveInputTok * (haikuPct / 100) * 0.25 + dailyOutputTok * (haikuPct / 100) * 1.25) / 1_000_000;
    const dailyCostBase = (opusCost + sonnetCost + haikuCost) * (batch ? 0.5 : 1);

    const months = Array.from({ length: 12 }, (_, i) => dailyCostBase * 30 * Math.pow(1 + growth / 100, i));

    // Savings calculations
    const effectiveInputNoCache = dailyInputTok;
    const opusCostNoCache = (effectiveInputNoCache * (opusPct / 100) * 15 + dailyOutputTok * (opusPct / 100) * 75) / 1_000_000;
    const sonnetCostNoCache = (effectiveInputNoCache * (sonnetPct / 100) * 3 + dailyOutputTok * (sonnetPct / 100) * 15) / 1_000_000;
    const haikuCostNoCache = (effectiveInputNoCache * (haikuPct / 100) * 0.25 + dailyOutputTok * (haikuPct / 100) * 1.25) / 1_000_000;
    const dailyNoCache = (opusCostNoCache + sonnetCostNoCache + haikuCostNoCache) * (batch ? 0.5 : 1);
    const dailyNoBatch = (opusCost + sonnetCost + haikuCost);
    const savingsCaching = caching ? (dailyNoCache - dailyCostBase) * 30 : 0;
    const savingsBatch = batch ? dailyNoBatch * 30 * 0.5 : 0;

    const perReqCost = dailyMessages > 0 ? dailyCostBase / dailyMessages : 0;

    return { months, dailyCostBase, savingsCaching, savingsBatch, perReqCost };
  }, [dau, msgPerUser, avgIn, avgOut, opusPct, sonnetPct, haikuPct, caching, batch, growth]);

  // Chart dimensions
  const PL = 56, PR = 16, PT = 20, PB = 32;
  const W = 560, H = 260;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;

  const budgetVal = parseFloat(budget) || 0;
  const maxVal = Math.max(...months, budgetVal, 1);

  const yScale = (v: number) => PT + chartH - (v / maxVal) * chartH;
  const xScale = (i: number) => PL + (i / 11) * chartW;

  // Y axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => maxVal * (i + 1) / 5);

  // SVG path
  const pts = months.map((v, i) => [xScale(i), yScale(v)] as [number, number]);

  // Cubic bezier smooth path — split into normal and exceeded-budget segments
  function cubicPath(points: [number, number][]): string {
    if (points.length < 2) return '';
    let d = `M${points[0][0]},${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev[0] + curr[0]) / 2;
      d += ` C${cpx},${prev[1]} ${cpx},${curr[1]} ${curr[0]},${curr[1]}`;
    }
    return d;
  }

  // Split path at budget line
  const normalPts: [number, number][] = [];
  const exceededPts: [number, number][] = [];
  let crossedBudget = false;
  for (let i = 0; i < pts.length; i++) {
    const monthCost = months[i];
    if (monthCost > budgetVal && budgetVal > 0) {
      if (!crossedBudget && i > 0) {
        // Add the crossover point
        const prev = months[i - 1];
        const t = (budgetVal - prev) / (monthCost - prev);
        const crossX = xScale(i - 1) + t * (xScale(i) - xScale(i - 1));
        const crossY = yScale(budgetVal);
        normalPts.push([crossX, crossY]);
        exceededPts.push([crossX, crossY]);
        crossedBudget = true;
      }
      exceededPts.push(pts[i]);
    } else {
      normalPts.push(pts[i]);
    }
  }

  const annualTotal = months.reduce((s, v) => s + v, 0);
  const peakMonth = Math.max(...months);
  const currentMonth = months[0];

  // Gradient fill path
  const fillPath = cubicPath(pts) + ` L${pts[pts.length - 1][0]},${PT + chartH} L${pts[0][0]},${PT + chartH} Z`;

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgX = (e.clientX - rect.left) * (W / rect.width);
    const relX = svgX - PL;
    const idx = Math.round((relX / chartW) * 11);
    setHoverIdx(Math.max(0, Math.min(11, idx)));
  }, [chartW]);

  return (
    <div className="cf-root">
      <header className="cf-bar">
        <Link href="/agenticstudio" className="cf-bar-logo"><AgenticWordmark /></Link>
        <div className="cf-bar-sep" />
        <span className="cf-bar-title">Cost Forecaster</span>
      </header>

      <div className="cf-body">
        {/* Left config */}
        <aside className="cf-left">
          <div className="cf-field">
            <div className="cf-field-label"><span className="cf-label">Daily Active Users</span><span className="cf-val green">{formatNum(dau)}</span></div>
            <input type="range" className="cf-slider" min={100} max={100000} step={100} value={dau} onChange={e => setDau(+e.target.value)} />
          </div>
          <div className="cf-field">
            <div className="cf-field-label"><span className="cf-label">Msgs / User / Day</span><span className="cf-val">{msgPerUser}</span></div>
            <input type="range" className="cf-slider" min={1} max={30} value={msgPerUser} onChange={e => setMsgPerUser(+e.target.value)} />
          </div>
          <div className="cf-field">
            <div className="cf-field-label"><span className="cf-label">Avg Input Tokens</span><span className="cf-val">{formatNum(avgIn)}</span></div>
            <input type="range" className="cf-slider" min={100} max={4000} step={50} value={avgIn} onChange={e => setAvgIn(+e.target.value)} />
          </div>
          <div className="cf-field">
            <div className="cf-field-label"><span className="cf-label">Avg Output Tokens</span><span className="cf-val">{formatNum(avgOut)}</span></div>
            <input type="range" className="cf-slider" min={50} max={1000} step={25} value={avgOut} onChange={e => setAvgOut(+e.target.value)} />
          </div>

          <div className="cf-divider" />
          <div className="cf-divider-label">Model Mix</div>

          <div className="cf-mix-bar">
            <div className="cf-mix-seg" style={{ width: `${opusPct}%`, background: '#FF6B35' }} />
            <div className="cf-mix-seg" style={{ width: `${sonnetPct}%`, background: '#06B6D4' }} />
            <div className="cf-mix-seg" style={{ width: `${haikuPct}%`, background: '#34D399' }} />
          </div>

          <div className="cf-field">
            <div className="cf-field-label"><span className="cf-label" style={{ color: '#FF6B35' }}>Opus %</span><span className="cf-val">{opusPct}%</span></div>
            <input type="range" className="cf-slider" min={0} max={100} value={opusPct} onChange={e => adjustMix('opus', +e.target.value)} style={{ accentColor: '#FF6B35' }} />
          </div>
          <div className="cf-field">
            <div className="cf-field-label"><span className="cf-label" style={{ color: '#06B6D4' }}>Sonnet %</span><span className="cf-val">{sonnetPct}%</span></div>
            <input type="range" className="cf-slider" min={0} max={100 - opusPct} value={sonnetPct} onChange={e => adjustMix('sonnet', +e.target.value)} style={{ accentColor: '#06B6D4' }} />
          </div>
          <div className="cf-field">
            <div className="cf-field-label"><span className="cf-label" style={{ color: '#34D399' }}>Haiku %</span><span className="cf-val">{haikuPct}%</span></div>
            <input type="range" className="cf-slider" min={0} max={100 - opusPct} value={haikuPct} onChange={e => adjustMix('haiku', +e.target.value)} style={{ accentColor: '#34D399' }} />
          </div>

          <div className="cf-divider" />

          <label className="cf-toggle-row">
            <span className="cf-toggle-name">Prompt Caching</span>
            <span className="cf-tswitch"><input type="checkbox" checked={caching} onChange={e => setCaching(e.target.checked)} /><span className="cf-ttrack" /><span className="cf-tthumb" /></span>
          </label>
          <label className="cf-toggle-row">
            <span className="cf-toggle-name">Batch API</span>
            <span className="cf-tswitch"><input type="checkbox" checked={batch} onChange={e => setBatch(e.target.checked)} /><span className="cf-ttrack" /><span className="cf-tthumb" /></span>
          </label>

          <div className="cf-field">
            <div className="cf-field-label"><span className="cf-label">Monthly Budget $</span></div>
            <input className="cf-budget-input" value={budget} onChange={e => setBudget(e.target.value)} placeholder="500" />
          </div>

          <div className="cf-field">
            <div className="cf-field-label"><span className="cf-label">Monthly Growth</span><span className="cf-val">{growth}%</span></div>
            <input type="range" className="cf-slider" min={0} max={20} value={growth} onChange={e => setGrowth(+e.target.value)} />
          </div>
        </aside>

        {/* Center chart */}
        <div className="cf-center">
          <div className="cf-chart-title">12-Month Cost Projection</div>
          <div className="cf-chart-wrap">
            {hoverIdx !== null && (
              <div className="cf-tooltip" style={{ left: `${((xScale(hoverIdx) / W) * 100).toFixed(1)}%`, top: `${((yScale(months[hoverIdx]) / H) * 100).toFixed(1)}%`, transform: 'translate(-50%, -120%)' }}>
                <div className="cf-tooltip-month">{MONTHS[hoverIdx]} 2026</div>
                <div className="cf-tooltip-cost">{formatCost(months[hoverIdx])}/mo</div>
              </div>
            )}
            <svg
              ref={svgRef}
              className="cf-chart-svg"
              viewBox={`0 0 ${W} ${H}`}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <defs>
                <linearGradient id="cf-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {yTicks.map((v, i) => (
                <g key={i}>
                  <line className="cf-grid-line" x1={PL} x2={W - PR} y1={yScale(v)} y2={yScale(v)} />
                  <text className="cf-axis-label" x={PL - 6} y={yScale(v)} textAnchor="end" dominantBaseline="middle">{formatCost(v)}</text>
                </g>
              ))}

              {/* X axis labels */}
              {MONTHS.map((m, i) => (
                <text key={m} className="cf-axis-label" x={xScale(i)} y={H - 6} textAnchor="middle">{m}</text>
              ))}

              {/* Fill area */}
              <path d={fillPath} fill="url(#cf-grad)" />

              {/* Normal line */}
              {normalPts.length > 1 && (
                <path d={cubicPath(normalPts)} fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
              )}

              {/* Exceeded budget line */}
              {exceededPts.length > 1 && (
                <path d={cubicPath(exceededPts)} fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
              )}

              {/* Data points */}
              {pts.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={hoverIdx === i ? 5 : 3} fill={months[i] > budgetVal && budgetVal > 0 ? '#EF4444' : '#22C55E'} />
              ))}

              {/* Crosshair */}
              {hoverIdx !== null && (
                <line x1={xScale(hoverIdx)} x2={xScale(hoverIdx)} y1={PT} y2={PT + chartH} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
              )}

              {/* Budget line */}
              {budgetVal > 0 && budgetVal <= maxVal && (
                <>
                  <line className="cf-budget-line" x1={PL} x2={W - PR} y1={yScale(budgetVal)} y2={yScale(budgetVal)} />
                  <text className="cf-budget-label" x={W - PR - 4} y={yScale(budgetVal) - 5} textAnchor="end">Budget</text>
                </>
              )}
            </svg>
          </div>
        </div>

        {/* Right breakdown */}
        <aside className="cf-right">
          <div className="cf-total">
            <div className="cf-total-label">Annual Total</div>
            <div className="cf-total-num">{formatCost(annualTotal)}</div>
          </div>

          <div>
            <div className="cf-total-label" style={{ marginBottom: 8 }}>Breakdown</div>
            <div className="cf-breakdown-row"><span className="cf-breakdown-key">Current mo</span><span className="cf-breakdown-val">{formatCost(currentMonth)}</span></div>
            <div className="cf-breakdown-row"><span className="cf-breakdown-key">Peak mo</span><span className="cf-breakdown-val">{formatCost(peakMonth)}</span></div>
            <div className="cf-breakdown-row"><span className="cf-breakdown-key">Daily cost</span><span className="cf-breakdown-val">{formatCost(dailyCostBase)}</span></div>
            <div className="cf-breakdown-row"><span className="cf-breakdown-key">Per request</span><span className="cf-breakdown-val">${perReqCost.toFixed(5)}</span></div>
          </div>

          {(caching || batch) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="cf-total-label" style={{ marginBottom: 2 }}>Savings</div>
              {caching && <div className="cf-savings-badge caching">Caching saves {formatCost(savingsCaching)}/mo</div>}
              {batch && <div className="cf-savings-badge batch">Batch saves {formatCost(savingsBatch)}/mo</div>}
            </div>
          )}

          <div>
            <div className="cf-total-label" style={{ marginBottom: 8 }}>Optimization Tips</div>
            <div className="cf-opt-tips">
              <div className="cf-opt-tip">↑ Haiku % by 10% → saves {formatCost(dailyCostBase * 30 * 0.08)}/mo</div>
              <div className="cf-opt-tip">Enable Caching → cuts input cost ~60%</div>
              <div className="cf-opt-tip">Enable Batch API → 50% off all costs</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
