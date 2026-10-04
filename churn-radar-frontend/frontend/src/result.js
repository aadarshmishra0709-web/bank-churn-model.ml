import { API_BASE_URL, BORDERLINE_MARGIN_PTS } from "./config.js";

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const pct = (p, digits = 1) => `${(p * 100).toFixed(digits)}%`;
const trim = (n) => String(Number(n.toFixed(1)));

/* ───────────── gauge ───────────── */

const CX = 120, CY = 120, R = 92;
const ARC = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

function polar(t, radius) {
  const a = Math.PI * (1 - t);
  return { x: CX + radius * Math.cos(a), y: CY - radius * Math.sin(a) };
}

/**
 * @param {{probability:number|null, threshold:number|null, tone:"idle"|"safe"|"risk"}} o
 * Arcs use pathLength=100 so dash maths maps straight to percentages.
 */
function gaugeSvg({ probability, threshold, tone }) {
  let zones = `<path d="${ARC}" class="g-track" pathLength="100"/>`;
  let marker = "";

  if (threshold !== null) {
    const t = threshold * 100;
    zones = `
      <path d="${ARC}" class="g-zone g-zone--safe" pathLength="100" stroke-dasharray="${t} 100"/>
      <path d="${ARC}" class="g-zone g-zone--risk" pathLength="100" stroke-dasharray="0 ${t} ${100 - t} 100"/>`;
    const a = polar(threshold, R - 17), b = polar(threshold, R + 15), l = polar(threshold, R + 26);
    const anchor = threshold < 0.46 ? "end" : threshold > 0.54 ? "start" : "middle";
    marker = `
      <line class="g-tick" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>
      <text class="g-tick-label" x="${l.x}" y="${l.y}" text-anchor="${anchor}">Cutoff ${trim(threshold * 100)}%</text>`;
  }

  const progress = probability === null ? "" :
    `<path d="${ARC}" class="g-progress g-progress--${tone}" pathLength="100"
       stroke-dasharray="100 100" stroke-dashoffset="100" data-target="${100 - probability * 100}"/>`;

  return `
    <svg class="gauge-svg" viewBox="-20 0 280 150" role="img" aria-label="Churn probability gauge">
      ${zones}${progress}${marker}
      <text class="g-end" x="${CX - R}" y="140" text-anchor="middle">0%</text>
      <text class="g-end" x="${CX + R}" y="140" text-anchor="middle">100%</text>
    </svg>`;
}

/* ───────────── copy ───────────── */

function interpret({ result, probability, threshold }) {
  const isChurn = result.trim().toLowerCase() === "churn";
  if (threshold === null) {
    return isChurn
      ? { headline: "Likely to leave", body: "The ensemble flags this customer as a churn risk." }
      : { headline: "Likely to stay", body: "The ensemble does not flag this customer as a churn risk." };
  }
  const gap = Math.abs(probability - threshold) * 100;
  const gapText = `${trim(gap)} percentage points`;
  const close = gap <= BORDERLINE_MARGIN_PTS;

  if (isChurn) {
    return {
      headline: "Likely to leave",
      body: close
        ? `Only ${gapText} above the ${trim(threshold * 100)}% cutoff — a borderline flag. A light-touch check-in is worth considering.`
        : `${gapText} above the ${trim(threshold * 100)}% cutoff. This customer is a good candidate for a retention conversation.`,
    };
  }
  return {
    headline: "Likely to stay",
    body: close
      ? `${gapText} below the ${trim(threshold * 100)}% cutoff — close to the line, so keep an eye on engagement.`
      : `${gapText} below the ${trim(threshold * 100)}% cutoff. No retention action is indicated.`,
  };
}

const ERROR_COPY = {
  network: {
    title: "Can't reach the prediction service",
    body: () => `Check that the Flask server is running at ${API_BASE_URL} and that CORS allows this page.`,
  },
  timeout: {
    title: "The request timed out",
    body: () => "The server didn't answer in time. Check that it's running, then try again.",
  },
  http: {
    title: "The server couldn't score this customer",
    body: (e) => e.message,
  },
  invalid: {
    title: "Unexpected response",
    body: (e) => e.message,
  },
};

/* ───────────── panel controller ───────────── */

export function createResultPanel(root) {
  const body = root.querySelector("[data-result-body]");
  let counterFrame = 0;

  function paint(html, state) {
    cancelAnimationFrame(counterFrame);
    root.dataset.state = state;
    root.classList.remove("is-stale");
    root.setAttribute("aria-busy", String(state === "loading"));
    body.innerHTML = html;
  }

  function idle() {
    paint(`
      <div class="gauge">
        ${gaugeSvg({ probability: null, threshold: null, tone: "idle" })}
        <div class="readout"><span class="readout-value">–</span></div>
      </div>
      <h2 class="verdict-title">No prediction yet</h2>
      <p class="explain">Fill in the eleven details and run the prediction. The probability, verdict and decision cutoff all come from your Flask model.</p>`, "idle");
  }

  function loading() {
    paint(`
      <div class="gauge">
        ${gaugeSvg({ probability: null, threshold: null, tone: "idle" })}
        <div class="readout"><span class="readout-value readout-value--wait">···</span></div>
      </div>
      <h2 class="verdict-title">Scoring customer</h2>
      <p class="explain">Waiting for the ensemble to respond.</p>`, "loading");
  }

  function error(err, onRetry) {
    const copy = ERROR_COPY[err.kind] ?? ERROR_COPY.network;
    paint(`
      <div class="error-card">
        <h2 class="verdict-title">${esc(copy.title)}</h2>
        <p class="explain">${esc(copy.body(err))}</p>
        <button type="button" class="btn btn--light" data-retry>Try again</button>
      </div>`, "error");
    body.querySelector("[data-retry]").addEventListener("click", onRetry);
    body.querySelector("[data-retry]").focus({ preventScroll: true });
  }

  function success(data, payload, onReset) {
    const tone = data.result.trim().toLowerCase() === "churn" ? "risk" : "safe";
    const { headline, body: explanation } = interpret(data);
    const gap = data.threshold === null ? null : (data.probability - data.threshold) * 100;
    const sign = gap === null ? "" : gap >= 0 ? "+" : "−";

    paint(`
      <div class="gauge">
        ${gaugeSvg({ probability: data.probability, threshold: data.threshold, tone })}
        <div class="readout">
          <span class="readout-value" data-counter>0.0%</span>
          <span class="readout-label">churn probability</span>
        </div>
      </div>
      <div class="verdict verdict--${tone}">
        <span class="verdict-badge">${esc(data.result)}</span>
        <h2 class="verdict-title">${headline}</h2>
      </div>
      <p class="explain">${esc(explanation)}</p>
      <dl class="facts">
        ${gap === null ? "" : `<div><dt>Distance from cutoff</dt><dd>${sign}${trim(Math.abs(gap))} pts</dd></div>`}
        ${data.threshold === null ? "" : `<div><dt>Decision cutoff</dt><dd>${trim(data.threshold * 100)}%</dd></div>`}
        ${data.modelsUsed === null ? "" : `<div><dt>Models averaged</dt><dd>${data.modelsUsed}</dd></div>`}
      </dl>
      <details class="sent">
        <summary>Request sent to /predict</summary>
        <pre>${esc(JSON.stringify(payload, null, 2))}</pre>
      </details>
      <button type="button" class="btn btn--light" data-reset>Score another customer</button>`, "result");

    body.querySelector("[data-reset]").addEventListener("click", onReset);
    animateGauge(data.probability);
  }

  function animateGauge(probability) {
    const arc = body.querySelector(".g-progress");
    const counter = body.querySelector("[data-counter]");
    const final = pct(probability);

    if (reduceMotion()) {
      arc.style.strokeDashoffset = arc.dataset.target;
      counter.textContent = final;
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      arc.style.strokeDashoffset = arc.dataset.target;
    }));
    const start = performance.now(), duration = 1000;
    const tick = (now) => {
      const k = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - k, 3);
      counter.textContent = pct(probability * eased);
      if (k < 1) counterFrame = requestAnimationFrame(tick);
      else counter.textContent = final;
    };
    counterFrame = requestAnimationFrame(tick);
  }

  function markStale() {
    if (root.dataset.state === "result") root.classList.add("is-stale");
  }

  return { idle, loading, error, success, markStale, element: root };
}
