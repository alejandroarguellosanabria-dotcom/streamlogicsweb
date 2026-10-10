import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* Cuando tengas un video real de tu stream, ponlo en public/media/ y escribe
   aqui su ruta (por ejemplo "/media/stream.mp4"). Sustituye a la animacion. */
const HERO_VIDEO = "";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    .from(".hint", { opacity: 0, duration: 0.8 }, 0.9);

  gsap.to(".hero > *", {
    y: -80, opacity: 0, ease: "none", stagger: 0.02,
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
  paintFeed(feed);
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
  gsap.set([".chat", ".cam", ".hud", ".scene-a"], { opacity: 0 });
  gsap.set([".handle", ".scene-b"], { opacity: 1 });
  paintCaps(1);
} else {
  gsap.set(frame, { clipPath: "inset(0% 0% 0% 0% round 18px)", scale: 0.86 });
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: "#scene", start: "top top", end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true,
      onUpdate: (st) => paintCaps(clamp01((st.progress - 0.6) / 0.32)),
    },
  });
  tl.to(frame, { scale: 1, duration: 0.18, ease: "power2.out" }, 0)
    .to(".scene-a", { opacity: 0, y: -24, duration: 0.1 }, 0.3)
    .to([".chat", ".cam"], { opacity: 0, duration: 0.12 }, 0.3)
    .to(".hud", { opacity: 0, duration: 0.08 }, 0.36)
    .to(frame, { clipPath: `inset(0% ${SIDE}% 0% ${SIDE}% round 28px)`, duration: 0.24, ease: "power2.inOut" }, 0.3)
    .to(frame, { scale: () => growth(), duration: 0.24, ease: "power2.inOut" }, 0.3)
    .fromTo(".scene-b", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.1 }, 0.46)
    .to(".handle", { opacity: 1, duration: 0.06 }, 0.56)
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
  gsap.set(steps, { opacity: 0, y: 40 });
  gsap.set(steps[0], { opacity: 1, y: 0 });
  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    scrollTrigger: { trigger: how, start: "top top", end: "+=220%", pin: ".how-pin", scrub: 0.6 },
  });
  tl.to("#howBar", { scaleX: 1, ease: "none", duration: 2 }, 0);
  steps.slice(1).forEach((s, i) => {
    tl.to(steps[i], { opacity: 0, y: -40, duration: 0.35 }, i + 0.45)
      .to(s, { opacity: 1, y: 0, duration: 0.35 }, i + 0.6)
      .to(".nums-track", { yPercent: -((i + 1) * 100) / 3, duration: 0.5 }, i + 0.45);
  });
  return () => gsap.set([steps, ".nums-track", "#howBar"], { clearProps: "all" });
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

addEventListener("langchange", () => ScrollTrigger.refresh());
addEventListener("load", () => ScrollTrigger.refresh());

/* ═══ La "camara" provisional: luces suaves desenfocadas + grano ═══
   Se dibuja a media resolucion y solo mientras la escena esta en pantalla. */
function paintFeed(cv) {
  const ctx = cv.getContext("2d");
  const blobs = [
    { c: [190, 182, 240], r: 0.6, x: 0.3, y: 0.45, sx: 0.13, sy: 0.17, ph: 0 },
    { c: [250, 205, 210], r: 0.42, x: 0.65, y: 0.35, sx: 0.21, sy: 0.11, ph: 1.7 },
    { c: [180, 215, 245], r: 0.46, x: 0.5, y: 0.72, sx: 0.09, sy: 0.23, ph: 3.1 },
    { c: [250, 225, 190], r: 0.3, x: 0.2, y: 0.25, sx: 0.27, sy: 0.19, ph: 4.4 },
  ];
  const noise = document.createElement("canvas");
  noise.width = noise.height = 128;
  const nctx = noise.getContext("2d"), img = nctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 9; }
  nctx.putImageData(img, 0, 0);
  let w = 0, h = 0, on = false, raf = 0;
  const size = () => { w = cv.width = Math.max(2, Math.round(cv.offsetWidth / 2)); h = cv.height = Math.max(2, Math.round(cv.offsetHeight / 2)); };
  const draw = (ms) => {
    const t = ms / 1000;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#eeedf4";
    ctx.fillRect(0, 0, w, h);
    for (const b of blobs) {
      const x = (b.x + Math.sin(t * b.sx + b.ph) * 0.18) * w;
      const y = (b.y + Math.cos(t * b.sy + b.ph) * 0.16) * h;
      const r = b.r * Math.max(w, h) * (0.9 + 0.1 * Math.sin(t * 0.7 + b.ph));
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${b.c},0.85)`);
      g.addColorStop(1, `rgba(${b.c},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    // Barrido de luz, como un flash en pantalla
    const sweep = ((t * 0.18) % 1.6) - 0.3;
    const lg = ctx.createLinearGradient(sweep * w - w * 0.2, 0, sweep * w + w * 0.2, h);
    lg.addColorStop(0, "rgba(255,255,255,0)");
    lg.addColorStop(0.5, "rgba(255,255,255,0.35)");
    lg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = ctx.createPattern(noise, "repeat");
    ctx.save();
    ctx.translate((Math.random() * 128) | 0, (Math.random() * 128) | 0);
    ctx.fillRect(-128, -128, w + 128, h + 128);
    ctx.restore();
    if (on) raf = requestAnimationFrame(draw);
  };
  size();
  addEventListener("resize", size);
  if (reduced) { draw(0); return; }
  new IntersectionObserver(([e]) => {
    on = e.isIntersecting;
    cancelAnimationFrame(raf);
    if (on) raf = requestAnimationFrame(draw);
  }).observe(cv);
}
