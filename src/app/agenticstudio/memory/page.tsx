'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import './memory.css';

interface CtxMsg { id: string; role: 'system' | 'user' | 'assistant'; content: string; }

const SAMPLE_CONTEXT: CtxMsg[] = [
  { id: 's', role: 'system', content: 'You are an expert research assistant specializing in machine learning and AI systems. You provide detailed, technically accurate explanations with code examples where appropriate. When asked about recent developments, acknowledge your knowledge cutoff and focus on fundamental principles that remain stable. Always cite tradeoffs and nuance rather than presenting any approach as universally correct.' },
  { id: 'u1', role: 'user', content: 'Can you explain the difference between encoder-only and decoder-only transformer architectures?' },
  { id: 'a1', role: 'assistant', content: 'Great question. The distinction comes down to how the model processes and attends to its input.\n\n**Encoder-only models** (BERT, RoBERTa) read the entire input simultaneously. Every token can attend to every other token bidirectionally. This makes them excellent at understanding and classification tasks — sentiment analysis, named entity recognition, question answering where the answer is in the text. They produce rich contextual embeddings but cannot generate new text autoregressively.\n\n**Decoder-only models** (GPT family, Claude, Llama) use causal masking: each token can only attend to previous tokens. This constraint enables autoregressive generation — predicting the next token, appending it, and repeating. The tradeoff is that they see only left context during training, which was initially thought to be a weakness, but scale has largely overcome this.\n\n**Encoder-decoder models** (T5, BART) combine both: an encoder builds a rich representation of the input, then a decoder generates output token-by-token while cross-attending to the encoder output. This architecture dominates in translation and summarization where input and output are distinct sequences.' },
  { id: 'u2', role: 'user', content: 'Why did decoder-only models win out for large-scale language modeling despite the apparent disadvantage of unidirectional attention?' },
  { id: 'a2', role: 'assistant', content: 'This is one of the more interesting empirical surprises in recent ML history. A few factors converged:\n\n**1. Simplicity scales better.** Decoder-only training is a single objective — predict the next token — applied uniformly across all data. No special masking strategies like BERT\'s MLM, no separate encoder-decoder coupling to tune. This simplicity made it easier to scale to trillions of tokens without architectural instability.\n\n**2. In-context learning emerges from autoregression.** The next-token objective naturally learns to condition on demonstrations in the context window. When you put "Question: X, Answer: Y, Question: Z, Answer:" in a decoder\'s context, it has seen this pattern during training across the internet. Bidirectional encoders don\'t develop this capability as naturally.\n\n**3. The unidirectionality disadvantage is smaller than it appears.** While BERT can see future tokens during pretraining, at inference time in generative tasks it cannot — so the gap narrows. For understanding tasks, fine-tuned encoder models still often win on benchmarks, but fine-tuning is increasingly impractical at scale.\n\n**4. Unified interface.** A single decoder model can do generation, classification (answer: "positive"/"negative"), extraction, translation, and reasoning — all with the same interface. This versatility made decoder-only the obvious choice for foundation models.' },
  { id: 'u3', role: 'user', content: 'What about mixture-of-experts (MoE) architectures? How do they fit into this picture?' },
];

const CONTEXT_LIMITS = [
  { id: 'claude-200k',  label: 'Claude 3.5/4 (200K)', limit: 200000, color: '#FF6B35' },
  { id: 'gpt4o-128k',   label: 'GPT-4o (128K)',        limit: 128000, color: '#A78BFA' },
  { id: 'gemini-1m',    label: 'Gemini 2.0 (1M)',       limit: 1000000, color: '#34D399' },
  { id: 'haiku-200k',   label: 'Claude Haiku (200K)',   limit: 200000, color: '#06B6D4' },
];

const ROLE_COLORS: Record<string, string> = {
  system: '#A78BFA',
  user: '#FF6B35',
  assistant: '#06B6D4',
};
const ROLE_BG: Record<string, string> = {
  system: 'rgba(167,139,250,0.12)',
  user: 'rgba(255,107,53,0.10)',
  assistant: 'rgba(6,182,212,0.08)',
};

function estimateTokens(text: string): number {
  return Math.max(1, Math.round(text.split(/\s+/).length * 1.35));
}

export default function MemoryContextManager() {
  const [messages, setMessages] = useState<CtxMsg[]>(SAMPLE_CONTEXT);
  const [limitId, setLimitId] = useState('claude-200k');
  const [selected, setSelected] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<'user' | 'assistant'>('user');
  const [newContent, setNewContent] = useState('');
  const [adding, setAdding] = useState(false);

  const limit = CONTEXT_LIMITS.find(l => l.id === limitId) ?? CONTEXT_LIMITS[0];

  const msgTokens = useMemo(() =>
    messages.map(m => ({ ...m, tokens: estimateTokens(m.content) })),
    [messages]);

  const totalTokens = msgTokens.reduce((s, m) => s + m.tokens, 0);
  const utilPct = Math.min(100, (totalTokens / limit.limit) * 100);

  const selectedMsg = selected ? msgTokens.find(m => m.id === selected) : null;

  function removeMsg(id: string) {
    setMessages(m => m.filter(x => x.id !== id));
    if (selected === id) setSelected(null);
  }

  function addMsg() {
    if (!newContent.trim()) return;
    setMessages(m => [...m, { id: Math.random().toString(36).slice(2), role: newRole, content: newContent.trim() }]);
    setNewContent('');
    setAdding(false);
  }

  const warnings = useMemo(() => {
    const w: string[] = [];
    if (utilPct > 90) w.push('Context is almost full — responses may be truncated');
    if (utilPct > 75) w.push('Consider summarizing older turns to free context budget');
    const sysToks = msgTokens.find(m => m.role === 'system')?.tokens ?? 0;
    if (sysToks > 500) w.push(`System prompt uses ${sysToks} tokens — consider trimming`);
    return w;
  }, [utilPct, msgTokens]);

  return (
    <div className="mm-root">
      <header className="mm-bar">
        <Link href="/agenticstudio" className="mm-bar-logo"><AgenticWordmark /></Link>
        <div className="mm-bar-sep" />
        <span className="mm-bar-title">Memory & Context Manager</span>
        <div className="mm-bar-space" />
        <select className="mm-limit-sel" value={limitId} onChange={e => setLimitId(e.target.value)}>
          {CONTEXT_LIMITS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </header>

      {/* Token bar */}
      <div className="mm-bar-wrap">
        <div className="mm-bar-label">
          <span>Context Window</span>
          <span className="mm-bar-nums">
            <strong style={{ color: utilPct > 90 ? '#F472B6' : utilPct > 75 ? '#F59E0B' : '#34D399' }}>{totalTokens.toLocaleString()}</strong>
            {' / '}{limit.limit.toLocaleString()} tokens
            <span className="mm-bar-pct" style={{ color: limit.color }}>{utilPct.toFixed(1)}%</span>
          </span>
        </div>
        <div className="mm-token-bar">
          {msgTokens.map(m => (
            <div
              key={m.id}
              className={`mm-seg${selected === m.id ? ' mm-seg-sel' : ''}`}
              style={{
                width: `${(m.tokens / limit.limit) * 100}%`,
                minWidth: 3,
                background: ROLE_COLORS[m.role],
                opacity: selected && selected !== m.id ? 0.4 : 1,
              }}
              onClick={() => setSelected(selected === m.id ? null : m.id)}
              title={`${m.role}: ${m.tokens} tokens`}
            />
          ))}
          <div className="mm-seg-free" style={{ flex: 1 }} />
        </div>
        <div className="mm-bar-legend">
          {(['system', 'user', 'assistant'] as const).map(r => (
            <span key={r} className="mm-legend-item">
              <span className="mm-legend-dot" style={{ background: ROLE_COLORS[r] }} />{r}
            </span>
          ))}
          <span className="mm-legend-item"><span className="mm-legend-dot mm-legend-free" />available</span>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mm-warnings">
          {warnings.map((w, i) => <div key={i} className="mm-warning">⚠ {w}</div>)}
        </div>
      )}

      <div className="mm-layout">
        {/* Message list */}
        <div className="mm-messages">
          {msgTokens.map(m => (
            <div key={m.id} className={`mm-msg${selected === m.id ? ' mm-msg-sel' : ''}`}
              style={{ borderColor: selected === m.id ? ROLE_COLORS[m.role] : undefined }}
              onClick={() => setSelected(selected === m.id ? null : m.id)}>
              <div className="mm-msg-header">
                <span className="mm-msg-role" style={{ color: ROLE_COLORS[m.role] }}>{m.role}</span>
                <span className="mm-msg-toks">{m.tokens} tok</span>
                <button className="mm-msg-del" onClick={e => { e.stopPropagation(); removeMsg(m.id); }}>×</button>
              </div>
              <div className="mm-msg-preview">{m.content.slice(0, 120)}{m.content.length > 120 ? '…' : ''}</div>
            </div>
          ))}

          {adding ? (
            <div className="mm-add-form">
              <select className="mm-add-role" value={newRole} onChange={e => setNewRole(e.target.value as 'user' | 'assistant')}>
                <option value="user">user</option>
                <option value="assistant">assistant</option>
              </select>
              <textarea className="mm-add-ta" value={newContent} onChange={e => setNewContent(e.target.value)}
                placeholder="Message content…" rows={4} autoFocus />
              <div className="mm-add-actions">
                <button className="mm-add-submit" onClick={addMsg}>Add Message</button>
                <button className="mm-add-cancel" onClick={() => { setAdding(false); setNewContent(''); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="mm-add-btn" onClick={() => setAdding(true)}>+ Add Message</button>
          )}
        </div>

        {/* Stats + selected detail */}
        <aside className="mm-stats">
          <div className="mm-stats-title">Breakdown</div>
          {(['system', 'user', 'assistant'] as const).map(role => {
            const toks = msgTokens.filter(m => m.role === role).reduce((s, m) => s + m.tokens, 0);
            const pct = totalTokens > 0 ? toks / totalTokens * 100 : 0;
            return (
              <div key={role} className="mm-stat-row">
                <span className="mm-stat-role" style={{ color: ROLE_COLORS[role] }}>{role}</span>
                <div className="mm-stat-bar-wrap">
                  <div className="mm-stat-bar" style={{ width: `${pct}%`, background: ROLE_COLORS[role] }} />
                </div>
                <span className="mm-stat-val">{toks.toLocaleString()}</span>
              </div>
            );
          })}

          <div className="mm-stat-divider" />

          <div className="mm-stat-summary">
            <div className="mm-stat-kv"><span>Messages</span><span>{messages.length}</span></div>
            <div className="mm-stat-kv"><span>Total tokens</span><span>{totalTokens.toLocaleString()}</span></div>
            <div className="mm-stat-kv"><span>Remaining</span><span style={{ color: '#34D399' }}>{(limit.limit - totalTokens).toLocaleString()}</span></div>
            <div className="mm-stat-kv"><span>Utilization</span><span style={{ color: utilPct > 75 ? '#F59E0B' : '#34D399' }}>{utilPct.toFixed(1)}%</span></div>
          </div>

          {selectedMsg && (
            <>
              <div className="mm-stat-divider" />
              <div className="mm-selected-header">
                <span style={{ color: ROLE_COLORS[selectedMsg.role] }}>{selectedMsg.role}</span>
                <span>{selectedMsg.tokens} tokens · {selectedMsg.content.split(' ').length} words</span>
              </div>
              <div className="mm-selected-content" style={{ background: ROLE_BG[selectedMsg.role], borderColor: ROLE_COLORS[selectedMsg.role] }}>
                {selectedMsg.content}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
