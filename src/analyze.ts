import {
  allChangedLines,
  countLines,
  DiffFile,
  filePath,
} from "./parse-diff.js";

export type FileCategory =
  | "source"
  | "test"
  | "config"
  | "docs"
  | "assets"
  | "other";

export type RiskLevel = "high" | "medium" | "low";

export interface Risk {
  level: RiskLevel;
  message: string;
  files: string[];
}

export interface FileInsight {
  path: string;
  category: FileCategory;
  added: number;
  removed: number;
  summary: string;
  tags: string[];
}

export interface Analysis {
  files: FileInsight[];
  risks: Risk[];
  totals: { files: number; added: number; removed: number };
  categories: Record<FileCategory, number>;
}

const RISK_RULES: { level: RiskLevel; pattern: RegExp; message: string }[] = [
  { level: "high", pattern: /(?:auth|login|password|secret|token|credential|oauth|jwt|session)/i, message: "Authentication or secrets touched" },
  { level: "high", pattern: /(?:\.env|secrets?\.|credentials)/i, message: "Environment or credential files changed" },
  { level: "high", pattern: /migration/i, message: "Database migration involved" },
  { level: "medium", pattern: /package(-lock)?\.json|pnpm-lock|yarn\.lock|Cargo\.lock|go\.mod/i, message: "Dependency manifest changed" },
  { level: "medium", pattern: /(?:schema|prisma|\.sql)/i, message: "Schema or SQL changed" },
  { level: "medium", pattern: /(?:docker|Dockerfile|compose\.ya?ml|\.github\/workflows)/i, message: "Infrastructure or CI changed" },
  { level: "medium", pattern: /(?:api|route|controller|endpoint|handler)/i, message: "API surface may have changed" },
  { level: "low", pattern: /(?:README|\.md$|docs\/)/i, message: "Documentation updated" },
];

function categorize(path: string): FileCategory {
  const lower = path.toLowerCase();
  if (/\.(md|mdx|rst|txt)$/.test(lower) || lower.includes("/docs/")) return "docs";
  if (/\.(test|spec)\.[jt]sx?$|__tests__|\/tests?\//.test(lower)) return "test";
  if (/\.(png|jpg|svg|gif|ico|woff|mp4)$/.test(lower)) return "assets";
  if (/\.(json|ya?ml|toml|env|config|rc)$|eslint|prettier|tsconfig|vite\.config|dockerfile/i.test(lower)) return "config";
  if (/\.(ts|tsx|js|jsx|py|go|rs|java|rb|php|swift|kt|cs|cpp|c|h|vue|svelte)$/.test(lower)) return "source";
  return "other";
}

function inferSummary(file: DiffFile): { summary: string; tags: string[] } {
  const path = filePath(file);
  const { added, removed } = countLines(file);
  const content = allChangedLines(file);
  const tags: string[] = [];

  if (file.isNew) tags.push("new file");
  if (file.isDeleted) tags.push("deleted");
  if (file.isRename) tags.push("renamed");

  const exportAdded = (content.match(/^\+.*\bexport\b/gm) ?? []).length;
  const exportRemoved = (content.match(/^-.*\bexport\b/gm) ?? []).length;
  if (exportAdded > 0 || exportRemoved > 0) tags.push("exports changed");

  if (/^\+.*\b(function|class|interface|type|enum|const|let|async)\b/m.test(content)) {
    tags.push("new definitions");
  }
  if (/^\-.*\b(function|class|interface|type|enum)\b/m.test(content) && removed > added) {
    tags.push("removals");
  }
  if (/^\+.*\b(import|require|from)\b/m.test(content)) tags.push("imports added");
  if (/^\+.*\b(throw|catch|Error|try)\b/m.test(content)) tags.push("error handling");
  if (/^\+.*\b(test|describe|it\(|expect\()/m.test(content)) tags.push("tests added");

  let summary: string;

  if (file.isDeleted) {
    summary = `File removed (${removed} lines deleted).`;
  } else if (file.isNew) {
    summary = `New file with ${added} lines.`;
  } else if (file.isRename) {
    summary = `Renamed; net ${added} additions, ${removed} deletions.`;
  } else if (removed === 0 && added > 0) {
    summary = `Pure additions (${added} lines).`;
  } else if (added === 0 && removed > 0) {
    summary = `Pure deletions (${removed} lines).`;
  } else if (added > removed * 2) {
    summary = `Mostly additive refactor (+${added}/−${removed}).`;
  } else if (removed > added * 2) {
    summary = `Heavy pruning (+${added}/−${removed}).`;
  } else {
    summary = `Balanced edit (+${added}/−${removed}).`;
  }

  return { summary, tags };
}

function collectRisks(files: DiffFile[]): Risk[] {
  const buckets = new Map<string, { level: RiskLevel; message: string; files: Set<string> }>();

  for (const file of files) {
    const path = filePath(file);
    const haystack = `${path}\n${allChangedLines(file)}`;

    for (const rule of RISK_RULES) {
      if (!rule.pattern.test(haystack)) continue;
      const key = `${rule.level}:${rule.message}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.files.add(path);
      } else {
        buckets.set(key, { level: rule.level, message: rule.message, files: new Set([path]) });
      }
    }

    const { added, removed } = countLines(file);
    if (removed > 40 && categorize(path) === "test") {
      const key = "medium:Large test file reduction";
      const b = buckets.get(key) ?? { level: "medium" as RiskLevel, message: "Large test file reduction", files: new Set<string>() };
      b.files.add(path);
      buckets.set(key, b);
    }
  }

  const order: RiskLevel[] = ["high", "medium", "low"];
  return [...buckets.values()]
    .map((b) => ({ level: b.level, message: b.message, files: [...b.files].sort() }))
    .sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));
}

export function analyzeDiff(files: DiffFile[]): Analysis {
  const categories: Record<FileCategory, number> = {
    source: 0,
    test: 0,
    config: 0,
    docs: 0,
    assets: 0,
    other: 0,
  };

  let totalAdded = 0;
  let totalRemoved = 0;

  const insights: FileInsight[] = files.map((file) => {
    const path = filePath(file);
    const category = categorize(path);
    categories[category]++;
    const { added, removed } = countLines(file);
    totalAdded += added;
    totalRemoved += removed;
    const { summary, tags } = inferSummary(file);
    return { path, category, added, removed, summary, tags };
  });

  insights.sort((a, b) => b.added + b.removed - (a.added + a.removed));

  return {
    files: insights,
    risks: collectRisks(files),
    totals: { files: files.length, added: totalAdded, removed: totalRemoved },
    categories,
  };
}

export function overallSummary(analysis: Analysis): string {
  const { totals, categories, files } = analysis;
  if (totals.files === 0) return "No changes detected in the diff.";

  const parts: string[] = [];
  parts.push(
    `${totals.files} file${totals.files === 1 ? "" : "s"} changed (+${totals.added}/−${totals.removed}).`,
  );

  const dominant = (Object.entries(categories) as [FileCategory, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  if (dominant.length > 0) {
    const [cat, count] = dominant[0];
    parts.push(`Most changes are in ${cat} files (${count}).`);
  }

  const newFiles = files.filter((f) => f.tags.includes("new file")).length;
  const deleted = files.filter((f) => f.tags.includes("deleted")).length;
  if (newFiles > 0) parts.push(`${newFiles} new file${newFiles === 1 ? "" : "s"}.`);
  if (deleted > 0) parts.push(`${deleted} deletion${deleted === 1 ? "" : "s"}.`);

  return parts.join(" ");
}

export function reviewChecklist(analysis: Analysis): string[] {
  const items: string[] = [
    "Read the summary and risk flags before diving into hunks.",
    "For each changed file, ask: what behavior changed, not just what lines moved?",
  ];

  if (analysis.risks.some((r) => r.level === "high")) {
    items.push("High-risk areas flagged — verify auth, secrets, and migrations manually.");
  }
  if (analysis.categories.test > 0) {
    items.push("Tests changed — run the test suite and check what's now covered vs. removed.");
  }
  if (analysis.categories.config > 0) {
    items.push("Config changed — confirm env vars, deploy steps, and local dev still work.");
  }
  if (analysis.totals.removed > analysis.totals.added) {
    items.push("Net deletion — confirm nothing essential was removed.");
  }
  if (analysis.files.some((f) => f.tags.includes("exports changed"))) {
    items.push("Public exports changed — check downstream imports and breaking changes.");
  }

  items.push("If this is a PR: would a newcomer understand *why* from the description alone?");

  return items;
}
