'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import './streaming.css';

const MODELS = [
  { id: 'claude-opus-4-7',         label: 'Claude Opus 4.7',   color: '#FF6B35', cpk: 0.075 },
  { id: 'claude-sonnet-4-6',       label: 'Claude Sonnet 4.6', color: '#F59E0B', cpk: 0.015 },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', color: '#06B6D4', cpk: 0.001 },
  { id: 'gpt-4o',                  label: 'GPT-4o',            color: '#A78BFA', cpk: 0.010 },
  { id: 'gemini-2.0-flash',        label: 'Gemini 2.0 Flash',  color: '#34D399', cpk: 0.0004 },
];

const DEMO_RESPONSES: Record<string, string> = {
  default: `Streaming output lets language model APIs deliver tokens to your application as they are generated — rather than waiting for the entire response to complete before sending anything.

From the API perspective this works via Server-Sent Events (SSE) or chunked HTTP transfer encoding. Each delta event carries a small slice of new text. On the client side you accumulate these deltas and render them progressively, creating the familiar typewriter effect.

The latency advantage is significant: with a 2,000-token response at 60 tokens/second, a non-streaming call blocks for ~33 seconds before the user sees anything. Streaming delivers the first token in under 500ms on a warm connection, and the user reads ahead as generation continues.

For agentic workflows, streaming becomes even more critical: you can detect tool-call JSON blocks as they arrive, fire tool executions before the model finishes reasoning, and pipeline multiple steps — reducing overall wall-clock time substantially.

Time to first token (TTFT) is the key metric to watch. It reflects model infrastructure health more accurately than throughput (tokens/sec), since throughput is bounded by your token budget, while TTFT is purely a server-side cold-start indicator.`,
  hello: `Hello! I'm Claude, an AI assistant made by Anthropic. I'm here to help with questions, analysis, writing, code, math, and much more. What can I help you with today?`,
};

interface Msg { role: 'user' | 'assistant'; content: string; }
interface Metrics { ttft: number; tps: number; total: number; cost: number; active: boolean; }

function typeStream(text: string, onChar: (c: string, i: number) => void, onDone: () => void, ms = 12) {
  let i = 0;
  const tick = () => { if (i >= text.length) return onDone(); onChar(text[i], i); i++; setTimeout(tick, ms); };
  setTimeout(tick, 0);
}

function pickResponse(q: string): string {
  const lower = q.toLowerCase();
  if (lower.includes('hello') || lower.includes('hi ') || lower === 'hi') return DEMO_RESPONSES.hello;
  return DEMO_RESPONSES.default;
}

export default function StreamingConsole() {
  const [modelId, setModelId] = useState('claude-opus-4-7');
  const [sysPrompt, setSysPrompt] = useState('You are a helpful AI assistant. Be clear, precise, and insightful.');
  const [showSys, setShowSys] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ ttft: 0, tps: 0, total: 0, cost: 0, active: false });
  const [streaming, setStreaming] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const t0 = useRef(0);
  const tokCount = useRef(0);
  const tpsTick = useRef<ReturnType<typeof setInterval>>();

  const model = MODELS.find(m => m.id === modelId) ?? MODELS[0];

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages]);

  function send() {
    if (!input.trim() || streaming) return;
    const q = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', content: q }]);
    streamReply(q);
  }

  function streamReply(q: string) {
    setStreaming(true);
    t0.current = Date.now();
    tokCount.current = 0;
    setMetrics({ ttft: 0, tps: 0, total: 0, cost: 0, active: true });
    setMessages(m => [...m, { role: 'assistant', content: '' }]);

    let firstTok = true;
    const resp = pickResponse(q);

    tpsTick.current = setInterval(() => {
      const elapsed = (Date.now() - t0.current) / 1000;
      if (elapsed > 0) setMetrics(m => ({ ...m, tps: +(tokCount.current / elapsed).toFixed(1) }));
    }, 150);

    typeStream(resp, (c, i) => {
      if (firstTok) { firstTok = false; setMetrics(m => ({ ...m, ttft: Date.now() - t0.current })); }
      if (i % 4 === 0) {
        tokCount.current++;
        const cost = (tokCount.current * model.cpk) / 1000;
        setMetrics(m => ({ ...m, total: tokCount.current, cost }));
      }
      setMessages(m => {
        const last = m[m.length - 1];
        if (last?.role === 'assistant') return [...m.slice(0, -1), { ...last, content: last.content + c }];
        return m;
      });
    }, () => {
      clearInterval(tpsTick.current);
      const elapsed = (Date.now() - t0.current) / 1000;
      setMetrics(m => ({ ...m, tps: +(tokCount.current / elapsed).toFixed(1), active: false }));
      setStreaming(false);
    });
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="sc-root">
      <header className="sc-bar">
        <Link href="/agenticstudio" className="sc-bar-logo"><AgenticWordmark /></Link>
        <div className="sc-bar-sep" />
        <span className="sc-bar-title">Streaming Console</span>
        <div className="sc-bar-space" />
        <div className="sc-model-pills">
          {MODELS.map(m => (
            <button key={m.id} className={`sc-model-pill${m.id === modelId ? ' on' : ''}`}
              style={m.id === modelId ? { borderColor: m.color, color: m.color } : {}}
              onClick={() => setModelId(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
      </header>

      {/* System prompt bar */}
      <div className="sc-sys-bar">
        <button className="sc-sys-toggle" onClick={() => setShowSys(v => !v)}>
          <span className="sc-sys-label">System Prompt</span>
          <span className="sc-sys-preview">{showSys ? '▲ collapse' : `"${sysPrompt.slice(0, 60)}…"`}</span>
        </button>
        {showSys && (
          <textarea className="sc-sys-ta" value={sysPrompt} onChange={e => setSysPrompt(e.target.value)} rows={3} />
        )}
      </div>

      <div className="sc-layout">
        {/* Thread */}
        <div className="sc-thread-wrap">
          <div className="sc-thread" ref={threadRef}>
            {messages.length === 0 && (
              <div className="sc-welcome">
                <div className="sc-welcome-icon" style={{ color: model.color }}>◈</div>
                <p>Start a conversation — watch tokens stream in real time with live throughput metrics</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`sc-msg sc-msg-${m.role}`}>
                <div className="sc-msg-role" style={m.role === 'user' ? { color: '#FF6B35' } : { color: model.color }}>
                  {m.role === 'user' ? 'You' : model.label}
                </div>
                <div className="sc-msg-text">
                  {m.content}
                  {m.role === 'assistant' && streaming && i === messages.length - 1 && <span className="sc-cur" />}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="sc-input-wrap">
            <textarea
              className="sc-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
              rows={2}
              disabled={streaming}
            />
            <button className="sc-send" onClick={send} disabled={!input.trim() || streaming}
              style={{ background: model.color }}>
              {streaming ? <span className="sc-spin" /> : '↑'}
            </button>
          </div>
        </div>

        {/* Metrics sidebar */}
        <aside className="sc-metrics">
          <div className="sc-metrics-title">Live Metrics</div>

          <MetricBlock label="Tokens / sec" value={metrics.tps.toFixed(1)} unit="tok/s" active={metrics.active} color={model.color} />
          <MetricBlock label="Time to first token" value={metrics.ttft > 0 ? `${metrics.ttft}` : '—'} unit="ms" active={false} color="#A78BFA" />
          <MetricBlock label="Total output tokens" value={String(metrics.total)} unit="tok" active={metrics.active} color="#34D399" />
          <MetricBlock label="Estimated cost" value={metrics.cost > 0 ? `$${metrics.cost.toFixed(5)}` : '$0.00000'} unit="" active={metrics.active} color="#F59E0B" />

          <div className="sc-metrics-divider" />
          <div className="sc-metrics-model">
            <div className="sc-metrics-model-dot" style={{ background: model.color }} />
            <span>{model.label}</span>
          </div>
          <div className="sc-metrics-cpk">${model.cpk.toFixed(4)} / 1K output tokens</div>

          {metrics.active && (
            <div className="sc-wave">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="sc-wave-bar" style={{ animationDelay: `${i * 0.07}s`, background: model.color }} />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function MetricBlock({ label, value, unit, active, color }: { label: string; value: string; unit: string; active: boolean; color: string }) {
  return (
    <div className="sc-metric-block">
      <div className="sc-metric-label">{label}</div>
      <div className="sc-metric-value" style={active ? { color } : {}}>
        {value} <span className="sc-metric-unit">{unit}</span>
      </div>
    </div>
  );
}
