import { predictChurn, ApiError } from "./api.js";
import { SAMPLE_PROFILE } from "./schema.js";
import { validate } from "./validation.js";
import {
  renderFields, readValues, writeValues, clearForm, showErrors, bindFormBehaviour,
} from "./form.js";
import { createResultPanel } from "./result.js";
import { renderInsights } from "./insights.js";

const form = document.getElementById("churn-form");
const submitBtn = document.getElementById("submit-btn");
const resetBtn = document.getElementById("reset-btn");
const sampleBtn = document.getElementById("sample-btn");
const panel = createResultPanel(document.getElementById("result-panel"));

let busy = false;
let lastPayload = null;

renderFields(document.getElementById("fields"));
bindFormBehaviour(form, () => panel.markStale());
renderInsights({
  modelsEl: document.getElementById("model-list"),
  metricsEl: document.getElementById("metric-list"),
});
panel.idle();

function revealPanelOnSmallScreens() {
  if (!window.matchMedia("(max-width: 959px)").matches) return;
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  panel.element.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
}

function setBusy(value) {
  busy = value;
  submitBtn.disabled = value;
  submitBtn.classList.toggle("is-loading", value);
  submitBtn.querySelector(".btn-text").textContent = value ? "Scoring…" : "Predict churn";
}

async function run(payload) {
  if (busy) return;
  lastPayload = payload;
  setBusy(true);
  panel.loading();
  revealPanelOnSmallScreens();

  try {
    const data = await predictChurn(payload);
    panel.success(data, payload, resetAll);
  } catch (err) {
    const apiErr = err instanceof ApiError ? err : new ApiError("network", "Something went wrong.");
    panel.error(apiErr, () => run(lastPayload));
  } finally {
    setBusy(false);
  }
}

function resetAll() {
  clearForm(form);
  panel.idle();
  lastPayload = null;
  form.querySelector("input:not([type=range]), select")?.focus();
  window.scrollTo({ top: 0, behavior: "auto" });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const { ok, errors, payload } = validate(readValues(form));
  showErrors(form, errors);
  if (ok) run(payload);
});

resetBtn.addEventListener("click", resetAll);

sampleBtn.addEventListener("click", () => {
  writeValues(form, SAMPLE_PROFILE);
  showErrors(form, {});
  panel.markStale();
});
