/**
 * Central configuration. Nothing here affects predictions — the Flask
 * backend is the only source of truth for probability, verdict and threshold.
 */

// Where the Flask API lives.
//  - Direct mode (default): needs CORS enabled on Flask (see README).
//  - Proxy mode: run `python serve.py` and set this to "" (same origin, no CORS).
export const API_BASE_URL = "http://127.0.0.1:5000";
export const PREDICT_PATH = "/predict";
export const REQUEST_TIMEOUT_MS = 20000;

// Display-only: how close (in percentage points) to the cutoff counts as "borderline".
// This only changes the wording of the explanation, never the verdict.
export const BORDERLINE_MARGIN_PTS = 5;

// The eight models in the backend ensemble (descriptive, for the "How it works" card).
export const ENSEMBLE_MODELS = [
  "Logistic Regression",
  "SVC",
  "Decision Tree",
  "Random Forest",
  "KNN",
  "Naive Bayes",
  "Gradient Boosting",
  "AdaBoost",
];

// Held-out TEST-SET metrics supplied with the project. Static, display-only,
// and NOT related to the customer currently being scored.
export const TEST_METRICS = [
  { label: "Accuracy", value: 82.85 },
  { label: "Precision", value: 56.64 },
  { label: "Recall", value: 67.08 },
  { label: "F1 score", value: 61.42 },
  { label: "ROC-AUC", value: 86.06 },
];
