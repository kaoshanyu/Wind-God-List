"use client";

import { useRef, useEffect } from "react";

// ===================== Canvas Setup =====================

const W = 500;
const H = 400;

// ===================== Drawing Helpers =====================

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
}

// ===================== Scene Character State =====================

interface CuteState {
  // Pose
  bodyAngle: number;       // -45 to 45 deg
  bodySlide: number;       // horizontal slide px
  armAngle: number;        // arm raise
  legSpread: number;       // leg stance width
  // Head
  headTilt: number;        // head tilt deg
  eyeSize: number;         // 0=normal, 1=wide, 2=bug
  mouthShape: string;      // "smile" | "open" | "scream" | "tongue"
  blush: boolean;
  // Gear
  hatAttached: boolean;
  hatFlyX: number;
  hatFlyY: number;
  hatRotation: number;
  umbrellaAngle: number;   // deg
  umbrellaInsideOut: boolean;
  umbrellaTorn: boolean;
  // Physics
  floating: boolean;
  floatOffset: number;
  blownAway: boolean;
  // Scene
  skyColor: string;
  oceanRoughness: number;
  sunVisible: boolean;
  cloudSpeed: number;
  cloudColor: string;
  palmBend: number;
  sceneShake: number;
  debrisCount: number;
  darkOverlay: number;
}

const LEVEL_SCENES: { min: number; label: string; getState: (t: number) => CuteState }[] = [
  {
    min: 0, label: "无风",
    getState: (t) => ({
      bodyAngle: 0, bodySlide: 0, armAngle: 0, legSpread: 0,
      headTilt: 0, eyeSize: 0, mouthShape: "smile", blush: false,
      hatAttached: true, hatFlyX: 0, hatFlyY: 0, hatRotation: 0,
      umbrellaAngle: 0, umbrellaInsideOut: false, umbrellaTorn: false,
      floating: false, floatOffset: 0, blownAway: false,
      skyColor: "#87CEEB", oceanRoughness: 0, sunVisible: true,
      cloudSpeed: 0.1, cloudColor: "#fff", palmBend: 0, sceneShake: 0,
      debrisCount: 0, darkOverlay: 0,
    }),
  },
  {
    min: 3, label: "起风",
    getState: (t) => ({
      bodyAngle: 5 + Math.sin(t * 0.04) * 2, bodySlide: 3, armAngle: 0.3, legSpread: 1,
      headTilt: 3, eyeSize: 0, mouthShape: "smile", blush: false,
      hatAttached: true, hatFlyX: 0, hatFlyY: 0, hatRotation: 0,
      umbrellaAngle: 8 + Math.sin(t * 0.05) * 3, umbrellaInsideOut: false, umbrellaTorn: false,
      floating: false, floatOffset: 0, blownAway: false,
      skyColor: "#7EC8E3", oceanRoughness: 0.2, sunVisible: true,
      cloudSpeed: 0.2, cloudColor: "#e8e8e8", palmBend: 0.05, sceneShake: 0,
      debrisCount: 0, darkOverlay: 0,
    }),
  },
  {
    min: 5, label: "劲风",
    getState: (t) => ({
      bodyAngle: 15 + Math.sin(t * 0.06) * 5, bodySlide: 10, armAngle: 0.8, legSpread: 2,
      headTilt: 10, eyeSize: 1, mouthShape: "smile", blush: true,
      hatAttached: true, hatFlyX: 0, hatFlyY: 0, hatRotation: 0,
      umbrellaAngle: 25 + Math.sin(t * 0.08) * 8, umbrellaInsideOut: false, umbrellaTorn: false,
      floating: false, floatOffset: 0, blownAway: false,
      skyColor: "#7AB8D0", oceanRoughness: 0.4, sunVisible: true,
      cloudSpeed: 0.35, cloudColor: "#d0d0d0", palmBend: 0.15, sceneShake: 0,
      debrisCount: 2, darkOverlay: 0,
    }),
  },
  {
    min: 7, label: "强风",
    getState: (t) => ({
      bodyAngle: 28 + Math.sin(t * 0.08) * 6, bodySlide: 20, armAngle: 1.5, legSpread: 3,
      headTilt: 18, eyeSize: 1, mouthShape: "open", blush: true,
      hatAttached: false, hatFlyX: 15 + t * 0.4, hatFlyY: -8 - Math.abs(Math.sin(t * 0.1)) * 5, hatRotation: t * 0.03,
      umbrellaAngle: 45 + Math.sin(t * 0.1) * 10, umbrellaInsideOut: false, umbrellaTorn: false,
      floating: false, floatOffset: 0, blownAway: false,
      skyColor: "#6BA8C0", oceanRoughness: 0.6, sunVisible: false,
      cloudSpeed: 0.5, cloudColor: "#b8b8b8", palmBend: 0.3, sceneShake: 0,
      debrisCount: 5, darkOverlay: 0.05,
    }),
  },
  {
    min: 9, label: "烈风",
    getState: (t) => ({
      bodyAngle: 40 + Math.sin(t * 0.1) * 8, bodySlide: 35, armAngle: 2.5, legSpread: 4,
      headTilt: 25, eyeSize: 2, mouthShape: "scream", blush: true,
      hatAttached: false, hatFlyX: 45 + t * 0.5, hatFlyY: -20 + Math.sin(t * 0.12) * 8, hatRotation: t * 0.05,
      umbrellaAngle: 60 + Math.sin(t * 0.12) * 15, umbrellaInsideOut: true, umbrellaTorn: false,
      floating: true, floatOffset: -15 + Math.sin(t * 0.08) * 5, blownAway: false,
      skyColor: "#5A98B0", oceanRoughness: 0.8, sunVisible: false,
      cloudSpeed: 0.7, cloudColor: "#a0a0a0", palmBend: 0.5, sceneShake: 0.2,
      debrisCount: 10, darkOverlay: 0.12,
    }),
  },
  {
    min: 11, label: "暴风",
    getState: (t) => ({
      bodyAngle: 50, bodySlide: 50, armAngle: 3, legSpread: 5,
      headTilt: 30, eyeSize: 2, mouthShape: "tongue", blush: false,
      hatAttached: false, hatFlyX: 80 + t * 0.6, hatFlyY: -35 + Math.sin(t * 0.15) * 10, hatRotation: t * 0.07,
      umbrellaAngle: 80, umbrellaInsideOut: true, umbrellaTorn: true,
      floating: true, floatOffset: -35 + Math.sin(t * 0.1) * 8, blownAway: false,
      skyColor: "#4A8098", oceanRoughness: 1, sunVisible: false,
      cloudSpeed: 1, cloudColor: "#808080", palmBend: 0.7, sceneShake: 0.4,
      debrisCount: 18, darkOverlay: 0.2,
    }),
  },
  {
    min: 13, label: "台风",
    getState: (t) => ({
      bodyAngle: 0, bodySlide: 0, armAngle: 0, legSpread: 0,
      headTilt: 0, eyeSize: 0, mouthShape: "smile", blush: false,
      hatAttached: false, hatFlyX: 150, hatFlyY: -50, hatRotation: t * 0.1,
      umbrellaAngle: 0, umbrellaInsideOut: true, umbrellaTorn: true,
      floating: false, floatOffset: 0, blownAway: true,
      skyColor: "#3A6070", oceanRoughness: 1.2, sunVisible: false,
      cloudSpeed: 1.5, cloudColor: "#606060", palmBend: 1, sceneShake: 0.6,
      debrisCount: 30, darkOverlay: 0.35,
    }),
  },
  {
    min: 15, label: "超强台风",
    getState: (t) => ({
      bodyAngle: 0, bodySlide: 0, armAngle: 0, legSpread: 0,
      headTilt: 0, eyeSize: 0, mouthShape: "smile", blush: false,
      hatAttached: false, hatFlyX: 200, hatFlyY: -80, hatRotation: t * 0.15,
      umbrellaAngle: 0, umbrellaInsideOut: true, umbrellaTorn: true,
      floating: false, floatOffset: 0, blownAway: true,
      skyColor: "#2A4050", oceanRoughness: 1.5, sunVisible: false,
      cloudSpeed: 2, cloudColor: "#404040", palmBend: 1, sceneShake: 0.8,
      debrisCount: 50, darkOverlay: 0.5,
    }),
  },
];

function getScene(level: number, time: number): CuteState {
  const l = Math.max(0, Math.min(17, level));
  let scene = LEVEL_SCENES[0];
  for (const s of LEVEL_SCENES) {
    if (l >= s.min) scene = s;
  }
  const raw = scene.getState(time);

  // Smooth interpolation between scenes at boundaries
  const nextMin = LEVEL_SCENES.find(s => s.min > scene.min);
  if (nextMin && l > scene.min && l < nextMin.min) {
    const ratio = (l - scene.min) / (nextMin.min - scene.min);
    const next = nextMin.getState(time);
    return {
      bodyAngle: lerp(raw.bodyAngle, next.bodyAngle, ratio),
      bodySlide: lerp(raw.bodySlide, next.bodySlide, ratio),
      armAngle: lerp(raw.armAngle, next.armAngle, ratio),
      legSpread: lerp(raw.legSpread, next.legSpread, ratio),
      headTilt: lerp(raw.headTilt, next.headTilt, ratio),
      eyeSize: Math.round(lerp(raw.eyeSize, next.eyeSize, ratio)),
      mouthShape: ratio > 0.5 ? next.mouthShape : raw.mouthShape,
      blush: raw.blush || next.blush,
      hatAttached: raw.hatAttached,
      hatFlyX: lerp(raw.hatFlyX, next.hatFlyX, ratio),
      hatFlyY: lerp(raw.hatFlyY, next.hatFlyY, ratio),
      hatRotation: lerp(raw.hatRotation, next.hatRotation, ratio),
      umbrellaAngle: lerp(raw.umbrellaAngle, next.umbrellaAngle, ratio),
      umbrellaInsideOut: raw.umbrellaInsideOut || (ratio > 0.5 && next.umbrellaInsideOut),
      umbrellaTorn: raw.umbrellaTorn || (ratio > 0.5 && next.umbrellaTorn),
      floating: raw.floating || (ratio > 0.5 && next.floating),
      floatOffset: lerp(raw.floatOffset, next.floatOffset, ratio),
      blownAway: next.blownAway,
      skyColor: lerpColor(raw.skyColor, next.skyColor, ratio),
      oceanRoughness: lerp(raw.oceanRoughness, next.oceanRoughness, ratio),
      sunVisible: raw.sunVisible,
      cloudSpeed: lerp(raw.cloudSpeed, next.cloudSpeed, ratio),
      cloudColor: lerpColor(raw.cloudColor, next.cloudColor, ratio),
      palmBend: lerp(raw.palmBend, next.palmBend, ratio),
      sceneShake: lerp(raw.sceneShake, next.sceneShake, ratio),
      debrisCount: Math.round(lerp(raw.debrisCount, next.debrisCount, ratio)),
      darkOverlay: lerp(raw.darkOverlay, next.darkOverlay, ratio),
    };
  }
  return raw;
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16), bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = Math.round(lerp(ar, br, t)), rg = Math.round(lerp(ag, bg, t)), rb = Math.round(lerp(ab, bb, t));
  return `rgb(${rr},${rg},${rb})`;
}

// ===================== Drawing Functions =====================

function drawSky(ctx: CanvasRenderingContext2D, color: string, darkOverlay: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, 250);
  grad.addColorStop(0, color);
  grad.addColorStop(1, lighten(color, 40));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 250);
  if (darkOverlay > 0) {
    ctx.fillStyle = `rgba(30,30,40,${darkOverlay})`;
    ctx.fillRect(0, 0, W, 250);
  }
}

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + amt);
  const b = Math.min(255, (n & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
}

interface Cloud { x: number; y: number; r: number }

function drawCloud(ctx: CanvasRenderingContext2D, c: Cloud, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
  ctx.arc(c.x + c.r * 0.8, c.y - c.r * 0.3, c.r * 0.7, 0, Math.PI * 2);
  ctx.arc(c.x + c.r * 1.6, c.y, c.r * 0.85, 0, Math.PI * 2);
  ctx.arc(c.x + c.r * 0.4, c.y + c.r * 0.2, c.r * 0.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawSun(ctx: CanvasRenderingContext2D, visible: boolean) {
  if (!visible) return;
  const sx = W - 60, sy = 50;
  // Glow
  ctx.fillStyle = "rgba(255,200,50,0.15)";
  ctx.beginPath(); ctx.arc(sx, sy, 45, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,200,50,0.25)";
  ctx.beginPath(); ctx.arc(sx, sy, 35, 0, Math.PI * 2); ctx.fill();
  // Sun
  ctx.fillStyle = "#FFD700";
  ctx.beginPath(); ctx.arc(sx, sy, 24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FFED4A";
  ctx.beginPath(); ctx.arc(sx - 4, sy - 4, 16, 0, Math.PI * 2); ctx.fill();
}

function drawOcean(ctx: CanvasRenderingContext2D, roughness: number, time: number) {
  const oy = 260;
  const colors = ["#6BA3C7", "#5A92B7", "#4A82A7"];
  for (let layer = 0; layer < 3; layer++) {
    ctx.fillStyle = colors[layer];
    ctx.beginPath();
    ctx.moveTo(0, oy + layer * 3);
    for (let x = 0; x <= W; x += 4) {
      const wave = Math.sin(x * 0.03 + time * (0.02 + roughness * 0.04) + layer * 2) * (3 + roughness * 8);
      ctx.lineTo(x, oy + layer * 3 + wave);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();
  }
  // Whitecaps
  if (roughness > 0.3) {
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    for (let x = 0; x < W; x += 20) {
      const wave = Math.sin(x * 0.04 + time * 0.05) * roughness * 10;
      if (wave > 4) {
        ctx.beginPath(); ctx.arc(x, oy + wave - 2, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}

function drawBeach(ctx: CanvasRenderingContext2D) {
  const by = 275;
  const grad = ctx.createLinearGradient(0, by, 0, H);
  grad.addColorStop(0, "#EDCBA0");
  grad.addColorStop(0.3, "#E0C090");
  grad.addColorStop(0.7, "#D4B080");
  grad.addColorStop(1, "#C8A070");
  ctx.fillStyle = grad;
  ctx.fillRect(0, by, W, H - by);
  // Sand dots
  ctx.fillStyle = "rgba(180,150,100,0.3)";
  for (let i = 0; i < 30; i++) {
    const dx = (i * 37 + 13) % W;
    const dy = by + 10 + ((i * 23 + 7) % (H - by - 20));
    ctx.beginPath(); ctx.arc(dx, dy, 1.5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawPalmTree(ctx: CanvasRenderingContext2D, x: number, baseY: number, bend: number, time: number) {
  const sway = Math.sin(time * 0.03 + x) * bend * 8;
  const trunkH = 80;
  ctx.strokeStyle = "#8B6914";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  const cx = x + sway + bend * 20;
  ctx.quadraticCurveTo(x + sway * 0.5 + bend * 10, baseY - trunkH * 0.5, cx, baseY - trunkH);
  ctx.stroke();

  // Fronds at top
  const fcx = cx, fcy = baseY - trunkH;
  ctx.fillStyle = bend > 0.8 ? "#5A8A4F" : "#6AAF5F";
  const frondSpread = 30 + bend * 15;
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI - Math.PI * 0.5 + (bend * 0.5 - 0.25);
    const len = 25 - bend * 8;
    ctx.beginPath();
    ctx.moveTo(fcx, fcy);
    const ex = fcx + Math.cos(angle) * len;
    const ey = fcy + Math.sin(angle) * len;
    ctx.quadraticCurveTo(fcx + Math.cos(angle - 0.3) * len * 0.6, fcy + Math.sin(angle - 0.3) * len * 0.6, ex, ey);
    ctx.fill();
  }
  // Coconuts
  ctx.fillStyle = "#8B4513";
  ctx.beginPath(); ctx.arc(fcx - 3, fcy + 2, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(fcx + 3, fcy + 3, 3.5, 0, Math.PI * 2); ctx.fill();
}

// ===================== Cute Character Drawing =====================

function drawCuteCharacter(ctx: CanvasRenderingContext2D, s: CuteState, time: number) {
  const cx = 250 + s.bodySlide;
  const cy = s.floating ? 210 + s.floatOffset : 230;
  const rot = s.bodyAngle * Math.PI / 180;
  const wobble = s.bodyAngle > 20 ? Math.sin(time * 0.08) * (s.bodyAngle * 0.1) : 0;

  if (s.blownAway) {
    // Draw small "x" or "bye" at far position
    const fx = 450 + Math.round(time * 0.5) % 100;
    const fy = 100 - Math.round(time * 0.3) % 80;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#FF6B8A";
    ctx.fillText("💨", 0, 0);
    ctx.fillStyle = "#FFB6C1";
    ctx.font = "16px sans-serif";
    ctx.fillText("啊~~~~~", 0, 25);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot + wobble * Math.PI / 180);

  const tiltPx = s.bodyAngle * 0.3;

  // === LEGS ===
  const legLen = 30 + s.legSpread * 2;
  const legSpreadPx = 6 + s.legSpread * 2;
  ctx.strokeStyle = "#4A6741";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  // Left leg
  ctx.beginPath(); ctx.moveTo(-legSpreadPx + tiltPx, 15);
  ctx.lineTo(-legSpreadPx - 3 + tiltPx, 15 + legLen);
  ctx.stroke();
  // Right leg
  ctx.beginPath(); ctx.moveTo(legSpreadPx + tiltPx, 15);
  ctx.lineTo(legSpreadPx + 3 + tiltPx, 15 + legLen);
  ctx.stroke();
  // Shoes
  ctx.fillStyle = "#8B4513";
  ctx.beginPath(); ctx.ellipse(-legSpreadPx - 2 + tiltPx, 15 + legLen, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(legSpreadPx + 2 + tiltPx, 15 + legLen, 7, 4, 0, 0, Math.PI * 2); ctx.fill();

  // === BODY ===
  const bodyTop = 5;
  const bodyBottom = 15;
  ctx.fillStyle = "#FF6B6B";
  roundRect(ctx, -20 + tiltPx, bodyTop, 40, bodyBottom - bodyTop + 5, 12);
  ctx.fill();
  // Shirt detail
  ctx.fillStyle = "#E05555";
  roundRect(ctx, -15 + tiltPx, bodyTop + 8, 12, 3, 1.5); ctx.fill();
  roundRect(ctx, 3 + tiltPx, bodyTop + 8, 12, 3, 1.5); ctx.fill();
  // Belly button
  ctx.fillStyle = "#D04040";
  ctx.beginPath(); ctx.arc(0 + tiltPx, bodyTop + 10, 2, 0, Math.PI * 2); ctx.fill();

  // === ARMS ===
  const armSwing = s.armAngle * 0.3 + Math.sin(time * 0.06) * (1 - s.armAngle * 0.1);
  ctx.strokeStyle = "#FFE0BD";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  // Left arm (holding umbrella at low wind, flailing at high wind)
  const laY = s.armAngle > 1 ? -10 - s.armAngle * 5 : 8 + s.armAngle * 3;
  ctx.beginPath();
  ctx.moveTo(-22 + tiltPx, 8);
  ctx.quadraticCurveTo(-35 + tiltPx + Math.sin(time * 0.1) * 3, laY + 5, -28 + tiltPx + Math.sin(time * 0.08) * 3, laY);
  ctx.stroke();
  // Right arm
  const raY = 5 + Math.sin(time * 0.08 + 2) * (2 + s.armAngle * 2);
  ctx.beginPath();
  ctx.moveTo(22 + tiltPx, 8);
  ctx.quadraticCurveTo(35 + tiltPx + Math.sin(time * 0.1 + 1) * 3, raY + 3, 30 + tiltPx + Math.sin(time * 0.12) * 3, raY);
  ctx.stroke();

  // === HEAD ===
  const headY = bodyTop - 25;
  // Face shadow
  ctx.fillStyle = "#F0C8A0";
  ctx.beginPath(); ctx.arc(0 + tiltPx * 0.5, headY, 22, 0, Math.PI * 2); ctx.fill();
  // Face
  ctx.fillStyle = "#FFE0BD";
  ctx.beginPath(); ctx.arc(0 + tiltPx * 0.5, headY, 20, 0, Math.PI * 2); ctx.fill();

  // === HAIR ===
  ctx.fillStyle = "#5C3A21";
  // Main hair
  ctx.beginPath();
  ctx.arc(0 + tiltPx * 0.5, headY - 5, 20, Math.PI * 1.2, Math.PI * 1.8);
  ctx.fill();
  // Side hair
  ctx.fillRect(-20 + tiltPx * 0.5, headY - 5, 5, 12);
  ctx.fillRect(15 + tiltPx * 0.5, headY - 5, 5, 12);
  // Flying hair at high wind
  if (s.bodyAngle > 10) {
    ctx.fillStyle = "#3D2515";
    ctx.beginPath();
    ctx.moveTo(18 + tiltPx * 0.5, headY - 8);
    ctx.quadraticCurveTo(35 + tiltPx * 0.5, headY - 20 + s.bodyAngle, 40 + tiltPx * 0.5, headY - 10 + s.bodyAngle * 0.5);
    ctx.lineTo(18 + tiltPx * 0.5, headY - 5);
    ctx.fill();
  }

  // === EYES ===
  if (s.eyeSize === 2) {
    // Bug eyes 👀
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath(); ctx.ellipse(-7 + tiltPx * 0.5, headY + 1, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(7 + tiltPx * 0.5, headY + 1, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
    // Pupils (tiny, shocked)
    ctx.fillStyle = "#2D1B0E";
    ctx.beginPath(); ctx.arc(-7 + tiltPx * 0.5, headY + 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7 + tiltPx * 0.5, headY + 2, 3, 0, Math.PI * 2); ctx.fill();
  } else if (s.eyeSize === 1) {
    // Wide eyes
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath(); ctx.ellipse(-7 + tiltPx * 0.5, headY + 1, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(7 + tiltPx * 0.5, headY + 1, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2D1B0E";
    ctx.beginPath(); ctx.arc(-7 + tiltPx * 0.5, headY + 2, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7 + tiltPx * 0.5, headY + 2, 3.5, 0, Math.PI * 2); ctx.fill();
    // Eye shine
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath(); ctx.arc(-9 + tiltPx * 0.5, headY - 1, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5 + tiltPx * 0.5, headY - 1, 1.5, 0, Math.PI * 2); ctx.fill();
  } else {
    // Normal cute eyes
    ctx.fillStyle = "#2D1B0E";
    ctx.beginPath(); ctx.ellipse(-7 + tiltPx * 0.5, headY + 1, 3.5, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(7 + tiltPx * 0.5, headY + 1, 3.5, 5, 0, 0, Math.PI * 2); ctx.fill();
    // Eye shine
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath(); ctx.arc(-8 + tiltPx * 0.5, headY - 1, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6 + tiltPx * 0.5, headY - 1, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  // === MOUTH ===
  if (s.mouthShape === "tongue") {
    // Open mouth with tongue 😛
    ctx.fillStyle = "#8B4513";
    ctx.beginPath(); ctx.ellipse(0 + tiltPx * 0.5, headY + 9, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FF6B8A";
    ctx.beginPath(); ctx.ellipse(0 + tiltPx * 0.5, headY + 11, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
  } else if (s.mouthShape === "scream") {
    // Scream 😱
    ctx.fillStyle = "#8B4513";
    ctx.beginPath(); ctx.ellipse(0 + tiltPx * 0.5, headY + 9, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FF8E8E";
    ctx.beginPath(); ctx.ellipse(0 + tiltPx * 0.5, headY + 9, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
  } else if (s.mouthShape === "open") {
    // Open mouth 😮
    ctx.fillStyle = "#8B4513";
    ctx.beginPath(); ctx.ellipse(0 + tiltPx * 0.5, headY + 9, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    // Smile 🙂
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0 + tiltPx * 0.5, headY + 6, 5, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }

  // === BLUSH ===
  if (s.blush) {
    ctx.fillStyle = "rgba(255,150,150,0.35)";
    ctx.beginPath(); ctx.ellipse(-12 + tiltPx * 0.5, headY + 6, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(12 + tiltPx * 0.5, headY + 6, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  }

  // === HAT ===
  if (s.hatAttached) {
    const hx = 0 + tiltPx * 0.5;
    const hy = headY - 15;
    // Brim
    ctx.fillStyle = "#E0C880";
    ctx.beginPath(); ctx.ellipse(hx, hy + 5, 22, 5, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#D4B070";
    ctx.beginPath(); ctx.ellipse(hx, hy + 5, 20, 4, -0.1, 0, Math.PI * 2); ctx.fill();
    // Crown
    ctx.fillStyle = "#F5E6A3";
    roundRect(ctx, hx - 12, hy - 8, 24, 14, 4); ctx.fill();
    ctx.fillStyle = "#E8D890";
    roundRect(ctx, hx - 10, hy - 6, 20, 10, 3); ctx.fill();
    // Ribbon
    ctx.fillStyle = "#E08060";
    ctx.fillRect(hx - 12, hy, 24, 3);
    // Flower on hat
    ctx.fillStyle = "#FF8E8E";
    ctx.beginPath(); ctx.arc(hx + 10, hy - 3, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FFB6C1";
    ctx.beginPath(); ctx.arc(hx + 10, hy - 3, 2.5, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();

  // === FLYING HAT (drawn in world space, not rotated) ===
  if (!s.hatAttached && !s.blownAway) {
    const hfx = 250 + s.hatFlyX;
    const hfy = 180 + s.hatFlyY;
    ctx.save();
    ctx.translate(hfx, hfy);
    ctx.rotate(s.hatRotation);
    ctx.fillStyle = "#E0C880";
    ctx.beginPath(); ctx.ellipse(0, 5, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#F5E6A3";
    roundRect(ctx, -10, -6, 20, 12, 4); ctx.fill();
    ctx.fillStyle = "#E08060";
    ctx.fillRect(-10, 0, 20, 2.5);
    ctx.restore();
  }

  // === UMBRELLA ===
  if (!s.blownAway) {
    drawUmbrella(ctx, s, tiltPx, cx, cy, rot);
  }
}

function drawUmbrella(ctx: CanvasRenderingContext2D, s: CuteState, tiltPx: number, cx: number, cy: number, rot: number) {
  const uAngle = s.umbrellaAngle * Math.PI / 180;
  const ux = cx - 25 + tiltPx;
  const uy = cy - 45;

  ctx.save();

  if (s.umbrellaInsideOut) {
    // Inside out — torn and flapping
    ctx.translate(ux + Math.sin(uAngle) * 15, uy - 30);
    ctx.rotate(-0.3 + uAngle);

    ctx.fillStyle = "#D4A0A0";
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.quadraticCurveTo(-20, -15, -5, -8);
    ctx.quadraticCurveTo(0, -20, 10, -6);
    ctx.quadraticCurveTo(20, -18, 30, -2);
    ctx.quadraticCurveTo(15, 8, 0, 3);
    ctx.quadraticCurveTo(-15, 8, -30, 0);
    ctx.fill();

    // Broken ribs (pseudo-random via seeded constants)
    ctx.strokeStyle = "#C08080";
    ctx.lineWidth = 2;
    const offsets = [3, -2, 5, -4, 1];
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 8, 0);
      ctx.lineTo(i * 10 + (s.bodyAngle > 30 ? offsets[i + 2] * 3 : 0), -10 + offsets[i + 2]);
      ctx.stroke();
    }
  } else {
    // Normal umbrella
    ctx.translate(ux, uy);
    ctx.rotate(uAngle * 0.3);

    // Pole
    ctx.strokeStyle = "#8B7355";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 40); ctx.stroke();
    // Handle
    ctx.strokeStyle = "#A08060"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 42, 5, Math.PI, 0); ctx.stroke();

    // Canopy
    ctx.fillStyle = "#FF8E8E";
    ctx.beginPath();
    ctx.moveTo(-35, 0);
    ctx.quadraticCurveTo(-25, -25, 0, -30);
    ctx.quadraticCurveTo(25, -25, 35, 0);
    ctx.fill();

    // Alternate panel
    ctx.fillStyle = "#FFB6C1";
    ctx.beginPath();
    ctx.moveTo(-10, -24);
    ctx.quadraticCurveTo(0, -30, 10, -24);
    ctx.quadraticCurveTo(5, -12, -10, -24);
    ctx.fill();

    // Scalloped edge
    ctx.fillStyle = "#E07070";
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(i * 10, 0, 5, Math.PI, 0);
      ctx.fill();
    }

    // Tip
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(0, -32, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ===================== Wind Lines =====================

function drawWindLines(ctx: CanvasRenderingContext2D, level: number, time: number) {
  if (level < 2) return;
  const count = Math.min(20, level * 1.5);
  ctx.strokeStyle = "rgba(200,220,240,0.4)";
  ctx.lineWidth = 2 + level * 0.15;
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const offset = (i * 37 + 13) % 60;
    const lx = ((time * (1 + level * 0.15) + offset * 4) % (W + 40)) - 20;
    const ly = 30 + (i * 15 + offset) % 200;
    const len = 10 + level * 2;
    const alpha = 0.1 + level * 0.025;
    ctx.strokeStyle = `rgba(200,220,240,${Math.min(alpha, 0.5)})`;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + len, ly - level * 0.3);
    ctx.stroke();
  }
}

// ===================== Particles =====================

function drawParticles(ctx: CanvasRenderingContext2D, count: number, time: number, level: number) {
  if (count === 0) return;
  const colors = ["#EDCBA0", "#8B6914", "#4A8C3F", "#C06040", "#808080"];
  for (let i = 0; i < count; i++) {
    const seed = i * 17 + 7;
    const px = ((time * (0.3 + level * 0.05) + seed * 3) % (W + 40)) - 20;
    const py = (20 + seed * 7 + Math.sin(time * 0.05 + i) * 20) % 350;
    const size = 2 + (seed % 3);
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.3 + (seed % 5) * 0.1;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ===================== Main Component =====================

export default function CuteScene({ windLevel: level }: { windLevel: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const lastLevelRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const clouds: Cloud[] = [
      { x: 60, y: 50, r: 25 },
      { x: 250, y: 35, r: 35 },
      { x: 400, y: 55, r: 20 },
    ];

    function loop() {
      if (!ctx) return;
      const time = timeRef.current++;
      const targetLevel = level;
      const smoothLevel = lastLevelRef.current + (targetLevel - lastLevelRef.current) * 0.05;
      lastLevelRef.current = smoothLevel;
      const intLevel = Math.round(smoothLevel);
      const s = getScene(intLevel, time);

      // === Scene shake ===
      const shakeX = s.sceneShake > 0 ? Math.sin(time * 0.4) * s.sceneShake * 8 : 0;
      const shakeY = s.sceneShake > 0 ? Math.cos(time * 0.3) * s.sceneShake * 5 : 0;

      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Draw scene
      drawSky(ctx, s.skyColor, s.darkOverlay);
      drawSun(ctx, s.sunVisible);

      // Clouds
      for (const c of clouds) {
        c.x += s.cloudSpeed;
        if (c.x > W + 50) c.x = -50;
        drawCloud(ctx, c, s.cloudColor);
      }

      drawWindLines(ctx, intLevel, time);
      drawOcean(ctx, s.oceanRoughness, time);
      drawBeach(ctx);

      // Palm trees
      drawPalmTree(ctx, 60, 330, s.palmBend, time);
      drawPalmTree(ctx, 430, 320, s.palmBend * 0.7, time);

      // Particles
      drawParticles(ctx, s.debrisCount, time, intLevel);

      // Character
      drawCuteCharacter(ctx, s, time);

      ctx.restore();

      // Overlay text for level extremes
      if (s.blownAway) {
        ctx.save();
        ctx.fillStyle = `rgba(200,50,50,${0.3 + Math.sin(time * 0.05) * 0.15})`;
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("💨💨💨", 250, 60);
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(loop);
    }

    loop();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); timeRef.current = 0; lastLevelRef.current = 0; };
  }, [level]);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="w-full h-auto"
      />
    </div>
  );
}
