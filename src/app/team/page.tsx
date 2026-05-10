'use client';
import { useEffect, useRef } from 'react';
import '../dino.css';
import './team.css';

type DrawFn = (ctx: CanvasRenderingContext2D, cx: number, cy: number, ps: number, ts: number) => void;
type CharData = {
  num: string; name: string; subtitle: string; game: string; lore: string;
  stats: { label: string; value: number }[];
  power: { name: string; desc: string };
  color: string; auroraRgb: string; nameGrad: string;
  cta?: { label: string; href: string };
  draw: DrawFn;
};

/* ── Background canvas ────────────────────────────────────────────────────── */
function BgCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const maybeCanvas = ref.current; if (!maybeCanvas) return;
    const canvas: HTMLCanvasElement = maybeCanvas;
    const ctx = canvas.getContext('2d')!;
    const COLORS = ['#7EFF50','#00D4FF','#FF6B35','#9B5CF6'];
    type Pt = { x:number; y:number };
    type Edge = { a:Pt; b:Pt };
    type Spark = { edge:Edge; t:number; speed:number; color:string; trailLen:number };
    let nodes:Pt[]=[], edges:Edge[]=[], sparks:Spark[]=[];
    let W=0,H=0,rafId=0;
    const mouse:Pt={x:-1,y:-1};
    const onMove=(e:MouseEvent)=>{mouse.x=e.clientX;mouse.y=e.clientY;};
    function build(){
      nodes=[];edges=[];sparks=[];
      const count=Math.max(20,Math.floor(W*H/65000));
      for(let i=0;i<count;i++) nodes.push({x:Math.random()*W,y:Math.random()*H});
      const edgeSet=new Set<string>();
      for(let i=0;i<nodes.length;i++){
        nodes.map((n,j)=>({j,d:Math.hypot(n.x-nodes[i].x,n.y-nodes[i].y)}))
          .filter(r=>r.j!==i).sort((a,b)=>a.d-b.d).slice(0,3)
          .forEach(r=>{const key=Math.min(i,r.j)+'_'+Math.max(i,r.j);if(!edgeSet.has(key)){edgeSet.add(key);edges.push({a:nodes[i],b:nodes[r.j]});}});
      }
      edges.forEach(e=>{if(Math.random()>0.25)sparks.push({edge:e,t:Math.random(),speed:0.0003+Math.random()*0.0006,color:COLORS[Math.floor(Math.random()*COLORS.length)],trailLen:0.07+Math.random()*0.09});});
    }
    function draw(){
      ctx.clearRect(0,0,W,H);
      if(mouse.x>=0){const g=ctx.createRadialGradient(mouse.x,mouse.y,0,mouse.x,mouse.y,180);g.addColorStop(0,'rgba(126,255,80,0.05)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
      ctx.lineWidth=1;
      edges.forEach(e=>{ctx.beginPath();ctx.strokeStyle='rgba(126,255,80,0.045)';ctx.moveTo(e.a.x,e.a.y);ctx.lineTo(e.b.x,e.b.y);ctx.stroke();});
      nodes.forEach(n=>{ctx.beginPath();ctx.fillStyle='rgba(126,255,80,0.08)';ctx.arc(n.x,n.y,1.5,0,Math.PI*2);ctx.fill();});
      sparks.forEach(s=>{
        s.t+=s.speed;
        if(s.t>1+s.trailLen){s.edge=edges[Math.floor(Math.random()*edges.length)];s.t=0;s.color=COLORS[Math.floor(Math.random()*COLORS.length)];s.speed=0.0003+Math.random()*0.0006;s.trailLen=0.07+Math.random()*0.09;}
        const tH=Math.min(1,s.t),tT=Math.max(0,s.t-s.trailLen);if(tH<=tT)return;
        const{a,b}=s.edge;
        const x1=a.x+(b.x-a.x)*tT,y1=a.y+(b.y-a.y)*tT,x2=a.x+(b.x-a.x)*tH,y2=a.y+(b.y-a.y)*tH;
        const alpha=tH<0.1?tH/0.1:(s.t>0.9?(1-(s.t-0.9)/0.1):1);
        ctx.save();ctx.globalAlpha=Math.max(0,alpha)*0.85;ctx.shadowColor=s.color;ctx.shadowBlur=8;ctx.strokeStyle=s.color;ctx.lineWidth=1.6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();
      });
      rafId=requestAnimationFrame(draw);
    }
    function resize(){W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight;build();}
    window.addEventListener('mousemove',onMove);window.addEventListener('resize',resize);resize();rafId=requestAnimationFrame(draw);
    return()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('resize',resize);cancelAnimationFrame(rafId);};
  },[]);
  return <canvas ref={ref} className="bg-canvas"/>;
}

/* ── Shared wing coords ───────────────────────────────────────────────────── */
const WU:readonly[number,number][] = [[0,-1],[0,0],[-1,-1],[-1,0],[-2,-2],[-2,-1],[-3,-2],[-3,-1],[-4,-3],[-4,-2],[-4,-1],[-5,-3],[-5,-2],[-5,-1],[-6,-3],[-6,-2],[-6,-1],[-7,-2],[-7,-1],[-8,-2],[-8,-1],[-9,-1],[-10,-1]];
const WL:readonly[number,number][] = [[0,0],[0,1],[-1,0],[-1,1],[-2,1],[-2,2],[-3,1],[-3,2],[-4,1],[-4,2],[-4,3],[-5,1],[-5,2],[-5,3],[-6,1],[-6,2],[-6,3],[-7,1],[-7,2],[-8,1],[-8,2],[-9,1],[-10,1]];

function wings(ctx:CanvasRenderingContext2D, ps:number, wa:number, px:number, py:number){
  const W=(c:number,r:number)=>ctx.fillRect(c*ps,r*ps,ps,ps);
  ctx.save();ctx.translate(px,py);ctx.rotate(-wa);WU.forEach(([c,r])=>W(c,r));ctx.restore();
  ctx.save();ctx.translate(px,py);ctx.rotate(wa);WL.forEach(([c,r])=>W(c,r));ctx.restore();
}

/* ── Pixel art: Bronty ────────────────────────────────────────────────────── */
const drawBrontyFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0018)*11, wa=Math.sin(ts*0.003)*(52*Math.PI/180);
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.shadowColor='rgba(0,200,255,0.9)';ctx.shadowBlur=ps*4;ctx.fillStyle='#38D4FF';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  wings(ctx,ps,wa,-3.5*ps,-ps);
  ([ [-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],[4,-2],[5,-2],
     [-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],
     [-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],
     [-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1],
     [-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],[3,2],
     [3,-3],[4,-3],[5,-3],[3,-4],[4,-4],[5,-4],[3,-5],[4,-5],[3,-6],[4,-6],[3,-7],[4,-7],
     [3,-8],[4,-8],[5,-8],[6,-8],[4,-9],[5,-9],[6,-9],
     [-5,-1],[-6,-1],[-7,-1],[-5,0],[-6,0],[-7,0],[-7,1],[-8,1],[-9,2],
     [2,3],[3,3],[2,4],[3,4],[2,5],[3,5],[-3,3],[-2,3],[-3,4],[-2,4],[-3,5],[-2,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#001848';B(5,-9);
  ctx.restore();
};

/* ── Pixel art: Rexx (T-Rex) ──────────────────────────────────────────────── */
const drawRexxFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.002)*8;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.shadowColor='rgba(126,255,80,0.9)';ctx.shadowBlur=ps*4;ctx.fillStyle='#7EFF50';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ([
    // skull
    [3,-9],[4,-9],[5,-9],
    [2,-8],[3,-8],[4,-8],[5,-8],[6,-8],
    [1,-7],[2,-7],[3,-7],[4,-7],[5,-7],[6,-7],
    [1,-6],[2,-6],[3,-6],[4,-6],[5,-6],
    // upper jaw — extends throat left so skull connects to neck
    [1,-5],[2,-5],[3,-5],[4,-5],[5,-5],[6,-5],[7,-5],
    // row -4: throat solid on left, mouth gap on right (cols 4-7 open)
    [1,-4],[2,-4],[3,-4],
    // lower jaw + throat
    [1,-3],[2,-3],[3,-3],[4,-3],[5,-3],[6,-3],[7,-3],
    // neck
    [1,-2],[2,-2],[3,-2],
    [0,-1],[1,-1],[2,-1],[3,-1],
    // body
    [-1,0],[0,0],[1,0],[2,0],[3,0],
    [-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],
    [-2,2],[-1,2],[0,2],[1,2],[2,2],
    [-1,3],[0,3],[1,3],[2,3],
    // tiny arm
    [4,0],[5,0],[5,1],
    // tail
    [-3,1],[-4,1],[-5,1],
    [-3,2],[-4,2],[-5,2],[-6,2],
    [-5,3],[-6,3],[-7,3],[-7,4],
    // thighs
    [-1,4],[0,4],[1,4],[2,4],
    [-1,5],[0,5],[1,5],[2,5],
    // lower legs
    [-1,6],[0,6],[1,6],[2,6],
    // feet
    [-2,7],[-1,7],[0,7],
    [1,7],[2,7],[3,7],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#051400';B(5,-7);
  ctx.restore();
};

/* ── Pixel art: Ptera (Pterodactyl) ───────────────────────────────────────── */
const drawPteraFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.002)*9, wa=Math.sin(ts*0.0035)*(50*Math.PI/180);
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.shadowColor='rgba(155,92,246,0.9)';ctx.shadowBlur=ps*4;ctx.fillStyle='#9B5CF6';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  wings(ctx,ps,wa,-3*ps,-ps);
  ([
    // compact body
    [-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],
    [-2,0],[-1,0],[0,0],[1,0],[2,0],
    [-1,1],[0,1],[1,1],
    [0,2],[-1,2],
    // head crest (shoots left)
    [-1,-3],[-2,-3],[-3,-3],[-4,-3],[-5,-3],
    [-1,-4],[-2,-4],[-3,-4],
    // head (right side of body)
    [2,-2],[3,-2],[4,-2],
    [2,-3],[3,-3],[4,-3],
    // long beak (far right)
    [5,-3],[6,-3],[7,-3],[8,-3],
    [5,-2],[6,-2],
    // feet
    [0,3],[1,3],[-1,3],
    [1,4],[2,4],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#0a001a';B(3,-3);
  ctx.restore();
};

/* ── Pixel art: Klaw (Velociraptor) ──────────────────────────────────────── */
const drawKlawFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0022)*7;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.shadowColor='rgba(255,107,53,0.9)';ctx.shadowBlur=ps*4;ctx.fillStyle='#FF6B35';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ([
    // skull (elongated, narrow — classic velociraptor profile)
    [3,-9],[4,-9],[5,-9],
    [2,-8],[3,-8],[4,-8],[5,-8],[6,-8],
    [1,-7],[2,-7],[3,-7],[4,-7],[5,-7],[6,-7],[7,-7],
    // upper jaw (long snout extending right)
    [2,-6],[3,-6],[4,-6],[5,-6],[6,-6],[7,-6],[8,-6],
    [4,-5],[5,-5],[6,-5],[7,-5],[8,-5],[9,-5],
    // ← OPEN MOUTH at row -4: neck on left only, right side is jaw gap →
    [0,-4],[1,-4],[2,-4],[3,-4],
    // lower jaw + neck row -3
    [-1,-3],[0,-3],[1,-3],[2,-3],
    [5,-3],[6,-3],[7,-3],[8,-3],[9,-3],
    // chin
    [6,-2],[7,-2],[8,-2],
    // body (pitched forward, compact)
    [-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],
    [-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],
    [-2,1],[-1,1],[0,1],[1,1],[2,1],
    [-1,2],[0,2],[1,2],[2,2],
    // arms (three-fingered, outstretched)
    [4,-2],[5,-2],[6,-2],
    [6,-1],[7,-1],
    [7,-2],[8,-1],[7,0],
    // tail (stiff horizontal — ossified tendons)
    [-4,-1],[-5,-1],[-6,-1],[-7,-1],[-8,-1],[-9,-1],
    [-4,0],[-5,0],[-6,0],[-7,0],[-8,0],[-9,0],[-10,0],
    [-4,1],[-5,1],[-6,1],[-7,1],[-8,1],
    // front leg (left, raised running stride)
    [-2,3],[-1,3],[0,3],
    [-1,4],[0,4],
    [-1,5],[0,5],
    // SICKLE CLAW — killing claw on front foot
    [-2,5],[-3,5],[-4,5],[-4,4],[-5,4],
    // back leg (right, planted)
    [1,3],[2,3],[3,3],
    [2,4],[3,4],
    [1,5],[2,5],[3,5],[4,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1a0500';B(5,-7);
  ctx.restore();
};

/* ── Pixel art: Spikes (Stegosaurus) ─────────────────────────────────────── */
const drawSpikesFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0015)*7;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#BBFF70';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  // Back plates — extra bright glow for the iconic dorsal plates
  ctx.shadowColor='rgba(187,255,112,0.9)';ctx.shadowBlur=ps*7;
  ([
    [-5,-4],[-5,-3],[-5,-2],
    [-3,-6],[-3,-5],[-3,-4],[-3,-3],[-3,-2],
    [-1,-4],[-1,-3],[-1,-2],
    [1,-6],[1,-5],[1,-4],[1,-3],[1,-2],
    [3,-4],[3,-3],[3,-2],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    // body (wide horizontal quadruped)
    [-7,-1],[-6,-1],[-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],
    [-8,0],[-7,0],[-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],
    [-8,1],[-7,1],[-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],
    [-7,2],[-6,2],[-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],[3,2],[4,2],
    // head (small, right)
    [5,-2],[6,-2],[7,-2],
    [6,-1],[7,-1],[8,-1],
    [7,0],[8,0],
    // tail (left, tapering)
    [-9,-1],[-10,-1],
    [-9,0],[-10,0],[-11,0],
    [-9,1],[-10,1],[-11,1],
    [-10,2],
    // thagomizer spikes
    [-11,-2],[-12,-1],
    [-11,2],[-12,1],
    // front legs
    [2,3],[3,3],[2,4],[3,4],[2,5],[3,5],
    // rear legs
    [-5,3],[-4,3],[-5,4],[-4,4],[-5,5],[-4,5],
    // feet
    [1,6],[2,6],[3,6],[4,6],
    [-6,6],[-5,6],[-4,6],[-3,6],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#0a1400';B(7,-1);
  ctx.restore();
};

/* ── Pixel art: Stegatlantis (Stegosaurus) ──────────────────────────────── */
const drawStegatlantisfn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0014)*7;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#06D6A0';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  // Taller plates — extra bright glow
  ctx.shadowColor='rgba(6,214,160,0.9)';ctx.shadowBlur=ps*7;
  ([
    [-5,-5],[-5,-4],[-5,-3],[-5,-2],
    [-3,-7],[-3,-6],[-3,-5],[-3,-4],[-3,-3],[-3,-2],
    [-1,-5],[-1,-4],[-1,-3],[-1,-2],
    [1,-7],[1,-6],[1,-5],[1,-4],[1,-3],[1,-2],
    [3,-5],[3,-4],[3,-3],[3,-2],
    [5,-4],[5,-3],[5,-2],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [-7,-1],[-6,-1],[-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],
    [-8,0],[-7,0],[-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],
    [-8,1],[-7,1],[-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],
    [-7,2],[-6,2],[-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],[3,2],[4,2],
    [5,-2],[6,-2],[7,-2],
    [6,-1],[7,-1],[8,-1],
    [7,0],[8,0],
    [-9,0],[-10,0],[-11,0],
    [-9,1],[-10,1],[-11,1],
    [-10,2],
    [-11,-2],[-12,-1],
    [-11,2],[-12,1],
    [2,3],[3,3],[2,4],[3,4],[2,5],[3,5],
    [-5,3],[-4,3],[-5,4],[-4,4],[-5,5],[-4,5],
    [1,6],[2,6],[3,6],[4,6],
    [-6,6],[-5,6],[-4,6],[-3,6],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#001a0f';B(7,-1);
  ctx.restore();
};

/* ── Pixel art: Tricerapop (Triceratops) ────────────────────────────────── */
const drawTricerapopFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0012)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#FF2D78';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  // Frill — extra bright glow, the iconic triceratops shield
  ctx.shadowColor='rgba(255,45,120,0.9)';ctx.shadowBlur=ps*7;
  ([
    [3,-8],[4,-8],
    [2,-7],[3,-7],[4,-7],[5,-7],
    [1,-6],[2,-6],[3,-6],[4,-6],[5,-6],[6,-6],
    [1,-5],[2,-5],[3,-5],[4,-5],[5,-5],[6,-5],
    [1,-4],[2,-4],[3,-4],[4,-4],[5,-4],[6,-4],
    [2,-3],[3,-3],[4,-3],[5,-3],[6,-3],
    [3,-2],[4,-2],[5,-2],[6,-2],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    // body (massive quadruped)
    [-7,-1],[-6,-1],[-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],
    [-8,0],[-7,0],[-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],
    [-8,1],[-7,1],[-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],
    [-7,2],[-6,2],[-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],
    // head (large skull connecting to body)
    [4,-3],[5,-3],[6,-3],[7,-3],
    [4,-2],[5,-2],[6,-2],[7,-2],[8,-2],
    [4,-1],[5,-1],[6,-1],[7,-1],[8,-1],
    [4,0],[5,0],[6,0],[7,0],[8,0],
    [5,1],[6,1],[7,1],
    // snout / beak
    [8,-1],[9,-1],[10,-1],
    [8,0],[9,0],[10,0],
    [9,1],[10,1],[11,1],
    [10,2],
    // upper brow horn (long, angles up)
    [7,-4],[8,-4],[9,-4],[10,-4],[10,-5],[11,-5],
    // nose horn (short, forward from snout)
    [11,0],[12,0],[12,-1],
    // tail (short — triceratops had a stubby tail)
    [-9,0],[-10,0],
    [-9,1],[-10,1],
    // front legs
    [0,3],[1,3],[0,4],[1,4],[0,5],[1,5],
    // rear legs
    [-5,3],[-6,3],[-5,4],[-6,4],[-5,5],[-6,5],
    // feet
    [-1,6],[0,6],[1,6],[2,6],
    [-7,6],[-6,6],[-5,6],[-4,6],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1a0007';B(7,-1);
  ctx.restore();
};

/* ── Pixel art: Mossy (Mosasaurus) ─────────────────────────────────────────── */
const drawMossyfn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0009)*5;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#00843D';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(0,132,61,0.9)';ctx.shadowBlur=ps*4;
  // ── long streamlined body ──
  ([
    [-10,-1],[-9,-1],[-8,-1],[-7,-1],[-6,-1],[-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-11,0],[-10,0],[-9,0],[-8,0],[-7,0],[-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],
    [-10,1],[-9,1],[-8,1],[-7,1],[-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  // ── skull ──
  ([
    [3,-4],[4,-4],[5,-4],[6,-4],[7,-4],
    [3,-3],[4,-3],[5,-3],[6,-3],[7,-3],[8,-3],
    [3,-2],[4,-2],[5,-2],[6,-2],[7,-2],[8,-2],[9,-2],
    // upper jaw extends far right
    [7,-1],[8,-1],[9,-1],[10,-1],[11,-1],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  // ── open mouth: throat left, gap center, lower jaw right ──
  ([
    // throat (left continuous)
    [3,0],[4,0],[5,0],
    // lower jaw
    [7,1],[8,1],[9,1],[10,1],[11,1],[12,1],
    // lower jaw tip curls up
    [11,0],[12,0],
    // chin
    [8,2],[9,2],[10,2],[11,2],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  // ── front upper flipper ──
  ([
    [-1,-2],[0,-2],[1,-2],[2,-2],
    [0,-3],[1,-3],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  // ── front lower flipper ──
  ([
    [-1,2],[0,2],[1,2],[2,2],
    [0,3],[1,3],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  // ── rear upper flipper ──
  ([
    [-7,-2],[-6,-2],[-5,-2],
    [-6,-3],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  // ── rear lower flipper ──
  ([
    [-7,2],[-6,2],[-5,2],
    [-6,3],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  // ── tail taper ──
  ([
    [-11,-1],[-12,0],[-13,0],
    [-12,1],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  // ── forked tail fin ──
  ctx.shadowBlur=ps*7;
  ([
    [-13,-1],[-14,-1],[-14,-2],
    [-13,1],[-14,1],[-14,2],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#001a0d';B(6,-3);
  ctx.restore();
};

/* ── Pixel art: Pyrannosaurus (Fire T-Rex) ──────────────────────────────── */
const drawPyrannFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#DC143C';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(255,140,0,0.95)';ctx.shadowBlur=ps*9;
  ([[-1,-9],[0,-9],[1,-9],[-2,-8],[-1,-8],[0,-8],[1,-8],[2,-8]] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowColor='rgba(220,20,60,0.9)';ctx.shadowBlur=ps*4;
  ([
    [-2,-7],[-1,-7],[0,-7],[1,-7],[2,-7],[3,-7],
    [-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],[4,-6],[5,-6],
    [-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],[4,-5],[5,-5],[6,-5],[7,-5],
    [-1,-4],[0,-4],[1,-4],[2,-4],
    [3,-4],[4,-4],[5,-4],[6,-4],[7,-4],[8,-4],
    [-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],
    [4,-3],[5,-3],[6,-3],[7,-3],[8,-3],[9,-3],
    [-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],
    [-6,-1],[-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-7,0],[-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],
    [-7,1],[-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],
    [-6,2],[-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],
    [3,-1],[4,-1],[4,0],
    [-8,0],[-9,0],[-10,0],[-10,1],[-11,1],[-12,1],
    [-1,3],[0,3],[1,3],[-4,3],[-3,3],[-2,3],
    [-1,4],[0,4],[1,4],[2,4],[-5,4],[-4,4],[-3,4],[-2,4],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#FF4400';B(1,-5);
  ctx.restore();
};

/* ── Pixel art: Anky (Ankylosaurus) ─────────────────────────────────────── */
const drawAnkyFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0008)*4;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#C4873A';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(196,135,58,0.95)';ctx.shadowBlur=ps*8;
  ([[-12,-1],[-13,-1],[-14,0],[-13,0],[-12,0],[-13,1],[-12,1]] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*5;
  ([[-7,-3],[-5,-3],[-3,-3],[-1,-3],[1,-3],[3,-3],[5,-3]] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [-8,-2],[-7,-2],[-6,-2],[-5,-2],[-4,-2],[-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],[4,-2],[5,-2],[6,-2],
    [-9,-1],[-8,-1],[-7,-1],[-6,-1],[-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],[5,-1],[6,-1],[7,-1],
    [-10,0],[-9,0],[-8,0],[-7,0],[-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],
    [-10,1],[-9,1],[-8,1],[-7,1],[-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],
    [-9,2],[-8,2],[-7,2],[-6,2],[-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],
    [-10,-1],[-11,0],[-11,1],
    [7,-2],[8,-2],[9,-2],
    [8,-1],[9,-1],[10,-1],
    [8,0],[9,0],[10,0],[11,0],
    [9,1],[10,1],
    [4,3],[5,3],[4,4],[5,4],
    [0,3],[1,3],[0,4],[1,4],
    [-4,3],[-3,3],[-4,4],[-3,4],
    [-8,3],[-7,3],[-8,4],[-7,4],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#2A1800';B(9,-1);
  ctx.restore();
};

/* ── Pixel art: Pachy (Pachycephalosaurus) ──────────────────────────────── */
const drawPachyFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0013)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#E8D44D';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(232,212,77,0.95)';ctx.shadowBlur=ps*8;
  ([
    [-1,-8],[0,-8],[1,-8],
    [-2,-7],[-1,-7],[0,-7],[1,-7],[2,-7],
    [-3,-6],[-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],
    [-3,-5],[-2,-5],[-1,-5],[0,-5],[1,-5],[2,-5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [-1,-4],[0,-4],[1,-4],[2,-4],
    [-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],[4,-3],
    [3,-2],[4,-2],[5,-2],[6,-2],
    [4,-1],[5,-1],[6,-1],[7,-1],
    [5,0],[6,0],
    [-1,-2],[0,-2],[1,-2],
    [-1,-1],[0,-1],[1,-1],
    [-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],
    [-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],
    [-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],
    [-2,2],[-1,2],[0,2],[1,2],[2,2],
    [4,-1],[5,-1],[5,0],[6,0],
    [-4,1],[-5,1],[-6,2],[-7,2],[-8,3],
    [0,3],[1,3],[2,3],[-1,3],[-2,3],
    [0,4],[1,4],[-1,4],[-2,4],
    [-1,5],[0,5],[1,5],[2,5],[-3,5],[-2,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A1200';B(1,-4);
  ctx.restore();
};

/* ── Pixel art: Parasol (Parasaurolophus) ───────────────────────────────── */
const drawParasolFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0011)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#F4845F';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(244,132,95,0.95)';ctx.shadowBlur=ps*8;
  ([
    [-10,-6],[-9,-6],[-8,-6],[-7,-6],[-6,-6],[-5,-6],[-4,-6],[-3,-6],[-2,-6],[-1,-6],
    [-10,-5],[-9,-5],[-8,-5],[-7,-5],[-6,-5],[-5,-5],[-4,-5],[-3,-5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [-2,-5],[-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],
    [-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],[4,-4],[5,-4],
    [0,-3],[1,-3],[2,-3],[3,-3],[4,-3],[5,-3],[6,-3],
    [5,-2],[6,-2],[7,-2],[8,-2],
    [5,-1],[6,-1],[7,-1],[8,-1],
    [6,0],[7,0],
    [-1,-2],[0,-2],[1,-2],
    [-1,-1],[0,-1],[1,-1],
    [-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],
    [-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],
    [-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],
    [-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],
    [4,-1],[5,-1],[5,0],
    [-5,1],[-6,2],[-7,2],[-8,3],[-9,3],
    [0,3],[1,3],[2,3],[-1,3],[-2,3],
    [0,4],[1,4],[-1,4],
    [-1,5],[0,5],[1,5],[2,5],[-2,5],[-3,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A0800';B(2,-4);
  ctx.restore();
};

/* ── Pixel art: Spinos (Spinosaurus) ────────────────────────────────────── */
const drawSpinosFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#7C3AED';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(124,58,237,0.95)';ctx.shadowBlur=ps*8;
  ([
    [-4,-5],[-4,-4],[-4,-3],
    [-2,-7],[-2,-6],[-2,-5],[-2,-4],[-2,-3],
    [0,-9],[0,-8],[0,-7],[0,-6],[0,-5],[0,-4],[0,-3],
    [2,-6],[2,-5],[2,-4],[2,-3],
    [4,-4],[4,-3],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*3;
  ([[-3,-4],[-3,-3],[-1,-6],[-1,-5],[-1,-4],[-1,-3],[1,-6],[1,-5],[1,-4],[1,-3],[3,-4],[3,-3]] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [3,-3],[4,-3],[5,-3],[6,-3],[7,-3],[8,-3],[9,-3],
    [4,-4],[5,-4],[6,-4],[7,-4],
    [3,-2],[4,-2],[5,-2],[6,-2],[7,-2],[8,-2],[9,-2],[10,-2],[11,-2],
    [4,-1],[5,-1],[6,-1],[7,-1],[8,-1],[9,-1],[10,-1],[11,-1],
    [5,0],[6,0],[7,0],[8,0],[9,0],[10,0],
    [-4,-2],[-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],
    [-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],
    [-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],
    [-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],
    [-3,2],[-2,2],[-1,2],[0,2],
    [2,-2],[3,-2],[3,-1],[4,-1],[4,0],
    [-5,1],[-6,2],[-7,2],[-8,2],[-9,3],[-10,3],[-11,3],
    [-1,3],[0,3],[1,3],[-2,3],[-3,3],
    [-1,4],[0,4],[-2,4],
    [-2,5],[-1,5],[0,5],[1,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A0040';B(6,-3);
  ctx.restore();
};

/* ── Pixel art: Magmadon (volcanic quad) ────────────────────────────────── */
const drawMagmadonFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0009)*5;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#FF4500';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(255,220,0,0.95)';ctx.shadowBlur=ps*9;
  ([[-6,-3],[-3,-3],[0,-3],[3,-3],[6,-3]] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowColor='rgba(255,69,0,0.9)';ctx.shadowBlur=ps*4;
  ([
    [-7,-2],[-6,-2],[-5,-2],[-4,-2],[-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],[4,-2],[5,-2],[6,-2],[7,-2],
    [-8,-1],[-7,-1],[-6,-1],[-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],[5,-1],[6,-1],[7,-1],
    [-9,0],[-8,0],[-7,0],[-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],
    [-9,1],[-8,1],[-7,1],[-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],
    [-8,2],[-7,2],[-6,2],[-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],
    [8,-2],[9,-2],[10,-2],[8,-1],[9,-1],[10,-1],[11,-1],[9,0],[10,0],[11,0],[12,0],[10,1],[11,1],
    [-10,0],[-11,0],[-12,0],[-12,1],[-11,1],
    [3,3],[4,3],[3,4],[4,4],[0,3],[1,3],[0,4],[1,4],[-4,3],[-3,3],[-4,4],[-3,4],[-7,3],[-6,3],[-7,4],[-6,4],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A0500';B(10,-1);
  ctx.restore();
};

/* ── Pixel art: Volcanus (Ceratosaurus fire horn) ───────────────────────── */
const drawVolcanusFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#FF8800';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(255,220,0,0.95)';ctx.shadowBlur=ps*9;
  ([[-1,-9],[0,-9],[0,-8],[1,-8]] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowColor='rgba(255,136,0,0.9)';ctx.shadowBlur=ps*4;
  ([
    [-2,-7],[-1,-7],[0,-7],[1,-7],[2,-7],[3,-7],
    [-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],[4,-6],[5,-6],
    [-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],[4,-5],[5,-5],[6,-5],
    [-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],[4,-4],[5,-4],[6,-4],[7,-4],
    [-1,-3],[0,-3],[1,-3],[2,-3],[4,-3],[5,-3],[6,-3],[7,-3],[8,-3],
    [-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],
    [-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],
    [-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],
    [-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],
    [3,-1],[4,-1],[4,0],[5,0],
    [-7,0],[-8,0],[-9,1],[-10,1],[-11,1],
    [-1,3],[0,3],[1,3],[-3,3],[-2,3],[-1,4],[0,4],[-3,4],[-2,4],
    [-1,5],[0,5],[1,5],[-2,5],[-3,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A0500';B(1,-5);
  ctx.restore();
};

/* ── Pixel art: Plesia (Plesiosaurus long neck) ─────────────────────────── */
const drawPlesiaFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*5;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#1E90FF';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(30,144,255,0.9)';ctx.shadowBlur=ps*4;
  ([
    [2,-8],[3,-8],[2,-7],[3,-7],[1,-6],[2,-6],[3,-6],[1,-5],[2,-5],[3,-5],
    [0,-4],[1,-4],[2,-4],[0,-3],[1,-3],[2,-3],[-1,-2],[0,-2],[1,-2],[2,-2],
    [3,-9],[4,-9],[5,-9],[4,-8],[5,-8],[6,-8],[5,-7],[6,-7],[7,-7],[6,-6],[7,-6],
    [-7,-1],[-6,-1],[-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-8,0],[-7,0],[-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],
    [-8,1],[-7,1],[-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1],
    [-7,2],[-6,2],[-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],[3,2],
    [3,-1],[4,-1],[5,-1],[5,0],[3,2],[4,2],[5,2],[5,3],
    [-8,-1],[-9,-1],[-9,0],[-8,2],[-9,2],[-9,1],
    [-9,0],[-10,1],[-11,1],[-12,1],[-12,2],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#000E33';B(5,-7);
  ctx.restore();
};

/* ── Pixel art: Ichthya (Ichthyosaurus dolphin) ─────────────────────────── */
const drawIchthyaFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0012)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#00CED1';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(0,206,209,0.95)';ctx.shadowBlur=ps*8;
  ([[-1,-5],[0,-5],[1,-5],[-1,-4],[0,-4],[1,-4],[-1,-3],[0,-3],[1,-3]] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],
    [-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],
    [-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],
    [-4,2],[-3,2],[-2,2],[-1,2],[0,2],
    [2,-2],[3,-2],[4,-2],[5,-2],
    [2,-1],[3,-1],[4,-1],[5,-1],[6,-1],[7,-1],[8,-1],[9,-1],[10,-1],
    [2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],
    [3,1],[4,1],
    [1,-2],[2,-2],[2,-1],[1,2],[2,2],[2,1],
    [-6,-1],[-7,-1],[-8,-1],[-8,-2],[-9,-2],
    [-6,1],[-7,1],[-8,1],[-8,2],[-9,2],
    [-7,0],[-8,0],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#001A1A';B(4,-1);
  ctx.restore();
};

/* ── Pixel art: Krakenodon (mythic sea titan) ───────────────────────────── */
const drawKrakenodonFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0008)*5;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#8B00FF';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(139,0,255,0.95)';ctx.shadowBlur=ps*7;
  ([
    [-3,2],[-3,3],[-4,4],[-4,5],[-5,6],
    [-1,2],[-1,3],[-1,4],[-2,5],[-2,6],
    [1,2],[1,3],[2,4],[2,5],[1,6],
    [3,2],[4,3],[5,4],[5,5],[4,6],
    [5,2],[6,3],[7,4],[7,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [-2,-5],[-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],[4,-5],[5,-5],
    [-3,-4],[-2,-4],[-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],[4,-4],[5,-4],[6,-4],
    [-3,-3],[-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],[4,-3],[5,-3],[6,-3],[7,-3],
    [-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],[4,-2],[5,-2],[6,-2],[7,-2],[8,-2],[9,-2],
    [-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],
    [-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],
    [-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],
    [-6,0],[-5,0],[-4,0],[-3,0],[-6,1],[-5,1],[-4,1],[-3,1],
    [-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],[3,2],
    [-7,-1],[-8,-1],[-8,0],[-8,1],[-6,2],[-7,3],[-8,3],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A0033';B(0,-3);
  ctx.restore();
};

/* ── Pixel art: Pterodax (Pterodactyl spread wings) ─────────────────────── */
const drawPterodaxFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*7;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#FF9900';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(255,153,0,0.9)';ctx.shadowBlur=ps*4;
  ([
    [-12,-2],[-11,-2],[-10,-2],[-9,-2],[-8,-2],[-7,-2],[-6,-2],[-5,-2],
    [-11,-1],[-10,-1],[-9,-1],[-8,-1],[-7,-1],[-6,-1],[-5,-1],
    [-10,0],[-9,0],[-8,0],[-7,0],[-6,0],[-5,0],
    [-8,1],[-7,1],[-6,1],
    [5,-2],[6,-2],[7,-2],[8,-2],[9,-2],[10,-2],[11,-2],
    [5,-1],[6,-1],[7,-1],[8,-1],[9,-1],[10,-1],
    [5,0],[6,0],[7,0],[8,0],[9,0],
    [6,1],[7,1],[8,1],
    [-4,-2],[-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],[4,-2],
    [-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],
    [-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],
    [-2,1],[-1,1],[0,1],[1,1],
    [3,-4],[4,-4],[5,-4],[6,-4],[7,-4],[8,-4],[9,-4],
    [2,-3],[3,-3],[4,-3],[5,-3],[6,-3],[7,-3],[8,-3],
    [6,-5],[7,-5],[8,-5],[9,-5],
    [0,2],[1,2],[-1,2],[0,3],[1,3],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A0800';B(5,-3);
  ctx.restore();
};

/* ── Pixel art: Quetzal (Quetzalcoatlus, legendary) ─────────────────────── */
const drawQuetzalFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0008)*5;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#FFD700';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(255,215,0,0.95)';ctx.shadowBlur=ps*7;
  ([[-13,-1],[-12,-1],[11,-1],[12,-1]] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [-12,-2],[-11,-2],[-10,-2],[-9,-2],[-8,-2],[-7,-2],[-6,-2],[-5,-2],[-4,-2],
    [-11,-1],[-10,-1],[-9,-1],[-8,-1],[-7,-1],[-6,-1],[-5,-1],[-4,-1],
    [-10,0],[-9,0],[-8,0],[-7,0],[-6,0],[-5,0],[-8,1],[-7,1],[-6,1],[-5,1],
    [4,-2],[5,-2],[6,-2],[7,-2],[8,-2],[9,-2],[10,-2],[11,-2],
    [4,-1],[5,-1],[6,-1],[7,-1],[8,-1],[9,-1],[10,-1],
    [4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[4,1],[5,1],[6,1],[7,1],
    [-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],
    [-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-2,0],[-1,0],[0,0],[1,0],[2,0],[-1,1],[0,1],[1,1],
    [3,-5],[4,-5],[5,-5],[6,-5],[7,-5],[8,-5],[9,-5],[10,-5],[11,-5],
    [3,-4],[4,-4],[5,-4],[6,-4],[7,-4],[8,-4],
    [3,-3],[4,-3],[5,-3],
    [3,-5],[4,-5],[5,-6],
    [-3,1],[-4,1],[-4,2],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A1200';B(5,-3);
  ctx.restore();
};

/* ── Pixel art: Archaeon (Archaeopteryx feathered) ──────────────────────── */
const drawArchaeonFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#A0522D';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(160,82,45,0.9)';ctx.shadowBlur=ps*4;
  ([
    [-8,-2],[-7,-2],[-6,-2],[-5,-2],[-4,-2],
    [-8,-1],[-7,-1],[-6,-1],[-5,-1],[-4,-1],
    [-7,0],[-6,0],[-5,0],[-4,0],[-6,1],[-5,1],[-4,1],[-5,2],
    [4,-2],[5,-2],[6,-2],[7,-2],[8,-2],
    [4,-1],[5,-1],[6,-1],[7,-1],[8,-1],
    [4,0],[5,0],[6,0],[7,0],[4,1],[5,1],[6,1],[5,2],
    [-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],
    [-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-2,0],[-1,0],[0,0],[1,0],[2,0],[-1,1],[0,1],[1,1],
    [3,-3],[4,-3],[5,-3],[3,-2],[4,-2],
    [-3,1],[-4,2],[-5,3],[-6,4],[-7,5],
    [-3,2],[-4,3],[-5,4],[-2,2],[-3,3],[-4,4],[-5,5],
    [0,2],[1,2],[0,3],[1,3],[-1,2],[-1,3],[0,4],[1,4],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A0000';B(1,-1);
  ctx.restore();
};

/* ── Pixel art: Diplo (Diplodocus long neck + whip tail) ────────────────── */
const drawDiploFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0009)*5;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#78C850';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(120,200,80,0.9)';ctx.shadowBlur=ps*4;
  ([
    [3,-8],[4,-8],[3,-7],[4,-7],[2,-6],[3,-6],[4,-6],[2,-5],[3,-5],
    [1,-4],[2,-4],[3,-4],[1,-3],[2,-3],[0,-2],[1,-2],[2,-2],
    [4,-9],[5,-9],[6,-9],[5,-8],[6,-8],[7,-8],[6,-7],[7,-7],
    [-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],
    [-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1],
    [-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],[3,2],
    [-5,0],[-6,0],[-7,0],[-7,1],[-8,1],[-9,1],[-9,2],[-10,2],[-11,2],[-12,2],[-12,3],[-13,3],
    [1,3],[2,3],[1,4],[2,4],[1,5],[2,5],
    [-1,3],[-2,3],[-1,4],[-2,4],[-1,5],[-2,5],
    [-4,3],[-3,3],[-4,4],[-3,4],[-6,3],[-5,3],[-6,4],[-5,4],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#001A00';B(6,-7);
  ctx.restore();
};

/* ── Pixel art: Iguana (Iguanodon thumb spike) ───────────────────────────── */
const drawIguanaFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#2ECC40';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(46,204,64,0.95)';ctx.shadowBlur=ps*8;
  ([
    [5,-5],[5,-4],[5,-3],[6,-3],[6,-2],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [1,-6],[2,-6],[3,-6],[4,-6],[5,-6],
    [1,-5],[2,-5],[3,-5],[4,-5],
    [1,-4],[2,-4],[3,-4],[4,-4],
    [4,-3],[5,-3],[6,-3],[7,-3],[8,-3],
    [4,-2],[5,-2],[6,-2],[7,-2],[8,-2],
    [0,-3],[1,-3],[2,-3],[3,-3],[0,-2],[1,-2],[2,-2],[3,-2],
    [-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],
    [-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],
    [-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1],
    [-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],[3,2],
    [4,-2],[5,-2],[5,-1],[6,-1],
    [-4,1],[-5,1],[-6,2],[-7,2],[-8,3],[-9,3],
    [0,3],[1,3],[2,3],[-1,3],[-2,3],[0,4],[1,4],[-1,4],[-2,4],
    [0,5],[1,5],[-1,5],[-2,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#001A00';B(2,-5);
  ctx.restore();
};

/* ── Pixel art: Gallimi (Gallimimus ostrich-dino) ───────────────────────── */
const drawGallimiFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0013)*7;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#D4A853';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(212,168,83,0.9)';ctx.shadowBlur=ps*4;
  ([
    [2,-8],[3,-8],[4,-8],[2,-7],[3,-7],[4,-7],[5,-7],
    [3,-6],[4,-6],[5,-6],[5,-7],[6,-7],[7,-7],[5,-6],[6,-6],
    [2,-6],[3,-6],[1,-5],[2,-5],[3,-5],[1,-4],[2,-4],
    [0,-3],[1,-3],[2,-3],[0,-2],[1,-2],
    [-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],
    [-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],
    [-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],
    [-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],
    [-1,2],[0,2],[1,2],[2,2],
    [4,-1],[5,-1],[5,0],
    [-3,0],[-4,0],[-5,1],[-6,1],[-7,2],
    [0,3],[1,3],[-1,3],[0,4],[1,4],[-1,4],
    [0,5],[1,5],[-1,5],[0,6],[1,6],[-1,6],
    [-2,7],[-1,7],[0,7],[1,7],[2,7],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A0E00';B(3,-7);
  ctx.restore();
};

/* ── Pixel art: Compy (Compsognathus — tiny) ─────────────────────────────── */
const drawCompyFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0015)*8;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#BA55D3';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(186,85,211,0.95)';ctx.shadowBlur=ps*5;
  ([
    [1,-4],[2,-4],[3,-4],[1,-3],[2,-3],[3,-3],[4,-3],
    [2,-2],[3,-2],[4,-2],[5,-2],[3,-1],[4,-1],[5,-1],
    [-2,-2],[-1,-2],[0,-2],[1,-2],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],
    [-2,0],[-1,0],[0,0],[1,0],[2,0],[-1,1],[0,1],[1,1],
    [2,-2],[3,-2],
    [-2,0],[-3,0],[-4,1],[-5,1],[-6,1],[-6,2],
    [0,2],[1,2],[-1,2],[0,3],[1,3],[-1,3],[-1,4],[0,4],[1,4],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A0033';B(2,-3);
  ctx.restore();
};

/* ── Pixel art: Velocia (small raptor) ──────────────────────────────────── */
const drawVelociaFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0013)*7;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#FFB300';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(255,179,0,0.95)';ctx.shadowBlur=ps*7;
  ([[-3,4],[-4,4],[-5,4],[-5,3],[-6,3]] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],
    [-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],[4,-5],[5,-5],
    [0,-4],[1,-4],[2,-4],[3,-4],[4,-4],[5,-4],[6,-4],
    [2,-3],[3,-3],[4,-3],[5,-3],[6,-3],[7,-3],
    [-1,-3],[0,-3],[1,-3],[2,-3],
    [4,-2],[5,-2],[6,-2],[7,-2],[8,-2],
    [-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],
    [-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],
    [-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],
    [-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],
    [-2,2],[-1,2],[0,2],[1,2],
    [2,-1],[3,-1],[3,0],
    [-4,0],[-5,0],[-6,0],[-7,1],[-8,1],[-9,1],[-10,1],
    [0,3],[1,3],[-1,3],[0,4],[1,4],[-1,4],
    [-1,5],[0,5],[1,5],[2,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A0800';B(1,-5);
  ctx.restore();
};

/* ── Pixel art: Carno (Carnotaurus bull horns) ───────────────────────────── */
const drawCarnoFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#B71C1C';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(183,28,28,0.95)';ctx.shadowBlur=ps*8;
  ([
    [-4,-7],[-5,-7],[-6,-7],[-6,-8],[-7,-8],
    [4,-7],[5,-7],[6,-7],[6,-8],[7,-8],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [-3,-7],[-2,-7],[-1,-7],[0,-7],[1,-7],[2,-7],[3,-7],
    [-3,-6],[-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],[4,-6],[5,-6],
    [-2,-5],[-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],[4,-5],[5,-5],[6,-5],
    [0,-4],[1,-4],[2,-4],[3,-4],[4,-4],[5,-4],[6,-4],[7,-4],
    [-1,-4],[0,-4],[1,-4],
    [3,-3],[4,-3],[5,-3],[6,-3],[7,-3],
    [-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],
    [-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],
    [-6,-1],[-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],
    [-7,0],[-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],
    [-7,1],[-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],
    [-6,2],[-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],
    [2,-1],[3,-1],
    [-8,0],[-9,0],[-9,1],[-10,1],[-11,1],
    [-1,3],[0,3],[1,3],[-3,3],[-2,3],[-1,4],[0,4],[-3,4],[-2,4],
    [-1,5],[0,5],[1,5],[-2,5],[-3,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#0D0000';B(1,-5);
  ctx.restore();
};

/* ── Pixel art: Indomina (legendary hybrid) ──────────────────────────────── */
const drawInominaFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*5;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#E8EAF6';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  const hue=Math.floor(Date.now()*0.1)%360;
  ctx.shadowColor=`hsl(${hue},100%,70%)`;ctx.shadowBlur=ps*10;
  ([[-6,-2],[-4,-2],[-2,-2],[0,-2],[2,-2],[4,-2]] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowColor='rgba(200,210,255,0.9)';ctx.shadowBlur=ps*5;
  ([
    [-4,-8],[-3,-8],[-2,-8],[-1,-8],[0,-8],[1,-8],[2,-8],[3,-8],[4,-8],
    [-4,-7],[-3,-7],[-2,-7],[-1,-7],[0,-7],[1,-7],[2,-7],[3,-7],[4,-7],[5,-7],[6,-7],
    [-3,-6],[-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],[4,-6],[5,-6],[6,-6],[7,-6],
    [-2,-5],[-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],[4,-5],[5,-5],[6,-5],[7,-5],[8,-5],[9,-5],
    [-1,-5],[0,-5],[1,-5],[2,-5],
    [3,-4],[4,-4],[5,-4],[6,-4],[7,-4],[8,-4],[9,-4],[10,-4],
    [-4,-4],[-3,-4],[-2,-4],[-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],
    [-5,-3],[-4,-3],[-3,-3],[-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],
    [-8,-2],[-7,-2],[-6,-2],[-5,-2],[-4,-2],[-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],[4,-2],
    [-9,-1],[-8,-1],[-7,-1],[-6,-1],[-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],[5,-1],
    [-9,0],[-8,0],[-7,0],[-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],
    [-8,1],[-7,1],[-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1],
    [-7,2],[-6,2],[-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],[3,2],
    [4,-2],[5,-2],[6,-2],[6,-1],[7,-1],
    [-9,0],[-10,0],[-11,0],[-12,0],[-12,1],[-13,1],[-13,2],
    [-1,3],[0,3],[1,3],[2,3],[-3,3],[-2,3],
    [-1,4],[0,4],[1,4],[-3,4],[-2,4],
    [-1,5],[0,5],[1,5],[2,5],[-2,5],[-3,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A1A3F';B(2,-6);
  ctx.restore();
};

/* ── Pixel art: Therizon (Therizinosaurus scythe claws) ─────────────────── */
const drawTherizonFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0009)*5;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#6DAF2F';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(109,175,47,0.95)';ctx.shadowBlur=ps*8;
  ([
    [4,-2],[5,-2],[6,-2],[7,-2],[8,-2],[9,-2],[10,-2],
    [7,-3],[8,-3],[9,-3],[10,-3],[11,-3],[11,-4],[10,-4],
    [4,-1],[5,-1],[6,-1],[7,-1],[8,-1],[9,-1],[10,-1],[11,-1],[12,-1],
    [11,0],[12,0],
    [4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],
    [10,1],[11,1],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [1,-7],[2,-7],[3,-7],[1,-6],[2,-6],[3,-6],[4,-6],
    [2,-5],[3,-5],[4,-5],[5,-5],
    [0,-5],[1,-5],[2,-5],[0,-4],[1,-4],[2,-4],[3,-4],
    [0,-3],[1,-3],[2,-3],[3,-3],[4,-3],
    [-4,-2],[-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],
    [-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],
    [-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],
    [-3,2],[-2,2],[-1,2],[0,2],[1,2],
    [-5,0],[-6,0],[-7,1],[-8,1],
    [0,3],[1,3],[-1,3],[-2,3],[0,4],[1,4],[-1,4],
    [0,5],[1,5],[-1,5],[-1,6],[0,6],[1,6],[2,6],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#0D1F00';B(2,-6);
  ctx.restore();
};

/* ── Pixel art: Eggsy (hatchling bursting from egg) ─────────────────────── */
const drawEggsyFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0018)*5;
  ctx.save();ctx.translate(cx,cy+fy);
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.fillStyle='#FFDB89';
  ctx.shadowColor='rgba(255,219,137,0.9)';ctx.shadowBlur=ps*5;
  ([
    [-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],
    [-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],
    [-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],
    [-2,2],[-1,2],[0,2],[1,2],[2,2],[-1,3],[0,3],[1,3],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.fillStyle='#7EFF50';
  ctx.shadowColor='rgba(126,255,80,0.9)';ctx.shadowBlur=ps*5;
  ([
    [-1,-4],[0,-4],[1,-4],[-1,-3],[0,-3],[1,-3],[2,-3],[2,-2],[3,-2],
    [3,0],[4,0],[4,-1],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#001A00';B(1,-4);
  ctx.fillStyle='#332200';B(1,-2);B(0,-1);B(1,1);
  ctx.restore();
};

/* ── Pixel art: Hatchy (baby T-Rex) ──────────────────────────────────────── */
const drawHatchyFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0015)*7;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#98FB98';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(152,251,152,0.9)';ctx.shadowBlur=ps*5;
  ([
    [-3,-6],[-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],
    [-4,-5],[-3,-5],[-2,-5],[-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],[4,-5],
    [-4,-4],[-3,-4],[-2,-4],[-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],[4,-4],
    [-3,-3],[-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],[4,-3],[5,-3],
    [-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],[4,-2],[5,-2],
    [2,-1],[3,-1],[4,-1],[5,-1],[6,-1],
    [-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],
    [-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],
    [-1,1],[0,1],[1,1],[2,1],
    [3,-1],[4,-1],[4,0],
    [-2,0],[-3,0],[-4,1],[-5,1],
    [0,2],[1,2],[-1,2],[0,3],[1,3],[-1,3],
    [-1,4],[0,4],[1,4],[2,4],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#003300';B(-1,-5);B(2,-5);
  ctx.restore();
};

/* ── Pixel art: Sprout (baby stegosaurus) ────────────────────────────────── */
const drawSproutFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0012)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#87CEEB';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(135,206,235,0.95)';ctx.shadowBlur=ps*6;
  ([
    [-3,-4],[-3,-3],[-3,-2],[-1,-4],[-1,-3],[-1,-2],[1,-3],[1,-2],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],
    [-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1],
    [-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],[3,2],
    [3,-2],[4,-2],[5,-2],[3,-1],[4,-1],[5,-1],[6,-1],[4,0],[5,0],[6,0],
    [-5,0],[-6,0],[-7,-1],[-7,0],[-7,1],
    [1,3],[2,3],[1,4],[2,4],[-1,3],[-2,3],[-1,4],[-2,4],
    [-4,3],[-3,3],[-4,4],[-3,4],[0,3],[0,4],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#001A33';B(4,-1);
  ctx.restore();
};

/* ── Pixel art: Nibbles (baby raptor) ────────────────────────────────────── */
const drawNibblesFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0015)*7;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#FFB7C5';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(255,183,197,0.9)';ctx.shadowBlur=ps*5;
  ([
    [-1,-5],[0,-5],[1,-5],[2,-5],
    [-2,-4],[-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],
    [-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],[4,-3],
    [-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],[4,-2],[5,-2],
    [1,-1],[2,-1],[3,-1],[4,-1],[5,-1],
    [-1,-1],[0,-1],[1,-1],
    [-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],
    [-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],
    [-2,1],[-1,1],[0,1],[1,1],[2,1],
    [-1,2],[0,2],[1,2],
    [-2,3],[-3,3],[-3,2],
    [2,-1],[3,-1],[3,0],
    [-3,0],[-4,1],[-5,1],[-6,1],[-7,1],
    [0,3],[1,3],[-1,3],[0,4],[1,4],[-1,4],[0,5],[1,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#330011';B(0,-4);B(2,-4);
  ctx.restore();
};

/* ── Pixel art: Alloro (Allosaurus brow ridges) ─────────────────────────── */
const drawAlloroFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#FF6600';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(255,102,0,0.95)';ctx.shadowBlur=ps*8;
  ([[-1,-8],[0,-8],[1,-8],[-1,-7],[0,-7],[1,-7]] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [-2,-7],[-1,-7],[0,-7],[1,-7],[2,-7],[3,-7],
    [-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],[4,-6],[5,-6],
    [-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],[4,-5],[5,-5],[6,-5],
    [-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],[4,-4],[5,-4],[6,-4],[7,-4],
    [-1,-3],[0,-3],[1,-3],[2,-3],[4,-3],[5,-3],[6,-3],[7,-3],[8,-3],
    [-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],
    [-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],
    [-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],
    [-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],
    [3,-2],[4,-2],[5,-2],[5,-1],[6,-1],[5,0],
    [-7,0],[-8,0],[-9,1],[-10,1],[-11,1],
    [-1,3],[0,3],[1,3],[-3,3],[-2,3],[-1,4],[0,4],[-3,4],[-2,4],
    [-1,5],[0,5],[1,5],[-2,5],[-3,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A0800';B(1,-5);
  ctx.restore();
};

/* ── Pixel art: Baryko (Baryonyx hook claw) ─────────────────────────────── */
const drawBarykoFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#5BB8D4';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(91,184,212,0.95)';ctx.shadowBlur=ps*8;
  ([
    [5,-3],[6,-3],[7,-3],[8,-3],[9,-3],[9,-2],[8,-2],[7,-1],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [-2,-7],[-1,-7],[0,-7],[1,-7],[2,-7],[3,-7],
    [-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],[4,-6],
    [0,-5],[1,-5],[2,-5],[3,-5],[4,-5],[5,-5],[6,-5],[7,-5],[8,-5],[9,-5],
    [0,-4],[1,-4],[2,-4],[3,-4],[4,-4],[5,-4],[6,-4],[7,-4],[8,-4],[9,-4],[10,-4],
    [-1,-4],[0,-4],[1,-4],[2,-4],
    [5,-3],[6,-3],[7,-3],[8,-3],[9,-3],[10,-3],
    [-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],
    [-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],
    [-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],
    [-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],
    [-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],
    [3,-2],[4,-2],[5,-2],[4,-1],[5,-1],[6,-1],
    [-7,0],[-8,0],[-9,0],[-9,1],[-10,1],[-11,1],
    [-1,3],[0,3],[1,3],[-3,3],[-2,3],[-1,4],[0,4],[-3,4],[-2,4],
    [-1,5],[0,5],[1,5],[-2,5],[-3,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#001A22';B(1,-6);
  ctx.restore();
};

/* ── Pixel art: Diloph (Dilophosaurus double crest + frill) ─────────────── */
const drawDilophFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#CC44FF';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(204,68,255,0.95)';ctx.shadowBlur=ps*8;
  ([[-1,-9],[0,-9],[-1,-8],[0,-8],[2,-9],[3,-9],[2,-8],[3,-8]] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*6;
  ([
    [-5,-3],[-6,-4],[-7,-5],[-5,-4],[-4,-5],
    [5,-3],[6,-4],[7,-5],[5,-4],[4,-5],
    [-3,-2],[-4,-3],[-3,-3],
    [3,-2],[4,-3],[3,-3],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [-2,-7],[-1,-7],[0,-7],[1,-7],[2,-7],[3,-7],
    [-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],[4,-6],
    [-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],[4,-5],[5,-5],
    [0,-4],[1,-4],[2,-4],[3,-4],[4,-4],[5,-4],[6,-4],
    [-1,-4],[0,-4],[1,-4],[2,-4],[3,-3],[4,-3],[5,-3],[6,-3],[7,-3],
    [-1,-3],[0,-3],[1,-3],[2,-3],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],
    [-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],
    [-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],
    [-3,2],[-2,2],[-1,2],[0,2],[1,2],
    [3,-1],[4,-1],[4,0],[-6,0],[-7,0],[-7,1],[-8,1],[-9,1],
    [-1,3],[0,3],[1,3],[-2,3],[-1,4],[0,4],[-2,4],[-1,5],[0,5],[1,5],[-2,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A0033';B(1,-5);
  ctx.restore();
};

/* ── Pixel art: Styra (Styracosaurus spike frill) ───────────────────────── */
const drawStyraFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0012)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#FF80AB';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(255,128,171,0.95)';ctx.shadowBlur=ps*7;
  ([
    [-3,-8],[-4,-9],[-5,-10],[-1,-9],[-1,-10],[-1,-11],
    [1,-8],[0,-9],[0,-10],[3,-8],[4,-9],[5,-10],[5,-8],[6,-9],[6,-10],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*5;
  ([
    [-5,-7],[-4,-7],[-3,-7],[-2,-7],[-1,-7],[0,-7],[1,-7],[2,-7],[3,-7],[4,-7],[5,-7],[6,-7],
    [-4,-6],[-3,-6],[-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],[4,-6],[5,-6],
    [-3,-5],[-2,-5],[-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],[4,-5],
    [-2,-4],[-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],[-1,-3],[0,-3],[1,-3],[2,-3],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [-7,-1],[-6,-1],[-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],
    [-8,0],[-7,0],[-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],
    [-8,1],[-7,1],[-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],
    [-7,2],[-6,2],[-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],
    [4,-3],[5,-3],[6,-3],[7,-3],[4,-2],[5,-2],[6,-2],[7,-2],[8,-2],
    [4,-1],[5,-1],[6,-1],[7,-1],[8,-1],[5,0],[6,0],[7,0],
    [8,-1],[9,-1],[10,-1],[11,-1],[11,-2],[12,-2],
    [-9,0],[-10,0],[-9,1],[-10,1],
    [0,3],[1,3],[-1,3],[-2,3],[0,4],[1,4],[-1,4],[-2,4],
    [-5,3],[-6,3],[-5,4],[-6,4],[-7,3],[-7,4],
    [-1,5],[0,5],[1,5],[2,5],[-6,5],[-5,5],[-4,5],[-3,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A0007';B(6,-1);
  ctx.restore();
};

/* ── Pixel art: Argenta (Argentinosaurus — the absolute unit) ───────────── */
const drawArgentaFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0006)*4;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#90A4AE';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(144,164,174,0.9)';ctx.shadowBlur=ps*4;
  ([
    [4,-9],[5,-9],[6,-9],[7,-9],[5,-8],[6,-8],[7,-8],[8,-8],[6,-7],[7,-7],
    [2,-7],[3,-7],[4,-7],[2,-6],[3,-6],[4,-6],[5,-6],
    [1,-5],[2,-5],[3,-5],[4,-5],[5,-5],[1,-4],[2,-4],[3,-4],[4,-4],
    [0,-3],[1,-3],[2,-3],[3,-3],[0,-2],[1,-2],[2,-2],[3,-2],
    [-10,-2],[-9,-2],[-8,-2],[-7,-2],[-6,-2],[-5,-2],[-4,-2],[-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],
    [-11,-1],[-10,-1],[-9,-1],[-8,-1],[-7,-1],[-6,-1],[-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],
    [-12,0],[-11,0],[-10,0],[-9,0],[-8,0],[-7,0],[-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],
    [-12,1],[-11,1],[-10,1],[-9,1],[-8,1],[-7,1],[-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],
    [-11,2],[-10,2],[-9,2],[-8,2],[-7,2],[-6,2],[-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],[3,2],[4,2],
    [-12,0],[-13,0],[-13,1],[-14,1],
    [2,3],[3,3],[2,4],[3,4],[2,5],[3,5],
    [-1,3],[-2,3],[-1,4],[-2,4],[-1,5],[-2,5],
    [-5,3],[-6,3],[-5,4],[-6,4],[-5,5],[-6,5],
    [-9,3],[-8,3],[-9,4],[-8,4],[-9,5],[-8,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#001A22';B(6,-8);
  ctx.restore();
};

/* ── Pixel art: Elasmia (Elasmosaurus — extreme long neck) ──────────────── */
const drawElasmiaFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*5;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#00E5FF';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(0,229,255,0.9)';ctx.shadowBlur=ps*5;
  ([
    [1,-10],[2,-10],[1,-9],[2,-9],[3,-9],[2,-8],[3,-8],
    [3,-7],[4,-7],[3,-6],[4,-6],[5,-6],
    [4,-5],[5,-5],[4,-4],[5,-4],[3,-4],[3,-3],[4,-3],[2,-3],[2,-2],[3,-2],
    [5,-10],[6,-10],[7,-10],[5,-9],[6,-9],[7,-9],[6,-8],[7,-8],
    [-7,-1],[-6,-1],[-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-8,0],[-7,0],[-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],
    [-8,1],[-7,1],[-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1],
    [-7,2],[-6,2],[-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],[3,2],
    [3,-1],[4,-1],[5,-1],[5,0],[3,2],[4,2],[5,2],[5,3],
    [-8,-1],[-9,-1],[-9,0],[-8,2],[-9,2],[-9,1],
    [-9,0],[-10,1],[-11,1],[-12,1],[-12,2],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#001A22';B(6,-9);
  ctx.restore();
};

/* ── Pixel art: Tylosa (Tylosaurus aggressive marine) ───────────────────── */
const drawTylosaFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0009)*5;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#006B7D';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(0,107,125,0.9)';ctx.shadowBlur=ps*4;
  ([
    [2,-4],[3,-4],[4,-4],[5,-4],[6,-4],[7,-4],[8,-4],
    [2,-3],[3,-3],[4,-3],[5,-3],[6,-3],[7,-3],[8,-3],[9,-3],[10,-3],
    [2,-2],[3,-2],[4,-2],[5,-2],[6,-2],[7,-2],[8,-2],[9,-2],[10,-2],[11,-2],
    [3,-1],[4,-1],[5,-1],[6,-1],[7,-1],[8,-1],[9,-1],[10,-1],[11,-1],[12,-1],
    [4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],
    [5,1],[6,1],[7,1],[8,1],[9,1],[10,1],
    [-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],
    [-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],
    [-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],
    [-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],
    [1,-2],[2,-2],[2,-1],[1,2],[2,2],[2,1],
    [-6,-1],[-7,-1],[-8,-1],[-8,-2],[-9,-2],
    [-6,1],[-7,1],[-8,1],[-8,2],[-9,2],[-7,0],[-8,0],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#001A22';B(4,-3);
  ctx.restore();
};

/* ── Pixel art: Dimorpho (Dimorphodon big head pterosaur) ───────────────── */
const drawDimorphoFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0013)*7;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#FF4D8C';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(255,77,140,0.9)';ctx.shadowBlur=ps*4;
  ([
    [-7,-2],[-6,-2],[-5,-2],[-4,-2],[-3,-2],
    [-7,-1],[-6,-1],[-5,-1],[-4,-1],[-3,-1],
    [-6,0],[-5,0],[-4,0],[-3,0],[-6,1],[-5,1],[-4,1],
    [3,-2],[4,-2],[5,-2],[6,-2],[7,-2],
    [3,-1],[4,-1],[5,-1],[6,-1],[7,-1],
    [3,0],[4,0],[5,0],[6,0],[3,1],[4,1],[5,1],
    [-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],
    [-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],
    [-1,0],[0,0],[1,0],[-1,1],[0,1],[1,1],
    // HUGE skull (proportionally massive for Dimorphodon)
    [1,-6],[2,-6],[3,-6],[4,-6],[5,-6],[6,-6],
    [1,-5],[2,-5],[3,-5],[4,-5],[5,-5],[6,-5],[7,-5],
    [2,-4],[3,-4],[4,-4],[5,-4],[6,-4],[7,-4],[8,-4],
    [3,-3],[4,-3],[5,-3],[6,-3],[7,-3],[8,-3],
    // long beak
    [7,-4],[8,-4],[9,-4],[10,-4],[11,-4],
    [7,-3],[8,-3],[9,-3],[10,-3],[11,-3],
    // short tail with diamond fin
    [-2,1],[-3,2],[-4,2],[-5,2],[-5,3],[-5,1],
    [0,2],[1,2],[0,3],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A0022';B(3,-5);
  ctx.restore();
};

/* ── Pixel art: Tapejar (Tapejara head sail) ─────────────────────────────── */
const drawTapejarFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#FF7043';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(255,112,67,0.95)';ctx.shadowBlur=ps*8;
  ([
    [1,-9],[1,-8],[1,-7],[1,-6],[1,-5],
    [2,-9],[2,-8],[2,-7],[2,-6],
    [0,-8],[0,-7],[0,-6],[3,-8],[3,-7],[3,-6],
    [-1,-7],[-1,-6],[4,-7],[4,-6],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [-8,-2],[-7,-2],[-6,-2],[-5,-2],[-4,-2],
    [-8,-1],[-7,-1],[-6,-1],[-5,-1],[-4,-1],
    [-7,0],[-6,0],[-5,0],[-4,0],[-6,1],[-5,1],
    [4,-2],[5,-2],[6,-2],[7,-2],[8,-2],
    [4,-1],[5,-1],[6,-1],[7,-1],[8,-1],
    [4,0],[5,0],[6,0],[7,0],[5,1],[6,1],
    [-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],
    [-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-2,0],[-1,0],[0,0],[1,0],[2,0],[-1,1],[0,1],[1,1],
    // head (right, pointed beak)
    [3,-4],[4,-4],[5,-4],[6,-4],[7,-4],
    [3,-3],[4,-3],[5,-3],[6,-3],[7,-3],[8,-3],[9,-3],
    [3,-2],[4,-2],
    [-3,1],[-4,2],[-5,2],[-3,2],[0,2],[1,2],[0,3],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A0800';B(5,-3);
  ctx.restore();
};

/* ── Pixel art: Anato (Anatotitan duck-bill hadrosaur) ──────────────────── */
const drawAnatoFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#69D66A';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(105,214,106,0.9)';ctx.shadowBlur=ps*4;
  ([
    [0,-6],[1,-6],[2,-6],[3,-6],[4,-6],
    [0,-5],[1,-5],[2,-5],[3,-5],[4,-5],[5,-5],
    [0,-4],[1,-4],[2,-4],[3,-4],[4,-4],[5,-4],[6,-4],
    [1,-3],[2,-3],[3,-3],[4,-3],[5,-3],[6,-3],[7,-3],
    // wide flat duck bill (distinctive — no crest above)
    [5,-2],[6,-2],[7,-2],[8,-2],[9,-2],[10,-2],
    [5,-1],[6,-1],[7,-1],[8,-1],[9,-1],[10,-1],
    [6,0],[7,0],[8,0],
    [-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],[4,-2],
    [-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],
    [-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],
    [-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],
    [-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],
    [4,-1],[5,-1],[5,0],
    [-5,1],[-6,2],[-7,2],[-8,3],[-9,3],
    [0,3],[1,3],[2,3],[-1,3],[-2,3],[0,4],[1,4],[-1,4],
    [-1,5],[0,5],[1,5],[2,5],[-2,5],[-3,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#001A00';B(2,-5);
  ctx.restore();
};

/* ── Pixel art: Dracorex (spiked dragon dome) ───────────────────────────── */
const drawDracorexFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0013)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#6200EA';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(98,0,234,0.95)';ctx.shadowBlur=ps*8;
  ([
    [-2,-9],[-2,-8],[2,-9],[2,-8],[0,-9],
    [-3,-7],[-3,-8],[3,-7],[3,-8],[-1,-8],[1,-8],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [-3,-7],[-2,-7],[-1,-7],[0,-7],[1,-7],[2,-7],[3,-7],
    [-4,-6],[-3,-6],[-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],[4,-6],
    [-4,-5],[-3,-5],[-2,-5],[-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],
    [-3,-4],[-2,-4],[-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],
    [-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],[4,-3],[5,-3],[6,-3],
    [-1,-2],[0,-2],[1,-2],[2,-2],
    [-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],
    [-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],
    [-3,2],[-2,2],[-1,2],[0,2],[1,2],
    [3,-1],[4,-1],[4,0],
    [-5,0],[-6,1],[-7,1],[-8,1],
    [-1,3],[0,3],[1,3],[-2,3],[-1,4],[0,4],[-2,4],[-1,5],[0,5],[1,5],[-2,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#0D0033';B(0,-5);
  ctx.restore();
};

/* ── Pixel art: Sarco (Sarcosuchus — giant croc) ────────────────────────── */
const drawSarcoFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0007)*4;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#33691E';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(51,105,30,0.9)';ctx.shadowBlur=ps*4;
  ([
    [3,-3],[4,-3],[5,-3],[6,-3],[7,-3],[8,-3],[9,-3],[10,-3],[11,-3],[12,-3],
    [3,-2],[4,-2],[5,-2],[6,-2],[7,-2],[8,-2],[9,-2],[10,-2],[11,-2],[12,-2],[13,-2],
    [3,-1],[4,-1],[5,-1],[6,-1],[7,-1],[8,-1],[9,-1],[10,-1],[11,-1],[12,-1],[13,-1],
    [4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],
    [5,1],[6,1],[7,1],[8,1],[9,1],[10,1],
    [-8,-1],[-7,-1],[-6,-1],[-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-9,0],[-8,0],[-7,0],[-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],
    [-9,1],[-8,1],[-7,1],[-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1],
    [-8,2],[-7,2],[-6,2],[-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],
    // armored back scutes
    [-7,-2],[-5,-2],[-3,-2],[-1,-2],[1,-2],[3,-2],
    // legs (short stubby croc legs)
    [2,3],[3,3],[2,4],[3,4],
    [-1,3],[-2,3],[-1,4],[-2,4],
    [-5,3],[-4,3],[-5,4],[-4,4],
    [-8,3],[-7,3],[-8,4],[-7,4],
    // tail
    [-9,0],[-10,1],[-11,1],[-12,1],[-13,2],[-14,2],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#0A1500';B(4,-2);
  ctx.restore();
};

/* ── Pixel art: Kentro (Kentrosaurus — full spikes) ─────────────────────── */
const drawKentroFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0008)*5;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#EA80FC';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(234,128,252,0.95)';ctx.shadowBlur=ps*7;
  ([
    // back spikes pointing up
    [-8,-3],[-8,-4],[-6,-3],[-6,-4],[-6,-5],[-4,-3],[-4,-4],[-4,-5],
    [-2,-4],[-2,-5],[-2,-6],[0,-4],[0,-5],[0,-6],
    [2,-4],[2,-5],[4,-4],[4,-5],
    // shoulder spikes pointing outward
    [-7,-2],[-8,-2],[-9,-2],[-9,-1],
    [5,-2],[6,-2],[7,-2],[7,-1],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [-8,-2],[-7,-2],[-6,-2],[-5,-2],[-4,-2],[-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],[4,-2],[5,-2],
    [-9,-1],[-8,-1],[-7,-1],[-6,-1],[-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],[5,-1],[6,-1],
    [-9,0],[-8,0],[-7,0],[-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],
    [-9,1],[-8,1],[-7,1],[-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],
    [-8,2],[-7,2],[-6,2],[-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],[3,2],[4,2],[5,2],
    [6,-2],[7,-2],[8,-2],[7,-1],[8,-1],[9,-1],[8,0],[9,0],[9,1],
    [-10,0],[-11,0],[-12,-1],[-12,0],[-12,1],
    [3,3],[4,3],[3,4],[4,4],[0,3],[1,3],[0,4],[1,4],
    [-4,3],[-3,3],[-4,4],[-3,4],[-7,3],[-6,3],[-7,4],[-6,4],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A0033';B(8,-1);
  ctx.restore();
};

/* ── Pixel art: Giganoto (Giganotosaurus — the bigger rival) ────────────── */
const drawGiganotoFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*5;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#FF1744';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(255,23,68,0.95)';ctx.shadowBlur=ps*6;
  ([[-3,-8],[-2,-8],[-1,-8],[0,-8],[1,-8],[2,-8],[3,-8]] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [-4,-8],[-3,-8],[-2,-8],[-1,-8],[0,-8],[1,-8],[2,-8],[3,-8],[4,-8],
    [-4,-7],[-3,-7],[-2,-7],[-1,-7],[0,-7],[1,-7],[2,-7],[3,-7],[4,-7],[5,-7],
    [-3,-6],[-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],[4,-6],[5,-6],[6,-6],
    [-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],[4,-5],[5,-5],[6,-5],[7,-5],[8,-5],
    [-2,-5],[-1,-5],[0,-5],[1,-5],[2,-5],
    [3,-4],[4,-4],[5,-4],[6,-4],[7,-4],[8,-4],[9,-4],[10,-4],
    [-4,-4],[-3,-4],[-2,-4],[-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],
    [-5,-3],[-4,-3],[-3,-3],[-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],
    [-8,-2],[-7,-2],[-6,-2],[-5,-2],[-4,-2],[-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],[4,-2],
    [-9,-1],[-8,-1],[-7,-1],[-6,-1],[-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],[5,-1],
    [-9,0],[-8,0],[-7,0],[-6,0],[-5,0],[-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],
    [-8,1],[-7,1],[-6,1],[-5,1],[-4,1],[-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1],
    [-7,2],[-6,2],[-5,2],[-4,2],[-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],[3,2],
    [4,-2],[5,-2],[6,-2],[6,-1],[7,-1],
    [-10,0],[-11,0],[-12,0],[-12,1],[-13,1],[-13,2],
    [-1,3],[0,3],[1,3],[2,3],[-3,3],[-2,3],
    [-1,4],[0,4],[1,4],[-3,4],[-2,4],
    [-1,5],[0,5],[1,5],[2,5],[-2,5],[-3,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A0000';B(2,-6);
  ctx.restore();
};

/* ── Pixel art: Dromy (Dromaeosaurus compact raptor) ────────────────────── */
const drawDromyFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0014)*7;
  ctx.save();ctx.translate(cx,cy+fy);
  ctx.fillStyle='#FF5722';
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  ctx.shadowColor='rgba(255,87,34,0.95)';ctx.shadowBlur=ps*7;
  ([[-2,3],[-3,3],[-4,3],[-4,2],[-5,2]] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=ps*4;
  ([
    [-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],
    [-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],[4,-4],[5,-4],
    [0,-3],[1,-3],[2,-3],[3,-3],[4,-3],[5,-3],[6,-3],
    [2,-2],[3,-2],[4,-2],[5,-2],[6,-2],[7,-2],
    [-1,-3],[0,-3],[1,-3],[2,-3],
    [3,-1],[4,-1],[5,-1],[6,-1],[7,-1],
    [-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],
    [-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],
    [-3,1],[-2,1],[-1,1],[0,1],[1,1],
    [-2,2],[-1,2],[0,2],[1,2],
    [2,-1],[3,-1],[3,0],
    [-4,0],[-5,0],[-6,0],[-7,0],[-8,1],[-9,1],
    [0,3],[1,3],[-1,3],[0,4],[1,4],[-1,4],
    [-1,5],[0,5],[1,5],[2,5],
  ] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.shadowBlur=0;ctx.fillStyle='#1A0800';B(1,-4);
  ctx.restore();
};

// #049 NANUQ — arctic T-Rex, ice blue
const drawNanuqFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  // frost breath glow
  ctx.fillStyle='#E3F2FD';ctx.shadowColor='rgba(144,202,249,0.95)';ctx.shadowBlur=ps*9;
  ([[-5,-7],[-6,-6],[-7,-5],[-8,-4],[-7,-3],[-6,-2]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // body
  ctx.fillStyle='#90CAF9';ctx.shadowBlur=ps*4;
  ([[-3,-8],[-2,-8],[-1,-8],[0,-8],[1,-8],[-4,-7],[-3,-7],[-2,-7],[-1,-7],[0,-7],[1,-7],[2,-7],
    [-4,-6],[-3,-6],[-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],
    [-5,-5],[-4,-5],[-3,-5],[-2,-5],[-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],
    [-5,-4],[-4,-4],[-3,-4],[-2,-4],[-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],[4,-4],
    [-5,-3],[-4,-3],[-3,-3],[-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],[4,-3],
    [-5,-2],[-4,-2],[-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],[4,-2],
    [-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],
    [-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],
    [-2,2],[-1,2],[0,2],[1,2],
    [-1,3],[0,3],[1,3],
    [-2,4],[-1,4],[1,4],[2,4],
    [-2,5],[-1,5],[1,5],[2,5]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // tail
  ctx.fillStyle='#BBDEFB';
  ([[-6,-1],[-7,-1],[-8,-2],[-9,-2],[-10,-3],[-11,-3]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // eye
  ctx.shadowBlur=0;ctx.fillStyle='#0D47A1';B(0,-7);
  ctx.restore();
};

// #050 REAPER — dark predator, red glow eyes
const drawReaperFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  // glowing red eyes
  ctx.fillStyle='#FF1744';ctx.shadowColor='rgba(255,23,68,0.98)';ctx.shadowBlur=ps*10;
  (([[0,-7],[1,-7]] as [number,number][])).forEach(([c,r])=>B(c,r));
  // serrated back crest
  ctx.fillStyle='#455A64';ctx.shadowColor='rgba(69,90,100,0.9)';ctx.shadowBlur=ps*6;
  ([[-1,-9],[1,-9],[3,-9],[-1,-10],[1,-10]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // body
  ctx.shadowBlur=ps*3;
  ([[-3,-8],[-2,-8],[-1,-8],[0,-8],[1,-8],[2,-8],[3,-8],
    [-4,-7],[-3,-7],[-2,-7],[-1,-7],[0,-7],[1,-7],[2,-7],[3,-7],
    [-4,-6],[-3,-6],[-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],[4,-6],
    [-5,-5],[-4,-5],[-3,-5],[-2,-5],[-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],[4,-5],
    [-5,-4],[-4,-4],[-3,-4],[-2,-4],[-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],[4,-4],
    [-5,-3],[-4,-3],[-3,-3],[-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],[4,-3],
    [-5,-2],[-4,-2],[-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],[4,-2],
    [-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],
    [-2,1],[-1,1],[0,1],[1,1],
    [-1,2],[0,2],[1,2],
    [-2,3],[-1,3],[1,3],[2,3],
    [-2,4],[-1,4],[1,4],[2,4]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // tail
  ctx.fillStyle='#37474F';
  ([[-6,-1],[-7,-2],[-8,-2],[-9,-3],[-10,-3],[-11,-4]] as [number,number][]).forEach(([c,r])=>B(c,r));
  ctx.restore();
};

// #051 STYGA — dome head with violet radiating spikes
const drawStygaFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  // dome spikes radiating
  ctx.fillStyle='#CE93D8';ctx.shadowColor='rgba(170,0,255,0.95)';ctx.shadowBlur=ps*9;
  ([[-4,-10],[-2,-11],[0,-12],[2,-11],[4,-10],[5,-9]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // dome
  ctx.fillStyle='#AA00FF';ctx.shadowBlur=ps*5;
  ([[-4,-8],[-3,-9],[-2,-9],[-1,-9],[0,-9],[1,-9],[2,-9],[3,-9],[4,-8],
    [-5,-7],[-4,-7],[-3,-7],[-2,-7],[-1,-7],[0,-7],[1,-7],[2,-7],[3,-7],[4,-7],[5,-7],
    [-5,-6],[-4,-6],[-3,-6],[-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],[4,-6],[5,-6]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // body
  ctx.fillStyle='#7B1FA2';ctx.shadowBlur=ps*3;
  ([[-5,-5],[-4,-5],[-3,-5],[-2,-5],[-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],[4,-5],[5,-5],
    [-5,-4],[-4,-4],[-3,-4],[-2,-4],[-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],[4,-4],[5,-4],
    [-5,-3],[-4,-3],[-3,-3],[-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],[4,-3],
    [-5,-2],[-4,-2],[-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],[4,-2],
    [-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],
    [-2,1],[-1,1],[0,1],[1,1],
    [-1,2],[0,2],[1,2],
    [-2,3],[-1,3],[1,3],[2,3],
    [-2,4],[-1,4],[1,4],[2,4]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // tail
  ctx.fillStyle='#6A1B9A';
  ([[-6,0],[-7,-1],[-8,-1],[-9,-2],[-10,-2]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // eye
  ctx.shadowBlur=0;ctx.fillStyle='#F3E5F5';B(2,-7);
  ctx.restore();
};

// #052 KRONOS — massive pliosaur, half-submerged
const drawKronosFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.0008)*4;
  ctx.save();ctx.translate(cx,cy+fy);
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  // massive skull (half of body length)
  ctx.fillStyle='#1565C0';ctx.shadowColor='rgba(13,71,161,0.95)';ctx.shadowBlur=ps*8;
  ([[-11,-5],[-10,-5],[-9,-5],[-8,-5],[-7,-5],[-6,-5],[-5,-5],[-11,-4],[-10,-4],[-9,-4]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // teeth
  ctx.fillStyle='#E3F2FD';ctx.shadowBlur=ps*5;
  ([[-10,-6],[-8,-6],[-6,-6],[-4,-6]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // body
  ctx.fillStyle='#0D47A1';ctx.shadowBlur=ps*4;
  ([[-5,-4],[-4,-4],[-3,-4],[-2,-4],[-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],[4,-4],[5,-4],
    [-5,-3],[-4,-3],[-3,-3],[-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],[4,-3],[5,-3],[6,-3],
    [-5,-2],[-4,-2],[-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],[4,-2],[5,-2],[6,-2],[7,-2],
    [-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],[5,-1],[6,-1],[7,-1],
    [-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],
    [-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],[4,1]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // flippers
  ctx.fillStyle='#1976D2';
  ([[-3,-3],[-2,-4],[4,-4],[5,-3]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // eye
  ctx.shadowBlur=0;ctx.fillStyle='#E3F2FD';B(-7,-5);
  ctx.restore();
};

// #053 TITANIS — terror bird, hooked beak, no wings
const drawTitanisFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  // massive hooked beak
  ctx.fillStyle='#FFF176';ctx.shadowColor='rgba(245,127,23,0.95)';ctx.shadowBlur=ps*8;
  ([[-5,-8],[-6,-7],[-7,-7],[-8,-6],[-9,-5],[-10,-4],[-10,-3]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // head + crest
  ctx.fillStyle='#F57F17';ctx.shadowBlur=ps*4;
  ([[-2,-10],[-1,-10],[0,-10],[1,-10],[-3,-9],[-2,-9],[-1,-9],[0,-9],[1,-9],[2,-9],
    [-4,-8],[-3,-8],[-2,-8],[-1,-8],[0,-8],[1,-8],[2,-8],
    [-4,-7],[-3,-7],[-2,-7],[-1,-7],[0,-7],[1,-7]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // body (stocky, no wings)
  ctx.fillStyle='#E65100';ctx.shadowBlur=ps*3;
  ([[-3,-6],[-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],
    [-4,-5],[-3,-5],[-2,-5],[-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],[4,-5],
    [-4,-4],[-3,-4],[-2,-4],[-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],[4,-4],
    [-4,-3],[-3,-3],[-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],[4,-3],
    [-4,-2],[-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],
    [-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],
    [-2,0],[-1,0],[0,0],[1,0],
    [-1,1],[0,1],[-1,2],[0,2],
    [-2,3],[-1,3],[0,3],[1,3],
    [-2,4],[-1,4],[0,4],[1,4],
    [-2,5],[-1,5],[0,5],[1,5]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // eye
  ctx.shadowBlur=0;ctx.fillStyle='#FFF9C4';B(-1,-8);
  ctx.restore();
};

// #054 MINMI — tiny ankylosaur, smallest armored
const drawMinmiFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*5;
  ctx.save();ctx.translate(cx,cy+fy);
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  // spikes
  ctx.fillStyle='#F0F4C3';ctx.shadowColor='rgba(175,180,43,0.95)';ctx.shadowBlur=ps*7;
  ([[-5,-5],[-3,-6],[-1,-6],[1,-6],[3,-6],[5,-5]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // body (small, wide)
  ctx.fillStyle='#AFB42B';ctx.shadowBlur=ps*4;
  ([[-5,-4],[-4,-4],[-3,-4],[-2,-4],[-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],[4,-4],[5,-4],
    [-6,-3],[-5,-3],[-4,-3],[-3,-3],[-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],[4,-3],[5,-3],[6,-3],
    [-6,-2],[-5,-2],[-4,-2],[-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],[4,-2],[5,-2],[6,-2],
    [-5,-1],[-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],[5,-1],
    [-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // legs (short)
  ctx.fillStyle='#827717';
  ([[-4,1],[-3,1],[3,1],[4,1],[-4,2],[-3,2],[3,2],[4,2]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // tail club
  ctx.fillStyle='#AFB42B';ctx.shadowColor='rgba(175,180,43,0.9)';ctx.shadowBlur=ps*6;
  ([[-7,-1],[-8,-1],[-9,-2],[-10,-2],[-11,-2]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // head
  ctx.fillStyle='#C0CA33';ctx.shadowBlur=ps*3;
  ([[-4,-5],[-3,-5]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // eye
  ctx.shadowBlur=0;ctx.fillStyle='#1A237E';B(-3,-5);
  ctx.restore();
};

// #055 PROTO — small ceratopsian, tiny frill no horn
const drawProtoFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  // small frill glow
  ctx.fillStyle='#FFCCBC';ctx.shadowColor='rgba(212,160,65,0.95)';ctx.shadowBlur=ps*8;
  ([[-3,-9],[-2,-10],[-1,-10],[0,-10],[1,-10],[2,-9],[3,-9]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // head
  ctx.fillStyle='#D4A041';ctx.shadowBlur=ps*4;
  ([[-4,-8],[-3,-8],[-2,-8],[-1,-8],[0,-8],[1,-8],[2,-8],[3,-8],
    [-5,-7],[-4,-7],[-3,-7],[-2,-7],[-1,-7],[0,-7],[1,-7],[2,-7],[3,-7],[4,-7]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // beak
  ctx.fillStyle='#FFF9C4';
  ([[-6,-7],[-7,-6]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // body
  ctx.fillStyle='#BF8930';ctx.shadowBlur=ps*3;
  ([[-5,-6],[-4,-6],[-3,-6],[-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],[4,-6],
    [-5,-5],[-4,-5],[-3,-5],[-2,-5],[-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],[4,-5],[5,-5],
    [-5,-4],[-4,-4],[-3,-4],[-2,-4],[-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],[4,-4],[5,-4],
    [-4,-3],[-3,-3],[-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],[4,-3],
    [-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // legs
  ctx.fillStyle='#A0772A';
  ([[-3,-1],[-2,-1],[2,-1],[3,-1],[-3,0],[-2,0],[2,0],[3,0],[-2,1],[-1,1],[1,1],[2,1]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // tail
  ctx.fillStyle='#BF8930';
  ([[5,-3],[6,-3],[7,-4],[8,-4]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // eye
  ctx.shadowBlur=0;ctx.fillStyle='#3E2723';B(-2,-8);
  ctx.restore();
};

// #056 CONCAVA — mystery concave sail/hump theropod
const drawConcavaFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  // concave sail (dips inward)
  ctx.fillStyle='#FFD54F';ctx.shadowColor='rgba(249,168,37,0.95)';ctx.shadowBlur=ps*9;
  ([[-2,-11],[-1,-10],[0,-9],[1,-10],[2,-11],[3,-11],[4,-10]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // head
  ctx.fillStyle='#F9A825';ctx.shadowBlur=ps*4;
  ([[-4,-8],[-3,-8],[-2,-8],[-1,-8],[0,-8],[-5,-7],[-4,-7],[-3,-7],[-2,-7],[-1,-7],[0,-7]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // body
  ctx.fillStyle='#F57F00';ctx.shadowBlur=ps*3;
  ([[-3,-7],[-2,-7],[-1,-7],[0,-7],[1,-7],[2,-7],[3,-7],
    [-4,-6],[-3,-6],[-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],[4,-6],
    [-5,-5],[-4,-5],[-3,-5],[-2,-5],[-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],[4,-5],
    [-5,-4],[-4,-4],[-3,-4],[-2,-4],[-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],[4,-4],
    [-5,-3],[-4,-3],[-3,-3],[-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],[4,-3],
    [-5,-2],[-4,-2],[-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],
    [-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],
    [-3,0],[-2,0],[-1,0],[0,0],[1,0],
    [-2,1],[-1,1],[0,1],[-1,2],[0,2],
    [-2,3],[-1,3],[1,3],[2,3],
    [-2,4],[-1,4],[1,4],[2,4]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // tail
  ctx.fillStyle='#E65C00';
  ([[-6,0],[-7,-1],[-8,-1],[-9,-2],[-10,-2],[-11,-3]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // eye
  ctx.shadowBlur=0;ctx.fillStyle='#1A237E';B(-2,-8);
  ctx.restore();
};

// #057 SINO — Chinese ceratopsian, wide parrot-frill
const drawSinoFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  // wide ornate frill
  ctx.fillStyle='#DCEDC8';ctx.shadowColor='rgba(139,195,74,0.95)';ctx.shadowBlur=ps*9;
  ([[-4,-11],[-3,-11],[-2,-11],[-1,-11],[0,-11],[1,-11],[2,-11],[3,-11],[4,-11],
    [-5,-10],[5,-10],[-6,-9],[6,-9]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // head
  ctx.fillStyle='#8BC34A';ctx.shadowBlur=ps*4;
  ([[-3,-9],[-2,-9],[-1,-9],[0,-9],[1,-9],[2,-9],[3,-9],
    [-4,-8],[-3,-8],[-2,-8],[-1,-8],[0,-8],[1,-8],[2,-8],[3,-8],[4,-8],
    [-4,-7],[-3,-7],[-2,-7],[-1,-7],[0,-7],[1,-7],[2,-7]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // parrot beak
  ctx.fillStyle='#FFF59D';
  ([[-5,-7],[-6,-8],[-7,-8],[-7,-7]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // body
  ctx.fillStyle='#689F38';ctx.shadowBlur=ps*3;
  ([[-4,-6],[-3,-6],[-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],[4,-6],
    [-5,-5],[-4,-5],[-3,-5],[-2,-5],[-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],[4,-5],[5,-5],
    [-5,-4],[-4,-4],[-3,-4],[-2,-4],[-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],[4,-4],[5,-4],
    [-4,-3],[-3,-3],[-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],[4,-3],
    [-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // legs
  ctx.fillStyle='#558B2F';
  ([[-3,-1],[-2,-1],[2,-1],[3,-1],[-3,0],[-2,0],[2,0],[3,0],[-2,1],[-1,1],[1,1],[2,1]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // tail
  ctx.fillStyle='#7CB342';
  ([[5,-3],[6,-3],[7,-4],[8,-4],[9,-5]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // eye
  ctx.shadowBlur=0;ctx.fillStyle='#1B5E20';B(-1,-8);
  ctx.restore();
};

// #058 PACHYRHINO — nose boss (not horn), stocky ceratopsian
const drawPachyrhinoFn:DrawFn=(ctx,cx,cy,ps,ts)=>{
  const fy=Math.sin(ts*0.001)*6;
  ctx.save();ctx.translate(cx,cy+fy);
  const B=(c:number,r:number)=>ctx.fillRect(c*ps-ps*.5,r*ps-ps*.5,ps,ps);
  // nose boss (wide flat boss)
  ctx.fillStyle='#BCAAA4';ctx.shadowColor='rgba(121,85,72,0.95)';ctx.shadowBlur=ps*8;
  ([[-7,-6],[-8,-5],[-9,-5],[-8,-4],[-7,-4]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // ornate frill
  ctx.fillStyle='#A1887F';ctx.shadowBlur=ps*5;
  ([[-3,-10],[-2,-11],[-1,-11],[0,-11],[1,-11],[2,-11],[3,-10],[4,-10]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // head
  ctx.fillStyle='#795548';ctx.shadowBlur=ps*4;
  ([[-5,-8],[-4,-8],[-3,-8],[-2,-8],[-1,-8],[0,-8],[1,-8],[2,-8],[3,-8],
    [-6,-7],[-5,-7],[-4,-7],[-3,-7],[-2,-7],[-1,-7],[0,-7],[1,-7],[2,-7],[3,-7],[4,-7],
    [-6,-6],[-5,-6],[-4,-6],[-3,-6],[-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],[3,-6],
    [-6,-5],[-5,-5],[-4,-5],[-3,-5],[-2,-5],[-1,-5],[0,-5],[1,-5],[2,-5]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // body
  ctx.fillStyle='#6D4C41';ctx.shadowBlur=ps*3;
  ([[-4,-4],[-3,-4],[-2,-4],[-1,-4],[0,-4],[1,-4],[2,-4],[3,-4],[4,-4],
    [-5,-3],[-4,-3],[-3,-3],[-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],[4,-3],[5,-3],
    [-5,-2],[-4,-2],[-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],[4,-2],[5,-2],
    [-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],
    [-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // legs
  ctx.fillStyle='#5D4037';
  ([[-3,1],[-2,1],[2,1],[3,1],[-3,2],[-2,2],[2,2],[3,2],[-2,3],[-1,3],[1,3],[2,3]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // tail
  ctx.fillStyle='#795548';
  ([[5,-1],[6,-1],[7,-2],[8,-2],[9,-3]] as [number,number][]).forEach(([c,r])=>B(c,r));
  // eye
  ctx.shadowBlur=0;ctx.fillStyle='#EFEBE9';B(-2,-7);
  ctx.restore();
};

/* ── Generic character canvas ──────────────────────────────────────────────── */
function CharCanvas({ draw, auroraRgb }:{ draw:DrawFn; auroraRgb:string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  useEffect(()=>{drawRef.current=draw;},[draw]);

  useEffect(()=>{
    const maybeCanvas=ref.current; if(!maybeCanvas) return;
    const canvas:HTMLCanvasElement=maybeCanvas;
    const ctx=canvas.getContext('2d')!;
    let rafId=0,dpr=1,cssW=0,cssH=0;
    const [ar,ag,ab]=auroraRgb.split(',').map(Number);

    const stars=Array.from({length:80},()=>({x:Math.random(),y:Math.random(),r:0.3+Math.random()*1.3,phase:Math.random()*Math.PI*2,speed:0.5+Math.random()*2.5}));
    const pColor=`rgba(${auroraRgb},0.85)`;
    const particles=Array.from({length:14},(_,i)=>({x:Math.random(),y:Math.random(),vx:(Math.random()-.5)*0.00012,vy:-0.00006-Math.random()*0.0001,r:0.8+Math.random()*1.8,color:[pColor,'#ffffff',pColor,'rgba(200,200,255,0.7)'][i%4],phase:Math.random()*Math.PI*2}));

    function resize(){
      dpr=Math.min(window.devicePixelRatio||1,2);
      const rect=canvas.getBoundingClientRect();
      cssW=rect.width;cssH=rect.height;
      if(cssW>0&&cssH>0){canvas.width=cssW*dpr;canvas.height=cssH*dpr;}
    }
    resize();

    function frame(ts:number){
      if(cssW===0||cssH===0){rafId=requestAnimationFrame(frame);return;}
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,cssW,cssH);
      // deep space bg
      const bg=ctx.createRadialGradient(cssW*.5,cssH*.38,0,cssW*.5,cssH*.5,Math.max(cssW,cssH)*.95);
      bg.addColorStop(0,'rgba(0,16,40,1)');bg.addColorStop(.4,'rgba(2,9,22,1)');bg.addColorStop(1,'rgba(1,3,10,1)');
      ctx.fillStyle=bg;ctx.fillRect(0,0,cssW,cssH);
      // aurora
      const aX=cssW*.5,aY=cssH*.44;
      const au=ctx.createRadialGradient(aX,aY,0,aX,aY,cssW*.75);
      au.addColorStop(0,`rgba(${ar},${ag},${ab},0.13)`);
      au.addColorStop(.35,`rgba(${Math.round(ar*.3)},${Math.round(ag*.3)},${Math.round(ab*.5+150)},0.07)`);
      au.addColorStop(.7,`rgba(${ar},${ag},${ab},0.04)`);
      au.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=au;ctx.fillRect(0,0,cssW,cssH);
      // pulse
      const pu=.5+.5*Math.sin(ts*.0005);
      const a2=ctx.createRadialGradient(cssW*.6,cssH*.3,0,cssW*.6,cssH*.3,cssW*.45);
      a2.addColorStop(0,`rgba(${ar},${ag},${ab},${0.05*pu})`);a2.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=a2;ctx.fillRect(0,0,cssW,cssH);
      // stars
      stars.forEach(s=>{
        const b=.2+.8*Math.abs(Math.sin(ts*.001*s.speed+s.phase));
        ctx.save();ctx.globalAlpha=b*.7;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.x*cssW,s.y*cssH,s.r,0,Math.PI*2);ctx.fill();ctx.restore();
      });
      const cx2=cssW*.52,cy2=cssH*.46;
      const ps=Math.max(5,Math.floor(cssW/28));
      // under-glow
      const ug=ctx.createRadialGradient(cx2,cy2+ps*5,0,cx2,cy2+ps*5,ps*14);
      ug.addColorStop(0,`rgba(${ar},${ag},${ab},0.12)`);ug.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=ug;ctx.fillRect(0,0,cssW,cssH);
      // bloom
      const bl=ctx.createRadialGradient(cx2,cy2,0,cx2,cy2,ps*20);
      bl.addColorStop(0,`rgba(${ar},${ag},${ab},0.06)`);bl.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=bl;ctx.fillRect(0,0,cssW,cssH);
      // character
      drawRef.current(ctx,cx2,cy2,ps,ts);
      // particles
      particles.forEach(p=>{
        p.x=((p.x+p.vx+1)%1);p.y=((p.y+p.vy+1)%1);
        const pa=.15+.85*Math.abs(Math.sin(ts*.0007+p.phase));
        ctx.save();ctx.globalAlpha=pa*.4;ctx.shadowColor=p.color;ctx.shadowBlur=5;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x*cssW,p.y*cssH,p.r,0,Math.PI*2);ctx.fill();ctx.restore();
      });
      rafId=requestAnimationFrame(frame);
    }
    rafId=requestAnimationFrame(frame);
    const ro=new ResizeObserver(()=>resize());ro.observe(canvas);
    return()=>{cancelAnimationFrame(rafId);ro.disconnect();};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  return <canvas ref={ref} style={{position:'absolute',inset:0,width:'100%',height:'100%',display:'block'}}/>;
}

/* ── Character data ───────────────────────────────────────────────────────── */
const CHARACTERS:CharData[] = [
  {
    num:'#001', name:'BRONTY', subtitle:'The Original Flier', game:'DinoSoar',
    lore:'First off the bench. Bronty launched this whole operation — a big-hearted sauropod who flaps her prehistoric wings against gravity, pipes, and the crushing weight of expectation. She\'s been through it. She keeps flying anyway.',
    stats:[{label:'Speed',value:7},{label:'Style',value:9},{label:'Grit',value:8},{label:'Wingspan',value:10}],
    power:{name:'Wing Flap',desc:'Defies gravity with sheer prehistoric enthusiasm. One flap at a time.'},
    color:'#38D4FF', auroraRgb:'0,180,255',
    nameGrad:'linear-gradient(135deg,#38D4FF 0%,#90F0FF 42%,#9B5CF6 85%)',
    cta:{label:'Play DinoSoar →',href:'/dinosoar.html'},
    draw:drawBrontyFn,
  },
  {
    num:'#002', name:'REXX', subtitle:'The Unstoppable', game:'Rex Run',
    lore:'Rexx doesn\'t stop. Not for obstacles, not for physics, not for any well-meaning bystander who didn\'t get out of the way in time. Running is the only setting.',
    stats:[{label:'Speed',value:9},{label:'Power',value:10},{label:'Grit',value:10},{label:'Tiny Arms',value:2}],
    power:{name:'Rex Charge',desc:'Full-tilt unstoppable sprint. No brakes. No regrets. Teeth optional.'},
    color:'#7EFF50', auroraRgb:'126,255,80',
    nameGrad:'linear-gradient(135deg,#7EFF50 0%,#BBFF70 42%,#40FF90 85%)',
    draw:drawRexxFn,
  },
  {
    num:'#003', name:'PTERA', subtitle:'The Speed Demon', game:'Speed Type',
    lore:'She types before she lands. Ptera is the fastest thing in the Dinosaurai universe and she\'s well aware of it. Every keystroke a kill shot. Every word a victory lap.',
    stats:[{label:'Speed',value:10},{label:'Agility',value:10},{label:'Style',value:8},{label:'Wingspan',value:9}],
    power:{name:'Screech Dive',desc:'Descends at impossible velocity. Keys clatter. Records shatter. Opponents cry.'},
    color:'#9B5CF6', auroraRgb:'155,92,246',
    nameGrad:'linear-gradient(135deg,#9B5CF6 0%,#C9A8FF 42%,#00D4FF 85%)',
    draw:drawPteraFn,
  },
  {
    num:'#004', name:'RAPTORIA', subtitle:'The Apex Hunter', game:'Dino Clash',
    lore:'Pack hunter. Problem solver. She figured out how to open the door before anyone thought to lock it. Quick, calculating, and absolutely unnerving. The sickle claw is not the most dangerous thing about her.',
    stats:[{label:'Speed',value:9},{label:'Agility',value:10},{label:'Stealth',value:8},{label:'Claw',value:10}],
    power:{name:'Sickle Strike',desc:'One slash. Devastating. The killing claw curves up and forward — designed for one thing only.'},
    color:'#FF6B35', auroraRgb:'255,107,53',
    nameGrad:'linear-gradient(135deg,#FF6B35 0%,#FFB07A 42%,#FF4500 85%)',
    draw:drawKlawFn,
  },
  {
    num:'#005', name:'SPIKES', subtitle:'The Deliberate', game:'DinoTris',
    lore:'Armored. Patient. Inevitable. Spikes doesn\'t panic-drop. She reads the board, waits for the moment, then lands the perfect T-spin like she knew it all along. Those plates aren\'t just for show.',
    stats:[{label:'Defense',value:10},{label:'Patience',value:10},{label:'Style',value:8},{label:'Plates',value:10}],
    power:{name:'Plate Slam',desc:'Clears four lines simultaneously. No celebration. Just a slow, satisfied tail swing.'},
    color:'#BBFF70', auroraRgb:'187,255,112',
    nameGrad:'linear-gradient(135deg,#BBFF70 0%,#EEFF99 42%,#40E0FF 85%)',
    draw:drawSpikesFn,
  },
  {
    num:'#006', name:'TRICERAPOP', subtitle:'The Unstoppable Charge', game:'Dino Clash',
    lore:'She doesn\'t negotiate. She doesn\'t detour. Tricerapop sees the obstacle, lowers the horns, and the obstacle becomes a memory. Three horns. Zero patience. Infinite momentum.',
    stats:[{label:'Charge',value:10},{label:'Defense',value:9},{label:'Momentum',value:10},{label:'Style',value:7}],
    power:{name:'Triple Horn Charge',desc:'Once she starts moving, physics has no opinion. Three horns forward, full speed, end of discussion.'},
    color:'#FF2D78', auroraRgb:'255,45,120',
    nameGrad:'linear-gradient(135deg,#FF2D78 0%,#FF80B0 42%,#FF0066 85%)',
    draw:drawTricerapopFn,
  },
  {
    num:'#007', name:'STEGATLANTIS', subtitle:'The Ancient Tide', game:'Pangaea',
    lore:'From depths uncharted. Stegatlantis predates the name. The plates pulse like bioluminescence in dark water. She was here before the continents separated and she has strong opinions about the current arrangement.',
    stats:[{label:'Endurance',value:10},{label:'Mystery',value:10},{label:'Patience',value:9},{label:'Plates',value:10}],
    power:{name:'Tidal Surge',desc:'The ocean has waited 250 million years. So can she. When she moves, everything moves with her.'},
    color:'#06D6A0', auroraRgb:'6,214,160',
    nameGrad:'linear-gradient(135deg,#06D6A0 0%,#80FFD6 42%,#00B4D8 85%)',
    draw:drawStegatlantisfn,
  },
  {
    num:'#008', name:'MOSSY', subtitle:'The Ancient Leviathan', game:'Fossil Hunt',
    lore:'She was the ocean. All of it. Mossy patrolled warm Cretaceous seas before the concept of "too big" was invented. Now she surfaces once in a while to remind everyone that the deep still has opinions. They are not gentle opinions.',
    stats:[{label:'Power',value:10},{label:'Depth',value:10},{label:'Speed',value:8},{label:'Jaw Force',value:10}],
    power:{name:'Abyss Surge',desc:'Rises from the dark without warning. One snap. Gone. The sea forgets nothing.'},
    color:'#00843D', auroraRgb:'0,132,61',
    nameGrad:'linear-gradient(135deg,#00843D 0%,#44D17A 42%,#00C9A0 85%)',
    draw:drawMossyfn,
  },
  {
    num:'#009', name:'PYRANNOSAURUS', subtitle:'The Burning Colossus', game:'Rex Run',
    lore:'Every step leaves a scorch mark. Pyrannosaurus didn\'t evolve from fire — it evolved into fire. Runs hotter than the Cretaceous itself, and the Cretaceous was already pretty unpleasant. The other runners have a head start. They don\'t appreciate this fact.',
    stats:[{label:'Speed',value:9},{label:'Power',value:10},{label:'Heat',value:10},{label:'Tiny Arms',value:2}],
    power:{name:'Magma Rush',desc:'Incinerates the track. Every footprint is a crater. The other runners have a head start. They regret this.'},
    color:'#DC143C', auroraRgb:'220,20,60',
    nameGrad:'linear-gradient(135deg,#DC143C 0%,#FF6B35 42%,#FFD700 85%)',
    draw:drawPyrannFn,
  },
  {
    num:'#010', name:'ANKY', subtitle:'The Living Tank', game:'DinoBlox',
    lore:'Anky has never lost a fight. Anky has also never started one. She exists, armored, patient, and profoundly unbothered. The tail club is decorative. It has never been decorative.',
    stats:[{label:'Defense',value:10},{label:'Armor',value:10},{label:'Tail',value:10},{label:'Speed',value:3}],
    power:{name:'Tail Club',desc:'One swing. Seismic. Geologists will find this impact in the fossil record.'},
    color:'#C4873A', auroraRgb:'196,135,58',
    nameGrad:'linear-gradient(135deg,#C4873A 0%,#E8B567 42%,#8B5E20 85%)',
    draw:drawAnkyFn,
  },
  {
    num:'#011', name:'PACHY', subtitle:'The Dome of Doom', game:'Fossil Hunt',
    lore:'Pachy leads with her head. This is not a metaphor. The dome is solid bone, ten inches thick, tested against every geological formation on record. A living battering ram who wears her weapon on her skull.',
    stats:[{label:'Dome',value:10},{label:'Speed',value:8},{label:'Impact',value:10},{label:'Defense',value:8}],
    power:{name:'Skull Crusher',desc:'Full sprint dome charge. The target does not receive advance notice.'},
    color:'#E8D44D', auroraRgb:'232,212,77',
    nameGrad:'linear-gradient(135deg,#E8D44D 0%,#FFF066 42%,#C8A020 85%)',
    draw:drawPachyFn,
  },
  {
    num:'#012', name:'PARASOL', subtitle:'The Signal Caller', game:'Pangaea',
    lore:'That crest isn\'t decorative — it\'s a resonance chamber. Parasol has been broadcasting across the floodplains for 70 million years and hasn\'t stopped yet. Everything in a two-mile radius knows her frequency.',
    stats:[{label:'Resonance',value:10},{label:'Stamina',value:9},{label:'Speed',value:7},{label:'Crest',value:10}],
    power:{name:'Crest Call',desc:'Broadcasts at subsonic frequency. Every herd responds. Every predator reconsiders its life choices.'},
    color:'#F4845F', auroraRgb:'244,132,95',
    nameGrad:'linear-gradient(135deg,#F4845F 0%,#FFAA88 42%,#FF6B35 85%)',
    draw:drawParasolFn,
  },
  {
    num:'#013', name:'SPINOS', subtitle:'The River Antihero', game:'Dino Clash',
    lore:'The apex predator nobody talks about is always the most dangerous one. Spinos operates at the river\'s edge, patient and twice your size. The sail isn\'t for show. The sail doesn\'t need to be for show.',
    stats:[{label:'Power',value:10},{label:'Patience',value:9},{label:'Stealth',value:8},{label:'Sail',value:10}],
    power:{name:'River Strike',desc:'Emerges from still water without warning. Precision ambush. Nobody checks the river. That is the problem.'},
    color:'#7C3AED', auroraRgb:'124,58,237',
    nameGrad:'linear-gradient(135deg,#7C3AED 0%,#C084FC 42%,#2563EB 85%)',
    draw:drawSpinosFn,
  },
  {
    num:'#014',name:'MAGMADON',subtitle:'The Living Eruption',game:'Dino Clash',
    lore:'Magmadon didn\'t evolve near a volcano. Magmadon IS the volcano. The vents on its back aren\'t battle damage — they\'re fully operational. Opponents have learned that getting too close means getting singed.',
    stats:[{label:'Power',value:10},{label:'Heat',value:10},{label:'Defense',value:9},{label:'Speed',value:4}],
    power:{name:'Lava Surge',desc:'Back vents go critical. Everything within range becomes a geology problem.'},
    color:'#FF4500',auroraRgb:'255,69,0',
    nameGrad:'linear-gradient(135deg,#FF4500 0%,#FF8C00 42%,#FFD700 85%)',
    draw:drawMagmadonFn,
  },
  {
    num:'#015',name:'VOLCANUS',subtitle:'The Superheated',game:'Rex Run',
    lore:'That horn isn\'t bone. Geologists argue about what it is exactly and none of them want to get close enough to find out. Volcanus runs hot in every sense. The track doesn\'t recover quickly.',
    stats:[{label:'Speed',value:8},{label:'Heat',value:10},{label:'Power',value:9},{label:'Horn',value:10}],
    power:{name:'Magma Spike',desc:'Horn hits critical temperature mid-sprint. Trail spontaneously ignites. Running advisable.'},
    color:'#FF8800',auroraRgb:'255,136,0',
    nameGrad:'linear-gradient(135deg,#FF8800 0%,#FFB300 42%,#FF4500 85%)',
    draw:drawVolcanusFn,
  },
  {
    num:'#016',name:'PLESIA',subtitle:'The Long Watch',game:'Fossil Hunt',
    lore:'That neck has been above water for 75 million years, watching. Plesia doesn\'t rush. She doesn\'t need to. Everything worth finding eventually drifts past. She just has to be patient — and she has had a great deal of practice.',
    stats:[{label:'Reach',value:10},{label:'Patience',value:10},{label:'Speed',value:6},{label:'Depth',value:9}],
    power:{name:'Neck Sweep',desc:'Clears a 40-foot radius at the surface. What she reaches, she finds.'},
    color:'#1E90FF',auroraRgb:'30,144,255',
    nameGrad:'linear-gradient(135deg,#1E90FF 0%,#87CEFA 42%,#9B5CF6 85%)',
    draw:drawPlesiaFn,
  },
  {
    num:'#017',name:'ICHTHYA',subtitle:'The Velocity',game:'Fossil Hunt',
    lore:'Ichthya doesn\'t swim. She exits one location and reappears at another. The water between is a formality. Everything about her is optimized for one thing and it shows. No other marine resident has ever seen her clearly — only the wake.',
    stats:[{label:'Speed',value:10},{label:'Agility',value:10},{label:'Stealth',value:8},{label:'Fin',value:9}],
    power:{name:'Sonic Surge',desc:'Exceeds the speed of sound underwater. Creates a shockwave. Fish have opinions.'},
    color:'#00CED1',auroraRgb:'0,206,209',
    nameGrad:'linear-gradient(135deg,#00CED1 0%,#7FFFD4 42%,#1E90FF 85%)',
    draw:drawIchthyaFn,
  },
  {
    num:'#018',name:'KRAKENODON',subtitle:'The Abyss Itself',game:'Pangaea',
    lore:'The deep ocean has one rule: don\'t go deeper than Krakenodon. Nobody made this rule. Nobody needed to. Krakenodon predates the concept of rules and has not found them relevant. The tentacles are new. The attitude is ancient.',
    stats:[{label:'Terror',value:10},{label:'Depth',value:10},{label:'Power',value:10},{label:'Mystery',value:10}],
    power:{name:'Dark Tide',desc:'The sea goes black. The jaw follows. The tentacles are already there.'},
    color:'#8B00FF',auroraRgb:'139,0,255',
    nameGrad:'linear-gradient(135deg,#8B00FF 0%,#DA70D6 42%,#1A0040 85%)',
    draw:drawKrakenodonFn,
  },
  {
    num:'#019',name:'PTERODAX',subtitle:'The Aerial Predator',game:'DinoSoar',
    lore:'Pterodax doesn\'t glide. Pterodax hunts. Wide wings, locked target, zero hesitation. She broke three altitude records on the way down and didn\'t notice. The crest isn\'t decorative — it\'s a targeting system.',
    stats:[{label:'Speed',value:9},{label:'Wingspan',value:10},{label:'Dive',value:10},{label:'Precision',value:9}],
    power:{name:'Power Dive',desc:'Folds wings, drops at terminal velocity. Pulls up at the last possible moment. Emphasis on "possible."'},
    color:'#FF9900',auroraRgb:'255,153,0',
    nameGrad:'linear-gradient(135deg,#FF9900 0%,#FFCC44 42%,#FF4500 85%)',
    draw:drawPterodaxFn,
  },
  {
    num:'#020',name:'QUETZAL',subtitle:'The Sky Emperor',game:'DinoSoar',
    lore:'Quetzal has a 40-foot wingspan and the patience of a geologic era. She doesn\'t compete with other fliers — she simply exists at a different scale. Looking up and seeing Quetzal blot out the sun is the last thing many things have seen.',
    stats:[{label:'Wingspan',value:10},{label:'Endurance',value:10},{label:'Presence',value:10},{label:'Scale',value:10}],
    power:{name:'Sky Sovereign',desc:'Shadow alone covers a square mile. Everything below goes quiet. That\'s not metaphor.'},
    color:'#FFD700',auroraRgb:'255,215,0',
    nameGrad:'linear-gradient(135deg,#FFD700 0%,#FFFACD 42%,#FFA500 85%)',
    draw:drawQuetzalFn,
  },
  {
    num:'#021',name:'ARCHAEON',subtitle:'The First Flight',game:'DinoSoar',
    lore:'Archaeon figured out flight before anyone agreed it was possible. Half bird, half dinosaur, entirely committed to the decision. Feathers where scales used to be. A brain running two operating systems simultaneously. No crashes recorded.',
    stats:[{label:'Agility',value:10},{label:'Speed',value:8},{label:'Feathers',value:10},{label:'IQ',value:9}],
    power:{name:'Evolution Leap',desc:'Rewrites the physics of flight mid-move. Darwin is impressed but cannot keep up.'},
    color:'#A0522D',auroraRgb:'160,82,45',
    nameGrad:'linear-gradient(135deg,#A0522D 0%,#D2691E 42%,#8B4513 85%)',
    draw:drawArchaeonFn,
  },
  {
    num:'#022',name:'DIPLO',subtitle:'The Longest View',game:'Pangaea',
    lore:'The neck sees things first. The tail catches up eventually. In between is a lot of very large dinosaur with a lot of very long thoughts. Diplo has witnessed more geological events than most mountains and takes none of them personally.',
    stats:[{label:'Reach',value:10},{label:'Tail',value:10},{label:'Patience',value:9},{label:'Length',value:10}],
    power:{name:'Whip Tail',desc:'Tail moves faster than sound. Anything in the arc finds out before it hears it coming.'},
    color:'#78C850',auroraRgb:'120,200,80',
    nameGrad:'linear-gradient(135deg,#78C850 0%,#BBFF70 42%,#228B22 85%)',
    draw:drawDiploFn,
  },
  {
    num:'#023',name:'IGUANA',subtitle:'The Spike Thumb',game:'DinoBlox',
    lore:'The thumb spike isn\'t for defense — it\'s for emphasis. Iguana makes her point once, precisely, and does not repeat herself. A surprisingly calm disposition for someone carrying a bone spike on each hand. Usually.',
    stats:[{label:'Precision',value:10},{label:'Defense',value:9},{label:'Thumb',value:10},{label:'Calm',value:7}],
    power:{name:'Thumb Spike',desc:'Single targeted strike. Surgical. The point is made. Literally.'},
    color:'#2ECC40',auroraRgb:'46,204,64',
    nameGrad:'linear-gradient(135deg,#2ECC40 0%,#BBFF70 42%,#00843D 85%)',
    draw:drawIguanaFn,
  },
  {
    num:'#024',name:'GALLIMI',subtitle:'The Pure Speed',game:'Rex Run',
    lore:'Gallimi doesn\'t eat much, doesn\'t fight much, doesn\'t think much — she runs. Faster than anything on two legs in the Cretaceous, and most things on four. The long neck is for aerodynamics. The large eyes are for finding the next horizon.',
    stats:[{label:'Speed',value:10},{label:'Agility',value:10},{label:'Stamina',value:9},{label:'Reflexes',value:10}],
    power:{name:'Sprint Mode',desc:'Top speed achieved in under a second. The dust settles eventually.'},
    color:'#D4A853',auroraRgb:'212,168,83',
    nameGrad:'linear-gradient(135deg,#D4A853 0%,#F0D080 42%,#B8860B 85%)',
    draw:drawGallimiFn,
  },
  {
    num:'#025',name:'COMPY',subtitle:'The Tiny Terror',game:'Dino Clash',
    lore:'Individually, a minor inconvenience. In packs of six, a catastrophe. Compy operates on the principle that size is a state of mind and has 72 million years of receipts to back it up. She has never lost a fight. She has lost some individuals, but the fight she always wins.',
    stats:[{label:'Speed',value:9},{label:'Pack IQ',value:10},{label:'Ferocity',value:9},{label:'Size',value:1}],
    power:{name:'Pack Swarm',desc:'Quantity has a quality all its own. The target disagrees but statistically doesn\'t matter.'},
    color:'#BA55D3',auroraRgb:'186,85,211',
    nameGrad:'linear-gradient(135deg,#BA55D3 0%,#DDA0DD 42%,#8B00FF 85%)',
    draw:drawCompyFn,
  },
  {
    num:'#026',name:'VELOCIA',subtitle:'The Streak',game:'Dino Clash',
    lore:'Smaller than Raptoria, faster than the eye can follow, and genuinely offended by any comparison. Velocia doesn\'t do the door trick — she doesn\'t need to. The door is already open before you realize she was there.',
    stats:[{label:'Speed',value:10},{label:'Agility',value:10},{label:'Claw',value:9},{label:'Stealth',value:10}],
    power:{name:'Ghost Strike',desc:'Strikes from a position nobody was watching. Nobody is ever watching every position.'},
    color:'#FFB300',auroraRgb:'255,179,0',
    nameGrad:'linear-gradient(135deg,#FFB300 0%,#FFE066 42%,#FF6B35 85%)',
    draw:drawVelociaFn,
  },
  {
    num:'#027',name:'CARNO',subtitle:'The Bull of the Cretaceous',game:'Dino Clash',
    lore:'Those horns are load-bearing. Carno\'s entire philosophy involves going through the obstacle rather than around it. Arm reach is compensated for by enthusiasm. The charging distance required before impact is genuinely alarming.',
    stats:[{label:'Charge',value:10},{label:'Power',value:10},{label:'Horns',value:10},{label:'Arms',value:1}],
    power:{name:'Bull Rush',desc:'Horns first, philosophy later. Everything in the path becomes the aftermath.'},
    color:'#B71C1C',auroraRgb:'183,28,28',
    nameGrad:'linear-gradient(135deg,#B71C1C 0%,#E53935 42%,#880000 85%)',
    draw:drawCarnoFn,
  },
  {
    num:'#028',name:'INDOMINA',subtitle:'The Apex of Everything',game:'Dino Clash',
    lore:'Not found in any fossil record. Not documented by any paleontologist. What Indomina IS has been the subject of twelve classified reports and one very nervous committee meeting. The spine ridge isn\'t bone. The coloring isn\'t pigment. The stats are all 10.',
    stats:[{label:'Power',value:10},{label:'Speed',value:10},{label:'Intelligence',value:10},{label:'Unknown',value:10}],
    power:{name:'Hybrid Protocol',desc:'Activates capabilities that have no prior classification. The committee report is still being written.'},
    color:'#E8EAF6',auroraRgb:'200,210,246',
    nameGrad:'linear-gradient(135deg,#E8EAF6 0%,#C5CAE9 42%,#9FA8DA 85%)',
    draw:drawInominaFn,
  },
  {
    num:'#029',name:'THERIZON',subtitle:'The Gentle Apocalypse',game:'Fossil Hunt',
    lore:'Those claws are for reaching tall plants. That\'s the official position and Therizon holds it firmly. Yes, they are four feet long. Yes, they glow. Therizon is a herbivore and would like everyone to remain calm and also perhaps maintain some distance.',
    stats:[{label:'Claws',value:10},{label:'Reach',value:10},{label:'Power',value:9},{label:'Gentleness',value:8}],
    power:{name:'Scythe Harvest',desc:'Technically for vegetation. Everything else in range is a secondary consideration.'},
    color:'#6DAF2F',auroraRgb:'109,175,47',
    nameGrad:'linear-gradient(135deg,#6DAF2F 0%,#A8E063 42%,#00843D 85%)',
    draw:drawTherizonFn,
  },
  {
    num:'#030',name:'EGGSY',subtitle:'The Beginning',game:'DinoBlox',
    lore:'Technically still hatching. Has been "technically still hatching" for three weeks. The egg is now 40% structural suggestion. The small green head sticking out has very strong opinions about Tetris and will tell you all of them.',
    stats:[{label:'Potential',value:10},{label:'Enthusiasm',value:10},{label:'Shell',value:3},{label:'Patience',value:1}],
    power:{name:'Hatch Burst',desc:'Egg fragments everywhere. Reveals 100% baby dinosaur. Immediate chaos follows.'},
    color:'#FFDB89',auroraRgb:'255,219,137',
    nameGrad:'linear-gradient(135deg,#FFDB89 0%,#FFF3C4 42%,#F4845F 85%)',
    draw:drawEggsyFn,
  },
  {
    num:'#031',name:'HATCHY',subtitle:'The Baby Apex',game:'Rex Run',
    lore:'Head larger than body. Arms approximately decorative. Running speed already alarming. Hatchy is three days old and has already knocked over two trees, one researcher, and an entire opinions section. The future is complicated.',
    stats:[{label:'Cuteness',value:10},{label:'Potential',value:10},{label:'Speed',value:6},{label:'Tiny Arms',value:1}],
    power:{name:'Baby Chomp',desc:'No technique. Pure enthusiasm. Statistically more dangerous than it looks.'},
    color:'#98FB98',auroraRgb:'152,251,152',
    nameGrad:'linear-gradient(135deg,#98FB98 0%,#CCFFCC 42%,#7EFF50 85%)',
    draw:drawHatchyFn,
  },
  {
    num:'#032',name:'SPROUT',subtitle:'The Tiny Ancient',game:'DinoTris',
    lore:'The plates haven\'t grown in yet but they\'re glowing. Sprout stacks blocks with a methodical calm that no creature this small should possess. The plates will be magnificent when they arrive. For now, she\'s working on the basics.',
    stats:[{label:'Calm',value:10},{label:'Plates',value:4},{label:'Potential',value:10},{label:'Focus',value:9}],
    power:{name:'Micro Slam',desc:'Small but perfectly placed. The blocks fall exactly where she intends. Every time.'},
    color:'#87CEEB',auroraRgb:'135,206,235',
    nameGrad:'linear-gradient(135deg,#87CEEB 0%,#E0F7FF 42%,#06D6A0 85%)',
    draw:drawSproutFn,
  },
  {
    num:'#033',name:'NIBBLES',subtitle:'The Tiny Danger',game:'Dino Clash',
    lore:'The sickle claw is already there. Already functional. Already sharp. Nibbles is three inches tall and the training data suggests this is a temporary situation. The large eyes are for cuteness. The claw is not for cuteness.',
    stats:[{label:'Cuteness',value:10},{label:'Claw',value:9},{label:'Speed',value:8},{label:'Size',value:1}],
    power:{name:'Baby Slash',desc:'Tiny. Precise. Oddly terrifying. The size does not scale to the commitment.'},
    color:'#FFB7C5',auroraRgb:'255,183,197',
    nameGrad:'linear-gradient(135deg,#FFB7C5 0%,#FFE4EC 42%,#FF6B9D 85%)',
    draw:drawNibblesFn,
  },
  // ── Wave 2: 25 more ─────────────────────────────────────────────────────────
  {
    num:'#034',name:'ALLORO',subtitle:'The Brow Tyrant',game:'Rex Run',
    lore:'Allosaurus with a brow ridge that casts permanent shadow over the eyes. Looks perpetually unimpressed. Statistically the most judgmental dinosaur per square inch of face.',
    stats:[{label:'Power',value:9},{label:'Speed',value:7},{label:'Rage',value:8},{label:'Brow',value:10}],
    power:{name:'Brow Crush',desc:'The brow descends. Enemies flee not from the bite, but from the implied disappointment.'},
    color:'#FF7043',auroraRgb:'255,112,67',
    nameGrad:'linear-gradient(135deg,#FF7043 0%,#FFAB91 42%,#BF360C 85%)',
    draw:drawAlloroFn,
  },
  {
    num:'#035',name:'BARYKO',subtitle:'The Hook Claw',game:'Dino Clash',
    lore:'Baryonyx. One oversized thumb claw the size of a machete. Evolved for fishing. Repurposed for everything else. The claw has its own fan club.',
    stats:[{label:'Claw',value:10},{label:'Fishing',value:9},{label:'Menace',value:8},{label:'Speed',value:7}],
    power:{name:'Hook Strike',desc:'One claw. One motion. The physics of the resulting arc have been studied and deemed excessive.'},
    color:'#26C6DA',auroraRgb:'38,198,218',
    nameGrad:'linear-gradient(135deg,#26C6DA 0%,#80DEEA 42%,#00838F 85%)',
    draw:drawBarykoFn,
  },
  {
    num:'#036',name:'DILOPH',subtitle:'The Frilled Spitter',game:'Dino Clash',
    lore:'Double crest. Extendable frill. Venomous saliva. Dilophosaurus never needed the extras — then it got them anyway. Now it just shows off.',
    stats:[{label:'Venom',value:9},{label:'Frill',value:10},{label:'Crests',value:9},{label:'Drama',value:10}],
    power:{name:'Venom Display',desc:'The frill extends. The venom flies. The target reconsiders its choices.'},
    color:'#EC407A',auroraRgb:'236,64,122',
    nameGrad:'linear-gradient(135deg,#EC407A 0%,#F48FB1 42%,#880E4F 85%)',
    draw:drawDilophFn,
  },
  {
    num:'#037',name:'STYRA',subtitle:'The Horn Wall',game:'Dino Clash',
    lore:'Styracosaurus. Six long horns on the frill, one on the nose, and a general attitude that says it knows exactly what it looks like and endorses it fully.',
    stats:[{label:'Horns',value:10},{label:'Defense',value:9},{label:'Charge',value:8},{label:'Style',value:10}],
    power:{name:'Frill Barrage',desc:'All six frill horns simultaneously. It is visually complex. The result is not.'},
    color:'#AB47BC',auroraRgb:'171,71,188',
    nameGrad:'linear-gradient(135deg,#AB47BC 0%,#CE93D8 42%,#6A1B9A 85%)',
    draw:drawStyraFn,
  },
  {
    num:'#038',name:'ARGENTA',subtitle:'The Long Shadow',game:'Pangaea',
    lore:'Argentinosaurus. The largest. The longest. The animal that required new math to weigh. Every step is a seismic event. Every breath is a wind advisory.',
    stats:[{label:'Size',value:10},{label:'Weight',value:10},{label:'Patience',value:8},{label:'Steps',value:3}],
    power:{name:'Ground Tremor',desc:'Argenta does not charge. Argenta walks. The seismograph disagrees with the distinction.'},
    color:'#78909C',auroraRgb:'120,144,156',
    nameGrad:'linear-gradient(135deg,#78909C 0%,#B0BEC5 42%,#37474F 85%)',
    draw:drawArgentaFn,
  },
  {
    num:'#039',name:'ELASMI',subtitle:'The Neck Serpent',game:'Pangaea',
    lore:'Elasmosaurus. 14-meter neck. The head is technically optional in a fight. The neck alone accounts for 73% of total threat assessment by prey species.',
    stats:[{label:'Neck',value:10},{label:'Reach',value:10},{label:'Stealth',value:7},{label:'Head',value:4}],
    power:{name:'Serpent Strike',desc:'The neck extends. From a distance that seems safe. The distance was not safe.'},
    color:'#26A69A',auroraRgb:'38,166,154',
    nameGrad:'linear-gradient(135deg,#26A69A 0%,#80CBC4 42%,#00695C 85%)',
    draw:drawElasmiaFn,
  },
  {
    num:'#040',name:'TYLO',subtitle:'The Sea Monitor',game:'Pangaea',
    lore:'Tylosaurus. Mosasaur. Scaled like armor, jaws like a vice, and documented evidence of eating sharks for the caloric equivalent of a light snack.',
    stats:[{label:'Jaws',value:10},{label:'Swim',value:9},{label:'Armor',value:8},{label:'Diet',value:10}],
    power:{name:'Vise Lock',desc:'The jaw registers. The jaw closes. Neither participant experiences the result the same way.'},
    color:'#00897B',auroraRgb:'0,137,123',
    nameGrad:'linear-gradient(135deg,#00897B 0%,#4DB6AC 42%,#004D40 85%)',
    draw:drawTylosaFn,
  },
  {
    num:'#041',name:'DIMORPH',subtitle:'The Sky Skimmer',game:'DinoSoar',
    lore:'Dimorphodon. Small enough to underestimate. Beak like bolt cutters. Flaps with the energy of something that knows it belongs in a different century.',
    stats:[{label:'Agility',value:10},{label:'Beak',value:9},{label:'Altitude',value:7},{label:'Spite',value:8}],
    power:{name:'Bolt Peck',desc:'Small. Fast. Aimed directly at the most inconvenient location possible.'},
    color:'#7E57C2',auroraRgb:'126,87,194',
    nameGrad:'linear-gradient(135deg,#7E57C2 0%,#B39DDB 42%,#4527A0 85%)',
    draw:drawDimorphoFn,
  },
  {
    num:'#042',name:'TAPEJA',subtitle:'The Crested Glider',game:'DinoSoar',
    lore:'Tapejaridae. Crest larger than the skull. Functioned as a sail, a signal, and according to current theory, also as a personality.',
    stats:[{label:'Crest',value:10},{label:'Glide',value:9},{label:'Signal',value:9},{label:'Poise',value:10}],
    power:{name:'Thermal Ride',desc:'Catches a thermal. Rises effortlessly. The crest catches the light at exactly the right angle. Intentional.'},
    color:'#FF8A65',auroraRgb:'255,138,101',
    nameGrad:'linear-gradient(135deg,#FF8A65 0%,#FFCCBC 42%,#BF360C 85%)',
    draw:drawTapejarFn,
  },
  {
    num:'#043',name:'ANATO',subtitle:'The Duck Baron',game:'Pangaea',
    lore:'Anatotitan. The hadrosaur with a bill so flat and wide it was nicknamed the duck. It processed this assessment and continued eating vegetation at an industrial pace.',
    stats:[{label:'Bill',value:10},{label:'Herd',value:9},{label:'Calm',value:9},{label:'Speed',value:7}],
    power:{name:'Herd Surge',desc:'Calls the herd. The herd arrives. The math changes rapidly for whatever was in the way.'},
    color:'#66BB6A',auroraRgb:'102,187,106',
    nameGrad:'linear-gradient(135deg,#66BB6A 0%,#A5D6A7 42%,#2E7D32 85%)',
    draw:drawAnatoFn,
  },
  {
    num:'#044',name:'DRACOREX',subtitle:'The Dragon King',game:'Dino Clash',
    lore:'Dracorex hogwartsia. Named after a school of magic. Has a dome covered in spikes and nodes that reads as inherently arcane. The naming committee stands by the decision.',
    stats:[{label:'Dome',value:10},{label:'Spikes',value:9},{label:'Mystic',value:9},{label:'Lore',value:10}],
    power:{name:'Arcane Dome',desc:'The spiked dome descends. Whether magic or biology, the results are equivalent.'},
    color:'#6200EA',auroraRgb:'98,0,234',
    nameGrad:'linear-gradient(135deg,#6200EA 0%,#B388FF 42%,#311B92 85%)',
    draw:drawDracorexFn,
  },
  {
    num:'#045',name:'SARCO',subtitle:'The Ancient Croc',game:'Pangaea',
    lore:'Sarcosuchus. Twelve meters of crocodile operating in a timeline before the concept of natural limits had been established. The jaw alone is a geological feature.',
    stats:[{label:'Jaw',value:10},{label:'Armor',value:10},{label:'Patience',value:9},{label:'Era',value:10}],
    power:{name:'Death Roll',desc:'The jaw registers. The roll begins. The physics of the situation are documented but not recommended.'},
    color:'#33691E',auroraRgb:'51,105,30',
    nameGrad:'linear-gradient(135deg,#33691E 0%,#8BC34A 42%,#1B5E20 85%)',
    draw:drawSarcoFn,
  },
  {
    num:'#046',name:'KENTRO',subtitle:'The Spike Array',game:'Dino Clash',
    lore:'Kentrosaurus. Smaller than Stegosaurus. More spikes per unit of body. The shoulder spikes specifically have been described as a navigational hazard by everything nearby.',
    stats:[{label:'Spikes',value:10},{label:'Shoulder',value:10},{label:'Defense',value:9},{label:'Size',value:6}],
    power:{name:'Spike Matrix',desc:'Every surface is simultaneously a deterrent. The geometry of approach has no viable solutions.'},
    color:'#EA80FC',auroraRgb:'234,128,252',
    nameGrad:'linear-gradient(135deg,#EA80FC 0%,#F3E5F5 42%,#AA00FF 85%)',
    draw:drawKentroFn,
  },
  {
    num:'#047',name:'GIGANOTO',subtitle:'The Southern Giant',game:'Rex Run',
    lore:'Giganotosaurus. Larger than T-Rex. Faster than expected. Operating in South America with complete awareness that the northern hemisphere would eventually hear about this.',
    stats:[{label:'Size',value:10},{label:'Speed',value:8},{label:'Jaws',value:10},{label:'Range',value:9}],
    power:{name:'Southern Charge',desc:'Larger than the benchmark. Moving faster than the model predicted. The gap closes rapidly.'},
    color:'#FF1744',auroraRgb:'255,23,68',
    nameGrad:'linear-gradient(135deg,#FF1744 0%,#FF8A80 42%,#B71C1C 85%)',
    draw:drawGiganotoFn,
  },
  {
    num:'#048',name:'DROMY',subtitle:'The Compact Hunter',game:'Rex Run',
    lore:'Dromaeosaurus. Small. Dense. Carrying a sickle claw with the conviction of something five times its size. The compactness is a feature, not a limitation.',
    stats:[{label:'Speed',value:10},{label:'Claw',value:9},{label:'Pack IQ',value:9},{label:'Size',value:5}],
    power:{name:'Low Sweep',desc:'Approaches below line of sight. The claw arrives before the assessment of threat is complete.'},
    color:'#FF5722',auroraRgb:'255,87,34',
    nameGrad:'linear-gradient(135deg,#FF5722 0%,#FFCCBC 42%,#BF360C 85%)',
    draw:drawDromyFn,
  },
  {
    num:'#049',name:'NANUQ',subtitle:'The Arctic Predator',game:'Rex Run',
    lore:'Nanuqsaurus. The arctic T-Rex. Evolved smaller in the cold — then used the extra efficiency for predation. The frost breath is a documented phenomenon and also looks incredible.',
    stats:[{label:'Cold',value:10},{label:'Stealth',value:9},{label:'Bite',value:9},{label:'Frost',value:10}],
    power:{name:'Frost Breath',desc:'The breath hits before the predator does. The cold registers in the bones. The predator follows.'},
    color:'#90CAF9',auroraRgb:'144,202,249',
    nameGrad:'linear-gradient(135deg,#90CAF9 0%,#E3F2FD 42%,#1565C0 85%)',
    draw:drawNanuqFn,
  },
  {
    num:'#050',name:'REAPER',subtitle:'The Void Stalker',game:'Dino Clash',
    lore:'Thanatotheristes degrootorum. Reaper of death. Named by scientists who apparently felt the existing record for menacing nomenclature was insufficient.',
    stats:[{label:'Stealth',value:9},{label:'Eyes',value:10},{label:'Terror',value:10},{label:'Mercy',value:0}],
    power:{name:'Red Eye Lock',desc:'The eyes glow. The target is seen. The sequence that follows has no good outcomes for the target.'},
    color:'#455A64',auroraRgb:'69,90,100',
    nameGrad:'linear-gradient(135deg,#455A64 0%,#90A4AE 42%,#FF1744 85%)',
    draw:drawReaperFn,
  },
  {
    num:'#051',name:'STYGA',subtitle:'The Dome Storm',game:'Dino Clash',
    lore:'Stygimoloch. The dome comes pre-equipped with radiating spikes that serve no defensive function and every aesthetic one. Paleontologists remain divided. The spikes do not care.',
    stats:[{label:'Dome',value:10},{label:'Spikes',value:9},{label:'Violet',value:10},{label:'Logic',value:4}],
    power:{name:'Spike Radiate',desc:'The dome connects. The radiating spikes ensure every angle of contact is equally regrettable.'},
    color:'#AA00FF',auroraRgb:'170,0,255',
    nameGrad:'linear-gradient(135deg,#AA00FF 0%,#EA80FC 42%,#4A148C 85%)',
    draw:drawStygaFn,
  },
  {
    num:'#052',name:'KRONOS',subtitle:'The Ancient Jaw',game:'Pangaea',
    lore:'Kronosaurus. A skull that comprises roughly half the total body length. Evolved the skull first, then the body to carry it. The jaw registered as a geological boundary.',
    stats:[{label:'Skull',value:10},{label:'Jaw',value:10},{label:'Depth',value:9},{label:'Grace',value:3}],
    power:{name:'Ancient Snap',desc:'The jaw registers. What occurs inside is not discussed publicly but is heavily studied.'},
    color:'#0D47A1',auroraRgb:'13,71,161',
    nameGrad:'linear-gradient(135deg,#0D47A1 0%,#42A5F5 42%,#01579B 85%)',
    draw:drawKronosFn,
  },
  {
    num:'#053',name:'TITANIS',subtitle:'The Terror Bird',game:'Rex Run',
    lore:'Titanis walleri. No wings. All beak. The Phorusrhacid stood two meters tall and crossed into North America specifically to see what was there. Then it became what was there.',
    stats:[{label:'Beak',value:10},{label:'Speed',value:9},{label:'Height',value:9},{label:'Wings',value:0}],
    power:{name:'Hook Dive',desc:'The beak descends from height. The hook catches. The bird does not release.'},
    color:'#F57F17',auroraRgb:'245,127,23',
    nameGrad:'linear-gradient(135deg,#F57F17 0%,#FFE082 42%,#E65100 85%)',
    draw:drawTitanisFn,
  },
  {
    num:'#054',name:'MINMI',subtitle:'The Micro Tank',game:'Dino Clash',
    lore:'Minmi paravertebra. Tiny ankylosaur. Every armored plate scaled down to precision. The club tail proportionally generates the same threat output as its larger cousins. In a smaller package. Which somehow makes it worse.',
    stats:[{label:'Armor',value:9},{label:'Club',value:8},{label:'Size',value:3},{label:'Density',value:10}],
    power:{name:'Micro Smash',desc:'Low center of gravity. Heavy tail. The math on impact force per unit size is reviewed and not disputed.'},
    color:'#AFB42B',auroraRgb:'175,180,43',
    nameGrad:'linear-gradient(135deg,#AFB42B 0%,#E6EE9C 42%,#827717 85%)',
    draw:drawMinmiFn,
  },
  {
    num:'#055',name:'PROTO',subtitle:'The First Frill',game:'Pangaea',
    lore:'Protoceratops. The original ceratopsian. The frill came before the horns. The attitude came before both. Fossils suggest it was already unimpressed with what would eventually evolve into Triceratops.',
    stats:[{label:'Frill',value:7},{label:'Bite',value:8},{label:'Legacy',value:10},{label:'Horn',value:0}],
    power:{name:'Ancestor\'s Will',desc:'Smaller than successors. Has been in business longer than everyone else in the room.'},
    color:'#D4A041',auroraRgb:'212,160,65',
    nameGrad:'linear-gradient(135deg,#D4A041 0%,#FFE082 42%,#8D6E63 85%)',
    draw:drawProtoFn,
  },
  {
    num:'#056',name:'CONCAVA',subtitle:'The Mystery Ridge',game:'Pangaea',
    lore:'A concave dorsal fin of uncertain origin and undisputed visual impact. Current theory attributes it to thermoregulation. Current visual evidence attributes it to ambition.',
    stats:[{label:'Mystery',value:10},{label:'Ridge',value:9},{label:'Thermal',value:8},{label:'Known',value:2}],
    power:{name:'Ridge Flash',desc:'The concave fin catches the light. The origin is unknown. The impression is not.'},
    color:'#F9A825',auroraRgb:'249,168,37',
    nameGrad:'linear-gradient(135deg,#F9A825 0%,#FFE082 42%,#E65C00 85%)',
    draw:drawConcavaFn,
  },
  {
    num:'#057',name:'SINO',subtitle:'The Parrot King',game:'Pangaea',
    lore:'Sinoceratops. Chinese ceratopsian. Wider frill than its cousins, different horn configuration, and an air of someone who arrived after the style guidelines were finalized and wrote new ones.',
    stats:[{label:'Frill',value:10},{label:'Beak',value:9},{label:'Color',value:9},{label:'Origin',value:10}],
    power:{name:'Frill Wave',desc:'The wide frill extends to full display. The opposition is given time to appreciate it before the charge.'},
    color:'#8BC34A',auroraRgb:'139,195,74',
    nameGrad:'linear-gradient(135deg,#8BC34A 0%,#DCEDC8 42%,#33691E 85%)',
    draw:drawSinoFn,
  },
  {
    num:'#058',name:'PACHYRHINO',subtitle:'The Boss Nose',game:'Dino Clash',
    lore:'Pachyrhinosaurus. No horn. Instead: a massive keratinous boss where the horn would be. It looked at the horn option and chose something thicker. The choice has been validated in every recorded engagement.',
    stats:[{label:'Boss',value:10},{label:'Charge',value:9},{label:'Head',value:10},{label:'Horn',value:0}],
    power:{name:'Boss Ram',desc:'No horn to miss. Flat boss surface contacts at maximum coverage. The structural math favors the boss.'},
    color:'#795548',auroraRgb:'121,85,72',
    nameGrad:'linear-gradient(135deg,#795548 0%,#BCAAA4 42%,#3E2723 85%)',
    draw:drawPachyrhinoFn,
  },
];

/* ── Stat bar ─────────────────────────────────────────────────────────────── */
function StatBar({label,value,color}:{label:string;value:number;color:string}){
  return(
    <div className="stat-bar">
      <span className="stat-bar-label">{label}</span>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" style={{width:`${value*10}%`,background:`linear-gradient(90deg,${color},${color}99)`,boxShadow:`0 0 8px ${color}55`}}/>
      </div>
      <span className="stat-bar-val">{value}/10</span>
    </div>
  );
}

/* ── Character card ───────────────────────────────────────────────────────── */
function CharCard({data,flip}:{data:CharData;flip?:boolean}){
  const c=data.color;
  const vars={'--ac':c,'--ac12':`${c}1F`,'--ac20':`${c}33`,'--ac30':`${c}4D`} as React.CSSProperties;
  const canvasSide=(
    <div className="featured-canvas-side">
      <CharCanvas draw={data.draw} auroraRgb={data.auroraRgb}/>
      <div className={`featured-canvas-fade${flip?' fade-left':''}`}/>
    </div>
  );
  const infoSide=(
    <div className="featured-info-side">
      <div className="char-meta-row">
        <span className="char-num" style={{color:`${c}88`}}>{data.num}</span>
        <span className="char-status" style={{color:c,border:`1px solid ${c}40`,background:`${c}0D`}}>ACTIVE</span>
      </div>
      <h2 className="char-name" style={{backgroundImage:data.nameGrad}}>{data.name}</h2>
      <div className="char-subtitle" style={{color:`${c}99`}}>{data.subtitle}</div>
      <div className="char-game-pill">
        <span className="game-dot" style={{background:c,boxShadow:`0 0 10px ${c}`}}/>
        {data.game}
      </div>
      <p className="char-lore">{data.lore}</p>
      <div className="char-stats-block">
        <div className="stats-label">STATS</div>
        {data.stats.map(s=><StatBar key={s.label} label={s.label} value={s.value} color={c}/>)}
      </div>
      <div className="char-power" style={{background:`${c}06`,border:`1px solid ${c}18`}}>
        <span className="power-eyebrow">SIGNATURE MOVE</span>
        <div className="power-name" style={{color:c}}>{data.power.name}</div>
        <p className="power-desc">{data.power.desc}</p>
      </div>
      {data.cta&&<a href={data.cta.href} className="btn char-cta" style={{background:`linear-gradient(135deg,${c},${c}bb)`,color:'#010810',boxShadow:`0 0 32px ${c}30`}}>{data.cta.label}</a>}
    </div>
  );
  return(
    <div id={`char-${data.num.slice(1)}`} className={`featured-card${flip?' flip':''}`} style={vars}>
      {flip?<>{infoSide}{canvasSide}</>:<>{canvasSide}{infoSide}</>}
    </div>
  );
}

/* ── Pokemon-style crew cards ─────────────────────────────────────────────── */
const TYPE_MAP:Record<string,string>={
  'DinoSoar':'FLIER','Rex Run':'RUNNER','Speed Type':'SWIFT',
  'Dino Clash':'FIGHTER','DinoTris':'TACTICIAN','DinoBlox':'BUILDER',
  'Pangaea':'ANCIENT','Fossil Hunt':'EXPLORER',
};

function PokeCard({data}:{data:CharData}){
  const c=data.color;
  const vars={'--ac':c,'--ac12':`${c}1F`,'--ac20':`${c}33`,'--ac30':`${c}4D`,'--ac40':`${c}66`} as React.CSSProperties;
  const hp=data.stats.reduce((a,s)=>a+s.value,0)*3;
  const type=TYPE_MAP[data.game]??'PREHISTORIC';
  return(
    <a className="poke-card" href={`#char-${data.num.slice(1)}`} style={vars}>
      <div className="poke-header">
        <span className="poke-num">{data.num}</span>
        <span className="poke-type-badge">{type}</span>
        <span className="poke-hp">HP <strong>{hp}</strong></span>
      </div>
      <div className="poke-art">
        <CharCanvas draw={data.draw} auroraRgb={data.auroraRgb}/>
        <div className="poke-art-fade"/>
      </div>
      <div className="poke-body">
        <div className="poke-name" style={{backgroundImage:data.nameGrad}}>{data.name}</div>
        <div className="poke-subtitle">{data.subtitle}</div>
        <div className="poke-game-row">
          <span className="poke-dot" style={{background:c}}/>
          {data.game}
        </div>
        <div className="poke-rule"/>
        <div className="poke-move-label">◆ {data.power.name}</div>
        <div className="poke-move-desc">{data.power.desc}</div>
        <div className="poke-rule"/>
        <div className="poke-footer">
          <span>{data.num}/{String(CHARACTERS.length).padStart(3,'0')}</span>
          <span>◆ PREHISTORIC RARE</span>
        </div>
      </div>
    </a>
  );
}

/* ── Locked card ──────────────────────────────────────────────────────────── */
function LockedCard({num,game,color}:{num:string;game:string;color:string}){
  return(
    <div className="locked-card" style={{'--c':color,'--c05':`${color}0D`,'--c12':`${color}1F`,'--c20':`${color}33`,'--c45':`${color}73`} as React.CSSProperties}>
      <div className="locked-topbar"/>
      <span className="locked-num">{num}</span>
      <div className="locked-glyph">?</div>
      <div className="locked-game">{game}</div>
      <div className="locked-badge">CLASSIFIED</div>
    </div>
  );
}

/* ── Pixel field ─────────────────────────────────────────────────────────── */
const PX_COLORS=['#7EFF50','#FF6B35','#00D4FF','#9B5CF6','#BBFF70'];
const PIXELS=Array.from({length:28},(_,i)=>({left:`${(i*3.7+1.1)%100}vw`,color:PX_COLORS[i%PX_COLORS.length],duration:`${14+(i*1.1)%22}s`,delay:`${(i*0.9)%24}s`}));

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function TeamPage(){
  return(
    <>
      <BgCanvas/>
      <div className="pixel-field" aria-hidden="true">
        {PIXELS.map((p,i)=><div key={i} className="px" style={{left:p.left,bottom:'-6px',background:p.color,animationDuration:p.duration,animationDelay:p.delay}}/>)}
      </div>
      <div className="page">

        <nav>
          <a className="nav-logo" href="/">🦕 DINOSAUR<span className="logo-ai">AI</span></a>
          <a className="nav-link" href="/">Home</a>
          <a className="nav-link" href="/dinotetris">Games</a>
          <a className="nav-link team-active" href="/team">Team</a>
          <a className="nav-link" href="/agenticstudio">AgenticStudio</a>
          <button className="nav-btn">Early Access</button>
        </nav>

        <section className="team-hero">
          <div className="hero-tag">🦕 Character Roster</div>
          <h1 className="wordmark">MEET THE <span className="serif-ai">CREW</span></h1>
          <div className="team-tagline">
            <span className="tl-dim">The prehistoric legends</span>
            <br/>
            <span className="tl-bright">powering every game.</span>
            <br/>
            <span className="tl-dim">Each one&apos;s a handful.&nbsp;</span>
            <em className="tl-em">All of them are iconic.</em>
          </div>
        </section>

        {/* Crew overview — pokemon cards */}
        <div className="pokemon-outer">
          <div className="roster-header">
            <div className="roster-rule"/>
            <div className="roster-title-group">
              <div className="roster-eyebrow">◆ DINOSAURAI UNIVERSE</div>
              <h2 className="roster-title">ACTIVE ROSTER</h2>
              <div className="roster-dots">
                {CHARACTERS.map((char,i)=>(
                  <span key={char.num} className="roster-dot" style={{background:char.color,boxShadow:`0 0 8px ${char.color}`,animationDelay:`${i*0.22}s`}}/>
                ))}
              </div>
              <div className="roster-count">{String(CHARACTERS.length).padStart(2,'0')} PREHISTORIC LEGENDS</div>
            </div>
            <div className="roster-rule"/>
          </div>
          <div className="pokemon-grid">
            {CHARACTERS.map(char=><PokeCard key={char.num} data={char}/>)}
          </div>
        </div>

        <div className="rule"/>

        {/* Full profiles */}
        <div className="profiles-label">
          <div className="section-eyebrow">Character Files</div>
        </div>
        <div className="chars-outer">
          {CHARACTERS.map((char,i)=>(
            <CharCard key={char.num} data={char} flip={i%2===1}/>
          ))}
        </div>

        <div className="rule"/>

        <div className="section" id="roster">
          <div className="section-eyebrow">Roster</div>
          <h2 className="section-h">More Characters Incoming</h2>
          <p className="section-body">The crew is expanding. Each new game brings a new legend.</p>
          <div className="locked-grid">
            <LockedCard num="#059" game="Dino Derby"  color="#FF8C42"/>
            <LockedCard num="#060" game="App-a-Day"   color="#9B5CF6"/>
            <LockedCard num="#061" game="DinoBlox"    color="#FFD700"/>
          </div>
        </div>

        <footer>
          <div className="footer-logo">🦕 DINOSAUR<span className="footer-ai">AI</span></div>
          <p className="footer-sub">dinosaurai.vercel.app &nbsp;·&nbsp; 2026</p>
        </footer>
      </div>
    </>
  );
}
