"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import PixelScene from "@/components/pixel-scene";
import CityScene from "@/components/city-scene";
import CuteScene from "@/components/cute-scene";
import LeaderboardPanel from "@/components/leaderboard-panel";
import { getWindInfo, WIND_LEVEL_COLORS } from "@/lib/wind-scale";
import { saveLeaderboardEntry, getLeaderboard, clearLeaderboard } from "@/lib/leaderboard-storage";
import type { LeaderboardEntry } from "@/lib/leaderboard-storage";

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
      const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
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
  const color = WIND_LEVEL_COLORS[Math.min(level, 16)] || "#e8a0a0";

  return (
    <div className="space-y-3">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-5">
        <button
          onClick={() => onChange(Math.max(0, level - 1))}
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold transition-all hover:scale-125 active:scale-90 hover:shadow-lg"
          style={{ background: "rgba(255,255,255,0.2)", color, border: `1px solid ${color}40` }}
          disabled={level <= 0}
        >◀</button>

        <div className="text-center min-w-[120px]">
          <div className="text-6xl font-black tabular-nums tracking-tight drop-shadow-lg" style={{ color }}>{level}</div>
          <div className="text-sm font-bold mt-1 px-3 py-0.5 rounded-full" style={{ background: `${color}20`, color: `${color}CC` }}>{info.name}</div>
        </div>

        <button
          onClick={() => onChange(Math.min(17, level + 1))}
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold transition-all hover:scale-125 active:scale-90 hover:shadow-lg"
          style={{ background: "rgba(255,255,255,0.2)", color, border: `1px solid ${color}40` }}
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

  const levelEmoji = level >= 13 ? "🔥🔥🔥" : level >= 10 ? "🌀" : level >= 7 ? "💨" : level >= 4 ? "🌬️" : "🍃";

  return (
    <div className="card-warm-strong rounded-2xl p-4 space-y-2.5 animate-bounce-in" style={{ border: `1px solid ${WIND_LEVEL_COLORS[Math.min(level, 16)]}60` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 text-stone-600">风力科普 · {info.name}</h3>
        </div>
        <span className="text-sm">{levelEmoji}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white/10 rounded-xl p-2.5">
          <span className="opacity-40 block mb-0.5">🌊 海面</span>
          <span className="font-bold text-stone-600">{info.sea}</span>
        </div>
        <div className="bg-white/10 rounded-xl p-2.5">
          <span className="opacity-40 block mb-0.5">🌲 陆地</span>
          <span className="font-bold text-stone-600">{info.land}</span>
        </div>
      </div>

      <p className="text-sm text-stone-600 leading-relaxed opacity-80 font-medium">
        {info.desc}
      </p>

      <div className="flex items-center gap-1.5 text-xs bg-white/10 rounded-xl px-3 py-2">
        <span>💡</span>
        <span className="opacity-70 text-stone-500 font-medium">{info.tip}</span>
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
  const color = WIND_LEVEL_COLORS[Math.min(result.level, 16)] || "#e8a0a0";

  const resultEmoji = result.level >= 15 ? "💀" : result.level >= 12 ? "🌀" : result.level >= 9 ? "🌪️" : result.level >= 6 ? "💨" : result.level >= 3 ? "🌬️" : "🍃";

  return (
    <div className="animate-bounce-in space-y-3">
      <div className="glass-strong rounded-2xl p-5 text-center" style={{ border: `2px solid ${color}40` }}>
        <div className="text-4xl mb-2">{resultEmoji}</div>
        <div className="flex items-center justify-center gap-1">
          <span className="text-4xl font-black tabular-nums" style={{ color }}>{result.level}</span>
          <span className="text-sm opacity-40 text-stone-500 mt-2">级 · {resultInfo.name}</span>
        </div>
        <div className="mt-2 flex justify-center gap-4 text-xs">
          <span className="opacity-50 text-stone-500">🎯 {result.score}分</span>
          <span className="opacity-30">|</span>
          <span className="opacity-50 text-stone-500">📈 峰值{result.peak}</span>
          <span className="opacity-30">|</span>
          <span className="opacity-50 text-stone-500">⏱ {result.durPct}%</span>
        </div>
        <div className="mt-1 text-xs opacity-40 text-stone-500">{result.stability}</div>
      </div>

      {gap > 0 && (
        <div className="glass-strong rounded-2xl p-3 text-center animate-bounce-in">
          <span className="text-sm opacity-70 text-stone-500">
            目标 {targetLevel} 级 · 还差 <span className="font-bold" style={{ color: "#d4b5b5" }}>{gap}</span> 级 💪
          </span>
        </div>
      )}
      {gap <= 0 && (
        <div className="glass-strong rounded-2xl p-3 text-center animate-bounce-in" style={{ border: "1px solid rgba(181, 196, 177, 0.4)" }}>
          <span className="text-sm font-bold" style={{ color: "#b5c4b1" }}>
            🎉🎉 达到目标！你吹出了 {targetLevel} 级以上的大风！🎉🎉
          </span>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={onRetry}
          className="rounded-2xl px-10 py-3 text-sm font-bold transition-all hover:scale-110 active:scale-90"
          style={{ background: "rgba(255,255,255,0.25)", color: "#8a9a87", border: "2px solid rgba(255,255,255,0.3)" }}
        >
          🔄 再挑战一次
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
  const [scene, setScene] = useState<"beach" | "city" | "cute">("cute");
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);

  useEffect(() => {
    setLeaderboardEntries(getLeaderboard());
  }, []);

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
        if (r) {
          setBlowResult(r);
          const saved = saveLeaderboardEntry({
            level: r.level, score: r.score, peak: r.peak, avg: r.avg,
            durPct: r.durPct, stability: r.stability, scene,
          });
          if (saved) setCurrentEntryId(saved.id);
          setLeaderboardEntries(getLeaderboard());
        }
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
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-white"
    >

      <div className="relative z-10 w-full max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-3 animate-bounce-in">
          <div className="text-2xl mb-1 opacity-60" style={{ animation: "wiggle 2s ease-in-out infinite" }}>
            🌪️💨🌊
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            <span className="text-shimmer">风神榜</span>
          </h1>
          <p className="mt-1 text-sm font-medium opacity-60 text-stone-500">
            对着麦克风吹气，看看你是几级大风！
          </p>
        </div>

        {/* Scene Toggle */}
        <div className="flex justify-center mb-3 gap-2 text-xs">
          <button
            onClick={() => setScene("beach")}
            className={`px-5 py-2 rounded-xl font-bold transition-all ${
              scene === "beach" ? "bg-stone-100 text-stone-700 shadow-sm ring-1 ring-stone-200" : "text-stone-400 hover:text-stone-600"
            }`}
          >
            🏖️ 海滩
          </button>
          <button
            onClick={() => setScene("city")}
            className={`px-5 py-2 rounded-xl font-bold transition-all ${
              scene === "city" ? "bg-stone-100 text-stone-700 shadow-sm ring-1 ring-stone-200" : "text-stone-400 hover:text-stone-600"
            }`}
          >
            🌆 城市
          </button>
          <button
            onClick={() => setScene("cute")}
            className={`px-5 py-2 rounded-xl font-bold transition-all ${
              scene === "cute" ? "bg-stone-100 text-stone-700 shadow-sm ring-1 ring-stone-200" : "text-stone-400 hover:text-stone-600"
            }`}
          >
            🎀 可爱
          </button>
        </div>

        {/* Pixel Scene */}
        <div className="rounded-3xl p-3 mb-3 shadow-lg" style={{ background: "rgba(245, 240, 235, 0.6)", border: "1px solid rgba(0,0,0,0.04)" }}>
          {scene === "beach" && <PixelScene windLevel={displayLevel} />}
          {scene === "city" && <CityScene windLevel={displayLevel} />}
          {scene === "cute" && <CuteScene windLevel={displayLevel} />}
          {appMode === "done" && blowResult && (
            <div className="mt-2 text-center">
              <span className="text-xs opacity-50 text-stone-500">
                ← {selectedLevel} 级目标 · 你吹出 {blowResult.level} 级 →
              </span>
            </div>
          )}
        </div>

        {/* Wind Level Selector */}
        <div className="card-warm rounded-3xl p-5 mb-3 shadow-lg animate-scale-in">
          <WindLevelSelector
            level={appMode === "done" && blowResult ? blowResult.level : selectedLevel}
            onChange={appMode === "done" ? () => {} : setSelectedLevel}
          />

          {/* Current level indicator */}
          {appMode === "blowing" && (
            <div className="mt-4 text-center animate-bounce-in">
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="text-2xl animate-bounce">💨</span>
                <span className="text-lg font-bold" style={{ color: WIND_LEVEL_COLORS[Math.min(Math.round(currentLevel / 255 * 17), 16)] || "#e8a0a0" }}>
                  {Math.round(currentLevel / 255 * 17)} 级
                </span>
                <span className="text-2xl animate-bounce" style={{ animationDelay: "0.2s" }}>💨</span>
              </div>
              <div className="h-3 rounded-full bg-white/20 overflow-hidden shadow-inner">
                <div className="h-full rounded-full transition-all duration-100"
                  style={{
                    width: `${Math.min(100, (currentLevel / 255) * 100)}%`,
                    background: "linear-gradient(90deg, #b5c4b1, #d4b5b5, #e8a0a0, #ff6b6b)",
                    boxShadow: "0 0 12px rgba(232, 160, 160, 0.5)"
                  }}
                />
              </div>
              <div className="mt-1 text-xs opacity-50 text-stone-500">拼命吹气中... 🔥</div>
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
          <div className="card-warm rounded-2xl p-5 mb-3 shadow-lg animate-bounce-in" style={{ border: "1px solid #e8e4de" }}>
            <div className="text-center">
              <p className="text-xs font-medium opacity-50 text-stone-500 mb-3">
                👇 选好风力等级了？来试试你的肺活量！👇
              </p>
              <button
                onClick={handleBlow}
                className="group relative overflow-hidden rounded-2xl px-12 py-4 text-lg font-bold tracking-wide transition-all duration-300 hover:scale-110 active:scale-90 animate-pulse-glow"
                style={{
                  background: "linear-gradient(135deg, #d4b5b5 0%, #c4b5d4 50%, #b5c4b1 100%)",
                  color: "white",
                  boxShadow: "0 8px 32px rgba(212, 181, 181, 0.4)",
                }}
              >
                <span className="relative z-10 flex items-center gap-3">
                  <span className="text-xl">🎤</span>
                  吹气挑战 {selectedLevel} 级 🔥
                </span>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity rounded-2xl" />
              </button>
              <p className="mt-3 text-xs opacity-40 text-stone-500">需要麦克风权限 · 吹 3 秒</p>
            </div>
          </div>
        )}

        {/* Recording wind profile */}
        {appMode === "blowing" && (
          <>
            <div className="card-warm rounded-2xl p-3 mb-3 shadow-lg animate-bounce-in">
              <div className="text-xs font-bold uppercase tracking-widest opacity-50 text-stone-600 mb-1">🌊 实时风谱</div>
              <WindProfileChart profile={liveProfileRef.current} maxSamples={80} />
            </div>
            <div className="card-warm rounded-2xl p-4 shadow-lg animate-bounce-in">
              {error ? (
                <div className="text-sm text-center font-bold" style={{ color: "#c08080" }}>{error}</div>
              ) : (
                <div className="text-center">
                  <span className="text-lg animate-pulse">🎤</span>
                  <span className="text-xs opacity-50 text-stone-500 ml-2">保持吹气 3 秒...</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Result */}
        {appMode === "done" && blowResult && (
          <div className="animate-bounce-in space-y-3">
            {/* Metrics mini dashboard */}
            <div className="card-warm rounded-2xl p-4 shadow-lg">
              <ChallengeResult result={blowResult} targetLevel={selectedLevel} onRetry={handleRetry} />
            </div>

            {/* Profile chart */}
            {blowResult && (
              <div className="card-warm rounded-2xl p-3 shadow-lg">
                <div className="text-xs font-bold uppercase tracking-widest opacity-50 text-stone-600 mb-1">📈 吹气过程曲线</div>
                <WindProfileChart profile={profile} maxSamples={200} />
              </div>
            )}
          </div>
        )}

        {/* Leaderboard */}
        <div className="card-warm rounded-2xl p-3.5 shadow-lg animate-fade-in-up">
          <LeaderboardPanel
            entries={leaderboardEntries}
            currentEntryId={currentEntryId}
            onClear={() => { clearLeaderboard(); setLeaderboardEntries([]); }}
            windLevel={selectedLevel}
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-4 animate-fade-in-up">
          <p className="text-xs opacity-20 text-stone-500">风力等级参照 GB/T 28591-2012 · 纯前端科普体验</p>
        </div>
      </div>
    </div>
  );
}
