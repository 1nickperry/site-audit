<template>
  <section>
    <h1>New crawl</h1>
    <p class="lede">Test SEO, speed, and security of pages on a site. Start with the local fixture at /fixture</p>

    <form class="card" @submit.prevent="run">
      <h2><img src="/assets/svg/explore.svg" alt="" />Start URL</h2>
      <div class="field">
        <label>Website URL</label>
        <input v-model="form.url" type="url" required placeholder="https://unrestrainedcommerce.com/" />
      </div>
      <div class="row">
        <div class="field">
          <label>Max pages</label>
          <input v-model.number="form.maxPages" type="number" min="1" max="10000" />
        </div>
        <div class="field">
          <label>Depth limit (0 = unlimited)</label>
          <input v-model.number="form.depthLimit" type="number" min="0" max="50" />
        </div>
        <div class="field">
          <label>Timeout (ms)</label>
          <input v-model.number="form.responseTimeout" type="number" min="1000" />
        </div>
        <div class="field">
          <label>URLs / second</label>
          <input v-model.number="form.maxUrlsToCrawlPerSecond" type="number" min="1" max="30" />
        </div>
      </div>
      <div class="field">
        <label>User agent</label>
        <input v-model="form.userAgent" type="text" />
      </div>
    </form>

    <div class="card">
      <h2><img src="/assets/svg/types-to-check.svg" alt="" />Types to check</h2>
      <div class="checks">
        <label><input v-model="form.categories" type="checkbox" value="SEO" /><img src="/assets/svg/seo.svg" width="16" alt="" /> SEO</label>
        <label><input v-model="form.categories" type="checkbox" value="speed" /><img src="/assets/svg/speed.svg" width="16" alt="" /> Speed</label>
        <label><input v-model="form.categories" type="checkbox" value="security" /><img src="/assets/svg/security.svg" width="16" alt="" /> Security</label>
      </div>
    </div>

    <div class="card">
      <h2><img src="/assets/svg/crawl-restrictions.svg" alt="" />Crawl restrictions</h2>
      <div class="row">
        <div class="field">
          <label>Inclusion regex</label>
          <input v-model="form.inclusionRegex" type="text" placeholder="optional" />
        </div>
        <div class="field">
          <label>Exclusion regex</label>
          <input v-model="form.exclusionRegex" type="text" placeholder="optional" />
        </div>
      </div>
      <label><input v-model="form.obeyRobots" type="checkbox" /> Obey robots.txt</label>
      <label><input v-model="form.checkExternalLinks" type="checkbox" /> Fetch off-site links (affiliate/social). Off = stay on your domain.</label>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <button class="btn" :disabled="busy" @click="run">{{ busy ? "Starting…" : "Start crawl" }}</button>
  </section>
</template>

<script>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { saveJob, startCrawl } from "../api.js";

export default {
  name: "ConfigView",
  setup() {
    const router = useRouter();
    const busy = ref(false);
    const error = ref("");
    const form = reactive({
      url: "https://unrestrainedcommerce.com/",
      maxPages: 100,
      depthLimit: 0,
      responseTimeout: 10000,
      maxUrlsToCrawlPerSecond: 30,
      userAgent: "SiteAudit/1.0",
      categories: ["SEO", "speed", "security"],
      inclusionRegex: "",
      exclusionRegex: "",
      obeyRobots: false,
      checkExternalLinks: false
    });

    async function run() {
      error.value = "";
      busy.value = true;
      try {
        const job = await startCrawl({ ...form });
        saveJob(job);
        await router.push("/dashboard");
      } catch (err) {
        error.value = err.message;
      } finally {
        busy.value = false;
      }
    }

    return { form, busy, error, run };
  }
};
</script>
