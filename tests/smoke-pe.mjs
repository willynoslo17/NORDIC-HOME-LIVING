#!/usr/bin/env node
/**
 * Smoke checks for Domheim /pe/ (Peru) and safety invariants.
 * Run: node tests/smoke-pe.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const ok = [];

function read(rel) {
  const p = join(root, rel);
  if (!existsSync(p)) {
    fail.push("missing file: " + rel);
    return "";
  }
  return readFileSync(p, "utf8");
}

function assert(cond, msg) {
  if (cond) ok.push(msg);
  else fail.push(msg);
}

const pe = read("pe/index.html");
const region = read("pe/region-switch.js");
const runtime = read("commerce-runtime.js");
const checkout = read("functions/api/create-checkout-session.ts");
const index = read("index.html");
const catalog = read("pe/catalog.json");

assert(pe.includes('lang="es-PE"'), "pe/index.html is Spanish (es-PE)");
assert(/IGV|igv/.test(pe) && pe.includes("18"), "pe page mentions IGV 18%");
assert(pe.includes("PEN") || pe.includes("currency:'PEN'"), "pe page uses PEN");
assert(pe.includes('id="regionSwitch"'), "pe header has region switch");
assert(pe.includes("/pe/region-switch.js"), "pe loads pe/region-switch.js");
assert(!pe.includes("/api/cj-products") && !pe.includes("loadNordicCatalog") && !pe.includes("supplier-bridge"), "pe does not call live catalog APIs");
assert(pe.includes("/pe/catalog.json"), "pe loads static snapshot catalog");
assert(!/CHECKOUT_ENABLED\s*=\s*true/.test(pe), "pe page does not enable checkout locally");
assert(pe.includes('disabled') && /CAJA PRONTO|PAGO PRONTO/.test(pe), "pe checkout controls are paused");

assert(region.includes("domheim-region"), "region-switch uses localStorage key domheim-region");
assert(region.includes("/pe/"), "region-switch knows /pe/ path");
assert(region.includes("europa") && region.includes("peru"), "region-switch has Europa/Perú");

assert(/const CHECKOUT_ENABLED = false/.test(runtime), "commerce-runtime CHECKOUT_ENABLED=false");
assert(/const CHECKOUT_ENABLED = false/.test(checkout), "create-checkout-session CHECKOUT_ENABLED=false");

assert(index.includes('lang="nb"'), "Norwegian store html lang unchanged");
assert(/Et roligere og vakrere hjem/.test(index), "Norwegian hero copy unchanged");
assert(!index.includes("lima.css"), "Norwegian store does not load lima.css");
assert(!index.includes("region-switch.js"), "Norwegian store does not load region-switch (Noruega unchanged)");

const legalPages = [
  ["pe/terminos.html", "Términos", "IGV"],
  ["pe/privacidad.html", "MARTINEZ LOZANO INTERNASJONAL HANDEL", "responsable"],
  ["pe/envios.html", "Envío a todo el Perú", "S/ 14"],
  ["pe/cambios.html", "devoluciones", "support@domheim.no"],
  ["pe/libro-reclamaciones.html", "Libro de Reclamaciones", "mailto:support@domheim.no"],
];
for (const [file, a, b] of legalPages) {
  const text = read(file);
  assert(text.includes(a) && text.includes(b), file + " has required legal content");
  assert(text.includes("regionSwitch") || text.includes("region-switch.js"), file + " has region switch");
  assert(text.includes("support@domheim.no"), file + " uses Domheim support email");
}
assert(existsSync(join(root, "pe/legal.css")), "pe/legal.css exists");
assert(pe.includes("/pe/libro-reclamaciones"), "pe homepage links Libro de Reclamaciones");

const lima = read("pe/lima.css");
assert(lima.includes("--sun") && lima.includes("Archivo Black"), "lima.css defines Lima palette/fonts");
assert(pe.includes("/pe/lima.css"), "pe storefront loads lima.css");
assert(pe.includes("Yape") && pe.includes("Plin") && /pr[oó]ximamente/i.test(pe), "pe shows Yape/Plin próximamente");
assert(pe.includes("badge stock") && pe.includes("Envío a todo el Perú"), "pe products show stock and Peru shipping badges");
assert(pe.includes("reseñas") || pe.includes("reviews"), "pe products show reviews");

try {
  const rows = JSON.parse(catalog);
  assert(Array.isArray(rows) && rows.length >= 40, "pe/catalog.json has hogar/decor products from snapshot");
  assert(rows.every((r) => r.priceNok > 0 && r.image && r.name), "catalog rows have price, image, name");
  const blob = catalog.toLowerCase();
  assert(!blob.includes("supplierprice") && !blob.includes("cj_api_key") && !blob.includes("sk_live"), "catalog has no secrets or supplier costs");
  const cats = new Set(rows.map((r) => r.cat));
  assert([...cats].some((c) => /decor|textil|ilumin|almacen|hogar/i.test(c)), "catalog categories are home/decor");
} catch (e) {
  fail.push("pe/catalog.json parse: " + e.message);
}

const sitemap = read("sitemap.xml");
assert(sitemap.includes("https://domheim.no/pe/"), "sitemap includes /pe/");
assert(sitemap.includes("libro-reclamaciones"), "sitemap includes libro de reclamaciones");

console.log("PASS " + ok.length);
ok.forEach((m) => console.log("  ✓ " + m));
if (fail.length) {
  console.log("FAIL " + fail.length);
  fail.forEach((m) => console.log("  ✗ " + m));
  process.exit(1);
}
console.log("All smoke checks passed.");
