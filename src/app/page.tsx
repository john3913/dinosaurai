'use client';
import { useEffect, useRef, useState } from 'react';
import './dino.css';

/* ── Canvas background ──────────────────────────────────────────────────── */
function BgCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;

    const COLORS = ['#7EFF50', '#00D4FF', '#FF6B35', '#9B5CF6'];
    type Pt = { x: number; y: number };
    type Edge = { a: Pt; b: Pt };
    type Spark = { edge: Edge; t: number; speed: number; color: string; trailLen: number };

    let nodes: Pt[] = [], edges: Edge[] = [], sparks: Spark[] = [];
    let W = 0, H = 0, rafId = 0;
    const mouse: Pt = { x: -1, y: -1 };

    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };

    function build() {
      nodes = []; edges = []; sparks = [];
      const count = Math.max(20, Math.floor(W * H / 65000));
      for (let i = 0; i < count; i++) nodes.push({ x: Math.random() * W, y: Math.random() * H });
      const edgeSet = new Set<string>();
      for (let i = 0; i < nodes.length; i++) {
        nodes
          .map((n, j) => ({ j, d: Math.hypot(n.x - nodes[i].x, n.y - nodes[i].y) }))
          .filter(r => r.j !== i).sort((a, b) => a.d - b.d).slice(0, 3)
          .forEach(r => {
            const key = Math.min(i, r.j) + '_' + Math.max(i, r.j);
            if (!edgeSet.has(key)) { edgeSet.add(key); edges.push({ a: nodes[i], b: nodes[r.j] }); }
          });
      }
      edges.forEach(e => { if (Math.random() > 0.25) sparks.push(mkSpark(e)); });
    }

    function mkSpark(edge: Edge): Spark {
      return { edge, t: Math.random(), speed: 0.0003 + Math.random() * 0.0006,
        color: COLORS[Math.floor(Math.random() * COLORS.length)], trailLen: 0.07 + Math.random() * 0.09 };
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      if (mouse.x >= 0) {
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 180);
        g.addColorStop(0, 'rgba(126,255,80,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      ctx.lineWidth = 1;
      edges.forEach(e => {
        ctx.beginPath(); ctx.strokeStyle = 'rgba(126,255,80,0.045)';
        ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
      });
      nodes.forEach(n => {
        ctx.beginPath(); ctx.fillStyle = 'rgba(126,255,80,0.08)';
        ctx.arc(n.x, n.y, 1.5, 0, Math.PI * 2); ctx.fill();
      });
      sparks.forEach(s => {
        s.t += s.speed;
        if (s.t > 1 + s.trailLen) {
          s.edge = edges[Math.floor(Math.random() * edges.length)]; s.t = 0;
          s.color = COLORS[Math.floor(Math.random() * COLORS.length)];
          s.speed = 0.0003 + Math.random() * 0.0006; s.trailLen = 0.07 + Math.random() * 0.09;
        }
        const tHead = Math.min(1, s.t), tTail = Math.max(0, s.t - s.trailLen);
        if (tHead <= tTail) return;
        const { a, b } = s.edge;
        const x1 = a.x + (b.x - a.x) * tTail, y1 = a.y + (b.y - a.y) * tTail;
        const x2 = a.x + (b.x - a.x) * tHead, y2 = a.y + (b.y - a.y) * tHead;
        const alpha = tHead < 0.1 ? tHead / 0.1 : (s.t > 0.9 ? (1 - (s.t - 0.9) / 0.1) : 1);
        ctx.save(); ctx.globalAlpha = Math.max(0, alpha) * 0.85;
        ctx.shadowColor = s.color; ctx.shadowBlur = 8;
        ctx.strokeStyle = s.color; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
      });
      rafId = requestAnimationFrame(draw);
    }

    function resize() {
      W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; build();
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('resize', resize);
    resize(); rafId = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafId);
    };
  }, []);
  return <canvas ref={ref} className="bg-canvas" />;
}

/* ── Floating pixels ─────────────────────────────────────────────────────── */
const PIXEL_COLORS = ['#7EFF50', '#FF6B35', '#00D4FF', '#9B5CF6', '#BBFF70'];
const PIXELS = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 3.7 + 1.1) % 100}vw`,
  color: PIXEL_COLORS[i % PIXEL_COLORS.length],
  duration: `${14 + (i * 1.1) % 22}s`,
  delay: `${(i * 0.9) % 24}s`,
}));

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function DinosauraiHome() {
  const [signed, setSigned] = useState(false);

  return (
    <>
      <BgCanvas />

      {/* Floating pixels */}
      <div className="pixel-field" aria-hidden="true">
        {PIXELS.map((p, i) => (
          <div key={i} className="px" style={{
            left: p.left, bottom: '-6px', background: p.color,
            animationDuration: p.duration, animationDelay: p.delay,
          }} />
        ))}
      </div>

      <div className="page">

        {/* Nav */}
        <nav>
          <a className="nav-logo" href="/">🦕 DINOSAUR<span className="logo-ai">AI</span></a>
          <a className="nav-link" href="#games">Games</a>
          <a className="nav-link" href="#apps">Apps</a>
          <a className="nav-link" href="/agenticstudio">AgenticStudio</a>
          <button className="nav-btn">Early Access</button>
        </nav>

        {/* Hero */}
        <section className="hero">
          <div className="dino-wrap">
            <span className="dino-emoji">🦕</span>
            <div className="dino-tint" />
          </div>
          <div className="hero-tag">🎮 Games &amp; Fun Apps Studio</div>
          <h1 className="wordmark">DINOSAUR<span className="serif-ai">AI</span></h1>
          <p className="hero-sub">A studio building original games, fun apps, and weird digital experiments. Prehistoric imagination, modern execution.</p>
          <div className="hero-cta">
            <a href="#games" className="btn btn-solid">See What&apos;s Coming</a>
            <a href="https://github.com/john3913/dinosaurai" target="_blank" rel="noopener" className="btn btn-ghost">GitHub →</a>
          </div>
          <div className="scroll-indicator">
            <span>Scroll</span>
            <div className="scroll-line" />
          </div>
        </section>

        {/* Stats */}
        <div className="stats-strip">
          <div className="stat"><span className="stat-n">6</span><span className="stat-l">Games in Dev</span></div>
          <div className="stat-sep" />
          <div className="stat"><span className="stat-n">2</span><span className="stat-l">Apps Building</span></div>
          <div className="stat-sep" />
          <div className="stat"><span className="stat-n">∞</span><span className="stat-l">Wild Ideas</span></div>
          <div className="stat-sep" />
          <div className="stat"><span className="stat-n">0</span><span className="stat-l">Boring Projects</span></div>
        </div>

        {/* Marquee */}
        <div className="marquee-wrap">
          <div className="marquee-track">
            {['Rex Run','Fossil Hunt','Dino Clash','Pangaea','Speed Type','App-a-Day',
              'Rex Run','Fossil Hunt','Dino Clash','Pangaea','Speed Type','App-a-Day'].map((item, i) => (
              <span key={i}><span className="marquee-item">{item}</span><span className="marquee-sep">·</span></span>
            ))}
          </div>
        </div>

        <div className="rule" />

        {/* Games */}
        <div className="section" id="games">
          <div className="section-eyebrow">What We&apos;re Building</div>
          <h2 className="section-h">Games &amp; Apps</h2>
          <p className="section-body">Original titles in development. Launching fast, iterating faster, keeping it fun.</p>
          <div className="games-grid">
            {[
              { color:'green',  icon:'🦖', badge:'Runner · Coming Soon',    title:'Rex Run',    desc:'Infinite dino runner through procedurally generated prehistoric worlds. Obstacles, power-ups, leaderboards.' },
              { color:'orange', icon:'🧩', badge:'Puzzle · In Progress',    title:'Fossil Hunt',desc:'Dig through layers of ancient earth. Uncover complete skeletons before time runs out. Zen but ruthless.' },
              { color:'blue',   icon:'⚡', badge:'Battle · Coming Soon',    title:'Dino Clash', desc:'Real-time dino combat with a herd-building mechanic. Evolve traits, conquer territories, dominate.' },
              { color:'purple', icon:'🌍', badge:'Strategy · Idea Stage',   title:'Pangaea',    desc:'Guide a species through the age of dinosaurs. Survive extinction events, adapt, and dominate the planet.' },
              { color:'green',  icon:'⌨️', badge:'App · In Progress',       title:'Speed Type', desc:'Typing game with real-time multiplayer. Themed word sets, custom races, and global rankings.' },
              { color:'orange', icon:'🎲', badge:'Fun Tool · Coming Soon',  title:'App-a-Day',  desc:'Spin the wheel, get a random micro-app idea, build it in 24 hrs. Weekly community drops.' },
            ].map((c, i) => (
              <div key={i} className={`card card-${c.color} in-view`} style={{ transitionDelay: `${i * 90}ms` }}>
                <span className="card-icon">{c.icon}</span>
                <span className={`card-badge badge-${c.color}`}>{c.badge}</span>
                <div className="card-title">{c.title}</div>
                <p className="card-desc">{c.desc}</p>
                <div className="card-arrow">Play Soon →</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rule" />

        {/* Email signup */}
        <div className="signup-section" id="apps">
          <div className="signup-inner">
            <div className="signup-eyebrow">Early Access</div>
            <h3 className="signup-h">Be first to play.</h3>
            <p className="signup-sub">No spam. Just a note when something launches — usually with a free beta invite.</p>
            {signed ? (
              <p style={{ color: '#7EFF50', fontWeight: 600, fontSize: '1rem' }}>You&apos;re on the list. 🦕</p>
            ) : (
              <form className="signup-form" onSubmit={e => { e.preventDefault(); setSigned(true); }}>
                <input type="email" className="signup-input" placeholder="your@email.com" required />
                <button type="submit" className="signup-btn">Notify Me</button>
              </form>
            )}
          </div>
        </div>

        {/* Manifesto */}
        <div className="manifesto">
          <div className="manifesto-inner">
            <p className="manifesto-quote">
              &ldquo;We make things that are <em>genuinely fun</em> to use.{' '}
              <strong>No bloat. No friction.</strong>{' '}
              Just great games and clever apps that feel <em>alive from the first click.</em>&rdquo;
            </p>
            <a href="#apps" className="btn btn-solid">Join Early Access</a>
          </div>
        </div>

        {/* Footer */}
        <footer>
          <div className="footer-logo">🦕 DINOSAUR<span className="footer-ai">AI</span></div>
          <p className="footer-sub">dinosaurai.vercel.app &nbsp;·&nbsp; 2026</p>
        </footer>

      </div>
    </>
  );
}
