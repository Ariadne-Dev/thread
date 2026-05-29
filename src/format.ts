import { Analysis, overallSummary, reviewChecklist } from "./analyze.js";

function riskIcon(level: string): string {
  if (level === "high") return "[!!]";
  if (level === "medium") return "[!]";
  return "[~]";
}

export function formatText(analysis: Analysis, title?: string): string {
  const lines: string[] = [];
  const rule = "─".repeat(56);

  if (title) {
    lines.push(title);
    lines.push(rule);
    lines.push("");
  }

  lines.push("SUMMARY");
  lines.push(overallSummary(analysis));
  lines.push("");

  if (analysis.risks.length > 0) {
    lines.push("RISKS");
    for (const risk of analysis.risks) {
      lines.push(`  ${riskIcon(risk.level)} ${risk.message}`);
      for (const f of risk.files) lines.push(`      · ${f}`);
    }
    lines.push("");
  }

  lines.push("FILES");
  for (const file of analysis.files) {
    const tagStr = file.tags.length > 0 ? ` [${file.tags.join(", ")}]` : "";
    lines.push(`  · ${file.path} (${file.category}, +${file.added}/−${file.removed})${tagStr}`);
    lines.push(`    ${file.summary}`);
  }
  lines.push("");

  lines.push("REVIEW CHECKLIST");
  for (const item of reviewChecklist(analysis)) {
    lines.push(`  ☐ ${item}`);
  }
  lines.push("");
  lines.push("— thread · leave a thread, find your way");

  return lines.join("\n");
}

export function formatMarkdown(analysis: Analysis, title?: string): string {
  const lines: string[] = [];

  if (title) lines.push(`# ${title}`, "");

  lines.push("## Summary", "", overallSummary(analysis), "");

  if (analysis.risks.length > 0) {
    lines.push("## Risks", "");
    for (const risk of analysis.risks) {
      lines.push(`- **${risk.level.toUpperCase()}** — ${risk.message}`);
      for (const f of risk.files) lines.push(`  - \`${f}\``);
    }
    lines.push("");
  }

  lines.push("## Files", "");
  lines.push("| File | Category | +/- | Notes |");
  lines.push("|------|----------|-----|-------|");
  for (const file of analysis.files) {
    const tags = file.tags.join(", ") || "—";
    lines.push(`| \`${file.path}\` | ${file.category} | +${file.added}/−${file.removed} | ${file.summary} (${tags}) |`);
  }
  lines.push("");

  lines.push("## Review checklist", "");
  for (const item of reviewChecklist(analysis)) {
    lines.push(`- [ ] ${item}`);
  }

  return lines.join("\n");
}

export function formatJson(analysis: Analysis, title?: string): string {
  return JSON.stringify(
    {
      title,
      summary: overallSummary(analysis),
      checklist: reviewChecklist(analysis),
      ...analysis,
    },
    null,
    2,
  );
}
