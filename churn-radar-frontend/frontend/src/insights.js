import { ENSEMBLE_MODELS, TEST_METRICS } from "./config.js";

/** Static "how it works" content: model list and held-out test-set metrics. */
export function renderInsights({ modelsEl, metricsEl }) {
  modelsEl.innerHTML = ENSEMBLE_MODELS
    .map((m) => `<li>${m}</li>`).join("");

  metricsEl.innerHTML = TEST_METRICS.map((m) => `
    <li>
      <div class="metric-top"><span>${m.label}</span><strong>${m.value.toFixed(2)}%</strong></div>
      <div class="metric-bar" role="presentation"><span style="width:${m.value}%"></span></div>
    </li>`).join("");
}
