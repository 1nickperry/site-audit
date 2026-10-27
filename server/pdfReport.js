import PDFDocument from "pdfkit";
import { categoryScore } from "../src/scores.js";

const PRIORITY = { high: 0, medium: 1, low: 2 };

function siteHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "site";
  }
}

function rowLine(item, row) {
  const extra = (row.cells || []).filter((c) => String(c || "").trim()).join(" • ");
  return extra ? `  • ${row.url} - ${extra}` : `  • ${row.url}`;
}

export function pdfReportFilename(job) {
  const host = siteHost(job?.config?.url).replace(/[^a-z0-9.-]+/gi, "-");
  const stamp = new Date().toISOString().slice(0, 10);
  return `site-audit-${host}-${stamp}.pdf`;
}

export async function buildPdfReport(job) {
  return new Promise((resolve, reject) => {
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
    const leftMargin = 50;

    const doc = new PDFDocument({ margin: 50, size: "LETTER" });
    const chunks = [];
    
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(24).font("Helvetica-Bold").text("Site Audit Report", { align: "center" });
    doc.moveDown(0.5);
    
    doc.fontSize(11).font("Helvetica").fillColor("#666");
    doc.text(url, { align: "center" });
    doc.moveDown(2);

    doc.fontSize(14).font("Helvetica-Bold").fillColor("black").text("Summary");
    doc.moveDown(0.5);
    
    const summaryData = [
      ["Site URL", url],
      ["Generated", new Date(generated).toLocaleString()],
      ["Crawl ID", job?.id || "session"],
      ["Pages Crawled", String(job?.crawledPages ?? "?")],
      ["Overall Score", `${overall ?? "0"}%`],
      ["SEO Score", `${seo ?? "0"}%`],
      ["Speed Score", `${speed ?? "0"}%`],
      ["Security Score", `${security ?? "0"}%`],
      ["Failing Checks", `${failed.length} of ${results.length}`]
    ];

    const startY = doc.y;
    let currentY = startY;
    const labelWidth = 120;
    const valueX = leftMargin + labelWidth + 10;
    
    summaryData.forEach(([label, value]) => {
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#333");
      doc.text(label + ":", leftMargin, currentY, { width: labelWidth, continued: false });
      doc.fontSize(10).font("Helvetica").fillColor("black");
      doc.text(value, valueX, currentY, { continued: false });
      currentY += 20;
    });
    
    doc.y = currentY + 10;
    doc.moveDown(1);

    doc.fontSize(14).font("Helvetica-Bold").text("Score Breakdown");
    doc.moveDown(0.5);

    const barWidth = 400;
    const barHeight = 20;
    const barY = doc.y;

    function drawScoreBar(label, score, y) {
      doc.fontSize(10).font("Helvetica").fillColor("black");
      doc.text(label, leftMargin, y, { continued: false });
      const barStartY = y + 15;
      
      doc.rect(leftMargin, barStartY, barWidth, barHeight).stroke("#ddd");
      
      const fillWidth = (score / 100) * barWidth;
      let fillColor = "#22c55e";
      if (score < 50) fillColor = "#ef4444";
      else if (score < 80) fillColor = "#f59e0b";
      
      doc.rect(leftMargin, barStartY, fillWidth, barHeight).fill(fillColor);
      
      doc.fontSize(9).font("Helvetica-Bold").fillColor("white");
      const textX = leftMargin + fillWidth - 30;
      if (fillWidth > 35) {
        doc.text(`${score}%`, textX > leftMargin ? textX : leftMargin + 5, barStartY + 5, { continued: false });
      } else {
        doc.fillColor("black");
        doc.text(`${score}%`, leftMargin + fillWidth + 5, barStartY + 5, { continued: false });
      }
    }

    let scoreY = barY;
    drawScoreBar("Overall", overall ?? 0, scoreY);
    scoreY += 40;
    drawScoreBar("SEO", seo ?? 0, scoreY);
    scoreY += 40;
    drawScoreBar("Speed", speed ?? 0, scoreY);
    scoreY += 40;
    drawScoreBar("Security", security ?? 0, scoreY);
    
    doc.y = scoreY + 40;

    if (!failed.length) {
      doc.moveDown(1);
      doc.fontSize(12).font("Helvetica").fillColor("#22c55e");
      doc.text(`All ${results.length} checks passed! No issues found.`, { align: "center" });
      doc.end();
      return;
    }

    doc.addPage();
    doc.fontSize(16).font("Helvetica-Bold").fillColor("black").text("Failing Checks");
    doc.moveDown(1);

    failed.forEach((item, i) => {
      if (i > 0 && doc.y > 650) {
        doc.addPage();
      }

      const priorityColor = item.priority === "high" ? "#ef4444" : item.priority === "medium" ? "#f59e0b" : "#6b7280";
      
      doc.fontSize(12).font("Helvetica-Bold").fillColor("black");
      doc.text(`${i + 1}. ${item.name}`, { continued: true });
      doc.fontSize(9).font("Helvetica").fillColor(priorityColor);
      doc.text(` [${item.priority.toUpperCase()}]`);
      
      doc.moveDown(0.3);
      doc.fontSize(9).font("Helvetica-Oblique").fillColor("#666");
      doc.text(`${item.category} / ${item.subcategory || "general"}`);
      
      doc.moveDown(0.5);
      doc.fontSize(9).font("Helvetica").fillColor("black");
      
      const playbook = getPlaybookFor(item.id);
      if (playbook.why) {
        doc.font("Helvetica-Bold").text("Why this matters:", { continued: false });
        doc.font("Helvetica").text(playbook.why);
        doc.moveDown(0.3);
      }

      if (playbook.steps) {
        doc.font("Helvetica-Bold").text("Action to take:", { continued: false });
        doc.font("Helvetica").text(playbook.steps);
        doc.moveDown(0.3);
      }

      const rows = item.rows || [];
      if (rows.length > 0) {
        doc.font("Helvetica-Bold").text(`Affected URLs (${rows.length}):`, { continued: false });
        doc.moveDown(0.2);
        doc.font("Helvetica");
        
        const shown = rows.slice(0, 20);
        shown.forEach((row) => {
          if (doc.y > 720) {
            doc.addPage();
          }
          const line = rowLine(item, row);
          doc.fontSize(8).text(line, { indent: 10 });
        });
        
        if (rows.length > shown.length) {
          doc.fontSize(8).fillColor("#666").text(`  ...and ${rows.length - shown.length} more URLs`, { indent: 10 });
        }
      } else {
        doc.font("Helvetica-Oblique").fillColor("#666").text("(No specific URLs; sitewide setting)");
      }
      
      doc.moveDown(1);
    });

    if (passed.length > 0) {
      doc.addPage();
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#22c55e").text("Passing Checks");
      doc.moveDown(0.5);
      doc.fontSize(9).font("Helvetica").fillColor("#666");
      doc.text("The following checks are already passing. Do not regress these when fixing issues.");
      doc.moveDown(0.5);

      passed.forEach((item) => {
        if (doc.y > 720) {
          doc.addPage();
        }
        doc.fontSize(9).font("Helvetica").fillColor("black");
        doc.text(`• ${item.name} (${item.category}, ${item.priority})`);
      });
    }

    doc.end();
  });
}

function getPlaybookFor(checkId) {
  const playbook = {
    "set-page-titles": {
      why: "Every indexable page needs a unique, descriptive <title>.",
      steps: "Set the page title in your CMS or theme template. For WordPress use Yoast/Rank Math, for Shopify use SEO title fields, for Webflow use Page settings."
    },
    "set-h1-headings": {
      why: "Each page should expose one clear H1 for people and crawlers.",
      steps: "Add a single H1 heading to each page. Use the page/product title as H1 in your template."
    },
    "use-one-h1-heading-per-page": {
      why: "Multiple H1s dilute the outline. Keep one H1; demote extras to H2.",
      steps: "Search your theme for extra H1 tags (logo, hero, widgets). Change extras to H2."
    },
    "use-optimal-length-h1-headings": {
      why: "Aim for roughly 15-70 characters so the H1 is specific but not a paragraph.",
      steps: "Rewrite the heading to be concise and descriptive."
    },
    "use-unique-h1-headings": {
      why: "Duplicate H1s make pages look like copies. Each URL needs its own heading.",
      steps: "Give each page/post a unique title. Customize H1s for different page types."
    },
    "use-optimal-length-titles": {
      why: "Title tags around 30-60 characters avoid truncation in search results.",
      steps: "Adjust SEO title template to stay within optimal length."
    },
    "set-page-descriptions": {
      why: "A meta description helps snippets and social previews.",
      steps: "Fill the meta description field for each page in your SEO plugin or page settings."
    },
    "use-optimal-length-descriptions": {
      why: "Keep meta descriptions roughly 70-160 characters.",
      steps: "Edit the SEO description to be concise and compelling."
    },
    "set-canonical-urls": {
      why: "A self-referencing canonical prevents duplicate-host and parameter copies from competing.",
      steps: "Enable canonicals in your SEO plugin. Ensure canonical URL matches the preferred URL."
    },
    "use-unique-titles": {
      why: "Duplicate titles collapse pages in search. Each URL needs its own title string.",
      steps: "Override SEO titles on pages that share the same title."
    },
    "use-unique-descriptions": {
      why: "Unique descriptions reduce duplicate-snippet issues.",
      steps: "Write unique descriptions for each page instead of using one sitewide default."
    },
    "avoid-duplicate-pages": {
      why: "Near-identical HTML wastes crawl budget.",
      steps: "301 redirect duplicate hosts (www vs apex, http vs https) to one canonical version."
    },
    "avoid-thin-content-pages": {
      why: "Pages with very little unique text rank poorly and look unfinished.",
      steps: "Add substantial content or noindex thin pages like thank-you pages."
    },
    "set-image-alt-text": {
      why: "ALT text describes images for accessibility and image search.",
      steps: "Fill the ALT text field for each image in your media library or page editor."
    },
    "set-mobile-scaling": {
      why: "Pages need viewport meta tag for proper mobile rendering.",
      steps: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> to your theme head."
    },
    "avoid-plugins": {
      why: "Flash/Java/Silverlight embeds are obsolete and blocked in modern browsers.",
      steps: "Remove plugin embeds. Replace with HTML5 video or images."
    },
    "use-short-urls": {
      why: "Shorter paths are easier to share and often rank cleaner.",
      steps: "Shorten slugs in your permalink settings or page/product handles."
    },
    "avoid-url-extensions": {
      why: ".html / .php in public URLs look dated and leak implementation.",
      steps: "Use pretty permalinks without file extensions. Add 301 redirects for old URLs."
    },
    "avoid-url-parameters": {
      why: "Indexable URLs should not rely on query strings (?id=).",
      steps: "Use path-based URLs instead of query parameters for main content."
    },
    "avoid-symbols-in-urls": {
      why: "Spaces, commas, and odd punctuation break sharing and encoding.",
      steps: "Sanitize slugs to use only lowercase letters, numbers, and hyphens."
    },
    "use-lowercase-urls": {
      why: "Mixed-case paths create duplicate URLs on case-sensitive servers.",
      steps: "Force lowercase slugs and add 301 redirects for uppercase variants."
    },
    "avoid-underscores-in-urls": {
      why: "Hyphens are the conventional word separator in URLs.",
      steps: "Change underscores to hyphens in slugs and add 301 redirects."
    },
    "avoid-deeply-nested-urls": {
      why: "Deep folders are hard to maintain.",
      steps: "Flatten URL structure by reducing folder depth."
    },
    "use-valid-html": {
      why: "Broken markup causes rendering and accessibility bugs.",
      steps: "Validate template output and fix unclosed tags."
    },
    "use-valid-css": {
      why: "Invalid CSS is dropped by the browser and can hide layout.",
      steps: "Fix CSS syntax errors in your theme or custom CSS."
    },
    "use-valid-javascript": {
      why: "Syntax errors stop later scripts on the page.",
      steps: "Fix JavaScript errors shown in browser console."
    },
    "return-404-for-broken-links": {
      why: "Missing pages should return HTTP 404, not 200 with a 'not found' template.",
      steps: "Ensure 404 template returns proper 404 status code."
    },
    "avoid-broken-internal-links": {
      why: "Internal 404s waste users and crawl budget.",
      steps: "Update menus, navigation, and content links. Add 301 redirects for moved pages."
    },
    "avoid-broken-external-links": {
      why: "Outbound 404s hurt trust.",
      steps: "Update or remove broken external links in content."
    },
    "avoid-broken-page-resources": {
      why: "Missing CSS/JS/images break layout.",
      steps: "Fix broken asset references and re-upload missing files."
    },
    "add-robotstxt-files": {
      why: "Crawlers expect /robots.txt on the site host.",
      steps: "Ensure robots.txt exists and does not block the entire site in production."
    },
    "specify-sitemap-locations": {
      why: "robots.txt should point at the XML sitemap.",
      steps: "Add Sitemap: line to robots.txt pointing to your sitemap URL."
    },
    "avoid-meta-redirects": {
      why: "Meta-refresh is a poor, slow redirect. Use HTTP 301/302.",
      steps: "Remove meta refresh tags and use server-side 301 redirects."
    },
    "avoid-temporary-redirects": {
      why: "Temporary (302/307) redirects should be 301 when the move is permanent.",
      steps: "Change redirect rules to use 301 status for permanent moves."
    },
    "compress-sent-data": {
      why: "HTML/CSS/JS should be gzip or Brotli compressed in transit.",
      steps: "Enable gzip/Brotli compression on your web server."
    },
    "avoid-recompressing-data": {
      why: "Double-gzip of already compressed files wastes CPU.",
      steps: "Exclude images and fonts from gzip rules."
    },
    "minify-files": {
      why: "Minified CSS/JS ships fewer bytes.",
      steps: "Use a build tool or plugin to minify CSS and JavaScript."
    },
    "avoid-inline-sourcemaps": {
      why: "Inline source maps bloat production JS and leak original source.",
      steps: "Remove sourceMappingURL from production builds."
    },
    "avoid-inline-javascript": {
      why: "Large inline scripts block parsing and are harder to cache.",
      steps: "Move scripts to external .js files."
    },
    "defer-javascript-loading": {
      why: "Non-critical JS should use defer so it does not block rendering.",
      steps: "Add defer attribute to script tags or load scripts after first paint."
    },
    "avoid-inline-css": {
      why: "Large inline CSS bloats HTML and skips file cache.",
      steps: "Move large inline CSS to external stylesheets."
    },
    "avoid-css-import": {
      why: "@import in CSS is serial and slow.",
      steps: "Replace @import with additional link tags or bundle files."
    },
    "avoid-internal-link-redirects": {
      why: "In-page links should point at the final URL, not a chain.",
      steps: "Update internal links to point directly to final destination URLs."
    },
    "avoid-resource-redirects": {
      why: "CSS/JS/images should be requested at their final URL.",
      steps: "Update asset URLs to point to their final location."
    },
    "avoid-redirect-chains": {
      why: "A→B→C doubles latency. Collapse to one 301.",
      steps: "Flatten redirect chains to jump directly to final destination."
    },
    "allow-caching": {
      why: "Static assets should be cacheable.",
      steps: "Set Cache-Control headers with appropriate max-age for static files."
    },
    "use-long-caching-times": {
      why: "Fingerprinted static files can cache for weeks.",
      steps: "Set long max-age for versioned assets."
    },
    "avoid-duplicate-resources": {
      why: "The same CSS/JS loaded twice wastes bytes.",
      steps: "Remove duplicate script/stylesheet includes."
    },
    "use-https": {
      why: "The site must be served over HTTPS.",
      steps: "Install SSL certificate and redirect HTTP to HTTPS."
    },
    "avoid-mixed-content-errors": {
      why: "HTTPS pages must not load http:// resources.",
      steps: "Update all resource URLs to use https:// or protocol-relative URLs."
    },
    "secure-passwords-fields": {
      why: "Password fields belong on HTTPS pages in POST forms.",
      steps: "Ensure password inputs are only on HTTPS pages with proper autocomplete."
    },
    "enable-hsts": {
      why: "Strict-Transport-Security tells browsers to stay on HTTPS.",
      steps: "Add HSTS header with appropriate max-age."
    },
    "allow-hsts-preload": {
      why: "Preload-ready HSTS needs long max-age and preload directive.",
      steps: "Add preload to HSTS header and submit to hstspreload.org list."
    },
    "specify-mime-types": {
      why: "CSS/JS must be served with correct Content-Type.",
      steps: "Configure server to send correct MIME types for assets."
    },
    "disable-content-sniffing": {
      why: "X-Content-Type-Options: nosniff stops browsers from guessing MIME types.",
      steps: "Add X-Content-Type-Options: nosniff header."
    },
    "restrict-iframe-usage": {
      why: "X-Frame-Options blocks clickjacking.",
      steps: "Add X-Frame-Options: SAMEORIGIN or CSP frame-ancestors."
    },
    "enable-xss-protection": {
      why: "Content-Security-Policy provides XSS protection.",
      steps: "Add Content-Security-Policy header with appropriate directives."
    },
    "hide-server-version-data": {
      why: "Do not advertise server versions.",
      steps: "Hide Server and X-Powered-By headers."
    }
  };

  return playbook[checkId] || {
    why: "Fix the listed URLs so this check passes on a re-crawl.",
    steps: "Inspect the failing URLs, apply the platform-native change, then re-crawl."
  };
}
