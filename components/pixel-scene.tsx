"use client";

import { useRef, useEffect } from "react";
import { PS, W, H, CANVAS_W, CANVAS_H, px } from "@/lib/pixel-utils";

interface PixelSceneProps {
  windLevel: number; // 0-17 (Beaufort scale)
}

// ===================== Pixel Scene =====================

// Colors
const SKY_TOP = "#87CEEB";
const SKY_BOT = "#E8F4FD";
const OCEAN1 = "#6BA3C7";
const OCEAN2 = "#5A92B7";
const OCEAN3 = "#4A82A7";
const CLOUD = "#FFFFFF";
const CLOUD_SHADOW = "#F0F0F0";
const SAND2 = "#E0C090";
const SAND3 = "#D4B080";

const SKIN = "#FFE0BD";
const SKIN_SHADOW = "#F0C8A0";
const HAIR = "#5C3A21";
const HAIR_DARK = "#3D2515";
const EYE = "#2D1B0E";
const EYE_WHITE = "#FFFFFF";
const SHIRT = "#FF6B6B";
const SHIRT_DARK = "#CC5555";
const PANTS = "#4A6741";
const PANTS_DARK = "#3A5233";
const SHOES = "#8B4513";
const SHOES_DARK = "#6B3410";
const HAT = "#F5E6A3";
const HAT_DARK = "#E0C880";
const HAT_BAND = "#E08060";
const UMB_A = "#FF8E8E";
const UMB_B = "#E8F0FF";
const UMB_DARK = "#C49A9A";
const UMB_POLE = "#8B7355";
const UMB_TIP = "#FFD700";

// Palm tree colors
const TRUNK = "#B8860B";
const TRUNK_DARK = "#8B6914";
const LEAF = "#4A8C3F";
const LEAF_DARK = "#3A7030";
const LEAF_LIGHT = "#6AAF5F";

// ===================== Level → Reaction Mapping =====================

interface CharState {
  tilt: number;
  slide: number;
  crouch: number;
  armRaise: number;
  hatAttached: boolean;
  umbrellaAngle: number;
  umbrellaInsideOut: boolean;
  floating: boolean;
  blownAway: boolean;
  sceneShake: number; // 0-1 intensity
  palmBend: number;   // 0-1
  palmBroken: boolean;
  sandstorm: number;  // 0-1
}

function levelToState(level: number): CharState {
  const l = Math.max(0, Math.min(17, level));
  // Dramatically exaggerated reactions — TikTok style!
  return {
    tilt: l <= 1 ? 0 : Math.min(38, (l - 1) * 3.8),
    slide: l <= 2 ? 0 : Math.min(35, (l - 2) * 3.2),
    crouch: l <= 4 ? 0 : Math.min(10, (l - 4) * 1.2),
    armRaise: l <= 1 ? 0 : Math.min(10, (l - 1) * 0.8),
    hatAttached: l < 4,
    umbrellaAngle: l * 0.09,
    umbrellaInsideOut: l >= 7,
    floating: l >= 9 && l < 11,
    blownAway: l >= 11,
    sceneShake: l >= 9 ? Math.min(1, (l - 8) * 0.15) : 0,
    palmBend: l >= 5 ? Math.min(1, (l - 4) * 0.18) : 0,
    palmBroken: l >= 12,
    sandstorm: l >= 8 ? Math.min(1, (l - 7) * 0.18) : 0,
  };
}

// ===================== Scene State =====================

interface SceneState {
  time: number;
  particles: { x: number; y: number; vx: number; vy: number; size: number; color: string }[];
  clouds: { x: number; y: number; w: number; speed: number }[];
  leaves: { x: number; y: number; vx: number; vy: number; rot: number; size: number }[];
  debris: { x: number; y: number; vx: number; vy: number; size: number; color: string }[];
  hatOffset: { x: number; y: number };
  hatRotation: number;
  hatLanded: boolean;
  hatLandPos: { x: number; y: number };
}

function initScene(): SceneState {
  return {
    time: 0,
    particles: [],
    clouds: [
      { x: 10, y: 8, w: 14, speed: 0.3 },
      { x: 50, y: 5, w: 18, speed: 0.2 },
      { x: 70, y: 12, w: 10, speed: 0.25 },
    ],
    leaves: [],
    debris: [],
    hatOffset: { x: 0, y: 0 },
    hatRotation: 0,
    hatLanded: false,
    hatLandPos: { x: 0, y: 0 },
  };
}

// ===================== Background =====================

function drawSky(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createLinearGradient(0, 0, 0, 30 * PS);
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(1, SKY_BOT);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, 30 * PS);
}

function drawClouds(ctx: CanvasRenderingContext2D, clouds: SceneState["clouds"], time: number, level: number) {
  const windSpeed = 0.03 + level * 0.015;
  for (const c of clouds) {
    const cx = ((c.x + time * c.speed * (windSpeed / 0.03)) % (W + c.w)) - c.w;
    px(ctx, cx, c.y, c.w, 3, CLOUD);
    px(ctx, cx + 2, c.y - 1, c.w - 4, 1, CLOUD);
    px(ctx, cx + 3, c.y - 2, c.w - 6, 1, CLOUD);
    px(ctx, cx, c.y + 3, c.w, 1, CLOUD_SHADOW);
  }
}

function drawOcean(ctx: CanvasRenderingContext2D, time: number, level: number) {
  const oy = 27;
  px(ctx, 0, oy, W, 2, OCEAN1);
  px(ctx, 0, oy + 2, W, 2, OCEAN2);
  px(ctx, 0, oy + 4, W, 2, OCEAN3);

  // More wave activity at higher wind
  const waveAmp = 0.5 + level * 0.05;
  for (let x = 0; x < W; x++) {
    const wave = Math.sin((x + time * (0.5 + level * 0.05)) * 0.5) * waveAmp + 0.5;
    if (wave > 0.7) px(ctx, x, oy - 1, 1, 1, "#D0E8F8");
    if (wave > 0.9 && level > 5) px(ctx, x, oy - 2, 1, 1, "#E0F0FF");
  }

  // Whitecaps at high wind
  if (level > 6) {
    for (let x = 0; x < W; x += 3) {
      if (Math.sin(x * 0.5 + time * 0.1) > 0.85) {
        px(ctx, x, oy + 2, 2, 1, "#FFFFFF");
      }
    }
  }
}

function drawBeach(ctx: CanvasRenderingContext2D) {
  const by = 33;
  for (let y = 0; y < H - by; y++) {
    const t = y / (H - by);
    ctx.fillStyle = `rgb(${Math.round(237 - t * 20)},${Math.round(203 - t * 20)},${Math.round(160 - t * 15)})`;
    ctx.fillRect(0, (by + y) * PS, CANVAS_W, PS);
  }
  for (let i = 0; i < 25; i++) {
    const sx = (i * 17 + 5) % W;
    const sy = by + 2 + ((i * 13 + 7) % (H - by - 4));
    px(ctx, sx, sy, 1, 1, i % 3 === 0 ? SAND2 : SAND3);
  }
}

// ===================== Palm Trees =====================

function drawPalmTree(
  ctx: CanvasRenderingContext2D,
  x: number, baseY: number,
  bend: number, broken: boolean,
  level: number
) {
  const trunkH = 14;
  const bendShift = Math.round(bend * 6);

  if (broken) {
    // Broken trunk - snapped in half
    px(ctx, x - 1, baseY - 3, 2, 3, TRUNK);
    px(ctx, x - 2, baseY - 6, 3, 3, TRUNK_DARK);
    px(ctx, x - 1, baseY - 8, 2, 2, TRUNK);
    // Broken top
    px(ctx, x - 1, baseY - 10, 1, 2, TRUNK_DARK);
    px(ctx, x + bendShift - 2, baseY - 14, 2, 4, TRUNK);
    // Fallen leaves
    px(ctx, x + bendShift, baseY - 13, 3, 1, LEAF_DARK);
    px(ctx, x + bendShift + 1, baseY - 12, 2, 1, LEAF);
    px(ctx, x + bendShift - 1, baseY - 14, 2, 1, LEAF_LIGHT);
    return;
  }

  // Trunk (curved)
  for (let i = 0; i < trunkH; i++) {
    const t = i / trunkH;
    const tx = x + Math.round(bendShift * t * t);
    const ty = baseY - i;
    const color = i % 2 === 0 ? TRUNK : TRUNK_DARK;
    // Trunk gets narrower at top
    const w = i < 3 ? 3 : i < 10 ? 2 : 1;
    px(ctx, tx - 1, ty, w, 1, color);
  }

  // Leaves (fronds)
  if (level < 14) {
    const lx = x + bendShift - 1;
    const ly = baseY - trunkH;

    // Fronds spreading out
    px(ctx, lx - 3, ly + 1, 2, 1, LEAF_DARK);
    px(ctx, lx - 2, ly, 2, 1, LEAF);
    px(ctx, lx + 1, ly + (bendShift >= 2 ? 1 : 0), 3, 1, LEAF);
    px(ctx, lx + 2, ly - 1, 3, 1, LEAF_LIGHT);
    px(ctx, lx + 1, ly + 1, 2, 1, LEAF_DARK);
    px(ctx, lx, ly - 2, 3, 1, LEAF_LIGHT);
    px(ctx, lx - 1, ly - 1, 2, 1, LEAF);

    // Coconuts
    px(ctx, lx, ly + 2, 2, 1, "#8B4513");
    px(ctx, lx + 1, ly + 2, 1, 1, "#6B3410");
  } else {
    // Leaves flying off at extreme wind
    const lx = x + bendShift - 1;
    const ly = baseY - trunkH;
    px(ctx, lx - 1, ly, 2, 1, LEAF_DARK);
    px(ctx, lx, ly - 1, 2, 1, LEAF);
  }
}

// ===================== Character Drawing =====================

function drawCharacter(ctx: CanvasRenderingContext2D, cs: CharState, time: number) {
  const cx = Math.round(W / 2) + Math.round(cs.slide);
  const cy = 42;

  if (cs.blownAway) {
    // Character blown off screen - draw a tiny speck flying away
    const tx = Math.round(W / 2) + 20 + Math.round(time * 0.3) % 30;
    const ty = 20 - Math.round(time * 0.2) % 15;
    px(ctx, tx, ty, 1, 2, SKIN);
    px(ctx, tx, ty - 1, 1, 1, SHIRT);
    return;
  }

  if (cs.floating) {
    // Character floating - shift up
    const floatY = Math.round(Math.sin(time * 0.1) * 3);
    const fcy = cy - 10 + floatY;
    drawCharacterBody(ctx, cx, fcy, cs, time);
    return;
  }

  drawCharacterBody(ctx, cx, cy, cs, time);
}

function drawCharacterBody(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  cs: CharState, time: number
) {
  const { tilt, slide, crouch, armRaise, hatAttached } = cs;
  const tiltOff = Math.round(tilt * 0.3);
  const crouchOff = Math.round(crouch * 3);

  // === POSE: If crouching, legs are more spread ===
  const legSpread = crouch > 0 ? 2 : 0;

  // === LEGS ===
  const legTop = cy - 8 + crouchOff;
  // Left leg
  px(ctx, cx - 3 + tiltOff - legSpread, legTop, 2, 5, PANTS);
  px(ctx, cx - 3 + tiltOff - legSpread, legTop + 5, 2, 2, PANTS_DARK);
  px(ctx, cx - 3 + tiltOff - legSpread, legTop + 6, 3, 1, SHOES);
  px(ctx, cx - 3 + tiltOff - legSpread, legTop + 7, 2, 1, SHOES_DARK);

  // Right leg
  px(ctx, cx + 1 + legSpread, legTop, 2, 5, PANTS);
  px(ctx, cx + 1 + legSpread, legTop + 5, 2, 2, PANTS_DARK);
  px(ctx, cx + legSpread, legTop + 6, 3, 1, SHOES);
  px(ctx, cx + 1 + legSpread, legTop + 7, 2, 1, SHOES_DARK);

  // === BODY ===
  const bodyTop = cy - 16 + crouchOff;
  px(ctx, cx - 4 + tiltOff, bodyTop, 8, 5, SHIRT);
  px(ctx, cx - 4 + tiltOff, bodyTop + 5, 8, 3, SHIRT_DARK);
  px(ctx, cx - 1 + tiltOff, bodyTop, 2, 1, SHIRT_DARK);

  // === ARMS ===
  const armShoulder = bodyTop + 1;
  const armRaiseOff = Math.round(armRaise * 2);

  // Left arm (holding umbrella)
  px(ctx, cx - 5 + tiltOff - armRaiseOff, armShoulder + armRaiseOff, 1, 3, SKIN);
  px(ctx, cx - 6 + tiltOff - armRaiseOff, armShoulder + armRaiseOff, 1, 2, SKIN);
  px(ctx, cx - 7 + tiltOff - armRaiseOff, armShoulder + 1 + armRaiseOff, 1, 2, SKIN);

  // Right arm (flailing)
  const rSwing = Math.round(Math.sin(time * 0.08) * (1.2 + cs.tilt * 0.05));
  px(ctx, cx + 4 + tiltOff, armShoulder + rSwing, 1, 3, SKIN);
  px(ctx, cx + 5 + tiltOff, armShoulder + 1 + rSwing, 1, 2, SKIN);
  if (Math.abs(rSwing) > 0) {
    px(ctx, cx + 6 + tiltOff, armShoulder + 1 + rSwing, 1, 1, SKIN);
  }

  // === HEAD ===
  const headTop = bodyTop - 8;
  px(ctx, cx - 1 + tiltOff, bodyTop - 1, 2, 1, SKIN_SHADOW);

  px(ctx, cx - 3 + tiltOff, headTop, 6, 1, SKIN);
  px(ctx, cx - 4 + tiltOff, headTop + 1, 8, 5, SKIN);
  px(ctx, cx - 3 + tiltOff, headTop + 6, 6, 1, SKIN);

  // Hair
  px(ctx, cx - 3 + tiltOff, headTop, 6, 1, HAIR);
  px(ctx, cx - 4 + tiltOff, headTop + 1, 2, 2, HAIR);
  px(ctx, cx + 2 + tiltOff, headTop + 1, 2, 2, HAIR);
  px(ctx, cx - 4 + tiltOff, headTop + 3, 1, 2, HAIR);
  px(ctx, cx + 3 + tiltOff, headTop + 3, 1, 2, HAIR);

  // Bangs
  px(ctx, cx - 3 + tiltOff, headTop + 1, 1, 1, HAIR_DARK);
  px(ctx, cx - 1 + tiltOff, headTop + 1, 2, 1, HAIR_DARK);
  px(ctx, cx + 2 + tiltOff, headTop + 1, 1, 1, HAIR_DARK);

  // Eyes — bug out EARLY and WIDE at tilt > 4 (was 10)
  if (cs.tilt > 4) {
    // Huge bugged-out eyes 😳
    px(ctx, cx - 3 + tiltOff, headTop + 2, 3, 2, EYE_WHITE);
    px(ctx, cx + 1 + tiltOff, headTop + 2, 3, 2, EYE_WHITE);
    px(ctx, cx - 2 + tiltOff, headTop + 3, 1, 1, EYE);
    px(ctx, cx + 2 + tiltOff, headTop + 3, 1, 1, EYE);
    // Eyebrows up
    px(ctx, cx - 3 + tiltOff, headTop + 1, 2, 1, HAIR_DARK);
    px(ctx, cx + 2 + tiltOff, headTop + 1, 2, 1, HAIR_DARK);
  } else {
    px(ctx, cx - 2 + tiltOff, headTop + 3, 1, 1, EYE);
    px(ctx, cx + 1 + tiltOff, headTop + 3, 1, 1, EYE);
    px(ctx, cx - 1 + tiltOff, headTop + 3, 1, 1, EYE_WHITE);
    px(ctx, cx + 2 + tiltOff, headTop + 3, 1, 1, EYE_WHITE);
  }

  // Mouth — dramatic O at wind 5+, tongue out at 9+
  if (cs.tilt > 10) {
    // Tongue out 😛
    px(ctx, cx - 1 + tiltOff, headTop + 5, 3, 1, "#8B4513");
    px(ctx, cx + tiltOff, headTop + 6, 1, 1, "#FF6B8A");
  } else if (cs.tilt > 6) {
    // Open mouth 😮
    px(ctx, cx - 1 + tiltOff, headTop + 5, 3, 1, "#8B4513");
    px(ctx, cx + tiltOff, headTop + 5, 1, 1, "#FF8E8E");
  } else if (cs.tilt > 3) {
    // Small O
    px(ctx, cx + tiltOff, headTop + 5, 1, 1, "#8B4513");
  }

  // === HAT ===
  if (hatAttached) {
    const hx = cx + tiltOff;
    const hy = headTop - 5;

    px(ctx, hx - 6, hy + 3, 13, 1, HAT_DARK);
    px(ctx, hx - 5, hy + 4, 11, 1, HAT_DARK);
    px(ctx, hx - 5, hy + 2, 11, 1, HAT);
    px(ctx, hx - 3, hy + 1, 7, 1, HAT);
    px(ctx, hx - 2, hy, 5, 1, HAT);
    px(ctx, hx - 1, hy - 1, 3, 1, HAT);
    px(ctx, hx, hy - 2, 1, 1, HAT);
    px(ctx, hx - 3, hy + 1, 7, 1, HAT_BAND);
    px(ctx, hx + 3, hy + 1, 1, 1, HAT_BAND);
    px(ctx, hx + 4, hy, 1, 1, HAT_BAND);
    px(ctx, hx + 4, hy + 2, 1, 1, HAT_BAND);
    px(ctx, hx, hy - 2, 1, 1, "#FFF8DC");
    px(ctx, hx - 4, hy + 2, 1, 1, HAT);
  }
}

// ===================== Umbrella =====================

function drawUmbrella(
  ctx: CanvasRenderingContext2D,
  cs: CharState,
  time: number,
  charCx: number, charCy: number
) {
  const { tilt, slide, armRaise, umbrellaAngle, umbrellaInsideOut, blownAway } = cs;
  const tiltOff = Math.round(tilt * 0.3);
  const crouchOff = Math.round(Math.max(0, cs.crouch) * 3);
  const armRaiseOff = Math.round(armRaise * 2);
  const bodyTop = charCy - 16 + crouchOff;
  const armShoulder = bodyTop + 1;

  if (blownAway) return;

  const ux = charCx - 6 + tiltOff - armRaiseOff;
  const uy = armShoulder + armRaiseOff - 5;
  const windSway = Math.sin(time * 0.05) * 0.2;
  const effectiveAngle = umbrellaAngle + windSway;
  const aShift = Math.round(effectiveAngle * 0.5);
  const umbX = ux + aShift;
  const umbY = uy - 1;

  // Handle
  const poleLen = umbrellaInsideOut ? 8 : 12;
  px(ctx, umbX, umbY - poleLen + 1, 1, poleLen, UMB_POLE);
  if (!umbrellaInsideOut) {
    px(ctx, umbX - 1, umbY, 1, 1, UMB_POLE);
    px(ctx, umbX - 1, umbY + 1, 1, 1, UMB_POLE);
  }

  const canopyTop = umbY - poleLen;
  const ct = effectiveAngle * 0.3;

  if (umbrellaInsideOut) {
    // Torn canopy
    px(ctx, umbX - 5 + Math.round(ct), canopyTop, 11, 1, UMB_B);
    px(ctx, umbX - 6 + Math.round(ct), canopyTop + 1, 13, 1, UMB_A);
    px(ctx, umbX - 5 + Math.round(ct), canopyTop + 2, 11, 1, UMB_B);
    px(ctx, umbX - 4 + Math.round(ct), canopyTop + 3, 9, 1, UMB_A);
    px(ctx, umbX - 7 + Math.round(ct), canopyTop + 1, 1, 2, UMB_DARK);
    px(ctx, umbX + 6 + Math.round(ct), canopyTop + 1, 1, 3, UMB_DARK);
    px(ctx, umbX - 4 + Math.round(ct), canopyTop, 1, 3, UMB_POLE);
    px(ctx, umbX - 2 + Math.round(ct), canopyTop, 1, 4, UMB_POLE);
    px(ctx, umbX + Math.round(ct), canopyTop, 1, 4, UMB_POLE);
    px(ctx, umbX + 2 + Math.round(ct), canopyTop, 1, 3, UMB_POLE);
  } else {
    px(ctx, umbX - 2 + Math.round(ct), canopyTop, 5, 1, UMB_A);
    px(ctx, umbX - 4 + Math.round(ct), canopyTop + 1, 9, 1, UMB_B);
    px(ctx, umbX - 6 + Math.round(ct), canopyTop + 2, 13, 1, UMB_A);
    px(ctx, umbX - 6 + Math.round(ct), canopyTop + 3, 13, 1, UMB_B);
    px(ctx, umbX - 5 + Math.round(ct), canopyTop + 4, 11, 1, UMB_A);

    // Scallops
    px(ctx, umbX - 5 + Math.round(ct), canopyTop + 5, 3, 1, UMB_B);
    px(ctx, umbX - 4 + Math.round(ct), canopyTop + 6, 1, 1, UMB_B);
    px(ctx, umbX - 1 + Math.round(ct), canopyTop + 5, 3, 1, UMB_B);
    px(ctx, umbX + Math.round(ct), canopyTop + 6, 1, 1, UMB_B);
    px(ctx, umbX + 3 + Math.round(ct), canopyTop + 5, 3, 1, UMB_B);
    px(ctx, umbX + 4 + Math.round(ct), canopyTop + 6, 1, 1, UMB_B);

    // Ribs
    px(ctx, umbX - 3 + Math.round(ct), canopyTop + 1, 1, 4, UMB_DARK);
    px(ctx, umbX + Math.round(ct), canopyTop + 1, 1, 4, UMB_DARK);
    px(ctx, umbX + 3 + Math.round(ct), canopyTop + 1, 1, 4, UMB_DARK);

    // Tip
    px(ctx, umbX + Math.round(ct), canopyTop - 1, 1, 1, UMB_TIP);
    px(ctx, umbX - 3 + Math.round(ct), canopyTop + 1, 1, 1, "#FFF");
  }
}

// ===================== Effects =====================

function drawWindLines(ctx: CanvasRenderingContext2D, level: number, time: number) {
  if (level < 1) return;
  const count = Math.min(25, level + 4);
  for (let i = 0; i < count; i++) {
    const offset = (i * 17 + 7) % 60;
    const speed = 0.6 + level * 0.12;
    const lx = ((time * speed + offset * 3) % (W + 30)) - 15;
    const ly = 5 + (i * 4 + offset) % 40;
    const opacity = 0.08 + level * 0.025;
    ctx.fillStyle = `rgba(255,255,255,${Math.min(opacity, 0.55)})`;
    const len = 3 + Math.round(level * 0.7);
    px(ctx, lx, ly, len, 2, ctx.fillStyle as string);
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: SceneState["particles"]) {
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x * PS), Math.round(p.y * PS), p.size * PS, p.size * PS);
  }
}

function drawDebris(ctx: CanvasRenderingContext2D, debris: SceneState["debris"]) {
  for (const d of debris) {
    ctx.fillStyle = d.color;
    ctx.fillRect(Math.round(d.x * PS), Math.round(d.y * PS), d.size * PS, d.size * PS);
  }
}

// ===================== Main Component =====================

export default function PixelScene({ windLevel: level }: PixelSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SceneState>(initScene());
  const animRef = useRef<number>(0);
  const charStateRef = useRef<CharState>(levelToState(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = stateRef.current;
    let lastLevel = 0;

    function loop() {
      if (!ctx) return;
      state.time += 1;

      // Smooth level transition
      const targetLevel = level;
      const currentLevel = lastLevel + (targetLevel - lastLevel) * 0.08;
      lastLevel = currentLevel;
      const intLevel = Math.round(currentLevel);

      charStateRef.current = levelToState(intLevel);
      const cs = charStateRef.current;

      // === Update effects ===
      const windSpeed = 0.3 + intLevel * 0.25;

      // Sand particles — more, faster
      if (intLevel > 0 && state.time % Math.max(1, 3 - Math.floor(intLevel / 4)) === 0) {
        const pCount = Math.min(10, Math.floor(intLevel / 2) + 1);
        for (let i = 0; i < pCount; i++) {
          const colors = ["#EDCBA0", "#E0C090", "#D4B080", "#F5E6A3"];
          state.particles.push({
            x: -1 - Math.random() * 3,
            y: 35 + Math.random() * 30,
            vx: 0.4 + Math.random() * windSpeed * 0.2,
            vy: -0.15 - Math.random() * 0.4 * (1 + intLevel * 0.06),
            size: 1 + Math.round(Math.random() * 2),
            color: colors[Math.floor(Math.random() * colors.length)],
          });
        }
      }

      // Debris — starts earlier (level 7 instead of 11)
      if (intLevel >= 7 && state.time % 3 === 0) {
        const debrisColors = ["#4A8C3F", "#8B6914", "#A08050", "#666"];
        state.debris.push({
          x: -2,
          y: 10 + Math.random() * 50,
          vx: 0.8 + Math.random() * windSpeed * 0.25,
          vy: -0.5 + Math.random() * 1.2,
          size: 1 + Math.round(Math.random() * 3),
          color: debrisColors[Math.floor(Math.random() * debrisColors.length)],
        });
      }

      // Hat flying — more dramatic!
      if (intLevel >= 4 && !cs.hatAttached && !state.hatLanded) {
        state.hatOffset.x += 0.5 + intLevel * 0.08;
        state.hatOffset.y -= 0.3 + Math.sin(state.time * 0.15) * 0.5;
        state.hatRotation += 0.06;
        if (state.hatOffset.x > 35) {
          state.hatLanded = true;
          state.hatLandPos = {
            x: Math.round(W / 2) + Math.round(state.hatOffset.x),
            y: 58 + Math.round(state.hatOffset.y),
          };
        }
      }

      // Reset hat if coming back to low wind
      if (intLevel < 4) {
        state.hatOffset = { x: 0, y: 0 };
        state.hatRotation = 0;
        state.hatLanded = false;
        state.hatLandPos = { x: 0, y: 0 };
      }

      // Update particles
      state.particles = state.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        return p.x < W + 2 && p.y < H && p.y > -5;
      });

      // Limit particles
      if (state.particles.length > 100) state.particles.splice(0, 30);

      // Update debris
      state.debris = state.debris.filter((d) => {
        d.x += d.vx;
        d.y += d.vy;
        return d.x < W + 2 && d.y < H + 5;
      });
      if (state.debris.length > 50) state.debris.splice(0, 20);

      // Update clouds — faster!
      const cloudSpeed = 0.05 + intLevel * 0.025;
      for (const c of state.clouds) {
        c.x += cloudSpeed;
        if (c.x > W + 5) c.x = -c.w - 5;
      }

      // === DRAW ===
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Scene shake offset — more dramatic!
      const shakeIntensity = cs.sceneShake > 0 ? 2 + cs.sceneShake * 5 : 0;
      const shakeX = shakeIntensity > 0 ? Math.round(Math.sin(state.time * 0.5) * shakeIntensity) : 0;
      const shakeY = shakeIntensity > 0 ? Math.round(Math.cos(state.time * 0.35) * shakeIntensity * 0.7) : 0;

      ctx.save();
      ctx.translate(shakeX, shakeY);

      drawSky(ctx);
      drawClouds(ctx, state.clouds, state.time, intLevel);

      // Storm overlay — stronger, starts earlier
      if (intLevel >= 8) {
        const stormAlpha = Math.min(0.5, (intLevel - 7) * 0.06);
        ctx.fillStyle = `rgba(50,50,60,${stormAlpha})`;
        ctx.fillRect(0, 0, CANVAS_W, 35 * PS);
      }

      drawWindLines(ctx, intLevel, state.time);
      drawOcean(ctx, state.time, intLevel);
      drawBeach(ctx);

      // Palm trees
      drawPalmTree(ctx, 12, 58, cs.palmBend, cs.palmBroken, intLevel);
      drawPalmTree(ctx, 85, 56, cs.palmBend * 0.8, cs.palmBroken, intLevel);

      drawDebris(ctx, state.debris);
      drawParticles(ctx, state.particles);

      // Character
      const charCx = Math.round(W / 2) + Math.round(cs.slide);
      const charCy = 42;
      drawCharacter(ctx, cs, state.time);

      // Umbrella (connects to character hand)
      drawUmbrella(ctx, cs, state.time, charCx, charCy);

      // Flying hat
      if (intLevel >= 4 && !cs.hatAttached) {
        const baseX = Math.round(W / 2);
        const baseY = 34 - 5;
        if (state.hatLanded) {
          const hx = state.hatLandPos.x;
          const hy = state.hatLandPos.y;
          px(ctx, hx + 3, hy, 1, 1, HAT);
          px(ctx, hx - 6, hy, 13, 1, HAT_DARK);
          px(ctx, hx - 5, hy + 1, 11, 1, HAT_DARK);
          if (hy > 55) {
            px(ctx, hx - 3, hy - 1, 3, 1, HAT);
            px(ctx, hx + 1, hy - 1, 3, 1, HAT);
          }
        } else {
          const hx2 = baseX + state.hatOffset.x;
          const hy2 = baseY + state.hatOffset.y;
          px(ctx, hx2 - 5 + Math.round(Math.sin(state.hatRotation) * 3), hy2 + 3, 11, 1, HAT_DARK);
          px(ctx, hx2 - 4 + Math.round(Math.sin(state.hatRotation) * 2), hy2 + 2, 9, 1, HAT);
          px(ctx, hx2 - 3, hy2 + 1, 7, 1, HAT);
          px(ctx, hx2 - 2, hy2, 5, 1, HAT);
          px(ctx, hx2 - 1, hy2 - 1, 3, 1, HAT);
          px(ctx, hx2 - 3, hy2 + 2, 7, 1, HAT_BAND);
        }
      }

      ctx.restore();

      animRef.current = requestAnimationFrame(loop);
    }

    loop();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      stateRef.current = initScene();
      lastLevel = 0;
    };
  }, [level]);

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ imageRendering: "pixelated" }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="w-full h-auto"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
