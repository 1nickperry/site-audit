# Site Audit reconstruction notes

Standalone Vite + Vue 3 + Express app. It is not a Chrome extension and does not execute unpacked `js/main.js` or `chrome.*` shims. The original marketing site was not downloaded.

## REA

- `inspect-web-page` / `analyze-web-bundle` are the wrong tools for a `chrome-extension://` target (`target_not_allowed` remains in `page.json`).
- Command: `rea analyze-javascript-application` on the unpacked extension. Complete Evidence is `bundle.json` (parent `ev_a83306890b920bc33e43cae203d56f798cdee7b01614d1e3a8579a6c7cfa08cd`).
- Full-tree runs including `js/main.js` hit `provider_timeout` during static analysis. Successful delivery used `--detail summary` plus `--source-path` for `js/background.js`, `index.html`, `manifest.json`, and locales.

## Observed from the shipped extension

- Vue-style `#app-main` shell, Roboto, dashboard / config / summary / report screens.
- 58 website-check registrations plus 4 explore tables that are not scored.
- Config literals: title 10–60, H1 1–70, description 100–320, min 300 words, URL length 100, 5 path segments, 10s timeout, 30 URLs/sec.

## Guessed / reconstructed

- Express crawler stays on the start site (`www` counts as the same host). Off-site affiliate/social links are not fetched unless enabled.
- Default max pages 100. SSE jobs, `/fixture`, `SiteAudit/1.0` user-agent.
- Dashboard meters: overall / SEO / speed / security pass percentages.
- No Firebase, analytics, billing, or Dexie persistence.
