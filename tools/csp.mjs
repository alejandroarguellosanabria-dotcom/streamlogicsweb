// Despues de "astro build": pone en cada pagina una politica de seguridad (CSP).
// GitHub Pages no deja enviar cabeceras, asi que va como <meta>. Calcula el hash
// de cada <script> en linea; si alguien logra colar un script nuevo, el
// navegador no lo ejecuta.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";

const DIR = "dist";
const policy = (hashes) => [
  "default-src 'self'",
  `script-src 'self' ${hashes.join(" ")}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self' https://docs.google.com",
  "form-action 'self' https://docs.google.com mailto:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "upgrade-insecure-requests",
].join("; ");

for (const f of readdirSync(DIR).filter((n) => n.endsWith(".html"))) {
  const p = `${DIR}/${f}`;
  let html = readFileSync(p, "utf8");
  const hashes = [];
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/type="application\/ld\+json"/.test(m[1])) continue;
    hashes.push(`'sha256-${createHash("sha256").update(m[2]).digest("base64")}'`);
  }
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy(hashes)}">` +
    `<meta name="referrer" content="strict-origin-when-cross-origin">`;
  html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, "").replace(/<head>/i, `<head>${meta}`);
  writeFileSync(p, html);
  console.log(`csp: ${f} (${hashes.length} scripts)`);
}
