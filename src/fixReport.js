import { categoryScore } from "./scores.js";
import { platformMeta, playbookFor } from "./fixPlaybook.js";

const PRIORITY = { high: 0, medium: 1, low: 2 };

function siteHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "site";
  }
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

function escapeMd(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}

function rowLine(item, row) {
  const extra = (row.cells || []).filter((c) => String(c || "").trim()).join(" · ");
  return extra ? `- ${row.url} — ${extra}` : `- ${row.url}`;
}

export function fixReportFilename(job, platformId) {
  const host = siteHost(job?.config?.url).replace(/[^a-z0-9.-]+/gi, "-");
  return `site-audit-fix-${platformId}-${host}-${stamp()}.md`;
}

export function buildFixMarkdown(job, { platform, email }) {
  const meta = platformMeta(platform);
  if (!meta) throw new Error("Select WordPress, Shopify, or Webflow.");
  const results = Array.isArray(job?.results) ? job.results : [];
  const failed = results
    .filter((r) => !r.pass)
    .slice()
    .sort((a, b) => (PRIORITY[a.priority] ?? 9) - (PRIORITY[b.priority] ?? 9));
  const passed = results.filter((r) => r.pass);
  const overall = categoryScore(results, null);
  const seo = categoryScore(results, "SEO");
  const speed = categoryScore(results, "speed");
  const security = categoryScore(results, "security");
  const url = job?.config?.url || "(unknown site)";
  const generated = new Date().toISOString();

  const lines = [
    `# Site Audit fix brief`,
    ``,
    `This file is a working brief for an AI (Cursor, ChatGPT, or similar) and for a human implementer.`,
    ``,
    `| Field | Value |`,
    `| --- | --- |`,
    `| Site | ${url} |`,
    `| Platform | ${meta.label} |`,
    `| Prepared for | ${email} |`,
    `| Generated | ${generated} |`,
    `| Crawl id | ${job?.id || "session"} |`,
    `| Pages crawled | ${job?.crawledPages ?? "?"} |`,
    `| Overall | ${overall ?? "—"}% |`,
    `| SEO | ${seo ?? "—"}% |`,
    `| Speed | ${speed ?? "—"}% |`,
    `| Security | ${security ?? "—"}% |`,
    `| Failing checks | ${failed.length} / ${results.length} |`,
    ``,
    `## How to use this file`,
    ``,
    `You are helping fix SEO, speed, and security issues on a **${meta.label}** site.`,
    ``,
    `1. Read the whole brief before changing anything.`,
    `2. Work **high** priority failures first, then medium, then low.`,
    `3. Only touch URLs listed under each check. Do not invent pages.`,
    `4. After each check, note what changed (file, admin screen, header, or CMS item).`,
    ``,
    `### If you have ${meta.mcp}`,
    ``,
    `Apply the fixes yourself. Do not stop at a plan.`,
    ``,
    ...meta.access.map((line) => `- ${line}`),
    ``,
    `Ask before deleting live content, buying a plugin, or enabling HSTS preload.`,
    ``,
    `### If you do not have that access`,
    ``,
    `Write a numbered plan the human can follow in ${meta.label} admin / Designer / theme editor.`,
    `Group steps by page so they are not bouncing between screens.`,
    `Do not claim a change was made.`,
    ``,
    `## Suggested order`,
    ``
  ];

  if (!failed.length) {
    lines.push(`All ${results.length} checks passed. No code changes are required. Re-crawl after the next release to keep this true.`);
    lines.push(``);
    return lines.join("\n");
  }

  failed.forEach((item, i) => {
    lines.push(`${i + 1}. **${item.name}** (${item.category} · ${item.priority}) — ${(item.rows || []).length} URL(s)`);
  });
  lines.push(``);

  failed.forEach((item, i) => {
    const guide = playbookFor(item.id, platform);
    const rows = item.rows || [];
    const shown = rows.slice(0, 40);
    lines.push(`## ${i + 1}. ${item.name}`);
    lines.push(``);
    lines.push(`- Status: **Fail**`);
    lines.push(`- Category: ${item.category} / ${item.subcategory || "general"}`);
    lines.push(`- Priority: ${item.priority}`);
    lines.push(`- Check id: \`${item.id}\``);
    lines.push(`- Why: ${guide.why}`);
    lines.push(``);
    lines.push(`### ${meta.label} steps`);
    lines.push(``);
    lines.push(guide.steps);
    lines.push(``);
    if (item.headings?.length) {
      lines.push(`Evidence columns: ${item.headings.join(" · ")}`);
      lines.push(``);
    }
    lines.push(`### Affected URLs (${rows.length})`);
    lines.push(``);
    if (!shown.length) {
      lines.push(`- (no URL rows; treat as a sitewide setting)`);
    } else {
      shown.forEach((row) => lines.push(rowLine(item, row)));
      if (rows.length > shown.length) {
        lines.push(`- …and ${rows.length - shown.length} more URLs in the Site Audit report`);
      }
    }
    lines.push(``);
    lines.push(`### Done when`);
    lines.push(``);
    lines.push(`Re-crawling these URLs no longer fails **${escapeMd(item.name)}**.`);
    lines.push(``);
  });

  if (passed.length) {
    lines.push(`## Already passing (do not regress)`);
    lines.push(``);
    passed.forEach((item) => {
      lines.push(`- ${item.name} (${item.category}, ${item.priority})`);
    });
    lines.push(``);
  }

  lines.push(`## After the work`);
  lines.push(``);
  lines.push(`1. Publish / deploy the ${meta.label} site.`);
  lines.push(`2. Hard-refresh a failing URL and confirm the HTML/headers changed.`);
  lines.push(`3. Re-run Site Audit on ${url}.`);
  lines.push(`4. Email ${email} a short summary of what changed and what is still platform-limited (Shopify/Webflow headers, etc.).`);
  lines.push(``);
  return lines.join("\n");
}

export function downloadMarkdown(markdown, filename) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
