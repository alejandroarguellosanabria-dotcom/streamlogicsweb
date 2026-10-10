import { T, LANGS } from "../i18n.js";
import { ICONS, stToken } from "../icons.js";
import { isBot, waitFor, noteSend, clean } from "./guard.js";

/* CONFIG: lo unico que hay que tocar */
const SL = {
  email: "contacto@streamlogicsweb.com",
  // Asesor de edicion personal. Mientras formAction este vacio, la solicitud
  // abre el correo del cliente con todo escrito (no se pierde ninguna).
  asesor: { formAction: "", campos: { nombre: "", correo: "", canal: "", mensaje: "" } },
};


/* ═══ IDIOMA ═══
   Se elige por ?lang=xx o por el idioma del navegador, y se puede cambiar a mano. */
export let L = (() => {
  const forced = new URLSearchParams(location.search).get("lang");
  if (forced && LANGS.includes(forced)) return forced;
  // Primer idioma del navegador que tengamos (es-PY -> es, pt-BR -> pt...)
  const prefs = (navigator.languages?.length ? navigator.languages : [navigator.language || "en"]).map((x) => x.toLowerCase());
  for (const n of prefs) { const l = LANGS.find((k) => n.startsWith(k)); if (l) return l; }
  return "en";
})();

const sel = document.getElementById("lang");
const tx = (k) => T[L][k] ?? T.en[k];

function wordsInto(el, text) {
  // "{i:nombre}" pone un icono propio dentro de la frase
  el.replaceChildren(...text.split(" ").flatMap((w) => {
    const word = (txt) => { const s = document.createElement("span"); s.textContent = txt + " "; return s; };
    const m = stToken(w);
    if (!m) return [word(w)];
    const av = document.createElement("span");
    av.className = "av";
    av.innerHTML = ICONS[m.icon] || "";
    return m.rest ? [av, word(m.rest)] : [av];
  }));
}

function setLang(l) {
  if (!T[l]) return;
  L = l;
  document.documentElement.lang = l;
  sel.value = l;
  document.querySelectorAll("[data-t]").forEach((el) => { el.innerHTML = tx(el.dataset.t); });
  wordsInto(document.getElementById("st"), tx("st"));
  const caps = document.getElementById("caps");
  caps.replaceChildren(...tx("cap").split(" ").map((w) => {
    const s = document.createElement("span");
    s.textContent = w;
    return s;
  }));
  document.getElementById("aMail").placeholder = tx("phMail");
  dispatchEvent(new CustomEvent("langchange", { detail: l }));
}
sel.addEventListener("change", () => setLang(sel.value));
if (L !== "en") setLang(L); else sel.value = "en";

/* ═══ MODO CLARO / OSCURO ═══
   La primera vez se pregunta; despues se recuerda y se cambia con el boton de la barra. */
(() => {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const set = (m, save) => {
    root.dataset.theme = m;
    meta?.setAttribute("content", m === "dark" ? "#0d1f23" : "#f7f8f5");
    if (save) { try { localStorage.setItem("sl-theme", m); } catch {} }
  };
  set(root.dataset.theme || "light", false);
  document.getElementById("themeBtn").addEventListener("click", () => set(root.dataset.theme === "dark" ? "light" : "dark", true));
  let saved = null;
  try { saved = localStorage.getItem("sl-theme"); } catch {}
  if (saved) return;
  const bg = document.getElementById("tpBg");
  bg.hidden = false;
  requestAnimationFrame(() => bg.classList.add("open"));
  document.body.style.overflow = "hidden";
  bg.querySelectorAll(".tp-opt").forEach((b) => {
    b.classList.toggle("on", b.dataset.mode === root.dataset.theme);
    b.addEventListener("click", () => {
      set(b.dataset.mode, true);
      bg.classList.remove("open");
      document.body.style.overflow = "";
      setTimeout(() => { bg.hidden = true; }, 260);
    });
  });
  setTimeout(() => bg.querySelector(".tp-opt.on")?.focus(), 80);
})();

/* ═══ BARRA: linea fina solo cuando hay contenido debajo ═══ */
const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("scrolled", scrollY > 8);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ═══ EDITOR DEDICADO: solicitud ═══
   Si hay formulario configurado se guarda ahi; si no (o si falla),
   se abre el correo del cliente con todo escrito. */
(() => {
  const form = document.getElementById("advForm");
  const ok = document.getElementById("advOk"), err = document.getElementById("aErr"), btn = document.getElementById("aBtn");
  const f = { nombre: "aName", correo: "aMail", canal: "aChan", mensaje: "aMsg" };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = {};
    for (const k in f) val[k] = clean(document.getElementById(f[k]).value, k === "mensaje" ? 2000 : 200);
    // Un robot no ve el error: cree que salio bien y no se envia nada
    if (isBot(form)) { form.hidden = true; ok.hidden = false; return; }
    const wait = waitFor();
    if (wait) { err.textContent = tx("eRate").replace("{s}", wait > 90 ? `${Math.ceil(wait / 60)} min` : `${wait} s`); return; }
    const bad = { nombre: !val.nombre, correo: !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(val.correo), mensaje: !val.mensaje };
    for (const k in bad) document.getElementById(f[k]).classList.toggle("err", bad[k]);
    if (bad.nombre || bad.correo || bad.mensaje) { err.textContent = tx("eAdv"); return; }
    err.textContent = "";
    noteSend();
    btn.disabled = true;
    btn.textContent = tx("sending");
    const A = SL.asesor;
    let saved = false;
    if (A.formAction && A.campos.correo) {
      const data = new FormData();
      for (const k in A.campos) if (A.campos[k]) data.append(A.campos[k], k === "mensaje" ? `${val[k]} [${L}]` : val[k]);
      try { await fetch(A.formAction, { method: "POST", mode: "no-cors", body: data }); saved = true; } catch { saved = false; }
    }
    if (!saved) {
      const body = encodeURIComponent(`Name: ${val.nombre}\nEmail: ${val.correo}\nChannel: ${val.canal}\nLanguage: ${L}\n\n${val.mensaje}`);
      location.href = `mailto:${SL.email}?subject=${encodeURIComponent("Personal editing advisor request")}&body=${body}`;
    }
    form.hidden = true;
    ok.hidden = false;
  });
})();

/* ═══ EL PASO ANTES DE PAGAR ═══
   El nombre y el precio se leen de la tarjeta del boton pulsado, asi nunca
   dicen una cosa en la tarjeta y otra en la ventana. */
(() => {
  const bg = document.getElementById("mpBg"), chk = document.getElementById("mpOk"), go = document.getElementById("mpGo");
  const nP = document.getElementById("mpPlan"), nPr = document.getElementById("mpPrice");
  let from = null;
  function open(a) {
    const c = a.closest(".offer, .pcard");
    const name = a.dataset.plan ? tx(a.dataset.plan) : c?.querySelector(".pc-name")?.textContent;
    nP.textContent = (name || "—").trim();
    nPr.textContent = c?.querySelector(".pc-price")?.textContent || "";
    buy = a.dataset.buy;
    chk.checked = false;
    arm();
    bg.classList.add("open");
    bg.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    from = a;
    setTimeout(() => chk.focus(), 60);
  }
  function close() {
    bg.classList.remove("open");
    bg.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    from?.focus();
    from = null;
  }
  // El link de Stripe se saca del boton: algunos navegadores y visores abren los
  // enlaces antes que nuestro aviso. Asi solo existe tras aceptar los terminos.
  document.querySelectorAll('a[href^="https://buy.stripe.com"]').forEach((a) => {
    a.dataset.buy = a.href;
    a.removeAttribute("href");
    a.removeAttribute("target");
    a.setAttribute("role", "button");
    a.tabIndex = 0;
    const go1 = (ev) => { ev.preventDefault(); open(a); };
    a.addEventListener("click", go1);
    a.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") go1(ev); });
  });
  let buy = "";
  const arm = () => {
    go.setAttribute("aria-disabled", chk.checked ? "false" : "true");
    if (chk.checked) { go.href = buy; go.target = "_blank"; } else { go.removeAttribute("href"); go.removeAttribute("target"); }
  };
  chk.addEventListener("change", arm);
  go.addEventListener("click", (ev) => {
    if (!chk.checked) { ev.preventDefault(); return; }
    setTimeout(close, 120);
  });
  document.getElementById("mpNo").addEventListener("click", close);
  bg.addEventListener("click", (ev) => { if (ev.target === bg) close(); });
  addEventListener("keydown", (ev) => { if (ev.key === "Escape" && bg.classList.contains("open")) close(); });
})();
