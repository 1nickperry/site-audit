<template>
  <section>
    <h1>Summary</h1>
    <p class="lede" v-if="job">
      <a v-if="job.config?.url" :href="job.config.url" target="_blank" rel="noopener">{{ job.config.url }}</a>
      — {{ grouped.overall }}% passed ({{ grouped.totalFail }} of {{ grouped.total }} checks have issues)
    </p>
    <p class="lede" v-else>No crawl loaded. Run one from Config.</p>

    <details
      v-for="cat in grouped.categories"
      :key="cat.id"
      class="card accordion"
      :open="cat.failed > 0"
    >
      <summary>
        <img :src="cat.icon" alt="" />
        <span class="acc-title">{{ cat.label }}</span>
        <span class="muted">{{ cat.percent }}% passed · {{ cat.failed }} / {{ cat.items.length }} failing</span>
      </summary>

      <details
        v-for="item in cat.items"
        :key="item.id"
        class="check-acc"
        :open="!item.pass && item.rows?.length"
      >
        <summary>
          <span class="check-name">{{ item.name }}</span>
          <span class="pill" :class="item.priority">{{ item.priority }}</span>
          <span class="pill" :class="item.pass ? 'pass' : 'fail'">{{ item.pass ? "Pass" : "Fail" }}</span>
          <span class="muted">{{ item.rows?.length || 0 }} URLs</span>
        </summary>
        <p class="muted check-meta">{{ item.subcategory }}</p>
        <ul v-if="item.rows?.length" class="url-list">
          <li v-for="(row, i) in item.rows" :key="i">
            <a :href="row.url" target="_blank" rel="noopener" class="url">{{ row.url }}</a>
            <span v-if="row.cells?.length" class="muted"> — {{ row.cells.join(" · ") }}</span>
          </li>
        </ul>
        <p v-else class="muted">No issue URLs for this check.</p>
        <router-link class="report-link" :to="`/report/${job.id}?check=${item.id}`">Open report for this check</router-link>
      </details>
    </details>
  </section>
</template>

<script>
import { computed, onMounted, ref } from "vue";
import { fetchCrawl, loadJob, saveJob } from "../api.js";

const CATS = [
  { id: "SEO", label: "SEO", icon: "/assets/svg/seo.svg" },
  { id: "speed", label: "Speed", icon: "/assets/svg/speed.svg" },
  { id: "security", label: "Security", icon: "/assets/svg/security.svg" }
];

export default {
  name: "SummaryView",
  setup() {
    const job = ref(loadJob());

    onMounted(async () => {
      if (!job.value?.id) return;
      try {
        const latest = await fetchCrawl(job.value.id);
        job.value = latest;
        saveJob(latest);
      } catch {
        /* keep session copy */
      }
    });

    const grouped = computed(() => {
      const results = job.value?.results || [];
      const categories = CATS.map((cat) => {
        const items = results.filter((r) => r.category === cat.id);
        const failed = items.filter((i) => !i.pass).length;
        const percent = items.length ? Math.round((100 * (items.length - failed)) / items.length) : 0;
        return { ...cat, items, failed, percent };
      }).filter((c) => c.items.length);
      const total = results.length;
      const totalFail = results.filter((r) => !r.pass).length;
      return {
        categories,
        total,
        totalFail,
        overall: total ? Math.round((100 * (total - totalFail)) / total) : 0
      };
    });

    return { job, grouped };
  }
};
</script>
