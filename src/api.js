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

export async function registerFixReport(payload) {
  const res = await fetch("/api/fix-report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Could not save report request");
  }
  return res.json();
}

export async function emailJobResults(jobId, email) {
  const res = await fetch(`/api/jobs/${jobId}/email-results`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Could not send email");
  }
  return res.json();
}

export function openEvents(id, onEvent) {
  const es = new EventSource(`/api/crawl/${id}/events`);
  let closed = false;
  const close = () => {
    closed = true;
    es.close();
  };
  es.addEventListener("message", (ev) => {
    if (closed) return;
    try {
      const data = JSON.parse(ev.data);
      if (data.type === "done" || data.type === "error") close();
      onEvent(data);
    } catch {
      /* ignore malformed SSE payloads */
    }
  });
  es.onerror = () => {
    if (closed) {
      es.close();
      return;
    }
  };
  return { close, es };
}
