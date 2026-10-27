export const PLATFORMS = [
  {
    id: "wordpress",
    label: "WordPress",
    icon: "/assets/svg/wordpress.svg",
    mcp: "WordPress files, WP-CLI, or Hostinger WordPress MCP",
    access: [
      "Theme PHP/HTML templates, `header.php` / block theme `parts/header.html`, and the active child theme.",
      "SEO plugins (Yoast, Rank Math, AIOSEO) for titles, descriptions, canonicals, and sitemaps.",
      "`.htaccess` or Hostinger/LiteSpeed headers for HSTS, sniffing, frame options, compression, and cache.",
      "Media library for image ALT text. Settings → Permalinks for URL shape."
    ]
  },
  {
    id: "shopify",
    label: "Shopify",
    icon: "/assets/svg/shopify.svg",
    mcp: "Shopify Admin API / theme files / Cursor Shopify MCP",
    access: [
      "Online Store → Themes → Edit code (`theme.liquid`, JSON templates, sections) and theme settings.",
      "Admin SEO fields on products, collections, pages, blog posts, and the homepage preference.",
      "Online Store → Preferences for password page, and Settings → Apps for extra scripts.",
      "Many HTTP security and cache headers are owned by Shopify's CDN. Do not invent `.htaccess` fixes. Use Cloudflare or a Shopify app only when the header is not already set."
    ]
  },
  {
    id: "webflow",
    label: "Webflow",
    icon: "/assets/svg/webflow.svg",
    mcp: "Webflow Designer / CMS / Cursor Webflow MCP",
    access: [
      "Page settings (gear) for title, description, canonical, and indexing.",
      "Site settings → Custom code for head/footer snippets, and CMS collection template SEO fields.",
      "Asset panel for image ALT. Designer for a single H1 per page.",
      "Hosting headers (HSTS, MIME sniffing, XSS) are limited on Webflow hosting. Prefer Webflow SSL plus Cloudflare if a header cannot be set in the Designer."
    ]
  }
];

function trio(wordpress, shopify, webflow) {
  return { wordpress, shopify, webflow };
}

export const CHECK_STEPS = {
  "set-page-titles": {
    why: "Every indexable page needs a unique, descriptive `<title>`.",
    ...trio(
      "Edit the post/page SEO title (Yoast/Rank Math) or the theme `wp_title` / `document_title_parts` filter. Confirm the rendered `<title>` is not empty.",
      "Set the SEO title on the product, page, collection, or blog post. Homepage: Online Store → Preferences → Title. `theme.liquid` must output `{{ page_title }}`.",
      "Page settings → SEO title. For CMS templates, bind the SEO title to a unique field. Publish after saving."
    )
  },
  "set-h1-headings": {
    why: "Each page should expose one clear H1 for people and crawlers.",
    ...trio(
      "Add a single `h1` in the template or block editor. Do not hide the only H1 with CSS `display:none`.",
      "Use the page/product title as H1 in the JSON template or section (`{{ page.title }}`, `{{ product.title }}`). Avoid a logo image as the only H1.",
      "Select the main heading and set tag to H1 in the Designer. Collection templates should bind the item name to an H1."
    )
  },
  "use-one-h1-heading-per-page": {
    why: "Multiple H1s dilute the outline. Keep one H1; demote extras to H2.",
    ...trio(
      "Search the theme and page content for extra `h1` tags (logo, hero, widgets). Change extras to `h2`.",
      "Check `theme.liquid` and the section for this template. Logo and nav labels must not be H1. Keep product title as the only H1.",
      "In the Navigator, list heading tags. Change duplicate H1s to H2. Symbols and combo classes often hide extras."
    )
  },
  "use-optimal-length-h1-headings": {
    why: "Aim for roughly 15–70 characters so the H1 is specific but not a paragraph.",
    ...trio(
      "Rewrite the heading in the editor or SEO plugin. Do not use CSS to fake a shorter heading.",
      "Shorten the product/page title or use a theme setting for a shorter H1 while keeping the admin title for the catalog.",
      "Edit the heading text on the canvas or the CMS field bound to the H1."
    )
  },
  "use-unique-h1-headings": {
    why: "Duplicate H1s make pages look like copies. Each URL needs its own heading.",
    ...trio(
      "Give each page/post a unique title. For archives, include the term name in the H1.",
      "Do not reuse the same marketing headline on every template. Product titles must differ; homepage vs collection H1s must differ.",
      "Rewrite duplicate headings. If www and apex both appear, pick one canonical host in hosting/DNS and 301 the other."
    )
  },
  "use-optimal-length-titles": {
    why: "Title tags around 30–60 characters avoid truncation in search results.",
    ...trio(
      "Adjust the SEO title template so `%title% %sep% %sitename%` does not overflow. Per-page overrides for long titles.",
      "Shopify appends the shop name by default. Use a shorter SEO title field so the full `<title>` stays in range.",
      "Page settings SEO title: write the exact string you want. Do not rely on the Designer H1 if it is too long or too short."
    )
  },
  "set-page-descriptions": {
    why: "A meta description helps snippets and social previews.",
    ...trio(
      "Fill Rank Math/Yoast meta description, or `rank_math_description` / `wpseo_metadesc` filters. Empty descriptions fail this check.",
      "Fill Search engine listing → Description on each resource. Homepage: Online Store → Preferences → Meta description.",
      "Page settings → Description. CMS items need a bound SEO description field, not only the visible excerpt."
    )
  },
  "use-optimal-length-descriptions": {
    why: "Keep meta descriptions roughly 70–160 characters.",
    ...trio(
      "Edit the SEO description; disable templates that output empty or 300-character excerpts.",
      "Rewrite the SEO description field. Theme `theme.liquid` should not override with a truncated excerpt.",
      "Trim or expand the Page settings description until it sits in range, then publish."
    )
  },
  "set-canonical-urls": {
    why: "A self-referencing canonical prevents duplicate-host and parameter copies from competing.",
    ...trio(
      "Enable canonicals in the SEO plugin. Confirm `<link rel=\"canonical\" href=\"...\">` matches the preferred URL (https, www or apex, no tracking params).",
      "Shopify outputs canonicals in `theme.liquid` (`canonical_url`). Do not remove it. Prefer one host (www or apex) in Settings → Domains.",
      "Page settings → Canonical URL, or leave blank to use the page URL. Set the site's primary domain so www and apex are not both indexable."
    )
  },
  "use-unique-titles": {
    why: "Duplicate titles collapse pages in search. Each URL needs its own title string.",
    ...trio(
      "Override SEO titles on clones, pagination, and tag archives (`Page 2 of …`).",
      "Give products/pages unique SEO titles. Homepage and a page named Home must not share the shop title.",
      "Rewrite SEO titles that match another page. Static and CMS items cannot share the same SEO title."
    )
  },
  "use-unique-descriptions": {
    why: "Unique descriptions reduce duplicate-snippet issues.",
    ...trio(
      "Stop using one sitewide default description. Write per-page copy or a template that includes the unique title.",
      "Fill each resource's SEO description; do not leave the shop description as the fallback on every page.",
      "Bind CMS SEO description to a unique field. Static pages get their own Page settings description."
    )
  },
  "avoid-duplicate-pages": {
    why: "Near-identical HTML (often www vs apex, or HTTP vs HTTPS, or a reprint) wastes crawl budget.",
    ...trio(
      "301 the extra host and http→https in `.htaccess` or Hostinger. Noindex thin reprints. Prefer one permalink.",
      "Settings → Domains: set the primary domain and redirect others. Do not serve the same theme on two hosts without a 301.",
      "Hosting → Publish to one domain. Add a 301 host redirect (Webflow or DNS). Unpublish duplicate project copies."
    )
  },
  "avoid-thin-content-pages": {
    why: "Pages with very little unique text rank poorly and look unfinished.",
    ...trio(
      "Add real copy in the editor, or noindex thank-you / tag / empty archives.",
      "Add product descriptions (not only title + images). Noindex empty collections. Homepage sections need text, not only hero video.",
      "Add Body copy on the canvas or CMS Rich text. Do not publish landing pages that are only a form and a heading."
    )
  },
  "set-image-alt-text": {
    why: "ALT text describes images for accessibility and image search.",
    ...trio(
      "Media library → each image → Alternative text. For featured images, fill the ALT field on the post. Theme `alt` must use `the_post_thumbnail` alt.",
      "Products → image ALT. Theme: `alt=\"{{ image.alt | escape }}\"` — never empty alt on informative images. Decorative images can use `alt=\"\"` plus `role=\"presentation\"`.",
      "Select the image → Image settings → Alt text. For CMS images, bind Alt to a plain-text field. Re-publish."
    )
  },
  "set-mobile-scaling": {
    why: "Pages need `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">`.",
    ...trio(
      "Add the viewport meta in `header.php` or the block theme `<head>`. Many themes already have it; child themes sometimes drop it.",
      "`theme.liquid` `<head>` must include Shopify's viewport meta. Do not remove it when customizing the head.",
      "Site settings → Custom code Head should not strip viewport. Webflow includes it by default; restore it if a custom head overwrote `<head>`."
    )
  },
  "avoid-plugins": {
    why: "Flash/Java/Silverlight embeds are obsolete and blocked in modern browsers.",
    ...trio(
      "Remove `<object>` / `<embed>` / `.swf` from post content and widgets. Replace with HTML5 video or an image.",
      "Remove plugin embeds from product descriptions and `theme.liquid`. Use Shopify video or YouTube iframe instead.",
      "Delete Embed elements that load plugins. Use Webflow Video or an HTML5 embed."
    )
  },
  "use-short-urls": {
    why: "Shorter paths are easier to share and often rank cleaner.",
    ...trio(
      "Settings → Permalinks: `/%postname%/`. Rename long slugs. Avoid date+category+title stacks.",
      "Shorten product/page handles in the admin (Search engine listing → URL handle).",
      "Page settings → Slug. Keep CMS slugs short and readable."
    )
  },
  "avoid-url-extensions": {
    why: "`.html` / `.php` in public URLs look dated and leak implementation.",
    ...trio(
      "Use pretty permalinks. Redirect old `.html`/`.php` URLs with 301s.",
      "Shopify handles have no extension by default. If a custom app added `.html`, change the handle and 301.",
      "Webflow slugs should not include `.html`. Update the slug and publish redirects from the old path."
    )
  },
  "avoid-url-parameters": {
    why: "Indexable URLs should not rely on query strings (`?id=`).",
    ...trio(
      "Use rewrite rules / pretty permalinks. Canonicalize parameterized copies.",
      "Do not use query-string storefront URLs for primary content. Filters can stay as parameters if canonical points at the clean URL.",
      "Use path slugs, not `?page=` for main documents. Pagination can stay if rel=canonical or rel=next/prev is correct."
    )
  },
  "avoid-symbols-in-urls": {
    why: "Spaces, commas, and odd punctuation break sharing and encoding.",
    ...trio(
      "Sanitize slugs (`sanitize_title`). Rename offending posts.",
      "Edit the handle: lowercase, hyphens only.",
      "Edit the slug in Page settings. Publish a 301 from the old slug."
    )
  },
  "use-lowercase-urls": {
    why: "Mixed-case paths create duplicate URLs on case-sensitive servers.",
    ...trio(
      "Force lowercase slugs. Add a 301 from uppercase variants if the host is case-sensitive.",
      "Handles are lowercase by default; fix any custom app URLs.",
      "Lowercase the slug. Add a 301 redirect for the old casing."
    )
  },
  "avoid-underscores-in-urls": {
    why: "Hyphens are the conventional word separator in URLs.",
    ...trio(
      "Rename slugs from `bad_page` to `bad-page` and 301 the old path.",
      "Change the handle from underscores to hyphens. Shopify will 301 the old handle if you update it in admin.",
      "Change the slug to hyphenated form and add a 301 in Page settings → Redirects (or Hosting redirects)."
    )
  },
  "avoid-deeply-nested-urls": {
    why: "Deep folders (`/a/b/c/d/e`) are hard to maintain and look like leftovers.",
    ...trio(
      "Flatten permalinks. Move content up; 301 old paths.",
      "Keep handles flat (`/pages/about`, `/products/name`). Avoid nested custom proxy paths.",
      "Flatten folder structure in the Pages panel. Update links and redirects."
    )
  },
  "use-valid-html": {
    why: "Broken markup causes rendering and accessibility bugs.",
    ...trio(
      "Validate the template output. Fix unclosed tags in the theme and in post HTML. Disable plugins that inject broken markup.",
      "Validate `theme.liquid` and sections. Liquid must not leave stray `</div>`s. Check app block snippets.",
      "Check the Navigator for unclosed wrappers. Custom embed HTML is the usual culprit — fix the embed."
    )
  },
  "use-valid-css": {
    why: "Invalid CSS is dropped by the browser and can hide layout.",
    ...trio(
      "Fix theme `style.css` and customizer extra CSS. Autoptimize/minifiers can break files — exclude broken sheets.",
      "Fix `assets/*.css` in the theme. Do not minify already-broken CSS.",
      "Fix Designer custom CSS and site-wide CSS. Invalid rules often come from pasted vendor snippets."
    )
  },
  "use-valid-javascript": {
    why: "Syntax errors stop later scripts on the page.",
    ...trio(
      "Fix theme JS and plugin conflicts. Check the browser console on the listed URLs.",
      "Fix `assets/*.js` and app scripts in `theme.liquid`. One syntax error in a bundled file fails this check.",
      "Fix site/page custom code in Site settings. Keep scripts in the before-`</body>` slot unless they must be in `<head>`."
    )
  },
  "return-404-for-broken-links": {
    why: "Missing pages should return HTTP 404 (or 410), not 200 with a 'not found' template.",
    ...trio(
      "Do not force unknown slugs to the homepage. Ensure the 404 template is used and the status is 404.",
      "Shopify already 404s unknown paths. Custom apps/proxies that return 200 for missing content must send 404.",
      "Do not use a published '404' page at a real slug that returns 200 for missing CMS items. Use Webflow's 404 page."
    )
  },
  "avoid-broken-internal-links": {
    why: "Internal 404s waste users and crawl budget. Fix or remove the hrefs.",
    ...trio(
      "Update menus, widgets, and post content. Use a redirection plugin for moved slugs. `#` empty hashes should become real URLs or be removed.",
      "Update navigation menus and section buttons. Broken case-study/blog handles need new URLs or 301s. Avoid `href=\"#\"` for real destinations.",
      "Fix Navbar / Button / Text links in the Designer. Publish redirects for renamed slugs. Don't leave `#` as the only href on primary CTAs."
    )
  },
  "avoid-broken-external-links": {
    why: "Outbound 404s hurt trust. Update or drop them.",
    ...trio(
      "Edit the post/widget. Replace or remove the URL.",
      "Edit the theme section or product description. Replace dead partner/affiliate links.",
      "Edit the link on the canvas. For CMS, fix the URL field on the item."
    )
  },
  "avoid-broken-page-resources": {
    why: "Missing CSS/JS/images break layout. Point at files that exist or upload replacements.",
    ...trio(
      "Fix theme `src`/`href`. Re-upload media. Clear CDN cache after replacing a file.",
      "Fix `asset_url` / `file_url` references. Upload the missing asset in Content → Files or the theme assets folder.",
      "Re-upload the asset in the Assets panel and re-bind the image/file. Publish."
    )
  },
  "add-robotstxt-files": {
    why: "Crawlers expect `/robots.txt` on the site host.",
    ...trio(
      "A virtual robots.txt is fine (Yoast/Rank Math). Do not block the whole site with `Disallow: /` on production.",
      "Shopify serves robots.txt automatically. If this failed, the crawl likely hit a host without Shopify's file — fix the primary domain.",
      "Webflow serves robots.txt. Enable it in Site settings → SEO. Do not block all paths on production."
    )
  },
  "specify-sitemap-locations": {
    why: "`robots.txt` should point at the XML sitemap.",
    ...trio(
      "SEO plugin: include `Sitemap: https://example.com/sitemap_index.xml`. Confirm the file returns 200.",
      "Shopify lists the sitemap in robots.txt. If missing, domain/primary-host misconfig is the usual cause.",
      "Site settings → SEO → sitemap. Ensure robots.txt includes the sitemap URL after publish."
    )
  },
  "avoid-meta-redirects": {
    why: "Meta-refresh is a poor, slow redirect. Use HTTP 301/302.",
    ...trio(
      "Remove `<meta http-equiv=\"refresh\">` from templates and plugins. Use `wp_redirect` or server 301s.",
      "Remove meta refresh from `theme.liquid` or page content. Use Shopify URL redirects.",
      "Remove meta refresh from custom code. Use Webflow hosting 301 redirects."
    )
  },
  "avoid-temporary-redirects": {
    why: "Temporary (302/307) redirects should be 301 when the move is permanent.",
    ...trio(
      "Change redirection plugin rules and `.htaccess` `Redirect` / `RewriteRule` flags to 301.",
      "Online Store → Navigation → URL redirects: use permanent. Apps that 302 should be reconfigured.",
      "Hosting redirects: set 301. CMS item slug changes should publish a permanent redirect."
    )
  },
  "compress-sent-data": {
    why: "HTML/CSS/JS should be gzip or Brotli compressed in transit.",
    ...trio(
      "Enable gzip/Brotli in Hostinger / LiteSpeed / `.htaccess` `mod_deflate`. Autoptimize does not replace transport compression.",
      "Shopify's CDN already compresses most assets. If HTML failed, it is often a third-party app proxy — fix that app or bypass it.",
      "Webflow CDN compresses published assets. Custom reverse proxies must not strip `Content-Encoding`."
    )
  },
  "avoid-recompressing-data": {
    why: "Double-gzip of already compressed files (jpeg/png/woff2) wastes CPU and can corrupt downloads.",
    ...trio(
      "Exclude images and fonts from gzip rules. LiteSpeed/Hostinger cache plugins often have a 'compress images' toggle — turn it off for precompressed types.",
      "Do not gzip images in a custom proxy in front of Shopify.",
      "Do not add a host-level gzip on top of Webflow's CDN for images/fonts."
    )
  },
  "minify-files": {
    why: "Minified CSS/JS ships fewer bytes.",
    ...trio(
      "Use a proven minifier (Autoptimize, LiteSpeed cache, or the build step). Do not minify already-minified vendor files twice.",
      "Theme assets: provide `.min.css` / `.min.js` or a build step. Shopify does not minify Liquid-output CSS for you.",
      "Enable minify in Site settings if available, or commit minified custom CSS/JS. Designer-generated CSS is already compact."
    )
  },
  "avoid-inline-sourcemaps": {
    why: "Inline source maps bloat production JS and leak original source.",
    ...trio(
      "Rebuild assets with `devtool` off in production. Strip `sourceMappingURL` from plugin bundles you control.",
      "Remove `sourceMappingURL` from theme JS assets before upload.",
      "Do not paste maps into custom code. Host maps only on staging."
    )
  },
  "avoid-inline-javascript": {
    why: "Large inline scripts block parsing and are harder to cache.",
    ...trio(
      "Move scripts to enqueued `.js` files (`wp_enqueue_script`). Keep only tiny bootstraps inline.",
      "Move snippets from `theme.liquid` into `assets/*.js` and load with `script_tag`. App pixels belong in Customer events when possible.",
      "Move page custom code into an external file in Assets, or one site-wide script in Site settings instead of per-page blobs."
    )
  },
  "defer-javascript-loading": {
    why: "Non-critical JS should use `defer` (or load after first paint) so it does not block rendering.",
    ...trio(
      "`wp_enqueue_script` with `strategy => 'defer'`. Audit plugins that inject blocking jQuery in the head.",
      "Use `script_tag` with `defer` for theme JS. Third-party libraries (jQuery, anime.js, Webflow-like bundles) should not sit blocking in `<head>` unless required.",
      "Site settings → Custom code: prefer before-`</body>`. Disable unused animations libraries on templates that do not need them."
    )
  },
  "avoid-inline-css": {
    why: "Large inline CSS bloats HTML and skips file cache.",
    ...trio(
      "Move Customizer extra CSS into `style.css`. Critical CSS can stay small; dump the rest to a file.",
      "Move `{% stylesheet %}` blobs into `assets/*.css`. Keep critical CSS tiny.",
      "Prefer Designer styles. Move large `<style>` embeds into the site's custom CSS file."
    )
  },
  "avoid-css-import": {
    why: "`@import` in CSS is serial and slow. Use extra `<link>` tags or bundle.",
    ...trio(
      "Replace `@import url(...)` in `style.css` with `wp_enqueue_style`.",
      "Replace `@import` in theme CSS with additional `stylesheet_tag` lines or a bundled file.",
      "Remove `@import` from custom CSS. Add a second stylesheet in custom code `<head>` or import into the Designer's CSS."
    )
  },
  "avoid-internal-link-redirects": {
    why: "In-page links should point at the final URL, not a chain.",
    ...trio(
      "Update menus and content to the destination permalink. Keep 301s for old inbound links only.",
      "Point nav and buttons at the current handle, not an old redirecting URL.",
      "Update Designer links to the current slug. Keep hosting redirects for external inbound only."
    )
  },
  "avoid-resource-redirects": {
    why: "CSS/JS/images should be requested at their final URL.",
    ...trio(
      "Update theme URLs after CDN/path changes. Avoid linking to http that 301s to https.",
      "Use `asset_url` / `file_url` helpers so protocol and CDN host are correct.",
      "Re-bind assets after moving hosting. Use https asset URLs."
    )
  },
  "avoid-redirect-chains": {
    why: "A→B→C doubles latency. Collapse to one 301.",
    ...trio(
      "Flatten redirection plugin rules and `.htaccess`. http+www should jump straight to https+primary host.",
      "Settings → Domains: one hop to the primary domain. Delete extra redirect rows that stack.",
      "One hosting redirect: old path → final path. Do not chain Webflow + DNS + Cloudflare page rules."
    )
  },
  "allow-caching": {
    why: "Static assets should be cacheable (`Cache-Control` / `Expires`). `no-store` on CSS/JS is usually a mistake.",
    ...trio(
      "LiteSpeed/Hostinger cache: long TTL for `css|js|jpg|png|woff2`. Do not send `no-store` on static files. HTML can stay shorter.",
      "Shopify CDN caches theme assets. If `no-cache` appears, an app or reverse proxy is overriding — fix that layer.",
      "Webflow CDN caches published assets. Custom proxy/CDN rules must not set `no-store` on CSS/JS."
    )
  },
  "use-long-caching-times": {
    why: "Fingerprinted static files can cache for weeks. HTML can be shorter.",
    ...trio(
      "Set `Expires` / `Cache-Control: max-age=31536000, immutable` on hashed assets. Purge on deploy.",
      "Theme assets with `?v=` are CDN cached. Do not add a plugin that forces max-age=0 on `/cdn/shop/`.",
      "Published CSS/JS are hashed. Do not disable CDN cache in front of Webflow."
    )
  },
  "avoid-duplicate-resources": {
    why: "The same CSS/JS loaded twice wastes bytes and can double-run side effects.",
    ...trio(
      "Dequeue duplicate plugin copies of jQuery. One `wp_enqueue` per handle.",
      "Load jQuery / vendor files once in `theme.liquid`. Apps often inject a second copy — disable the duplicate.",
      "Remove duplicate custom-code snippets. One site-wide jQuery, not per page."
    )
  },
  "use-https": {
    why: "The site must be served over HTTPS.",
    ...trio(
      "Install SSL in Hostinger. Force https in `.htaccess` or Really Simple SSL. Update `home`/`siteurl` to https.",
      "Shopify provides HTTPS. Set the primary domain and redirect HTTP. Mixed admin custom domains need the SSL to be issued.",
      "Enable SSL in Webflow hosting. Publish to the https domain. Redirect HTTP in hosting settings."
    )
  },
  "avoid-mixed-content-errors": {
    why: "HTTPS pages must not load http:// images, scripts, or CSS.",
    ...trio(
      "Search the DB and theme for `http://`. Use `https://` or protocol-relative only if needed. A search-replace plugin helps.",
      "Replace `http://` asset URLs in theme settings and product HTML. `asset_url` already yields https.",
      "Replace http image URLs in the Designer and CMS. Re-upload assets so they come from Webflow's https CDN."
    )
  },
  "secure-passwords-fields": {
    why: "Password fields belong on HTTPS pages, inside a POST form, with autocomplete set correctly.",
    ...trio(
      "Login/checkout forms: `method=\"post\"`, `autocomplete=\"current-password\"` / `new-password`, served on https. Do not put password inputs on HTTP pages.",
      "Use Shopify's customer login / checkout. Do not add a custom password field on a non-https or GET form in the theme.",
      "Form blocks: POST to a secure action. Do not collect passwords in Webflow forms unless the endpoint is https and you know the compliance story — prefer hosted auth."
    )
  },
  "enable-hsts": {
    why: "`Strict-Transport-Security` tells browsers to stay on HTTPS.",
    ...trio(
      "Add `Header always set Strict-Transport-Security \"max-age=31536000; includeSubDomains\"` in `.htaccess` or Hostinger headers. Only after SSL works on all hosts.",
      "Shopify sends HSTS on `*.myshopify.com` and most connected domains. If missing on a custom domain, wait for SSL or put Cloudflare in front with HSTS.",
      "Webflow SSL does not always send a long HSTS max-age. Add HSTS in Cloudflare (recommended) or a reverse proxy. Do not invent a Webflow Designer setting that does not exist."
    )
  },
  "allow-hsts-preload": {
    why: "Preload-ready HSTS needs a long max-age, `includeSubDomains`, and `preload`.",
    ...trio(
      "Once HSTS is stable, add `; preload` and submit the domain to hstspreload.org. This is optional and hard to undo.",
      "Usually not controllable in Shopify admin. Use Cloudflare I Am Under Attack off + HSTS preload there, or accept Shopify's default as residual.",
      "Set preload on Cloudflare in front of Webflow. Do not enable preload until every subdomain is on HTTPS."
    )
  },
  "specify-mime-types": {
    why: "CSS/JS must be served with the correct `Content-Type`.",
    ...trio(
      "Fix server MIME maps (`AddType text/css .css`, `application/javascript .js`). Cache plugins must not serve JS as `text/html`.",
      "Shopify sets MIME types. Failures are usually an app proxy or a file uploaded with the wrong extension.",
      "Webflow sets MIME types for Assets. Custom reverse proxies must not rewrite them to `text/plain`."
    )
  },
  "disable-content-sniffing": {
    why: "`X-Content-Type-Options: nosniff` stops browsers from guessing MIME types.",
    ...trio(
      "Set the header in `.htaccess`, LiteSpeed, or a security plugin (Really Simple SSL / headers module).",
      "Not settable in theme Liquid. Use a Shopify app that injects security headers, or Cloudflare Transform Rules: add `nosniff`.",
      "Add via Cloudflare or a reverse proxy. Webflow hosting may not expose this header."
    )
  },
  "restrict-iframe-usage": {
    why: "`X-Frame-Options` / `Content-Security-Policy frame-ancestors` blocks clickjacking.",
    ...trio(
      "Send `X-Frame-Options: SAMEORIGIN` (or CSP `frame-ancestors 'self'`). Security plugins can do this. Do not break needed admin embeds.",
      "Shopify sets frame options on checkout; storefront may still need Cloudflare CSP. Theme Liquid cannot reliably set this response header.",
      "Set CSP/frame-ancestors at Cloudflare. Designer has no frame-options control. Avoid embedding the whole site in third-party iframes."
    )
  },
  "enable-xss-protection": {
    why: "A modern substitute is `Content-Security-Policy`. Legacy `X-XSS-Protection` is optional.",
    ...trio(
      "Prefer CSP (`default-src 'self'` plus the script/style hosts you need) via a security plugin or `.htaccess`. Do not enable obsolete `X-XSS-Protection: 1` as the only defense.",
      "Add CSP through Cloudflare or a headers app. Theme files cannot set response headers. Do not paste a CSP that blocks Shopify's own CDNs.",
      "Add CSP in Cloudflare. If you only control custom code, you cannot set this response header from the Designer."
    )
  },
  "hide-server-version-data": {
    why: "Do not advertise Apache/PHP/WordPress versions in `Server` / `X-Powered-By`.",
    ...trio(
      "Hostinger/LiteSpeed: hide server signature. `header_remove('X-Powered-By')` in PHP. Security plugins offer 'hide WP version'. Remove generator meta in the theme.",
      "Shopify controls `Server`. You cannot hide it from Liquid. Treat as residual / platform-owned.",
      "Webflow controls `Server`. Treat as residual unless Cloudflare strips it."
    )
  }
};

export function playbookFor(checkId, platformId) {
  const entry = CHECK_STEPS[checkId];
  if (!entry) {
    return {
      why: "Fix the listed URLs so this check passes on a re-crawl.",
      steps: "Inspect the failing URLs, apply the platform-native change, then re-crawl."
    };
  }
  return {
    why: entry.why,
    steps: entry[platformId] || entry.wordpress
  };
}

export function platformMeta(platformId) {
  return PLATFORMS.find((p) => p.id === platformId) || null;
}
