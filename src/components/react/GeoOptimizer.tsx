"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = "https://aiseo-geo-api.fly.dev";

interface OptimizationResult {
  job_id: string;
  status: string;
  original_score?: number;
  optimized_score?: number;
  improvement?: number;
  optimized_content?: string;
  error?: string;
  workflow_steps?: Array<{
    step: string;
    status: string;
    details?: string;
  }>;
}

interface PageAudit {
  url: string;
  title: string;
  word_count: number;
  issues: Array<{ category: string; issue: string }>;
  scores: Record<string, number>;
  recommendations: string[];
}

interface AuditResult {
  url: string;
  pages_audited: number;
  overall_score: number;
  summary: {
    total_words: number;
    total_issues: number;
    avg_scores: Record<string, number>;
    lowest_scoring_area: string;
    highest_scoring_area: string;
  };
  top_issues: string[];
  top_recommendations: string[];
  pages: PageAudit[];
  audit_time_ms: number;
}

const WORKFLOW_STEPS = [
  { id: "crawl", label: "Crawling URL", icon: "🕷️" },
  { id: "classify", label: "Detecting Industry", icon: "🎯" },
  { id: "chunk", label: "Chunking Content", icon: "📄" },
  { id: "retrieve", label: "Fetching Guidelines", icon: "📚" },
  { id: "optimize", label: "Optimizing Content", icon: "⚡" },
  { id: "humanize", label: "Humanizing Text", icon: "✨" },
  { id: "complete", label: "Complete", icon: "✅" },
];

const SCORE_CATEGORIES = {
  citations: { label: "Citations", icon: "📎" },
  statistics: { label: "Statistics", icon: "📊" },
  structure: { label: "Structure", icon: "📝" },
  faq: { label: "FAQ", icon: "❓" },
  summary: { label: "Summary", icon: "📋" },
  readability: { label: "Readability", icon: "👁️" },
};

export function GeoOptimizer() {
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [expandedPage, setExpandedPage] = useState<number | null>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const clearPoll = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  };

  useEffect(() => {
    return () => clearPoll();
  }, []);

  const pollStatus = async (jobId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v2/jobs/${jobId}`);
      const data = await response.json();

      if (data.status === "completed") {
        clearPoll();
        const resultsResponse = await fetch(`${API_URL}/api/v2/results/${jobId}`);
        const resultsData = await resultsResponse.json();

        setResult({
          job_id: data.job_id,
          status: data.status,
          original_score: data.original_geo_score,
          optimized_score: data.optimized_geo_score,
          improvement: ((data.optimized_geo_score - data.original_geo_score) / data.original_geo_score) * 100,
          optimized_content: resultsData.final_markdown,
        });
        setCurrentStep(WORKFLOW_STEPS.length - 1);
        setIsLoading(false);
        setShowResult(true);
      } else if (data.status === "failed") {
        clearPoll();
        setError(data.error_message || "Optimization failed");
        setIsLoading(false);
      } else {
        const totalChunks = data.total_chunks || 2;
        const completedChunks = data.completed_chunks || 0;

        if (data.industry) {
          if (completedChunks > 0) {
            const progress = Math.min(3 + Math.floor((completedChunks / totalChunks) * 3), WORKFLOW_STEPS.length - 2);
            setCurrentStep(progress);
          } else {
            setCurrentStep(2);
          }
        } else {
          setCurrentStep((prev) => Math.min(prev + 1, 1));
        }
      }
    } catch (err) {
      console.error("Poll error:", err);
    }
  };

  const handleAudit = async () => {
    if (!url.trim()) return;

    setIsAuditing(true);
    setError(null);
    setAuditResult(null);
    setResult(null);
    setShowResult(false);
    setShowAudit(false);

    try {
      const response = await fetch(`${API_URL}/api/v2/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), max_pages: maxPages }),
      });

      if (!response.ok) {
        throw new Error("Failed to audit website");
      }

      const data = await response.json();
      setAuditResult(data);
      setShowAudit(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleOptimize = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setAuditResult(null);
    setCurrentStep(0);
    setShowResult(false);
    setShowAudit(false);
    clearPoll();

    try {
      const response = await fetch(`${API_URL}/api/v2/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), max_pages: maxPages }),
      });

      if (!response.ok) {
        throw new Error("Failed to start optimization");
      }

      const data = await response.json();
      const jobId = data.job_id;

      pollInterval.current = setInterval(() => pollStatus(jobId), 3000);
      pollStatus(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 7) return "text-success";
    if (score >= 4) return "text-warning";
    return "text-error";
  };

  const getScoreBg = (score: number) => {
    if (score >= 7) return "bg-success/10 border-success/20";
    if (score >= 4) return "bg-warning/10 border-warning/20";
    return "bg-error/10 border-error/20";
  };

  return (
    <div className="w-full">
      {/* Input Form */}
      <form onSubmit={handleOptimize} className="mb-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter website URL..."
            className="flex-1 px-4 py-3 bg-base-200/50 border border-base-300 rounded-xl text-base-content placeholder:text-base-content/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            disabled={isLoading || isAuditing}
            required
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAudit}
              disabled={isLoading || isAuditing || !url.trim()}
              className="px-5 py-3 border border-base-300 text-base-content font-medium rounded-xl hover:bg-base-200/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isAuditing ? (
                <>
                  <span className="w-4 h-4 border-2 border-base-content/30 border-t-base-content rounded-full animate-spin" />
                  Auditing
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Audit
                </>
              )}
            </button>
            <button
              type="submit"
              disabled={isLoading || isAuditing || !url.trim()}
              className="px-5 py-3 bg-base-content text-base-100 font-medium rounded-xl hover:bg-base-content/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-base-100/30 border-t-base-100 rounded-full animate-spin" />
                  Optimizing
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Optimize
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pages to Crawl Slider */}
        <div className="flex items-center gap-4 px-1">
          <span className="text-sm text-base-content/60 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Pages to crawl:
          </span>
          <input
            type="range"
            min="1"
            max="10"
            value={maxPages}
            onChange={(e) => setMaxPages(parseInt(e.target.value))}
            disabled={isLoading || isAuditing}
            className="flex-1 h-2 bg-base-300 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span className="text-sm font-medium text-primary w-6 text-center">{maxPages}</span>
        </div>
      </form>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audit Results */}
      <AnimatePresence>
        {showAudit && auditResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Overall Score */}
            <div className={`p-6 rounded-xl border ${getScoreBg(auditResult.overall_score)}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-base-content">GEO Audit Report</h3>
                  <p className="text-sm text-base-content/60">
                    {auditResult.pages_audited} page(s) analyzed in {(auditResult.audit_time_ms / 1000).toFixed(1)}s
                  </p>
                </div>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(auditResult.overall_score)}`}>
                    {auditResult.overall_score}/10
                  </div>
                  <div className="text-xs text-base-content/50">Overall Score</div>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                {Object.entries(auditResult.summary.avg_scores).map(([key, score]) => (
                  <div key={key} className="text-center p-2 bg-base-100/50 rounded-lg">
                    <div className="text-lg mb-1">{SCORE_CATEGORIES[key as keyof typeof SCORE_CATEGORIES]?.icon || "📌"}</div>
                    <div className={`text-sm font-bold ${getScoreColor(score)}`}>{score.toFixed(1)}</div>
                    <div className="text-[10px] text-base-content/50">{SCORE_CATEGORIES[key as keyof typeof SCORE_CATEGORIES]?.label || key}</div>
                  </div>
                ))}
              </div>

              <div className="text-xs text-base-content/60">
                <span className="text-error">Weakest:</span> {auditResult.summary.lowest_scoring_area} |{" "}
                <span className="text-success">Strongest:</span> {auditResult.summary.highest_scoring_area}
              </div>
            </div>

            {/* Top Issues */}
            {auditResult.top_issues.length > 0 && (
              <div className="p-4 bg-error/5 border border-error/20 rounded-xl">
                <h4 className="font-medium text-error mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Issues Found
                </h4>
                <ul className="space-y-2">
                  {auditResult.top_issues.map((issue, idx) => (
                    <li key={idx} className="text-sm text-base-content/70 flex items-start gap-2">
                      <span className="text-error mt-0.5">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Top Recommendations */}
            {auditResult.top_recommendations.length > 0 && (
              <div className="p-4 bg-success/5 border border-success/20 rounded-xl">
                <h4 className="font-medium text-success mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Recommendations
                </h4>
                <ul className="space-y-2">
                  {auditResult.top_recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-base-content/70 flex items-start gap-2">
                      <span className="text-success mt-0.5">✓</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Per-Page Breakdown */}
            <div className="space-y-3">
              <h4 className="font-medium text-base-content">Page-by-Page Analysis</h4>
              {auditResult.pages.map((page, idx) => (
                <div key={idx} className="border border-base-300/50 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedPage(expandedPage === idx ? null : idx)}
                    className="w-full p-4 flex items-center justify-between hover:bg-base-200/30 transition-colors"
                  >
                    <div className="flex-1 text-left">
                      <div className="font-medium text-base-content text-sm truncate max-w-[300px]">
                        {page.title}
                      </div>
                      <div className="text-xs text-base-content/50 truncate max-w-[400px]">
                        {page.url}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-base-content/50">{page.word_count} words</div>
                        <div className="text-xs text-error">{page.issues.length} issues</div>
                      </div>
                      <svg
                        className={`w-4 h-4 text-base-content/50 transition-transform ${expandedPage === idx ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {expandedPage === idx && (
                    <div className="p-4 border-t border-base-300/50 bg-base-200/20">
                      {/* Page Scores */}
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                        {Object.entries(page.scores).map(([key, score]) => (
                          <div key={key} className="text-center p-2 bg-base-100/50 rounded-lg">
                            <div className={`text-sm font-bold ${getScoreColor(score)}`}>{score.toFixed(1)}</div>
                            <div className="text-[10px] text-base-content/50">{SCORE_CATEGORIES[key as keyof typeof SCORE_CATEGORIES]?.label || key}</div>
                          </div>
                        ))}
                      </div>

                      {/* Page Issues */}
                      {page.issues.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs font-medium text-base-content/70 mb-2">Issues:</div>
                          <div className="flex flex-wrap gap-2">
                            {page.issues.map((issue, iIdx) => (
                              <span key={iIdx} className="px-2 py-1 text-xs bg-error/10 text-error rounded-lg">
                                {issue.issue}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Page Recommendations */}
                      {page.recommendations.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-base-content/70 mb-2">Recommendations:</div>
                          <ul className="space-y-1">
                            {page.recommendations.map((rec, rIdx) => (
                              <li key={rIdx} className="text-xs text-base-content/60 flex items-start gap-1">
                                <span className="text-success">→</span> {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleOptimize}
                disabled={isLoading}
                className="flex-1 py-3 bg-base-content text-base-100 font-medium rounded-xl hover:bg-base-content/90 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Fix These Issues - Optimize Now
              </button>
              <button
                onClick={() => {
                  setUrl("");
                  setAuditResult(null);
                  setShowAudit(false);
                }}
                className="px-6 py-3 border border-base-300 rounded-xl text-base-content/70 hover:bg-base-200/50 transition-all"
              >
                New URL
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Steps */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8"
          >
            <div className="p-6 bg-base-200/30 border border-base-300/50 rounded-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                  <span className="text-lg">{WORKFLOW_STEPS[currentStep]?.icon}</span>
                </div>
                <div>
                  <h3 className="font-medium text-base-content">
                    {WORKFLOW_STEPS[currentStep]?.label}
                  </h3>
                  <p className="text-xs text-base-content/50">
                    Step {currentStep + 1} of {WORKFLOW_STEPS.length}
                  </p>
                </div>
              </div>

              <div className="flex gap-1">
                {WORKFLOW_STEPS.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                      index <= currentStep ? "bg-primary" : "bg-base-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optimization Results */}
      <AnimatePresence>
        {showResult && result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Score Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-base-200/30 border border-base-300/50 rounded-xl text-center">
                <div className="text-2xl font-bold text-base-content">
                  {result.original_score?.toFixed(1) || "N/A"}
                </div>
                <div className="text-xs text-base-content/50 mt-1">Original Score</div>
              </div>
              <div className="p-4 bg-base-200/30 border border-base-300/50 rounded-xl text-center">
                <div className="text-2xl font-bold text-success">
                  {result.optimized_score?.toFixed(1) || "N/A"}
                </div>
                <div className="text-xs text-base-content/50 mt-1">Optimized Score</div>
              </div>
              <div className="p-4 bg-success/10 border border-success/20 rounded-xl text-center">
                <div className="text-2xl font-bold text-success">
                  +{result.improvement?.toFixed(0) || 0}%
                </div>
                <div className="text-xs text-success/70 mt-1">Improvement</div>
              </div>
            </div>

            {/* Optimized Content */}
            {result.optimized_content && (
              <div className="p-4 bg-base-200/30 border border-base-300/50 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-base-content">Optimized Content</h3>
                  <button
                    onClick={() => copyToClipboard(result.optimized_content || "")}
                    className="px-3 py-1.5 text-xs font-medium bg-base-300/50 hover:bg-base-300 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </button>
                </div>
                <div className="prose prose-sm max-w-none max-h-96 overflow-y-auto p-4 bg-[#1b1b1f] rounded-lg text-gray-300 font-mono text-xs whitespace-pre-wrap">
                  {result.optimized_content}
                </div>
              </div>
            )}

            {/* Try Another */}
            <button
              onClick={() => {
                setUrl("");
                setResult(null);
                setShowResult(false);
                setCurrentStep(0);
              }}
              className="w-full py-3 border border-base-300 rounded-xl text-base-content/70 hover:bg-base-200/50 hover:text-base-content transition-all text-sm font-medium"
            >
              Optimize Another URL
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
