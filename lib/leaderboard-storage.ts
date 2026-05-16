export interface LeaderboardEntry {
  id: string;
  timestamp: number;
  level: number;
  score: number;
  peak: number;
  avg: number;
  durPct: number;
  stability: string;
  scene: "beach" | "city" | "cute";
}

const STORAGE_KEY = "fyshen-leaderboard";
const MAX_ENTRIES = 50;

let idCounter = 0;

function generateId(): string {
  idCounter++;
  return `${Date.now().toString(36)}-${idCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

export function saveLeaderboardEntry(
  entry: Omit<LeaderboardEntry, "id" | "timestamp">
): LeaderboardEntry | null {
  try {
    const full: LeaderboardEntry = {
      ...entry,
      id: generateId(),
      timestamp: Date.now(),
    };

    const entries = getLeaderboard();
    entries.push(full);
    entries.sort((a, b) => b.level - a.level || b.score - a.score || a.timestamp - b.timestamp);

    // Keep only top entries
    if (entries.length > MAX_ENTRIES) {
      entries.splice(MAX_ENTRIES);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return full;
  } catch {
    return null;
  }
}

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e: unknown): e is LeaderboardEntry =>
        typeof e === "object" && e !== null && "id" in e && "level" in e && "score" in e
    );
  } catch {
    return [];
  }
}

export function clearLeaderboard(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}
