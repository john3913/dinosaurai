'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import './dinoblox.css';

/* ─── Constants ──────────────────────── */
const COLS = 10, ROWS = 20, CS = 32;
const FLASH_MS = 170;

/* ─── Types ──────────────────────────── */
type PT = 'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J';
type Cell = string | null;
type Board = Cell[][];
type GS = 'menu' | 'playing' | 'paused' | 'gameover';
interface UI { score: number; level: number; lines: number; gs: GS }

/* ─── Piece definitions ──────────────── */
const DEFS: Record<PT, { shape: number[][], color: string }> = {
  I: { shape: [[1,1,1,1]],           color: '#7EFF50' },
  O: { shape: [[1,1],[1,1]],         color: '#FF6B35' },
  T: { shape: [[0,1,0],[1,1,1]],     color: '#00D4FF' },
  S: { shape: [[0,1,1],[1,1,0]],     color: '#9B5CF6' },
  Z: { shape: [[1,1,0],[0,1,1]],     color: '#BBFF70' },
  L: { shape: [[1,0],[1,0],[1,1]],   color: '#FF8C42' },
  J: { shape: [[0,1],[0,1],[1,1]],   color: '#40E0FF' },
};

const COLOR_TO_TYPE: Record<string, PT> = {
  '#7EFF50': 'I', '#FF6B35': 'O', '#00D4FF': 'T',
  '#9B5CF6': 'S', '#BBFF70': 'Z', '#FF8C42': 'L', '#40E0FF': 'J',
};

const DINO_LABEL: Record<PT, [string, string]> = {
  I: ['🦕', 'Brontosaurus'], O: ['🛡️', 'Ankylosaur'],
  T: ['🦖', 'T-Rex'],        S: ['🐾', 'Raptor'],
  Z: ['🦎', 'Stegosaurus'],  L: ['🦅', 'Pterodactyl'],
  J: ['⚡', 'Spinosaurus'],
};

const PTS: PT[] = ['I','O','T','S','Z','L','J'];

/* ─── Pure helpers ───────────────────── */
const rotateCW = (m: number[][]): number[][] => {
  const R = m.length, C = m[0].length;
  return Array.from({length: C}, (_, c) =>
    Array.from({length: R}, (_, r) => m[R - 1 - r][c])
  );
};
const emptyBoard = (): Board => Array.from({length: ROWS}, () => Array(COLS).fill(null));
const makePiece  = (t: PT) => ({
  type: t, shape: DEFS[t].shape, color: DEFS[t].color,
  x: Math.floor((COLS - DEFS[t].shape[0].length) / 2), y: 0,
});
const randPiece  = () => makePiece(PTS[Math.random() * PTS.length | 0]);
const shapeSig   = (s: number[][]) => s.map(r => r.join('')).join('|');

/* Cells that have no filled cell directly below — these are where legs attach */
const floorCells = (shape: number[][]): {r: number, c: number}[] => {
  const out: {r: number, c: number}[] = [];
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c] && (r === shape.length - 1 || !shape[r + 1][c]))
        out.push({r, c});
  return out;
};

const fits = (board: Board, shape: number[][], x: number, y: number): boolean => {
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = x + c, ny = y + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
      if (ny >= 0 && board[ny][nx]) return false;
    }
  return true;
};
const getGhostY = (board: Board, shape: number[][], x: number, y: number): number => {
  let gy = y;
  while (fits(board, shape, x, gy + 1)) gy++;
  return gy;
};
const placePiece = (board: Board, shape: number[][], x: number, y: number, color: string): Board => {
  const b = board.map(r => [...r]);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c] && y + r >= 0) b[y + r][x + c] = color;
  return b;
};
const sweep = (board: Board): { board: Board; count: number; rows: number[] } => {
  const rows: number[] = [];
  board.forEach((row, i) => { if (row.every(Boolean)) rows.push(i); });
  const b = board.filter((_, i) => !rows.includes(i));
  while (b.length < ROWS) b.unshift(Array(COLS).fill(null));
  return { board: b, count: rows.length, rows };
};
const scoreFor = (n: number, lvl: number) => [0, 100, 300, 500, 800][n] * lvl;
const gravity  = (lvl: number) => Math.max(48, 1000 - (lvl - 1) * 88);

/* ─── Block draw (used for board + ghost) ─── */
function drawBlock(
  ctx: CanvasRenderingContext2D, col: number, row: number,
  color: string, alpha = 1, cs = CS
) {
  const px = col * cs, py = row * cs;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 16;
  ctx.fillRect(px + 1, py + 1, cs - 2, cs - 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(px + 2, py + 2, cs - 4, 5);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(px + 1, py + cs - 6, cs - 2, 5);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1;
  ctx.strokeRect(px + 1.5, py + 1.5, cs - 3, cs - 3);
  ctx.restore();
}

/* ─── Shared dino drawing helpers ────── */
function eyeDot(ctx: CanvasRenderingContext2D, x: number, y: number, r = 4) {
  ctx.save(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.arc(x + r * 0.28, y - r * 0.28, r * 0.38, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/* Single leg: attaches at (x, y) which is the bottom-center of a floor cell */
function leg(
  ctx: CanvasRenderingContext2D, x: number, y: number, cs: number,
  angle = 0.15, flip = false
) {
  const dir = flip ? -1 : 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dir * cs * 0.05, y + cs * 0.36);
  ctx.lineWidth = cs * 0.2; ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x + dir * cs * 0.06, y + cs * 0.41, cs * 0.15, cs * 0.07, angle, 0, Math.PI * 2);
  ctx.fill();
}

/*
  Draw one leg per floor cell, anchored to the exact cell bottom.
  This is the key fix: legs always connect regardless of rotation.
*/
function legsFromShape(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number,
  shape: number[][], cs: number
) {
  ctx.shadowBlur = 6;
  floorCells(shape).forEach(({r, c}) =>
    leg(ctx, ox + c * cs + cs * 0.5, oy + r * cs + cs, cs)
  );
}

/* ──────────────────────────────────────
   DINOSAUR PIECE DRAWINGS
   Each function receives the full shape array.
   ox,oy = top-left of the piece bounding box in pixels.
   cs    = cell size (32 for board, 22 for mini panels).
─────────────────────────────────────── */

/* 🦕  I → BRONTOSAURUS */
function drawBrontosaurus(ctx: CanvasRenderingContext2D, ox: number, oy: number, shape: number[][], cs: number, color: string) {
  ctx.save();
  ctx.fillStyle = color; ctx.strokeStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 12;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  const sig = shapeSig(shape);

  if (sig === '1111') {
    /* ── Horizontal: tail left, long neck + head right ── */

    // Tail curves down-left from leftmost cell
    ctx.beginPath();
    ctx.moveTo(ox + cs * 0.15, oy + cs * 0.55);
    ctx.bezierCurveTo(ox - cs * 0.1, oy + cs * 0.45, ox - cs * 0.4, oy + cs * 1.0, ox - cs * 0.2, oy + cs * 1.25);
    ctx.lineWidth = cs * 0.28; ctx.stroke();
    ctx.beginPath(); ctx.arc(ox - cs * 0.2, oy + cs * 1.27, cs * 0.09, 0, Math.PI * 2); ctx.fill();

    // 4 legs, one per floor cell (all of row 0 since it's a single-row piece)
    legsFromShape(ctx, ox, oy, shape, cs);

    // Long neck rises from right end
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(ox + 4 * cs - cs * 0.38, oy + cs * 0.3);
    ctx.bezierCurveTo(ox + 4 * cs + cs * 0.05, oy - cs * 0.05, ox + 4 * cs + cs * 0.18, oy - cs * 0.62, ox + 4 * cs + cs * 0.04, oy - cs * 1.0);
    ctx.lineWidth = cs * 0.32; ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.ellipse(ox + 4 * cs + cs * 0.2, oy - cs * 1.18, cs * 0.30, cs * 0.19, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ox + 4 * cs - cs * 0.04, oy - cs * 1.06);
    ctx.quadraticCurveTo(ox + 4 * cs + cs * 0.22, oy - cs * 0.92, ox + 4 * cs + cs * 0.48, oy - cs * 1.04);
    ctx.lineWidth = cs * 0.13; ctx.stroke();
    eyeDot(ctx, ox + 4 * cs + cs * 0.26, oy - cs * 1.25, cs * 0.11);
    ctx.save(); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(ox + 4 * cs + cs * 0.43, oy - cs * 1.14, cs * 0.045, cs * 0.03, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

  } else {
    /* ── Vertical 1|1|1|1: head top, body column, tail bottom ── */
    // Head above top cell
    ctx.beginPath();
    ctx.ellipse(ox + cs * 0.58, oy - cs * 0.42, cs * 0.30, cs * 0.21, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ox + cs * 0.78, oy - cs * 0.36);
    ctx.quadraticCurveTo(ox + cs * 1.12, oy - cs * 0.28, ox + cs * 1.08, oy - cs * 0.5);
    ctx.lineWidth = cs * 0.13; ctx.stroke();
    eyeDot(ctx, ox + cs * 0.68, oy - cs * 0.5, cs * 0.10);

    // Neck bridge
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(ox + cs * 0.22, oy); ctx.lineTo(ox + cs * 0.72, oy);
    ctx.lineTo(ox + cs * 0.65, oy - cs * 0.22); ctx.lineTo(ox + cs * 0.32, oy - cs * 0.22);
    ctx.closePath(); ctx.fill();

    // Tail curls off the bottom cell
    ctx.beginPath();
    ctx.moveTo(ox + cs * 0.5, oy + 4 * cs);
    ctx.bezierCurveTo(ox + cs * 0.28, oy + 4 * cs + cs * 0.25, ox - cs * 0.12, oy + 4 * cs + cs * 0.4, ox - cs * 0.05, oy + 4 * cs + cs * 0.62);
    ctx.lineWidth = cs * 0.26; ctx.stroke();
    ctx.beginPath(); ctx.arc(ox - cs * 0.05, oy + 4 * cs + cs * 0.65, cs * 0.08, 0, Math.PI * 2); ctx.fill();

    // Side legs at 1/4 and 3/4 of body height (sauropod stance)
    ctx.shadowBlur = 6;
    [oy + cs * 1.1, oy + cs * 2.5].forEach(ly => {
      leg(ctx, ox, ly, cs, 0.3, true);
      leg(ctx, ox + cs, ly, cs, 0.3);
    });
  }
  ctx.restore();
}

/* 🛡️  O → ANKYLOSAUR */
function drawAnkylosaur(ctx: CanvasRenderingContext2D, ox: number, oy: number, shape: number[][], cs: number, color: string) {
  ctx.save();
  ctx.fillStyle = color; ctx.strokeStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 12;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // Armour spikes along top
  ctx.shadowBlur = 8;
  for (let i = 0; i < 5; i++) {
    const sx = ox + cs * 0.2 + i * cs * 0.38;
    ctx.beginPath();
    ctx.moveTo(sx, oy);
    ctx.lineTo(sx + cs * 0.07, oy - cs * 0.28);
    ctx.lineTo(sx + cs * 0.14, oy);
    ctx.closePath(); ctx.fill();
  }

  // Head extends right
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(ox + 2 * cs + cs * 0.32, oy + cs * 0.52, cs * 0.28, cs * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(ox + 2 * cs + cs * 0.06, oy + cs * 0.55);
  ctx.quadraticCurveTo(ox + 2 * cs + cs * 0.35, oy + cs * 0.65, ox + 2 * cs + cs * 0.58, oy + cs * 0.58);
  ctx.lineWidth = cs * 0.12; ctx.stroke();
  eyeDot(ctx, ox + 2 * cs + cs * 0.28, oy + cs * 0.43, cs * 0.10);

  // Club tail (left)
  ctx.beginPath();
  ctx.moveTo(ox + cs * 0.15, oy + cs * 0.62);
  ctx.bezierCurveTo(ox - cs * 0.25, oy + cs * 0.55, ox - cs * 0.52, oy + cs * 0.8, ox - cs * 0.38, oy + cs * 1.05);
  ctx.lineWidth = cs * 0.24; ctx.stroke();
  ctx.beginPath();
  ctx.arc(ox - cs * 0.38, oy + cs * 1.1, cs * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 4;
  [[ox - cs * 0.52, oy + cs * 1.0], [ox - cs * 0.24, oy + cs * 0.96], [ox - cs * 0.38, oy + cs * 0.88]].forEach(([sx, sy]) => {
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - cs * 0.08, sy - cs * 0.16); ctx.lineWidth = cs * 0.12; ctx.stroke();
  });

  // 4 stubby legs: 2 per floor cell (front/back pairs per column)
  ctx.shadowBlur = 8;
  floorCells(shape).forEach(({r, c}) => {
    leg(ctx, ox + c * cs + cs * 0.25, oy + r * cs + cs, cs, 0.1);
    leg(ctx, ox + c * cs + cs * 0.75, oy + r * cs + cs, cs, 0.1, true);
  });
  ctx.restore();
}

/* 🦖  T → T-REX */
function drawTRex(ctx: CanvasRenderingContext2D, ox: number, oy: number, shape: number[][], cs: number, color: string) {
  ctx.save();
  ctx.fillStyle = color; ctx.strokeStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 12;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  const sig = shapeSig(shape);

  const head = (hx: number, hy: number, dx: number, dy: number) => {
    const ang = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
    ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.ellipse(0, 0, cs * 0.36, cs * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cs * 0.22, -cs * 0.08);
    ctx.bezierCurveTo(cs * 0.46, -cs * 0.08, cs * 0.6, cs * 0.04, cs * 0.52, cs * 0.16);
    ctx.bezierCurveTo(cs * 0.44, cs * 0.28, cs * 0.22, cs * 0.22, cs * 0.22, cs * 0.1);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cs * 0.22, cs * 0.1);
    ctx.bezierCurveTo(cs * 0.38, cs * 0.1, cs * 0.52, cs * 0.22, cs * 0.5, cs * 0.34);
    ctx.bezierCurveTo(cs * 0.44, cs * 0.44, cs * 0.22, cs * 0.38, cs * 0.18, cs * 0.28);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 3; i++) {
      const tx = cs * (0.28 + i * 0.1);
      ctx.beginPath(); ctx.moveTo(tx, cs * 0.12); ctx.lineTo(tx + cs * 0.06, cs * 0.12); ctx.lineTo(tx + cs * 0.03, cs * 0.24); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = color;
    eyeDot(ctx, -cs * 0.06, -cs * 0.1, cs * 0.12);
    ctx.restore();
  };

  const arm = (ax: number, ay: number, dx: number) => {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + dx * cs * 0.28, ay + cs * 0.3);
    ctx.lineWidth = cs * 0.18; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax + dx * cs * 0.28, ay + cs * 0.3);
    ctx.lineTo(ax + dx * cs * 0.38, ay + cs * 0.22);
    ctx.moveTo(ax + dx * cs * 0.28, ay + cs * 0.3);
    ctx.lineTo(ax + dx * cs * 0.18, ay + cs * 0.2);
    ctx.lineWidth = cs * 0.1; ctx.stroke();
  };

  const tail = (tx: number, ty: number, dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.bezierCurveTo(tx + dx * cs * 0.4, ty + dy * cs * 0.2, tx + dx * cs * 0.7, ty + dy * cs * 0.6, tx + dx * cs * 0.55, ty + dy * cs * 0.9);
    ctx.lineWidth = cs * 0.22; ctx.stroke();
    ctx.beginPath(); ctx.arc(tx + dx * cs * 0.55, ty + dy * cs * 0.92, cs * 0.07, 0, Math.PI * 2); ctx.fill();
  };

  // Head, arms, tail are orientation-specific
  switch (sig) {
    case '010|111':
      head(ox + cs * 1.5, oy - cs * 0.35, 0.6, -0.8);
      arm(ox + cs * 1.0, oy + cs * 1.1, -1);
      arm(ox + cs * 2.0, oy + cs * 1.1, 1);
      tail(ox + cs * 2.88, oy + cs * 1.5, 1, 0.4);
      break;
    case '10|11|10':
      head(ox + cs * 0.5, oy - cs * 0.3, -0.3, -1);
      arm(ox + cs * 1.88, oy + cs * 1.05, 1);
      tail(ox + cs * 0.5, oy + cs * 2.88, 0, 1);
      break;
    case '111|010':
      head(ox + cs * 1.5, oy + cs * 2.35, 0.5, 0.9);
      arm(ox + cs * 0.9, oy + cs * 0.9, -1);
      tail(ox + cs * 0.12, oy + cs * 0.5, -1, -0.3);
      break;
    default: // '01|11|01'
      head(ox + cs * 1.5, oy - cs * 0.3, 0.4, -1);
      arm(ox + cs * 0.12, oy + cs * 1.05, -1);
      tail(ox + cs * 1.5, oy + cs * 2.88, 0, 1);
      break;
  }

  // Legs always connect to actual floor cells regardless of rotation
  legsFromShape(ctx, ox, oy, shape, cs);

  ctx.restore();
}

/* 🐾  S → RAPTOR */
function drawRaptor(ctx: CanvasRenderingContext2D, ox: number, oy: number, shape: number[][], cs: number, color: string) {
  ctx.save();
  ctx.fillStyle = color; ctx.strokeStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 12;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  const sig = shapeSig(shape);

  const head = (hx: number, hy: number, ang: number) => {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
    ctx.beginPath(); ctx.ellipse(0, 0, cs * 0.28, cs * 0.20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cs * 0.2, -cs * 0.06);
    ctx.lineTo(cs * 0.5, 0);
    ctx.lineTo(cs * 0.2, cs * 0.06);
    ctx.fill();
    ctx.save(); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(cs * (0.24 + i * 0.09), cs * 0.06);
      ctx.lineTo(cs * (0.27 + i * 0.09), cs * 0.06);
      ctx.lineTo(cs * (0.255 + i * 0.09), cs * 0.17);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    eyeDot(ctx, -cs * 0.04, -cs * 0.06, cs * 0.1);
    ctx.restore();
  };

  const claw = (cx2: number, cy2: number) => {
    ctx.beginPath();
    ctx.moveTo(cx2, cy2);
    ctx.bezierCurveTo(cx2 + cs * 0.2, cy2 - cs * 0.28, cx2 + cs * 0.42, cy2 - cs * 0.1, cx2 + cs * 0.35, cy2 + cs * 0.15);
    ctx.lineWidth = cs * 0.18; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx2 + cs * 0.34, cy2 + cs * 0.18, cs * 0.07, 0, Math.PI * 2); ctx.fill();
  };

  const tail = (tx: number, ty: number, dx: number, dy: number) => {
    ctx.beginPath(); ctx.moveTo(tx, ty);
    ctx.bezierCurveTo(tx + dx * cs * 0.35, ty + dy * cs * 0.15, tx + dx * cs * 0.62, ty + dy * cs * 0.5, tx + dx * cs * 0.5, ty + dy * cs * 0.75);
    ctx.lineWidth = cs * 0.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(tx + dx * cs * 0.5, ty + dy * cs * 0.77, cs * 0.07, 0, Math.PI * 2); ctx.fill();
  };

  if (sig === '011|110') {
    head(ox + 2 * cs + cs * 0.45, oy + cs * 0.3, -0.4);
    claw(ox + 2 * cs + cs * 0.2, oy + cs * 0.7);
    tail(ox + cs * 0.12, oy + cs * 1.82, -1, 0.3);
  } else { // '10|11|01'
    head(ox + cs * 0.35, oy + cs * 0.28, -2.4);
    claw(ox - cs * 0.2, oy + cs * 0.7);
    tail(ox + cs * 1.88, oy + cs * 2.82, 1, 0.3);
  }

  legsFromShape(ctx, ox, oy, shape, cs);
  ctx.restore();
}

/* 🦎  Z → STEGOSAURUS */
function drawStegosaur(ctx: CanvasRenderingContext2D, ox: number, oy: number, shape: number[][], cs: number, color: string) {
  ctx.save();
  ctx.fillStyle = color; ctx.strokeStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 12;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  const sig = shapeSig(shape);

  const plates = (startX: number, startY: number, n: number, step: number) => {
    ctx.shadowBlur = 8;
    for (let i = 0; i < n; i++) {
      const h = cs * (0.34 - i * 0.04);
      const bx = startX + i * step;
      ctx.beginPath();
      ctx.moveTo(bx, startY); ctx.lineTo(bx + cs * 0.08, startY - h);
      ctx.lineTo(bx + cs * 0.16, startY);
      ctx.closePath(); ctx.fill();
    }
  };

  const snout = (hx: number, hy: number, dx: number) => {
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.ellipse(hx, hy, cs * 0.24, cs * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + dx * cs * 0.2, hy + cs * 0.04);
    ctx.quadraticCurveTo(hx + dx * cs * 0.44, hy + cs * 0.04, hx + dx * cs * 0.4, hy - cs * 0.1);
    ctx.lineWidth = cs * 0.12; ctx.stroke();
    eyeDot(ctx, hx - dx * cs * 0.04, hy - cs * 0.08, cs * 0.1);
  };

  const spikeTail = (tx: number, ty: number, dx: number) => {
    ctx.beginPath(); ctx.moveTo(tx, ty);
    ctx.bezierCurveTo(tx + dx * cs * 0.3, ty + cs * 0.1, tx + dx * cs * 0.58, ty + cs * 0.45, tx + dx * cs * 0.44, ty + cs * 0.72);
    ctx.lineWidth = cs * 0.22; ctx.stroke();
    ctx.shadowBlur = 4;
    [[0.18, 0.55], [0.3, 0.65], [0.42, 0.65], [0.42, 0.5]].forEach(([fx, fy]) => {
      ctx.beginPath(); ctx.moveTo(tx + dx * cs * fx, ty + cs * fy);
      ctx.lineTo(tx + dx * cs * (fx + dx * 0.15), ty + cs * (fy - 0.2));
      ctx.lineWidth = cs * 0.1; ctx.stroke();
    });
  };

  if (sig === '110|011') {
    snout(ox + cs * 0.3, oy + cs * 0.38, -1);
    plates(ox + cs * 0.1, oy, 5, cs * 0.38);
    spikeTail(ox + 2 * cs + cs * 0.9, oy + cs + cs * 0.5, 1);
  } else { // '01|11|10'
    snout(ox + cs + cs * 0.55, oy + cs * 0.3, 1);
    plates(ox + cs, oy - cs * 0.05, 4, cs * 0.32);
    spikeTail(ox + cs * 0.12, oy + 2 * cs + cs * 0.85, -1);
  }

  legsFromShape(ctx, ox, oy, shape, cs);
  ctx.restore();
}

/* 🦅  L → PTERODACTYL */
function drawPterodactyl(ctx: CanvasRenderingContext2D, ox: number, oy: number, shape: number[][], cs: number, color: string) {
  ctx.save();
  ctx.fillStyle = color; ctx.strokeStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 12;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  const sig = shapeSig(shape);

  const beak = (hx: number, hy: number, ang: number) => {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
    ctx.beginPath(); ctx.ellipse(0, 0, cs * 0.22, cs * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cs * 0.18, -cs * 0.05); ctx.lineTo(cs * 0.62, 0); ctx.lineTo(cs * 0.18, cs * 0.05);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-cs * 0.15, -cs * 0.12); ctx.lineTo(-cs * 0.38, -cs * 0.35); ctx.lineTo(0, -cs * 0.16);
    ctx.fill();
    eyeDot(ctx, cs * 0.02, -cs * 0.04, cs * 0.09);
    ctx.restore();
  };

  const wing = (x1: number, y1: number, x2: number, y2: number, cpx: number, cpy: number) => {
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cpx, cpy, x2, y2);
    ctx.lineWidth = cs * 0.16; ctx.stroke();
  };

  switch (sig) {
    case '10|10|11':
      beak(ox + cs * 0.5, oy - cs * 0.32, -Math.PI / 2);
      wing(ox + cs * 0.5, oy + cs * 0.5, ox + 2 * cs - cs * 0.1, oy + 2 * cs + cs * 0.1, ox + cs * 1.4, oy + cs * 1.2);
      wing(ox + cs * 0.5, oy + cs * 1.5, ox - cs * 0.3, oy + cs * 2.1, ox + cs * 0.1, oy + cs * 1.8);
      break;
    case '111|100':
      beak(ox + 3 * cs - cs * 0.25, oy + cs * 0.5, 0.1);
      wing(ox + cs * 0.1, oy + cs * 0.5, ox + 2 * cs, oy + cs * 0.5, ox + cs * 1.0, oy - cs * 0.6);
      wing(ox + cs * 0.1, oy + cs * 0.8, ox + cs * 0.9, oy + cs * 1.88, ox + cs * 0.3, oy + cs * 1.6);
      break;
    case '11|01|01':
      beak(ox + cs * 0.3, oy + 3 * cs - cs * 0.3, Math.PI / 2 + 0.3);
      wing(ox + cs * 0.5, oy + cs * 2.0, ox + cs * 1.88, oy + cs * 0.1, ox + cs * 1.5, oy + cs * 1.0);
      wing(ox + cs * 0.5, oy + cs * 1.5, ox - cs * 0.3, oy + cs * 0.8, ox + cs * 0.1, oy + cs * 1.2);
      break;
    default: // '001|111'
      beak(ox + cs * 0.25, oy + cs * 1.5, Math.PI + 0.1);
      wing(ox + cs * 2.9, oy + cs * 0.5, ox + cs, oy + cs * 0.5, ox + cs * 2.0, oy - cs * 0.6);
      wing(ox + cs * 2.9, oy + cs * 0.8, ox + cs * 2.1, oy + cs * 1.88, ox + cs * 2.7, oy + cs * 1.6);
      break;
  }

  // Talons hang from floor cells (looks like feet tucked during flight)
  ctx.shadowBlur = 6;
  floorCells(shape).forEach(({r, c}) => {
    const fx = ox + c * cs + cs * 0.5, fy = oy + r * cs + cs;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy + cs * 0.2);
    ctx.lineWidth = cs * 0.14; ctx.stroke();
    // 3 talon tips
    [[-0.18, 0.14], [0, 0.18], [0.18, 0.14]].forEach(([dx, dy]) => {
      ctx.beginPath(); ctx.moveTo(fx, fy + cs * 0.2);
      ctx.lineTo(fx + cs * dx, fy + cs * 0.2 + cs * dy);
      ctx.lineWidth = cs * 0.09; ctx.stroke();
    });
  });

  ctx.restore();
}

/* ⚡  J → SPINOSAURUS */
function drawSpinosaurus(ctx: CanvasRenderingContext2D, ox: number, oy: number, shape: number[][], cs: number, color: string) {
  ctx.save();
  ctx.fillStyle = color; ctx.strokeStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 12;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  const sig = shapeSig(shape);

  const sail = (sx: number, sy: number, n: number, step: number, h: number) => {
    ctx.shadowBlur = 8;
    for (let i = 0; i < n; i++) {
      const ht = cs * (h - i * 0.05);
      const bx = sx + i * step;
      ctx.beginPath();
      ctx.moveTo(bx, sy); ctx.lineTo(bx + cs * 0.06, sy - ht); ctx.lineTo(bx + cs * 0.13, sy);
      ctx.closePath(); ctx.fill();
    }
  };

  const head = (hx: number, hy: number, ang: number) => {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
    ctx.beginPath(); ctx.ellipse(0, 0, cs * 0.26, cs * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cs * 0.2, -cs * 0.07); ctx.lineTo(cs * 0.62, 0); ctx.lineTo(cs * 0.2, cs * 0.07);
    ctx.fill();
    ctx.save(); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(cs * (0.24 + i * 0.09), 0);
      ctx.lineTo(cs * (0.27 + i * 0.09), 0);
      ctx.lineTo(cs * (0.255 + i * 0.09), cs * 0.14);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    eyeDot(ctx, -cs * 0.02, -cs * 0.07, cs * 0.09);
    ctx.restore();
  };

  const tailTip = (tx: number, ty: number, dx: number) => {
    ctx.beginPath(); ctx.moveTo(tx, ty);
    ctx.bezierCurveTo(tx + dx * cs * 0.38, ty + cs * 0.1, tx + dx * cs * 0.62, ty + cs * 0.42, tx + dx * cs * 0.5, ty + cs * 0.68);
    ctx.lineWidth = cs * 0.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(tx + dx * cs * 0.5, ty + cs * 0.7, cs * 0.07, 0, Math.PI * 2); ctx.fill();
  };

  switch (sig) {
    case '01|01|11':
      head(ox + cs + cs * 0.5, oy - cs * 0.3, 0);
      sail(ox + cs + cs * 0.05, oy, 5, cs * 0.3, 0.42);
      tailTip(ox + cs * 0.12, oy + 3 * cs - cs * 0.15, -1);
      break;
    case '100|111':
      head(ox + cs * 0.3, oy + cs * 0.5, Math.PI + 0.1);
      sail(ox, oy, 4, cs * 0.5, 0.38);
      tailTip(ox + 3 * cs - cs * 0.12, oy + cs + cs * 0.5, 1);
      break;
    case '11|10|10':
      head(ox + cs * 0.5, oy - cs * 0.3, Math.PI);
      sail(ox + cs * 0.05, oy, 5, cs * 0.3, 0.42);
      tailTip(ox + 2 * cs - cs * 0.12, oy + 3 * cs - cs * 0.15, 1);
      break;
    default: // '111|001'
      head(ox + 3 * cs - cs * 0.3, oy + cs * 0.5, 0.1);
      sail(ox, oy, 4, cs * 0.5, 0.38);
      tailTip(ox + cs * 0.12, oy + cs + cs * 0.5, -1);
      break;
  }

  legsFromShape(ctx, ox, oy, shape, cs);
  ctx.restore();
}

/* ─── Master dispatcher ─────────────── */
function drawDinoPiece(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number,
  shape: number[][],
  color: string,
  type: PT,
  cs = CS
) {
  switch (type) {
    case 'I': drawBrontosaurus(ctx, ox, oy, shape, cs, color); break;
    case 'O': drawAnkylosaur(ctx, ox, oy, shape, cs, color);   break;
    case 'T': drawTRex(ctx, ox, oy, shape, cs, color);         break;
    case 'S': drawRaptor(ctx, ox, oy, shape, cs, color);       break;
    case 'Z': drawStegosaur(ctx, ox, oy, shape, cs, color);    break;
    case 'L': drawPterodactyl(ctx, ox, oy, shape, cs, color);  break;
    case 'J': drawSpinosaurus(ctx, ox, oy, shape, cs, color);  break;
  }
}

/* ─── Mini-canvas (next / hold) ─────── */
function drawMiniPiece(
  canvas: HTMLCanvasElement | null,
  shape: number[][] | null,
  color: string,
  type: PT | null = null
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!shape) return;
  const cs = 22;
  const ox = Math.floor((canvas.width  - shape[0].length * cs) / 2);
  const oy = Math.floor((canvas.height - shape.length    * cs) / 2);
  shape.forEach((row, r) => row.forEach((cell, c) => {
    if (!cell) return;
    const px = ox + c * cs, py = oy + r * cs;
    ctx.save();
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.fillRect(px + 1, py + 1, cs - 2, cs - 2);
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(px + 2, py + 2, cs - 4, 4);
    ctx.restore();
  }));
  if (type) drawDinoPiece(ctx, ox, oy, shape, color, type, cs);
}

/* ─── Background: rainbow dinos + sparks ─── */
const BKGD_DINOS = [
  { emoji: '🦕', rx: 0.05, ry: 0.36, sz: 220, spd: 0.42, ph: 0.0,  flip: false },
  { emoji: '🦖', rx: 0.94, ry: 0.28, sz: 200, spd: 0.60, ph: 2.2,  flip: true  },
  { emoji: '🦕', rx: 0.89, ry: 0.74, sz: 175, spd: 0.38, ph: 4.5,  flip: true  },
  { emoji: '🦖', rx: 0.06, ry: 0.76, sz: 160, spd: 0.52, ph: 1.7,  flip: false },
  { emoji: '🦕', rx: 0.50, ry: 0.04, sz: 150, spd: 0.35, ph: 3.1,  flip: false },
  { emoji: '🦖', rx: 0.50, ry: 0.96, sz: 140, spd: 0.48, ph: 5.4,  flip: true  },
];

function BgCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const maybeCv = ref.current; if (!maybeCv) return; const cv = maybeCv;
    const ctx = cv.getContext('2d')!;
    const SC = ['#7EFF50', '#00D4FF', '#FF6B35', '#9B5CF6'];
    type P  = { x: number; y: number };
    type E  = { a: P; b: P };
    type Sp = { e: E; t: number; sp: number; col: string; len: number };
    let pts: P[] = [], edges: E[] = [], sparks: Sp[] = [], W = 0, H = 0, raf = 0;

    function build() {
      pts = []; edges = []; sparks = [];
      const n = Math.max(14, (W * H / 80000) | 0);
      for (let i = 0; i < n; i++) pts.push({x: Math.random() * W, y: Math.random() * H});
      const seen = new Set<string>();
      pts.forEach((p, i) => {
        pts.map((q, j) => ({j, d: Math.hypot(q.x - p.x, q.y - p.y)}))
          .filter(r => r.j !== i).sort((a, b) => a.d - b.d).slice(0, 3)
          .forEach(r => {
            const k = `${Math.min(i, r.j)}_${Math.max(i, r.j)}`;
            if (!seen.has(k)) { seen.add(k); edges.push({a: pts[i], b: pts[r.j]}); }
          });
      });
      edges.forEach(e => { if (Math.random() > 0.32) sparks.push(mk(e)); });
    }
    function mk(e: E): Sp {
      return {e, t: Math.random(), sp: 0.00018 + Math.random() * 0.00042,
        col: SC[Math.random() * 4 | 0], len: 0.06 + Math.random() * 0.1};
    }
    function frame(ts: number) {
      ctx.clearRect(0, 0, W, H);
      const sec = ts / 1000;
      BKGD_DINOS.forEach(d => {
        const x = W * d.rx, y = H * d.ry + Math.sin(sec * d.spd + d.ph) * 14;
        const hue = (sec * 24 + d.ph * 58) % 360;
        ctx.save();
        ctx.translate(x, y);
        if (d.flip) ctx.scale(-1, 1);
        ctx.font = `${d.sz}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const glows = [
          { color: `hsl(${hue}, 100%, 60%)`, blur: 90, alpha: 0.025 },
          { color: `hsl(${(hue+90)%360}, 100%, 60%)`, blur: 65, alpha: 0.030 },
          { color: `hsl(${(hue+180)%360}, 100%, 60%)`, blur: 42, alpha: 0.035 },
          { color: `hsl(${(hue+270)%360}, 100%, 65%)`, blur: 22, alpha: 0.040 },
        ];
        glows.forEach(g => {
          ctx.save(); ctx.globalAlpha = g.alpha; ctx.shadowColor = g.color; ctx.shadowBlur = g.blur;
          ctx.fillText(d.emoji, 0, 0); ctx.restore();
        });
        ctx.globalAlpha = 0.17; ctx.shadowColor = `hsl(${hue}, 100%, 72%)`; ctx.shadowBlur = 18;
        ctx.fillText(d.emoji, 0, 0);
        ctx.restore();
      });
      ctx.lineWidth = 1;
      edges.forEach(e => {
        ctx.beginPath(); ctx.strokeStyle = 'rgba(126,255,80,0.03)';
        ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
      });
      sparks.forEach(s => {
        s.t += s.sp;
        if (s.t > 1 + s.len) {
          s.e = edges[Math.random() * edges.length | 0]; s.t = 0;
          s.col = SC[Math.random() * 4 | 0]; s.sp = 0.00018 + Math.random() * 0.00042;
          s.len = 0.06 + Math.random() * 0.1;
        }
        const tH = Math.min(1, s.t), tT = Math.max(0, s.t - s.len);
        if (tH <= tT) return;
        const {a, b} = s.e;
        const x1 = a.x + (b.x - a.x) * tT, y1 = a.y + (b.y - a.y) * tT;
        const x2 = a.x + (b.x - a.x) * tH, y2 = a.y + (b.y - a.y) * tH;
        const al = tH < 0.1 ? tH / 0.1 : s.t > 0.9 ? (1 - (s.t - 0.9) / 0.1) : 1;
        ctx.save(); ctx.globalAlpha = Math.max(0, al) * 0.55;
        ctx.shadowColor = s.col; ctx.shadowBlur = 6; ctx.strokeStyle = s.col;
        ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.restore();
      });
      raf = requestAnimationFrame(frame);
    }
    function resize() { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; build(); }
    window.addEventListener('resize', resize);
    resize(); raf = requestAnimationFrame(frame);
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} className="dt-bg" />;
}

/* ─── Game component ─────────────────── */
export default function DinoBlox() {
  const bRef = useRef<HTMLCanvasElement>(null);
  const nRef = useRef<HTMLCanvasElement>(null);
  const hRef = useRef<HTMLCanvasElement>(null);
  const [ui, setUI] = useState<UI>({score: 0, level: 1, lines: 0, gs: 'menu'});
  const [curType, setCurType] = useState<PT | null>(null);
  const acts = useRef<{start: () => void; togglePause: () => void}>({
    start: () => {}, togglePause: () => {},
  });

  useEffect(() => {
    const maybeBv = bRef.current; if (!maybeBv) return; const cv = maybeBv;
    const ctx = cv.getContext('2d')!;

    const g = {
      board:     emptyBoard(),
      cur:       randPiece(),
      next:      randPiece(),
      held:      null as {type: PT; shape: number[][]; color: string} | null,
      canHold:   true,
      score:     0, level: 1, lines: 0,
      gs:        'menu' as GS,
      lastDropTs: 0,
      clearing:   false, clearTimer: 0,
      flashBoard: emptyBoard(), readyBoard: emptyBoard(), flashRows: [] as number[],
    };

    const sync = () => {
      setUI({score: g.score, level: g.level, lines: g.lines, gs: g.gs});
      setCurType(g.gs === 'playing' ? g.cur.type : null);
    };

    function spawnNext() {
      g.cur = {...g.next, x: Math.floor((COLS - g.next.shape[0].length) / 2), y: 0};
      g.next = randPiece(); g.canHold = true;
      if (!fits(g.board, g.cur.shape, g.cur.x, 0)) { g.gs = 'gameover'; sync(); }
    }
    function doLock() {
      const locked = placePiece(g.board, g.cur.shape, g.cur.x, g.cur.y, g.cur.color);
      const {board: swept, count, rows} = sweep(locked);
      if (count > 0) {
        g.lines += count; g.score += scoreFor(count, g.level); g.level = Math.floor(g.lines / 10) + 1;
        g.clearing = true; g.clearTimer = FLASH_MS;
        g.flashBoard = locked; g.readyBoard = swept; g.flashRows = rows;
        sync();
      } else { g.board = swept; spawnNext(); }
    }
    function tryDown() {
      if (fits(g.board, g.cur.shape, g.cur.x, g.cur.y + 1)) g.cur.y++;
      else doLock();
    }
    function hardDrop() {
      const gy = getGhostY(g.board, g.cur.shape, g.cur.x, g.cur.y);
      g.score += (gy - g.cur.y) * 2; g.cur.y = gy; doLock(); sync();
    }
    function doHold() {
      if (!g.canHold) return; g.canHold = false;
      const curDef = {type: g.cur.type, shape: DEFS[g.cur.type].shape, color: g.cur.color};
      if (g.held) {
        const prev = g.held; g.held = curDef;
        g.cur = {type: prev.type, shape: prev.shape, color: prev.color,
          x: Math.floor((COLS - prev.shape[0].length) / 2), y: 0};
        if (!fits(g.board, g.cur.shape, g.cur.x, 0)) { g.gs = 'gameover'; sync(); }
      } else { g.held = curDef; spawnNext(); }
    }
    function start() {
      g.board = emptyBoard(); g.cur = randPiece(); g.next = randPiece();
      g.held = null; g.canHold = true; g.score = 0; g.level = 1; g.lines = 0;
      g.gs = 'playing'; g.lastDropTs = performance.now();
      g.clearing = false; g.clearTimer = 0; g.flashRows = [];
      sync();
    }
    function togglePause() {
      if (g.gs === 'playing') g.gs = 'paused';
      else if (g.gs === 'paused') { g.gs = 'playing'; g.lastDropTs = performance.now(); }
      sync();
    }
    acts.current = {start, togglePause};

    /* ── Draw ── */
    function drawFrame() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(126,255,80,0.045)';
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath(); ctx.moveTo(c * CS, 0); ctx.lineTo(c * CS, ROWS * CS); ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * CS); ctx.lineTo(COLS * CS, r * CS); ctx.stroke();
      }

      const board = g.clearing ? g.flashBoard : g.board;
      board.forEach((row, r) => row.forEach((cell, c) => {
        if (!cell) return;
        drawBlock(ctx, c, r, cell);
        const pt = COLOR_TO_TYPE[cell];
        if (pt) {
          ctx.save();
          ctx.font = `${CS * 0.55}px serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.globalAlpha = 0.28;
          ctx.fillText(
            pt === 'I' ? '🦕' : pt === 'O' ? '🛡️' : pt === 'T' ? '🦖' :
            pt === 'S' ? '🐾' : pt === 'Z' ? '🦎' : pt === 'L' ? '🦅' : '⚡',
            c * CS + CS / 2, r * CS + CS / 2
          );
          ctx.restore();
        }
      }));

      if (g.clearing && g.flashRows.length) {
        const p = 1 - g.clearTimer / FLASH_MS;
        const alpha = Math.sin(p * Math.PI * 5) * 0.45 + 0.45;
        ctx.save(); ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = 'white'; ctx.shadowColor = 'white'; ctx.shadowBlur = 24;
        g.flashRows.forEach(r => ctx.fillRect(0, r * CS, COLS * CS, CS));
        ctx.restore();
      }

      if (g.gs === 'playing' && !g.clearing) {
        const gy = getGhostY(g.board, g.cur.shape, g.cur.x, g.cur.y);
        if (gy > g.cur.y) {
          g.cur.shape.forEach((row, r) => row.forEach((cell, c) => {
            if (cell) drawBlock(ctx, g.cur.x + c, gy + r, g.cur.color, 0.1);
          }));
        }
        g.cur.shape.forEach((row, r) => row.forEach((cell, c) => {
          if (cell) drawBlock(ctx, g.cur.x + c, g.cur.y + r, g.cur.color);
        }));
        drawDinoPiece(ctx, g.cur.x * CS, g.cur.y * CS, g.cur.shape, g.cur.color, g.cur.type);
      }

      drawMiniPiece(nRef.current, g.next.shape, g.next.color, g.next.type);
      drawMiniPiece(hRef.current, g.held?.shape ?? null, g.held?.color ?? '', g.held?.type ?? null);
    }

    /* ── Loop ── */
    let lastTs = performance.now(); let rafId = 0;
    function loop(ts: number) {
      const dt = Math.min(ts - lastTs, 50); lastTs = ts;
      if (g.gs === 'playing') {
        if (g.clearing) {
          g.clearTimer -= dt;
          if (g.clearTimer <= 0) { g.board = g.readyBoard; g.clearing = false; g.flashRows = []; spawnNext(); }
        } else {
          if (ts - g.lastDropTs >= gravity(g.level)) { g.lastDropTs = ts; tryDown(); }
        }
      }
      drawFrame(); rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    /* ── Keyboard ── */
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && (g.gs === 'menu' || g.gs === 'gameover')) { start(); return; }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { togglePause(); return; }
      if (g.gs !== 'playing' || g.clearing) return;
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); if (fits(g.board, g.cur.shape, g.cur.x-1, g.cur.y)) g.cur.x--; break;
        case 'ArrowRight': e.preventDefault(); if (fits(g.board, g.cur.shape, g.cur.x+1, g.cur.y)) g.cur.x++; break;
        case 'ArrowDown':
          e.preventDefault();
          if (fits(g.board, g.cur.shape, g.cur.x, g.cur.y+1)) { g.cur.y++; g.score += 1; g.lastDropTs = performance.now(); sync(); }
          break;
        case 'ArrowUp': case 'x': case 'X': {
          e.preventDefault();
          const rot = rotateCW(g.cur.shape);
          for (const dx of [0, -1, 1, -2, 2]) {
            if (fits(g.board, rot, g.cur.x + dx, g.cur.y)) { g.cur.shape = rot; g.cur.x += dx; break; }
          }
          break;
        }
        case 'z': case 'Z': {
          e.preventDefault();
          const rot = rotateCW(rotateCW(rotateCW(g.cur.shape)));
          for (const dx of [0, -1, 1, -2, 2]) {
            if (fits(g.board, rot, g.cur.x + dx, g.cur.y)) { g.cur.shape = rot; g.cur.x += dx; break; }
          }
          break;
        }
        case ' ':   e.preventDefault(); hardDrop(); break;
        case 'c': case 'C': e.preventDefault(); doHold(); break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(rafId); window.removeEventListener('keydown', onKey); };
  }, []);

  const {score, level, lines, gs} = ui;
  const dinoLabel = curType ? DINO_LABEL[curType] : null;

  return (
    <div className="dt-root">
      <BgCanvas />
      <nav className="dt-nav">
        <Link href="/" className="dt-nav-logo">🦕 DINOSAUR<span className="dt-ai">AI</span></Link>
        <span className="dt-nav-title">DINOBLOX</span>
      </nav>
      <main className="dt-main">

        <aside className="dt-side dt-side-left">
          <div className="dt-panel">
            <div className="dt-panel-hd">HOLD</div>
            <canvas ref={hRef} width={120} height={96} className="dt-mini" />
          </div>
          <div className="dt-panel dt-controls">
            <div className="dt-panel-hd">CONTROLS</div>
            {[['←→','Move'],['↑/X','Rotate CW'],['Z','Rotate CCW'],['↓','Soft drop'],['SPC','Hard drop'],['C','Hold'],['P','Pause']].map(([k,v]) => (
              <div className="dt-ctrl" key={k}><kbd>{k}</kbd><span>{v}</span></div>
            ))}
          </div>
          {dinoLabel && (
            <div className="dt-dino-label">
              <span className="dt-dino-icon">{dinoLabel[0]}</span>
              <span className="dt-dino-name">{dinoLabel[1]}</span>
            </div>
          )}
        </aside>

        <div className="dt-board-wrap">
          <canvas ref={bRef} width={COLS * CS} height={ROWS * CS} className="dt-board" />
          {gs === 'menu' && (
            <div className="dt-overlay">
              <span className="dt-ov-emoji">🦕</span>
              <h1 className="dt-ov-title">DINOBLOX</h1>
              <p className="dt-ov-sub">Each piece is a different dinosaur</p>
              <button className="dt-ov-btn" onClick={() => acts.current.start()}>PLAY →</button>
              <span className="dt-ov-hint">or press Enter</span>
            </div>
          )}
          {gs === 'paused' && (
            <div className="dt-overlay">
              <span className="dt-ov-emoji">⏸</span>
              <h2 className="dt-ov-title">PAUSED</h2>
              <button className="dt-ov-btn" onClick={() => acts.current.togglePause()}>RESUME →</button>
            </div>
          )}
          {gs === 'gameover' && (
            <div className="dt-overlay">
              <span className="dt-ov-emoji">☠️</span>
              <h2 className="dt-ov-title">EXTINCT</h2>
              <div className="dt-ov-score">{score.toLocaleString()}</div>
              <p className="dt-ov-sub">Level {level} · {lines} lines</p>
              <button className="dt-ov-btn" onClick={() => acts.current.start()}>PLAY AGAIN →</button>
            </div>
          )}
        </div>

        <aside className="dt-side dt-side-right">
          <div className="dt-stat"><div className="dt-panel-hd">SCORE</div><div className="dt-val dt-val-green">{score.toLocaleString()}</div></div>
          <div className="dt-stat"><div className="dt-panel-hd">LEVEL</div><div className="dt-val dt-val-orange">{level}</div></div>
          <div className="dt-stat"><div className="dt-panel-hd">LINES</div><div className="dt-val dt-val-blue">{lines}</div></div>
          <div className="dt-panel" style={{marginTop: '0.25rem'}}>
            <div className="dt-panel-hd">NEXT</div>
            <canvas ref={nRef} width={120} height={96} className="dt-mini" />
          </div>
        </aside>

      </main>
    </div>
  );
}
