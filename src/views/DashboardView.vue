<template>
  <section>
    <h1>Dashboard</h1>
    <p class="lede" v-if="job">{{ job.config?.url || "Current crawl" }} — {{ job.status }}</p>
    <p class="lede" v-else>Start a crawl from Config.</p>

    <div class="scoreboard">
      <div v-for="meter in meters" :key="meter.id" class="score-card">
        <div
          class="ring"
          :style="{ background: `conic-gradient(${meter.color} ${meter.value || 0}%, #e4e8f1 0)` }"
        >
          <div class="ring-hole">{{ meter.value == null ? "—" : meter.value + "%" }}</div>
        </div>
        <div class="score-label">{{ meter.label }}</div>
        <div class="muted">{{ meter.detail }}</div>
      </div>
    </div>

    <div class="stats">
      <div class="stat"><div class="n">{{ job?.crawledPages || 0 }}</div><div class="l">Pages crawled</div></div>
      <div class="stat"><div class="n">{{ job?.crawledUrls || 0 }}</div><div class="l">URLs fetched</div></div>
      <div class="stat bad"><div class="n">{{ failCount }}</div><div class="l">Failed checks</div></div>
      <div class="stat ok"><div class="n">{{ passCount }}</div><div class="l">Passed checks</div></div>
    </div>

    <div class="progress"><span :style="{ width: pct + '%' }"></span></div>

    <div class="card">
      <h2><img src="/assets/svg/uncrawled.svg" alt="" />Live log</h2>
      <div class="log">
        <div v-for="(line, i) in log" :key="i">{{ line }}</div>
      </div>
    </div>
  </section>
</template>

<script>
import { onMounted, onUnmounted, ref, computed } from "vue";
import { fetchCrawl, loadJob, openEvents, saveJob } from "../api.js";
import { categoryScore, scoreColor } from "../scores.js";

export default {
  name: "DashboardView",
  setup() {
    const job = ref(loadJob());
    const log = ref([]);
    let es;

    const results = computed(() => job.value?.results || []);
    const failCount = computed(() => results.value.filter((r) => !r.pass).length);
    const passCount = computed(() => results.value.filter((r) => r.pass).length);
    const pct = computed(() => {
      const max = job.value?.config?.maxPages || 100;
      return Math.min(100, Math.round(((job.value?.crawledPages || 0) / max) * 100));
    });

    const meters = computed(() => {
      const all = results.value;
      const rows = [
        { id: "all", label: "Overall", category: null },
        { id: "seo", label: "SEO", category: "SEO" },
        { id: "speed", label: "Speed", category: "speed" },
        { id: "security", label: "Security", category: "security" }
      ];
      return rows.map((row) => {
        const items = row.category
          ? all.filter((r) => String(r.category).toLowerCase() === row.category.toLowerCase())
          : all;
        const value = categoryScore(all, row.category);
        const failed = items.filter((r) => !r.pass).length;
        return {
          ...row,
          value,
          color: scoreColor(value),
          detail: items.length ? `${failed} issue${failed === 1 ? "" : "s"} / ${items.length} checks` : "Waiting for results"
        };
      });
    });

    function apply(next) {
      job.value = { ...job.value, ...next };
      saveJob(job.value);
    }

    onMounted(async () => {
      if (!job.value?.id) return;
      try {
        apply(await fetchCrawl(job.value.id));
      } catch {
        log.value.push("Could not load crawl");
      }
      es = openEvents(job.value.id, (ev) => {
        if (ev.type === "page") {
          log.value.push(`${ev.status || ""} ${ev.url}`);
          apply({ crawledPages: ev.crawledPages, crawledUrls: ev.crawledUrls, status: "running" });
        } else if (ev.type === "log") {
          log.value.push(ev.message);
        } else if (ev.type === "done") {
          apply(ev.job);
          log.value.push("Crawl complete");
          es?.close();
        } else if (ev.type === "error") {
          log.value.push(ev.message);
        }
      });
    });

    onUnmounted(() => es?.close());
    return { job, log, failCount, passCount, pct, meters };
  }
};
</script>
