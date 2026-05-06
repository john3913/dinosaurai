'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import './mcp-builder.css';

interface Param { name: string; type: string; desc: string; required: boolean; }
interface ToolDef { id: string; name: string; desc: string; params: Param[]; }

const TYPES = ['string', 'number', 'boolean', 'array', 'object'];

function uid() { return Math.random().toString(36).slice(2, 8); }

const DEFAULT_TOOLS: ToolDef[] = [
  {
    id: 'a',
    name: 'get_weather',
    desc: 'Get current weather for a location',
    params: [
      { name: 'location', type: 'string', desc: 'City name or coordinates', required: true },
      { name: 'units', type: 'string', desc: 'celsius or fahrenheit', required: false },
    ],
  },
];

function generateTS(name: string, transport: string, tools: ToolDef[]): string {
  const toolList = tools.map(t => `    {
      name: '${t.name}',
      description: '${t.desc}',
      inputSchema: {
        type: 'object' as const,
        properties: {
          ${t.params.map(p => `${p.name}: { type: '${p.type}', description: '${p.desc}' }`).join(',\n          ')}
        },
        required: [${t.params.filter(p => p.required).map(p => `'${p.name}'`).join(', ')}],
      },
    }`).join(',\n');

  const switchCases = tools.map(t =>
    `    case '${t.name}': {\n      // TODO: implement ${t.name}\n      const args = request.params.arguments as Record<string, unknown>;\n      return { content: [{ type: 'text', text: \`${t.name} called with \${JSON.stringify(args)}\` }] };\n    }`
  ).join('\n');

  const transportImport = transport === 'http'
    ? `import { HttpServerTransport } from '@modelcontextprotocol/sdk/server/http.js';`
    : `import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';`;

  const transportSetup = transport === 'http'
    ? `const transport = new HttpServerTransport({ port: 3001 });\nawait server.connect(transport);\nconsole.error('MCP server listening on port 3001');`
    : `const transport = new StdioServerTransport();\nawait server.connect(transport);\nconsole.error('MCP server started on stdio');`;

  return `import { Server } from '@modelcontextprotocol/sdk/server/index.js';
${transportImport}
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  { name: '${name}', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
${toolList}
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;
  switch (name) {
${switchCases}
    default:
      throw new Error(\`Unknown tool: \${name}\`);
  }
});

${transportSetup}`;
}

function generatePython(name: string, tools: ToolDef[]): string {
  const toolDefs = tools.map(t => {
    const paramDefs = t.params.map(p => `        "${p.name}": {"type": "${p.type}", "description": "${p.desc}"}`).join(',\n');
    const required = t.params.filter(p => p.required).map(p => `"${p.name}"`).join(', ');
    return `    Tool(
        name="${t.name}",
        description="${t.desc}",
        inputSchema={
            "type": "object",
            "properties": {
${paramDefs}
            },
            "required": [${required}],
        },
    )`;
  }).join(',\n');

  const handlers = tools.map(t =>
    `    if name == "${t.name}":\n        # TODO: implement ${t.name}\n        return [TextContent(type="text", text=f"${t.name} called with {arguments!r}")]`
  ).join('\n');

  return `from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
import asyncio

server = Server("${name}")

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
${toolDefs}
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
${handlers}
    raise ValueError(f"Unknown tool: {name}")

async def main():
    async with stdio_server() as (read, write):
        await server.run(read, write, server.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())`;
}

function generateSchema(tools: ToolDef[]): string {
  return JSON.stringify({
    tools: tools.map(t => ({
      name: t.name,
      description: t.desc,
      inputSchema: {
        type: 'object',
        properties: Object.fromEntries(t.params.map(p => [p.name, { type: p.type, description: p.desc }])),
        required: t.params.filter(p => p.required).map(p => p.name),
      },
    })),
  }, null, 2);
}

export default function McpBuilder() {
  const [serverName, setServerName] = useState('my-mcp-server');
  const [transport, setTransport] = useState<'stdio' | 'http'>('stdio');
  const [lang, setLang] = useState<'typescript' | 'python'>('typescript');
  const [tools, setTools] = useState<ToolDef[]>(DEFAULT_TOOLS);
  const [activeTab, setActiveTab] = useState<'server' | 'schema' | 'test'>('server');
  const [selectedTool, setSelectedTool] = useState('a');
  const [copied, setCopied] = useState(false);

  const currentTool = tools.find(t => t.id === selectedTool) ?? tools[0];

  function updateTool(id: string, patch: Partial<ToolDef>) {
    setTools(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
  }
  function updateParam(toolId: string, pi: number, patch: Partial<Param>) {
    setTools(ts => ts.map(t => t.id === toolId
      ? { ...t, params: t.params.map((p, i) => i === pi ? { ...p, ...patch } : p) }
      : t));
  }
  function addTool() {
    const newId = uid();
    setTools(ts => [...ts, { id: newId, name: 'new_tool', desc: 'Description', params: [] }]);
    setSelectedTool(newId);
  }
  function removeTool(id: string) {
    if (tools.length === 1) return;
    setTools(ts => ts.filter(t => t.id !== id));
    setSelectedTool(tools.find(t => t.id !== id)?.id ?? '');
  }
  function addParam(toolId: string) {
    setTools(ts => ts.map(t => t.id === toolId
      ? { ...t, params: [...t.params, { name: 'param', type: 'string', desc: 'Description', required: false }] }
      : t));
  }
  function removeParam(toolId: string, pi: number) {
    setTools(ts => ts.map(t => t.id === toolId ? { ...t, params: t.params.filter((_, i) => i !== pi) } : t));
  }

  const code = lang === 'typescript'
    ? generateTS(serverName, transport, tools)
    : generatePython(serverName, tools);
  const schema = generateSchema(tools);

  function copyCode() {
    navigator.clipboard.writeText(activeTab === 'schema' ? schema : code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mb-root">
      <header className="mb-bar">
        <Link href="/agenticstudio" className="mb-bar-logo"><AgenticWordmark /></Link>
        <div className="mb-bar-sep" />
        <span className="mb-bar-title">MCP Server Builder</span>
        <div className="mb-bar-space" />
        <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener" className="mb-bar-link">MCP Docs ↗</a>
      </header>

      <div className="mb-layout">
        <aside className="mb-aside">
          {/* Server config */}
          <div className="mb-section">
            <div className="mb-label">Server Name</div>
            <input className="mb-input" value={serverName} onChange={e => setServerName(e.target.value.replace(/\s+/g, '-').toLowerCase())} />
          </div>
          <div className="mb-row">
            <div className="mb-section mb-half">
              <div className="mb-label">Transport</div>
              <select className="mb-select" value={transport} onChange={e => setTransport(e.target.value as 'stdio' | 'http')}>
                <option value="stdio">stdio</option>
                <option value="http">HTTP</option>
              </select>
            </div>
            <div className="mb-section mb-half">
              <div className="mb-label">Language</div>
              <select className="mb-select" value={lang} onChange={e => setLang(e.target.value as 'typescript' | 'python')}>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
              </select>
            </div>
          </div>

          {/* Tool list */}
          <div className="mb-section">
            <div className="mb-label-row">
              <div className="mb-label">Tools <span className="mb-count">{tools.length}</span></div>
              <button className="mb-add-tool" onClick={addTool}>+ Add</button>
            </div>
            <div className="mb-tool-list">
              {tools.map(t => (
                <div key={t.id} className={`mb-tool-item${selectedTool === t.id ? ' on' : ''}`}
                  onClick={() => setSelectedTool(t.id)}>
                  <span className="mb-tool-name">{t.name}</span>
                  <span className="mb-tool-params">{t.params.length} params</span>
                  {tools.length > 1 && (
                    <button className="mb-tool-del" onClick={e => { e.stopPropagation(); removeTool(t.id); }}>×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Selected tool editor */}
          {currentTool && (
            <div className="mb-section mb-tool-editor">
              <div className="mb-label">Tool Definition</div>
              <input className="mb-input mb-tool-field" placeholder="tool_name"
                value={currentTool.name} onChange={e => updateTool(currentTool.id, { name: e.target.value })} />
              <textarea className="mb-ta mb-tool-field" placeholder="Description" rows={2}
                value={currentTool.desc} onChange={e => updateTool(currentTool.id, { desc: e.target.value })} />
              <div className="mb-params-label">
                <span>Parameters</span>
                <button className="mb-add-param" onClick={() => addParam(currentTool.id)}>+ param</button>
              </div>
              {currentTool.params.map((p, pi) => (
                <div key={pi} className="mb-param">
                  <input className="mb-param-name" placeholder="name" value={p.name}
                    onChange={e => updateParam(currentTool.id, pi, { name: e.target.value })} />
                  <select className="mb-param-type" value={p.type}
                    onChange={e => updateParam(currentTool.id, pi, { type: e.target.value })}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label className="mb-param-req">
                    <input type="checkbox" checked={p.required}
                      onChange={e => updateParam(currentTool.id, pi, { required: e.target.checked })} />
                    req
                  </label>
                  <button className="mb-param-del" onClick={() => removeParam(currentTool.id, pi)}>×</button>
                </div>
              ))}
            </div>
          )}
        </aside>

        <main className="mb-main">
          <div className="mb-code-bar">
            <div className="mb-tabs">
              {(['server', 'schema', 'test'] as const).map(t => (
                <button key={t} className={`mb-tab${activeTab === t ? ' on' : ''}`} onClick={() => setActiveTab(t)}>
                  {t === 'server' ? (lang === 'typescript' ? 'server.ts' : 'server.py') : t === 'schema' ? 'schema.json' : 'README'}
                </button>
              ))}
            </div>
            <div className="mb-code-actions">
              <button className="mb-copy" onClick={copyCode}>{copied ? '✓ Copied' : 'Copy'}</button>
            </div>
          </div>
          <pre className="mb-code">
            {activeTab === 'schema' ? schema : activeTab === 'test' ? generateReadme(serverName, tools, lang) : code}
          </pre>
        </main>
      </div>
    </div>
  );
}

function generateReadme(name: string, tools: ToolDef[], lang: string): string {
  return `# ${name}

A Model Context Protocol (MCP) server with ${tools.length} tool${tools.length !== 1 ? 's' : ''}.

## Setup

\`\`\`bash
${lang === 'typescript' ? `npm install @modelcontextprotocol/sdk
npx tsc
node dist/server.js` : `pip install mcp
python server.py`}
\`\`\`

## Claude Desktop config (~/.claude/claude_desktop_config.json)

\`\`\`json
{
  "mcpServers": {
    "${name}": {
      "command": "${lang === 'typescript' ? 'node' : 'python'}",
      "args": ["${lang === 'typescript' ? 'dist/server.js' : 'server.py'}"]
    }
  }
}
\`\`\`

## Tools

${tools.map(t => `### ${t.name}\n${t.desc}\n\n**Parameters:**\n${t.params.map(p => `- \`${p.name}\` (${p.type}${p.required ? ', required' : ''}): ${p.desc}`).join('\n')}`).join('\n\n')}`;
}
