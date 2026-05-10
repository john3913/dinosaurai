'use client';
import { useEffect, useRef } from 'react';
import '../dino.css';
import './team.css';

/* ── Background canvas (same as home) ─────────────────────────────────── */
function BgCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const maybeCanvas = ref.current; if (!maybeCanvas) return;
    const canvas: HTMLCanvasElement = maybeCanvas;
    const ctx = canvas.getContext('2d')!;
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
        nodes.map((n, j) => ({ j, d: Math.hypot(n.x - nodes[i].x, n.y - nodes[i].y) }))
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
    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; build(); }
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

/* ── Bronty pixel art ────────────────────────────────────────────────────── */
function drawBronty(ctx: CanvasRenderingContext2D, x: number, y: number, ps: number, wp: number) {
  ctx.save();
  ctx.translate(x, y);
  const wa = wp * (52 * Math.PI / 180);
  ctx.shadowColor = 'rgba(0,200,255,0.90)';
  ctx.shadowBlur = ps * 4;
  ctx.fillStyle = '#38D4FF';

  const B = (c: number, r: number) => ctx.fillRect(c * ps - ps * 0.5, r * ps - ps * 0.5, ps, ps);
  const W = (c: number, r: number) => ctx.fillRect(c * ps, r * ps, ps, ps);

  // Upper wing
  ctx.save();
  ctx.translate(-3.5 * ps, -1 * ps);
  ctx.rotate(-wa);
  ([
    [0,-1],[0,0],[-1,-1],[-1,0],[-2,-2],[-2,-1],[-3,-2],[-3,-1],
    [-4,-3],[-4,-2],[-4,-1],[-5,-3],[-5,-2],[-5,-1],[-6,-3],[-6,-2],[-6,-1],
    [-7,-2],[-7,-1],[-8,-2],[-8,-1],[-9,-1],[-10,-1],
  ] as [number,number][]).forEach(([c,r]) => W(c,r));
  ctx.restore();

  // Lower wing
  ctx.save();
  ctx.translate(-3.5 * ps, -1 * ps);
  ctx.rotate(wa);
  ([
    [0,0],[0,1],[-1,0],[-1,1],[-2,1],[-2,2],[-3,1],[-3,2],
    [-4,1],[-4,2],[-4,3],[-5,1],[-5,2],[-5,3],[-6,1],[-6,2],[-6,3],
    [-7,1],[-7,2],[-8,1],[-8,2],[-9,1],[-10,1],
  ] as [number,number][]).forEach(([c,r]) => W(c,r));
  ctx.restore();

  // Body, neck, head, tail, legs
  ([
    [-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],[4,-2],[5,-2],
    [-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],
    [-4,0], [-3,0], [-2,0], [-1,0], [0,0], [1,0], [2,0], [3,0], [4,0],
    [-4,1], [-3,1], [-2,1], [-1,1], [0,1], [1,1], [2,1], [3,1], [4,1],
    [-3,2], [-2,2], [-1,2], [0,2],  [1,2], [2,2], [3,2],
    [3,-3],[4,-3],[5,-3],[3,-4],[4,-4],[5,-4],[3,-5],[4,-5],
    [3,-6],[4,-6],[3,-7],[4,-7],
    [3,-8],[4,-8],[5,-8],[6,-8],[4,-9],[5,-9],[6,-9],
    [-5,-1],[-6,-1],[-7,-1],[-5,0],[-6,0],[-7,0],[-7,1],[-8,1],[-9,2],
    [2,3],[3,3],[2,4],[3,4],[2,5],[3,5],
    [-3,3],[-2,3],[-3,4],[-2,4],[-3,5],[-2,5],
  ] as [number,number][]).forEach(([c,r]) => B(c,r));

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#001848';
  B(5, -9);

  ctx.restore();
}

/* ── Bronty animated canvas ──────────────────────────────────────────────── */
function BrontyCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const maybeCanvas = ref.current; if (!maybeCanvas) return;
    const canvas: HTMLCanvasElement = maybeCanvas;
    const ctx = canvas.getContext('2d')!;
    let rafId = 0, dpr = 1, cssW = 0, cssH = 0;

    const stars = Array.from({ length: 88 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 0.3 + Math.random() * 1.3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 2.5,
    }));

    const particles = Array.from({ length: 16 }, (_, i) => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00012,
      vy: -0.00006 - Math.random() * 0.00010,
      r: 0.8 + Math.random() * 1.8,
      color: (['#38D4FF','#00D4FF','#9B5CF6','#7EFF50'] as const)[i % 4],
      phase: Math.random() * Math.PI * 2,
    }));

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width; cssH = rect.height;
      if (cssW > 0 && cssH > 0) {
        canvas.width = cssW * dpr;
        canvas.height = cssH * dpr;
      }
    }
    resize();

    function draw(ts: number) {
      if (cssW === 0 || cssH === 0) { rafId = requestAnimationFrame(draw); return; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      // Deep space background
      const bg = ctx.createRadialGradient(cssW * 0.5, cssH * 0.38, 0, cssW * 0.5, cssH * 0.5, Math.max(cssW, cssH) * 0.95);
      bg.addColorStop(0, 'rgba(0,16,40,1)');
      bg.addColorStop(0.4, 'rgba(2,9,22,1)');
      bg.addColorStop(1, 'rgba(1,3,10,1)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cssW, cssH);

      // Aurora nebula
      const aX = cssW * 0.5, aY = cssH * 0.44;
      const aurora = ctx.createRadialGradient(aX, aY, 0, aX, aY, cssW * 0.75);
      aurora.addColorStop(0,   'rgba(0,110,220,0.13)');
      aurora.addColorStop(0.3, 'rgba(90,40,210,0.08)');
      aurora.addColorStop(0.6, 'rgba(0,180,255,0.04)');
      aurora.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = aurora;
      ctx.fillRect(0, 0, cssW, cssH);

      // Secondary aurora pulse
      const pulse = 0.5 + 0.5 * Math.sin(ts * 0.0005);
      const a2 = ctx.createRadialGradient(cssW * 0.6, cssH * 0.3, 0, cssW * 0.6, cssH * 0.3, cssW * 0.5);
      a2.addColorStop(0, `rgba(155,92,246,${0.06 * pulse})`);
      a2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = a2;
      ctx.fillRect(0, 0, cssW, cssH);

      // Stars
      stars.forEach(s => {
        const blink = 0.2 + 0.8 * Math.abs(Math.sin(ts * 0.001 * s.speed + s.phase));
        ctx.save();
        ctx.globalAlpha = blink * 0.7;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x * cssW, s.y * cssH, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      const floatY = Math.sin(ts * 0.0018) * 11;
      const wp = Math.sin(ts * 0.003);
      const cx = cssW * 0.52, cy = cssH * 0.46 + floatY;
      const ps = Math.max(5, Math.floor(cssW / 28));

      // Soft under-glow
      const ug = ctx.createRadialGradient(cx, cy + ps * 5, 0, cx, cy + ps * 5, ps * 14);
      ug.addColorStop(0, 'rgba(0,180,255,0.13)');
      ug.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ug;
      ctx.fillRect(0, 0, cssW, cssH);

      // Wide bloom behind character
      const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, ps * 18);
      bloom.addColorStop(0, 'rgba(56,212,255,0.07)');
      bloom.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, cssW, cssH);

      drawBronty(ctx, cx, cy, ps, wp);

      // Drifting particles
      particles.forEach(p => {
        p.x = ((p.x + p.vx + 1) % 1);
        p.y = ((p.y + p.vy + 1) % 1);
        const pa = 0.15 + 0.85 * Math.abs(Math.sin(ts * 0.0007 + p.phase));
        ctx.save();
        ctx.globalAlpha = pa * 0.42;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x * cssW, p.y * cssH, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    return () => { cancelAnimationFrame(rafId); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  );
}

/* ── Stat bar ────────────────────────────────────────────────────────────── */
function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="stat-bar">
      <span className="stat-bar-label">{label}</span>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" style={{
          width: `${value * 10}%`,
          background: `linear-gradient(90deg, ${color}, ${color}99)`,
          boxShadow: `0 0 8px ${color}55`,
        }} />
      </div>
      <span className="stat-bar-val">{value}/10</span>
    </div>
  );
}

/* ── Locked character slot ───────────────────────────────────────────────── */
function LockedCard({ num, game, color }: { num: string; game: string; color: string }) {
  return (
    <div className="locked-card" style={{
      '--c':   color,
      '--c05': `${color}0D`,
      '--c12': `${color}1F`,
      '--c20': `${color}33`,
      '--c45': `${color}73`,
    } as React.CSSProperties}>
      <div className="locked-topbar" />
      <span className="locked-num">{num}</span>
      <div className="locked-glyph">?</div>
      <div className="locked-game">{game}</div>
      <div className="locked-badge">CLASSIFIED</div>
    </div>
  );
}

/* ── Pixel field ─────────────────────────────────────────────────────────── */
const PX_COLORS = ['#7EFF50', '#FF6B35', '#00D4FF', '#9B5CF6', '#BBFF70'];
const PIXELS = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 3.7 + 1.1) % 100}vw`,
  color: PX_COLORS[i % PX_COLORS.length],
  duration: `${14 + (i * 1.1) % 22}s`,
  delay: `${(i * 0.9) % 24}s`,
}));

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function TeamPage() {
  return (
    <>
      <BgCanvas />
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
          <a className="nav-link" href="/">Home</a>
          <a className="nav-link" href="/dinotetris">Games</a>
          <a className="nav-link team-active" href="/team">Team</a>
          <a className="nav-link" href="/agenticstudio">AgenticStudio</a>
          <button className="nav-btn">Early Access</button>
        </nav>

        {/* Hero */}
        <section className="team-hero">
          <div className="hero-tag">🦕 Character Roster</div>
          <h1 className="wordmark">MEET THE <span className="serif-ai">CREW</span></h1>
          <p className="hero-sub">
            The prehistoric legends powering every game. Each one&apos;s a handful. All of them are iconic.
          </p>
        </section>

        {/* ── Featured: Bronty ─────────────────────────────── */}
        <div className="featured-outer">
          <div className="featured-card">
            <div className="featured-canvas-side">
              <BrontyCanvas />
              <div className="featured-canvas-fade" />
            </div>

            <div className="featured-info-side">
              <div className="char-meta-row">
                <span className="char-num">#001</span>
                <span className="char-status">ACTIVE</span>
              </div>

              <h2 className="char-name">BRONTY</h2>
              <div className="char-subtitle">The Original Flier</div>

              <div className="char-game-pill">
                <span className="game-dot" />
                DinoSoar
              </div>

              <p className="char-lore">
                First off the bench. Bronty launched this whole operation — a big-hearted sauropod who flaps her
                prehistoric wings against gravity, pipes, and the crushing weight of expectation. She&apos;s been
                through it. She keeps flying anyway.
              </p>

              <div className="char-stats-block">
                <div className="stats-label">STATS</div>
                <StatBar label="Speed"    value={7}  color="#38D4FF" />
                <StatBar label="Style"    value={9}  color="#38D4FF" />
                <StatBar label="Grit"     value={8}  color="#38D4FF" />
                <StatBar label="Wingspan" value={10} color="#38D4FF" />
              </div>

              <div className="char-power">
                <span className="power-eyebrow">SIGNATURE MOVE</span>
                <div className="power-name">Wing Flap</div>
                <p className="power-desc">Defies gravity with sheer prehistoric enthusiasm. One flap at a time.</p>
              </div>

              <a href="/dinosoar.html" className="btn btn-blue char-cta">Play DinoSoar →</a>
            </div>
          </div>
        </div>

        <div className="rule" />

        {/* ── Locked roster ──────────────────────────────────── */}
        <div className="section" id="roster">
          <div className="section-eyebrow">Roster</div>
          <h2 className="section-h">More Characters Incoming</h2>
          <p className="section-body">The crew is expanding. Each new game brings a new legend. Who&apos;s next?</p>
          <div className="locked-grid">
            <LockedCard num="#002" game="Rex Run"     color="#FF6B35" />
            <LockedCard num="#003" game="Fossil Hunt" color="#9B5CF6" />
            <LockedCard num="#004" game="Dino Clash"  color="#00D4FF" />
            <LockedCard num="#005" game="DinoTris"    color="#7EFF50" />
            <LockedCard num="#006" game="Speed Type"  color="#BBFF70" />
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
