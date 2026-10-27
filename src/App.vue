<template>
  <div class="app-shell">
    <header class="app-header">
      <router-link to="/" class="brand">Site Audit</router-link>
      <nav class="nav">
        <router-link to="/config"><img src="/assets/svg/options.svg" alt="" />Config</router-link>
        <router-link to="/dashboard"><img src="/assets/svg/dashboard.svg" alt="" />Dashboard</router-link>
        <router-link to="/summary"><img src="/assets/svg/explore.svg" alt="" />Summary</router-link>
        <router-link :to="reportTo"><img src="/assets/svg/seo.svg" alt="" />Report</router-link>
      </nav>
    </header>
    <main class="page">
      <router-view />
    </main>
  </div>
</template>

<script>
import { computed } from "vue";
import { loadJob } from "./api.js";

export default {
  name: "App",
  setup() {
    const reportTo = computed(() => {
      const job = loadJob();
      return job?.id ? `/report/${job.id}` : "/report";
    });
    return { reportTo };
  }
};
</script>
