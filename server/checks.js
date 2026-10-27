function fail(url, cells = []) {
  return { url, cells: cells.map((c) => (c == null ? "" : String(c))) };
}

function groupBy(pages, keyFn) {
  const map = new Map();
  for (const p of pages) {
    const k = keyFn(p);
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(p);
  }
  return map;
}

function htmlPages(responses) {
  return responses.filter((r) => r.type === "html" && r.status >= 200 && r.status < 400 && !isRedirect(r));
}

function indexablePages(responses) {
  return htmlPages(responses).filter((r) => r.parsed?.indexable !== false);
}

function isRedirect(r) {
  return r.status >= 300 && r.status < 400;
}

function sameHost(a, b) {
  try {
    const strip = (h) => h.replace(/^www\./i, "").toLowerCase();
    return strip(new URL(a).host) === strip(new URL(b).host);
  } catch {
    return false;
  }
}

function byUrl(responses) {
  const map = new Map();
  for (const r of responses) map.set(r.url, r);
  return map;
}

export const CHECKS = [
  {
    id: "set-page-titles",
    name: "Set page titles",
    category: "SEO",
    subcategory: "page titles",
    priority: "high",
    headings: ["Title"],
    run(ctx) {
      return indexablePages(ctx.responses).flatMap((p) => {
        const title = p.parsed?.title || "";
        return title.length > 0 ? [] : [fail(p.url, [title])];
      });
    }
  },
  {
    id: "set-h1-headings",
    name: "Set H1 headings",
    category: "SEO",
    subcategory: "page titles",
    priority: "high",
    headings: ["H1 heading"],
    run(ctx) {
      return indexablePages(ctx.responses).flatMap((p) => {
        const h1 = p.parsed?.h1Heading || "";
        return h1.length > 0 ? [] : [fail(p.url, [h1])];
      });
    }
  },
  {
    id: "use-one-h1-heading-per-page",
    name: "Use one H1 heading per page",
    category: "SEO",
    subcategory: "page headings",
    priority: "medium",
    headings: ["First H1", "H1s to fix"],
    run(ctx) {
      return indexablePages(ctx.responses).flatMap((p) => {
        const hs = p.parsed?.h1Headings || [];
        return hs.length === 1 ? [] : [fail(p.url, [p.parsed?.h1Heading || "", hs.join(" | ")])];
      });
    }
  },
  {
    id: "use-optimal-length-h1-headings",
    name: "Use optimal length H1 headings",
    category: "SEO",
    subcategory: "page headings",
    priority: "medium",
    headings: ["H1", "Length"],
    run(ctx) {
      const { minH1HeadingLength, maxH1HeadingLength } = ctx.config;
      return indexablePages(ctx.responses).flatMap((p) => {
        const n = p.parsed?.h1Heading || "";
        const ok = n.length >= minH1HeadingLength && n.length <= maxH1HeadingLength;
        return ok ? [] : [fail(p.url, [n, n.length])];
      });
    }
  },
  {
    id: "use-unique-h1-headings",
    name: "Use unique H1 headings",
    category: "SEO",
    subcategory: "page headings",
    priority: "high",
    headings: ["H1 heading"],
    run(ctx) {
      const pages = indexablePages(ctx.responses);
      const grouped = groupBy(pages, (p) => p.parsed?.h1Heading);
      return pages.flatMap((p) => {
        const h1 = p.parsed?.h1Heading;
        return h1 && grouped.get(h1).length > 1 ? [fail(p.url, [h1])] : [];
      });
    }
  },
  {
    id: "use-optimal-length-titles",
    name: "Use optimal length titles",
    category: "SEO",
    subcategory: "page titles",
    priority: "high",
    headings: ["Title", "Length"],
    run(ctx) {
      const { minPageTitleLength, maxPageTitleLength } = ctx.config;
      return indexablePages(ctx.responses).flatMap((p) => {
        const n = p.parsed?.title || "";
        const ok = n.length >= minPageTitleLength && n.length <= maxPageTitleLength;
        return ok ? [] : [fail(p.url, [n, n.length])];
      });
    }
  },
  {
    id: "set-page-descriptions",
    name: "Set page descriptions",
    category: "SEO",
    subcategory: "page descriptions",
    priority: "medium",
    headings: ["Description"],
    run(ctx) {
      return indexablePages(ctx.responses).flatMap((p) => {
        const n = p.parsed?.description || "";
        return n.length > 0 ? [] : [fail(p.url, [n])];
      });
    }
  },
  {
    id: "use-optimal-length-descriptions",
    name: "Use optimal length descriptions",
    category: "SEO",
    subcategory: "page descriptions",
    priority: "medium",
    headings: ["Description", "Length"],
    run(ctx) {
      const { minPageDescriptionLength, maxPageDescriptionLength } = ctx.config;
      return indexablePages(ctx.responses).flatMap((p) => {
        const n = p.parsed?.description || "";
        const ok = n.length >= minPageDescriptionLength && n.length <= maxPageDescriptionLength;
        return ok ? [] : [fail(p.url, [n, n.length])];
      });
    }
  },
  {
    id: "set-canonical-urls",
    name: "Set canonical URLs",
    category: "SEO",
    subcategory: "Duplicate content",
    priority: "high",
    headings: ["Canonical URL", "Issue"],
    run(ctx) {
      const map = byUrl(ctx.responses);
      return indexablePages(ctx.responses).flatMap((p) => {
        const n = p.parsed?.canonicalUrl || "";
        let issue = "";
        if (!n) issue = "Canonical URL not set";
        else {
          const r = map.get(n);
          if (r && isRedirect(r)) issue = "Canonical URL redirects";
          else if (r && r.status >= 400) issue = "Canonical URL gave status code " + r.status;
        }
        return issue ? [fail(p.url, [n, issue])] : [];
      });
    }
  },
  {
    id: "use-unique-titles",
    name: "Use unique titles",
    category: "SEO",
    subcategory: "page titles",
    priority: "high",
    headings: ["Title"],
    run(ctx) {
      const pages = indexablePages(ctx.responses);
      const grouped = groupBy(pages, (p) => p.parsed?.title);
      return pages.flatMap((p) => {
        const t = p.parsed?.title;
        return t && grouped.get(t).length > 1 ? [fail(p.url, [t])] : [];
      });
    }
  },
  {
    id: "use-unique-descriptions",
    name: "Use unique descriptions",
    category: "SEO",
    subcategory: "page descriptions",
    priority: "medium",
    headings: ["Description"],
    run(ctx) {
      const pages = indexablePages(ctx.responses);
      const grouped = groupBy(pages, (p) => p.parsed?.description);
      return pages.flatMap((p) => {
        const t = p.parsed?.description;
        return t && grouped.get(t).length > 1 ? [fail(p.url, [t])] : [];
      });
    }
  },
  {
    id: "avoid-duplicate-pages",
    name: "Avoid duplicate pages",
    category: "SEO",
    subcategory: "duplicate content",
    priority: "high",
    headings: ["Fingerprint"],
    run(ctx) {
      const pages = indexablePages(ctx.responses);
      const grouped = groupBy(pages, (p) => p.parsed?.fingerprint);
      return pages.flatMap((p) => {
        const t = p.parsed?.fingerprint;
        return t && grouped.get(t).length > 1 ? [fail(p.url, [t])] : [];
      });
    }
  },
  {
    id: "avoid-thin-content-pages",
    name: "Avoid thin content pages",
    category: "SEO",
    subcategory: "page content",
    priority: "high",
    headings: ["Word count"],
    run(ctx) {
      return indexablePages(ctx.responses).flatMap((p) => {
        const n = p.parsed?.wordCount || 0;
        return n >= ctx.config.minPageWordCount ? [] : [fail(p.url, [n])];
      });
    }
  },
  {
    id: "set-image-alt-text",
    name: "Set image ALT text",
    category: "SEO",
    subcategory: "page content",
    priority: "high",
    headings: ["Image URL"],
    run(ctx) {
      return indexablePages(ctx.responses).flatMap((p) => {
        const missing = (p.parsed?.images || []).filter((img) => img.url && img.alt === undefined);
        return missing.length ? [fail(p.url, [missing.map((i) => i.url).join(", ")])] : [];
      });
    }
  },
  {
    id: "set-mobile-scaling",
    name: "Set mobile scaling",
    category: "SEO",
    subcategory: "page content",
    priority: "high",
    headings: ["Viewport"],
    run(ctx) {
      return indexablePages(ctx.responses).flatMap((p) => {
        const n = p.parsed?.viewport || "";
        return n ? [] : [fail(p.url, [n])];
      });
    }
  },
  {
    id: "avoid-plugins",
    name: "Avoid plugins",
    category: "SEO",
    subcategory: "page content",
    priority: "high",
    headings: ["Plugin tags"],
    run(ctx) {
      return indexablePages(ctx.responses).flatMap((p) => {
        const n = p.parsed?.pluginTags || 0;
        return n === 0 ? [] : [fail(p.url, [n])];
      });
    }
  },
  {
    id: "use-short-urls",
    name: "Use short URLs",
    category: "SEO",
    subcategory: "URL names",
    priority: "high",
    headings: ["Length"],
    run(ctx) {
      return indexablePages(ctx.responses).flatMap((p) => {
        const n = p.url.length;
        return n <= ctx.config.maxReadableUrlLength ? [] : [fail(p.url, [n])];
      });
    }
  },
  {
    id: "avoid-url-extensions",
    name: "Avoid URL extensions",
    category: "SEO",
    subcategory: "URL names",
    priority: "high",
    headings: ["Extension"],
    run(ctx) {
      return indexablePages(ctx.responses).flatMap((p) => (p.urlExtension ? [fail(p.url, [p.urlExtension])] : []));
    }
  },
  {
    id: "avoid-url-parameters",
    name: "Avoid URL parameters",
    category: "SEO",
    subcategory: "URL names",
    priority: "medium",
    headings: ["Query"],
    run(ctx) {
      return indexablePages(ctx.responses).flatMap((p) => (p.urlQuery ? [fail(p.url, [p.urlQuery])] : []));
    }
  },
  {
    id: "avoid-symbols-in-urls",
    name: "Avoid symbols in URLs",
    category: "SEO",
    subcategory: "URL names",
    priority: "high",
    headings: ["Symbols"],
    run(ctx) {
      return indexablePages(ctx.responses).flatMap((p) => {
        const t = p.urlPath.replace(/[a-zA-Z0-9\-_/.]/g, "");
        return t ? [fail(p.url, [t])] : [];
      });
    }
  },
  {
    id: "use-lowercase-urls",
    name: "Use lowercase URLs",
    category: "SEO",
    subcategory: "URL names",
    priority: "medium",
    headings: [],
    run(ctx) {
      return indexablePages(ctx.responses).flatMap((p) => {
        const t = p.urlHostname + p.urlPath;
        return t === t.toLowerCase() ? [] : [fail(p.url, [])];
      });
    }
  },
  {
    id: "avoid-underscores-in-urls",
    name: "Avoid underscores in URLs",
    category: "SEO",
    subcategory: "URL names",
    priority: "low",
    headings: [],
    run(ctx) {
      return indexablePages(ctx.responses).flatMap((p) => (p.urlPath.includes("_") ? [fail(p.url, [])] : []));
    }
  },
  {
    id: "avoid-deeply-nested-urls",
    name: "Avoid deeply nested URLs",
    category: "SEO",
    subcategory: "URL names",
    priority: "medium",
    headings: ["Folders"],
    run(ctx) {
      return indexablePages(ctx.responses).flatMap((p) => {
        const n = (p.urlPath.match(/\//g) || []).length;
        return n <= ctx.config.maxForwardSlashesInReadableUrl ? [] : [fail(p.url, [n])];
      });
    }
  },
  {
    id: "use-valid-html",
    name: "Use valid HTML",
    category: "SEO",
    subcategory: "code validation",
    priority: "medium",
    headings: ["HTML errors"],
    run(ctx) {
      return htmlPages(ctx.responses).flatMap((p) =>
        p.errors?.length ? [fail(p.url, [p.errors.join("; ")])] : []
      );
    }
  },
  {
    id: "use-valid-css",
    name: "Use valid CSS",
    category: "SEO",
    subcategory: "code validation",
    priority: "medium",
    headings: ["CSS errors"],
    run(ctx) {
      return ctx.responses.filter((r) => r.type === "css").flatMap((p) =>
        p.errors?.length ? [fail(p.url, [p.errors.join("; ")])] : []
      );
    }
  },
  {
    id: "use-valid-javascript",
    name: "Use valid JavaScript",
    category: "SEO",
    subcategory: "code validation",
    priority: "medium",
    headings: ["JS errors"],
    run(ctx) {
      return ctx.responses.filter((r) => r.type === "js").flatMap((p) =>
        p.errors?.length ? [fail(p.url, [p.errors.join("; ")])] : []
      );
    }
  },
  {
    id: "return-404-for-broken-links",
    name: "Use 404 code for broken URLs",
    category: "SEO",
    subcategory: "Links",
    priority: "high",
    headings: ["Redirect target", "Status"],
    run(ctx) {
      return ctx.responses
        .filter((r) => r.status >= 400 || r.status === 0)
        .flatMap((p) => {
          const dest = p.redirectDestination || p.finalUrl || p.url;
          const destRes = ctx.responses.find((r) => r.url === dest) || p;
          const status = destRes.status;
          return status === 404 ? [] : [fail(p.url, [dest, String(status)])];
        });
    }
  },
  {
    id: "avoid-broken-internal-links",
    name: "Avoid broken internal links",
    category: "SEO",
    subcategory: "Links",
    priority: "high",
    headings: ["Broken links"],
    run(ctx) {
      const map = byUrl(ctx.responses);
      return htmlPages(ctx.responses).flatMap((p) => {
        const broken = (p.parsed?.links || []).filter((l) => {
          if (!sameHost(l.url, p.url)) return false;
          const r = map.get(l.url);
          return !r || r.status >= 400 || r.status === 0;
        });
        return broken.length ? [fail(p.url, [broken.map((b) => b.url).join(", ")])] : [];
      });
    }
  },
  {
    id: "avoid-broken-external-links",
    name: "Avoid broken external links",
    category: "SEO",
    subcategory: "Links",
    priority: "high",
    headings: ["Broken links"],
    run(ctx) {
      const map = byUrl(ctx.responses);
      return htmlPages(ctx.responses).flatMap((p) => {
        const broken = (p.parsed?.links || []).filter((l) => {
          if (sameHost(l.url, p.url)) return false;
          const r = map.get(l.url);
          return r && (r.status >= 400 || r.status === 0);
        });
        return broken.length ? [fail(p.url, [broken.map((b) => b.url).join(", ")])] : [];
      });
    }
  },
  {
    id: "avoid-broken-page-resources",
    name: "Avoid broken page resources",
    category: "SEO",
    subcategory: "Links",
    priority: "high",
    headings: ["Broken resources"],
    run(ctx) {
      const map = byUrl(ctx.responses);
      return htmlPages(ctx.responses).flatMap((p) => {
        const broken = (p.parsed?.resources || []).filter((u) => {
          const r = map.get(u);
          return r && (r.status >= 400 || r.status === 0);
        });
        return broken.length ? [fail(p.url, [broken.join(", ")])] : [];
      });
    }
  },
  {
    id: "add-robotstxt-files",
    name: "Add robots.txt files",
    category: "SEO",
    subcategory: "robots.txt",
    priority: "medium",
    headings: ["Redirect target"],
    run(ctx) {
      const robots = ctx.responses.filter((r) => r.type === "robots" || /\/robots\.txt$/i.test(r.url));
      if (!robots.length) {
        return [fail(ctx.startOrigin + "/robots.txt", ["missing"])];
      }
      return robots.flatMap((r) => {
        const dest = r.redirectDestination;
        const body = dest ? ctx.responses.find((x) => x.url === dest) : r;
        const ok = body && body.status === 200;
        return ok ? [] : [fail(r.url, [dest || ""])];
      });
    }
  },
  {
    id: "specify-sitemap-locations",
    name: "Specify sitemap locations",
    category: "SEO",
    subcategory: "robots.txt",
    priority: "high",
    headings: [],
    run(ctx) {
      const robots = ctx.responses.filter((r) => r.type === "robots" && r.status === 200);
      if (!robots.length) return [fail(ctx.startOrigin + "/robots.txt", [])];
      return robots.flatMap((r) => ((r.parsed?.sitemaps || []).length ? [] : [fail(r.url, [])]));
    }
  },
  {
    id: "avoid-meta-redirects",
    name: "Avoid meta redirects",
    category: "SEO",
    subcategory: "redirects",
    priority: "high",
    headings: ["Target"],
    run(ctx) {
      return htmlPages(ctx.responses).flatMap((p) => {
        const n = p.parsed?.metaRefreshUrl;
        return n ? [fail(p.url, [n])] : [];
      });
    }
  },
  {
    id: "avoid-temporary-redirects",
    name: "Avoid temporary redirects",
    category: "SEO",
    subcategory: "redirects",
    priority: "high",
    headings: ["Redirect target", "Status"],
    run(ctx) {
      return ctx.responses
        .filter((r) => r.status === 302 || r.status === 307)
        .map((p) => fail(p.url, [p.redirectDestination || "", String(p.status)]));
    }
  },
  {
    id: "compress-sent-data",
    name: "Compress sent data",
    category: "speed",
    subcategory: "page size",
    priority: "high",
    headings: ["Content-Encoding"],
    run(ctx) {
      return ctx.responses
        .filter((r) => r.compressible && r.status === 200 && (r.body || "").length > 500)
        .flatMap((p) => (p.compressed ? [] : [fail(p.url, [p.headers["content-encoding"] || ""])]));
    }
  },
  {
    id: "avoid-recompressing-data",
    name: "Avoid recompressing data",
    category: "speed",
    subcategory: "page size",
    priority: "high",
    headings: ["Content-Encoding"],
    run(ctx) {
      return ctx.responses
        .filter((r) => r.alreadyCompressedType && r.status === 200)
        .flatMap((p) => (p.compressed ? [fail(p.url, [p.headers["content-encoding"] || ""])] : []));
    }
  },
  {
    id: "minify-files",
    name: "Minify files",
    category: "speed",
    subcategory: "page size",
    priority: "medium",
    headings: ["Minified"],
    run(ctx) {
      return ctx.responses
        .filter((r) => (r.type === "css" || r.type === "js") && r.status === 200)
        .flatMap((p) => (p.minified ? [] : [fail(p.url, [String(p.minified)])]));
    }
  },
  {
    id: "avoid-inline-sourcemaps",
    name: "Avoid inline sourcemaps",
    category: "speed",
    subcategory: "page size",
    priority: "high",
    headings: [],
    run(ctx) {
      return ctx.responses
        .filter((r) => r.type === "css" || r.type === "js" || r.type === "html")
        .flatMap((p) => (p.includesSourceMapData ? [fail(p.url, [])] : []));
    }
  },
  {
    id: "avoid-inline-javascript",
    name: "Avoid inline JavaScript",
    category: "speed",
    subcategory: "javascript",
    priority: "medium",
    headings: ["Inline JS bytes"],
    run(ctx) {
      return htmlPages(ctx.responses).flatMap((p) => {
        const n = p.parsed?.inlineJs || 0;
        return n <= ctx.config.maxInlineJsBytesPerPage ? [] : [fail(p.url, [n])];
      });
    }
  },
  {
    id: "defer-javascript-loading",
    name: "Defer JavaScript loading",
    category: "speed",
    subcategory: "javascript",
    priority: "high",
    headings: ["Blocking JavaScript URL"],
    run(ctx) {
      return htmlPages(ctx.responses).flatMap((p) => {
        const blocking = (p.parsed?.js || []).filter((s) => !(s.async || s.defer || s.atPageEnd || s.isModuleType));
        return blocking.length ? [fail(p.url, [blocking.map((s) => s.url).join(", ")])] : [];
      });
    }
  },
  {
    id: "avoid-inline-css",
    name: "Avoid inline CSS",
    category: "speed",
    subcategory: "CSS",
    priority: "medium",
    headings: ["Inline CSS bytes"],
    run(ctx) {
      return htmlPages(ctx.responses).flatMap((p) => {
        const n = p.parsed?.inlineCss || 0;
        return n <= ctx.config.maxInlineCssBytesPerPage ? [] : [fail(p.url, [n])];
      });
    }
  },
  {
    id: "avoid-css-import",
    name: "Avoid CSS @import",
    category: "speed",
    subcategory: "CSS",
    priority: "high",
    headings: ["@import count"],
    run(ctx) {
      const htmlFails = htmlPages(ctx.responses).flatMap((p) => {
        const n = p.parsed?.cssImports || 0;
        return n === 0 ? [] : [fail(p.url, [n])];
      });
      const cssFails = ctx.responses
        .filter((r) => r.type === "css")
        .flatMap((p) => (p.cssImports ? [fail(p.url, [p.cssImports])] : []));
      return [...htmlFails, ...cssFails];
    }
  },
  {
    id: "avoid-internal-link-redirects",
    name: "Avoid internal link redirects",
    category: "speed",
    subcategory: "redirects",
    priority: "high",
    headings: ["URL", "Destination"],
    run(ctx) {
      const map = byUrl(ctx.responses);
      return htmlPages(ctx.responses).flatMap((p) => {
        const hits = (p.parsed?.links || []).filter((l) => {
          if (!sameHost(l.url, p.url)) return false;
          const r = map.get(l.url);
          return r && isRedirect(r);
        });
        return hits.length
          ? [fail(p.url, [hits.map((h) => h.url).join(", "), hits.map((h) => map.get(h.url)?.redirectDestination || "").join(", ")])]
          : [];
      });
    }
  },
  {
    id: "avoid-resource-redirects",
    name: "Avoid resource redirects",
    category: "speed",
    subcategory: "redirects",
    priority: "high",
    headings: ["Resources"],
    run(ctx) {
      const map = byUrl(ctx.responses);
      return htmlPages(ctx.responses).flatMap((p) => {
        const hits = (p.parsed?.resources || []).filter((u) => {
          const r = map.get(u);
          return r && isRedirect(r);
        });
        return hits.length ? [fail(p.url, [hits.join(", ")])] : [];
      });
    }
  },
  {
    id: "avoid-redirect-chains",
    name: "Avoid redirect chains",
    category: "speed",
    subcategory: "redirects",
    priority: "high",
    headings: ["Destination", "Hops"],
    run(ctx) {
      return ctx.responses
        .filter((r) => (r.redirectsToDestination || 0) > 1)
        .map((p) => fail(p.url, [p.redirectDestination || "", p.redirectsToDestination]));
    }
  },
  {
    id: "allow-caching",
    name: "Allow caching",
    category: "speed",
    subcategory: "caching",
    priority: "high",
    headings: ["Cache disabling options"],
    run(ctx) {
      return ctx.responses
        .filter((r) => r.status === 200 && (r.type === "css" || r.type === "js" || r.type === "image"))
        .flatMap((p) => {
          const n = [p.cacheNoCache ? "no-cache" : "", p.cacheNoStore ? "no-store" : ""].filter(Boolean).join(", ");
          return n ? [fail(p.url, [n])] : [];
        });
    }
  },
  {
    id: "use-long-caching-times",
    name: "Use long caching times",
    category: "speed",
    subcategory: "caching",
    priority: "high",
    headings: ["Cache time used", "Cached time (mins)"],
    run(ctx) {
      return ctx.responses
        .filter((r) => r.status === 200 && (r.type === "css" || r.type === "js" || r.type === "image"))
        .flatMap((p) => {
          let n = 0;
          let label = "";
          if (p.cacheMaxAge != null) {
            label = "max-age";
            n = p.cacheMaxAge;
          } else if (p.cacheExpires != null) {
            label = "expires";
            n = p.cacheExpires;
          }
          const mins = n ? n / 60 : 0;
          return mins >= ctx.config.longCacheMinutes ? [] : [fail(p.url, [label, mins])];
        });
    }
  },
  {
    id: "avoid-duplicate-resources",
    name: "Avoid duplicate resources",
    category: "speed",
    subcategory: "caching",
    priority: "high",
    headings: ["Fingerprint"],
    run(ctx) {
      const resources = ctx.responses.filter((r) => (r.type === "css" || r.type === "js" || r.type === "image") && r.dataHash);
      const grouped = groupBy(resources, (p) => p.dataHash);
      return resources.flatMap((p) => (grouped.get(p.dataHash).length > 1 ? [fail(p.url, [p.dataHash])] : []));
    }
  },
  {
    id: "use-https",
    name: "Use HTTPS",
    category: "security",
    subcategory: "HTTPS",
    priority: "high",
    headings: [],
    run(ctx) {
      return htmlPages(ctx.responses).flatMap((p) => (p.isHttps ? [] : [fail(p.url, [])]));
    }
  },
  {
    id: "avoid-mixed-content-errors",
    name: "Avoid mixed content errors",
    category: "security",
    subcategory: "HTTPS",
    priority: "high",
    headings: ["Insecure resources"],
    run(ctx) {
      return htmlPages(ctx.responses)
        .filter((p) => p.isHttps)
        .flatMap((p) => {
          const n = p.parsed?.insecureResources || [];
          return n.length ? [fail(p.url, [n.join(", ")])] : [];
        });
    }
  },
  {
    id: "secure-passwords-fields",
    name: "Secure passwords fields",
    category: "security",
    subcategory: "HTTPS",
    priority: "high",
    headings: ["HTTPS page", "POST action", "HTTPS action"],
    run(ctx) {
      return htmlPages(ctx.responses).flatMap((p) => {
        const https = p.isHttps;
        const post = !p.parsed?.formPasswordSentWithoutPost;
        const httpsAction = !p.parsed?.formPasswordSentWithoutHttps;
        const ok = https && post && httpsAction;
        if (!p.parsed?.hasPasswordField) return [];
        return ok ? [] : [fail(p.url, [https, post, httpsAction])];
      });
    }
  },
  {
    id: "enable-hsts",
    name: "Enable HSTS",
    category: "security",
    subcategory: "HSTS",
    priority: "high",
    headings: ["HSTS max age", "include subdomains"],
    run(ctx) {
      return htmlPages(ctx.responses).flatMap((p) =>
        p.hstsMaxAge > 0 ? [] : [fail(p.url, [p.hstsMaxAge, p.hstsIncludeSubDomains])]
      );
    }
  },
  {
    id: "allow-hsts-preload",
    name: "Allow HSTS preload",
    category: "security",
    subcategory: "HSTS",
    priority: "medium",
    headings: ["Preload set", "include subdomains", "HSTS max age"],
    run(ctx) {
      return htmlPages(ctx.responses).flatMap((p) => {
        const ok = p.hstsPreload && p.hstsMaxAge >= ctx.config.hstsPreloadMinAge && p.hstsIncludeSubDomains;
        return ok ? [] : [fail(p.url, [p.hstsPreload, p.hstsIncludeSubDomains, p.hstsMaxAge])];
      });
    }
  },
  {
    id: "specify-mime-types",
    name: "Specify MIME types",
    category: "security",
    subcategory: "content sniffing",
    priority: "high",
    headings: ["Content-Type header"],
    run(ctx) {
      return ctx.responses
        .filter((r) => r.status === 200)
        .flatMap((p) => {
          const n = p.headers["content-type"] || "";
          return n ? [] : [fail(p.url, [n])];
        });
    }
  },
  {
    id: "disable-content-sniffing",
    name: "Disable content sniffing",
    category: "security",
    subcategory: "content sniffing",
    priority: "high",
    headings: ["X-Content-Type-Options header"],
    run(ctx) {
      return ctx.responses
        .filter((r) => r.status === 200)
        .flatMap((p) =>
          p.nosniffEnabled ? [] : [fail(p.url, [p.headers["x-content-type-options"] || ""])]
        );
    }
  },
  {
    id: "restrict-iframe-usage",
    name: "Restrict iframe usage",
    category: "security",
    subcategory: "miscellaneous",
    priority: "high",
    headings: ["x-frame-options"],
    run(ctx) {
      return htmlPages(ctx.responses).flatMap((p) =>
        p.xFrameOptionsSet ? [] : [fail(p.url, [p.headers["x-frame-options"] || ""])]
      );
    }
  },
  {
    id: "enable-xss-protection",
    name: "Enable XSS protection",
    category: "security",
    subcategory: "miscellaneous",
    priority: "high",
    headings: ["X-XSS-Protection header"],
    run(ctx) {
      return htmlPages(ctx.responses).flatMap((p) =>
        p.xssProtectionHeaderSet ? [] : [fail(p.url, [p.headers["x-xss-protection"] || ""])]
      );
    }
  },
  {
    id: "hide-server-version-data",
    name: "Hide server version data",
    category: "security",
    subcategory: "miscellaneous",
    priority: "low",
    headings: ["Server version headers"],
    run(ctx) {
      const names = [
        { name: "server", passes: (v) => !/\d/.test(v) },
        { name: "x-powered-by" },
        { name: "x-aspnet-version" },
        { name: "x-aspnetmvc-version" }
      ];
      return ctx.responses
        .filter((r) => r.status === 200)
        .flatMap((p) => {
          const leaks = names
            .map((t) => {
              const v = p.headers[t.name];
              if (!v) return null;
              if (t.passes && t.passes(v)) return null;
              return `${t.name}: ${v}`;
            })
            .filter(Boolean);
          return leaks.length ? [fail(p.url, [leaks.join("; ")])] : [];
        });
    }
  }
];

export function listChecks() {
  return CHECKS.map(({ run, ...meta }) => meta);
}

export function runChecks(ctx) {
  const selected = new Set((ctx.config.categories || ["SEO", "speed", "security"]).map((c) => c.toLowerCase()));
  return CHECKS.filter((c) => selected.has(c.category.toLowerCase())).map((check) => {
    const rows = check.run(ctx);
    return {
      id: check.id,
      name: check.name,
      category: check.category,
      subcategory: check.subcategory,
      priority: check.priority,
      headings: check.headings,
      pass: rows.length === 0,
      rows
    };
  });
}
