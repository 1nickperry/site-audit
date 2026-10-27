import express from "express";
import path from "node:path";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { DEFAULT_CONFIG } from "./defaults.js";
import { listChecks } from "./checks.js";
import { crawl } from "./crawler.js";
import { mountFixture } from "./fixture.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = existsSync(path.join(root, "assets")) && existsSync(path.join(root, "index.html"))
  ? root
  : path.join(root, "dist");

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

const jobs = new Map();
const fixRequests = [];

function publicJob(job) {
  return {
    id: job.id,
    status: job.status,
    error: job.error,
    config: job.config,
    crawledPages: job.crawledPages,
    crawledUrls: job.crawledUrls,
    results: job.results,
    pages: job.pages,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt
  };
}

mountFixture(app);

app.get(["/robots.txt", "/sitemap.xml"], (_req, res) => {
  res.status(404).type("text").send("Not found");
});

app.get("/api/checks", (_req, res) => {
  res.json({ count: listChecks().length, checks: listChecks() });
});

app.post("/api/crawl", (req, res) => {
  const url = String(req.body?.url || "").trim();
  if (!url) return res.status(400).json({ error: "url is required" });
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: "invalid url" });
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    return res.status(400).json({ error: "only http(s) URLs are supported" });
  }

  const config = {
    ...DEFAULT_CONFIG,
    ...req.body,
    url,
    maxPages: Number(req.body?.maxPages) || DEFAULT_CONFIG.maxPages,
    depthLimit: Number(req.body?.depthLimit) || 0,
    responseTimeout: Number(req.body?.responseTimeout) || DEFAULT_CONFIG.responseTimeout,
    maxUrlsToCrawlPerSecond: Number(req.body?.maxUrlsToCrawlPerSecond) || DEFAULT_CONFIG.maxUrlsToCrawlPerSecond,
    categories: Array.isArray(req.body?.categories) && req.body.categories.length
      ? req.body.categories
      : DEFAULT_CONFIG.categories,
    checkExternalLinks: Boolean(req.body?.checkExternalLinks),
    checkExternalResources: req.body?.checkExternalResources !== false
  };

  const id = randomUUID();
  const job = {
    id,
    status: "running",
    config,
    crawledPages: 0,
    crawledUrls: 0,
    results: [],
    pages: [],
    listeners: new Set(),
    startedAt: new Date().toISOString()
  };
  jobs.set(id, job);

  const emit = (event, { end } = {}) => {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const listener of job.listeners) {
      try {
        listener.write(payload);
        if (end) listener.end();
      } catch {
        /* listener already closed */
      }
    }
    if (end) job.listeners.clear();
  };

  res.json(publicJob(job));

  crawl(config, (event) => {
    if (event.type === "page") {
      job.crawledPages = event.crawledPages;
      job.crawledUrls = event.crawledUrls;
    }
    emit(event);
  })
    .then((out) => {
      job.status = "done";
      job.crawledPages = out.crawledPages;
      job.crawledUrls = out.crawledUrls;
      job.results = out.results;
      job.pages = out.pages;
      job.finishedAt = new Date().toISOString();
      emit({ type: "done", job: publicJob(job) }, { end: true });
    })
    .catch((err) => {
      job.status = "error";
      job.error = String(err.message || err);
      job.finishedAt = new Date().toISOString();
      emit({ type: "error", message: job.error }, { end: true });
    });
});

app.get("/api/crawl/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "crawl not found" });
  res.json(publicJob(job));
});

app.post("/api/fix-report", (req, res) => {
  const email = String(req.body?.email || "").trim();
  const platform = String(req.body?.platform || "").toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: "valid email is required" });
  }
  if (!["wordpress", "shopify", "webflow"].includes(platform)) {
    return res.status(400).json({ error: "platform must be wordpress, shopify, or webflow" });
  }
  const record = {
    id: randomUUID(),
    email,
    platform,
    jobId: req.body?.jobId || null,
    siteUrl: req.body?.siteUrl || null,
    failCount: Number(req.body?.failCount) || 0,
    createdAt: new Date().toISOString()
  };
  fixRequests.push(record);
  if (fixRequests.length > 200) fixRequests.splice(0, fixRequests.length - 200);
  try {
    const dir = path.join(root, "data");
    mkdirSync(dir, { recursive: true });
    appendFileSync(path.join(dir, "fix-reports.jsonl"), `${JSON.stringify(record)}\n`);
  } catch {
    /* disk may be read-only on some hosts */
  }
  res.json({ ok: true, id: record.id });
});

app.get("/api/crawl/:id/events", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "crawl not found" });
  res.set({
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive"
  });
  res.flushHeaders();
  if (job.status !== "running") {
    res.write(`data: ${JSON.stringify({ type: "done", job: publicJob(job) })}\n\n`);
    return res.end();
  }
  job.listeners.add(res);
  req.on("close", () => job.listeners.delete(res));
});

app.use(express.static(dist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/fixture")) return next();
  res.sendFile(path.join(dist, "index.html"));
});

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";
app.listen(port, host, () => {
  console.log(`Site Audit listening on http://${host}:${port}`);
});
