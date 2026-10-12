// Avisa a Bing (y a los buscadores que usan IndexNow) de las paginas nuevas o cambiadas.
// Uso despues de publicar: node tools/indexnow.mjs   (lee tools/guias-urls.txt)
import { readFileSync, readdirSync } from "node:fs";
const key = readdirSync("public").find((f) => /^[0-9a-f]{32}\.txt$/.test(f))?.slice(0, 32);
const urlList = readFileSync("tools/guias-urls.txt", "utf8").split("\n").filter(Boolean);
const r = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ host: "streamlogicsweb.com", key, keyLocation: `https://streamlogicsweb.com/${key}.txt`, urlList }),
});
console.log("indexnow:", r.status);
