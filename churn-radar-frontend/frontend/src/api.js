import { API_BASE_URL, PREDICT_PATH, REQUEST_TIMEOUT_MS } from "./config.js";

export class ApiError extends Error {
  /** @param {"network"|"timeout"|"http"|"invalid"} kind */
  constructor(kind, message, status) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

function parsePrediction(data) {
  const p = data?.churn_probability;
  if (typeof p !== "number" || !Number.isFinite(p) || p < 0 || p > 1 || typeof data?.result !== "string") {
    throw new ApiError("invalid", "The server replied, but not in the expected format.");
  }
  return {
    probability: p/100,
    result: data.result,
    prediction: data.prediction,
    threshold: typeof data.threshold === "number" ? data.threshold : null,
    modelsUsed: typeof data.models_used === "number" ? data.models_used : null,
  };
}

/**
 * POST the validated payload to Flask and return the real response, normalised.
 * No scoring happens here — we only transport and shape the backend's answer.
 */
export async function predictChurn(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const url = `${API_BASE_URL}${PREDICT_PATH}`;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new ApiError("timeout", "The prediction service took too long to respond.");
    }
    throw new ApiError("network", "Could not reach the prediction service.");
  } finally {
    clearTimeout(timer);
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    /* non-JSON body */
  }

  if (!response.ok) {
    const detail = body?.error || body?.message;
    throw new ApiError(
      "http",
      detail ? String(detail) : `The server returned an error (${response.status}).`,
      response.status,
    );
  }
  return parsePrediction(body);
}
