# Churn Radar: frontend

A dependency-free (plain ES modules) UI for the Flask churn-prediction API.
It collects the 11 inputs, validates them, POSTs them to `/predict`, and
displays the backend's real response. It contains **no** prediction logic and
never changes the 0.30 threshold.

## Install

Nothing to install and no build step. You only need Python (already required
for Flask) and a modern browser. Fonts load from Google Fonts and fall back to
system fonts if offline.

## Run

1. Start Flask (from your existing project, unchanged):

       python app.py              # serves http://127.0.0.1:5000

2. Serve this folder (pick one):

       cd frontend
       python -m http.server 5173     # then open http://127.0.0.1:5173
       # or
       python serve.py                # same, plus a /predict proxy (see below)

   Open the page via `http://127.0.0.1:5173` (not `file://`, ES modules need http).

## CORS

The page (port 5173) and the API (port 5000) are different origins, so the
browser blocks the call unless Flask allows it. Choose one:

**A. Enable CORS in Flask (default config)**

    pip install flask-cors

    from flask_cors import CORS
    CORS(app)   # after `app = Flask(__name__)`

If your `app.py` already has CORS enabled, nothing to do. Restrict origins in
production, e.g. `CORS(app, origins=["http://127.0.0.1:5173"])`.

**B. No backend change: use the proxy**

1. In `src/config.js` set `API_BASE_URL = ""`.
2. Run `python serve.py` (optionally `--backend http://127.0.0.1:5000 --port 5173`).

The browser then only talks to `serve.py`, which forwards `POST /predict` to Flask.

## How it connects to `/predict`

`src/api.js` → `predictChurn(payload)` sends `POST {API_BASE_URL}/predict` with
`Content-Type: application/json` and the 11 numeric fields. The response is
checked (probability must be a number in 0–1, `result` must exist) and shown
as-is: probability, `result`, `threshold`, `models_used`. The verdict and the
cutoff marker come from the response, not from the frontend.

Form → API conversions live in `src/schema.js` (single source of truth):
France/Spain/Germany → 0/1/2, Female/Male → 0/1, No/Yes → 0/1,
January–December → 1–12; numbers are sent as numbers.

## Files

    index.html            page shell
    serve.py              optional static server + /predict proxy
    src/config.js         API URL, timeout, model list, test-set metrics
    src/schema.js         the 11 fields, encodings, ranges, sample profile
    src/validation.js     input validation (pure functions)
    src/api.js            fetch wrapper, timeout, error classification
    src/form.js           builds/reads/resets the form, inline errors
    src/result.js         idle / loading / error / result panel + gauge
    src/insights.js       model list and test-set metric bars
    src/main.js           wiring
    styles/*.css          tokens, base, components

## Validation ranges

Defined in `src/schema.js` (typical bank-churn dataset): Age 18–100,
CreditScore 300–850, Tenure 0–10 (whole years), Products 1–4, Balance and
Salary ≥ 0. Adjust them if your training data differs.

## Test it

1. Backend running, frontend open.
2. Click **Predict churn** on the empty form → all 11 fields show errors.
3. Enter Age `17` or CreditScore `900` → range errors.
4. Click **Fill with a sample customer**, then **Predict churn**: button shows
   "Scoring…", then the gauge, probability, verdict, cutoff and "Models averaged"
   appear. Expand "Request sent to /predict" to see the exact JSON.
5. Change a field → the result dims with "Details changed" until you re-run.
6. Try a few profiles; compare with the same JSON sent via curl:

       curl -X POST http://127.0.0.1:5000/predict -H "Content-Type: application/json" \
         -d '{"CreditScore":619,"Age":42,"Tenure":2,"Balance":0,"NumOfProducts":1,"HasCrCard":1,"IsActiveMember":1,"EstimatedSalary":101348.88,"GeographyLocation":0,"GenderCategory":0,"Month":1}'

7. Stop Flask and predict again → "Can't reach the prediction service" with
   a **Try again** button.
8. **Reset** / **Score another customer** clears the form and the result.
