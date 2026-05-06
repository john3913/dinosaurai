'use client';
import { useState } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import './evals.css';

const CRITERIA = [
  { key: 'correctness',  label: 'Correctness',  color: '#FF6B35', desc: 'Factual accuracy' },
  { key: 'completeness', label: 'Completeness', color: '#F59E0B', desc: 'Fully addresses the question' },
  { key: 'clarity',      label: 'Clarity',      color: '#06B6D4', desc: 'Easy to understand' },
  { key: 'conciseness',  label: 'Conciseness',  color: '#A78BFA', desc: 'Appropriately brief' },
  { key: 'helpfulness',  label: 'Helpfulness',  color: '#34D399', desc: 'Genuinely useful to the user' },
] as const;

type CriterionKey = typeof CRITERIA[number]['key'];

interface Scores { [k: string]: number }
interface Reasoning { [k: string]: string }
interface EvalResult { scores: Scores; reasoning: Reasoning; overall: number; summary: string; }

const DEMO_RESULT: EvalResult = {
  scores: { correctness: 8, completeness: 6, clarity: 9, conciseness: 7, helpfulness: 8 },
  reasoning: {
    correctness: 'The response correctly shows both slice notation ([::-1]) and the reversed() built-in. Both are factually accurate approaches.',
    completeness: 'Covers two main approaches but omits the in-place .reverse() method, which is the most memory-efficient option for large lists.',
    clarity: 'Code examples are well-formatted and easy to follow. The explanation is beginner-friendly without being condescending.',
    conciseness: 'Appropriately brief — gets to working code quickly. Could remove one redundant sentence in the second paragraph.',
    helpfulness: 'A Python developer asking this question would get working code immediately. Highly practical answer.',
  },
  overall: 8,
  summary: 'Solid, accurate response with clean code examples. Missing the in-place .reverse() method limits completeness.',
};

const DEFAULT_SYSTEM = 'You are a helpful Python programming assistant.';
const DEFAULT_USER = 'How do I reverse a list in Python?';
const DEFAULT_RESPONSE = `You can reverse a list in Python using slice notation:

my_list = [1, 2, 3, 4, 5]
reversed_list = my_list[::-1]
print(reversed_list)  # [5, 4, 3, 2, 1]

You can also use the reversed() function which returns an iterator:

reversed_list = list(reversed(my_list))

Both approaches create a new list without modifying the original.`;

const MODELS = ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-7'];

type Phase = 'idle' | 'evaluating' | 'done';

function typeStream(text: string, onChar: (c: string) => void, onDone: () => void, ms = 18) {
  let i = 0;
  const tick = () => { if (i >= text.length) return onDone(); onChar(text[i++]); setTimeout(tick, ms); };
  setTimeout(tick, 0);
}

export default function EvalFramework() {
  const [system, setSystem] = useState(DEFAULT_SYSTEM);
  const [userMsg, setUserMsg] = useState(DEFAULT_USER);
  const [response, setResponse] = useState(DEFAULT_RESPONSE);
  const [model, setModel] = useState('claude-haiku-4-5-20251001');
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<EvalResult | null>(null);
  const [revealedScores, setRevealedScores] = useState<Set<CriterionKey>>(new Set());
  const [overallVisible, setOverallVisible] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [liveMode, setLiveMode] = useState<boolean | null>(null);

  async function evaluate() {
    if (phase === 'evaluating') return;
    setPhase('evaluating');
    setResult(null);
    setRevealedScores(new Set());
    setOverallVisible(false);
    setSummaryText('');

    // Try real API
    let evalResult: EvalResult | null = null;
    try {
      const resp = await fetch('/api/agenticstudio/evals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, userMessage: userMsg, response, system }),
      });
      if (resp.ok) {
        evalResult = await resp.json();
        setLiveMode(true);
      }
    } catch { /* fall through to demo */ }

    if (!evalResult) {
      setLiveMode(false);
      await new Promise(r => setTimeout(r, 1800));
      evalResult = DEMO_RESULT;
    }

    setResult(evalResult);
    setPhase('done');

    // Reveal scores one by one
    for (let i = 0; i < CRITERIA.length; i++) {
      await new Promise(r => setTimeout(r, 320 * i));
      setRevealedScores(prev => new Set([...prev, CRITERIA[i].key]));
    }
    await new Promise(r => setTimeout(r, 400));
    setOverallVisible(true);
    await new Promise(r => setTimeout(r, 300));
    typeStream(evalResult.summary, c => setSummaryText(t => t + c), () => {}, 20);
  }

  return (
    <div className="ev-root">
      <header className="ev-bar">
        <Link href="/agenticstudio" className="ev-bar-logo"><AgenticWordmark /></Link>
        <div className="ev-bar-sep" />
        <span className="ev-bar-title">Evaluation Framework</span>
        <div className="ev-bar-space" />
        {liveMode === true && <span className="ev-live-badge">LIVE API</span>}
        {liveMode === false && <span className="ev-demo-badge">DEMO MODE</span>}
      </header>

      <div className="ev-layout">
        {/* Input panel */}
        <aside className="ev-aside">
          <div className="ev-field">
            <div className="ev-label">System Prompt</div>
            <textarea className="ev-ta ev-ta-sm" value={system} onChange={e => setSystem(e.target.value)} rows={2} />
          </div>
          <div className="ev-field">
            <div className="ev-label">User Message</div>
            <textarea className="ev-ta" value={userMsg} onChange={e => setUserMsg(e.target.value)} rows={3} />
          </div>
          <div className="ev-field">
            <div className="ev-label">Response to Evaluate</div>
            <textarea className="ev-ta ev-ta-code" value={response} onChange={e => setResponse(e.target.value)} rows={10} spellCheck={false} />
          </div>
          <div className="ev-field">
            <div className="ev-label">Judge Model</div>
            <select className="ev-select" value={model} onChange={e => setModel(e.target.value)}>
              {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button className="ev-run" onClick={evaluate} disabled={phase === 'evaluating'}>
            {phase === 'evaluating' ? <><span className="ev-spin" />Evaluating…</> : '⚖  Evaluate Response'}
          </button>
          {phase !== 'idle' && phase !== 'evaluating' && (
            <button className="ev-reset" onClick={() => { setPhase('idle'); setResult(null); setRevealedScores(new Set()); setOverallVisible(false); setSummaryText(''); setLiveMode(null); }}>↺  Reset</button>
          )}
        </aside>

        {/* Scorecard panel */}
        <main className="ev-main">
          {phase === 'idle' && (
            <div className="ev-empty">
              <div className="ev-empty-ico">⚖</div>
              <p>Paste an AI response, configure the judge model, and hit <strong>Evaluate</strong> to score it against 5 quality criteria</p>
            </div>
          )}

          {phase === 'evaluating' && (
            <div className="ev-evaluating">
              <div className="ev-eval-spin" />
              <p>Claude is evaluating the response…</p>
            </div>
          )}

          {phase === 'done' && result && (
            <div className="ev-scorecard">
              <div className="ev-scorecard-title">Evaluation Results</div>

              {CRITERIA.map(c => {
                const score = result.scores[c.key] ?? 0;
                const revealed = revealedScores.has(c.key);
                return (
                  <div key={c.key} className={`ev-criterion${revealed ? ' ev-criterion-on' : ''}`}>
                    <div className="ev-crit-header">
                      <span className="ev-crit-label" style={{ color: c.color }}>{c.label}</span>
                      <span className="ev-crit-desc">{c.desc}</span>
                      <span className="ev-crit-score" style={{ color: revealed ? c.color : 'transparent' }}>{score}<span className="ev-crit-denom">/10</span></span>
                    </div>
                    <div className="ev-crit-bar-bg">
                      <div className="ev-crit-bar" style={{ width: revealed ? `${score * 10}%` : '0%', background: c.color }} />
                    </div>
                    {revealed && result.reasoning[c.key] && (
                      <div className="ev-crit-reason">{result.reasoning[c.key]}</div>
                    )}
                  </div>
                );
              })}

              {overallVisible && (
                <div className="ev-overall">
                  <div className="ev-overall-label">Overall Score</div>
                  <div className="ev-overall-score" style={{ color: result.overall >= 8 ? '#34D399' : result.overall >= 5 ? '#F59E0B' : '#F472B6' }}>
                    {result.overall}<span className="ev-overall-denom">/10</span>
                  </div>
                  {summaryText && (
                    <div className="ev-summary">{summaryText}<span className="ev-cur" /></div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
