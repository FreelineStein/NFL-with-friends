import type { TeamRecord } from "@/lib/types";

export function formatRecord(t: Pick<TeamRecord, "wins" | "losses" | "ties">): string {
  return t.ties > 0 ? `${t.wins}-${t.losses}-${t.ties}` : `${t.wins}-${t.losses}`;
}

export function formatPct(pct: number): string {
  if (!Number.isFinite(pct)) return ".000";
  return pct >= 1 ? "1.000" : pct.toFixed(3).replace(/^0/, "");
}

export function formatDiff(n: number): string {
  if (n > 0) return `+${n}`;
  return `${n}`;
}

export function formatPoints(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

/** Two-letter badge text for a participant chip. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00:00";
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const hms = `${days > 0 ? String(hours).padStart(2, "0") : hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return days > 0 ? `${days}d ${hms}` : hms;
}

export function relativeTime(date: Date, now = Date.now()): string {
  const seconds = Math.floor((now - date.getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
