/**
 * Single source of truth for the 11 inputs: labels, UI control type,
 * validation limits and the numeric encoding sent to Flask.
 * Field `name` values match the API keys exactly.
 *
 * Ranges follow the usual bank-churn dataset; adjust here if your data differs.
 */

const YES_NO = [
  { label: "No", value: 0 },
  { label: "Yes", value: 1 },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
].map((label, i) => ({ label, value: i + 1 }));

export const GROUPS = [
  { id: "customer", title: "Customer", note: "Who they are" },
  { id: "finances", title: "Finances", note: "What they hold" },
  { id: "relationship", title: "Banking relationship", note: "How they use the bank" },
];

export const FIELDS = [
  // ── Customer ──────────────────────────────────────────────
  {
    name: "Age", label: "Age", group: "customer", control: "number",
    min: 18, max: 100, step: 1, integer: true, unit: "years", placeholder: "e.g. 42",
  },
  {
    name: "GenderCategory", label: "Gender", group: "customer", control: "segmented",
    options: [{ label: "Female", value: 0 }, { label: "Male", value: 1 }],
  },
  {
    name: "GeographyLocation", label: "Country", group: "customer", control: "segmented",
    options: [
      { label: "France", value: 0 },
      { label: "Spain", value: 1 },
      { label: "Germany", value: 2 },
    ],
  },

  // ── Finances ──────────────────────────────────────────────
  {
    name: "CreditScore", label: "Credit score", group: "finances", control: "slider",
    min: 300, max: 850, step: 1, integer: true, placeholder: "300–850",
  },
  {
    name: "Balance", label: "Account balance", group: "finances", control: "number",
    min: 0, max: 1e9, step: "any", integer: false, placeholder: "e.g. 76,500",
    hint: "Use 0 for an empty account.",
  },
  {
    name: "EstimatedSalary", label: "Estimated salary", group: "finances", control: "number",
    min: 0, max: 1e9, step: "any", integer: false, placeholder: "e.g. 54,000",
  },

  // ── Banking relationship ──────────────────────────────────
  {
    name: "Tenure", label: "Tenure", group: "relationship", control: "slider",
    min: 0, max: 10, step: 1, integer: true, unit: "years", placeholder: "0–10",
  },
  {
    name: "NumOfProducts", label: "Products held", group: "relationship", control: "segmented",
    options: [1, 2, 3, 4].map((n) => ({ label: String(n), value: n })),
  },
  { name: "HasCrCard", label: "Has a credit card", group: "relationship", control: "segmented", options: YES_NO },
  { name: "IsActiveMember", label: "Active member", group: "relationship", control: "segmented", options: YES_NO },
  {
    name: "Month", label: "Month", group: "relationship", control: "select",
    options: MONTHS, placeholder: "Select a month",
  },
];

// A convenient profile for trying the form. It is only form input —
// the prediction still comes from the Flask API.
export const SAMPLE_PROFILE = {
  CreditScore: 619, Age: 42, Tenure: 2, Balance: 0, NumOfProducts: 1,
  HasCrCard: 1, IsActiveMember: 1, EstimatedSalary: 101348.88,
  GeographyLocation: 0, GenderCategory: 0, Month: 1,
};
