<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal card" role="dialog" aria-labelledby="fix-report-title">
      <h2 id="fix-report-title">Create detailed .md report for fix</h2>
      <p class="muted">Pick the platform, enter an email, then download a markdown brief. Drop that file into Cursor or another AI. If Shopify, Webflow, or WordPress MCP is connected, the AI can apply the fixes; otherwise it should give a step-by-step plan.</p>

      <form v-if="!done" @submit.prevent="submit">
        <div class="field">
          <label>Platform</label>
          <div class="platform-dd" :class="{ open: menuOpen }">
            <button
              class="platform-dd-btn"
              type="button"
              :aria-expanded="menuOpen"
              aria-haspopup="listbox"
              @click="menuOpen = !menuOpen"
            >
              <img :src="selected.icon" alt="" width="20" height="20" />
              <span>{{ selected.label }}</span>
              <img class="chevron" src="/assets/svg/chevron-down.svg" alt="" width="12" height="12" />
            </button>
            <ul v-show="menuOpen" class="platform-dd-list" role="listbox">
              <li
                v-for="p in platforms"
                :key="p.id"
                role="option"
                :aria-label="p.label"
                :aria-selected="p.id === platform"
                @click="choose(p.id)"
              >
                <img :src="p.icon" alt="" width="20" height="20" />
                <span>{{ p.label }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="field">
          <label>Email for the report</label>
          <input
            v-model.trim="email"
            type="email"
            required
            autocomplete="email"
            placeholder="you@company.com"
          />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <div class="modal-actions">
          <button class="btn secondary" type="button" @click="close">Cancel</button>
          <button class="btn" type="submit" :disabled="busy">
            {{ busy ? "Preparing…" : "Download .md brief" }}
          </button>
        </div>
      </form>

      <div v-else>
        <p>Saved for <strong>{{ email }}</strong> on <strong>{{ selected.label }}</strong>.</p>
        <p class="muted">File: {{ filename }}</p>
        <p>Give that markdown to your AI with a prompt like:</p>
        <pre class="prompt-box">{{ prompt }}</pre>
        <div class="modal-actions">
          <button class="btn secondary" type="button" @click="copyPrompt">{{ copied ? "Copied" : "Copy prompt" }}</button>
          <button class="btn" type="button" @click="close">Done</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref } from "vue";
import { registerFixReport } from "../api.js";
import { PLATFORMS, platformMeta } from "../fixPlaybook.js";
import { buildFixMarkdown, downloadMarkdown, fixReportFilename } from "../fixReport.js";

export default {
  name: "FixReportDialog",
  props: {
    job: { type: Object, required: true }
  },
  emits: ["close"],
  setup(props, { emit }) {
    const platforms = PLATFORMS;
    const platform = ref("");
    const email = ref("");
    const menuOpen = ref(false);
    const busy = ref(false);
    const error = ref("");
    const done = ref(false);
    const filename = ref("");
    const copied = ref(false);

    const selected = computed(
      () =>
        platformMeta(platform.value) || {
          id: "",
          label: "Select platform",
          icon: "/assets/svg/types-to-check.svg",
          mcp: ""
        }
    );
    const prompt = computed(() => {
      const name = selected.value.label;
      return `Follow ${filename.value || "this Site Audit fix brief"} for my ${name} site. If you have ${name} MCP or admin/API access, apply the fixes (high priority first) and report what changed. If you do not have access, give me a step-by-step plan I can follow in ${name}. Do not invent pages — only the URLs in the brief.`;
    });

    function choose(id) {
      platform.value = id;
      menuOpen.value = false;
    }

    function close() {
      emit("close");
    }

    async function submit() {
      error.value = "";
      if (!props.job?.results?.length) {
        error.value = "Run a crawl before creating a fix report.";
        return;
      }
      if (!platform.value) {
        error.value = "Select WordPress, Shopify, or Webflow.";
        return;
      }
      busy.value = true;
      try {
        await registerFixReport({
          email: email.value,
          platform: platform.value,
          jobId: props.job.id,
          siteUrl: props.job.config?.url,
          failCount: (props.job.results || []).filter((r) => !r.pass).length
        }).catch(() => {});
        const markdown = buildFixMarkdown(props.job, {
          platform: platform.value,
          email: email.value
        });
        filename.value = fixReportFilename(props.job, platform.value);
        downloadMarkdown(markdown, filename.value);
        done.value = true;
      } catch (err) {
        error.value = err.message || "Could not build the report.";
      } finally {
        busy.value = false;
      }
    }

    async function copyPrompt() {
      try {
        await navigator.clipboard.writeText(prompt.value);
        copied.value = true;
      } catch {
        copied.value = false;
      }
    }

    return {
      platforms,
      platform,
      email,
      menuOpen,
      busy,
      error,
      done,
      filename,
      copied,
      selected,
      prompt,
      choose,
      close,
      submit,
      copyPrompt
    };
  }
};
</script>
