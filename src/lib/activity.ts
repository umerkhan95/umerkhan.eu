// Build-time shaping of the commit cache for the activity page.
import type { Commit, CommitsByDate } from "./github";

const DAY = 24 * 60 * 60 * 1000;

/** Monday (UTC) of the week containing the given YYYY-MM-DD date. */
export function weekStart(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - offset * DAY).toISOString().slice(0, 10);
}

export interface CommitWeek {
  start: string; // Monday, YYYY-MM-DD
  commits: Commit[];
  repos: string[]; // most active first
}

export function groupByWeek(commitsByDate: CommitsByDate): CommitWeek[] {
  const weeks = new Map<string, Commit[]>();
  for (const [dateKey, commits] of Object.entries(commitsByDate)) {
    const key = weekStart(dateKey);
    weeks.set(key, [...(weeks.get(key) ?? []), ...commits]);
  }
  return [...weeks.entries()]
    .map(([start, commits]) => {
      const counts = new Map<string, number>();
      for (const c of commits) counts.set(c.repo, (counts.get(c.repo) ?? 0) + 1);
      const repos = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([repo]) => repo);
      const sorted = [...commits].sort((a, b) => b.date.localeCompare(a.date));
      return { start, commits: sorted, repos };
    })
    .sort((a, b) => b.start.localeCompare(a.start));
}

export interface PulseWeek {
  start: string;
  count: number;
}

/** The last `span` weeks ending with the current week, oldest first, gaps filled with 0. */
export function pulse(weeks: CommitWeek[], span = 52, now = new Date()): PulseWeek[] {
  const byStart = new Map(weeks.map((w) => [w.start, w.commits.length]));
  const current = new Date(`${weekStart(now.toISOString().slice(0, 10))}T00:00:00Z`).getTime();
  return Array.from({ length: span }, (_, i) => {
    const start = new Date(current - (span - 1 - i) * 7 * DAY).toISOString().slice(0, 10);
    return { start, count: byStart.get(start) ?? 0 };
  });
}

const fmt = (dateKey: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${dateKey}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...options });

export const shortDay = (dateKey: string) => fmt(dateKey, { month: "short", day: "numeric" });
export const monthYear = (dateKey: string) => fmt(dateKey, { month: "long", year: "numeric" });
export const shortMonth = (dateKey: string) => fmt(dateKey, { month: "short" });
