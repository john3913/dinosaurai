'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { AgenticWordmark } from '../Wordmark';
import './batch.css';

type CellState = 'idle' | 'running' | 'pass' | 'fail';
type Cat = 'S' | 'M' | 'C' | 'H' | 'L' | 'R' | 'K' | 'T';

const CAT_COLORS: Record<Cat, string> = {
  S: '#06B6D4', M: '#F59E0B', C: '#34D399', H: '#A78BFA',
  L: '#F472B6', R: '#FF6B35', K: '#FACC15', T: '#38BDF8',
};
const CAT_NAMES: Record<Cat, string> = {
  S: 'Science', M: 'Math', C: 'Coding', H: 'History',
  L: 'Language', R: 'Reasoning', K: 'Common Sense', T: 'Trivia',
};

interface TestCase { q: string; cat: Cat; pass: boolean; }

const TEST_CASES: TestCase[] = [
  // Science (8)
  {q:"Speed of light in m/s?", cat:'S', pass:true},
  {q:"Atomic number of carbon?", cat:'S', pass:true},
  {q:"What is mitosis?", cat:'S', pass:true},
  {q:"Formula for water?", cat:'S', pass:true},
  {q:"What is entropy?", cat:'S', pass:true},
  {q:"Define photosynthesis", cat:'S', pass:true},
  {q:"What is Avogadro's number?", cat:'S', pass:true},
  {q:"Boiling point of nitrogen?", cat:'S', pass:false},
  // Math (8)
  {q:"Derivative of x²?", cat:'M', pass:true},
  {q:"∫x dx = ?", cat:'M', pass:true},
  {q:"What is 17×23?", cat:'M', pass:true},
  {q:"Solve: 2x+5=13", cat:'M', pass:true},
  {q:"Area of circle radius 5?", cat:'M', pass:true},
  {q:"Fibonacci: after 8,13 comes?", cat:'M', pass:false},
  {q:"log₂(64) = ?", cat:'M', pass:true},
  {q:"P(A∩B) if P(A)=0.4,P(B)=0.5,P(A∪B)=0.7?", cat:'M', pass:false},
  // Coding (8)
  {q:"Python list comprehension for squares 1-10?", cat:'C', pass:true},
  {q:"What is Big O of binary search?", cat:'C', pass:true},
  {q:"Reverse a string in Python?", cat:'C', pass:true},
  {q:"SQL: select distinct values?", cat:'C', pass:true},
  {q:"What is a closure in JS?", cat:'C', pass:true},
  {q:"Difference: == vs === in JS?", cat:'C', pass:true},
  {q:"Git command to undo last commit?", cat:'C', pass:true},
  {q:"Implement LRU cache in Python?", cat:'C', pass:false},
  // History (8)
  {q:"Year WW2 ended?", cat:'H', pass:true},
  {q:"First US president?", cat:'H', pass:true},
  {q:"Year Berlin Wall fell?", cat:'H', pass:true},
  {q:"Who wrote the Magna Carta?", cat:'H', pass:true},
  {q:"French Revolution year?", cat:'H', pass:true},
  {q:"First moon landing year?", cat:'H', pass:true},
  {q:"Who was Napoleon's final defeat at?", cat:'H', pass:true},
  {q:"Year of the Black Death peak in Europe?", cat:'H', pass:false},
  // Language (8)
  {q:"Synonym for 'ephemeral'?", cat:'L', pass:true},
  {q:"Antonym of 'benevolent'?", cat:'L', pass:true},
  {q:"'They' singular pronoun: grammatically valid?", cat:'L', pass:true},
  {q:"Plural of 'criterion'?", cat:'L', pass:true},
  {q:"Correct: 'fewer' or 'less' items?", cat:'L', pass:true},
  {q:"Etymology of 'serendipity'?", cat:'L', pass:true},
  {q:"What is an Oxford comma?", cat:'L', pass:true},
  {q:"Difference: affect vs effect?", cat:'L', pass:false},
  // Reasoning (8)
  {q:"All birds fly. Penguins are birds. Do penguins fly?", cat:'R', pass:true},
  {q:"If A>B and B>C, is A>C?", cat:'R', pass:true},
  {q:"What comes next: 2,6,12,20,30?", cat:'R', pass:true},
  {q:"A bat+ball = $1.10. Bat=$1 more. Ball cost?", cat:'R', pass:false},
  {q:"How many sides do 4 triangles have total?", cat:'R', pass:true},
  {q:"Liar paradox: 'This statement is false' — valid?", cat:'R', pass:false},
  {q:"5 machines, 5 widgets, 5 mins. 100 machines→100 widgets in?", cat:'R', pass:false},
  {q:"If it rains, ground is wet. Ground is wet→raining?", cat:'R', pass:true},
  // Common Sense (8)
  {q:"Can you see stars during daytime?", cat:'K', pass:true},
  {q:"Does ice float or sink in water?", cat:'K', pass:true},
  {q:"Which is heavier: kg of feathers or kg of steel?", cat:'K', pass:true},
  {q:"Can you fold paper in half more than 7 times by hand?", cat:'K', pass:true},
  {q:"Does hot air rise or fall?", cat:'K', pass:true},
  {q:"Is the Great Wall visible from space?", cat:'K', pass:true},
  {q:"Do people use more than 10% of their brain?", cat:'K', pass:true},
  {q:"Can you get a sunburn on a cloudy day?", cat:'K', pass:false},
  // Trivia (8)
  {q:"How many bones in adult human body?", cat:'T', pass:true},
  {q:"Largest planet in solar system?", cat:'T', pass:true},
  {q:"Capital of Australia?", cat:'T', pass:true},
  {q:"Speed of sound at sea level (m/s)?", cat:'T', pass:true},
  {q:"How many strings on a standard guitar?", cat:'T', pass:true},
  {q:"Longest river in world?", cat:'T', pass:false},
  {q:"Chemical symbol for gold?", cat:'T', pass:true},
  {q:"Year iPhone first released?", cat:'T', pass:false},
];

const MODEL_PRICES: Record<string, { in: number; out: number }> = {
  'claude-haiku-4-5-20251001': { in: 0.25, out: 1.25 },
  'claude-sonnet-4-6': { in: 3, out: 15 },
  'claude-opus-4-7': { in: 15, out: 75 },
};

const CAT_ORDER: Cat[] = ['S','M','C','H','L','R','K','T'];

export default function BatchPage() {
  const [promptTemplate, setPromptTemplate] = useState("Answer accurately and concisely:\n\nQ: {{question}}");
  const [model, setModel] = useState('claude-haiku-4-5-20251001');
  const [grader, setGrader] = useState('Exact Match');
  const [cells, setCells] = useState<CellState[]>(new Array(64).fill('idle'));
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(0);

  const runBatch = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setProgress(0);
    setCompleted(0);
    setCells(new Array(64).fill('idle'));

    const BATCH = 6;
    for (let start = 0; start < 64; start += BATCH) {
      const end = Math.min(start + BATCH, 64);
      const indices = Array.from({ length: end - start }, (_, i) => start + i);

      // Set to running
      setCells(prev => {
        const next = [...prev];
        indices.forEach(i => { next[i] = 'running'; });
        return next;
      });

      await new Promise(r => setTimeout(r, 280));

      // Set to pass/fail
      setCells(prev => {
        const next = [...prev];
        indices.forEach(i => { next[i] = TEST_CASES[i].pass ? 'pass' : 'fail'; });
        return next;
      });

      setCompleted(end);
      setProgress(Math.round((end / 64) * 100));

      if (end < 64) await new Promise(r => setTimeout(r, 120));
    }

    setRunning(false);
  }, [running]);

  const passCount = cells.filter((c, i) => i < completed && c === 'pass').length;
  const failCount = cells.filter((c, i) => i < completed && c === 'fail').length;
  const passRate = completed > 0 ? ((passCount / completed) * 100).toFixed(1) : '—';

  const catStats = CAT_ORDER.map(cat => {
    const indices = TEST_CASES.map((tc, i) => ({ tc, i })).filter(({ tc }) => tc.cat === cat);
    const doneIdx = indices.filter(({ i }) => i < completed);
    const catPass = doneIdx.filter(({ i }) => cells[i] === 'pass').length;
    const catTotal = doneIdx.length;
    return { cat, catPass, catTotal, total: 8 };
  });

  const failures = TEST_CASES
    .map((tc, i) => ({ tc, i }))
    .filter(({ i }) => cells[i] === 'fail' && i < completed)
    .slice(0, 5);

  const price = MODEL_PRICES[model] ?? MODEL_PRICES['claude-haiku-4-5-20251001'];
  const estCost = ((64 * 300 * price.in + 64 * 150 * price.out) / 1_000_000).toFixed(5);

  return (
    <div className="br-root">
      <header className="br-bar">
        <Link href="/agenticstudio" className="br-bar-logo"><AgenticWordmark /></Link>
        <div className="br-bar-sep" />
        <span className="br-bar-title">Batch Runner</span>
      </header>

      <div className="br-body">
        {/* Top strip */}
        <div className="br-top">
          <div className="br-prompt-wrap">
            <div className="br-label">Prompt Template</div>
            <textarea className="br-prompt-ta" rows={2} value={promptTemplate} onChange={e => setPromptTemplate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div className="br-label">Model</div>
            <select className="br-sel" value={model} onChange={e => setModel(e.target.value)}>
              <option value="claude-haiku-4-5-20251001">claude-haiku-4-5</option>
              <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
              <option value="claude-opus-4-7">claude-opus-4-7</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div className="br-label">Grader</div>
            <select className="br-sel" value={grader} onChange={e => setGrader(e.target.value)}>
              <option>Exact Match</option>
              <option>Semantic</option>
              <option>LLM Judge</option>
            </select>
          </div>
          <button className="br-run-btn" onClick={runBatch} disabled={running}>
            {running ? `Running… ${completed}/64` : '▶ Run Batch (64 cases)'}
          </button>
        </div>

        {/* Progress */}
        <div className="br-progress-wrap">
          <div className="br-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Main */}
        <div className="br-main">
          {/* Grid */}
          <div className="br-grid-wrap">
            <div className="br-grid">
              {TEST_CASES.map((tc, i) => (
                <div key={i} className={`br-cell ${cells[i]}`} style={{ color: CAT_COLORS[tc.cat] }}>
                  {tc.cat}
                  {cells[i] !== 'idle' && (
                    <div className="br-cell-tooltip">{tc.q}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
              {CAT_ORDER.map(cat => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(232,234,240,0.4)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: CAT_COLORS[cat], flexShrink: 0 }} />
                  {CAT_NAMES[cat]}
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          <aside className="br-results">
            <div className="br-pass-rate">
              <div className="br-rate-label">Pass Rate</div>
              <div className="br-rate-num">{completed > 0 ? passRate + '%' : '—'}</div>
            </div>
            {completed > 0 && (
              <div className="br-counts">
                <span className="br-count-pass">✓ {passCount} passed</span>
                <span className="br-count-fail">✗ {failCount} failed</span>
              </div>
            )}

            <div>
              <div className="br-rate-label" style={{ marginBottom: 8 }}>By Category</div>
              <div className="br-cats">
                {catStats.map(({ cat, catPass, catTotal, total }) => (
                  <div key={cat} className="br-cat-row">
                    <span className="br-cat-letter" style={{ color: CAT_COLORS[cat] }}>{cat}</span>
                    <div className="br-cat-bar-track">
                      <div
                        className="br-cat-bar-fill"
                        style={{
                          width: catTotal > 0 ? `${(catPass / catTotal) * 100}%` : '0%',
                          background: CAT_COLORS[cat],
                        }}
                      />
                    </div>
                    <span className="br-cat-count">{catTotal > 0 ? `${catPass}/${catTotal}` : `0/${total}`}</span>
                  </div>
                ))}
              </div>
            </div>

            {failures.length > 0 && (
              <div>
                <div className="br-rate-label" style={{ marginBottom: 8 }}>Failures</div>
                <div className="br-failures">
                  {failures.map(({ tc, i }) => (
                    <div key={i} className="br-fail-card">{tc.q}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="br-cost">
              Est. cost: <strong>${estCost}</strong><br />
              64 cases × {model.includes('haiku') ? 'haiku' : model.includes('sonnet') ? 'sonnet' : 'opus'} pricing
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
