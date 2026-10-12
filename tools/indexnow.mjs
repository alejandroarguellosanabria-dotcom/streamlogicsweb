// Avisa a Bing (y a los buscadores que usan IndexNow) de las paginas del sitemap.
// Lo corre GitHub Actions tras cada publicacion; tambien sirve a mano: node tools/indexnow.mjs
// Si falla no rompe nada: solo lo cuenta en el log.
import { readFileSync, readdirSync } from "node:fs";
try {
  const key = readdirSync("public").find((f) => /^[0-9a-f]{32}\.txt$/.test(f))?.slice(0, 32);
  const urlList = [...readFileSync("public/sitemap.xml", "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const r = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ host: "streamlogicsweb.com", key, keyLocation: `https://streamlogicsweb.com/${key}.txt`, urlList }),
  });
  console.log(`indexnow: ${r.status} (${urlList.length} URLs)`);
} catch (e) { console.log("indexnow: no se pudo avisar:", e.message); }
