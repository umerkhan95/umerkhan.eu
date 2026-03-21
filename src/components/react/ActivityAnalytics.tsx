"use client";

import { motion } from "framer-motion";
import type { AnalyticsData } from "../../lib/github";

interface Props {
  data: AnalyticsData;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] },
  }),
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="p-4 bg-base-200/30 rounded-xl border border-base-300/30">
      <div className="text-2xl font-bold text-base-content tracking-tight">{value}</div>
      <div className="text-xs text-base-content/50 mt-1">{label}</div>
      {sub && <div className="text-[10px] text-base-content/30 mt-0.5">{sub}</div>}
    </div>
  );
}

function StatsCards({ stats }: { stats: AnalyticsData["stats"] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard label="Total Commits" value={stats.totalCommits} />
      <StatCard label="Active Days" value={stats.activeDays} />
      <StatCard label="Current Streak" value={`${stats.currentStreak}d`} sub={`Longest: ${stats.longestStreak}d`} />
      <StatCard label="Avg / Week" value={stats.avgPerWeek} sub={`Busiest: ${stats.busiestDay}`} />
    </div>
  );
}

function ContributionHeatmap({ weeklyActivity }: { weeklyActivity: AnalyticsData["weeklyActivity"] }) {
  // Build a day-level map from the weekly activity data
  const dayMap: Record<string, number> = {};
  for (const week of weeklyActivity) {
    const weekStart = new Date(week.week * 1000);
    for (let d = 0; d < 7; d++) {
      if (week.days[d] > 0) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + d);
        const key = date.toISOString().split("T")[0];
        dayMap[key] = (dayMap[key] || 0) + week.days[d];
      }
    }
  }

  const maxCommits = Math.max(1, ...Object.values(dayMap));

  // Build 52 weeks of data ending at current week
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + (6 - dayOfWeek)); // Go to Saturday
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (52 * 7 - 1));

  const weeks: { date: string; count: number }[][] = [];
  let currentDate = new Date(startDate);

  for (let w = 0; w < 52; w++) {
    const week: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const key = currentDate.toISOString().split("T")[0];
      week.push({ date: key, count: dayMap[key] || 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(week);
  }

  function getColor(count: number): string {
    if (count === 0) return "bg-base-300/30";
    const intensity = count / maxCommits;
    if (intensity <= 0.25) return "bg-emerald-500/30";
    if (intensity <= 0.5) return "bg-emerald-500/50";
    if (intensity <= 0.75) return "bg-emerald-500/70";
    return "bg-emerald-500";
  }

  const monthLabels: { label: string; col: number }[] = [];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let lastMonth = -1;
  for (let w = 0; w < weeks.length; w++) {
    const month = new Date(weeks[w][0].date).getMonth();
    if (month !== lastMonth) {
      monthLabels.push({ label: months[month], col: w });
      lastMonth = month;
    }
  }

  // cell size + gap
  const cellSize = 10;
  const gap = 3;
  const step = cellSize + gap;

  return (
    <div className="space-y-2 overflow-x-auto">
      <div style={{ position: "relative", paddingLeft: 28, paddingTop: 16 }}>
        {/* Month labels — positioned absolutely above each week column */}
        {monthLabels.map((m, i) => (
          <div
            key={i}
            className="text-[10px] text-base-content/30"
            style={{
              position: "absolute",
              top: 0,
              left: 28 + m.col * step,
            }}
          >
            {m.label}
          </div>
        ))}

        {/* Day labels — positioned absolutely to left of each row */}
        {["Mon", "Wed", "Fri"].map((label, i) => (
          <div
            key={label}
            className="text-[10px] text-base-content/30"
            style={{
              position: "absolute",
              left: 0,
              top: 16 + (1 + i * 2) * step,
              height: cellSize,
              display: "flex",
              alignItems: "center",
            }}
          >
            {label}
          </div>
        ))}

        {/* Grid */}
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`w-[10px] h-[10px] rounded-[2px] ${getColor(day.count)} transition-colors`}
                  title={`${day.date}: ${day.count} commit${day.count !== 1 ? "s" : ""}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 text-[10px] text-base-content/30" style={{ paddingLeft: 28 }}>
        <span>Less</span>
        <div className="w-[10px] h-[10px] rounded-[2px] bg-base-300/30" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-emerald-500/30" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-emerald-500/50" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-emerald-500/70" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-emerald-500" />
        <span>More</span>
      </div>
    </div>
  );
}

function CodingHours({ punchCard }: { punchCard: AnalyticsData["punchCard"] }) {
  const maxCommits = Math.max(1, ...punchCard.map((e) => e[2]));
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function getOpacity(count: number): number {
    if (count === 0) return 0;
    return 0.15 + (count / maxCommits) * 0.85;
  }

  // Build grid: 7 rows (days) x 24 cols (hours)
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const [day, hour, commits] of punchCard) {
    grid[day][hour] = commits;
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        {/* Hour labels */}
        <div className="flex gap-[2px] ml-10 mb-1">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="w-[14px] text-center text-[9px] text-base-content/25">
              {h % 3 === 0 ? `${h}` : ""}
            </div>
          ))}
        </div>

        {/* Grid */}
        {grid.map((row, dayIdx) => (
          <div key={dayIdx} className="flex items-center gap-[2px] mb-[2px]">
            <div className="w-10 text-right text-[10px] text-base-content/30 pr-2">
              {dayLabels[dayIdx]}
            </div>
            {row.map((count, hourIdx) => (
              <div
                key={hourIdx}
                className="w-[14px] h-[14px] rounded-[2px] transition-colors"
                style={{
                  backgroundColor: count > 0
                    ? `oklch(0.72 0.19 163 / ${getOpacity(count)})`
                    : "oklch(0.5 0 0 / 0.08)",
                }}
                title={`${dayLabels[dayIdx]} ${hourIdx}:00 — ${count} commit${count !== 1 ? "s" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function LanguageBreakdown({ languages }: { languages: AnalyticsData["languages"] }) {
  const total = Object.values(languages).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const sorted = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500",
    "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-pink-500",
  ];

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-[2px]">
        {sorted.map(([lang, bytes], i) => (
          <div
            key={lang}
            className={`${colors[i]} rounded-full transition-all`}
            style={{ width: `${(bytes / total) * 100}%` }}
            title={`${lang}: ${((bytes / total) * 100).toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Labels */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {sorted.map(([lang, bytes], i) => (
          <div key={lang} className="flex items-center gap-1.5 text-xs text-base-content/60">
            <div className={`w-2.5 h-2.5 rounded-full ${colors[i]}`} />
            <span>{lang}</span>
            <span className="text-base-content/30">{((bytes / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyTrend({ weeklyActivity }: { weeklyActivity: AnalyticsData["weeklyActivity"] }) {
  if (weeklyActivity.length === 0) return null;
  const maxCommits = Math.max(1, ...weeklyActivity.map((w) => w.total));

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-[3px] h-20">
        {weeklyActivity.map((week, i) => {
          const height = week.total > 0 ? Math.max(4, (week.total / maxCommits) * 100) : 0;
          const date = new Date(week.week * 1000);
          const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return (
            <div
              key={i}
              className="flex-1 min-w-0 rounded-t-sm transition-colors hover:opacity-80"
              style={{
                height: `${height}%`,
                backgroundColor: week.total > 0
                  ? "oklch(0.72 0.19 163 / 0.6)"
                  : "oklch(0.5 0 0 / 0.05)",
              }}
              title={`Week of ${label}: ${week.total} commit${week.total !== 1 ? "s" : ""}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-base-content/25">
        <span>{new Date(weeklyActivity[0].week * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
        <span>{new Date(weeklyActivity[weeklyActivity.length - 1].week * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
      </div>
    </div>
  );
}

function CommitTypes({ commitTypes }: { commitTypes: AnalyticsData["commitTypes"] }) {
  const sorted = Object.entries(commitTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const max = Math.max(1, ...sorted.map(([, v]) => v));
  const total = sorted.reduce((a, [, v]) => a + v, 0);

  return (
    <div className="space-y-2">
      {sorted.map(([type, count]) => (
        <div key={type} className="flex items-center gap-3">
          <div className="w-16 text-xs text-base-content/50 text-right shrink-0">{type}</div>
          <div className="flex-1 h-5 bg-base-300/20 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(count / max) * 100}%`,
                backgroundColor: "oklch(0.72 0.19 163 / 0.5)",
              }}
            />
          </div>
          <div className="w-12 text-xs text-base-content/30 text-right shrink-0">
            {count} <span className="text-[10px]">({((count / total) * 100).toFixed(0)}%)</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CommitsByRepo({ commitsByRepo }: { commitsByRepo: AnalyticsData["commitsByRepo"] }) {
  const sorted = Object.entries(commitsByRepo).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((a, [, v]) => a + v, 0);
  const max = Math.max(1, ...sorted.map(([, v]) => v));

  return (
    <div className="space-y-2">
      {sorted.map(([repo, count]) => (
        <div key={repo} className="flex items-center gap-3">
          <div className="w-32 text-xs text-base-content/50 text-right shrink-0 truncate font-mono">{repo}</div>
          <div className="flex-1 h-5 bg-base-300/20 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(count / max) * 100}%`,
                backgroundColor: "oklch(0.65 0.19 250 / 0.5)",
              }}
            />
          </div>
          <div className="w-12 text-xs text-base-content/30 text-right shrink-0">
            {count} <span className="text-[10px]">({((count / total) * 100).toFixed(0)}%)</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CodeFrequencyChart({ codeFrequency }: { codeFrequency: AnalyticsData["codeFrequency"] }) {
  // Show last 52 weeks
  const recent = codeFrequency.slice(-52);
  if (recent.length === 0) return null;

  const maxVal = Math.max(
    1,
    ...recent.map(([, a, d]) => Math.max(a, Math.abs(d)))
  );

  const totalAdded = recent.reduce((a, [, adds]) => a + adds, 0);
  const totalDeleted = recent.reduce((a, [,, dels]) => a + Math.abs(dels), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-base-content/40 mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          <span>+{totalAdded.toLocaleString()} added</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
          <span>-{totalDeleted.toLocaleString()} deleted</span>
        </div>
      </div>
      <div className="flex items-center gap-[2px] h-16">
        {recent.map(([ts, additions, deletions], i) => {
          const addHeight = (additions / maxVal) * 100;
          const delHeight = (Math.abs(deletions) / maxVal) * 100;
          const date = new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return (
            <div key={i} className="flex-1 min-w-0 flex flex-col items-center justify-center h-full gap-[1px]"
              title={`Week of ${date}: +${additions} / ${deletions}`}
            >
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-sm bg-emerald-500/50"
                  style={{ height: `${Math.max(addHeight > 0 ? 2 : 0, addHeight)}%` }}
                />
              </div>
              <div className="w-full flex-1 flex items-start">
                <div
                  className="w-full rounded-b-sm bg-rose-500/40"
                  style={{ height: `${Math.max(delHeight > 0 ? 2 : 0, delHeight)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-base-content/25">
        <span>{new Date(recent[0][0] * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
        <span>{new Date(recent[recent.length - 1][0] * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
      </div>
    </div>
  );
}

export function ActivityAnalytics({ data }: Props) {
  return (
    <div className="space-y-0">
      {/* Stats Cards */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
        <StatsCards stats={data.stats} />
      </motion.div>

      <div className="w-full h-px bg-base-300/50 my-10" />

      {/* Contribution Heatmap */}
      <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-medium text-base-content">Contributions</h3>
            <span className="text-xs text-base-content/30">last 52 weeks</span>
          </div>
          <ContributionHeatmap weeklyActivity={data.weeklyActivity} />
        </div>
      </motion.div>

      <div className="w-full h-px bg-base-300/50 my-10" />

      {/* Weekly Trend */}
      <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-medium text-base-content">Weekly Activity</h3>
            <span className="text-xs text-base-content/30">commits per week</span>
          </div>
          <WeeklyTrend weeklyActivity={data.weeklyActivity} />
        </div>
      </motion.div>

      <div className="w-full h-px bg-base-300/50 my-10" />

      {/* Code Frequency */}
      {data.codeFrequency.length > 0 && (
        <>
          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <h3 className="text-sm font-medium text-base-content">Code Frequency</h3>
                <span className="text-xs text-base-content/30">additions & deletions</span>
              </div>
              <CodeFrequencyChart codeFrequency={data.codeFrequency} />
            </div>
          </motion.div>
          <div className="w-full h-px bg-base-300/50 my-10" />
        </>
      )}

      {/* Coding Hours */}
      <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible">
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-medium text-base-content">Coding Hours</h3>
            <span className="text-xs text-base-content/30">when commits happen</span>
          </div>
          <CodingHours punchCard={data.punchCard} />
        </div>
      </motion.div>

      <div className="w-full h-px bg-base-300/50 my-10" />

      {/* Two column: Languages + Repos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible">
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <h3 className="text-sm font-medium text-base-content">Languages</h3>
              <span className="text-xs text-base-content/30">by bytes</span>
            </div>
            <LanguageBreakdown languages={data.languages} />
          </div>
        </motion.div>

        <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible">
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <h3 className="text-sm font-medium text-base-content">Repositories</h3>
              <span className="text-xs text-base-content/30">commits per repo</span>
            </div>
            <CommitsByRepo commitsByRepo={data.commitsByRepo} />
          </div>
        </motion.div>
      </div>

      <div className="w-full h-px bg-base-300/50 my-10" />

      {/* Commit Types */}
      <motion.div custom={7} variants={fadeUp} initial="hidden" animate="visible">
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-medium text-base-content">Commit Types</h3>
            <span className="text-xs text-base-content/30">classified by message</span>
          </div>
          <CommitTypes commitTypes={data.commitTypes} />
        </div>
      </motion.div>
    </div>
  );
}
