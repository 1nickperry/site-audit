import { DEFAULT_CONFIG } from "./defaults.js";
import { enrichResponse, headerMap } from "./parse.js";
import { runChecks } from "./checks.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function hostKey(host) {
  return String(host || "")
    .replace(/^www\./i, "")
    .toLowerCase();
}

export function sameSite(a, b) {
  try {
    return hostKey(new URL(a).host) === hostKey(new URL(b).host);
  } catch {
    return false;
  }
}

function isSkippablePath(url) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return true;
    if (u.pathname.startsWith("/cdn-cgi/")) return true;
    return false;
  } catch {
    return true;
  }
}

function allowedUrl(url, config, start) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return false;
    if (isSkippablePath(url)) return false;
    if (config.inclusionRegex) {
      try {
        if (!new RegExp(config.inclusionRegex).test(url)) return false;
      } catch {
        /* invalid regex ignored */
      }
    }
    if (config.exclusionRegex) {
      try {
        if (new RegExp(config.exclusionRegex).test(url)) return false;
      } catch {
        /* invalid regex ignored */
      }
    }
    if (!sameSite(url, start)) return "external";
    return true;
  } catch {
    return false;
  }
}

async function fetchOne(url, config, start) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.responseTimeout);
  const chain = [];
  let current = url;
  try {
    for (let hop = 0; hop < 8; hop++) {
      const res = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": config.userAgent }
      });
      const headers = headerMap(res.headers);
      chain.push({ url: current, status: res.status, headers });
      if (res.status >= 300 && res.status < 400 && headers.location) {
        const next = new URL(headers.location, current).href;
        if (start && !sameSite(next, start)) {
          return {
            url,
            finalUrl: current,
            status: res.status,
            headers,
            contentType: headers["content-type"] || "",
            body: "",
            byteLength: 0,
            redirectChain: chain,
            redirectDestination: next,
            redirectsToDestination: chain.length,
            offSiteRedirect: true
          };
        }
        current = next;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const contentType = headers["content-type"] || "";
      const isBinary = /image\/|font\/|octet-stream|pdf|zip|woff|mp4/i.test(contentType);
      return {
        url,
        finalUrl: current,
        status: res.status,
        headers,
        contentType,
        body: isBinary ? "" : buf.toString("utf8"),
        byteLength: buf.length,
        redirectChain: chain,
        redirectDestination: chain.length > 1 ? current : "",
        redirectsToDestination: Math.max(0, chain.length - 1)
      };
    }
    return {
      url,
      finalUrl: current,
      status: 0,
      headers: {},
      contentType: "",
      body: "",
      byteLength: 0,
      redirectChain: chain,
      redirectDestination: current,
      redirectsToDestination: chain.length,
      error: "redirect loop"
    };
  } catch (err) {
    return {
      url,
      finalUrl: url,
      status: 0,
      headers: {},
      contentType: "",
      body: "",
      byteLength: 0,
      redirectChain: chain,
      redirectDestination: "",
      redirectsToDestination: 0,
      error: err.name === "AbortError" ? "timeout" : String(err.message || err)
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseRobotsDisallow(text, ua) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  let applies = false;
  const disallow = [];
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const [k, ...rest] = line.split(":");
    const v = rest.join(":").trim();
    if (/^user-agent$/i.test(k)) applies = v === "*" || v.toLowerCase() === ua.toLowerCase();
    else if (applies && /^disallow$/i.test(k) && v) disallow.push(v);
  }
  return (url) => {
    const path = new URL(url).pathname;
    return !disallow.some((d) => path.startsWith(d));
  };
}

export async function crawl(config, emit) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const start = cfg.url;
  if (!start) throw new Error("url is required");
  const startOrigin = new URL(start).origin;
  const queue = [{ url: start, depth: 0, kind: "page" }];
  const queued = new Set([start]);
  const responses = [];
  let crawledPages = 0;
  let robotsAllow = () => true;

  const robotsUrl = startOrigin + "/robots.txt";
  emit({ type: "log", message: `Fetching ${robotsUrl}` });
  const robotsRaw = enrichResponse(await fetchOne(robotsUrl, cfg, start));
  responses.push(robotsRaw);
  if (cfg.obeyRobots && robotsRaw.status === 200 && robotsRaw.body) {
    robotsAllow = parseRobotsDisallow(robotsRaw.body, cfg.userAgent);
  }

  const delay = Math.max(0, Math.floor(1000 / cfg.maxUrlsToCrawlPerSecond));

  while (queue.length) {
    if (responses.length >= cfg.maxUrls) break;
    const item = queue.shift();
    if (cfg.depthLimit > 0 && item.depth > cfg.depthLimit) continue;
    if (item.kind === "page" && !robotsAllow(item.url)) {
      emit({ type: "log", message: `robots.txt skipped ${item.url}` });
      continue;
    }
    if (delay) await sleep(delay);

    emit({ type: "log", message: `GET ${item.url}` });
    const raw = enrichResponse(await fetchOne(item.url, cfg, start));
    responses.push(raw);
    const onSite = sameSite(raw.finalUrl || raw.url, start);
    const isPage = item.kind === "page" && onSite && raw.type === "html" && raw.status >= 200 && raw.status < 400;
    if (isPage) crawledPages += 1;
    emit({
      type: "page",
      url: raw.url,
      status: raw.status,
      crawledPages,
      crawledUrls: responses.length
    });

    if (!isPage) continue;
    if (crawledPages >= cfg.maxPages) break;

    const parsed = raw.parsed;
    if (!parsed) continue;

    const enqueue = (href, kind, nextDepth) => {
      if (!href) return;
      let abs;
      try {
        abs = new URL(href, raw.finalUrl || raw.url).href;
      } catch {
        return;
      }
      abs = abs.split("#")[0];
      const allow = allowedUrl(abs, cfg, start);
      if (!allow) return;
      if (queued.has(abs)) return;
      if (allow === "external") {
        if (kind === "page" && !cfg.checkExternalLinks) return;
        if (kind === "resource" && !cfg.checkExternalResources) return;
        queued.add(abs);
        queue.push({ url: abs, depth: nextDepth, kind: kind === "page" ? "external" : "resource" });
        return;
      }
      queued.add(abs);
      queue.push({ url: abs, depth: nextDepth, kind });
    };

    for (const link of parsed.links) enqueue(link.url, "page", item.depth + 1);
    for (const res of parsed.resources) enqueue(res, "resource", item.depth);
    for (const js of parsed.js) enqueue(js.url, "resource", item.depth);
    for (const css of parsed.css) enqueue(css.url, "resource", item.depth);
  }

  const ctx = {
    responses,
    config: cfg,
    startOrigin,
    start
  };
  const results = runChecks(ctx);
  emit({ type: "log", message: `Ran ${results.length} checks` });
  return {
    crawledPages,
    crawledUrls: responses.length,
    results,
    pages: responses
      .filter((r) => r.type === "html" && sameSite(r.url, start))
      .map((r) => ({ url: r.url, status: r.status, title: r.parsed?.title || "" }))
  };
}
