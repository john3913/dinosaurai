'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import '../reasoning.css';

const EXAMPLE_PROMPTS = [
  'Should we deploy this AI system to production?',
  'Is this approach to data privacy GDPR compliant?',
  'Should we migrate our monolith to microservices?',
];

interface NodeDef {
  id: string;
  x: number; y: number; w: number; h: number;
  label: string;
  type: 'root' | 'branch' | 'leaf' | 'dead' | 'synthesis';
  color: string;
  delay: number;
  parentId?: string;
}

const NODES: NodeDef[] = [
  { id: 'root',       x: 330, y: 20,  w: 200, h: 52, label: 'Deploy AI to production?',               type: 'root',      color: '#C084FC', delay: 0,    parentId: undefined },
  { id: 'b1',         x: 60,  y: 140, w: 200, h: 60, label: 'Safety & Alignment',                     type: 'branch',    color: '#FF6B35', delay: 400,  parentId: 'root' },
  { id: 'b2',         x: 330, y: 140, w: 200, h: 60, label: 'Performance',                             type: 'branch',    color: '#F59E0B', delay: 700,  parentId: 'root' },
  { id: 'b3',         x: 600, y: 140, w: 200, h: 60, label: 'Reliability',                             type: 'branch',    color: '#06B6D4', delay: 900,  parentId: 'root' },
  { id: 'l1a',        x: 0,   y: 270, w: 170, h: 56, label: 'Constitutional AI\nguidelines ✓',        type: 'leaf',      color: '#FF6B35', delay: 1100, parentId: 'b1' },
  { id: 'l1b',        x: 180, y: 270, w: 150, h: 56, label: 'Output monitoring\nrequired ✓',          type: 'leaf',      color: '#FF6B35', delay: 1300, parentId: 'b1' },
  { id: 'l2a',        x: 290, y: 270, w: 150, h: 56, label: 'Latency < 500ms ✓',                      type: 'leaf',      color: '#F59E0B', delay: 1500, parentId: 'b2' },
  { id: 'l2b',        x: 450, y: 270, w: 150, h: 56, label: 'Load testing\nincomplete ✗',             type: 'dead',      color: '#666',    delay: 1700, parentId: 'b2' },
  { id: 'l3a',        x: 560, y: 270, w: 155, h: 56, label: 'Failover\nstrategy ✓',                   type: 'leaf',      color: '#06B6D4', delay: 1900, parentId: 'b3' },
  { id: 'l3b',        x: 720, y: 270, w: 155, h: 56, label: 'Rate limit\nhandling ✓',                 type: 'leaf',      color: '#06B6D4', delay: 2100, parentId: 'b3' },
  { id: 'synthesis',  x: 280, y: 430, w: 300, h: 60, label: '→ Staged rollout: 5%→25%→100%\nMonitor 48h per stage', type: 'synthesis', color: '#34D399', delay: 2500, parentId: undefined },
];

const NODE_MAP = Object.fromEntries(NODES.map(n => [n.id, n]));

function nodeCenter(n: NodeDef) {
  return { cx: n.x + n.w / 2, cy: n.y + n.h / 2, top: n.y, bot: n.y + n.h, left: n.x + n.w / 2 };
}

interface EdgeDef {
  from: string; to: string; dashed?: boolean; color?: string; opacity?: number; width?: number;
}

const EDGES: EdgeDef[] = [
  { from: 'root', to: 'b1', opacity: 0.4 },
  { from: 'root', to: 'b2', opacity: 0.4 },
  { from: 'root', to: 'b3', opacity: 0.4 },
  { from: 'b1', to: 'l1a', opacity: 0.3 },
  { from: 'b1', to: 'l1b', opacity: 0.3 },
  { from: 'b2', to: 'l2a', opacity: 0.3 },
  { from: 'b2', to: 'l2b', opacity: 0.3 },
  { from: 'b3', to: 'l3a', opacity: 0.3 },
  { from: 'b3', to: 'l3b', opacity: 0.3 },
  // synthesis connections (dashed until synthesis appears)
  { from: 'b1', to: 'synthesis', dashed: true, color: '#34D399', opacity: 0.5, width: 1.5 },
  { from: 'b2', to: 'synthesis', dashed: true, color: '#34D399', opacity: 0.5, width: 1.5 },
  { from: 'b3', to: 'synthesis', dashed: true, color: '#34D399', opacity: 0.5, width: 1.5 },
];

function bezierPath(n1: NodeDef, n2: NodeDef): string {
  const x1 = n1.x + n1.w / 2;
  const y1 = n1.y + n1.h;
  const x2 = n2.x + n2.w / 2;
  const y2 = n2.y;
  const cy1 = y1 + (y2 - y1) * 0.45;
  const cy2 = y2 - (y2 - y1) * 0.45;
  return `M${x1},${y1} C${x1},${cy1} ${x2},${cy2} ${x2},${y2}`;
}

function getEdgeColor(edge: EdgeDef): string {
  if (edge.color) return edge.color;
  const fromNode = NODE_MAP[edge.from];
  return fromNode?.color ?? 'rgba(255,255,255,0.3)';
}

export default function ReasoningTrace() {
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPTS[0]);
  const [exampleIdx, setExampleIdx] = useState(0);
  const [extThinking, setExtThinking] = useState(true);
  const [budget, setBudget] = useState(8192);
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(new Set());
  const [synthesisSolid, setSynthesisSolid] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const startTimeRef = useRef(0);

  const think = useCallback(async () => {
    if (thinking) return;
    setThinking(true);
    setVisibleNodes(new Set());
    setSynthesisSolid(false);
    setTokensUsed(0);
    setElapsed(0);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 100) / 10);
      setTokensUsed(prev => Math.min(budget, prev + Math.floor(Math.random() * 180 + 60)));
    }, 200);

    for (const node of NODES) {
      await new Promise(r => setTimeout(r, node.delay - (NODES[NODES.indexOf(node) - 1]?.delay ?? 0)));
      setVisibleNodes(prev => new Set([...prev, node.id]));
      if (node.id === 'synthesis') {
        setSynthesisSolid(true);
      }
    }

    clearInterval(timerRef.current);
    setThinking(false);
  }, [thinking, budget]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  function handleExample(i: number) {
    setExampleIdx(i);
    setPrompt(EXAMPLE_PROMPTS[i]);
  }

  return (
    <div className="re-root">
      <header className="re-bar">
        <Link href="/agenticstudio" className="re-bar-logo"><AgenticWordmark /></Link>
        <div className="re-bar-sep" />
        <span className="re-bar-title">Reasoning Trace</span>
        <div className="re-bar-space" />
      </header>

      <div className="re-layout">
        {/* LEFT */}
        <aside className="re-sidebar">
          <div className="re-field">
            <label className="re-label">Example Prompts</label>
            <select className="re-select" value={exampleIdx} onChange={e => handleExample(+e.target.value)}>
              {EXAMPLE_PROMPTS.map((p, i) => <option key={i} value={i}>{p}</option>)}
            </select>
          </div>

          <div className="re-field">
            <label className="re-label">Prompt</label>
            <textarea className="re-ta" value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} />
          </div>

          <div className="re-field">
            <div className="re-toggle-row">
              <label className="re-toggle-wrap">
                <input type="checkbox" className="re-toggle-input" checked={extThinking} onChange={e => setExtThinking(e.target.checked)} />
                <span className="re-toggle-track" />
                <span className="re-toggle-thumb" />
              </label>
              <span className="re-toggle-label">Extended Thinking</span>
            </div>
          </div>

          <div className="re-field">
            <label className="re-label">Budget Tokens</label>
            <div className="re-slider-row">
              <input type="range" className="re-slider" min={1024} max={32768} step={1024} value={budget} onChange={e => setBudget(+e.target.value)} />
              <span className="re-slider-val">{(budget / 1024).toFixed(0)}K</span>
            </div>
          </div>

          <button className="re-think" onClick={think} disabled={thinking}>
            {thinking ? 'Thinking…' : '▶ Think'}
          </button>

          <div className="re-status">
            <div className="re-status-row">
              <span className="re-status-label">Tokens used</span>
              <span className="re-status-val">{tokensUsed.toLocaleString()}</span>
            </div>
            <div className="re-status-row">
              <span className="re-status-label">Time elapsed</span>
              <span className="re-status-val">{elapsed.toFixed(1)}s</span>
            </div>
            <div className="re-status-row">
              <span className="re-status-label">Nodes revealed</span>
              <span className="re-status-val">{visibleNodes.size} / {NODES.length}</span>
            </div>
          </div>
        </aside>

        {/* RIGHT TREE */}
        <div className="re-tree">
          <div className="re-tree-container">
            {/* SVG connections */}
            <svg className="re-svg" viewBox="0 0 880 540">
              {EDGES.map((edge, i) => {
                const fromNode = NODE_MAP[edge.from];
                const toNode = NODE_MAP[edge.to];
                if (!fromNode || !toNode) return null;
                const fromVisible = visibleNodes.has(edge.from);
                const toVisible = visibleNodes.has(edge.to);
                const show = fromVisible && toVisible;
                const isSynthesisEdge = edge.to === 'synthesis';
                const isDashed = isSynthesisEdge && !synthesisSolid;
                return (
                  <path
                    key={i}
                    d={bezierPath(fromNode, toNode)}
                    fill="none"
                    stroke={getEdgeColor(edge)}
                    strokeWidth={edge.width ?? 1.5}
                    strokeOpacity={show ? (edge.opacity ?? 0.35) : 0}
                    strokeDasharray={isDashed ? '5,4' : undefined}
                    style={{ transition: 'stroke-opacity 0.4s ease' }}
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            {NODES.map(node => {
              const visible = visibleNodes.has(node.id);
              const isSynthesis = node.type === 'synthesis';
              const isDead = node.type === 'dead';
              const isRoot = node.type === 'root';

              let className = 're-node';
              if (visible) className += ' re-node-visible';
              if (isRoot) className += ' re-node-root';
              if (node.type === 'branch') className += ' re-node-branch';
              if (node.type === 'leaf') className += ' re-node-leaf';
              if (isDead) className += ' re-node-dead';
              if (isSynthesis && visible) className += ' re-synthesis-glow';

              return (
                <div
                  key={node.id}
                  className={className}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.w,
                    minHeight: node.h,
                    borderLeftColor: isDead ? '#555' : node.color,
                  }}
                >
                  <span className="re-node-type-tag">{node.type}</span>
                  <span className="re-node-text" style={{ color: isDead ? 'rgba(232,234,240,0.35)' : undefined }}>
                    {node.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
