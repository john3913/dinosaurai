'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import './tools.css';

const DEFAULT_SCHEMA = `{
  "name": "get_weather",
  "description": "Get current weather for a location",
  "input_schema": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "City name or coordinates"
      },
      "units": {
        "type": "string",
        "enum": ["celsius", "fahrenheit"],
        "description": "Temperature units"
      }
    },
    "required": ["location"]
  }
}`;

const DEFAULT_MSG = "What's the weather like in San Francisco right now?";

const DEMO_TOOL_CALL = `{
  "type": "tool_use",
  "id": "toolu_01JkXvB9qNP3MmF7z8RcLhAQ",
  "name": "get_weather",
  "input": {
    "location": "San Francisco",
    "units": "celsius"
  }
}`;

const DEMO_TOOL_RESULT = `{
  "type": "tool_result",
  "tool_use_id": "toolu_01JkXvB9qNP3MmF7z8RcLhAQ",
  "content": "18°C, partly cloudy. Wind: 14 mph W. Humidity: 76%. No precipitation expected."
}`;

const DEMO_FINAL = `San Francisco is sitting at a mild 18°C right now with partial cloud cover — a classic Bay Area afternoon. The westerly wind is coming off the ocean at 14 mph and humidity is at 76%, so it feels slightly crisp. No rain is expected. You'll want a light jacket if you're heading out, especially as the afternoon fog tends to roll in through the Golden Gate around 3–4pm.`;

const MODELS = ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'];

type TraceKind = 'user' | 'thinking' | 'tool_call' | 'tool_result' | 'assistant' | 'done';
interface TraceItem { kind: TraceKind; text?: string; meta?: { in: number; out: number; ms: number } }

function typeStream(text: string, onChar: (c: string) => void, onDone: () => void, ms = 15) {
  let i = 0;
  const tick = () => { if (i >= text.length) return onDone(); onChar(text[i++]); setTimeout(tick, ms); };
  setTimeout(tick, 0);
}

export default function ToolUseStudio() {
  const [schema, setSchema] = useState(DEFAULT_SCHEMA);
  const [msg, setMsg] = useState(DEFAULT_MSG);
  const [model, setModel] = useState('claude-sonnet-4-6');
  const [trace, setTrace] = useState<TraceItem[]>([]);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<'trace' | 'request' | 'raw'>('trace');
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [trace]);

  function addItem(item: TraceItem) { setTrace(t => [...t, item]); }
  function patchLast(fn: (p: TraceItem) => TraceItem) {
    setTrace(t => [...t.slice(0, -1), fn(t[t.length - 1])]);
  }

  function run() {
    if (running) return;
    setRunning(true); setTrace([]); setTab('trace');
    const t0 = Date.now();
    setTimeout(() => addItem({ kind: 'user', text: msg }), 200);
    setTimeout(() => addItem({ kind: 'thinking' }), 650);
    setTimeout(() => {
      setTrace(t => [...t.filter(x => x.kind !== 'thinking'), { kind: 'tool_call', text: '' }]);
      typeStream(DEMO_TOOL_CALL, c => patchLast(p => ({ ...p, text: (p.text ?? '') + c })), () => {
        setTimeout(() => {
          addItem({ kind: 'tool_result', text: DEMO_TOOL_RESULT });
          setTimeout(() => {
            addItem({ kind: 'assistant', text: '' });
            typeStream(DEMO_FINAL, c => patchLast(p => ({ ...p, text: (p.text ?? '') + c })), () => {
              setTimeout(() => {
                addItem({ kind: 'done', meta: { in: 847, out: 203, ms: Date.now() - t0 } });
                setRunning(false);
              }, 200);
            }, 18);
          }, 450);
        }, 650);
      }, 10);
    }, 1500);
  }

  const reqJson = (() => {
    try {
      return JSON.stringify({ model, max_tokens: 1024, tools: [JSON.parse(schema)], messages: [{ role: 'user', content: msg }] }, null, 2);
    } catch { return '// Fix your JSON schema first'; }
  })();

  return (
    <div className="ts-root">
      <header className="ts-bar">
        <Link href="/agenticstudio" className="ts-bar-logo"><AgenticWordmark /></Link>
        <div className="ts-bar-sep" />
        <span className="ts-bar-title">Tool Use Studio</span>
        <div className="ts-bar-space" />
        <a href="https://docs.anthropic.com/en/docs/build-with-claude/tool-use" target="_blank" rel="noopener" className="ts-bar-link">Docs ↗</a>
      </header>

      <div className="ts-layout">
        <aside className="ts-aside">
          <div className="ts-field">
            <div className="ts-label">Tool Schema <span className="ts-badge">JSON</span></div>
            <textarea className="ts-code-ta" value={schema} onChange={e => setSchema(e.target.value)} spellCheck={false} />
          </div>
          <div className="ts-field">
            <div className="ts-label">User Message</div>
            <textarea className="ts-text-ta" value={msg} onChange={e => setMsg(e.target.value)} rows={3} />
          </div>
          <div className="ts-field">
            <div className="ts-label">Model</div>
            <select className="ts-select" value={model} onChange={e => setModel(e.target.value)}>
              {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button className="ts-run" onClick={run} disabled={running}>
            {running ? <><span className="ts-spin" />Running…</> : '▶  Run Tool Call'}
          </button>
          {trace.length > 0 && !running && (
            <button className="ts-reset" onClick={() => setTrace([])}>↺  Reset</button>
          )}
        </aside>

        <main className="ts-main">
          <div className="ts-tabs">
            {(['trace', 'request', 'raw'] as const).map(t => (
              <button key={t} className={`ts-tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
                {t === 'trace' ? '⚡ Trace' : t === 'request' ? '📤 Request' : '{ } Raw'}
              </button>
            ))}
          </div>
          <div className="ts-body" ref={bodyRef}>
            {tab === 'trace' && (
              trace.length === 0
                ? <div className="ts-empty"><div className="ts-empty-ico">⚡</div><p>Configure a tool schema and hit <strong>Run Tool Call</strong> to watch the full API cycle play out</p></div>
                : <div className="ts-trace">{trace.map((item, i) => <TraceRow key={i} item={item} />)}</div>
            )}
            {tab === 'request' && <pre className="ts-pre">{reqJson}</pre>}
            {tab === 'raw' && (
              <pre className="ts-pre">
                {trace.length === 0
                  ? '// Run a tool call to see the raw message structure'
                  : JSON.stringify(trace.filter(x => x.kind !== 'thinking' && x.kind !== 'done'), null, 2)
                }
              </pre>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function TraceRow({ item }: { item: TraceItem }) {
  if (item.kind === 'thinking') return (
    <div className="tr tr-dim">
      <div className="tr-dot" style={{ background: '#A78BFA' }} />
      <div className="tr-body">
        <span className="tr-role" style={{ color: '#A78BFA' }}>reasoning</span>
        <div className="tr-dots"><span /><span /><span /></div>
      </div>
    </div>
  );
  if (item.kind === 'user') return (
    <div className="tr">
      <div className="tr-dot" style={{ background: '#FF6B35' }} />
      <div className="tr-body">
        <span className="tr-role" style={{ color: '#FF6B35' }}>user</span>
        <div className="tr-bubble tr-user">{item.text}</div>
      </div>
    </div>
  );
  if (item.kind === 'tool_call') return (
    <div className="tr">
      <div className="tr-dot" style={{ background: '#F59E0B' }} />
      <div className="tr-body">
        <span className="tr-role" style={{ color: '#F59E0B' }}>tool_use</span>
        <pre className="tr-code tr-amber">{item.text}<span className="tr-cur" /></pre>
      </div>
    </div>
  );
  if (item.kind === 'tool_result') return (
    <div className="tr">
      <div className="tr-dot" style={{ background: '#34D399' }} />
      <div className="tr-body">
        <span className="tr-role" style={{ color: '#34D399' }}>tool_result</span>
        <pre className="tr-code tr-green">{item.text}</pre>
      </div>
    </div>
  );
  if (item.kind === 'assistant') return (
    <div className="tr">
      <div className="tr-dot" style={{ background: '#06B6D4' }} />
      <div className="tr-body">
        <span className="tr-role" style={{ color: '#06B6D4' }}>assistant</span>
        <div className="tr-bubble tr-asst">{item.text}{item.text !== undefined && <span className="tr-cur" />}</div>
      </div>
    </div>
  );
  if (item.kind === 'done') return (
    <div className="tr-done">
      <span className="tr-done-check">✓ Complete</span>
      <span className="tr-stat">In: {item.meta?.in} tok</span>
      <span className="tr-stat">Out: {item.meta?.out} tok</span>
      <span className="tr-stat">{item.meta?.ms}ms</span>
    </div>
  );
  return null;
}
