'use client';
import { useState } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import './templates.css';

type NodeType = 'input' | 'prompt' | 'tool' | 'condition' | 'subagent' | 'output';
interface TNode { id: string; type: NodeType; title: string; x: number; y: number; config: Record<string, string>; }
interface TEdge { id: string; from: string; to: string; }
interface Template {
  id: string; name: string; category: string; complexity: 1|2|3;
  desc: string; models: string[]; tags: string[]; color: string;
  nodes: TNode[]; edges: TEdge[];
}

const NODE_COLORS: Record<NodeType, string> = {
  input: '#06B6D4', prompt: '#FF6B35', tool: '#F59E0B',
  condition: '#A78BFA', subagent: '#34D399', output: '#F472B6',
};

const TEMPLATES: Template[] = [
  {
    id: 'research',   name: 'Research Assistant',    category: 'research', complexity: 3,
    desc: 'Multi-step pipeline: plans research strategy, searches the web, analyzes sources, and synthesizes a structured report with citations.',
    models: ['claude-opus-4-7', 'claude-sonnet-4-6'], tags: ['search', 'synthesis', 'report'], color: '#FF6B35',
    nodes: [
      { id: 'n1', type: 'input',  title: 'Research Task',    x:60,  y:220, config: { description: 'User provides a research topic.' } },
      { id: 'n2', type: 'prompt', title: 'Research Planner', x:330, y:110, config: { model: 'claude-opus-4-7', prompt: 'Analyze topic and plan research strategy.' } },
      { id: 'n3', type: 'tool',   title: 'Web Search',       x:330, y:330, config: { tool: 'brave_search' } },
      { id: 'n4', type: 'prompt', title: 'Source Analyzer',  x:600, y:220, config: { model: 'claude-sonnet-4-6', prompt: 'Analyze and rank sources by relevance.' } },
      { id: 'n5', type: 'prompt', title: 'Synthesizer',      x:870, y:220, config: { model: 'claude-opus-4-7', prompt: 'Synthesize findings into a structured report.' } },
      { id: 'n6', type: 'output', title: 'Research Report',  x:1140,y:220, config: { description: 'Structured report with citations.' } },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' }, { id: 'e2', from: 'n1', to: 'n3' },
      { id: 'e3', from: 'n2', to: 'n4' }, { id: 'e4', from: 'n3', to: 'n4' },
      { id: 'e5', from: 'n4', to: 'n5' }, { id: 'e6', from: 'n5', to: 'n6' },
    ],
  },
  {
    id: 'code-review', name: 'Code Reviewer',         category: 'coding', complexity: 2,
    desc: 'Dual-path review: parallel syntax and logic analysis, conditional routing based on severity, structured feedback report.',
    models: ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001'], tags: ['code', 'review', 'feedback'], color: '#F59E0B',
    nodes: [
      { id: 'n1', type: 'input',     title: 'Code Submission',  x:60,  y:220, config: { description: 'Code file or snippet to review.' } },
      { id: 'n2', type: 'prompt',    title: 'Syntax Analyzer',  x:330, y:110, config: { model: 'claude-sonnet-4-6', prompt: 'Check syntax, style, and formatting issues.' } },
      { id: 'n3', type: 'prompt',    title: 'Logic Reviewer',   x:330, y:330, config: { model: 'claude-sonnet-4-6', prompt: 'Identify logic errors and security issues.' } },
      { id: 'n4', type: 'condition', title: 'Has Issues?',       x:600, y:220, config: { description: 'Route based on issue severity.' } },
      { id: 'n5', type: 'prompt',    title: 'Feedback Writer',   x:870, y:220, config: { model: 'claude-haiku-4-5-20251001', prompt: 'Write clear, actionable review comments.' } },
      { id: 'n6', type: 'output',    title: 'Review Report',     x:1140,y:220, config: { description: 'Structured code review with line references.' } },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' }, { id: 'e2', from: 'n1', to: 'n3' },
      { id: 'e3', from: 'n2', to: 'n4' }, { id: 'e4', from: 'n3', to: 'n4' },
      { id: 'e5', from: 'n4', to: 'n5' }, { id: 'e6', from: 'n5', to: 'n6' },
    ],
  },
  {
    id: 'support',    name: 'Customer Support Bot',   category: 'support', complexity: 2,
    desc: 'Classifies incoming queries, searches a knowledge base, drafts empathetic responses, and escalates complex issues.',
    models: ['claude-sonnet-4-6'], tags: ['support', 'routing', 'kb'], color: '#06B6D4',
    nodes: [
      { id: 'n1', type: 'input',     title: 'Customer Query',   x:60,  y:220, config: { description: 'Incoming customer message.' } },
      { id: 'n2', type: 'condition', title: 'Topic Classifier', x:330, y:220, config: { description: 'Classify: billing / technical / general.' } },
      { id: 'n3', type: 'tool',      title: 'KB Search',        x:600, y:110, config: { tool: 'knowledge_base_search' } },
      { id: 'n4', type: 'prompt',    title: 'Response Drafter', x:870, y:220, config: { model: 'claude-sonnet-4-6', prompt: 'Draft a helpful, empathetic support response.' } },
      { id: 'n5', type: 'output',    title: 'Support Response', x:1140,y:220, config: { description: 'Final response sent to customer.' } },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' }, { id: 'e2', from: 'n2', to: 'n3' },
      { id: 'e3', from: 'n3', to: 'n4' }, { id: 'e4', from: 'n4', to: 'n5' },
    ],
  },
  {
    id: 'extractor',  name: 'Data Extractor',          category: 'data', complexity: 1,
    desc: 'Parses unstructured documents, maps to a target schema, validates field types, and returns clean structured JSON.',
    models: ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001'], tags: ['extraction', 'JSON', 'parsing'], color: '#A78BFA',
    nodes: [
      { id: 'n1', type: 'input',  title: 'Raw Document',    x:60,  y:220, config: { description: 'PDF, HTML, or plain text input.' } },
      { id: 'n2', type: 'prompt', title: 'Schema Mapper',   x:330, y:220, config: { model: 'claude-sonnet-4-6', prompt: 'Extract fields matching the target JSON schema.' } },
      { id: 'n3', type: 'prompt', title: 'Validator',       x:600, y:220, config: { model: 'claude-haiku-4-5-20251001', prompt: 'Validate extracted data against schema constraints.' } },
      { id: 'n4', type: 'output', title: 'Structured JSON', x:870, y:220, config: { description: 'Validated JSON output.' } },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' }, { id: 'e2', from: 'n2', to: 'n3' }, { id: 'e3', from: 'n3', to: 'n4' },
    ],
  },
  {
    id: 'content',    name: 'Content Creator',          category: 'creative', complexity: 2,
    desc: 'Plans a content outline, branches to a writer and a parallel editor, merges both passes for a polished final draft.',
    models: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'], tags: ['writing', 'editing', 'creative'], color: '#34D399',
    nodes: [
      { id: 'n1', type: 'input',  title: 'Topic & Brief',   x:60,  y:220, config: { description: 'Content topic, tone, and length target.' } },
      { id: 'n2', type: 'prompt', title: 'Outline Planner', x:330, y:220, config: { model: 'claude-opus-4-7', prompt: 'Create a detailed content outline with section headings.' } },
      { id: 'n3', type: 'prompt', title: 'Content Writer',  x:600, y:110, config: { model: 'claude-sonnet-4-6', prompt: 'Write the full content following the outline.' } },
      { id: 'n4', type: 'prompt', title: 'Editor',          x:600, y:330, config: { model: 'claude-haiku-4-5-20251001', prompt: 'Improve clarity, flow, and grammar.' } },
      { id: 'n5', type: 'output', title: 'Final Content',   x:870, y:220, config: { description: 'Polished, publication-ready content.' } },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' }, { id: 'e2', from: 'n2', to: 'n3' },
      { id: 'e3', from: 'n2', to: 'n4' }, { id: 'e4', from: 'n3', to: 'n5' }, { id: 'e5', from: 'n4', to: 'n5' },
    ],
  },
  {
    id: 'sql',        name: 'SQL Query Builder',        category: 'data', complexity: 1,
    desc: 'Fetches live schema, converts natural-language queries to optimized SQL with explanation, ready to run.',
    models: ['claude-opus-4-7'], tags: ['SQL', 'database', 'NL2SQL'], color: '#F472B6',
    nodes: [
      { id: 'n1', type: 'input',  title: 'Natural Language', x:60,  y:220, config: { description: 'Plain English database question.' } },
      { id: 'n2', type: 'tool',   title: 'Schema Fetcher',   x:330, y:220, config: { tool: 'db_schema_introspection' } },
      { id: 'n3', type: 'prompt', title: 'SQL Planner',      x:600, y:220, config: { model: 'claude-opus-4-7', prompt: 'Convert the NL query to optimized SQL using the schema.' } },
      { id: 'n4', type: 'output', title: 'SQL + Explanation', x:870, y:220, config: { description: 'Executable SQL with plain-English explanation.' } },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2' }, { id: 'e2', from: 'n2', to: 'n3' }, { id: 'e3', from: 'n3', to: 'n4' },
    ],
  },
];

const CATEGORIES = ['all', 'research', 'coding', 'support', 'data', 'creative'];

// Mini node graph for preview (scaled down)
function MiniGraph({ nodes, edges, color }: { nodes: TNode[]; edges: TEdge[]; color: string }) {
  const xs = nodes.map(n => n.x); const ys = nodes.map(n => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs) + 200;
  const minY = Math.min(...ys), maxY = Math.max(...ys) + 80;
  const W = maxX - minX, H = maxY - minY;
  const scale = Math.min(260 / W, 90 / H);
  const tx = (x: number) => (x - minX) * scale;
  const ty = (y: number) => (y - minY) * scale;
  const vW = W * scale, vH = H * scale;
  return (
    <svg viewBox={`0 0 ${vW} ${vH}`} className="tpl-mini-graph">
      {edges.map(e => {
        const from = nodes.find(n => n.id === e.from)!;
        const to = nodes.find(n => n.id === e.to)!;
        const x1 = tx(from.x) + 200*scale, y1 = ty(from.y) + 40*scale;
        const x2 = tx(to.x), y2 = ty(to.y) + 40*scale;
        const mx = (x1 + x2) / 2;
        return <path key={e.id} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
          stroke={color} strokeWidth="1" fill="none" opacity="0.5" />;
      })}
      {nodes.map(n => (
        <rect key={n.id} x={tx(n.x)} y={ty(n.y)} width={200*scale} height={80*scale}
          rx="3" fill={`${NODE_COLORS[n.type]}18`} stroke={NODE_COLORS[n.type]} strokeWidth="0.8" opacity="0.9" />
      ))}
    </svg>
  );
}

export default function TemplateLibrary() {
  const [cat, setCat] = useState('all');
  const [preview, setPreview] = useState<Template | null>(null);

  const filtered = cat === 'all' ? TEMPLATES : TEMPLATES.filter(t => t.category === cat);

  function openInBuilder(t: Template) {
    localStorage.setItem('agenticstudio-template', JSON.stringify({ nodes: t.nodes, edges: t.edges }));
    window.location.href = '/agenticstudio/app';
  }

  return (
    <div className="tpl-root">
      <header className="tpl-bar">
        <Link href="/agenticstudio" className="tpl-bar-logo"><AgenticWordmark /></Link>
        <div className="tpl-bar-sep" />
        <span className="tpl-bar-title">Template Library</span>
        <div className="tpl-bar-space" />
        <span className="tpl-count">{TEMPLATES.length} templates</span>
      </header>

      {/* Filters */}
      <div className="tpl-filters">
        {CATEGORIES.map(c => (
          <button key={c} className={`tpl-filter${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="tpl-grid">
        {filtered.map(t => (
          <div key={t.id} className="tpl-card" onClick={() => setPreview(t)} style={{ ['--tc' as string]: t.color }}>
            <div className="tpl-card-header">
              <div className="tpl-card-dot" style={{ background: t.color }} />
              <span className="tpl-card-cat">{t.category}</span>
              <span className="tpl-card-complexity">
                {Array.from({ length: 3 }, (_, i) => (
                  <span key={i} className={`tpl-dot-c${i < t.complexity ? ' on' : ''}`} style={i < t.complexity ? { background: t.color } : {}} />
                ))}
              </span>
            </div>
            <div className="tpl-card-name">{t.name}</div>
            <div className="tpl-card-desc">{t.desc}</div>
            <MiniGraph nodes={t.nodes} edges={t.edges} color={t.color} />
            <div className="tpl-card-tags">
              {t.tags.map(tag => <span key={tag} className="tpl-tag" style={{ color: t.color, borderColor: `${t.color}40` }}>{tag}</span>)}
            </div>
            <div className="tpl-card-models">
              {t.models.map(m => <span key={m} className="tpl-model">{m.split('-').slice(0,2).join('-')}</span>)}
            </div>
          </div>
        ))}
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="tpl-modal-bg" onClick={() => setPreview(null)}>
          <div className="tpl-modal" onClick={e => e.stopPropagation()}>
            <button className="tpl-modal-close" onClick={() => setPreview(null)}>×</button>
            <div className="tpl-modal-header">
              <div className="tpl-modal-dot" style={{ background: preview.color }} />
              <span className="tpl-modal-name">{preview.name}</span>
            </div>
            <p className="tpl-modal-desc">{preview.desc}</p>
            <div className="tpl-modal-graph">
              <MiniGraph nodes={preview.nodes} edges={preview.edges} color={preview.color} />
            </div>
            <div className="tpl-modal-meta">
              <span>{preview.nodes.length} nodes · {preview.edges.length} edges</span>
              <span>{preview.models.length} model{preview.models.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="tpl-modal-models">
              {preview.models.map(m => <span key={m} className="tpl-model">{m}</span>)}
            </div>
            <button className="tpl-open-btn" style={{ background: preview.color }} onClick={() => openInBuilder(preview)}>
              Open in Agent Builder →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
