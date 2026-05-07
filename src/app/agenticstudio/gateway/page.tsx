'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import './gateway.css';

interface ApiRequest {
  id: string;
  ts: number;
  provider: string;
  model: string;
  inTok: number;
  outTok: number;
  cost: number;
  ms: number;
  ok: boolean;
}

const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic', color: '#FF6B35', models: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'] },
  { id: 'openai',    label: 'OpenAI',    color: '#A78BFA', models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'] },
  { id: 'google',    label: 'Google',    color: '#34D399', models: ['gemini-2.0-flash', 'gemini-1.5-pro'] },
  { id: 'meta',      label: 'Meta',      color: '#06B6D4', models: ['llama-3.1-70b', 'llama-3.1-8b'] },
];

const COST_PER_M: Record<string, { in: number; out: number }> = {
  'claude-opus-4-7':          { in: 15,    out: 75    },
  'claude-sonnet-4-6':        { in: 3,     out: 15    },
  'claude-haiku-4-5-20251001':{ in: 0.25,  out: 1.25  },
  'gpt-4o':                   { in: 5,     out: 15    },
  'gpt-4o-mini':              { in: 0.15,  out: 0.60  },
  'o3-mini':                  { in: 1.10,  out: 4.40  },
  'gemini-2.0-flash':         { in: 0.075, out: 0.30  },
  'gemini-1.5-pro':           { in: 1.25,  out: 5.00  },
  'llama-3.1-70b':            { in: 0.88,  out: 0.88  },
  'llama-3.1-8b':             { in: 0.18,  out: 0.18  },
};

function uid() { return Math.random().toString(36).slice(2, 9); }
function calcCost(model: string, inTok: number, outTok: number) {
  const c = COST_PER_M[model] ?? { in: 1, out: 4 };
  return (inTok * c.in + outTok * c.out) / 1_000_000;
}
function randInt(lo: number, hi: number) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }
function makeRequest(): ApiRequest {
  const p = PROVIDERS[randInt(0, PROVIDERS.length - 1)];
  const model = p.models[randInt(0, p.models.length - 1)];
  const inTok = randInt(150, 2400);
  const outTok = randInt(80, 900);
  return {
    id: uid(), ts: Date.now(),
    provider: p.id, model,
    inTok, outTok,
    cost: calcCost(model, inTok, outTok),
    ms: randInt(280, 3800),
    ok: Math.random() > 0.04,
  };
}

// Seed with initial history
const INITIAL: ApiRequest[] = Array.from({ length: 18 }, () => {
  const r = makeRequest();
  r.ts -= randInt(5_000, 120_000);
  return r;
}).sort((a, b) => b.ts - a.ts);

export default function ApiGateway() {
  const [requests, setRequests] = useState<ApiRequest[]>(INITIAL);
  const [live, setLive] = useState(true);
  const [budget, setBudget] = useState('10.00');
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>();

  useEffect(() => {
    if (live) {
      timerRef.current = setInterval(() => {
        setRequests(r => [makeRequest(), ...r].slice(0, 80));
      }, randInt(1800, 3500));
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [live]);

  const totalCost = requests.reduce((s, r) => s + r.cost, 0);
  const totalReqs = requests.length;
  const totalToks = requests.reduce((s, r) => s + r.inTok + r.outTok, 0);
  const avgMs = Math.round(requests.reduce((s, r) => s + r.ms, 0) / Math.max(requests.length, 1));
  const budgetNum = parseFloat(budget) || 10;
  const budgetPct = Math.min(100, (totalCost / budgetNum) * 100);

  const byProvider = PROVIDERS.map(p => {
    const reqs = requests.filter(r => r.provider === p.id);
    return { ...p, count: reqs.length, cost: reqs.reduce((s, r) => s + r.cost, 0) };
  });

  // Last 24 requests for mini chart
  const chartData = requests.slice(0, 24).reverse();
  const chartMax = Math.max(...chartData.map(r => r.cost), 0.001);

  return (
    <div className="gw-root">
      <header className="gw-bar">
        <Link href="/agenticstudio" className="gw-bar-logo"><AgenticWordmark /></Link>
        <div className="gw-bar-sep" />
        <span className="gw-bar-title">API Gateway & Cost Tracker</span>
        <div className="gw-bar-space" />
        <label className="gw-live-toggle">
          <input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)} />
          <span className={`gw-live-dot${live ? ' on' : ''}`} />
          Live
        </label>
      </header>

      {/* Summary strip */}
      <div className="gw-summary">
        <div className="gw-summary-stat">
          <div className="gw-summary-val">${totalCost.toFixed(4)}</div>
          <div className="gw-summary-label">Total Cost</div>
        </div>
        <div className="gw-summary-stat">
          <div className="gw-summary-val">{totalReqs.toLocaleString()}</div>
          <div className="gw-summary-label">Requests</div>
        </div>
        <div className="gw-summary-stat">
          <div className="gw-summary-val">{(totalToks / 1000).toFixed(1)}K</div>
          <div className="gw-summary-label">Total Tokens</div>
        </div>
        <div className="gw-summary-stat">
          <div className="gw-summary-val">{avgMs}ms</div>
          <div className="gw-summary-label">Avg Latency</div>
        </div>

        {/* Budget bar */}
        <div className="gw-budget">
          <div className="gw-budget-label">
            <span>Budget</span>
            <div className="gw-budget-input-wrap">
              $<input className="gw-budget-input" value={budget} onChange={e => setBudget(e.target.value)} />
            </div>
          </div>
          <div className="gw-budget-bar-bg">
            <div className="gw-budget-bar" style={{ width: `${budgetPct}%`, background: budgetPct > 85 ? '#F472B6' : budgetPct > 60 ? '#F59E0B' : '#34D399' }} />
          </div>
          <div className="gw-budget-pct" style={{ color: budgetPct > 85 ? '#F472B6' : '#E8EAF0' }}>{budgetPct.toFixed(1)}% used</div>
        </div>
      </div>

      <div className="gw-layout">
        {/* Request feed */}
        <div className="gw-feed-wrap">
          <div className="gw-feed-header">
            <span>Request Feed</span>
            <span className="gw-feed-count">{requests.length} requests</span>
          </div>
          <div className="gw-feed">
            {requests.map((r, i) => {
              const p = PROVIDERS.find(p => p.id === r.provider)!;
              return (
                <div key={r.id} className={`gw-req${i === 0 && live ? ' gw-req-new' : ''}`}>
                  <div className="gw-req-dot" style={{ background: p.color }} />
                  <div className="gw-req-model">{r.model}</div>
                  <div className="gw-req-toks">{(r.inTok + r.outTok).toLocaleString()} tok</div>
                  <div className="gw-req-cost">${r.cost.toFixed(5)}</div>
                  <div className="gw-req-ms">{r.ms}ms</div>
                  <div className={`gw-req-status${r.ok ? ' ok' : ' err'}`}>{r.ok ? '200' : '500'}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel */}
        <aside className="gw-aside">
          {/* Provider breakdown */}
          <div className="gw-panel">
            <div className="gw-panel-title">By Provider</div>
            {byProvider.map(p => (
              <div key={p.id} className="gw-provider-row">
                <div className="gw-provider-dot" style={{ background: p.color }} />
                <span className="gw-provider-name">{p.label}</span>
                <span className="gw-provider-count">{p.count} req</span>
                <span className="gw-provider-cost" style={{ color: p.color }}>${p.cost.toFixed(4)}</span>
              </div>
            ))}
          </div>

          {/* Cost mini chart */}
          <div className="gw-panel">
            <div className="gw-panel-title">Cost per Request (last 24)</div>
            <div className="gw-chart">
              {chartData.map((r, i) => {
                const p = PROVIDERS.find(p => p.id === r.provider)!;
                const h = Math.max(4, (r.cost / chartMax) * 80);
                return (
                  <div key={r.id} className="gw-chart-bar-wrap" title={`${r.model}: $${r.cost.toFixed(5)}`}>
                    <div className="gw-chart-bar" style={{ height: h, background: p.color }} />
                  </div>
                );
              })}
            </div>
            <div className="gw-chart-labels">
              <span>oldest</span><span>newest</span>
            </div>
          </div>

          {/* Top models */}
          <div className="gw-panel">
            <div className="gw-panel-title">Top Models</div>
            {Object.entries(
              requests.reduce<Record<string, { count: number; cost: number }>>((acc, r) => {
                if (!acc[r.model]) acc[r.model] = { count: 0, cost: 0 };
                acc[r.model].count++;
                acc[r.model].cost += r.cost;
                return acc;
              }, {})
            ).sort((a, b) => b[1].count - a[1].count).slice(0, 5).map(([model, stat]) => {
              const p = PROVIDERS.find(p => p.models.includes(model))!;
              return (
                <div key={model} className="gw-model-row">
                  <div className="gw-model-dot" style={{ background: p?.color }} />
                  <span className="gw-model-name">{model}</span>
                  <span className="gw-model-count">{stat.count}</span>
                  <span className="gw-model-cost">${stat.cost.toFixed(4)}</span>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
