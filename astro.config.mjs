import { defineConfig } from "astro/config";

// Web estatica: `npm run build` deja todo en dist/ y GitHub Actions lo publica.
// Lo que esta en public/ (pedido, paginas legales, favicons, CNAME) se copia tal cual.
export default defineConfig({
  site: "https://streamlogicsweb.com",
  build: { format: "file" },
});
