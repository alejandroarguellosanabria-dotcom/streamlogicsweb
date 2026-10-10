import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* Cuando tengas un video real de tu stream, ponlo en public/media/ y escribe
   aqui su ruta (por ejemplo "/media/stream.mp4"). Sustituye a la animacion. */
const HERO_VIDEO = "";

// Lo que se mueve con el scroll lo controla quien baja, asi que se mantiene siempre
// (Windows con "efectos de animacion" apagados dejaba la pagina quieta). Los bucles
// automaticos (clips flotando) los para el CSS con prefers-reduced-motion.
const reduced = false;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (v) => Math.min(1, Math.max(0, v));
// Curvas: salida fuerte para lo que entra, nunca ease-in
const OUT = "expo.out";

/* ═══ 1 · PORTADA ═══ */
if (!reduced) {
  const intro = gsap.timeline({ defaults: { ease: OUT } });
  intro
    .from(".hero-eye", { opacity: 0, y: 12, duration: 0.8 })
    .from(".hero .line-in", { yPercent: 110, duration: 1.2, stagger: 0.08 }, 0.05)
    .from([".hero-sub", ".hero-cta"], { opacity: 0, y: 18, duration: 1, stagger: 0.06 }, 0.45)
    .from(".reel", { opacity: 0, y: 120, duration: 1.4 }, 0.55);

  // fromTo + immediateRender:false: si el navegador tarda en cargar, el scroll no
  // debe "copiar" la opacidad 0 de la entrada y dejar la portada en blanco.
  gsap.fromTo(".hero > *", { y: 0, opacity: 1 }, {
    y: -80, opacity: 0, ease: "none", stagger: 0.02, immediateRender: false,
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 20%", scrub: 0.4 },
  });
}

/* ═══ 2 · ESCENA: del stream horizontal al clip vertical ═══ */
const frame = $("#frame");
const feed = $("#feed");

if (HERO_VIDEO) {
  const v = Object.assign(document.createElement("video"), { src: HERO_VIDEO, muted: true, loop: true, playsInline: true, autoplay: true });
  v.setAttribute("aria-hidden", "true");
  feed.replaceWith(v);
} else {
  paintFeed(feed, $("#ambient"));
}

// Reloj del directo
(() => {
  const el = $("#clock");
  let s = 3 * 3600 + 12 * 60 + 47;
  const fmt = (n) => String(n).padStart(2, "0");
  setInterval(() => { s++; el.textContent = `${fmt(Math.floor(s / 3600))}:${fmt(Math.floor(s / 60) % 60)}:${fmt(s % 60)}`; }, 1000);
})();

// Recorte a 9:16 dentro de un cuadro 16:9: queda el 31.64 % del ancho
const SIDE = ((1 - (9 / 16) * (9 / 16)) / 2) * 100;
const growth = () => {
  // Al recortar, el clip vertical crece hasta llenar bien la pantalla
  const h = frame.offsetHeight, w = frame.offsetWidth * (1 - SIDE / 50);
  return Math.max(1, Math.min(($("#stage").clientHeight * 0.96) / h, (innerWidth * 0.84) / w, 1.8));
};

function paintCaps(p) {
  // p: 0..1 dentro del tramo de subtitulos. Cada palabra "salta" como en un clip real.
  const words = $$("#caps span");
  const n = words.length;
  let last = -1;
  words.forEach((w, i) => {
    const t = clamp01((p - i / (n + 1)) / 0.12);
    const k = t < 1 ? 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2) : 1; // back.out suave
    w.style.opacity = t > 0 ? Math.min(1, t * 3) : 0;
    w.style.transform = `scale(${0.6 + 0.4 * k})`;
    if (t > 0) last = i;
  });
  words.forEach((w, i) => w.classList.toggle("on", i === last));
}

if (reduced) {
  $("#scene").style.height = "auto";
  $(".scene-pin").style.position = "relative";
  $(".scene-pin").style.padding = "12vh 0";
  gsap.set(frame, { clipPath: `inset(0% ${SIDE}% 0% ${SIDE}% round 28px)` });
  gsap.set([".chat", ".hud", ".scene-a"], { opacity: 0 });
  gsap.set([".tw-name", ".scene-b", ".glass"], { opacity: 1 });
  gsap.set(".ambient", { opacity: 0.85 });
  $("#stage").style.setProperty("--cw", `${frame.offsetWidth * (1 - SIDE / 50)}px`);
  paintCaps(1);
} else {
  gsap.set(frame, { clipPath: "inset(0% 0% 0% 0% round 18px)", scale: 0.86 });
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: "#scene", start: "top top", end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true,
      onUpdate: (st) => {
        paintCaps(clamp01((st.progress - 0.6) / 0.32));
        // Vistas y me gusta que suben mientras bajas
        const k = clamp01((st.progress - 0.66) / 0.24);
        $$(".gl-count").forEach((c) => { c.textContent = `${Math.round(+c.dataset.to * k)}K`; });
      },
      onRefresh: () => $("#stage").style.setProperty("--cw", `${frame.offsetWidth * (1 - SIDE / 50) * growth()}px`),
    },
  });
  tl.to(frame, { scale: 1, duration: 0.18, ease: "power2.out" }, 0)
    .to(".scene-a", { opacity: 0, y: -24, duration: 0.1 }, 0.3)
    .to(".chat", { opacity: 0, duration: 0.12 }, 0.3)
    .to(".hud", { opacity: 0, duration: 0.08 }, 0.36)
    .to(frame, { clipPath: `inset(0% ${SIDE}% 0% ${SIDE}% round 28px)`, duration: 0.24, ease: "power2.inOut" }, 0.3)
    .to(frame, { scale: () => growth(), duration: 0.24, ease: "power2.inOut" }, 0.3)
    .fromTo(".scene-b", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.1 }, 0.46)
    .to(".ambient", { opacity: 0.85, duration: 0.24 }, 0.3)
    .fromTo(".glass-l", { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.1, ease: "power2.out" }, 0.6)
    .fromTo(".glass-r", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.1, ease: "power2.out" }, 0.66)
    .fromTo(".tw-name", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.08 }, 0.52)
    .to(".streamer", { yPercent: -6, scale: 1.08, duration: 0.3, ease: "power2.inOut" }, 0.3)
    .to({}, { duration: 0.1 }, 0.9);
  paintCaps(0);
}

/* ═══ 3 · FRASE: se ilumina palabra a palabra ═══ */
(() => {
  const st = $("#st");
  const light = (p) => {
    const ws = $$("span", st);
    const k = Math.round(p * ws.length);
    ws.forEach((w, i) => w.classList.toggle("lit", i < k));
  };
  if (reduced) { light(1); addEventListener("langchange", () => light(1)); return; }
  const trig = ScrollTrigger.create({ trigger: st, start: "top 78%", end: "bottom 42%", onUpdate: (s) => light(s.progress) });
  addEventListener("langchange", () => light(trig.progress));
})();

/* ═══ 4 · CIFRAS ═══ */
if (!reduced) {
  gsap.set(".tile", { opacity: 0, y: 40 });
  ScrollTrigger.batch(".tile", {
    start: "top 88%", once: true,
    onEnter: (els) => {
      gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: OUT, stagger: 0.06 });
      els.forEach((el) => {
        const n = el.querySelector("[data-count]");
        if (!n || !+n.dataset.count) return;
        const tpl = n.textContent, o = { v: 0 };
        gsap.to(o, { v: +n.dataset.count, duration: 1.1, ease: "power3.out", onUpdate: () => { n.textContent = tpl.replace(/\d+/, Math.round(o.v)); } });
      });
    },
  });
}

/* ═══ 5 · COMO FUNCIONA ═══ */
const mm = gsap.matchMedia();
mm.add({ big: "(min-width: 861px)", small: "(max-width: 860px)" }, (ctx) => {
  const how = $("#how");
  const steps = $$(".step", how);
  if (ctx.conditions.small || reduced) {
    how.classList.add("flat");
    return () => how.classList.remove("flat");
  }
  const pics = $$(".pic", how);
  gsap.set(steps, { opacity: 0, y: 40 });
  gsap.set(steps[0], { opacity: 1, y: 0 });
  gsap.set(pics, { opacity: 0, scale: 0.92, rotate: 4 });
  gsap.set(pics[0], { opacity: 1, scale: 1, rotate: -2 });
  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    scrollTrigger: { trigger: how, start: "top top", end: "+=130%", pin: ".how-pin", scrub: 0.5 },
  });
  tl.to("#howBar", { scaleX: 1, ease: "none", duration: 2 }, 0);
  // Un trazo que se va dibujando con un punto en la punta: siempre se mueve algo al bajar
  const path = $("#howPath"), dot = $("#howDot"), len = path.getTotalLength();
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
  const tr = { p: 0 };
  tl.to(tr, { p: 1, ease: "none", duration: 2, onUpdate: () => {
    path.style.strokeDashoffset = len * (1 - tr.p);
    const pt = path.getPointAtLength(len * tr.p);
    dot.setAttribute("cx", pt.x); dot.setAttribute("cy", pt.y);
  } }, 0);
  tl.fromTo(".pics", { y: 30 }, { y: -30, ease: "none", duration: 2 }, 0);
  steps.slice(1).forEach((s, i) => {
    tl.to(steps[i], { opacity: 0, y: -40, duration: 0.35 }, i + 0.45)
      .to(s, { opacity: 1, y: 0, duration: 0.35 }, i + 0.6)
      .to(pics[i], { opacity: 0, scale: 0.92, rotate: -6, duration: 0.4 }, i + 0.45)
      .to(pics[i + 1], { opacity: 1, scale: 1, rotate: i % 2 ? -2 : 2, duration: 0.45 }, i + 0.55);
  });
  return () => gsap.set([steps, pics, "#howBar", ".pics", "#howPath"], { clearProps: "all" });
});

/* ═══ APARECER AL BAJAR ═══ */
if (!reduced) {
  ScrollTrigger.batch(".rv", {
    start: "top 90%", once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: OUT, stagger: 0.06 }),
  });
  gsap.from(".final .line-in", {
    yPercent: 110, duration: 1.2, ease: OUT, stagger: 0.08,
    scrollTrigger: { trigger: ".final", start: "top 70%", once: true },
  });
}

/* ═══ PERSONAJITOS QUE FLOTAN ═══ cada uno a su velocidad, para que bajar tenga vida */
$$(".floater").forEach((f, i) => {
  const sp = +f.dataset.speed || 1;
  gsap.fromTo(f, { y: 140 * sp, rotate: i % 2 ? -8 : 8 }, {
    y: -140 * sp, rotate: i % 2 ? 6 : -6, ease: "none",
    scrollTrigger: { trigger: f.parentElement, start: "top bottom", end: "bottom top", scrub: 0.8 },
  });
});

addEventListener("langchange", () => ScrollTrigger.refresh());
addEventListener("load", () => ScrollTrigger.refresh());

/* ═══ La "camara" provisional: paisaje de montanas con niebla + grano ═══
   Se dibuja a media resolucion y solo mientras la escena esta en pantalla. */
function paintFeed(cv, amb) {
  const ctx = cv.getContext("2d");
  const actx = amb?.getContext("2d");
  if (amb) { amb.width = 64; amb.height = 36; }
  // Capas de lejos a cerca: color, altura base, amplitud, velocidad de deriva
  const layers = [
    { c: "#c3d1c6", base: 0.5, amp: 0.1, sp: 4, f: [1.3, 3.1], trees: false },
    { c: "#9fb5a6", base: 0.6, amp: 0.09, sp: 8, f: [1.9, 4.3], trees: false },
    { c: "#6f8f7e", base: 0.7, amp: 0.07, sp: 14, f: [2.4, 5.7], trees: true },
    { c: "#3d5f51", base: 0.82, amp: 0.05, sp: 24, f: [3.1, 7.9], trees: true },
    { c: "#1f3a30", base: 0.93, amp: 0.035, sp: 38, f: [4.2, 9.3], trees: true },
  ];
  const noise = document.createElement("canvas");
  noise.width = noise.height = 128;
  const nctx = noise.getContext("2d"), img = nctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 10; }
  nctx.putImageData(img, 0, 0);
  const grain = ctx.createPattern(noise, "repeat");
  let w = 0, h = 0, on = false, raf = 0, last = 0, ambAt = -1e9;
  // Lienzo a media resolucion y como mucho 560 px de ancho (se escala con CSS)
  const size = () => {
    const k = Math.min(0.5, 560 / Math.max(1, cv.offsetWidth));
    w = cv.width = Math.max(2, Math.round(cv.offsetWidth * k)); h = cv.height = Math.max(2, Math.round(cv.offsetHeight * k));
    ambAt = -1e9;
  };
  const ridge = (L, x, off) => {
    const u = (x + off) / w;
    return h * (L.base - L.amp * (Math.sin(u * L.f[0] * Math.PI + L.f[1]) * 0.6 + Math.sin(u * L.f[1] * Math.PI) * 0.4));
  };
  const draw = (ms) => {
    const t = ms / 1000;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#eef2ec");
    sky.addColorStop(1, "#d3dfd6");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    // Sol tenue
    const sun = ctx.createRadialGradient(w * 0.68, h * 0.3, 0, w * 0.68, h * 0.3, h * 0.35);
    sun.addColorStop(0, "rgba(255,248,226,0.95)");
    sun.addColorStop(1, "rgba(255,248,226,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);
    layers.forEach((L, li) => {
      const off = t * L.sp;
      ctx.fillStyle = L.c;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 4) ctx.lineTo(x, ridge(L, x, off));
      ctx.lineTo(w, h);
      ctx.fill();
      if (L.trees) {
        // Pinos sobre la cresta, repartidos de forma fija y moviendose con la capa
        const gap = 26 - li * 3, th = h * (0.03 + li * 0.012);
        for (let k = Math.floor(off / gap) - 1; k * gap - off < w + gap; k++) {
          const seed = Math.sin(k * 12.9898 + li * 78.233) * 43758.5453;
          if (seed - Math.floor(seed) < 0.45) continue;
          const x = k * gap - off, y = ridge(L, x, off) + 2, s = th * (0.7 + (seed % 1) * 0.6);
          ctx.beginPath();
          ctx.moveTo(x, y - s * 1.6);
          ctx.lineTo(x + s * 0.45, y);
          ctx.lineTo(x - s * 0.45, y);
          ctx.fill();
        }
      }
      // Niebla entre capas
      if (li < 3) {
        const my = h * (L.base + 0.04);
        const mist = ctx.createLinearGradient(0, my - h * 0.08, 0, my + h * 0.08);
        mist.addColorStop(0, "rgba(240,244,239,0)");
        mist.addColorStop(0.5, `rgba(240,244,239,${0.45 + 0.15 * Math.sin(t * 0.5 + li)})`);
        mist.addColorStop(1, "rgba(240,244,239,0)");
        ctx.fillStyle = mist;
        ctx.fillRect(0, my - h * 0.08, w, h * 0.16);
      }
    });
    ctx.fillStyle = grain;
    ctx.fillRect(0, 0, w, h);
    // El fondo borroso de la escena se copia muy de vez en cuando: redibujar un
    // desenfoque de pantalla completa en cada cuadro era lo que mas pesaba.
    // El desenfoque se hace aqui, en un lienzo diminuto, y no con CSS: un filter blur
    // sobre toda la pantalla hacia ir el scroll a tirones.
    if (actx && ms - ambAt > 2000) {
      actx.filter = "blur(3px) saturate(1.1)";
      actx.drawImage(cv, -4, -4, 72, 44);
      actx.filter = "none";
      if (document.documentElement.dataset.theme === "dark") { actx.fillStyle = "rgba(0,0,0,0.55)"; actx.fillRect(0, 0, 64, 36); }
      ambAt = ms;
    }
  };
  // El paisaje se mueve despacio: 30 cuadros por segundo bastan y dejan aire al scroll
  const loop = (ms) => {
    if (ms - last >= 32) { last = ms; draw(ms); }
    if (on) raf = requestAnimationFrame(loop);
  };
  size();
  // Al cambiar el tamano el lienzo se borra: se vuelve a pintar aunque no este animando
  addEventListener("resize", () => { size(); if (!on) draw(performance.now()); });
  // Al cambiar de modo, el fondo vuelve a pintarse con el brillo nuevo
  new MutationObserver(() => { ambAt = -1e9; if (!on) draw(performance.now()); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (reduced) { draw(0); return; }
  new IntersectionObserver(([e]) => {
    on = e.isIntersecting;
    cancelAnimationFrame(raf);
    if (on) raf = requestAnimationFrame(loop);
  }).observe(cv);
}
