"use client";

import { useState, useEffect } from "react";

const API_URL = "https://aiseo-geo-api.fly.dev";

interface Source {
  title: string;
  authors: string[];
  url: string;
  guidelines_count: number;
}

interface SourcesData {
  total_sources: number;
  total_guidelines: number;
  sources: Source[];
}

export function GeoSources() {
  const [data, setData] = useState<SourcesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v2/guidelines?view=sources`);
        if (!response.ok) throw new Error("Failed to fetch");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError("Failed to load sources");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSources();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-base-content/20 border-t-base-content rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-sm text-base-content/50">
        {error || "No data available"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-base-content/60">
        <strong className="text-base-content">{data.total_guidelines} guidelines</strong> extracted from {data.total_sources} research papers stored in Qdrant for semantic retrieval.
      </p>
      <ul className="space-y-2">
        {data.sources.map((source) => (
          <li key={source.title} className="flex items-start gap-2">
            <span className="text-base-content/30 mt-1">•</span>
            <span>
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base-content hover:text-primary transition-colors"
                >
                  {source.title}
                </a>
              ) : (
                <span className="text-base-content">{source.title}</span>
              )}
              <span className="text-base-content/50 ml-2">
                ({source.guidelines_count})
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
