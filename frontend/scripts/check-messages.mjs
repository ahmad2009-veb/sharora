// Fails (exit 1) when src/messages/ru.json and tg.json drift apart: a key missing in either
// file, an empty value, different {placeholders}, or a string in the wrong alphabet
// (Tajik letters in Russian, Russian-only letters in Tajik).
// Usage: npm run check:i18n
import { readFileSync } from "node:fs";

const dir = new URL("../src/messages/", import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(name, dir), "utf8"));
const files = { ru: load("ru.json"), tg: load("tg.json") };

/** {"a": {"b": "x"}} → Map { "a.b" => "x" } */
function flatten(obj, prefix = "", out = new Map()) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") flatten(value, path, out);
    else out.set(path, value);
  }
  return out;
}

// Top-level ICU argument names: "{count, plural, ...}" → count, "{n}" → n.
function placeholders(text) {
  const names = new Set();
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") {
      if (depth === 0) names.add(text.slice(i + 1).match(/^\s*(\w+)/)?.[1]);
      depth++;
    } else if (text[i] === "}") depth--;
  }
  names.delete(undefined);
  return [...names].sort().join(",");
}

const TAJIK_ONLY = /[ҳҷқғӯӣҲҶҚҒӮӢ]/;
const RUSSIAN_ONLY = /[ыщцЫЩЦ]/;

const ru = flatten(files.ru);
const tg = flatten(files.tg);
const errors = [];

for (const [key] of ru) if (!tg.has(key)) errors.push(`tg.json is missing "${key}"`);
for (const [key] of tg) if (!ru.has(key)) errors.push(`ru.json is missing "${key}"`);

for (const [locale, map] of [
  ["ru", ru],
  ["tg", tg],
]) {
  for (const [key, value] of map) {
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(`${locale}.json "${key}" is empty or not a string`);
      continue;
    }
    if (locale === "ru" && TAJIK_ONLY.test(value))
      errors.push(`ru.json "${key}" contains Tajik letters: ${value}`);
    if (locale === "tg" && RUSSIAN_ONLY.test(value))
      errors.push(`tg.json "${key}" contains Russian-only letters: ${value}`);
  }
}

for (const [key, value] of ru) {
  const other = tg.get(key);
  if (typeof value === "string" && typeof other === "string") {
    if (placeholders(value) !== placeholders(other))
      errors.push(
        `"${key}" placeholders differ: ru {${placeholders(value)}} / tg {${placeholders(other)}}`,
      );
  }
}

if (errors.length) {
  console.error(`i18n check failed (${errors.length}):\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log(`i18n check passed: ${ru.size} keys in ru.json and tg.json.`);
