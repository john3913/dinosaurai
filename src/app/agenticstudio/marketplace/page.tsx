'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import './marketplace.css';

type NodeType = 'input' | 'prompt' | 'tool' | 'condition' | 'subagent' | 'output';
interface MNode { id: string; type: NodeType; title: string; x: number; y: number; config: Record<string, string>; }
interface MEdge { id: string; from: string; to: string; }
interface Agent {
  id: string; name: string; cat: string; complexity: 1|2|3; color: string;
  desc: string; models: string[]; tags: string[]; rating: number; installs: number;
  nodes: MNode[]; edges: MEdge[];
}

const NODE_COLORS: Record<NodeType, string> = {
  input: '#06B6D4', prompt: '#FF6B35', tool: '#F59E0B',
  condition: '#A78BFA', subagent: '#34D399', output: '#F472B6',
};

const CATEGORIES = ['All', 'Research', 'Coding', 'Support', 'Data', 'Creative', 'Finance', 'Legal'];

const AGENTS: Agent[] = [
  { id:'arxiv', name:'ArXiv Research Bot', cat:'Research', complexity:3, color:'#FF6B35',
    desc:'Searches arXiv for papers, extracts key findings, synthesizes literature reviews with citations and relevance rankings.',
    models:['claude-opus-4-7','claude-sonnet-4-6'], tags:['search','synthesis','academic'], rating:4.9, installs:12400,
    nodes:[{id:'n1',type:'input',title:'Research Topic',x:60,y:220,config:{}},{id:'n2',type:'tool',title:'arXiv Search',x:330,y:220,config:{tool:'arxiv_search'}},{id:'n3',type:'prompt',title:'Synthesizer',x:600,y:220,config:{model:'claude-opus-4-7'}},{id:'n4',type:'output',title:'Literature Review',x:870,y:220,config:{}}],
    edges:[{id:'e1',from:'n1',to:'n2'},{id:'e2',from:'n2',to:'n3'},{id:'e3',from:'n3',to:'n4'}] },
  { id:'sql', name:'SQL Whisperer', cat:'Data', complexity:2, color:'#06B6D4',
    desc:'Converts natural-language questions to optimized SQL queries. Fetches live schema, explains query logic, handles JOINs and aggregations.',
    models:['claude-opus-4-7'], tags:['SQL','NL2SQL','database'], rating:4.7, installs:8200,
    nodes:[{id:'n1',type:'input',title:'NL Question',x:60,y:220,config:{}},{id:'n2',type:'tool',title:'Schema Fetch',x:330,y:220,config:{tool:'db_schema'}},{id:'n3',type:'prompt',title:'SQL Planner',x:600,y:220,config:{model:'claude-opus-4-7'}},{id:'n4',type:'output',title:'SQL + Explanation',x:870,y:220,config:{}}],
    edges:[{id:'e1',from:'n1',to:'n2'},{id:'e2',from:'n2',to:'n3'},{id:'e3',from:'n3',to:'n4'}] },
  { id:'review', name:'Code Review Pro', cat:'Coding', complexity:3, color:'#F59E0B',
    desc:'Multi-pass code analysis: syntax + style, logic errors, security vulnerabilities. Parallel analysis paths merge into a prioritized review report.',
    models:['claude-sonnet-4-6','claude-haiku-4-5-20251001'], tags:['code','security','review'], rating:4.8, installs:15600,
    nodes:[{id:'n1',type:'input',title:'Code File',x:60,y:220,config:{}},{id:'n2',type:'prompt',title:'Syntax Check',x:330,y:110,config:{model:'claude-sonnet-4-6'}},{id:'n3',type:'prompt',title:'Logic Review',x:330,y:330,config:{model:'claude-sonnet-4-6'}},{id:'n4',type:'condition',title:'Merge Results',x:600,y:220,config:{}},{id:'n5',type:'output',title:'Review Report',x:870,y:220,config:{}}],
    edges:[{id:'e1',from:'n1',to:'n2'},{id:'e2',from:'n1',to:'n3'},{id:'e3',from:'n2',to:'n4'},{id:'e4',from:'n3',to:'n4'},{id:'e5',from:'n4',to:'n5'}] },
  { id:'support', name:'Customer Success Bot', cat:'Support', complexity:2, color:'#34D399',
    desc:'Classifies incoming queries, retrieves relevant KB articles, drafts empathetic responses, escalates complex issues to human agents.',
    models:['claude-sonnet-4-6'], tags:['support','KB','routing'], rating:4.6, installs:22100,
    nodes:[{id:'n1',type:'input',title:'Customer Query',x:60,y:220,config:{}},{id:'n2',type:'condition',title:'Classifier',x:330,y:220,config:{}},{id:'n3',type:'tool',title:'KB Search',x:600,y:110,config:{tool:'kb_search'}},{id:'n4',type:'prompt',title:'Response Draft',x:600,y:330,config:{model:'claude-sonnet-4-6'}},{id:'n5',type:'output',title:'Response',x:870,y:220,config:{}}],
    edges:[{id:'e1',from:'n1',to:'n2'},{id:'e2',from:'n2',to:'n3'},{id:'e3',from:'n2',to:'n4'},{id:'e4',from:'n3',to:'n4'},{id:'e5',from:'n4',to:'n5'}] },
  { id:'legal', name:'Legal Document Parser', cat:'Legal', complexity:3, color:'#A78BFA',
    desc:'Extracts key clauses, obligations, deadlines, and risk flags from contracts. Produces structured summaries with risk scores per section.',
    models:['claude-opus-4-7'], tags:['legal','contracts','risk'], rating:4.5, installs:3800,
    nodes:[{id:'n1',type:'input',title:'Contract PDF',x:60,y:220,config:{}},{id:'n2',type:'prompt',title:'Clause Extractor',x:330,y:220,config:{model:'claude-opus-4-7'}},{id:'n3',type:'prompt',title:'Risk Analyzer',x:600,y:220,config:{model:'claude-opus-4-7'}},{id:'n4',type:'output',title:'Risk Report',x:870,y:220,config:{}}],
    edges:[{id:'e1',from:'n1',to:'n2'},{id:'e2',from:'n2',to:'n3'},{id:'e3',from:'n3',to:'n4'}] },
  { id:'finance', name:'Financial Analyst', cat:'Finance', complexity:3, color:'#22C55E',
    desc:'Analyzes earnings reports and SEC filings. Extracts revenue trends, margin changes, forward guidance, and compares against analyst consensus.',
    models:['claude-opus-4-7','claude-sonnet-4-6'], tags:['finance','earnings','analysis'], rating:4.7, installs:5900,
    nodes:[{id:'n1',type:'input',title:'Earnings Report',x:60,y:220,config:{}},{id:'n2',type:'tool',title:'Market Data API',x:330,y:110,config:{tool:'market_data'}},{id:'n3',type:'prompt',title:'Analyst',x:330,y:330,config:{model:'claude-opus-4-7'}},{id:'n4',type:'prompt',title:'Report Writer',x:600,y:220,config:{model:'claude-sonnet-4-6'}},{id:'n5',type:'output',title:'Analysis',x:870,y:220,config:{}}],
    edges:[{id:'e1',from:'n1',to:'n2'},{id:'e2',from:'n1',to:'n3'},{id:'e3',from:'n2',to:'n4'},{id:'e4',from:'n3',to:'n4'},{id:'e5',from:'n4',to:'n5'}] },
  { id:'seo', name:'SEO Content Generator', cat:'Creative', complexity:2, color:'#F472B6',
    desc:'Researches target keywords, analyzes SERP competitors, generates long-form SEO-optimized articles with structured headings and internal linking suggestions.',
    models:['claude-sonnet-4-6','claude-haiku-4-5-20251001'], tags:['SEO','content','writing'], rating:4.4, installs:18300,
    nodes:[{id:'n1',type:'input',title:'Topic + Keywords',x:60,y:220,config:{}},{id:'n2',type:'tool',title:'SERP Research',x:330,y:220,config:{tool:'serp_api'}},{id:'n3',type:'prompt',title:'Content Writer',x:600,y:220,config:{model:'claude-sonnet-4-6'}},{id:'n4',type:'output',title:'Article',x:870,y:220,config:{}}],
    edges:[{id:'e1',from:'n1',to:'n2'},{id:'e2',from:'n2',to:'n3'},{id:'e3',from:'n3',to:'n4'}] },
  { id:'etl', name:'Data Pipeline Architect', cat:'Data', complexity:3, color:'#38BDF8',
    desc:'Designs end-to-end ETL pipelines from plain-English requirements. Outputs architecture diagrams, schema definitions, and dbt/Spark transformation code.',
    models:['claude-opus-4-7'], tags:['ETL','dbt','pipeline'], rating:4.8, installs:4200,
    nodes:[{id:'n1',type:'input',title:'Requirements',x:60,y:220,config:{}},{id:'n2',type:'prompt',title:'Architect',x:330,y:220,config:{model:'claude-opus-4-7'}},{id:'n3',type:'prompt',title:'Code Generator',x:600,y:220,config:{model:'claude-opus-4-7'}},{id:'n4',type:'output',title:'Pipeline + Code',x:870,y:220,config:{}}],
    edges:[{id:'e1',from:'n1',to:'n2'},{id:'e2',from:'n2',to:'n3'},{id:'e3',from:'n3',to:'n4'}] },
  { id:'meeting', name:'Meeting Summarizer', cat:'Research', complexity:1, color:'#FACC15',
    desc:'Transcribes meeting recordings, extracts action items with owners and deadlines, identifies decisions made, and formats a shareable summary.',
    models:['claude-haiku-4-5-20251001'], tags:['meeting','transcription','actions'], rating:4.9, installs:31200,
    nodes:[{id:'n1',type:'input',title:'Transcript',x:60,y:220,config:{}},{id:'n2',type:'prompt',title:'Summarizer',x:330,y:220,config:{model:'claude-haiku-4-5-20251001'}},{id:'n3',type:'output',title:'Summary + Actions',x:600,y:220,config:{}}],
    edges:[{id:'e1',from:'n1',to:'n2'},{id:'e2',from:'n2',to:'n3'}] },
  { id:'bug', name:'Bug Hunter', cat:'Coding', complexity:2, color:'#FB7185',
    desc:'Analyzes stack traces and error logs to identify root causes. Proposes minimal reproduction cases and suggests targeted fixes with explanations.',
    models:['claude-sonnet-4-6'], tags:['debugging','errors','fixes'], rating:4.6, installs:9700,
    nodes:[{id:'n1',type:'input',title:'Stack Trace',x:60,y:220,config:{}},{id:'n2',type:'prompt',title:'Bug Analyzer',x:330,y:220,config:{model:'claude-sonnet-4-6'}},{id:'n3',type:'prompt',title:'Fix Suggester',x:600,y:220,config:{model:'claude-sonnet-4-6'}},{id:'n4',type:'output',title:'Debug Report',x:870,y:220,config:{}}],
    edges:[{id:'e1',from:'n1',to:'n2'},{id:'e2',from:'n2',to:'n3'},{id:'e3',from:'n3',to:'n4'}] },
  { id:'pr', name:'PR Description Writer', cat:'Coding', complexity:1, color:'#4ADE80',
    desc:'Reads git diffs, understands code changes in context, and writes professional PR descriptions with summary, motivation, test plan, and breaking changes.',
    models:['claude-sonnet-4-6'], tags:['git','PR','documentation'], rating:4.5, installs:6800,
    nodes:[{id:'n1',type:'input',title:'Git Diff',x:60,y:220,config:{}},{id:'n2',type:'prompt',title:'PR Writer',x:330,y:220,config:{model:'claude-sonnet-4-6'}},{id:'n3',type:'output',title:'PR Description',x:600,y:220,config:{}}],
    edges:[{id:'e1',from:'n1',to:'n2'},{id:'e2',from:'n2',to:'n3'}] },
  { id:'translate', name:'Multilingual Translator', cat:'Creative', complexity:1, color:'#C084FC',
    desc:'Translates content across 40+ languages with cultural adaptation. Preserves tone, idioms, and brand voice. Flags culturally sensitive phrases.',
    models:['claude-haiku-4-5-20251001','claude-sonnet-4-6'], tags:['translation','i18n','localization'], rating:4.7, installs:14500,
    nodes:[{id:'n1',type:'input',title:'Source Text',x:60,y:220,config:{}},{id:'n2',type:'prompt',title:'Translator',x:330,y:220,config:{model:'claude-haiku-4-5-20251001'}},{id:'n3',type:'prompt',title:'Cultural Review',x:600,y:220,config:{model:'claude-sonnet-4-6'}},{id:'n4',type:'output',title:'Translated Text',x:870,y:220,config:{}}],
    edges:[{id:'e1',from:'n1',to:'n2'},{id:'e2',from:'n2',to:'n3'},{id:'e3',from:'n3',to:'n4'}] },
];

function formatInstalls(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K installs';
  return n + ' installs';
}

function MiniGraph({ nodes, edges, color }: { nodes: MNode[]; edges: MEdge[]; color: string }) {
  if (!nodes.length) return null;
  const xs = nodes.map(n => n.x); const ys = nodes.map(n => n.y);
  const minX = Math.min(...xs) - 40; const maxX = Math.max(...xs) + 140;
  const minY = Math.min(...ys) - 40; const maxY = Math.max(...ys) + 40;
  const W = maxX - minX; const H = maxY - minY;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  return (
    <svg viewBox={`${minX} ${minY} ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id={`mk-arr-${color.replace('#','')}`} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="rgba(255,255,255,0.25)" />
        </marker>
      </defs>
      {edges.map(e => {
        const f = nodeMap.get(e.from); const t = nodeMap.get(e.to);
        if (!f || !t) return null;
        const x1 = f.x + 70; const y1 = f.y + 18; const x2 = t.x; const y2 = t.y + 18;
        const cx = (x1 + x2) / 2;
        return <path key={e.id} d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none" markerEnd={`url(#mk-arr-${color.replace('#','')})`} />;
      })}
      {nodes.map(n => (
        <g key={n.id}>
          <rect x={n.x} y={n.y} width={120} height={36} rx={6} fill={NODE_COLORS[n.type] + '18'} stroke={NODE_COLORS[n.type]} strokeWidth="1" />
          <text x={n.x + 60} y={n.y + 22} textAnchor="middle" fill="#E8EAF0" fontSize="9" fontFamily="var(--font-inter-tight,sans-serif)">{n.title}</text>
        </g>
      ))}
    </svg>
  );
}

export default function MarketplacePage() {
  const [cat, setCat] = useState('All');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Agent | null>(null);
  const [installCounts, setInstallCounts] = useState<Record<string, number>>({});

  // Count-up animation
  useEffect(() => {
    const targets = Object.fromEntries(AGENTS.map(a => [a.id, a.installs]));
    const start = performance.now();
    const duration = 1200;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setInstallCounts(Object.fromEntries(Object.entries(targets).map(([id, val]) => [id, Math.round(val * eased)])));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return AGENTS.filter(a => {
      const matchCat = cat === 'All' || a.cat === cat;
      const matchQ = !q || [a.name, a.desc, ...a.tags].join(' ').toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [cat, query]);

  const openInBuilder = (agent: Agent) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('agenticstudio-template', JSON.stringify({ nodes: agent.nodes, edges: agent.edges }));
    }
    window.location.href = '/agenticstudio/app';
  };

  return (
    <div className="mk-root">
      {/* Nav */}
      <header className="mk-bar">
        <Link href="/agenticstudio" className="mk-bar-logo"><AgenticWordmark /></Link>
        <div className="mk-bar-sep" />
        <span className="mk-bar-title">Agent Marketplace</span>
        <div className="mk-bar-space" />
        <span className="mk-bar-count">{AGENTS.length} agents</span>
      </header>

      {/* Filter row */}
      <div className="mk-filter-row">
        <input
          className="mk-search"
          placeholder="Search agents..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="mk-pills">
          {CATEGORIES.map(c => (
            <button key={c} className={`mk-pill${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <main className="mk-grid">
        {filtered.length === 0 && <div className="mk-empty">No agents match your search.</div>}
        {filtered.map(agent => (
          <div
            key={agent.id}
            className="mk-card"
            style={{ '--mc': agent.color + '80' } as React.CSSProperties}
            onClick={() => setSelected(agent)}
          >
            <div className="mk-card-header">
              <div className="mk-card-dot" style={{ background: agent.color }} />
              <span className="mk-card-cat">{agent.cat}</span>
              <div className="mk-card-complexity" style={{ color: agent.color }}>
                {[1,2,3].map(i => <div key={i} className={`mk-dot-c${i <= agent.complexity ? ' on' : ''}`} style={i <= agent.complexity ? { background: agent.color } : {}} />)}
              </div>
            </div>
            <div className="mk-card-name">{agent.name}</div>
            <div className="mk-card-desc">{agent.desc}</div>
            <div className="mk-card-stats">
              <span className="mk-card-rating">★ {agent.rating.toFixed(1)}</span>
              <span className="mk-card-installs">{formatInstalls(installCounts[agent.id] ?? 0)}</span>
            </div>
            <div className="mk-card-models">
              {agent.models.map(m => <span key={m} className="mk-model">{m}</span>)}
            </div>
            <div className="mk-card-tags">
              {agent.tags.map(t => <span key={t} className="mk-tag">{t}</span>)}
            </div>
            <div className="mk-card-footer">
              <button
                className="mk-install-btn"
                style={{ background: agent.color, color: '#070A0F' }}
                onClick={e => { e.stopPropagation(); setSelected(agent); }}
              >Install</button>
            </div>
          </div>
        ))}
      </main>

      {/* Modal */}
      {selected && (
        <div className="mk-modal-bg" onClick={() => setSelected(null)}>
          <div className="mk-modal" onClick={e => e.stopPropagation()}>
            <button className="mk-modal-close" onClick={() => setSelected(null)}>✕</button>
            <div className="mk-modal-header">
              <div className="mk-modal-dot" style={{ background: selected.color }} />
              <div className="mk-modal-name">{selected.name}</div>
            </div>
            <div className="mk-modal-desc">{selected.desc}</div>
            <div className="mk-modal-stats">
              <span className="mk-modal-stat-rating">★ {selected.rating.toFixed(1)}</span>
              <span>{formatInstalls(selected.installs)}</span>
              <span>{selected.cat}</span>
            </div>
            <div>
              <div className="mk-modal-label" style={{ marginBottom: 8 }}>Models</div>
              <div className="mk-modal-models">
                {selected.models.map(m => <span key={m} className="mk-model">{m}</span>)}
              </div>
            </div>
            <div>
              <div className="mk-modal-label" style={{ marginBottom: 8 }}>Tags</div>
              <div className="mk-modal-tags">
                {selected.tags.map(t => <span key={t} className="mk-modal-tag">{t}</span>)}
              </div>
            </div>
            <div className="mk-modal-graph">
              <MiniGraph nodes={selected.nodes} edges={selected.edges} color={selected.color} />
            </div>
            <button
              className="mk-modal-open-btn"
              style={{ background: selected.color }}
              onClick={() => openInBuilder(selected)}
            >Open in Agent Builder</button>
          </div>
        </div>
      )}
    </div>
  );
}
