<template>
  <span class="tip-wrap">
    <button
      type="button"
      class="tip-btn"
      :aria-label="label || text"
      :aria-describedby="tipId"
    >?</button>
    <span :id="tipId" role="tooltip" class="tip-bubble">{{ text }}</span>
  </span>
</template>

<script>
let n = 0;
export default {
  name: "Tip",
  props: {
    text: { type: String, required: true },
    label: { type: String, default: "" }
  },
  setup() {
    return { tipId: `tip-${++n}` };
  }
};
</script>
