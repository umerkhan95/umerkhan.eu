import { TRACKED_REPOS, GITHUB_USERNAME, COMMIT_HISTORY_MONTHS } from "../config/repos";

export interface Commit {
  sha: string;
  message: string;
  date: string;
  repo: string;
  repoUrl: string;
  url: string;
  additions?: number;
  deletions?: number;
  filesChanged?: number;
}

export interface CommitsByDate {
  [date: string]: Commit[];
}

async function fetchRepoCommits(
  repo: string,
  token: string,
  since: string
): Promise<Commit[]> {
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
            "User-Agent": "umer.eu-website",
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
          message: commit.commit.message.split("\n")[0], // First line only
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

export async function fetchAllCommits(): Promise<CommitsByDate> {
  const token = import.meta.env.GITHUB_TOKEN;

  if (!token) {
    console.error("GITHUB_TOKEN not found in environment variables");
    return {};
  }

  if (TRACKED_REPOS.length === 0) {
    console.warn("No repos configured in src/config/repos.ts");
    return {};
  }

  // Calculate date 3 months ago
  const since = new Date();
  since.setMonth(since.getMonth() - COMMIT_HISTORY_MONTHS);
  const sinceISO = since.toISOString();

  // Fetch commits from all repos in parallel
  const allCommitsArrays = await Promise.all(
    TRACKED_REPOS.map((repo) => fetchRepoCommits(repo, token, sinceISO))
  );

  // Flatten and sort by date (newest first)
  const allCommits = allCommitsArrays
    .flat()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group by date
  const commitsByDate: CommitsByDate = {};

  for (const commit of allCommits) {
    const dateKey = new Date(commit.date).toISOString().split("T")[0];
    if (!commitsByDate[dateKey]) {
      commitsByDate[dateKey] = [];
    }
    commitsByDate[dateKey].push(commit);
  }

  return commitsByDate;
}

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
