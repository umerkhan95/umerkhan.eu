/**
 * Fetches all GitHub activity data and writes to src/data/activity-cache.json
 * Run: pnpm fetch-activity
 * This script is called before builds and can be run manually to refresh data.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Load .env file
const envPath = path.join(ROOT, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

// Import config directly (can't use path aliases in standalone script)
const TRACKED_REPOS = [
  "umerkhan95/Shopify-Employee-Agent",
  "umerkhan95/umerkhan.eu",
  "umerkhan95/gatekpr",
  "umerkhan95/shopextract",
] as const;

const GITHUB_USERNAME = "umerkhan95";
const COMMIT_HISTORY_MONTHS = 120;

const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error("GITHUB_TOKEN environment variable is required");
  process.exit(1);
}

// --- Types ---
interface Commit {
  sha: string;
  message: string;
  date: string;
  repo: string;
  repoUrl: string;
  url: string;
}

type PunchCardEntry = [number, number, number];
interface WeeklyActivity { week: number; total: number; days: number[]; }
type CodeFrequencyEntry = [number, number, number];
type Languages = Record<string, number>;

// --- Fetch helpers ---
async function fetchWithRetry<T>(url: string, retries = 3): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "umer.eu-website",
      },
    });
    if (!response.ok) {
      console.warn(`  ${url} → ${response.status}`);
      return null;
    }
    const data = await response.json();
    if (data && typeof data === "object" && !Array.isArray(data) && Object.keys(data).length === 0) {
      console.log(`  Stats computing, retry ${i + 1}/${retries}...`);
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    return data as T;
  }
  return null;
}

async function fetchRepoCommits(repo: string): Promise<Commit[]> {
  const commits: Commit[] = [];
  let page = 1;
  const perPage = 100;
  const since = new Date();
  since.setMonth(since.getMonth() - COMMIT_HISTORY_MONTHS);

  while (true) {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/commits?author=${GITHUB_USERNAME}&since=${since.toISOString()}&per_page=${perPage}&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "umer.eu-website",
        },
      }
    );

    if (!response.ok) {
      console.error(`  Failed: ${repo} → ${response.status}`);
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

  return commits;
}

// --- Main ---
async function main() {
  console.log("Fetching GitHub activity data...\n");

  // 1. Commits
  console.log("→ Fetching commits from", TRACKED_REPOS.length, "repos");
  const allCommitsArrays = await Promise.all(TRACKED_REPOS.map((r) => fetchRepoCommits(r)));
  const allCommits = allCommitsArrays.flat().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const commitsByDate: Record<string, Commit[]> = {};
  for (const commit of allCommits) {
    const dateKey = new Date(commit.date).toISOString().split("T")[0];
    if (!commitsByDate[dateKey]) commitsByDate[dateKey] = [];
    commitsByDate[dateKey].push(commit);
  }
  console.log(`  ${allCommits.length} commits across ${Object.keys(commitsByDate).length} days\n`);

  // 2. Punch card
  console.log("→ Fetching punch card data");
  const punchMerged: Record<string, number> = {};
  for (const repo of TRACKED_REPOS) {
    const data = await fetchWithRetry<PunchCardEntry[]>(`https://api.github.com/repos/${repo}/stats/punch_card`);
    if (data) for (const [d, h, c] of data) punchMerged[`${d}-${h}`] = (punchMerged[`${d}-${h}`] || 0) + c;
  }
  const punchCard: PunchCardEntry[] = [];
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) punchCard.push([d, h, punchMerged[`${d}-${h}`] || 0]);

  // 3. Commit activity
  console.log("→ Fetching commit activity");
  const actMerged: Record<number, WeeklyActivity> = {};
  for (const repo of TRACKED_REPOS) {
    const data = await fetchWithRetry<WeeklyActivity[]>(`https://api.github.com/repos/${repo}/stats/commit_activity`);
    if (data) {
      for (const w of data) {
        if (!actMerged[w.week]) actMerged[w.week] = { week: w.week, total: 0, days: [0, 0, 0, 0, 0, 0, 0] };
        actMerged[w.week].total += w.total;
        for (let i = 0; i < 7; i++) actMerged[w.week].days[i] += w.days[i];
      }
    }
  }
  const weeklyActivity = Object.values(actMerged).sort((a, b) => a.week - b.week);

  // 4. Code frequency
  console.log("→ Fetching code frequency");
  const freqMerged: Record<number, [number, number]> = {};
  for (const repo of TRACKED_REPOS) {
    const data = await fetchWithRetry<CodeFrequencyEntry[]>(`https://api.github.com/repos/${repo}/stats/code_frequency`);
    if (data) {
      for (const [ts, a, d] of data) {
        if (!freqMerged[ts]) freqMerged[ts] = [0, 0];
        freqMerged[ts][0] += a;
        freqMerged[ts][1] += d;
      }
    }
  }
  const codeFrequency: CodeFrequencyEntry[] = Object.entries(freqMerged)
    .map(([ts, [a, d]]) => [Number(ts), a, d] as CodeFrequencyEntry)
    .sort((a, b) => a[0] - b[0]);

  // 5. Languages
  console.log("→ Fetching languages");
  const languages: Languages = {};
  for (const repo of TRACKED_REPOS) {
    const data = await fetchWithRetry<Languages>(`https://api.github.com/repos/${repo}/languages`);
    if (data) for (const [lang, bytes] of Object.entries(data)) languages[lang] = (languages[lang] || 0) + bytes;
  }

  // 6. Compute analytics
  console.log("\n→ Computing analytics");
  const dates = Object.keys(commitsByDate).sort();
  const totalCommits = allCommits.length;
  const activeDays = dates.length;

  let currentStreak = 0;
  let longestStreak = 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const sortedDesc = [...dates].sort((a, b) => b.localeCompare(a));
  if (sortedDesc.length > 0) {
    const last = new Date(sortedDesc[0]); last.setHours(0, 0, 0, 0);
    if (Math.floor((today.getTime() - last.getTime()) / 86400000) <= 1) {
      currentStreak = 1;
      for (let i = 1; i < sortedDesc.length; i++) {
        const diff = Math.floor((new Date(sortedDesc[i - 1]).getTime() - new Date(sortedDesc[i]).getTime()) / 86400000);
        if (diff === 1) currentStreak++; else break;
      }
    }
  }

  const sortedAsc = [...dates].sort();
  let streak = 1;
  longestStreak = dates.length > 0 ? 1 : 0;
  for (let i = 1; i < sortedAsc.length; i++) {
    const diff = Math.floor((new Date(sortedAsc[i]).getTime() - new Date(sortedAsc[i - 1]).getTime()) / 86400000);
    if (diff === 1) { streak++; longestStreak = Math.max(longestStreak, streak); }
    else streak = 1;
  }

  const weekSpan = dates.length > 1
    ? Math.max(1, Math.ceil((new Date(sortedAsc[sortedAsc.length - 1]).getTime() - new Date(sortedAsc[0]).getTime()) / (7 * 86400000)))
    : 1;

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayTotals = [0, 0, 0, 0, 0, 0, 0];
  for (const c of allCommits) dayTotals[new Date(c.date).getDay()]++;

  const commitsByRepo: Record<string, number> = {};
  for (const c of allCommits) commitsByRepo[c.repo] = (commitsByRepo[c.repo] || 0) + 1;

  const typePatterns: [string, RegExp][] = [
    ["Add", /^add\b/i], ["Fix", /^fix\b/i], ["Update", /^update\b/i],
    ["Refactor", /^refactor\b/i], ["Remove", /^(remove|delete)\b/i],
    ["Docs", /^(docs?|readme)\b/i], ["Style", /^(style|css|design|redesign|ui)\b/i],
    ["Test", /^test\b/i], ["Chore", /^(chore|bump|merge|release)\b/i],
    ["Feat", /^feat\b/i], ["Implement", /^implement\b/i], ["Improve", /^improve\b/i],
    ["Init", /^(init|initial|setup|scaffold)\b/i], ["Config", /^(config|configure|set)\b/i],
  ];
  const commitTypes: Record<string, number> = {};
  for (const c of allCommits) {
    let matched = false;
    for (const [type, pat] of typePatterns) {
      if (pat.test(c.message)) { commitTypes[type] = (commitTypes[type] || 0) + 1; matched = true; break; }
    }
    if (!matched) commitTypes["Other"] = (commitTypes["Other"] || 0) + 1;
  }

  // 7. Write cache
  const output = {
    commitsByDate,
    analytics: {
      stats: {
        totalCommits, activeDays, currentStreak, longestStreak,
        avgPerWeek: Math.round((totalCommits / weekSpan) * 10) / 10,
        busiestDay: dayNames[dayTotals.indexOf(Math.max(...dayTotals))] || "N/A",
        firstCommitDate: sortedAsc[0] || "",
        lastCommitDate: sortedAsc[sortedAsc.length - 1] || "",
      },
      commitsByRepo, commitTypes, punchCard, weeklyActivity, codeFrequency, languages,
    },
    fetchedAt: new Date().toISOString(),
  };

  const outPath = path.join(ROOT, "src", "data", "activity-cache.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output));

  const sizeKB = Math.round(fs.statSync(outPath).size / 1024);
  console.log(`\n✓ Wrote ${outPath} (${sizeKB} KB)`);
  console.log(`  ${totalCommits} commits, ${activeDays} active days, ${Object.keys(languages).length} languages`);
}

main().catch((e) => { console.error(e); process.exit(1); });
