'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import './prompt-lab.css';

const MODELS = ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'gpt-4o', 'gemini-2.0-flash'];

const DEFAULT_PROMPT_A = `You are a concise technical explainer. Give precise, minimal answers — cut every word that doesn't add information. Prefer bullet points and short sentences.`;
const DEFAULT_PROMPT_B = `You are a thorough educator. Explain concepts with clear analogies, concrete examples, and context that helps the reader build lasting mental models. Don't rush.`;
const DEFAULT_USER_MSG = 'Explain how attention mechanisms work in transformer models.';

const RESPONSE_A = `**Attention in one sentence:** Each token looks at all other tokens, computes a relevance score, and uses a weighted average of their values.

**The mechanics:**
- Q (query): what this token is looking for
- K (key): what each token offers
- V (value): what each token contributes if selected
- Score = softmax(QK^T / √d_k) · V

**Why it works:** Captures long-range dependencies in O(1) layers. "The cat sat on the mat because it was tired" — "it" can attend directly to "cat" regardless of distance.

**Multi-head:** Run several attention operations in parallel with different weight projections, then concatenate. Each head learns a different relationship type.`;

const RESPONSE_B = `Imagine you're at a party trying to understand a complex conversation. You don't listen to everyone equally — you focus more on the people whose words seem most relevant to what you're currently thinking about. That's essentially what attention does.

**The core idea:** Every word in a sentence gets to "ask a question" and "look up answers" from all other words simultaneously.

Here's how it works mechanically:

Each token is projected into three vectors: a **Query** (what am I looking for?), a **Key** (what do I advertise about myself?), and a **Value** (what information do I carry?).

To compute attention, we take the dot product of a Query with every Key in the sequence. This gives us raw compatibility scores — "how relevant is token B to token A?" We scale by √d to prevent the scores from blowing up in high dimensions, then apply softmax to get probabilities that sum to 1. Finally we take a weighted sum of Values.

The beautiful result: "The cat sat on the mat because **it** was tired" — the attention mechanism can directly connect "it" to "cat" across any distance, something recurrent networks struggled with.

**Multi-head attention** runs this process several times in parallel with different learned projections, then concatenates the results. Each head specializes — one might track subject-verb agreement, another might learn syntactic dependencies, another semantic similarity. The model learns what to specialize in from data alone.`;

function typeStream(text: string, onChar: (c: string) => void, onDone: () => void, ms = 14) {
  let i = 0;
  const tick = () => { if (i >= text.length) return onDone(); onChar(text[i++]); setTimeout(tick, ms); };
  setTimeout(tick, 0);
}

interface ColState {
  system: string;
  model: string;
  output: string;
  running: boolean;
  done: boolean;
  tokens: number;
  ms: number;
}

const initA: ColState = { system: DEFAULT_PROMPT_A, model: 'claude-opus-4-7', output: '', running: false, done: false, tokens: 0, ms: 0 };
const initB: ColState = { system: DEFAULT_PROMPT_B, model: 'claude-sonnet-4-6', output: '', running: false, done: false, tokens: 0, ms: 0 };

export default function PromptLab() {
  const [userMsg, setUserMsg] = useState(DEFAULT_USER_MSG);
  const [colA, setColA] = useState<ColState>(initA);
  const [colB, setColB] = useState<ColState>(initB);
  const [hasRun, setHasRun] = useState(false);

  const anyRunning = colA.running || colB.running;

  function runBoth() {
    if (anyRunning) return;
    setHasRun(true);
    setColA(c => ({ ...c, output: '', running: true, done: false, tokens: 0, ms: 0 }));
    setColB(c => ({ ...c, output: '', running: true, done: false, tokens: 0, ms: 0 }));

    const t0A = Date.now();
    const t0B = Date.now();

    // Stream A (slightly faster — concise response is shorter)
    typeStream(RESPONSE_A, c => {
      setColA(a => ({ ...a, output: a.output + c }));
    }, () => {
      setColA(a => ({ ...a, running: false, done: true, tokens: Math.round(RESPONSE_A.length / 4), ms: Date.now() - t0A }));
    }, 12);

    // Stream B (slightly slower — longer detailed response)
    setTimeout(() => {
      typeStream(RESPONSE_B, c => {
        setColB(b => ({ ...b, output: b.output + c }));
      }, () => {
        setColB(b => ({ ...b, running: false, done: true, tokens: Math.round(RESPONSE_B.length / 4), ms: Date.now() - t0B }));
      }, 16);
    }, 120);
  }

  function reset() {
    setColA({ ...initA }); setColB({ ...initB }); setHasRun(false);
  }

  return (
    <div className="pl-root">
      <header className="pl-bar">
        <Link href="/agenticstudio" className="pl-bar-logo"><AgenticWordmark /></Link>
        <div className="pl-bar-sep" />
        <span className="pl-bar-title">Prompt Engineering Lab</span>
        <div className="pl-bar-space" />
        {hasRun && !anyRunning && <button className="pl-bar-reset" onClick={reset}>↺ Reset</button>}
      </header>

      {/* Shared input */}
      <div className="pl-input-bar">
        <div className="pl-input-wrap">
          <div className="pl-input-label">User Message</div>
          <textarea className="pl-input-ta" value={userMsg} onChange={e => setUserMsg(e.target.value)} rows={2} disabled={anyRunning} />
        </div>
        <button className="pl-run" onClick={runBoth} disabled={anyRunning}>
          {anyRunning ? <><span className="pl-spin" />Running…</> : '▶  Run Both'}
        </button>
      </div>

      {/* Two columns */}
      <div className="pl-columns">
        <PromptColumn label="Variant A" accentColor="#FF6B35" state={colA} onChange={setColA} streaming={anyRunning} hasRun={hasRun} />
        <div className="pl-col-div" />
        <PromptColumn label="Variant B" accentColor="#06B6D4" state={colB} onChange={setColB} streaming={anyRunning} hasRun={hasRun} />
      </div>

      {/* Comparison footer */}
      {colA.done && colB.done && (
        <div className="pl-compare">
          <div className="pl-compare-item">
            <span className="pl-compare-label" style={{ color: '#FF6B35' }}>A</span>
            <span className="pl-compare-val">{colA.tokens} tok · {colA.ms}ms · {colA.output.split(' ').length} words</span>
          </div>
          <div className="pl-compare-vs">vs</div>
          <div className="pl-compare-item">
            <span className="pl-compare-label" style={{ color: '#06B6D4' }}>B</span>
            <span className="pl-compare-val">{colB.tokens} tok · {colB.ms}ms · {colB.output.split(' ').length} words</span>
          </div>
          <div className="pl-compare-diff">
            B is {Math.round(colB.output.split(' ').length / colA.output.split(' ').length * 10) / 10}× longer ·
            {colA.ms < colB.ms ? ` A is ${colB.ms - colA.ms}ms faster` : ` B is ${colA.ms - colB.ms}ms faster`}
          </div>
        </div>
      )}
    </div>
  );
}

function PromptColumn({ label, accentColor, state, onChange, streaming, hasRun }:
  { label: string; accentColor: string; state: ColState; onChange: (s: ColState) => void; streaming: boolean; hasRun: boolean }) {
  const outputRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [state.output]);

  return (
    <div className="pl-col">
      <div className="pl-col-header" style={{ borderColor: accentColor }}>
        <span className="pl-col-label" style={{ color: accentColor }}>{label}</span>
        <select className="pl-col-model" value={state.model} onChange={e => onChange({ ...state, model: e.target.value })} disabled={streaming}>
          {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="pl-col-sys-label">System Prompt</div>
      <textarea className="pl-col-sys" value={state.system} onChange={e => onChange({ ...state, system: e.target.value })} rows={4} disabled={streaming} />
      <div className="pl-col-output-label">Output</div>
      <div className="pl-col-output" ref={outputRef} style={{ borderColor: state.running ? accentColor : undefined }}>
        {!hasRun && <span className="pl-col-placeholder">Output will appear here after running</span>}
        {hasRun && state.output === '' && state.running && <div className="pl-col-dots"><span /><span /><span /></div>}
        {state.output && (
          <div className="pl-col-text" style={{ color: accentColor === '#FF6B35' ? '#FFB49A' : '#67E8F9' }}>
            {state.output}{state.running && <span className="pl-cur" />}
          </div>
        )}
      </div>
      {state.done && (
        <div className="pl-col-stats">
          <span style={{ color: accentColor }}>✓</span>
          <span>{state.tokens} tokens</span>
          <span>{state.ms}ms</span>
          <span>{state.output.split(' ').length} words</span>
        </div>
      )}
    </div>
  );
}
