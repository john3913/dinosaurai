'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import '../rag.css';

const SAMPLE_DOC = `Constitutional AI (CAI) is an approach to training AI systems developed by Anthropic. The core idea is to make AI systems that are helpful, harmless, and honest by encoding a set of explicit principles into the training process itself.

The method works in two phases. In the supervised learning phase, the model is asked to critique and revise its own outputs according to a set of constitutional principles. This creates a dataset of revised responses that better reflect the desired values and behaviors.

In the reinforcement learning phase, an AI-generated feedback signal is used instead of human feedback. The model learns to prefer outputs that align with the constitutional principles over those that violate them. This reduces the need for extensive human labeling of harmful content.

Constitutional principles might include statements like "choose the response that is least likely to contain harmful or unethical content" or "select the response that is most honest and cares about the long-term wellbeing of the user." These principles guide both the critique and the preference modeling.

The approach has several advantages: it scales feedback efficiently, creates explicit and auditable values, and allows for principled iteration on model behavior without retraining from scratch. It represents a significant step toward AI systems that can be steered by human values in a transparent and systematic way.`;

const QUERY_PRESETS = [
  { label: 'Supervised learning phase', value: 'supervised learning phase critique revise' },
  { label: 'Reinforcement learning', value: 'reinforcement learning feedback signal preference' },
  { label: 'Constitutional principles', value: 'constitutional principles harmful honest values' },
  { label: 'Custom…', value: '' },
];

const EMBEDDING_MODELS = [
  { id: 'text-embedding-3-small', label: 'text-embedding-3-small', dims: '1536d' },
  { id: 'text-embedding-3-large', label: 'text-embedding-3-large', dims: '3072d' },
  { id: 'claude-embed-v1', label: 'claude-embed-v1', dims: '1024d' },
  { id: 'gecko-003', label: 'gecko-003', dims: '768d' },
];

interface Chunk { idx: number; text: string; tokens: number; score?: number; retrieved?: boolean; }

function estimateTokens(text: string): number {
  return Math.round(text.split(/\s+/).length * 1.3);
}

function chunkDoc(text: string, strategy: string, size: number, overlap: number): Chunk[] {
  const words = text.split(/\s+/);
  const chunks: Chunk[] = [];

  if (strategy === 'fixed') {
    let i = 0;
    while (i < words.length) {
      const end = Math.min(i + size, words.length);
      const chunkWords = words.slice(i, end);
      chunks.push({ idx: chunks.length, text: chunkWords.join(' '), tokens: estimateTokens(chunkWords.join(' ')) });
      i += Math.max(1, size - overlap);
    }
  } else if (strategy === 'recursive') {
    const sentences = text.split(/(?<=[.!?])\s+/);
    let current = '';
    let currentTokens = 0;
    for (const sentence of sentences) {
      const sentTokens = estimateTokens(sentence);
      if (currentTokens + sentTokens > size && current) {
        chunks.push({ idx: chunks.length, text: current.trim(), tokens: currentTokens });
        const overlapWords = current.split(/\s+/).slice(-overlap);
        current = overlapWords.join(' ') + ' ' + sentence;
        currentTokens = estimateTokens(current);
      } else {
        current += (current ? ' ' : '') + sentence;
        currentTokens += sentTokens;
      }
    }
    if (current.trim()) chunks.push({ idx: chunks.length, text: current.trim(), tokens: currentTokens });
  } else {
    // semantic: paragraph-based
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    for (const para of paragraphs) {
      chunks.push({ idx: chunks.length, text: para.trim(), tokens: estimateTokens(para) });
    }
  }

  return chunks;
}

function scoreChunk(chunk: Chunk, query: string): number {
  const qWords = new Set(query.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const cWords = chunk.text.toLowerCase().split(/\s+/);
  if (cWords.length === 0 || qWords.size === 0) return 0;
  let matches = 0;
  for (const w of cWords) {
    if (qWords.has(w)) matches++;
  }
  return Math.min(1, (matches / cWords.length) * 8);
}

export default function RAGPipeline() {
  const [docText, setDocText] = useState(SAMPLE_DOC);
  const [strategy, setStrategy] = useState('recursive');
  const [chunkSize, setChunkSize] = useState(80);
  const [overlap, setOverlap] = useState(10);
  const [embedModel, setEmbedModel] = useState('text-embedding-3-small');
  const [topK, setTopK] = useState(3);
  const [queryPreset, setQueryPreset] = useState(0);
  const [customQuery, setCustomQuery] = useState('');
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [retrieved, setRetrieved] = useState<Chunk[]>([]);
  const [phase, setPhase] = useState<'idle' | 'embedding' | 'done'>('idle');

  const activeQuery = queryPreset < QUERY_PRESETS.length - 1
    ? QUERY_PRESETS[queryPreset].value
    : customQuery;

  const runEmbed = useCallback(async () => {
    if (phase === 'embedding') return;
    setPhase('embedding');
    setRetrieved([]);

    const rawChunks = chunkDoc(docText, strategy, chunkSize, overlap);

    await new Promise(r => setTimeout(r, 900));

    const scored = rawChunks.map(c => ({ ...c, score: scoreChunk(c, activeQuery), retrieved: false }));
    const sortedByScore = [...scored].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const topChunks = sortedByScore.slice(0, topK);
    const topIds = new Set(topChunks.map(c => c.idx));

    const initialChunks = scored.map(c => ({ ...c, retrieved: false }));
    setChunks(initialChunks);

    for (let i = 0; i < scored.length; i++) {
      await new Promise(r => setTimeout(r, 280));
      setChunks(prev => prev.map((c, idx) => idx === i ? { ...c } : c));
    }

    for (let i = 0; i < topK; i++) {
      await new Promise(r => setTimeout(r, 280));
      setChunks(prev => prev.map(c => topIds.has(c.idx) ? { ...c, retrieved: true } : c));
      setRetrieved(topChunks.slice(0, i + 1));
    }

    setPhase('done');
  }, [phase, docText, strategy, chunkSize, overlap, topK, activeQuery]);

  const totalRetrievedTokens = retrieved.reduce((sum, c) => sum + c.tokens, 0);

  return (
    <div className="rag-root">
      <header className="rag-bar">
        <Link href="/agenticstudio" className="rag-bar-logo"><AgenticWordmark /></Link>
        <div className="rag-bar-sep" />
        <span className="rag-bar-title">RAG Pipeline</span>
        <div className="rag-bar-space" />
      </header>

      <div className="rag-layout">
        {/* LEFT */}
        <aside className="rag-aside">
          <div className="rag-field">
            <label className="rag-label">Document</label>
            <textarea className="rag-ta" value={docText} onChange={e => setDocText(e.target.value)} rows={7} />
          </div>

          <div className="rag-field">
            <label className="rag-label">Chunking Strategy</label>
            <div className="rag-pills">
              {['fixed', 'recursive', 'semantic'].map(s => (
                <button key={s} className={`rag-pill${strategy === s ? ' active' : ''}`} onClick={() => setStrategy(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="rag-field">
            <label className="rag-label">Chunk Size (tokens)</label>
            <div className="rag-slider-row">
              <input type="range" className="rag-slider" min={30} max={200} value={chunkSize} onChange={e => setChunkSize(+e.target.value)} />
              <span className="rag-slider-val">{chunkSize}</span>
            </div>
          </div>

          <div className="rag-field">
            <label className="rag-label">Overlap (tokens)</label>
            <div className="rag-slider-row">
              <input type="range" className="rag-slider" min={0} max={50} value={overlap} onChange={e => setOverlap(+e.target.value)} />
              <span className="rag-slider-val">{overlap}</span>
            </div>
          </div>

          <div className="rag-field">
            <label className="rag-label">Embedding Model</label>
            <select className="rag-select" value={embedModel} onChange={e => setEmbedModel(e.target.value)}>
              {EMBEDDING_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.label} ({m.dims})</option>
              ))}
            </select>
          </div>

          <div className="rag-field">
            <label className="rag-label">Top-K</label>
            <div className="rag-slider-row">
              <input type="range" className="rag-slider" min={1} max={6} value={topK} onChange={e => setTopK(+e.target.value)} />
              <span className="rag-slider-val">{topK}</span>
            </div>
          </div>

          <div className="rag-field">
            <label className="rag-label">Query</label>
            <select className="rag-select" value={queryPreset} onChange={e => setQueryPreset(+e.target.value)}>
              {QUERY_PRESETS.map((q, i) => (
                <option key={i} value={i}>{q.label}</option>
              ))}
            </select>
            {queryPreset === QUERY_PRESETS.length - 1 && (
              <input
                className="rag-query-input"
                placeholder="Enter custom query…"
                value={customQuery}
                onChange={e => setCustomQuery(e.target.value)}
              />
            )}
          </div>

          <button className="rag-run" onClick={runEmbed} disabled={phase === 'embedding'}>
            {phase === 'embedding' ? (
              <>Computing embeddings…</>
            ) : '▶ Embed & Retrieve'}
          </button>
        </aside>

        {/* CENTER */}
        <div className="rag-center">
          <div className="rag-center-head">
            <span className="rag-center-title">Chunk Index</span>
            {chunks.length > 0 && (
              <span className="rag-chunk-count">{chunks.length} chunks</span>
            )}
            {phase === 'embedding' && (
              <span className="rag-embed-status">
                Computing embeddings
                <span className="rag-embed-dots">
                  <span className="rag-embed-dot" />
                  <span className="rag-embed-dot" />
                  <span className="rag-embed-dot" />
                </span>
              </span>
            )}
          </div>
          <div className="rag-chunk-grid">
            {chunks.length === 0 && (
              <div style={{ gridColumn: '1 / -1', color: 'rgba(232,234,240,0.2)', fontSize: 13, textAlign: 'center', paddingTop: 48 }}>
                Configure settings and click ▶ Embed &amp; Retrieve
              </div>
            )}
            {chunks.map(chunk => (
              <div key={chunk.idx} className={`rag-chunk${chunk.retrieved ? ' retrieved' : ''}`}>
                <div className="rag-chunk-header">
                  <span className="rag-chunk-idx">#{chunk.idx}</span>
                  {chunk.retrieved && chunk.score !== undefined && (
                    <span className="rag-score-badge">{chunk.score.toFixed(3)}</span>
                  )}
                  <span className="rag-chunk-tokens">{chunk.tokens} tok</span>
                </div>
                <div className="rag-chunk-text">{chunk.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <aside className="rag-right">
          <div className="rag-right-title">Retrieved Context</div>
          {retrieved.length === 0 ? (
            <div className="rag-empty-right">No chunks retrieved yet</div>
          ) : (
            retrieved.map((chunk, i) => (
              <div key={chunk.idx} className="rag-retrieved-item">
                <div className="rag-retrieved-rank">
                  <span className="rag-rank-num">#{i + 1}</span>
                  <div className="rag-score-bar-bg">
                    <div className="rag-score-bar" style={{ width: `${(chunk.score ?? 0) * 100}%` }} />
                  </div>
                  <span className="rag-score-val">{(chunk.score ?? 0).toFixed(3)}</span>
                </div>
                <div className="rag-retrieved-text">{chunk.text}</div>
              </div>
            ))
          )}
          {retrieved.length > 0 && (
            <div className="rag-token-total">
              <div className="rag-token-total-label">Assembled context</div>
              <div className="rag-token-total-val">{totalRetrievedTokens}</div>
              <div className="rag-token-total-sub">total tokens</div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
