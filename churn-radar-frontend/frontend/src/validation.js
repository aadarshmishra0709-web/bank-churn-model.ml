import { FIELDS } from "./schema.js";

const fmt = (n) => n.toLocaleString("en-US");

function validateNumber(field, raw) {
  const text = String(raw ?? "").trim();
  if (text === "") return { error: `Enter ${field.label.toLowerCase()}.` };

  const value = Number(text);
  if (!Number.isFinite(value)) return { error: "Enter a valid number." };
  if (field.integer && !Number.isInteger(value)) return { error: "Use a whole number." };
  if (value < field.min || value > field.max) {
    return {
      error: field.max >= 1e9
        ? `Must be ${fmt(field.min)} or more.`
        : `Must be between ${fmt(field.min)} and ${fmt(field.max)}.`,
    };
  }
  return { value };
}

function validateChoice(field, raw) {
  const text = String(raw ?? "").trim();
  if (text === "") return { error: `Choose ${field.label.toLowerCase()}.` };

  const value = Number(text);
  const allowed = field.options.some((o) => o.value === value);
  return allowed ? { value } : { error: "Choose one of the listed options." };
}

/**
 * @param {Record<string,string>} raw  form values keyed by API field name
 * @returns {{ ok: boolean, errors: Record<string,string>, payload: Record<string,number> }}
 */
export function validate(raw) {
  const errors = {};
  const payload = {};

  for (const field of FIELDS) {
    const check = field.control === "number" || field.control === "slider"
      ? validateNumber(field, raw[field.name])
      : validateChoice(field, raw[field.name]);

    if (check.error) errors[field.name] = check.error;
    else payload[field.name] = check.value;
  }
  return { ok: Object.keys(errors).length === 0, errors, payload };
}

/** Validate a single field (used for live feedback after the first blur). */
export function validateField(name, rawValue) {
  const field = FIELDS.find((f) => f.name === name);
  const check = field.control === "number" || field.control === "slider"
    ? validateNumber(field, rawValue)
    : validateChoice(field, rawValue);
  return check.error ?? "";
}
