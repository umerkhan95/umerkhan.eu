// Single source for role, experience summary and the hand-kept log.

export const role = {
  title: "Forward Deployed Engineer",
  company: "Accenture",
  since: "2026-08-01",
  sinceLabel: "Aug 2026",
};

export const intro =
  "I work with enterprise teams to take AI systems from prototype to production. Alongside that I build products for commerce and maintain open-source tools.";

export interface ExperienceSummary {
  year: string;
  company: string;
  role: string;
  current: boolean;
  summary: string;
}

export const experience: ExperienceSummary[] = [
  { year: "2026", company: "Accenture", role: "Forward Deployed Engineer", current: true, summary: "Embedded with enterprise client teams, taking AI systems from prototype to production." },
  { year: "2025", company: "Bloomers Berlin", role: "Founding Engineer", current: false, summary: "Built AI-powered e-commerce systems, GDPR-compliant RAG pipelines, and automation workflows with LangChain." },
  { year: "2024", company: "Comparado (Idealo)", role: "Data Engineer", current: false, summary: "Standardized ETL pipelines, migrated BI to AWS, and ensured DSA/DMA compliance for the Idealo Group." },
  { year: "2022", company: "CorAI", role: "Cloud Architect", current: false, summary: "Architected a system processing 1M daily news articles with NLP-based categorization and sentiment analysis." },
  { year: "2018", company: "Teradata", role: "Data Engineer", current: false, summary: "Built data pipelines and ETL solutions for major telecom companies including Telenor Pakistan." },
];

export const clients = ["Idealo", "Axel Springer", "Bernstein Group", "NewsCatcher", "Telenor", "Bloomers"];

export type LogKind = "Milestone" | "Shipped" | "Open source";

export interface LogEntry {
  date: string; // YYYY-MM-DD
  kind: LogKind;
  text: string;
  context?: string;
  url?: string;
}

// Newest first. Add a line here when something ships or changes.
export const log: LogEntry[] = [
  {
    date: "2026-11-07",
    kind: "Shipped",
    context: "shopextract",
    text: "Merged fixes for product-page, old-price and comparison defects found in benchmarking",
    url: "https://github.com/umerkhan95/shopextract/pull/104",
  },
  {
    date: "2026-10-25",
    kind: "Shipped",
    context: "shopextract",
    text: "Bounded CLI workflows and operating documentation",
    url: "https://github.com/umerkhan95/shopextract/pull/97",
  },
  {
    date: "2026-08-01",
    kind: "Milestone",
    text: "Joined Accenture as Forward Deployed Engineer",
  },
  {
    date: "2026-04-20",
    kind: "Open source",
    context: "agentscope",
    text: "Fix merged upstream: serialize concurrent writes in AsyncSQLAlchemyMemory",
    url: "https://github.com/agentscope-ai/agentscope/pull/1390",
  },
  {
    date: "2026-03-15",
    kind: "Shipped",
    context: "shopextract",
    text: "Released 0.1.2 on PyPI",
    url: "https://pypi.org/project/shopextract/",
  },
  {
    date: "2026-01-13",
    kind: "Milestone",
    context: "Sigma AI",
    text: "Listed on the Shopify App Store",
    url: "/sigma-ai",
  },
];

// Rotates next to the role line in the hero. Keep entries short; the hero
// keyframes assume exactly four.
export const focus = ["AI Systems", "Open Source", "Products", "Data Platforms"];
