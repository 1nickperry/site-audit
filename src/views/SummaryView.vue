<template>
  <section>
    <h1>Summary</h1>
    <p class="lede" v-if="job">{{ job.config?.url }} — {{ grouped.overall }}% passed ({{ grouped.totalFail }} of {{ grouped.total }} checks have issues)</p>
    <p class="lede" v-else>No crawl loaded. Run one from Config.</p>

    <div v-for="cat in grouped.categories" :key="cat.id" class="card">
      <h2>
        <img :src="cat.icon" alt="" />
        {{ cat.label }}
        <span class="muted">{{ cat.percent }}% passed · {{ cat.failed }} / {{ cat.items.length }} failing</span>
      </h2>
      <table>
        <thead><tr><th>Check</th><th>Priority</th><th>Result</th><th>URLs</th></tr></thead>
        <tbody>
          <tr v-for="item in cat.items" :key="item.id">
            <td>
              <router-link :to="`/report/${job.id}?check=${item.id}`">{{ item.name }}</router-link>
              <div class="muted">{{ item.subcategory }}</div>
            </td>
            <td><span class="pill" :class="item.priority">{{ item.priority }}</span></td>
            <td><span class="pill" :class="item.pass ? 'pass' : 'fail'">{{ item.pass ? "Pass" : "Fail" }}</span></td>
            <td>{{ item.rows?.length || 0 }}</td>
          </tr>
        </tbody>
      </table>
    </div>
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
