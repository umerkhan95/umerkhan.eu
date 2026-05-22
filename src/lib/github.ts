import fs from "node:fs";
import path from "node:path";
import { TRACKED_REPOS, GITHUB_USERNAME, COMMIT_HISTORY_MONTHS } from "../config/repos";

export interface Commit {
  sha: string;
  message: string;
  date: string;
  repo: string;
  repoUrl: string;
  url: string;
}

export interface CommitsByDate {
  [date: string]: Commit[];
}

export type PunchCardEntry = [number, number, number];

export interface WeeklyActivity {
  week: number;
  total: number;
  days: number[];
}

export type CodeFrequencyEntry = [number, number, number];
export type Languages = Record<string, number>;

export interface AnalyticsData {
  stats: {
    totalCommits: number;
    activeDays: number;
    currentStreak: number;
    longestStreak: number;
    avgPerWeek: number;
    busiestDay: string;
    firstCommitDate: string;
    lastCommitDate: string;
  };
  commitsByRepo: Record<string, number>;
  commitTypes: Record<string, number>;
  punchCard: PunchCardEntry[];
  weeklyActivity: WeeklyActivity[];
  codeFrequency: CodeFrequencyEntry[];
  languages: Languages;
}

export interface CachedActivityData {
  commitsByDate: CommitsByDate;
  analytics: AnalyticsData;
  fetchedAt: string;
}

const CACHE_PATH = path.join(process.cwd(), "src", "data", "activity-cache.json");

// --- Read from cache (used by pages) ---

export function loadActivityData(): CachedActivityData {
  try {
    const raw = fs.readFileSync(CACHE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    console.warn("No activity cache found. Run `pnpm fetch-activity` to generate.");
    return {
      commitsByDate: {},
      analytics: {
        stats: { totalCommits: 0, activeDays: 0, currentStreak: 0, longestStreak: 0, avgPerWeek: 0, busiestDay: "N/A", firstCommitDate: "", lastCommitDate: "" },
        commitsByRepo: {},
        commitTypes: {},
        punchCard: [],
        weeklyActivity: [],
        codeFrequency: [],
        languages: {},
      },
      fetchedAt: "",
    };
  }
}

// --- GitHub API fetchers (used by fetch script) ---

async function fetchWithRetry<T>(url: string, token: string, retries = 3): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "umerkhan.io-website",
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data && typeof data === "object" && !Array.isArray(data) && Object.keys(data).length === 0) {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    return data as T;
  }
  return null;
}

async function fetchRepoCommits(repo: string, token: string, since: string): Promise<Commit[]> {
  const commits: Commit[] = [];
  let page = 1;
  const perPage = 100;

  try {
    while (true) {
      const response = await fetch(
        `https://api.github.com/repos/${repo}/commits?author=${GITHUB_USERNAME}&since=${since}&per_page=${perPage}&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "umerkhan.io-website",
          },
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch commits for ${repo}: ${response.status}`);
        break;
      }

      const data = await response.json();
      if (data.length === 0) break;

      for (const commit of data) {
        commits.push({
          sha: commit.sha.substring(0, 7),
          message: commit.commit.message.split("\n")[0],
          date: commit.commit.author.date,
          repo: repo.split("/")[1],
          repoUrl: `https://github.com/${repo}`,
          url: commit.html_url,
        });
      }

      if (data.length < perPage) break;
      page++;
    }
  } catch (error) {
    console.error(`Error fetching commits for ${repo}:`, error);
  }

  return commits;
}

export async function fetchAllCommits(token: string): Promise<CommitsByDate> {
  const since = new Date();
  since.setMonth(since.getMonth() - COMMIT_HISTORY_MONTHS);

  const allCommitsArrays = await Promise.all(
    TRACKED_REPOS.map((repo) => fetchRepoCommits(repo, token, since.toISOString()))
  );

  const allCommits = allCommitsArrays
    .flat()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const commitsByDate: CommitsByDate = {};
  for (const commit of allCommits) {
    const dateKey = new Date(commit.date).toISOString().split("T")[0];
    if (!commitsByDate[dateKey]) commitsByDate[dateKey] = [];
    commitsByDate[dateKey].push(commit);
  }

  return commitsByDate;
}

export async function fetchPunchCard(repos: readonly string[], token: string): Promise<PunchCardEntry[]> {
  const merged: Record<string, number> = {};
  for (const repo of repos) {
    const data = await fetchWithRetry<PunchCardEntry[]>(
      `https://api.github.com/repos/${repo}/stats/punch_card`, token
    );
    if (data) {
      for (const [day, hour, commits] of data) {
        const key = `${day}-${hour}`;
        merged[key] = (merged[key] || 0) + commits;
      }
    }
  }

  const result: PunchCardEntry[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      result.push([day, hour, merged[`${day}-${hour}`] || 0]);
    }
  }
  return result;
}

export async function fetchCommitActivity(repos: readonly string[], token: string): Promise<WeeklyActivity[]> {
  const merged: Record<number, WeeklyActivity> = {};
  for (const repo of repos) {
    const data = await fetchWithRetry<WeeklyActivity[]>(
      `https://api.github.com/repos/${repo}/stats/commit_activity`, token
    );
    if (data) {
      for (const week of data) {
        if (!merged[week.week]) {
          merged[week.week] = { week: week.week, total: 0, days: [0, 0, 0, 0, 0, 0, 0] };
        }
        merged[week.week].total += week.total;
        for (let i = 0; i < 7; i++) {
          merged[week.week].days[i] += week.days[i];
        }
      }
    }
  }

  return Object.values(merged).sort((a, b) => a.week - b.week);
}

export async function fetchCodeFrequency(repos: readonly string[], token: string): Promise<CodeFrequencyEntry[]> {
  const merged: Record<number, [number, number]> = {};
  for (const repo of repos) {
    const data = await fetchWithRetry<CodeFrequencyEntry[]>(
      `https://api.github.com/repos/${repo}/stats/code_frequency`, token
    );
    if (data) {
      for (const [ts, additions, deletions] of data) {
        if (!merged[ts]) merged[ts] = [0, 0];
        merged[ts][0] += additions;
        merged[ts][1] += deletions;
      }
    }
  }

  return Object.entries(merged)
    .map(([ts, [a, d]]) => [Number(ts), a, d] as CodeFrequencyEntry)
    .sort((a, b) => a[0] - b[0]);
}

export async function fetchLanguages(repos: readonly string[], token: string): Promise<Languages> {
  const merged: Languages = {};
  for (const repo of repos) {
    const data = await fetchWithRetry<Languages>(
      `https://api.github.com/repos/${repo}/languages`, token
    );
    if (data) {
      for (const [lang, bytes] of Object.entries(data)) {
        merged[lang] = (merged[lang] || 0) + bytes;
      }
    }
  }
  return merged;
}

export function computeAnalytics(
  commitsByDate: CommitsByDate,
  punchCard: PunchCardEntry[],
  weeklyActivity: WeeklyActivity[],
  codeFrequency: CodeFrequencyEntry[],
  languages: Languages,
): AnalyticsData {
  const dates = Object.keys(commitsByDate).sort();
  const allCommits = Object.values(commitsByDate).flat();
  const totalCommits = allCommits.length;
  const activeDays = dates.length;

  // Streaks
  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortedDatesDesc = [...dates].sort((a, b) => b.localeCompare(a));
  if (sortedDatesDesc.length > 0) {
    const lastDate = new Date(sortedDatesDesc[0]);
    lastDate.setHours(0, 0, 0, 0);
    const diffFromToday = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffFromToday <= 1) {
      currentStreak = 1;
      for (let i = 1; i < sortedDatesDesc.length; i++) {
        const prev = new Date(sortedDatesDesc[i - 1]);
        const curr = new Date(sortedDatesDesc[i]);
        const diff = Math.floor((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 1) currentStreak++;
        else break;
      }
    }
  }

  const sortedDatesAsc = [...dates].sort();
  streak = 1;
  longestStreak = 1;
  for (let i = 1; i < sortedDatesAsc.length; i++) {
    const prev = new Date(sortedDatesAsc[i - 1]);
    const curr = new Date(sortedDatesAsc[i]);
    const diff = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      streak++;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 1;
    }
  }
  if (dates.length === 0) longestStreak = 0;

  const weekSpan = dates.length > 1
    ? Math.max(1, Math.ceil((new Date(sortedDatesAsc[sortedDatesAsc.length - 1]).getTime() - new Date(sortedDatesAsc[0]).getTime()) / (1000 * 60 * 60 * 24 * 7)))
    : 1;
  const avgPerWeek = Math.round((totalCommits / weekSpan) * 10) / 10;

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayTotals = [0, 0, 0, 0, 0, 0, 0];
  for (const commit of allCommits) {
    const d = new Date(commit.date);
    dayTotals[d.getDay()]++;
  }
  const busiestDayIdx = dayTotals.indexOf(Math.max(...dayTotals));

  const commitsByRepo: Record<string, number> = {};
  for (const commit of allCommits) {
    commitsByRepo[commit.repo] = (commitsByRepo[commit.repo] || 0) + 1;
  }

  const typePatterns: [string, RegExp][] = [
    ["Add", /^add\b/i],
    ["Fix", /^fix\b/i],
    ["Update", /^update\b/i],
    ["Refactor", /^refactor\b/i],
    ["Remove", /^(remove|delete)\b/i],
    ["Docs", /^(docs?|readme)\b/i],
    ["Style", /^(style|css|design|redesign|ui)\b/i],
    ["Test", /^test\b/i],
    ["Chore", /^(chore|bump|merge|release)\b/i],
    ["Feat", /^feat\b/i],
    ["Implement", /^implement\b/i],
    ["Improve", /^improve\b/i],
    ["Init", /^(init|initial|setup|scaffold)\b/i],
    ["Config", /^(config|configure|set)\b/i],
  ];
  const commitTypes: Record<string, number> = {};
  for (const commit of allCommits) {
    const msg = commit.message;
    let matched = false;
    for (const [type, pattern] of typePatterns) {
      if (pattern.test(msg)) {
        commitTypes[type] = (commitTypes[type] || 0) + 1;
        matched = true;
        break;
      }
    }
    if (!matched) {
      commitTypes["Other"] = (commitTypes["Other"] || 0) + 1;
    }
  }

  return {
    stats: {
      totalCommits, activeDays, currentStreak, longestStreak, avgPerWeek,
      busiestDay: dayNames[busiestDayIdx] || "N/A",
      firstCommitDate: sortedDatesAsc[0] || "",
      lastCommitDate: sortedDatesAsc[sortedDatesAsc.length - 1] || "",
    },
    commitsByRepo, commitTypes, punchCard, weeklyActivity, codeFrequency, languages,
  };
}

// --- Utility functions ---

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
