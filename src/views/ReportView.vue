<template>
  <section>
    <h1>Report</h1>
    <p class="lede" v-if="job">Detailed failing URLs for {{ selected?.name || "all checks" }}</p>
    <p class="lede" v-else>No report yet. Start a crawl from Config.</p>

    <div class="card" v-if="job">
      <div class="field">
        <label>Check</label>
        <select v-model="checkId">
          <option value="">All failing checks</option>
          <option v-for="item in job.results" :key="item.id" :value="item.id">
            {{ item.pass ? "✓" : "✗" }} {{ item.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="card" v-for="item in visible" :key="item.id">
      <h2>
        {{ item.name }}
        <span class="pill" :class="item.priority">{{ item.priority }}</span>
        <span class="pill" :class="item.pass ? 'pass' : 'fail'">{{ item.pass ? "Pass" : "Fail" }}</span>
      </h2>
      <p class="muted">{{ item.category }} / {{ item.subcategory }}</p>
      <table v-if="item.rows?.length">
        <thead>
          <tr>
            <th>URL</th>
            <th v-for="h in item.headings" :key="h">{{ h }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in item.rows" :key="i">
            <td class="url"><a :href="row.url" target="_blank" rel="noopener">{{ row.url }}</a></td>
            <td v-for="(cell, j) in row.cells" :key="j">{{ cell }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="muted">No failing URLs.</p>
    </div>
  </section>
</template>

<script>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { fetchCrawl, loadJob, saveJob } from "../api.js";

export default {
  name: "ReportView",
  setup() {
    const route = useRoute();
    const job = ref(loadJob());
    const checkId = ref(route.query.check || "");

    onMounted(async () => {
      const id = route.params.reportId || job.value?.id;
      if (!id) return;
      try {
        const latest = await fetchCrawl(id);
        job.value = latest;
        saveJob(latest);
      } catch {
        /* keep session copy */
      }
      if (route.query.check) checkId.value = String(route.query.check);
    });

    watch(() => route.query.check, (v) => {
      if (v) checkId.value = String(v);
    });

    const selected = computed(() => (job.value?.results || []).find((r) => r.id === checkId.value));
    const visible = computed(() => {
      const results = job.value?.results || [];
      if (checkId.value) return results.filter((r) => r.id === checkId.value);
      return results.filter((r) => !r.pass);
    });

    return { job, checkId, selected, visible };
  }
};
</script>

<style scoped>
select {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 8px 10px;
  font: inherit;
}
</style>
