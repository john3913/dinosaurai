'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import './app.css';
import { AgenticWordmark } from '../Wordmark';

// ── Types ─────────────────────────────────────────────────────────────────────
type NodeType = 'input' | 'prompt' | 'tool' | 'condition' | 'subagent' | 'output';

interface AgentNode {
  id: string;
  type: NodeType;
  title: string;
  x: number;
  y: number;
  config: {
    model?: string;
    prompt?: string;
    tool?: string;
    description?: string;
  };
}

interface AgentEdge {
  id: string;
  from: string;
  to: string;
}

interface DrawState {
  fromId: string;
  fromX: number;
  fromY: number;
  mouseX: number;
  mouseY: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const NODE_W = 200;
const NODE_H = 80;

const NODE_META: Record<NodeType, { color: string; label: string; bgOpacity: string; desc: string }> = {
  input:     { color: '#06B6D4', label: 'Input',     bgOpacity: 'rgba(6,182,212,0.12)',   desc: 'Entry point — user message or task' },
  prompt:    { color: '#FF6B35', label: 'Prompt',    bgOpacity: 'rgba(255,107,53,0.12)',  desc: 'AI model call with system prompt' },
  tool:      { color: '#F59E0B', label: 'Tool',      bgOpacity: 'rgba(245,158,11,0.12)',  desc: 'External tool or API call' },
  condition: { color: '#A78BFA', label: 'Condition', bgOpacity: 'rgba(167,139,250,0.12)', desc: 'Branch logic — if / else routing' },
  subagent:  { color: '#34D399', label: 'Sub-agent', bgOpacity: 'rgba(52,211,153,0.12)',  desc: 'Delegate to another agent' },
  output:    { color: '#F472B6', label: 'Output',    bgOpacity: 'rgba(244,114,182,0.12)', desc: 'Final response or artifact' },
};

// ── Default workflow (Research Agent) ─────────────────────────────────────────
const INITIAL_NODES: AgentNode[] = [
  { id: 'n1', type: 'input',  title: 'Research Task',   x: 60,  y: 220, config: { description: 'User provides a research topic.' } },
  { id: 'n2', type: 'prompt', title: 'Research Agent',  x: 330, y: 110, config: { model: 'claude-sonnet-4-6', prompt: 'Analyze the topic and identify key areas to investigate.' } },
  { id: 'n3', type: 'tool',   title: 'Web Search',      x: 330, y: 330, config: { tool: 'brave_search', description: 'Fetches real-time search results.' } },
  { id: 'n4', type: 'prompt', title: 'Synthesizer',     x: 600, y: 220, config: { model: 'claude-opus-4-7', prompt: 'Synthesize findings into a structured report with citations.' } },
  { id: 'n5', type: 'output', title: 'Final Report',    x: 870, y: 220, config: { description: 'Structured research report delivered to user.' } },
];

const INITIAL_EDGES: AgentEdge[] = [
  { id: 'e1', from: 'n1', to: 'n2' },
  { id: 'e2', from: 'n1', to: 'n3' },
  { id: 'e3', from: 'n2', to: 'n4' },
  { id: 'e4', from: 'n3', to: 'n4' },
  { id: 'e5', from: 'n4', to: 'n5' },
];

// Execution steps: each step activates edges then nodes
const EXEC_STEPS = [
  { edgeIds: [],              nodeIds: ['n1'], label: 'Input received' },
  { edgeIds: ['e1', 'e2'],   nodeIds: ['n2', 'n3'], label: 'Agents dispatched in parallel' },
  { edgeIds: ['e3', 'e4'],   nodeIds: ['n4'], label: 'Synthesizing results' },
  { edgeIds: ['e5'],         nodeIds: ['n5'], label: 'Report generated' },
];

let nodeCounter = 6;

function uid() { return `n${nodeCounter++}`; }
function eid() { return `e${Date.now()}`; }

// ── Edge SVG ──────────────────────────────────────────────────────────────────
function EdgePath({
  nodes, edge, active, done,
}: {
  nodes: AgentNode[];
  edge: AgentEdge;
  active: boolean;
  done: boolean;
}) {
  const from = nodes.find(n => n.id === edge.from);
  const to   = nodes.find(n => n.id === edge.to);
  if (!from || !to) return null;

  const x1 = from.x + NODE_W;
  const y1 = from.y + NODE_H / 2;
  const x2 = to.x;
  const y2 = to.y + NODE_H / 2;
  const cx = Math.abs(x2 - x1) * 0.5;
  const d  = `M ${x1} ${y1} C ${x1 + cx} ${y1} ${x2 - cx} ${y2} ${x2} ${y2}`;

  const sparkColor = active ? NODE_META[from.type].color
                   : done   ? '#34D399'
                   :          'rgba(255,107,53,0.12)';

  const animDur  = active ? '0.8s' : done ? '2s' : `${5 + (parseInt(edge.id.replace('e', '')) * 0.7)}s`;
  const dashArr  = active ? '10 90' : done ? '6 94' : '4 96';
  const strokeW  = active ? 2 : done ? 1.5 : 1;

  return (
    <g>
      <path d={d} fill="none" stroke="rgba(255,107,53,0.07)" strokeWidth={1.5} />
      <path
        d={d}
        fill="none"
        stroke={sparkColor}
        strokeWidth={strokeW}
        strokeOpacity={active || done ? 1 : 0.6}
        pathLength={100}
        strokeDasharray={dashArr}
        strokeLinecap="round"
        style={{
          animation: `ags-edge-idle ${animDur} linear infinite`,
          animationDelay: active ? '0s' : `-${(parseInt(edge.id.replace(/\D/g, '')) * 1.3) % 5}s`,
        }}
      />
      <circle cx={x2} cy={y2} r={3} fill={sparkColor} opacity={active || done ? 0.9 : 0.3} />
    </g>
  );
}

function TempEdge({ from, mouse }: { from: { x: number; y: number }; mouse: { x: number; y: number } }) {
  const cx = Math.abs(mouse.x - from.x) * 0.5;
  const d  = `M ${from.x} ${from.y} C ${from.x + cx} ${from.y} ${mouse.x - cx} ${mouse.y} ${mouse.x} ${mouse.y}`;
  return <path d={d} fill="none" stroke="rgba(255,107,53,0.5)" strokeWidth={1.5} strokeDasharray="6 6" />;
}

// ── Node card ─────────────────────────────────────────────────────────────────
function NodeCard({
  node,
  selected,
  active,
  done,
  onMouseDown,
  onConnectorMouseDown,
  onConnectorMouseUp,
  onClick,
}: {
  node: AgentNode;
  selected: boolean;
  active: boolean;
  done: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onConnectorMouseDown: (e: React.MouseEvent) => void;
  onConnectorMouseUp: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  const meta = NODE_META[node.type];
  const detail = node.config.model
    ? `model: ${node.config.model}`
    : node.config.tool
    ? `tool: ${node.config.tool}`
    : (node.config.description ?? '');

  return (
    <div
      className={`ags-node${selected ? ' selected' : ''}${active ? ' node-active' : ''}${done && !active ? ' node-done' : ''}`}
      style={{ left: node.x, top: node.y }}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <div className="ags-node-header">
        <span className="ags-node-type-dot" style={{ background: meta.color }} />
        <span className="ags-node-title">{node.title}</span>
        <span
          className="ags-node-type-badge"
          style={{ background: meta.bgOpacity, color: meta.color }}
        >
          {meta.label}
        </span>
      </div>
      <div className="ags-node-body">
        <div className="ags-node-detail">{detail || ' '}</div>
      </div>
      {active && <div className="ags-node-running-bar" />}
      {done && !active && <div className="ags-node-done-bar" />}

      {/* Input connector */}
      {node.type !== 'input' && (
        <div
          className="ags-connector ags-connector-in"
          style={{ background: meta.color }}
          onMouseDown={e => e.stopPropagation()}
          onMouseUp={onConnectorMouseUp}
        />
      )}
      {/* Output connector */}
      {node.type !== 'output' && (
        <div
          className="ags-connector ags-connector-out"
          style={{ background: meta.color }}
          onMouseDown={onConnectorMouseDown}
          onMouseUp={e => e.stopPropagation()}
        />
      )}
    </div>
  );
}

// ── Inspector ─────────────────────────────────────────────────────────────────
function Inspector({
  node,
  nodes,
  edges,
  onChange,
  onDelete,
}: {
  node: AgentNode | null;
  nodes: AgentNode[];
  edges: AgentEdge[];
  onChange: (updated: AgentNode) => void;
  onDelete: () => void;
}) {
  if (!node) {
    return (
      <aside className="ags-inspector">
        <div className="ags-inspector-empty">
          <span style={{ fontSize: 28, opacity: 0.3 }}>◈</span>
          Select a node to inspect and configure it
        </div>
      </aside>
    );
  }

  const meta = NODE_META[node.type];
  const inbound  = edges.filter(e => e.to   === node.id).map(e => nodes.find(n => n.id === e.from)).filter(Boolean) as AgentNode[];
  const outbound = edges.filter(e => e.from === node.id).map(e => nodes.find(n => n.id === e.to  )).filter(Boolean) as AgentNode[];

  return (
    <aside className="ags-inspector">
      <div className="ags-inspector-header">
        <span className="ags-inspector-type-dot" style={{ background: meta.color }} />
        <span className="ags-inspector-title">{node.title}</span>
        <span className="ags-inspector-type">{meta.label}</span>
      </div>

      <div className="ags-inspector-body">
        <div className="ags-field">
          <label className="ags-field-label">Node title</label>
          <input
            className="ags-field-input"
            value={node.title}
            onChange={e => onChange({ ...node, title: e.target.value })}
          />
        </div>

        {(node.type === 'prompt') && (
          <div className="ags-field">
            <label className="ags-field-label">Model</label>
            <select
              className="ags-field-select"
              value={node.config.model ?? 'claude-sonnet-4-6'}
              onChange={e => onChange({ ...node, config: { ...node.config, model: e.target.value } })}
            >
              <option value="claude-opus-4-7">Claude Opus 4.7</option>
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
              <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o mini</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="mistral-large">Mistral Large</option>
            </select>
          </div>
        )}

        {node.type === 'prompt' && (
          <div className="ags-field">
            <label className="ags-field-label">System prompt</label>
            <textarea
              className="ags-field-input"
              rows={5}
              value={node.config.prompt ?? ''}
              onChange={e => onChange({ ...node, config: { ...node.config, prompt: e.target.value } })}
            />
          </div>
        )}

        {node.type === 'tool' && (
          <div className="ags-field">
            <label className="ags-field-label">Tool name</label>
            <select
              className="ags-field-select"
              value={node.config.tool ?? 'brave_search'}
              onChange={e => onChange({ ...node, config: { ...node.config, tool: e.target.value } })}
            >
              <option value="brave_search">brave_search</option>
              <option value="code_exec">code_exec</option>
              <option value="file_read">file_read</option>
              <option value="http_request">http_request</option>
              <option value="sql_query">sql_query</option>
              <option value="send_email">send_email</option>
              <option value="custom_tool">custom_tool…</option>
            </select>
          </div>
        )}

        {(node.type === 'condition') && (
          <div className="ags-field">
            <label className="ags-field-label">Condition expression</label>
            <input
              className="ags-field-input"
              placeholder='e.g. output.confidence > 0.8'
              value={node.config.description ?? ''}
              onChange={e => onChange({ ...node, config: { ...node.config, description: e.target.value } })}
            />
          </div>
        )}

        {(node.type === 'input' || node.type === 'output' || node.type === 'subagent') && (
          <div className="ags-field">
            <label className="ags-field-label">Description</label>
            <textarea
              className="ags-field-input"
              rows={3}
              value={node.config.description ?? ''}
              onChange={e => onChange({ ...node, config: { ...node.config, description: e.target.value } })}
            />
          </div>
        )}
      </div>

      {(inbound.length > 0 || outbound.length > 0) && (
        <div className="ags-inspector-connections">
          {inbound.length > 0 && (
            <>
              <div className="ags-inspector-conn-label">Receives from</div>
              {inbound.map(n => (
                <div key={n.id} className="ags-conn-chip">
                  <span className="ags-conn-dot" style={{ background: NODE_META[n.type].color }} />
                  {n.title}
                </div>
              ))}
            </>
          )}
          {outbound.length > 0 && (
            <>
              <div className="ags-inspector-conn-label" style={{ marginTop: inbound.length ? 10 : 0 }}>Sends to</div>
              {outbound.map(n => (
                <div key={n.id} className="ags-conn-chip">
                  <span className="ags-conn-dot" style={{ background: NODE_META[n.type].color }} />
                  {n.title}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <button className="ags-inspector-delete" onClick={onDelete}>
        Remove node
      </button>
    </aside>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AgenticStudioApp() {
  const [nodes, setNodes]           = useState<AgentNode[]>(INITIAL_NODES);
  const [edges, setEdges]           = useState<AgentEdge[]>(INITIAL_EDGES);
  const [selected, setSelected]     = useState<string | null>('n2');
  const [dragging, setDragging]     = useState<{ nodeId: string; offX: number; offY: number } | null>(null);
  const [drawing, setDrawing]       = useState<DrawState | null>(null);
  const [activeEdges, setActiveEdges] = useState<Set<string>>(new Set());
  const [doneEdges, setDoneEdges]   = useState<Set<string>>(new Set());
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set());
  const [doneNodes, setDoneNodes]   = useState<Set<string>>(new Set());
  const [running, setRunning]       = useState(false);
  const [logLines, setLogLines]     = useState<{ time: string; msg: string; type: 'active' | 'done' }[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const runRef    = useRef(false);

  const selectedNode = nodes.find(n => n.id === selected) ?? null;

  // ── Drag ──
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if ((e.target as HTMLElement).classList.contains('ags-connector')) return;
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const scrollLeft = canvasRef.current!.scrollLeft;
    const scrollTop  = canvasRef.current!.scrollTop;
    setDragging({
      nodeId,
      offX: e.clientX - rect.left + scrollLeft - node.x,
      offY: e.clientY - rect.top  + scrollTop  - node.y,
    });
    setSelected(nodeId);
  }, [nodes]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scrollLeft = canvasRef.current!.scrollLeft;
    const scrollTop  = canvasRef.current!.scrollTop;
    const mx = e.clientX - rect.left + scrollLeft;
    const my = e.clientY - rect.top  + scrollTop;

    if (dragging) {
      setNodes(prev => prev.map(n =>
        n.id === dragging.nodeId
          ? { ...n, x: Math.max(0, mx - dragging.offX), y: Math.max(0, my - dragging.offY) }
          : n
      ));
    }
    if (drawing) {
      setDrawing(prev => prev ? { ...prev, mouseX: mx, mouseY: my } : null);
    }
  }, [dragging, drawing]);

  const handleCanvasMouseUp = useCallback(() => {
    setDragging(null);
    setDrawing(null);
  }, []);

  // ── Connect ──
  const handleConnectorOut = useCallback((e: React.MouseEvent, fromId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === fromId);
    if (!node) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const scrollLeft = canvasRef.current!.scrollLeft;
    const scrollTop  = canvasRef.current!.scrollTop;
    setDrawing({
      fromId,
      fromX: node.x + NODE_W,
      fromY: node.y + NODE_H / 2,
      mouseX: e.clientX - rect.left + scrollLeft,
      mouseY: e.clientY - rect.top  + scrollTop,
    });
  }, [nodes]);

  const handleConnectorIn = useCallback((e: React.MouseEvent, toId: string) => {
    e.stopPropagation();
    if (!drawing) return;
    if (drawing.fromId === toId) { setDrawing(null); return; }
    const already = edges.some(ed => ed.from === drawing.fromId && ed.to === toId);
    if (!already) {
      setEdges(prev => [...prev, { id: eid(), from: drawing.fromId, to: toId }]);
    }
    setDrawing(null);
  }, [drawing, edges]);

  // ── Add node from palette ──
  const addNode = useCallback((type: NodeType) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scrollLeft = canvasRef.current!.scrollLeft;
    const scrollTop  = canvasRef.current!.scrollTop;
    const x = scrollLeft + rect.width  / 2 - NODE_W / 2 + Math.random() * 60 - 30;
    const y = scrollTop  + rect.height / 2 - NODE_H / 2 + Math.random() * 60 - 30;
    const meta = NODE_META[type];
    const newNode: AgentNode = {
      id: uid(),
      type,
      title: meta.label,
      x: Math.round(x),
      y: Math.round(y),
      config: {},
    };
    setNodes(prev => [...prev, newNode]);
    setSelected(newNode.id);
  }, []);

  // ── Delete selected ──
  const deleteSelected = useCallback(() => {
    if (!selected) return;
    setNodes(prev => prev.filter(n => n.id !== selected));
    setEdges(prev => prev.filter(e => e.from !== selected && e.to !== selected));
    setSelected(null);
  }, [selected]);

  // ── Update selected node config ──
  const updateNode = useCallback((updated: AgentNode) => {
    setNodes(prev => prev.map(n => n.id === updated.id ? updated : n));
  }, []);

  // ── Run simulation ──
  const runAgent = useCallback(async () => {
    if (running) return;
    runRef.current = true;
    setRunning(true);
    setActiveEdges(new Set());
    setDoneEdges(new Set());
    setActiveNodes(new Set());
    setDoneNodes(new Set());
    setLogLines([]);

    const now = () => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    for (const step of EXEC_STEPS) {
      if (!runRef.current) break;

      // Activate edges
      if (step.edgeIds.length) {
        setActiveEdges(new Set(step.edgeIds));
        await delay(500);
      }

      // Activate nodes
      setActiveNodes(new Set(step.nodeIds));
      setLogLines(prev => [...prev, { time: now(), msg: step.label, type: 'active' }]);
      await delay(1200);

      // Mark done
      setActiveEdges(new Set());
      setDoneEdges(prev => new Set([...prev, ...step.edgeIds]));
      setActiveNodes(new Set());
      setDoneNodes(prev => new Set([...prev, ...step.nodeIds]));
      setLogLines(prev => [...prev.slice(0, -1), { time: now(), msg: step.label + ' ✓', type: 'done' }]);
      await delay(300);
    }

    await delay(800);
    runRef.current = false;
    setRunning(false);
  }, [running]);

  const resetCanvas = useCallback(() => {
    runRef.current = false;
    setRunning(false);
    setNodes(INITIAL_NODES);
    setEdges(INITIAL_EDGES);
    setSelected('n2');
    setActiveEdges(new Set());
    setDoneEdges(new Set());
    setActiveNodes(new Set());
    setDoneNodes(new Set());
    setLogLines([]);
  }, []);

  // Load template from localStorage (set by Template Library)
  useEffect(() => {
    const saved = localStorage.getItem('agenticstudio-template');
    if (saved) {
      localStorage.removeItem('agenticstudio-template');
      try {
        const t = JSON.parse(saved);
        if (t.nodes) setNodes(t.nodes);
        if (t.edges) setEdges(t.edges);
      } catch { /* ignore malformed data */ }
    }
  }, []);

  // Keyboard delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') &&
          !(e.target instanceof HTMLInputElement) &&
          !(e.target instanceof HTMLTextAreaElement) &&
          !(e.target instanceof HTMLSelectElement)) {
        deleteSelected();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deleteSelected]);

  return (
    <div className="ags-shell">

      {/* Toolbar */}
      <header className="ags-toolbar">
        <Link href="/agenticstudio" className="ags-toolbar-logo">
          <AgenticWordmark />
        </Link>
        <div className="ags-toolbar-divider" />
        <span className="ags-toolbar-project">
          Agent Builder ·
          <span> Research Agent</span>
        </span>
        <div className="ags-toolbar-spacer" />
        <div className="ags-toolbar-status">
          <span className={`ags-status-dot${running ? ' running' : ''}`} />
          {running ? 'Running…' : `${nodes.length} nodes · ${edges.length} edges`}
        </div>
        <div className="ags-toolbar-divider" />
        <button className="ags-btn" onClick={resetCanvas}>Reset</button>
        <button
          className="ags-btn ags-btn-run"
          onClick={runAgent}
          disabled={running}
        >
          {running ? '⟳ Running' : '▶ Run agent'}
        </button>
      </header>

      <div className="ags-body">

        {/* Palette */}
        <aside className="ags-palette">
          <div className="ags-palette-section">
            <div className="ags-palette-label">Add node</div>
            {(Object.entries(NODE_META) as [NodeType, typeof NODE_META[NodeType]][]).map(([type, meta]) => (
              <div
                key={type}
                className="ags-palette-node"
                style={{ borderColor: `${meta.color}22` }}
                onClick={() => addNode(type)}
              >
                <div
                  className="ags-palette-node-icon"
                  style={{ background: meta.bgOpacity }}
                >
                  <span style={{ color: meta.color, fontSize: 14 }}>
                    {type === 'input' ? '▶' : type === 'output' ? '■' : type === 'prompt' ? '◈' : type === 'tool' ? '⚙' : type === 'condition' ? '⋈' : '◎'}
                  </span>
                </div>
                <div className="ags-palette-node-info">
                  <div className="ags-palette-node-name">{meta.label}</div>
                  <div className="ags-palette-node-desc">{meta.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="ags-palette-divider" />
          <div className="ags-palette-hint">
            Click any node type to add it to the canvas. Drag to reposition. Connect via the colored dots on node edges. Delete key removes selection.
          </div>
          {logLines.length > 0 && (
            <div className="ags-log">
              {logLines.map((l, i) => (
                <div key={i} className={`ags-log-entry${l.type === 'active' ? ' ags-log-active' : ' ags-log-done'}`}>
                  <span className="ags-log-time">{l.time}</span>
                  <span>{l.msg}</span>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Canvas */}
        <div
          className="ags-canvas-wrap"
          ref={canvasRef}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onClick={() => setSelected(null)}
        >
          <div className="ags-canvas-inner">
            {/* Edges SVG */}
            <svg className="ags-edges-svg">
              {edges.map(edge => (
                <EdgePath
                  key={edge.id}
                  nodes={nodes}
                  edge={edge}
                  active={activeEdges.has(edge.id)}
                  done={doneEdges.has(edge.id)}
                />
              ))}
              {drawing && (
                <TempEdge
                  from={{ x: drawing.fromX, y: drawing.fromY }}
                  mouse={{ x: drawing.mouseX, y: drawing.mouseY }}
                />
              )}
            </svg>

            {/* Nodes */}
            {nodes.map(node => (
              <NodeCard
                key={node.id}
                node={node}
                selected={selected === node.id}
                active={activeNodes.has(node.id)}
                done={doneNodes.has(node.id)}
                onMouseDown={e => handleNodeMouseDown(e, node.id)}
                onConnectorMouseDown={e => handleConnectorOut(e, node.id)}
                onConnectorMouseUp={e => handleConnectorIn(e, node.id)}
                onClick={() => setSelected(node.id)}
              />
            ))}

            {running && (
              <div className="ags-running-overlay">
                <span className="ags-running-spinner" />
                Agent executing — watch the spark traces
              </div>
            )}
          </div>
        </div>

        {/* Inspector */}
        <Inspector
          node={selectedNode}
          nodes={nodes}
          edges={edges}
          onChange={updateNode}
          onDelete={deleteSelected}
        />
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
