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
          <label>
            Max pages
            <Tip text="Hard cap on HTML pages the crawler fetches. The run stops when this count is reached, even if more same-site links remain." />
          </label>
          <input v-model.number="form.maxPages" type="number" min="1" max="10000" />
        </div>
        <div class="field">
          <label>
            Depth limit (0 = unlimited)
            <Tip text="How many clicks away from the start URL to follow. 0 means no depth cap. 1 is only the start page plus its direct links." />
          </label>
          <input v-model.number="form.depthLimit" type="number" min="0" max="50" />
        </div>
        <div class="field">
          <label>
            Timeout (ms)
            <Tip text="How long to wait for each HTTP response before treating the URL as a timeout and moving on." />
          </label>
          <input v-model.number="form.responseTimeout" type="number" min="1000" />
        </div>
        <div class="field">
          <label>
            URLs / second
            <Tip text="Request rate limiter. Lower this if the site rate-limits or if you want a gentler crawl. Max is 30." />
          </label>
          <input v-model.number="form.maxUrlsToCrawlPerSecond" type="number" min="1" max="30" />
        </div>
      </div>
      <div class="field">
        <label>
          User agent
          <Tip text="The User-Agent header sent with each request. Some servers treat unknown bots differently. Keep it identifiable, for example SiteAudit/1.0." />
        </label>
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
      <h2>
        <img src="/assets/svg/crawl-restrictions.svg" alt="" />Crawl restrictions
        <Tip text="These rules further limit which URLs are fetched. The crawler already stays on the start site (www and the apex host count as the same site) unless you turn on off-site fetches." />
      </h2>
      <div class="row">
        <div class="field">
          <label>
            Inclusion regex
            <Tip text="Only enqueue URLs whose full address matches this regular expression. Leave blank to include every same-site page. Example: /products/ matches product URLs only." />
          </label>
          <input v-model="form.inclusionRegex" type="text" placeholder="optional" />
        </div>
        <div class="field">
          <label>
            Exclusion regex
            <Tip text="Skip URLs that match this regular expression even when they are on your site. Example: /tag/ or \\.(pdf|zip)$ to ignore tag pages or file downloads." />
          </label>
          <input v-model="form.exclusionRegex" type="text" placeholder="optional" />
        </div>
      </div>
      <label class="check-line">
        <input v-model="form.obeyRobots" type="checkbox" />
        Obey robots.txt
        <Tip text="When on, paths listed as Disallow in the site's robots.txt are not crawled. When off, the crawler still stays on your domain but ignores robots rules. Sitemap hints are not used either way." />
      </label>
      <label class="check-line">
        <input v-model="form.checkExternalLinks" type="checkbox" />
        Fetch off-site links (affiliate/social). Off = stay on your domain.
        <Tip text="Leave this off to crawl only the start site. www and the apex host count as the same site. Turn it on only if you want the crawler to request outbound affiliate, social, or partner URLs." />
      </label>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <button class="btn" :disabled="busy" @click="run">{{ busy ? "Starting…" : "Start crawl" }}</button>
  </section>
</template>

<script>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { saveJob, startCrawl } from "../api.js";
import Tip from "../components/Tip.vue";

export default {
  name: "ConfigView",
  components: { Tip },
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
