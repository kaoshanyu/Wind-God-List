"use client";

import { WIND_LEVEL_COLORS } from "@/lib/wind-scale";
import type { LeaderboardEntry } from "@/lib/leaderboard-storage";

interface Props {
  entries: LeaderboardEntry[];
  currentEntryId?: string | null;
  onClear: () => void;
  windLevel: number;
}

const LEVEL_EMOJIS: Record<string, string> = {
  beach: "🏖️",
  city: "🌆",
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, "0")}`;
}

function levelEmoji(level: number): string {
  if (level >= 15) return "💀";
  if (level >= 12) return "🌀";
  if (level >= 9) return "🌪️";
  if (level >= 6) return "💨";
  if (level >= 3) return "🌬️";
  return "🍃";
}

export default function LeaderboardPanel({ entries, currentEntryId, onClear, windLevel }: Props) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest opacity-40 text-stone-600">
          🏆 风神榜 · 肺活量排行
        </h3>
        {entries.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm("确定清除所有排行记录？")) onClear();
            }}
            className="text-[10px] opacity-30 hover:opacity-60 text-stone-500 transition-opacity"
          >
            清除记录
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-6 animate-fade-in-up">
          <span className="text-2xl block mb-2">💨</span>
          <p className="text-xs opacity-40 text-stone-500 leading-relaxed">
            还没有挑战记录！
          </p>
          <p className="text-xs opacity-30 text-stone-500">
            选一个风力等级，试试你的肺活量能吹出几级风
        </p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
          {entries.map((entry, idx) => {
            const color = WIND_LEVEL_COLORS[Math.min(entry.level, 16)] || "#e8a0a0";
            const isCurrent = entry.id === currentEntryId;
            const sceneIcon = LEVEL_EMOJIS[entry.scene] || "";

            return (
              <div
                key={entry.id}
                className={`flex items-center gap-2 text-xs rounded-xl px-3 py-2 transition-all ${
                  isCurrent ? "bg-white/25 ring-1 ring-white/30 animate-pulse" : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="w-5 text-center font-mono opacity-40 text-stone-500">{idx + 1}</span>
                <span className="w-4 text-center">{sceneIcon}</span>
                <span className="font-bold tabular-nums" style={{ color }}>
                  {entry.level}
                </span>
                <span className="opacity-40 text-stone-500" style={{ fontSize: "0.65rem" }}>
                  级
                </span>
                <span className="ml-1">{levelEmoji(entry.level)}</span>
                <span className="flex-1" />
                <span className="opacity-50 text-stone-500 tabular-nums">
                  {entry.score}分
                </span>
                <span className="opacity-30 text-stone-500">·</span>
                <span className="opacity-40 text-stone-500 tabular-nums">
                  峰值{entry.peak}
                </span>
                <span className="opacity-30 text-stone-500">·</span>
                <span className="opacity-40 text-stone-500">
                  {formatDate(entry.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
