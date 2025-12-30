"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = "https://aiseo-geo-api.fly.dev";

interface ShowcaseWebsite {
  job_id: string;
  url: string;
  industry: string | null;
  industry_confidence: number;
  original_score: number;
  optimized_score: number;
  improvement_pct: number;
  chunks_processed: number;
  optimized_at: string;
}

interface ShowcaseData {
  total: number;
  websites: ShowcaseWebsite[];
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function GeoShowcase() {
  const [data, setData] = useState<ShowcaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShowcase = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v2/showcase?limit=20`);
        if (!response.ok) throw new Error("Failed to fetch");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError("Failed to load showcase");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchShowcase();
    // Refresh every 30 seconds
    const interval = setInterval(fetchShowcase, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-base-content/20 border-t-base-content rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12 text-base-content/50">
        <p>{error || "No data available"}</p>
      </div>
    );
  }

  if (data.total === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-base-content/50">No websites optimized yet. Be the first!</p>
      </div>
    );
  }

  // Calculate stats
  const avgOptimized = data.websites.reduce((acc, w) => acc + w.optimized_score, 0) / data.total;
  const avgImprovement = data.websites.reduce((acc, w) => acc + w.improvement_pct, 0) / data.total;

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-base-200/30 border border-base-300/50 rounded-xl text-center">
          <div className="text-2xl font-bold text-base-content">{data.total}</div>
          <div className="text-xs text-base-content/50 mt-1">Websites</div>
        </div>
        <div className="p-4 bg-base-200/30 border border-base-300/50 rounded-xl text-center">
          <div className="text-2xl font-bold text-success">{avgOptimized.toFixed(1)}</div>
          <div className="text-xs text-base-content/50 mt-1">Avg. Score</div>
        </div>
        <div className="p-4 bg-success/10 border border-success/20 rounded-xl text-center">
          <div className="text-2xl font-bold text-success">+{avgImprovement.toFixed(0)}%</div>
          <div className="text-xs text-success/70 mt-1">Avg. Improvement</div>
        </div>
      </div>

      {/* Website List */}
      <div className="space-y-3">
        <AnimatePresence>
          {data.websites.map((website, index) => (
            <motion.div
              key={website.job_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 bg-base-200/30 border border-base-300/50 rounded-xl hover:border-base-300 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <a
                      href={website.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-base-content hover:text-primary transition-colors truncate"
                    >
                      {extractDomain(website.url)}
                    </a>
                    {website.industry && (
                      <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                        {website.industry}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-base-content/50">
                    <span>{website.chunks_processed} sections</span>
                    <span>{formatDate(website.optimized_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <div className="text-sm">
                      <span className="text-base-content/50">{website.original_score.toFixed(1)}</span>
                      <span className="text-base-content/30 mx-1">→</span>
                      <span className="font-medium text-success">{website.optimized_score.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-success/10 text-success text-xs font-medium rounded">
                    +{website.improvement_pct.toFixed(0)}%
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
