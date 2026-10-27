<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal card" role="dialog" aria-labelledby="email-report-title">
      <h2 id="email-report-title">Send these results to my email</h2>
      <p class="muted">Enter your email address to receive a comprehensive PDF report with all audit findings, scores, and actionable fix recommendations.</p>

      <form v-if="!done" @submit.prevent="submit">
        <div class="field">
          <label>Email address</label>
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
            {{ busy ? "Sending..." : "Send PDF report" }}
          </button>
        </div>
      </form>

      <div v-else>
        <p>Report sent to <strong>{{ email }}</strong></p>
        <p class="muted">Check your inbox for the comprehensive PDF report ({{ filename }}). The email includes score summaries and a detailed PDF attachment with all findings and fix instructions.</p>
        <div class="modal-actions">
          <button class="btn" type="button" @click="close">Done</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from "vue";
import { emailJobResults } from "../api.js";

export default {
  name: "EmailReportDialog",
  props: {
    job: { type: Object, required: true }
  },
  emits: ["close"],
  setup(props, { emit }) {
    const email = ref("");
    const busy = ref(false);
    const error = ref("");
    const done = ref(false);
    const filename = ref("");

    function close() {
      emit("close");
    }

    async function submit() {
      error.value = "";
      if (!props.job?.id) {
        error.value = "No job found. Run a crawl first.";
        return;
      }
      if (!props.job.results?.length) {
        error.value = "No results to send. Run a crawl first.";
        return;
      }
      busy.value = true;
      try {
        const result = await emailJobResults(props.job.id, email.value);
        filename.value = result.filename || "report.pdf";
        done.value = true;
      } catch (err) {
        error.value = err.message || "Could not send email. Check server logs for SMTP configuration.";
      } finally {
        busy.value = false;
      }
    }

    return {
      email,
      busy,
      error,
      done,
      filename,
      close,
      submit
    };
  }
};
</script>
