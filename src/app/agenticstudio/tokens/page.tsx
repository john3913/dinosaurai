'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import '../ti.css';

const SAMPLE_TEXT = 'The Constitutional AI approach uses a set of principles to guide model behavior. Each principle represents a constraint on acceptable outputs.';

const TOKEN_COLORS = [
  { bg: '#FF6B3520', border: '#FF6B3540', text: '#FF6B35CC' },
  { bg: '#F59E0B20', border: '#F59E0B40', text: '#F59E0BCC' },
  { bg: '#06B6D420', border: '#06B6D440', text: '#06B6D4CC' },
  { bg: '#34D39920', border: '#34D39940', text: '#34D399CC' },
  { bg: '#A78BFA20', border: '#A78BFA40', text: '#A78BFACC' },
  { bg: '#F472B620', border: '#F472B640', text: '#F472B6CC' },
  { bg: '#FB923C20', border: '#FB923C40', text: '#FB923CCC' },
  { bg: '#38BDF820', border: '#38BDF840', text: '#38BDF8CC' },
  { bg: '#FACC1520', border: '#FACC1540', text: '#FACC15CC' },
  { bg: '#4ADE8020', border: '#4ADE8040', text: '#4ADE80CC' },
];

interface Token { text: string; displayText: string; idx: number; colorIdx: number; }

function tokenize(text: string): Token[] {
  const matches = text.match(/( ?[\w']+| ?[^\s\w]|\n)/g) ?? [];
  return matches.map((tok, i) => {
    let display = tok;
    if (tok.startsWith(' ')) display = '·' + tok.slice(1);
    if (tok === '\n') display = '↵\n';
    return { text: tok, displayText: display, idx: i, colorIdx: i % TOKEN_COLORS.length };
  });
}

function toUtf8Hex(s: string): string {
  const enc = new TextEncoder();
  const bytes = enc.encode(s.replace(/^·/, ' ').replace('↵\n', '\n'));
  return Array.from(bytes).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).slice(0, 4).join(' ');
}

const MODELS = [
  { name: 'claude-sonnet-4-6', multiplier: 1.00 },
  { name: 'gpt-4o',            multiplier: 0.97 },
  { name: 'gemini-2.0-flash',  multiplier: 1.03 },
  { name: 'llama-3.1-70b',     multiplier: 0.99 },
];

export default function TokenInspector() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const tokens = useMemo(() => tokenize(text), [text]);

  const baseCount = tokens.length;
  const uniqueTokens = new Set(tokens.map(t => t.text)).size;
  const avgLen = baseCount > 0 ? (tokens.reduce((s, t) => s + t.text.replace(/^·/, ' ').length, 0) / baseCount) : 0;
  const compressionRatio = baseCount > 0 ? (text.length / baseCount) : 0;
  const specialCount = tokens.filter(t => /^[^a-zA-Z0-9·]+$/.test(t.displayText.trim())).length;

  const modelCounts = MODELS.map(m => ({
    ...m,
    count: Math.round(baseCount * m.multiplier),
  }));
  const maxCount = Math.max(...modelCounts.map(m => m.count), 1);

  const hoveredToken = hoveredIdx !== null ? tokens[hoveredIdx] : null;

  return (
    <div className="ti-root">
      <header className="ti-bar">
        <Link href="/agenticstudio" className="ti-bar-logo"><AgenticWordmark /></Link>
        <div className="ti-bar-sep" />
        <span className="ti-bar-title">Token Inspector</span>
        <div className="ti-bar-space" />
      </header>

      <div className="ti-layout">
        {/* TOP TEXTAREA */}
        <div className="ti-top">
          <textarea
            className="ti-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Enter text to tokenize…"
            rows={3}
          />
        </div>

        <div className="ti-body">
          {/* CENTER TOKEN DISPLAY */}
          <div className="ti-main">
            <div className="ti-main-head">Token Visualization — {baseCount} tokens</div>
            <div className="ti-tokens">
              {tokens.map(tok => {
                const c = TOKEN_COLORS[tok.colorIdx];
                const isHovered = hoveredIdx === tok.idx;
                return (
                  <span
                    key={tok.idx}
                    className="ti-token"
                    onMouseEnter={() => setHoveredIdx(tok.idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {isHovered && (
                      <span className="ti-tooltip">
                        Token #{tok.idx} · {tok.text.replace(/^·/, ' ').length} chars<br />
                        UTF-8: {toUtf8Hex(tok.displayText)}
                      </span>
                    )}
                    <span
                      className="ti-pill"
                      style={{
                        background: isHovered ? c.border : c.bg,
                        borderColor: c.border,
                        color: c.text,
                      }}
                    >
                      {tok.displayText}
                    </span>
                    <span className="ti-token-idx">{tok.idx}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="ti-sidebar">
            <div className="ti-stat-group">
              <div className="ti-stat-title">Statistics</div>
              <div className="ti-stat">
                <span className="ti-stat-label">Total tokens</span>
                <span className="ti-stat-val">{baseCount}</span>
              </div>
              <div className="ti-stat">
                <span className="ti-stat-label">Unique tokens</span>
                <span className="ti-stat-val">{uniqueTokens}</span>
              </div>
              <div className="ti-stat">
                <span className="ti-stat-label">Avg token length</span>
                <span className="ti-stat-val">{avgLen.toFixed(2)}</span>
              </div>
              <div className="ti-stat">
                <span className="ti-stat-label">Compression ratio</span>
                <span className="ti-stat-val">{compressionRatio.toFixed(2)}</span>
              </div>
              <div className="ti-stat">
                <span className="ti-stat-label">Special tokens</span>
                <span className="ti-stat-val">{specialCount}</span>
              </div>
            </div>

            <div className="ti-stat-group">
              <div className="ti-stat-title">Model Comparison</div>
              {modelCounts.map(m => (
                <div key={m.name} className="ti-model-row">
                  <span className="ti-model-name">{m.name}</span>
                  <span className="ti-model-count">{m.count}</span>
                  <div className="ti-model-bar-bg">
                    <div className="ti-model-bar" style={{ width: `${(m.count / maxCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {hoveredToken && (
              <div className="ti-stat-group">
                <div className="ti-stat-title">Selected Token</div>
                <div className="ti-stat">
                  <span className="ti-stat-label">Index</span>
                  <span className="ti-stat-val">#{hoveredToken.idx}</span>
                </div>
                <div className="ti-stat">
                  <span className="ti-stat-label">Text</span>
                  <span className="ti-stat-val" style={{ fontSize: 12 }}>&quot;{hoveredToken.text}&quot;</span>
                </div>
                <div className="ti-stat">
                  <span className="ti-stat-label">Chars</span>
                  <span className="ti-stat-val">{hoveredToken.text.replace(/^·/, ' ').length}</span>
                </div>
                <div className="ti-stat" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <span className="ti-stat-label">UTF-8</span>
                  <span className="ti-stat-val" style={{ fontSize: 10 }}>{toUtf8Hex(hoveredToken.displayText)}</span>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
