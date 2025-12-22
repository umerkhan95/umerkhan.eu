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

const WORKFLOW_STEPS = [
  { id: "crawl", label: "Crawling URL", icon: "🕷️" },
  { id: "classify", label: "Detecting Industry", icon: "🎯" },
  { id: "chunk", label: "Chunking Content", icon: "📄" },
  { id: "retrieve", label: "Fetching Guidelines", icon: "📚" },
  { id: "optimize", label: "Optimizing Content", icon: "⚡" },
  { id: "humanize", label: "Humanizing Text", icon: "✨" },
  { id: "complete", label: "Complete", icon: "✅" },
];

export function GeoOptimizer() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showResult, setShowResult] = useState(false);
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
      // Use correct endpoint: /api/v2/jobs/{job_id}
      const response = await fetch(`${API_URL}/api/v2/jobs/${jobId}`);
      const data = await response.json();

      if (data.status === "completed") {
        clearPoll();
        // Fetch full results from /api/v2/results/{job_id}
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
        // Update progress based on chunks completed
        const totalChunks = data.total_chunks || 2;
        const completedChunks = data.completed_chunks || 0;

        if (data.industry) {
          // Industry detected, at least step 2
          if (completedChunks > 0) {
            // Processing chunks
            const progress = Math.min(3 + Math.floor((completedChunks / totalChunks) * 3), WORKFLOW_STEPS.length - 2);
            setCurrentStep(progress);
          } else {
            setCurrentStep(2); // Chunking
          }
        } else {
          setCurrentStep((prev) => Math.min(prev + 1, 1)); // Crawling/Classifying
        }
      }
    } catch (err) {
      console.error("Poll error:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setCurrentStep(0);
    setShowResult(false);
    clearPoll();

    try {
      const response = await fetch(`${API_URL}/api/v2/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to start optimization");
      }

      const data = await response.json();
      const jobId = data.job_id;

      // Poll for status
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

  return (
    <div className="w-full">
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter website URL to optimize..."
            className="flex-1 px-4 py-3 bg-base-200/50 border border-base-300 rounded-xl text-base-content placeholder:text-base-content/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            disabled={isLoading}
            required
          />
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="px-6 py-3 bg-base-content text-base-100 font-medium rounded-xl hover:bg-base-content/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 min-w-[140px]"
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

      {/* Results */}
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
