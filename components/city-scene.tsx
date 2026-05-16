"use client";

import { useRef, useEffect } from "react";
import { PS, W, H, CANVAS_W, CANVAS_H, px } from "@/lib/pixel-utils";

// ===================== City Colors =====================

const SKY_TOP = "#8FADB8";
const SKY_BOT = "#C8C0B0";
const CLOUD_CITY = "#E0E0E0";
const CLOUD_SHADOW_CITY = "#C8C8C8";

const BLDG_FAR = "#4A5A6A";
const BLDG_FAR_LIGHT = "#5A6A7A";

const BLDG_A = "#6B7B8D";
const BLDG_B = "#7A8A9A";
const BLDG_C = "#5A6A7A";
const BLDG_WIN_LIT = "#FFE88A";
const BLDG_WIN_DIM = "#C8B060";
const BLDG_WIN_OFF = "#9098A4";
const BLDG_WIN_BROKEN = "#3A4050";

const WALL = "#D4C090";
const WALL_DARK = "#B8A878";
const ROOF = "#C06040";
const ROOF_DARK = "#A04030";
const DOOR = "#6B4513";

const TRUNK = "#8B7355";
const TRUNK_DARK = "#6B5335";
const LEAF = "#6AAF5F";
const LEAF_DARK = "#4A8C3F";
const LEAF_LIGHT = "#8BC87A";

const SIDEWALK = "#C8C0B8";
const STREET = "#808890";
const STREET_LINE = "#707880";

const SKIN = "#FFE0BD";
const SKIN_SHADOW = "#F0C8A0";
const HAIR = "#5C3A21";
const HAIR_DARK = "#3D2515";
const EYE = "#2D1B0E";
const EYE_WHITE = "#FFFFFF";

const P1_SHIRT = "#6BB5D4";
const P1_PANTS = "#4A5A6A";
const P2_SHIRT = "#D4A06B";
const P2_PANTS = "#3A5A3A";
const P3_SHIRT = "#C06090";
const P3_PANTS = "#5A4A6A";

const DEBRIS_COLORS = ["#C06040", "#A08050", "#808890", "#8B7355"];

// ===================== Wind State =====================

interface CityCharState {
  treeSway: number;
  windowBreakage: number;
  buildingDamage: number;
  houseCollapsed: boolean;
  peopleTilt: number;
  peopleHolding: boolean;
  peopleBlownAway: boolean;
  debrisIntensity: number;
  sceneShake: number;
  skyDarkness: number;
}

function levelToCityState(level: number): CityCharState {
  const l = Math.max(0, Math.min(17, level));
  // Dramatic exaggerated reactions like beach scene
  return {
    treeSway: l <= 1 ? 0 : Math.min(1, (l - 1) * 0.1),
    windowBreakage: l <= 4 ? 0 : Math.min(1, (l - 4) * 0.1),
    buildingDamage: l <= 9 ? 0 : Math.min(1, (l - 9) * 0.15),
    houseCollapsed: l >= 11,
    peopleTilt: l <= 1 ? 0 : Math.min(25, (l - 1) * 2.5),
    peopleHolding: l >= 5,
    peopleBlownAway: l >= 10,
    debrisIntensity: l <= 2 ? 0 : Math.min(1, (l - 2) * 0.1),
    sceneShake: l >= 9 ? Math.min(1, (l - 8) * 0.15) : 0,
    skyDarkness: l >= 7 ? Math.min(0.45, (l - 6) * 0.06) : 0,
  };
}

// ===================== Scene State =====================

interface SceneState {
  time: number;
  clouds: { x: number; y: number; w: number; speed: number }[];
  particles: { x: number; y: number; vx: number; vy: number; size: number; color: string }[];
  debris: { x: number; y: number; vx: number; vy: number; size: number; color: string }[];
}

function initScene(): SceneState {
  return {
    time: 0,
    clouds: [
      { x: 5, y: 4, w: 16, speed: 0.25 },
      { x: 40, y: 2, w: 20, speed: 0.2 },
      { x: 70, y: 6, w: 14, speed: 0.22 },
    ],
    particles: [],
    debris: [],
  };
}

// ===================== Drawing Functions =====================

function drawSky(ctx: CanvasRenderingContext2D, darkness: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, 28 * PS);
  const r1 = Math.round(143 - darkness * 60);
  const g1 = Math.round(173 - darkness * 60);
  const b1 = Math.round(184 - darkness * 60);
  grad.addColorStop(0, `rgb(${r1},${g1},${b1})`);
  grad.addColorStop(1, SKY_BOT);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, 28 * PS);
}

function drawClouds(ctx: CanvasRenderingContext2D, clouds: SceneState["clouds"], time: number, level: number) {
  const windSpeed = 0.03 + level * 0.015;
  for (const c of clouds) {
    const cx = ((c.x + time * c.speed * (windSpeed / 0.03)) % (W + c.w)) - c.w;
    const gray = level > 8 ? Math.round(140 - (level - 8) * 10) : 224;
    const cloudColor = `rgb(${gray},${gray},${gray})`;
    const shadowColor = `rgb(${Math.max(gray - 20, 100)})`;
    px(ctx, cx, c.y, c.w, 3, cloudColor);
    px(ctx, cx + 2, c.y - 1, c.w - 4, 1, cloudColor);
    px(ctx, cx + 3, c.y - 2, c.w - 6, 1, cloudColor);
    px(ctx, cx, c.y + 3, c.w, 1, shadowColor);
  }
}

function drawWindLines(ctx: CanvasRenderingContext2D, level: number, time: number) {
  if (level < 2) return;
  const count = Math.min(12, level + 1);
  for (let i = 0; i < count; i++) {
    const offset = (i * 19 + 3) % 50;
    const lx = ((time * (0.4 + level * 0.07) + offset * 3) % (W + 20)) - 10;
    const ly = 3 + (i * 7) % 30;
    const opacity = 0.04 + level * 0.012;
    ctx.fillStyle = `rgba(255,255,255,${Math.min(opacity, 0.35)})`;
    const len = 2 + Math.round(level * 0.4);
    px(ctx, lx, ly, len, 1, ctx.fillStyle as string);
  }
}

// ===================== Buildings =====================

function drawFarBuildings(ctx: CanvasRenderingContext2D) {
  const bldgs = [
    { x: 3, w: 10, h: 18 },
    { x: 15, w: 8, h: 14 },
    { x: 30, w: 12, h: 20 },
    { x: 50, w: 9, h: 16 },
    { x: 65, w: 14, h: 22 },
    { x: 82, w: 10, h: 15 },
  ];
  for (const b of bldgs) {
    const by = 28 - b.h;
    px(ctx, b.x, by, b.w, b.h, BLDG_FAR);
    px(ctx, b.x, by, b.w, 2, BLDG_FAR_LIGHT);
  }
}

interface WindowGrid {
  col: number;
  row: number;
  colSpacing: number;
  rowSpacing: number;
  offsetX: number;
  offsetY: number;
  w: number;
  h: number;
}

function drawHighRise(
  ctx: CanvasRenderingContext2D,
  x: number, width: number, height: number,
  color: string, winGrid: WindowGrid,
  windowBreakage: number, buildingDamage: number,
  time: number, seed: number
) {
  const by = 28 - height;
  // Building body
  px(ctx, x, by, width, height, color);
  px(ctx, x, by, width, 1, `${color}CC`);
  // Shadow side
  px(ctx, x + width - 1, by, 1, height, BLDG_C);

  // Damage cracks at high wind
  if (buildingDamage > 0.3) {
    const crackCount = Math.floor(buildingDamage * 6);
    for (let i = 0; i < crackCount; i++) {
      const cx = x + 1 + ((i * 17 + seed * 3) % (width - 2));
      const cy = by + 2 + ((i * 13 + seed * 7) % (height - 4));
      px(ctx, cx, cy, 2, 1, "#666");
      px(ctx, cx + (i % 2), cy + 1, 1, 1, "#555");
    }
  }

  // Windows grid
  const { col, row, colSpacing, rowSpacing, offsetX, offsetY, w, h } = winGrid;
  const totalWindSeed = seed * 7 + 13;
  for (let r = 0; r < row; r++) {
    for (let c = 0; c < col; c++) {
      const wx = x + offsetX + c * colSpacing;
      const wy = by + offsetY + r * rowSpacing;
      const winIdx = r * col + c;
      const breakThreshold = (Math.sin(totalWindSeed + winIdx * 3.7) * 0.5 + 0.5);
      const isBroken = windowBreakage > breakThreshold;

      if (isBroken) {
        px(ctx, wx, wy, w, h, BLDG_WIN_BROKEN);
        if (buildingDamage > 0.2 || (isBroken && windowBreakage > 0.6)) {
          px(ctx, wx, wy, w, 1, "#D0D8E0");
        }
      } else {
        const lit = (Math.sin(seed + wx * 3 + wy * 7) * 0.5 + 0.5) > 0.4;
        px(ctx, wx, wy, w, h, lit ? BLDG_WIN_LIT : BLDG_WIN_OFF);
        px(ctx, wx, wy, w, 1, `${BLDG_WIN_LIT}60`);
      }
    }
  }
}

function drawHighRises(ctx: CanvasRenderingContext2D, wb: number, bd: number, time: number) {
  const buildings = [
    { x: 8, w: 14, h: 22, color: BLDG_A, win: { col: 5, row: 10, colSpacing: 3, rowSpacing: 2, offsetX: 2, offsetY: 2, w: 1, h: 1 }, seed: 0 },
    { x: 35, w: 12, h: 18, color: BLDG_B, win: { col: 4, row: 8, colSpacing: 3, rowSpacing: 2, offsetX: 2, offsetY: 2, w: 1, h: 1 }, seed: 1 },
    { x: 55, w: 16, h: 26, color: BLDG_A, win: { col: 6, row: 12, colSpacing: 3, rowSpacing: 2, offsetX: 2, offsetY: 2, w: 1, h: 1 }, seed: 2 },
    { x: 78, w: 14, h: 20, color: BLDG_C, win: { col: 5, row: 9, colSpacing: 3, rowSpacing: 2, offsetX: 2, offsetY: 2, w: 1, h: 1 }, seed: 3 },
  ];
  for (const b of buildings) {
    drawHighRise(ctx, b.x, b.w, b.h, b.color, b.win, wb, bd, time, b.seed);
  }
}

function drawBungalows(ctx: CanvasRenderingContext2D, level: number, time: number, damage: number, collapsed: boolean) {
  const houses = [
    { x: 22, y: 37, w: 12, h: 8, seed: 5 },
    { x: 66, y: 37, w: 12, h: 8, seed: 7 },
  ];
  for (const h of houses) {
    if (collapsed) {
      // === COLLAPSED HOUSE ===
      // Slumped walls
      const slump = Math.round(Math.sin(time * 0.05 + h.seed) * 1.5);
      px(ctx, h.x - 1 + slump, h.y + 1, h.w + 1, 2, WALL_DARK);
      px(ctx, h.x + 1 + slump, h.y + 3, h.w - 1, 2, "#A09070");
      px(ctx, h.x + 1 + slump, h.y + 5, h.w - 2, 2, WALL_DARK);
      // Fallen roof (tilted)
      const rf = h.y - 3 + slump;
      px(ctx, h.x - 1 + slump, rf, h.w + 2, 1, ROOF_DARK);
      px(ctx, h.x + slump, rf + 1, h.w, 1, ROOF);
      // Door leaning
      px(ctx, h.x + 3 + slump, h.y + 2, 2, 4, DOOR);
      // Debris around
      px(ctx, h.x + h.w + 1, h.y + 3, 2, 1, ROOF_DARK);
      px(ctx, h.x - 2, h.y + 2, 1, 1, ROOF);
      px(ctx, h.x + slump, h.y + 7, 2, 1, WALL);
      // Flying particles
      if (Math.sin(time * 0.1 + h.seed) > 0.5) {
        px(ctx, h.x - 3 + Math.round(Math.sin(time * 0.15) * 4), h.y - 2, 1, 1, ROOF_DARK);
      }
      continue;
    }

    const roofH = 4;
    // Walls
    px(ctx, h.x, h.y, h.w, h.h, WALL);
    px(ctx, h.x, h.y, h.w, 1, WALL_DARK);

    // Damage patches
    if (damage > 0.3) {
      const patchCount = Math.floor(damage * 3);
      for (let i = 0; i < patchCount; i++) {
        const px2 = h.x + 2 + ((i * 11 + h.seed) % (h.w - 4));
        const py = h.y + 2 + ((i * 7 + h.seed * 3) % (h.h - 3));
        px(ctx, px2, py, 2, 1, WALL_DARK);
      }
    }

    // Roof (triangle)
    const rh = h.y - roofH;
    px(ctx, h.x - 1, rh, h.w + 2, 1, ROOF_DARK);
    px(ctx, h.x, rh + 1, h.w, 1, ROOF);
    px(ctx, h.x + 1, rh + 2, h.w - 2, 1, ROOF);
    px(ctx, h.x + 2, rh + 3, h.w - 4, 1, ROOF_DARK);

    // Roof tiles flying off at high wind
    if (level >= 7 && Math.sin(time * 0.1 + h.seed) > 0.7) {
      const tileX = h.x + 2 + Math.round(Math.sin(time * 0.15 + h.seed) * 5);
      px(ctx, tileX, h.y - 1, 1, 1, ROOF_DARK);
    }

    // Door
    const dx = h.x + Math.floor(h.w / 2) - 1;
    px(ctx, dx, h.y + h.h - 4, 2, 4, DOOR);
    px(ctx, dx + 1, h.y + h.h - 3, 1, 1, "#FFD700");
    // Window
    px(ctx, h.x + 2, h.y + 2, 2, 2, BLDG_WIN_LIT);
    px(ctx, h.x + h.w - 4, h.y + 2, 2, 2, BLDG_WIN_LIT);
    // Window cross
    px(ctx, h.x + 3, h.y + 2, 1, 2, WALL_DARK);
    px(ctx, h.x + 2, h.y + 3, 2, 1, WALL_DARK);
    px(ctx, h.x + h.w - 3, h.y + 2, 1, 2, WALL_DARK);
    px(ctx, h.x + h.w - 4, h.y + 3, 2, 1, WALL_DARK);
  }
}

// ===================== Trees =====================

function drawTrees(ctx: CanvasRenderingContext2D, sway: number, broken: boolean, level: number, time: number) {
  const trees = [
    { x: 18, y: 44, seed: 10 },
    { x: 50, y: 44, seed: 20 },
    { x: 72, y: 44, seed: 30 },
  ];
  for (const t of trees) {
    const trunkH = 6;
    const swayPx = Math.round(sway * 5 * Math.sin(time * 0.03 + t.seed));

    if (broken && level >= 11) {
      // Broken trunk
      px(ctx, t.x - 1 + swayPx, t.y - trunkH, 2, trunkH - 2, TRUNK_DARK);
      // Fallen canopy on ground
      px(ctx, t.x - 4 + swayPx, t.y + 1, 6, 2, LEAF_DARK);
      px(ctx, t.x - 3 + swayPx, t.y, 4, 1, LEAF);
      continue;
    }

    // Trunk
    for (let i = 0; i < trunkH; i++) {
      const color = i % 2 === 0 ? TRUNK : TRUNK_DARK;
      px(ctx, t.x - 1 + swayPx, t.y - i, 2, 1, color);
    }

    // Canopy (round)
    const cy = t.y - trunkH - 2;
    const canopySway = Math.round(sway * 4 * Math.sin(time * 0.04 + t.seed * 1.3));

    // Leaves flying off at extreme wind
    if (level >= 9 && Math.sin(time * 0.1 + t.seed * 2) > 0.8) {
      const lx = t.x + canopySway + Math.round(Math.sin(time * 0.2) * 3);
      const ly = cy + Math.round(Math.cos(time * 0.15) * 2);
      px(ctx, lx, ly, 1, 1, LEAF_LIGHT);
    }

    // Canopy layers
    px(ctx, t.x - 3 + canopySway, cy, 6, 1, LEAF_DARK);
    px(ctx, t.x - 4 + canopySway, cy + 1, 8, 2, LEAF);
    px(ctx, t.x - 3 + canopySway, cy + 3, 6, 1, LEAF_LIGHT);
    px(ctx, t.x - 2 + canopySway, cy + 4, 4, 1, LEAF);
    // Highlight
    px(ctx, t.x - 2 + canopySway, cy + 1, 3, 1, LEAF_LIGHT);
  }
}

// ===================== People =====================

interface PersonDef {
  x: number;
  dir: number; // -1 left, 1 right
  shirt: string;
  pants: string;
  seed: number;
}

function drawPerson(
  ctx: CanvasRenderingContext2D,
  p: PersonDef,
  tilt: number,
  blownAway: boolean,
  holding: boolean,
  time: number,
  baseY: number
) {
  if (blownAway) {
    // Flew away - big speck for visibility
    const fx = ((p.x + 30 + Math.round((time * 0.3 + p.seed) % 50)) % W);
    const fy = (baseY - 10 - Math.round((time * 0.15) % 25));
    px(ctx, fx, fy, 2, 2, p.shirt);
    px(ctx, fx, fy - 1, 1, 1, SKIN);
    return;
  }

  const px2 = p.x + Math.round(tilt * p.dir * 0.3);
  const walkCycle = Math.sin(time * 0.06 + p.seed * 2) * 1.5;

  if (tilt > 8 || holding) {
    // Struggling pose - leaning hard, holding hat
    // Legs spread
    px(ctx, px2 - 3, baseY - 5, 2, 5, p.pants);
    px(ctx, px2 + 2, baseY - 4, 2, 4, p.pants);
    // Shoes
    px(ctx, px2 - 3, baseY + 1, 3, 1, "#333");
    px(ctx, px2 + 1, baseY + 1, 3, 1, "#333");
    // Body
    px(ctx, px2 - 3, baseY - 12, 7, 7, p.shirt);
    px(ctx, px2 - 3, baseY - 12, 7, 1, "#FFF" + "30");
    // Arms up - struggling!
    px(ctx, px2 - 4, baseY - 13, 1, 4, SKIN_SHADOW);
    px(ctx, px2 + 4, baseY - 13, 1, 4, SKIN_SHADOW);
    // Hat flying off
    if (holding && tilt > 5) {
      const hatX = px2 + Math.round(Math.sin(time * 0.2 + p.seed) * 4);
      const hatY = baseY - 16 - Math.round(Math.cos(time * 0.15 + p.seed) * 2);
      px(ctx, hatX, hatY, 4, 1, "#D4C090");
      px(ctx, hatX + 1, hatY - 1, 2, 1, "#C0B080");
    }
    // Head
    px(ctx, px2 - 2, baseY - 16, 5, 4, SKIN);
    // Hair blowing
    px(ctx, px2 - 2, baseY - 17, 5, 1, HAIR);
    px(ctx, px2 + 3, baseY - 16, 1, 1, HAIR);
    // Big scared eyes
    px(ctx, px2 - 1, baseY - 14, 2, 2, EYE_WHITE);
    px(ctx, px2 + 2, baseY - 14, 2, 2, EYE_WHITE);
    px(ctx, px2, baseY - 13, 1, 1, EYE);
    px(ctx, px2 + 3, baseY - 13, 1, 1, EYE);
    // Open mouth
    if (tilt > 12) {
      px(ctx, px2 + 1, baseY - 11, 2, 1, "#8B4513");
    }
  } else {
    // Walking pose - more visible
    const legOff = Math.round(walkCycle);
    // Legs
    px(ctx, px2 - 2, baseY - 5 + Math.max(0, legOff), 2, 5 - Math.max(0, legOff), p.pants);
    px(ctx, px2 + 1, baseY - 5 - Math.min(0, legOff), 2, 5 + Math.min(0, legOff), p.pants);
    // Shoes
    px(ctx, px2 - 2, baseY + 1 + Math.max(0, legOff), 3, 1, "#333");
    px(ctx, px2, baseY + 1 - Math.min(0, legOff), 3, 1, "#333");
    // Body
    px(ctx, px2 - 2, baseY - 11, 5, 6, p.shirt);
    px(ctx, px2 - 2, baseY - 11, 5, 1, "#FFF" + "30");
    // Arms (swinging)
    const armSwing = Math.round(Math.sin(time * 0.06 + p.seed * 2) * 1.5);
    if (Math.abs(armSwing) > 0) {
      px(ctx, px2 + 3 + (armSwing > 0 ? 0 : -4), baseY - 10 + Math.abs(armSwing), 1, 2, SKIN);
    }
    // Head
    px(ctx, px2 - 2, baseY - 15, 5, 4, SKIN);
    px(ctx, px2, baseY - 15, 3, 1, HAIR);
    px(ctx, px2, baseY - 13, 1, 1, EYE);
    px(ctx, px2 + 2, baseY - 13, 1, 1, EYE);
    px(ctx, px2, baseY - 12, 1, 1, SKIN_SHADOW);
    // Hat
    px(ctx, px2 - 2, baseY - 17, 6, 1, "#D4C090");
    px(ctx, px2 - 1, baseY - 18, 4, 1, "#C0B080");
  }
}

function drawPeople(ctx: CanvasRenderingContext2D, cs: CityCharState, time: number) {
  const baseY = 42;
  const people: PersonDef[] = [
    { x: 27, dir: 1, shirt: "#FF6B6B", pants: "#4A5A6A", seed: 0 },
    { x: 42, dir: -1, shirt: "#6BB5D4", pants: "#D4A06B", seed: 100 },
    { x: 58, dir: 1, shirt: "#FFD700", pants: "#3A5A3A", seed: 200 },
  ];
  for (const p of people) {
    drawPerson(ctx, p, cs.peopleTilt, cs.peopleBlownAway, cs.peopleHolding, time, baseY);
  }
}

// ===================== Ground =====================

function drawGround(ctx: CanvasRenderingContext2D) {
  const groundY = 46;
  // Sidewalk - lighter for contrast with people
  px(ctx, 0, groundY, W, 2, "#E8E0D8");
  px(ctx, 0, groundY + 2, W, 1, "#D8D0C8");
  // Street
  px(ctx, 0, groundY + 3, W, 4, STREET);
  // Curb
  px(ctx, 0, groundY + 7, W, 1, STREET_LINE);
  // Road center line (dashed)
  for (let x = 0; x < W; x += 8) {
    px(ctx, x, groundY + 5, 4, 1, "#C8C0B8");
  }
  // Lower ground
  px(ctx, 0, groundY + 8, W, H - groundY - 8, "#707880");
}

// ===================== Street Lamp =====================

function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x, y - 8, 1, 8, "#666");
  px(ctx, x - 1, y - 9, 3, 1, "#555");
  px(ctx, x - 2, y - 10, 5, 1, "#FFE88A");
  px(ctx, x, y - 11, 1, 1, "#FFD700");
}

// ===================== Main Component =====================

export default function CityScene({ windLevel: level }: { windLevel: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SceneState>(initScene());
  const animRef = useRef<number>(0);

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
      const cs = levelToCityState(intLevel);

      // === Update particles ===
      const windSpeed = 0.3 + intLevel * 0.2;

      // Paper/trash particles
      if (intLevel > 2 && state.time % Math.max(2, 6 - Math.floor(intLevel / 3)) === 0) {
        const pCount = Math.min(5, Math.floor(intLevel / 4) + 1);
        for (let i = 0; i < pCount; i++) {
          state.particles.push({
            x: -2,
            y: 10 + Math.random() * 50,
            vx: 0.2 + Math.random() * windSpeed * 0.15,
            vy: -0.1 - Math.random() * 0.2,
            size: 1 + Math.round(Math.random()),
            color: DEBRIS_COLORS[Math.floor(Math.random() * DEBRIS_COLORS.length)],
          });
        }
      }

      // Debris at high wind
      if (intLevel >= 7 && state.time % 5 === 0) {
        state.debris.push({
          x: -3,
          y: 15 + Math.random() * 35,
          vx: 0.6 + Math.random() * windSpeed * 0.2,
          vy: -0.3 + Math.random() * 0.8,
          size: 1 + Math.round(Math.random() * 2),
          color: DEBRIS_COLORS[Math.floor(Math.random() * DEBRIS_COLORS.length)],
        });
      }

      // Update particles
      state.particles = state.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        return p.x < W + 2 && p.y < H && p.y > -5;
      });
      if (state.particles.length > 80) state.particles.splice(0, 25);

      // Update debris
      state.debris = state.debris.filter((d) => {
        d.x += d.vx;
        d.y += d.vy;
        return d.x < W + 2 && d.y < H + 5;
      });
      if (state.debris.length > 40) state.debris.splice(0, 15);

      // === DRAW ===
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Scene shake
      const shakeX = cs.sceneShake > 0 ? Math.round(Math.sin(state.time * 0.3) * cs.sceneShake * 3) : 0;
      const shakeY = cs.sceneShake > 0 ? Math.round(Math.cos(state.time * 0.2) * cs.sceneShake * 2) : 0;

      ctx.save();
      ctx.translate(shakeX, shakeY);

      drawSky(ctx, cs.skyDarkness);
      drawClouds(ctx, state.clouds, state.time, intLevel);

      // Storm overlay
      if (cs.skyDarkness > 0) {
        ctx.fillStyle = `rgba(60,60,70,${cs.skyDarkness})`;
        ctx.fillRect(0, 0, CANVAS_W, 50 * PS);
      }

      drawWindLines(ctx, intLevel, state.time);
      drawFarBuildings(ctx);
      drawHighRises(ctx, cs.windowBreakage, cs.buildingDamage, state.time);
      drawBungalows(ctx, intLevel, state.time, cs.buildingDamage, cs.houseCollapsed);

      // Walkway layer
      drawGround(ctx);

      // Trees (on sidewalk)
      drawTrees(ctx, cs.treeSway, cs.peopleBlownAway, intLevel, state.time);

      // Lamp posts
      drawLamp(ctx, 46, 47);
      drawLamp(ctx, 78, 47);

      // People
      drawPeople(ctx, cs, state.time);

      // Debris overlay
      for (const d of state.debris) {
        px(ctx, Math.round(d.x), Math.round(d.y), d.size, d.size, d.color);
      }
      for (const p of state.particles) {
        px(ctx, Math.round(p.x), Math.round(p.y), p.size, p.size, p.color);
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
