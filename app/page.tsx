"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import PixelScene from "@/components/pixel-scene";

// ===================== Wind Scale Data 0-17 =====================

interface WindLevelInfo {
  level: number;
  name: string;
  speedMs: string;
  speedKmh: string;
  sea: string;
  land: string;
  desc: string;
  tip: string;
}

const WIND_SCALE: WindLevelInfo[] = [
  { level: 0, name: "无风", speedMs: "<0.3", speedKmh: "<1", sea: "海面如镜", land: "静烟直上", desc: "风平浪静，帽子稳如泰山", tip: "这基本就是你深吸一口气的状态" },
  { level: 1, name: "软风", speedMs: "0.3-1.5", speedKmh: "1-5", sea: "微波粼粼", land: "烟示风向", desc: "发梢微微飘动，伞还不用撑", tip: "≈ 人慢走的速度" },
  { level: 2, name: "轻风", speedMs: "1.6-3.3", speedKmh: "6-11", sea: "小波", land: "树叶微响", desc: "脸上能感觉到风了，伞开始不安分", tip: "≈ 自行车慢骑" },
  { level: 3, name: "微风", speedMs: "3.4-5.4", speedKmh: "12-19", sea: "小浪", land: "旗展开", desc: "伞明显弯了，发型开始乱", tip: "≈ 散步的速度" },
  { level: 4, name: "和风", speedMs: "5.5-7.9", speedKmh: "20-28", sea: "轻浪", land: "尘土扬起", desc: "人和伞一起歪，帽子开始翻飞", tip: "≈ 慢跑速度" },
  { level: 5, name: "劲风", speedMs: "8.0-10.7", speedKmh: "29-38", sea: "中浪", land: "小树摇摆", desc: "帽子剧烈翻飞！撑伞已经很费劲了", tip: "≈ 自行车正常骑行" },
  { level: 6, name: "强风", speedMs: "10.8-13.8", speedKmh: "39-49", sea: "大浪", land: "电线有声", desc: "🎩 帽子飞了！人被风推着走", tip: "≈ 跑步冲刺的速度" },
  { level: 7, name: "疾风", speedMs: "13.9-17.1", speedKmh: "50-61", sea: "巨浪", land: "步行困难", desc: "伞快撑不住了，人被吹着跑", tip: "≈ 骑电动车" },
  { level: 8, name: "大风", speedMs: "17.2-20.7", speedKmh: "62-74", sea: "狂浪", land: "折毁树枝", desc: "伞骨弯了！蹲下抵抗！", tip: "≈ 城市快速路车速" },
  { level: 9, name: "烈风", speedMs: "20.8-24.4", speedKmh: "75-88", sea: "狂涛", land: "屋顶受损", desc: "伞反了！人要起飞了！！", tip: "≈ 高速公路上车速" },
  { level: 10, name: "狂风", speedMs: "24.5-28.4", speedKmh: "89-102", sea: "怒涛", land: "拔树倒屋", desc: "脚离地了！救命！！！", tip: "≈ 火车速度" },
  { level: 11, name: "暴风", speedMs: "28.5-32.6", speedKmh: "103-117", sea: "异常巨浪", land: "重大损毁", desc: "人在空中飞，伞已经散架了", tip: "≈ 高铁速度" },
  { level: 12, name: "飓风", speedMs: "32.7-36.9", speedKmh: "118-133", sea: "怒涛滔天", land: "毁坏极大", desc: "人没了，没了……", tip: "≈ 台风中心风力" },
  { level: 13, name: "台风", speedMs: "37.0-41.4", speedKmh: "134-149", sea: "海啸级", land: "灾难性破坏", desc: "棕榈树断了！场景在摇晃！", tip: "CMA 定义的台风下限" },
  { level: 14, name: "强台风", speedMs: "41.5-46.1", speedKmh: "150-166", sea: "毁灭级", land: "建筑物损毁", desc: "树断了！沙尘暴！末日来了！", tip: "≈ 高铁时速 300km/h 的一半" },
  { level: 15, name: "强台风", speedMs: "46.2-50.9", speedKmh: "167-183", sea: "毁灭级", land: "严重结构破坏", desc: "棕榈树被连根拔起！世界末日！", tip: "这风能把你吹到隔壁城市" },
  { level: 16, name: "超强台风", speedMs: "51.0-56.0", speedKmh: "184-202", sea: "极恐怖", land: "毁灭一切", desc: "棕榈树都断了！满屏飞 debris！", tip: "≈ F1 赛车的极速" },
  { level: 17, name: "超强台风", speedMs: ">56.1", speedKmh: ">203", sea: "末日的海", land: "末日模式", desc: "像素世界已经毁灭了……", tip: "≈ 磁悬浮列车速度！人类几乎无法站立" },
];

function getWindInfo(level: number): WindLevelInfo {
  return WIND_SCALE[Math.max(0, Math.min(17, Math.round(level)))] || WIND_SCALE[0];
}

// ===================== Blowing Detection =====================

function useBlowingDetection() {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<number[]>([]);
  const [result, setResult] = useState<{ level: number; score: number; peak: number; avg: number; durPct: number; stability: string } | null>(null);

  const audioRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelsRef = useRef<number[]>([]);
  const animRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const profileRef = useRef<number[]>([]);

  const scoreToLevel = (score: number) => Math.min(17, Math.round(score / 100 * 17));

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setResult(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      await ac.resume();
      const analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      const mic = ac.createMediaStreamSource(stream);
      mic.connect(analyser);
      audioRef.current = ac;
      analyserRef.current = analyser;
      levelsRef.current = [];
      profileRef.current = [];
      setIsRecording(true);
      setCurrentLevel(0);
      setProfile([]);

      const bufLen = analyser.frequencyBinCount;
      const data = new Uint8Array(bufLen);

      function check() {
        analyser.getByteFrequencyData(data);
        let total = 0;
        for (let i = 0; i < 10; i++) total += data[i];
        const level = total / 10;
        levelsRef.current.push(level);
        if (profileRef.current.length < 200) {
          profileRef.current.push(Math.min(100, Math.round((level / 255) * 100)));
        }
        if (level > 0) setCurrentLevel(level);
        animRef.current = requestAnimationFrame(check);
      }
      check();
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("麦克风权限被拒绝，请在浏览器设置中允许麦克风访问。");
      } else setError("无法访问麦克风。");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (audioRef.current) audioRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    audioRef.current = null;
    streamRef.current = null;
    analyserRef.current = null;

    const levels = levelsRef.current;
    const avg = levels.length > 0 ? Math.round(levels.reduce((a, b) => a + b, 0) / levels.length / 255 * 100) : 0;
    const peak = levels.length > 0 ? Math.round(Math.max(...levels) / 255 * 100) : 0;
    const prof = profileRef.current;
    const above50 = prof.filter(v => v >= 50).length;
    const durPct = prof.length > 0 ? Math.round(above50 / prof.length * 100) : 0;
    const variance = prof.length > 0 ? prof.reduce((s, v) => s + Math.abs(v - avg), 0) / prof.length : 0;
    let stability = "断续吹气";
    if (prof.length >= 5) {
      if (variance < 15) stability = "稳定持久 🎯";
      else if (variance < 25) stability = "中等稳定 ⚖️";
      else stability = "波动较大 🌊";
    }

    const finalLevel = scoreToLevel(avg);
    setProfile(prof);
    setIsRecording(false);
    setCurrentLevel(0);
    const r = { level: finalLevel, score: avg, peak, avg, durPct, stability };
    setResult(r);
    return r;
  }, []);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (audioRef.current) audioRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  return { currentLevel, isRecording, error, profile, result, startRecording, stopRecording, scoreToLevel };
}

// ===================== Wind Profile Chart =====================

function WindProfileChart({ profile, maxSamples = 60 }: { profile: number[]; maxSamples?: number }) {
  const chartW = 240;
  const chartH = 40;
  const samples = profile.slice(-maxSamples);
  if (samples.length === 0) {
    return <div className="flex items-center justify-center" style={{ height: chartH }}>
      <span className="text-xs opacity-30 text-stone-500">等待数据...</span>
    </div>;
  }

  const stepX = chartW / Math.max(samples.length - 1, 1);
  const pts = samples.map((v, i) => `${i * stepX},${chartH - (v / 100) * chartH}`);
  const path = pts.map((p, i) => (i === 0 ? `M${p}` : `L${p}`)).join(" ");
  const area = `${path} L${(samples.length - 1) * stepX},${chartH} L0,${chartH} Z`;

  return (
    <svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
      <defs>
        <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4b5b5" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#d4b5b5" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <line x1="0" y1={chartH} x2={chartW} y2={chartH} stroke="rgba(255,255,255,0.1)" />
      <line x1="0" y1={chartH * 0.5} x2={chartW} y2={chartH * 0.5} stroke="rgba(255,255,255,0.08)" />
      <path d={area} fill="url(#cf)" />
      <path d={path} fill="none" stroke="#d4b5b5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {samples.length > 0 && (
        <circle cx={(samples.length - 1) * stepX} cy={chartH - (samples[samples.length - 1] / 100) * chartH} r="3" fill="#d4b5b5" />
      )}
    </svg>
  );
}

// ===================== Wind Level Selector =====================

function WindLevelSelector({ level, onChange }: { level: number; onChange: (n: number) => void }) {
  const info = getWindInfo(level);
  const pct = (level / 17) * 100;
  const colors = ["#b5c4b1", "#c4c9b5", "#c4b5d4", "#b5c4c9", "#d4c9b5", "#d4b5b5", "#d4a0a0", "#c9a9b8", "#c08080", "#b07070", "#a06060", "#905050", "#e8a0a0", "#d08080", "#c06060", "#a04040"];
  const color = colors[Math.min(level, 16)] || "#e8a0a0";

  return (
    <div className="space-y-3">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => onChange(Math.max(0, level - 1))}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-light transition-all hover:scale-110 active:scale-90"
          style={{ background: "rgba(255,255,255,0.15)", color }}
          disabled={level <= 0}
        >◀</button>

        <div className="text-center min-w-[100px]">
          <div className="text-5xl font-bold tabular-nums tracking-tight" style={{ color }}>{level}</div>
          <div className="text-sm font-medium mt-0.5" style={{ color: `${color}CC` }}>{info.name}</div>
        </div>

        <button
          onClick={() => onChange(Math.min(17, level + 1))}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-light transition-all hover:scale-110 active:scale-90"
          style={{ background: "rgba(255,255,255,0.15)", color }}
          disabled={level >= 17}
        >▶</button>
      </div>

      {/* Slider */}
      <div className="relative px-1">
        <input
          type="range"
          min={0}
          max={17}
          step={1}
          value={level}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full appearance-none h-1.5 rounded-full cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color}40, ${color})`,
          }}
        />
        <style jsx>{`
          input[type="range"]::-webkit-slider-thumb {
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${color};
            cursor: pointer;
            box-shadow: 0 2px 8px ${color}60;
            border: 2px solid rgba(255,255,255,0.5);
          }
          input[type="range"]::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${color};
            cursor: pointer;
            border: 2px solid rgba(255,255,255,0.5);
          }
        `}</style>
      </div>

      {/* Speed display */}
      <div className="flex justify-center gap-4 text-xs">
        <span className="opacity-50 text-stone-500">{info.speedMs} m/s</span>
        <span className="opacity-30">|</span>
        <span className="opacity-50 text-stone-500">{info.speedKmh} km/h</span>
      </div>
    </div>
  );
}

// ===================== Education Card =====================

function EducationCard({ level }: { level: number }) {
  const info = getWindInfo(level);
  const emoji = level === 0 ? "🏳️" : level <= 3 ? "🏁" : level <= 6 ? "🚩" : level <= 9 ? "⛳" : level <= 12 ? "🏴" : "☄️";

  return (
    <div className="glass-strong rounded-2xl p-4 space-y-2.5 animate-scale-in">
      <div className="flex items-center gap-2">
        <span className="text-base">{emoji}</span>
        <h3 className="text-xs uppercase tracking-widest opacity-40 text-stone-600">风力科普 · {info.name}</h3>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white/10 rounded-xl p-2.5">
          <span className="opacity-40 block mb-0.5">🌊 海面</span>
          <span className="font-medium text-stone-600">{info.sea}</span>
        </div>
        <div className="bg-white/10 rounded-xl p-2.5">
          <span className="opacity-40 block mb-0.5">🌲 陆地</span>
          <span className="font-medium text-stone-600">{info.land}</span>
        </div>
      </div>

      <p className="text-sm text-stone-600 leading-relaxed opacity-75">
        {info.desc}
      </p>

      <div className="flex items-center gap-1.5 text-xs bg-white/10 rounded-xl px-3 py-2">
        <span>💡</span>
        <span className="opacity-60 text-stone-500">{info.tip}</span>
      </div>
    </div>
  );
}

// ===================== Challenge Result =====================

function ChallengeResult({
  result,
  targetLevel,
  onRetry,
}: {
  result: NonNullable<ReturnType<typeof useBlowingDetection>["result"]>;
  targetLevel: number;
  onRetry: () => void;
}) {
  const targetInfo = getWindInfo(targetLevel);
  const resultInfo = getWindInfo(result.level);
  const gap = targetLevel - result.level;
  const colors = ["#b5c4b1", "#c4c9b5", "#c4b5d4", "#b5c4c9", "#d4c9b5", "#d4b5b5", "#d4a0a0", "#c9a9b8", "#c08080", "#b07070", "#a06060", "#905050", "#e8a0a0", "#d08080", "#c06060", "#a04040"];
  const color = colors[Math.min(result.level, 16)] || "#e8a0a0";

  return (
    <div className="animate-fade-in-up space-y-3">
      <div className="glass-strong rounded-2xl p-4 text-center">
        <span className="text-3xl">{result.level >= 12 ? "💨" : result.level >= 8 ? "🌪️" : result.level >= 4 ? "🌬️" : "🍃"}</span>
        <div className="mt-1">
          <span className="text-xl font-bold" style={{ color }}>{result.level}</span>
          <span className="text-xs opacity-40 text-stone-500 ml-1">级 · {resultInfo.name}</span>
        </div>
        <div className="mt-2 text-xs opacity-60 text-stone-500">
          你吹出了 {result.score} 分 · 峰值 {result.peak} · 持久度 {result.durPct}%
        </div>
        <div className="mt-1 text-xs opacity-50 text-stone-500">{result.stability}</div>
      </div>

      {gap > 0 && (
        <div className="glass-strong rounded-2xl p-3 text-center text-sm">
          <span className="opacity-60 text-stone-500">
            目标 {targetLevel} 级 · 还差 <span style={{ color: "#d4b5b5" }}>{gap}</span> 级 💪
          </span>
        </div>
      )}
      {gap <= 0 && (
        <div className="glass-strong rounded-2xl p-3 text-center text-sm" style={{ color: "#b5c4b1" }}>
          🎉 达到目标！你吹出了 {targetLevel} 级以上的大风！
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={onRetry}
          className="rounded-2xl px-8 py-2.5 text-sm font-medium transition-all hover:scale-105 active:scale-95"
          style={{ background: "rgba(255,255,255,0.25)", color: "#8a9a87", border: "1px solid rgba(255,255,255,0.3)" }}
        >
          再挑战一次 🔄
        </button>
      </div>
    </div>
  );
}

// ===================== Main Page =====================

export default function Home() {
  const { currentLevel, isRecording, error, profile, result, startRecording, stopRecording } = useBlowingDetection();

  const [selectedLevel, setSelectedLevel] = useState(4);
  const [appMode, setAppMode] = useState<"browse" | "countdown" | "blowing" | "done">("browse");
  const [countdown, setCountdown] = useState(3);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveProfileRef = useRef<number[]>([]);
  const [blowResult, setBlowResult] = useState<ReturnType<typeof useBlowingDetection>["result"]>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  useEffect(() => {
    if (appMode === "blowing" && currentLevel > 0) {
      liveProfileRef.current.push(Math.min(100, Math.round((currentLevel / 255) * 100)));
    }
  }, [currentLevel, appMode]);

  const handleBlow = () => {
    setAppMode("countdown");
    setCountdown(3);
    setBlowResult(null);
    liveProfileRef.current = [];

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 800);

    timerRef.current = setTimeout(() => {
      startRecording();
      setAppMode("blowing");

      timerRef.current = setTimeout(() => {
        const r = stopRecording();
        if (r) setBlowResult(r);
        setAppMode("done");
      }, 3000);
    }, 2400);
  };

  const handleRetry = () => {
    setAppMode("browse");
    setBlowResult(null);
    liveProfileRef.current = [];
  };

  const displayLevel = appMode === "done" ? (blowResult?.level ?? 0) : isRecording ? Math.round(currentLevel / 255 * 17) : appMode === "countdown" ? selectedLevel : selectedLevel;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #f5f0eb 0%, #e8e0d8 30%, #e0d8d0 60%, #e8e0d8 100%)" }}
    >
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full opacity-20 blur-3xl" style={{ background: "#b5c4b1" }} />
      <div className="fixed bottom-[-10%] right-[-5%] w-[45%] h-[45%] rounded-full opacity-20 blur-3xl" style={{ background: "#c4b5d4" }} />
      <div className="fixed top-[40%] right-[-8%] w-[25%] h-[25%] rounded-full opacity-15 blur-3xl" style={{ background: "#d4b5b5" }} />

      <div className="relative z-10 w-full max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-3 animate-fade-in-up">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-shimmer">CyberWeather</span>
          </h1>
          <p className="mt-0.5 text-xs opacity-50 text-stone-500">
            天气 App 说今天几级风？来看看它到底有多大！
          </p>
        </div>

        {/* Pixel Scene */}
        <div className="glass rounded-3xl p-3 mb-3 shadow-xl animate-scale-in">
          <PixelScene windLevel={displayLevel} />
          {appMode === "done" && blowResult && (
            <div className="mt-2 text-center">
              <span className="text-xs opacity-50 text-stone-500">
                ← {selectedLevel} 级目标 · 你吹出 {blowResult.level} 级 →
              </span>
            </div>
          )}
        </div>

        {/* Wind Level Selector */}
        <div className="glass rounded-3xl p-5 mb-3 shadow-xl animate-scale-in">
          <WindLevelSelector
            level={appMode === "done" && blowResult ? blowResult.level : selectedLevel}
            onChange={appMode === "done" ? () => {} : setSelectedLevel}
          />

          {/* Current level indicator */}
          {appMode === "blowing" && (
            <div className="mt-3 text-center animate-fade-in-up">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span className="text-xs opacity-60 text-stone-500">吹气中... {Math.round(currentLevel / 255 * 17)} 级</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${Math.min(100, (currentLevel / 255) * 100)}%`,
                    background: "linear-gradient(90deg, #b5c4b1, #d4b5b5, #e8a0a0)"
                  }}
                />
              </div>
            </div>
          )}

          {/* Countdown */}
          {appMode === "countdown" && (
            <div className="text-center py-2 animate-scale-in">
              <span className="text-3xl font-light animate-countdown-pop" style={{ color: "#b5c4b1" }}>{countdown}</span>
            </div>
          )}
        </div>

        {/* Education Card (visible in browse mode) */}
        {appMode === "browse" && (
          <div className="animate-fade-in-up mb-3">
            <EducationCard level={selectedLevel} />
          </div>
        )}

        {/* Action button */}
        {appMode === "browse" && (
          <div className="glass rounded-2xl p-4 mb-3 shadow-lg animate-fade-in-up">
            <div className="text-center">
              <p className="text-xs opacity-40 text-stone-500 mb-3">
                选好风力等级了？来试试你能吹出几级风！
              </p>
              <button
                onClick={handleBlow}
                className="group relative overflow-hidden rounded-2xl px-10 py-3 text-base font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #b5c4b1 0%, #c4b5d4 50%, #d4b5b5 100%)",
                  color: "white",
                  boxShadow: "0 4px 20px rgba(180, 196, 177, 0.3)",
                }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span>🎤</span>
                  吹气挑战 {selectedLevel} 级
                </span>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity bg-white" />
              </button>
              <p className="mt-2 text-xs opacity-30 text-stone-500">需要麦克风权限 · 吹 3 秒</p>
            </div>
          </div>
        )}

        {/* Recording wind profile */}
        {appMode === "blowing" && (
          <>
            <div className="glass rounded-2xl p-3 mb-3 shadow-lg animate-fade-in-up">
              <div className="text-xs uppercase tracking-widest opacity-40 text-stone-600 mb-1">🌊 实时风谱</div>
              <WindProfileChart profile={liveProfileRef.current} maxSamples={80} />
            </div>
            <div className="glass rounded-2xl p-4 shadow-lg animate-fade-in-up">
              {error ? (
                <div className="text-sm text-center" style={{ color: "#c08080" }}>{error}</div>
              ) : (
                <div className="text-center text-xs opacity-40 text-stone-500">保持吹气 3 秒...</div>
              )}
            </div>
          </>
        )}

        {/* Result */}
        {appMode === "done" && blowResult && (
          <div className="animate-fade-in-up space-y-3">
            {/* Metrics mini dashboard */}
            <div className="glass rounded-2xl p-4 shadow-lg">
              <ChallengeResult result={blowResult} targetLevel={selectedLevel} onRetry={handleRetry} />
            </div>

            {/* Profile chart */}
            {blowResult && (
              <div className="glass rounded-2xl p-3 shadow-lg">
                <div className="text-xs uppercase tracking-widest opacity-40 text-stone-600 mb-1">📈 吹气过程曲线</div>
                <WindProfileChart profile={profile} maxSamples={200} />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-4 animate-fade-in-up">
          <p className="text-xs opacity-20 text-stone-500">风力等级参照 GB/T 28591-2012 · 纯前端科普体验</p>
        </div>
      </div>
    </div>
  );
}
