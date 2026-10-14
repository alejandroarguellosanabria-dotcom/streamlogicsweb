import { T, LANGS } from "../i18n.js";
import { isBot, waitFor, noteSend, clean } from "./guard.js";

/* CONFIG: lo unico que hay que tocar */
const SL = {
  email: "contacto@streamlogicsweb.com",
  // Asesor de edicion personal. Mientras formAction este vacio, la solicitud
  // abre el correo del cliente con todo escrito (no se pierde ninguna).
  asesor: { formAction: "", campos: { nombre: "", correo: "", canal: "", mensaje: "" } },
  // Muestras gratis: Formulario de Google "Muestras". Vacio = se abre el correo con todo escrito.
  muestras: { formAction: "https://docs.google.com/forms/d/e/1FAIpQLSdOcLOGgBKt8bD9ElwR18XwPAOF6qcTIz0YGA-uRlw3Xjko1w/formResponse", campos: { correo: "entry.1456737228", origen: "entry.492430691" } },
};


/* ═══ IDIOMA ═══
   Cada idioma tiene su URL (/, /es/, /pt/, /fr/) con el HTML ya traducido.
   Al elegir otro idioma se recuerda y se va a su URL. */
export const L = LANGS.includes(document.documentElement.lang) ? document.documentElement.lang : "en";
const sel = document.getElementById("lang");
const tx = (k) => T[L][k] ?? T.en[k];
sel.value = L;
sel.addEventListener("change", () => {
  const l = LANGS.includes(sel.value) ? sel.value : "en";
  try { localStorage.setItem("sl-lang", l); } catch {}
  location.href = (l === "en" ? "/" : `/${l}/`) + location.hash;
});

/* ═══ MODO CLARO / OSCURO ═══
   Sin preguntar: se usa el del sistema hasta que la persona toque el sol o la luna. */
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
  // Si no eligio a mano, sigue al sistema cuando este cambia (p. ej. modo noche automatico)
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    let saved = null;
    try { saved = localStorage.getItem("sl-theme"); } catch {}
    if (!saved) set(e.matches ? "dark" : "light", false);
  });
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

/* ═══ MUESTRAS ═══
   Paso 1: el correo (y el idioma del correo). Paso 2: "van en camino" y, mientras
   tanto, "como nos conociste" (obligatorio). Se guarda todo junto al responder;
   si la persona se va sin responder, se guarda igual con "Sin responder". */
(() => {
  const form = document.getElementById("smForm");
  const s1 = document.getElementById("smStep1"), s2 = document.getElementById("smStep2");
  const opts = form.querySelector(".sm-opts"), otherWrap = document.getElementById("smOtherWrap"), other = document.getElementById("smOther");
  const mail = document.getElementById("smMail"), lang = document.getElementById("smLang"), err = document.getElementById("smErr"), btn = document.getElementById("smBtn"), next = document.getElementById("smNext"), ok = document.getElementById("smOk");
  const pick = () => form.querySelector('input[name="src"]:checked')?.value || "";
  // Cada persona pide las muestras una sola vez por navegador; el correo del dueño (guardado como hash) no tiene límite.
  const KEY = "sl_muestras";
  const LIBRES = ["817228fc5a4363dc27fdb630f982069847b3416c22a81d6fe8cff7eb8b7b3f83"];
  const libre = async (c) => {
    try {
      const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(c.trim().toLowerCase()));
      return LIBRES.includes([...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join(""));
    } catch { return false; }
  };
  const repetido = () => { try { return Boolean(localStorage.getItem(KEY)); } catch { return false; } };
  // Despues de pedirlas: "¿te llegaron?" o escribir a soporte (correo con su direccion ya escrita).
  const check = document.getElementById("smCheck");
  const preguntar = (c) => {
    const body = `${tx("sm_mailbody")}\n\n${c ? "Email: " + c + "\n" : ""}Idioma / Language: ${L}`;
    document.getElementById("smSupport").href = `mailto:${SL.email}?subject=${encodeURIComponent(tx("sm_mailsub"))}&body=${encodeURIComponent(body)}`;
    check.hidden = false;
  };
  document.getElementById("smGotYes").addEventListener("click", () => {
    check.querySelector(".sm-check-btns").hidden = true;
    document.getElementById("smGotOk").hidden = false;
  });
  opts.addEventListener("change", () => {
    otherWrap.hidden = pick() !== "Otro";
    opts.classList.remove("err");
    err.textContent = "";
  });

  // Lo pedido en el paso 1, a la espera de la respuesta del paso 2
  let pend = null;
  const datos = (origen) => {
    const data = new FormData();
    data.append(SL.muestras.campos.correo, pend.correo);
    data.append(SL.muestras.campos.origen, `${origen} [${pend.idioma}]`);
    return data;
  };
  const listo = () => { if (!pend.libre) { try { localStorage.setItem(KEY, "1"); } catch {} } };
  // Si cierra o cambia de pestaña sin responder, las muestras se piden igual
  const alSalir = () => {
    if (!pend || pend.enviado || document.visibilityState !== "hidden" || !SL.muestras.formAction) return;
    try { pend.enviado = navigator.sendBeacon(SL.muestras.formAction, datos("Sin responder")); } catch {}
    if (pend.enviado) listo();
  };
  document.addEventListener("visibilitychange", alSalir);
  addEventListener("pagehide", () => alSalir());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!s2.hidden) { next.click(); return; }
    const correo = clean(mail.value, 120);
    const idioma = LANGS.includes(lang.value) ? lang.value : L;
    if (isBot(form)) { form.hidden = true; ok.hidden = false; return; }
    const bad = !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(correo);
    mail.classList.toggle("err", bad);
    if (bad) { err.textContent = tx("eMail"); return; }
    const sinLimite = await libre(correo);
    if (!sinLimite && repetido()) { form.hidden = true; document.getElementById("smDup").hidden = false; preguntar(correo); return; }
    const wait = sinLimite ? 0 : waitFor();
    if (wait) { err.textContent = tx("eRate").replace("{s}", wait > 90 ? `${Math.ceil(wait / 60)} min` : `${wait} s`); return; }
    err.textContent = "";
    if (!sinLimite) noteSend();
    pend = { correo, idioma, libre: sinLimite, enviado: false };
    s1.hidden = true;
    s2.hidden = false;
    opts.querySelector("input")?.focus();
  });

  next.addEventListener("click", async () => {
    const src = pick();
    if (!pend) return;
    if (!src) { opts.classList.add("err"); err.textContent = tx("eSrc"); return; }
    err.textContent = "";
    const origen = clean(src === "Otro" && other.value.trim() ? `Otro: ${other.value}` : src, 160);
    next.disabled = true;
    next.textContent = tx("sending");
    const M = SL.muestras;
    let saved = pend.enviado;
    if (!saved && M.formAction && M.campos.correo && M.campos.origen) {
      try { await fetch(M.formAction, { method: "POST", mode: "no-cors", body: datos(origen) }); saved = true; } catch { saved = false; }
    }
    if (!saved) {
      const body = encodeURIComponent(`Email: ${pend.correo}\nHow did you hear about us: ${origen}\nLanguage: ${pend.idioma}`);
      location.href = `mailto:${SL.email}?subject=${encodeURIComponent("Sample request")}&body=${body}`;
    }
    pend.enviado = true;
    listo();
    form.hidden = true;
    ok.hidden = false;
    preguntar(pend.correo);
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
