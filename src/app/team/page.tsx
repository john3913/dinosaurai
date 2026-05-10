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
    <div className={`featured-card${flip?' flip':''}`} style={vars}>
      {flip?<>{infoSide}{canvasSide}</>:<>{canvasSide}{infoSide}</>}
    </div>
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
            <LockedCard num="#007" game="Fossil Hunt" color="#FF8C42"/>
            <LockedCard num="#008" game="Pangaea"     color="#00D4FF"/>
            <LockedCard num="#009" game="Dino Derby"  color="#FFD700"/>
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
