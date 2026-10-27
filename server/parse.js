import { load } from "cheerio";
import { createHash } from "node:crypto";

const COMPRESSIBLE = /html|css|javascript|json|xml|svg|text\//i;
const ALREADY_COMPRESSED = /image\/(jpeg|png|gif|webp)|font\/|woff|zip|pdf|mp4|octet-stream/i;

export function headerMap(headers) {
  const out = {};
  for (const [k, v] of headers.entries()) out[k.toLowerCase()] = v;
  return out;
}

export function parseCache(headers) {
  const cc = headers["cache-control"] || "";
  const parts = cc.split(",").map((p) => p.trim().toLowerCase());
  const maxAgePart = parts.find((p) => p.startsWith("max-age="));
  let cacheMaxAge;
  if (maxAgePart) cacheMaxAge = Number(maxAgePart.slice(8));
  let cacheExpires;
  if (headers.expires) {
    const exp = Date.parse(headers.expires);
    if (!Number.isNaN(exp)) cacheExpires = Math.max(0, (exp - Date.now()) / 1000);
  }
  return {
    cacheNoCache: parts.includes("no-cache"),
    cacheNoStore: parts.includes("no-store"),
    cacheMaxAge,
    cacheExpires
  };
}

export function parseHsts(headers) {
  const raw = headers["strict-transport-security"] || "";
  const max = /max-age=(\d+)/i.exec(raw);
  return {
    hstsMaxAge: max ? Number(max[1]) : 0,
    hstsIncludeSubDomains: /includesubdomains/i.test(raw),
    hstsPreload: /preload/i.test(raw)
  };
}

export function classify(contentType, url) {
  const t = (contentType || "").toLowerCase();
  const path = new URL(url).pathname.toLowerCase();
  if (t.includes("html") || path.endsWith(".html") || path.endsWith("/")) return "html";
  if (t.includes("css") || path.endsWith(".css")) return "css";
  if (t.includes("javascript") || path.endsWith(".js")) return "js";
  if (t.includes("image") || /\.(png|jpe?g|gif|svg|webp|ico)$/.test(path)) return "image";
  if (path.endsWith("robots.txt") || t.includes("text/plain") && path.endsWith("robots.txt")) return "robots";
  return "other";
}

function syntaxIssues(text, kind) {
  const errors = [];
  if (kind === "html") {
    if (!/^\s*<!doctype html/i.test(text)) errors.push("Missing HTML5 doctype");
    if (!/<html[\s>]/i.test(text)) errors.push("Missing <html> tag");
    if (!/<head[\s>]/i.test(text)) errors.push("Missing <head> tag");
    if (!/<body[\s>]/i.test(text)) errors.push("Missing <body> tag");
    const opens = (text.match(/<(div|span|p|section|article|ul|ol|li|table|tr|td)\b/gi) || []).length;
    const closes = (text.match(/<\/(div|span|p|section|article|ul|ol|li|table|tr|td)>/gi) || []).length;
    if (opens - closes > 3) errors.push("Unbalanced HTML tags");
  } else {
    let depth = 0;
    for (const ch of text) {
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      if (depth < 0) {
        errors.push("Unmatched }");
        break;
      }
    }
    if (depth > 0) errors.push("Unclosed {");
  }
  return errors;
}

export function isMinified(text) {
  if (!text || text.length < 200) return true;
  const stripped = text.replace(/\s+/g, " ");
  return stripped.length / text.length > 0.85;
}

export function parseHtml(url, html) {
  const $ = load(html);
  $("script,style,noscript").remove();
  const title = $("title").first().text().trim();
  const description = $('meta[name="description" i]').attr("content")?.trim() || "";
  const h1Headings = $("h1")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);
  const canonicalUrl = $('link[rel="canonical" i]').attr("href") || "";
  const viewport = $('meta[name="viewport" i]').attr("content") || "";
  const robotsMeta = $('meta[name="robots" i]').attr("content") || "";
  const metaRefresh = $('meta[http-equiv="refresh" i]').attr("content") || "";
  const metaRefreshUrl = /url\s*=\s*(.+)/i.exec(metaRefresh)?.[1]?.trim() || "";
  const images = $("img")
    .map((_, el) => ({
      url: $(el).attr("src") || "",
      alt: $(el).attr("alt")
    }))
    .get();
  const links = $("a[href]")
    .map((_, el) => ({ url: $(el).attr("href") || "", rel: $(el).attr("rel") || "" }))
    .get();
  const pluginTags = $("embed,object,applet").length;
  const frames = $("iframe,frame").length;

  const $full = load(html);
  const js = [];
  let inlineJs = 0;
  $full("script").each((_, el) => {
    const src = $full(el).attr("src");
    const type = ($full(el).attr("type") || "").toLowerCase();
    const text = $full(el).html() || "";
    if (src) {
      js.push({
        url: src,
        async: $full(el).attr("async") != null,
        defer: $full(el).attr("defer") != null,
        isModuleType: type === "module" || type === "text/module",
        atPageEnd: false
      });
    } else {
      inlineJs += text.length;
    }
  });
  let inlineCss = 0;
  let cssImports = 0;
  const css = [];
  $full("style").each((_, el) => {
    const text = $full(el).html() || "";
    inlineCss += text.length;
    cssImports += (text.match(/@import/g) || []).length;
  });
  $full('link[rel="stylesheet" i]').each((_, el) => {
    css.push({ url: $full(el).attr("href") || "" });
  });

  const resources = [
    ...$full("script[src]").map((_, el) => $full(el).attr("src")).get(),
    ...$full("img[src]").map((_, el) => $full(el).attr("src")).get(),
    ...$full('link[href]').map((_, el) => $full(el).attr("href")).get()
  ].filter(Boolean);

  const insecureResources = resources.filter((u) => /^http:\/\//i.test(u));
  const wordCount = $("body").text().replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
  const fingerprint = createHash("sha256")
    .update($("body").text().replace(/\s+/g, " ").trim())
    .digest("hex")
    .slice(0, 16);

  let formPasswordSentWithoutPost = false;
  let formPasswordSentWithoutHttps = false;
  let hasPasswordField = false;
  $full("form").each((_, el) => {
    if (!$full(el).find('input[type="password"]').length) return;
    hasPasswordField = true;
    const method = ($full(el).attr("method") || "get").toLowerCase();
    const action = $full(el).attr("action") || url;
    if (method !== "post") formPasswordSentWithoutPost = true;
    try {
      const abs = new URL(action, url);
      if (abs.protocol !== "https:") formPasswordSentWithoutHttps = true;
    } catch {
      formPasswordSentWithoutHttps = true;
    }
  });

  return {
    title,
    description,
    h1Heading: h1Headings[0] || "",
    h1Headings,
    canonicalUrl: canonicalUrl ? new URL(canonicalUrl, url).href : "",
    viewport,
    robotsMetaIndex: !/noindex/i.test(robotsMeta),
    indexable: !/noindex/i.test(robotsMeta),
    metaRefreshUrl,
    images,
    links: links.map((l) => {
      try {
        return { ...l, url: new URL(l.url, url).href };
      } catch {
        return l;
      }
    }),
    pluginTags,
    frames,
    js: js.map((item) => {
      try {
        return { ...item, url: new URL(item.url, url).href };
      } catch {
        return item;
      }
    }),
    css: css.map((item) => {
      try {
        return { ...item, url: new URL(item.url, url).href };
      } catch {
        return item;
      }
    }),
    inlineJs,
    inlineCss,
    cssImports,
    resources: resources.map((u) => {
      try {
        return new URL(u, url).href;
      } catch {
        return u;
      }
    }),
    insecureResources: insecureResources.map((u) => {
      try {
        return new URL(u, url).href;
      } catch {
        return u;
      }
    }),
    wordCount,
    fingerprint,
    formPasswordSentWithoutPost,
    formPasswordSentWithoutHttps,
    hasPasswordField,
    includesSourceMapData: /sourceMappingURL|data:application\/json;base64/i.test(html),
    htmlErrors: syntaxIssues(html, "html")
  };
}

export function parseRobots(text) {
  const sitemaps = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*sitemap:\s*(.+)$/i.exec(line);
    if (m) sitemaps.push(m[1].trim());
  }
  return { sitemaps, body: text };
}

export function enrichResponse(res) {
  const headers = res.headers;
  const type = classify(res.contentType, res.url);
  const compressed = /gzip|br|deflate/i.test(headers["content-encoding"] || "");
  const cache = parseCache(headers);
  const hsts = parseHsts(headers);
  const body = res.body || "";
  let parsed = null;
  let errors = [];
  let minified = true;
  let cssImports = 0;
  let includesSourceMapData = /sourceMappingURL/.test(body);
  if (type === "html" && body) {
    parsed = parseHtml(res.finalUrl || res.url, body);
    errors = parsed.htmlErrors;
    includesSourceMapData = parsed.includesSourceMapData;
  } else if (type === "css" && body) {
    errors = syntaxIssues(body, "css");
    minified = isMinified(body);
    cssImports = (body.match(/@import/g) || []).length;
  } else if (type === "js" && body) {
    errors = syntaxIssues(body, "js");
    minified = isMinified(body);
  } else if (type === "robots" && body) {
    parsed = parseRobots(body);
  }

  const urlObj = new URL(res.finalUrl || res.url);
  const urlPath = urlObj.pathname;
  const urlExt = (/\.([a-z0-9]+)$/i.exec(urlPath) || [])[1] || "";
  const nosniff = (headers["x-content-type-options"] || "").toLowerCase().includes("nosniff");
  const xfo = headers["x-frame-options"] || "";
  const xss = headers["x-xss-protection"] || "";

  return {
    ...res,
    type,
    compressed,
    compressible: COMPRESSIBLE.test(res.contentType || "") || type === "html" || type === "css" || type === "js",
    alreadyCompressedType: ALREADY_COMPRESSED.test(res.contentType || ""),
    ...cache,
    ...hsts,
    parsed,
    errors,
    minified,
    cssImports,
    includesSourceMapData,
    urlHostname: urlObj.hostname,
    urlPath,
    urlQuery: urlObj.search.slice(1),
    urlExtension: urlExt && !["html", "htm", "php", "aspx"].includes(urlExt.toLowerCase()) ? urlExt : "",
    nosniffEnabled: nosniff,
    xFrameOptionsSet: Boolean(xfo),
    xssProtectionHeaderSet: Boolean(xss),
    dataHash: body ? createHash("sha256").update(body).digest("hex").slice(0, 16) : "",
    isHttps: urlObj.protocol === "https:"
  };
}
