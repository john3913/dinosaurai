'use client';
import { useState } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import '../pv.css';

interface Version {
  id: string;
  num: string;
  score: number;
  time: string;
  text: string;
  isCurrent?: boolean;
}

const VERSIONS: Version[] = [
  {
    id: 'v1.0', num: 'v1.0', score: 6.2, time: '5d ago',
    text: 'You are a customer support assistant. Help users with their questions. Be helpful.',
  },
  {
    id: 'v1.1', num: 'v1.1', score: 7.1, time: '4d ago',
    text: "You are a helpful customer support assistant for TechCorp. Help users resolve their issues clearly and professionally. If you don't know the answer, say so.",
  },
  {
    id: 'v1.2', num: 'v1.2', score: 7.8, time: '3d ago',
    text: "You are a helpful customer support assistant for TechCorp. Help users resolve their technical and billing issues clearly and professionally. Always: 1) Acknowledge the issue 2) Provide a solution 3) Offer follow-up help. If you cannot resolve an issue, escalate to tier-2 support.",
  },
  {
    id: 'v1.3', num: 'v1.3', score: 8.4, time: '1d ago',
    text: "You are a helpful, empathetic customer support specialist for TechCorp. Your goal is to resolve customer issues efficiently while maintaining a positive experience.\n\nGuidelines:\n- Acknowledge the customer's frustration before solving\n- Provide clear, numbered steps for technical issues\n- For billing issues, always verify account details first\n- Escalate to tier-2 if unresolved after 2 attempts\n- End every response with a satisfaction check",
  },
  {
    id: 'v1.4', num: 'v1.4', score: 8.9, time: '3h ago', isCurrent: true,
    text: "You are a helpful, empathetic customer support specialist for TechCorp. Your goal is to resolve customer issues efficiently while maintaining a positive experience.\n\nGuidelines:\n- Acknowledge the customer's frustration before solving\n- Provide clear, numbered steps for technical issues\n- For billing issues, always verify account details first\n- Escalate to tier-2 if unresolved after 2 attempts\n- End every response with a satisfaction check\n\nTone: Professional but warm. Avoid jargon. Use the customer's name when provided.\n\nNever: make promises about refunds without manager approval, access accounts without verification, or reveal internal system details.",
  },
];

interface TestCase { name: string; score: number; pass: boolean; }

const TEST_CASES_BY_VERSION: Record<string, TestCase[]> = {
  'v1.0': [
    { name: 'Returns policy question', score: 0.52, pass: false },
    { name: 'Angry customer scenario', score: 0.41, pass: false },
    { name: 'Billing dispute', score: 0.48, pass: false },
  ],
  'v1.1': [
    { name: 'Returns policy question', score: 0.68, pass: true },
    { name: 'Angry customer scenario', score: 0.55, pass: false },
    { name: 'Billing dispute', score: 0.61, pass: true },
  ],
  'v1.2': [
    { name: 'Returns policy question', score: 0.75, pass: true },
    { name: 'Angry customer scenario', score: 0.69, pass: true },
    { name: 'Billing dispute', score: 0.72, pass: true },
  ],
  'v1.3': [
    { name: 'Returns policy question', score: 0.84, pass: true },
    { name: 'Angry customer scenario', score: 0.81, pass: true },
    { name: 'Billing dispute', score: 0.78, pass: true },
  ],
  'v1.4': [
    { name: 'Returns policy question', score: 0.91, pass: true },
    { name: 'Angry customer scenario', score: 0.88, pass: true },
    { name: 'Billing dispute', score: 0.87, pass: true },
  ],
};

// Simple LCS-based diff
function lcs<T>(a: T[], b: T[]): boolean[][] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

  const inLCS: boolean[][] = Array.from({ length: m }, () => new Array(n).fill(false));
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { inLCS[i - 1][j - 1] = true; i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return inLCS;
}

interface DiffLine { type: 'same' | 'added' | 'removed'; text: string; }

function diffTexts(oldText: string, newText: string): DiffLine[] {
  const splitSentences = (t: string) =>
    t.split(/(?<=\. |\n)/).map(s => s.trim()).filter(s => s.length > 0);

  const a = splitSentences(oldText);
  const b = splitSentences(newText);
  const grid = lcs(a, b);

  const result: DiffLine[] = [];
  let ai = 0, bi = 0;

  while (ai < a.length || bi < b.length) {
    if (ai < a.length && bi < b.length && grid[ai]?.[bi]) {
      result.push({ type: 'same', text: a[ai] });
      ai++; bi++;
    } else if (bi < b.length && (ai >= a.length || (grid[ai] && !grid[ai][bi]))) {
      result.push({ type: 'added', text: b[bi] });
      bi++;
    } else if (ai < a.length) {
      result.push({ type: 'removed', text: a[ai] });
      ai++;
    } else {
      bi++;
    }
  }

  return result;
}

function scoreBadgeClass(score: number) {
  if (score < 7) return 'pv-score-badge pv-score-red';
  if (score < 8) return 'pv-score-badge pv-score-amber';
  return 'pv-score-badge pv-score-green';
}

export default function PromptVault() {
  const [selectedId, setSelectedId] = useState('v1.4');
  const selectedIdx = VERSIONS.findIndex(v => v.id === selectedId);
  const selected = VERSIONS[selectedIdx];
  const prev = selectedIdx > 0 ? VERSIONS[selectedIdx - 1] : null;

  const diffLines: DiffLine[] = prev
    ? diffTexts(prev.text, selected.text)
    : selected.text.split('\n').map(l => ({ type: 'same', text: l }));

  const tests = TEST_CASES_BY_VERSION[selectedId] ?? [];
  const isLatest = selected?.isCurrent ?? false;

  return (
    <div className="pv-root">
      <header className="pv-bar">
        <Link href="/agenticstudio" className="pv-bar-logo"><AgenticWordmark /></Link>
        <div className="pv-bar-sep" />
        <span className="pv-bar-title">Prompt Vault</span>
        <div className="pv-bar-space" />
      </header>

      <div className="pv-layout">
        {/* LEFT VERSION LIST */}
        <aside className="pv-versions">
          <div className="pv-versions-title">Versions</div>
          {[...VERSIONS].reverse().map(v => (
            <div
              key={v.id}
              className={`pv-version-card${selectedId === v.id ? ' active' : ''}`}
              onClick={() => setSelectedId(v.id)}
            >
              <div className="pv-version-row">
                <span className="pv-version-num">{v.num}</span>
                {v.isCurrent && <span className="pv-current-badge">CURRENT</span>}
                <span className={scoreBadgeClass(v.score)}>{v.score.toFixed(1)}</span>
              </div>
              <div className="pv-version-time">{v.time}</div>
            </div>
          ))}
        </aside>

        {/* CENTER DIFF */}
        <div className="pv-diff">
          <div className="pv-diff-head">
            <span className="pv-diff-comparing">Comparing</span>
            <span className="pv-diff-versions">
              {prev ? `${prev.num} → ${selected?.num}` : `${selected?.num} (initial)`}
            </span>
          </div>
          <div className="pv-diff-body">
            {diffLines.map((line, i) => (
              <div key={i} className={`pv-diff-line ${line.type}`}>
                <span className="pv-diff-prefix">
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </span>
                <span>{line.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT TEST PANEL */}
        <aside className="pv-tests">
          <div className="pv-tests-title">Test Cases</div>
          {tests.map((test, i) => (
            <div key={i} className="pv-test-card">
              <div className="pv-test-header">
                <span className="pv-test-name">{test.name}</span>
                <span className={`pv-test-badge ${test.pass ? 'pv-test-pass' : 'pv-test-fail'}`}>
                  {test.pass ? 'PASS' : 'FAIL'}
                </span>
              </div>
              <div className="pv-test-bar-bg">
                <div className="pv-test-bar" style={{ width: `${test.score * 100}%` }} />
              </div>
            </div>
          ))}

          <button
            className="pv-deploy"
            disabled={!isLatest}
            title={isLatest ? 'Deploy v1.4 to production' : 'Select v1.4 to deploy'}
          >
            Deploy to Production
          </button>
          {!isLatest && (
            <div className="pv-deploy-hint">Select v1.4 to deploy</div>
          )}
        </aside>
      </div>
    </div>
  );
}
