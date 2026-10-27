const KEY = "site-audit.currentJob";

export function saveJob(job) {
  sessionStorage.setItem(KEY, JSON.stringify(job));
}

export function loadJob() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

export async function fetchChecks() {
  const res = await fetch("/api/checks");
  return res.json();
}

export async function startCrawl(config) {
  const res = await fetch("/api/crawl", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(config)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Crawl failed to start");
  }
  return res.json();
}

export async function fetchCrawl(id) {
  const res = await fetch(`/api/crawl/${id}`);
  if (!res.ok) throw new Error("Crawl not found");
  return res.json();
}

export function openEvents(id, onEvent) {
  const es = new EventSource(`/api/crawl/${id}/events`);
  es.addEventListener("message", (ev) => {
    try {
      onEvent(JSON.parse(ev.data));
    } catch {
      /* ignore malformed SSE payloads */
    }
  });
  es.onerror = () => {
    /* server closes the stream when the crawl ends */
  };
  return es;
}
