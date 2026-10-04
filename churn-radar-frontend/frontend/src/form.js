import { FIELDS, GROUPS } from "./schema.js";
import { validateField } from "./validation.js";

const byName = (name) => FIELDS.find((f) => f.name === name);

/* ───────────── rendering ───────────── */

function errorAndHint(f) {
  return `
    ${f.hint ? `<p class="hint" id="h-${f.name}">${f.hint}</p>` : ""}
    <p class="error" id="e-${f.name}" role="alert"></p>`;
}

function describedBy(f) {
  return `${f.hint ? `h-${f.name} ` : ""}e-${f.name}`;
}

function numberField(f) {
  return `
    <div class="field" data-name="${f.name}">
      <label class="label" for="f-${f.name}">${f.label}</label>
      <div class="input-wrap">
        <input class="input" id="f-${f.name}" name="${f.name}" type="number"
          inputmode="${f.integer ? "numeric" : "decimal"}" min="${f.min}" max="${f.max}" step="${f.step}"
          placeholder="${f.placeholder ?? ""}" aria-describedby="${describedBy(f)}" autocomplete="off">
        ${f.unit ? `<span class="suffix">${f.unit}</span>` : ""}
      </div>
      ${errorAndHint(f)}
    </div>`;
}

function sliderField(f) {
  const mid = Math.round((f.min + f.max) / 2);
  return `
    <div class="field" data-name="${f.name}">
      <label class="label" for="f-${f.name}">${f.label}</label>
      <div class="slider-row">
        <input class="slider is-untouched" type="range" id="s-${f.name}" min="${f.min}" max="${f.max}"
          step="${f.step}" value="${mid}" aria-label="${f.label} slider" tabindex="-1">
        <div class="input-wrap input-wrap--compact">
          <input class="input" id="f-${f.name}" name="${f.name}" type="number" inputmode="numeric"
            min="${f.min}" max="${f.max}" step="${f.step}" placeholder="${f.placeholder ?? ""}"
            aria-describedby="${describedBy(f)}" autocomplete="off">
          ${f.unit ? `<span class="suffix">${f.unit}</span>` : ""}
        </div>
      </div>
      <div class="slider-scale" aria-hidden="true"><span>${f.min}</span><span>${f.max}</span></div>
      ${errorAndHint(f)}
    </div>`;
}

function segmentedField(f) {
  const options = f.options.map((o) => `
    <label class="seg">
      <input type="radio" name="${f.name}" value="${o.value}">
      <span>${o.label}</span>
    </label>`).join("");
  return `
    <fieldset class="field" data-name="${f.name}" aria-describedby="e-${f.name}">
      <legend class="label">${f.label}</legend>
      <div class="segmented">${options}</div>
      <p class="error" id="e-${f.name}" role="alert"></p>
    </fieldset>`;
}

function selectField(f) {
  const options = f.options.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");
  return `
    <div class="field" data-name="${f.name}">
      <label class="label" for="f-${f.name}">${f.label}</label>
      <select class="input select" id="f-${f.name}" name="${f.name}" aria-describedby="e-${f.name}">
        <option value="">${f.placeholder}</option>${options}
      </select>
      <p class="error" id="e-${f.name}" role="alert"></p>
    </div>`;
}

const RENDERERS = { number: numberField, slider: sliderField, segmented: segmentedField, select: selectField };

export function renderFields(container) {
  container.innerHTML = GROUPS.map((g) => `
    <section class="group" aria-labelledby="g-${g.id}">
      <header class="group-head">
        <h2 id="g-${g.id}">${g.title}</h2>
        <p>${g.note}</p>
      </header>
      <div class="group-fields group-fields--${g.id}">
        ${FIELDS.filter((f) => f.group === g.id).map((f) => RENDERERS[f.control](f)).join("")}
      </div>
    </section>`).join("");
}

/* ───────────── values ───────────── */

export function readValues(form) {
  const raw = {};
  for (const f of FIELDS) {
    if (f.control === "segmented") {
      raw[f.name] = form.querySelector(`input[name="${f.name}"]:checked`)?.value ?? "";
    } else {
      raw[f.name] = form.elements[f.name].value;
    }
  }
  return raw;
}

function syncSlider(name) {
  const slider = document.getElementById(`s-${name}`);
  if (!slider) return;
  const input = document.getElementById(`f-${name}`);
  const f = byName(name);
  const n = Number(input.value);
  const valid = input.value.trim() !== "" && Number.isFinite(n) && n >= f.min && n <= f.max;
  slider.classList.toggle("is-untouched", !valid);
  if (valid) slider.value = n;
  const pct = ((Number(slider.value) - f.min) / (f.max - f.min)) * 100;
  slider.style.setProperty("--fill", `${pct}%`);
}

export function writeValues(form, values) {
  for (const f of FIELDS) {
    const v = String(values[f.name] ?? "");
    if (f.control === "segmented") {
      const radio = form.querySelector(`input[name="${f.name}"][value="${v}"]`);
      if (radio) radio.checked = true;
    } else {
      form.elements[f.name].value = v;
      syncSlider(f.name);
    }
  }
}

export function clearForm(form) {
  form.reset();
  for (const f of FIELDS) if (f.control === "slider") syncSlider(f.name);
  clearErrors(form);
}

/* ───────────── errors ───────────── */

export function setError(form, name, message) {
  const field = form.querySelector(`[data-name="${name}"]`);
  field.classList.toggle("is-invalid", Boolean(message));
  field.querySelector(".error").textContent = message;
  field.querySelectorAll("input:not([type=range]), select").forEach((el) => {
    if (message) el.setAttribute("aria-invalid", "true");
    else el.removeAttribute("aria-invalid");
  });
}

export function showErrors(form, errors) {
  for (const f of FIELDS) setError(form, f.name, errors[f.name] ?? "");
  const first = FIELDS.find((f) => errors[f.name]);
  if (first) form.querySelector(`[data-name="${first.name}"] input:not([type=range]), [data-name="${first.name}"] select`)?.focus();
}

export function clearErrors(form) {
  for (const f of FIELDS) setError(form, f.name, "");
}

/* ───────────── behaviour ───────────── */

/** Wires slider sync and friendly, non-noisy live validation. */
export function bindFormBehaviour(form, onChange) {
  for (const f of FIELDS.filter((x) => x.control === "slider")) {
    const slider = document.getElementById(`s-${f.name}`);
    const input = document.getElementById(`f-${f.name}`);
    syncSlider(f.name);

    slider.addEventListener("input", () => {
      input.value = slider.value;
      syncSlider(f.name);
      setError(form, f.name, "");
      onChange();
    });
  }

  form.addEventListener("input", (e) => {
    const name = e.target.name;
    if (!name) return;
    if (byName(name)?.control === "slider") syncSlider(name);
    // Only re-check a field once it has already shown an error.
    const field = form.querySelector(`[data-name="${name}"]`);
    if (field?.classList.contains("is-invalid")) {
      setError(form, name, validateField(name, readValues(form)[name]));
    }
    onChange();
  });

  form.addEventListener("focusout", (e) => {
    const name = e.target.name;
    const f = name && byName(name);
    if (!f || f.control === "segmented") return;
    const value = e.target.value;
    if (String(value).trim() !== "") setError(form, name, validateField(name, value));
  });
}
