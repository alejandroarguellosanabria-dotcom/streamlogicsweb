/* streamlogics · Muestras: formulario + correo automático (Google Apps Script)
   ------------------------------------------------------------------
   Instalación (una vez):
     1. Abrir https://script.new con la cuenta que enviará los correos.
     2. Borrar lo que haya, pegar este archivo y guardar.
     3. Elegir la función "configurar" y pulsar Ejecutar (acepta los permisos).
   "configurar" crea el Formulario "Muestras", su hoja de respuestas con las pestañas
   "Muestras" y "Mensaje", y deja todo automático. En el registro de ejecución
   aparece un texto para pasárselo a Claude (conecta el formulario a la web).

   Cuando alguien pide muestras en la web, le llega un correo en su idioma con todas
   las muestras activas de la pestaña "Muestras". Si aún no hay muestras, la solicitud
   queda "Pendiente" y se envía sola (se revisa cada hora) en cuanto cargues alguna.

   Las muestras de la web (MUESTRAS_WEB) y el texto del correo (TEXTOS) viven aquí, y Claude los
   actualiza solo. En la pestaña "Muestras" de la hoja puedes sumar clips extra (Activa = sí).
   Los correos de LIBRES pueden pedir muestras las veces que quieran (para probar).
   Para ver cómo queda: elegir la función "probar" y Ejecutar (te lo manda a ti). */

const WEB = "https://streamlogicsweb.com";
const REMITENTE = "streamlogics";
const IDIOMAS = ["es", "en", "pt", "fr"];
const TOPE_POR_TANDA = 80; // Gmail limita los envíos diarios (100 en cuentas gratis, 1500 en Workspace)
const COL_ESTADO = "Estado muestras";

const LIBRES = ["alejandroarguellosanabria@gmail.com"];

// Clips de muestra: van ADJUNTOS en el correo (versión liviana en /media/muestras/correo/, ~9 MB entre los 3).
// "idioma" = idioma del clip: va primero para quien habla ese idioma.
const ADJUNTOS = WEB + "/media/muestras/correo/";
const MUESTRAS_WEB = [
  { idioma: "es", archivo: "rubius-fortnite.mp4", titulo: {
    es: "Rubius, en español: una partida de Fortnite con guiño a Los Simpson",
    en: "Rubius, in Spanish: a Fortnite match with a nod to The Simpsons",
    pt: "Rubius, em espanhol: uma partida de Fortnite com referência aos Simpsons",
    fr: "Rubius, en espagnol : une partie de Fortnite avec un clin d'œil aux Simpson" } },
  { idioma: "fr", archivo: "anyme-mario-party.mp4", titulo: {
    es: "anyme023, en francés: la historia del castigo en Mario Party",
    en: "anyme023, in French: the Mario Party forfeit story",
    pt: "anyme023, em francês: a história do castigo no Mario Party",
    fr: "anyme023, en français : l'histoire du gage de Mario Party" } },
  { idioma: "en", archivo: "stableronaldo.mp4", titulo: {
    es: "stableronaldo, en inglés: su reacción a un iPhone diminuto",
    en: "stableronaldo, in English: his reaction to a tiny iPhone",
    pt: "stableronaldo, em inglês: a reação dele a um iPhone minúsculo",
    fr: "stableronaldo, en anglais : sa réaction face à un iPhone minuscule" } },
];

const TEXTOS = {
  es: ["Aquí tienes tus muestras de streamlogics", "¡Hola!", "Gracias por pedir muestras en streamlogicsweb.com. Te adjunto en este correo clips reales que editamos nosotros. Cada uno lo edita una persona de verdad, a mano: subtítulos revisados palabra por palabra, el mejor momento del directo y el encuadre pensado para TikTok, Shorts y Reels.", "Si te gusta cómo quedan, elige tu paquete aquí. Solo nos mandas el enlace de tu directo y nosotros nos encargamos del resto:", "Ver paquetes", "", "Un saludo,\nEllie · Asistente virtual de streamlogics"],
  en: ["Here are your streamlogics samples", "Hi!", "Thanks for asking for samples on streamlogicsweb.com. Attached to this email are real clips we edited. Every one is edited by hand by a real person: subtitles checked word by word, the best moment of the stream, and framing made for TikTok, Shorts and Reels.", "If you like how they turned out, pick your package here. Just send us your stream link and we take care of the rest:", "See packages", "", "Best,\nEllie · streamlogics virtual assistant"],
  pt: ["Aqui estão suas amostras da streamlogics", "Olá!", "Obrigado por pedir amostras em streamlogicsweb.com. Em anexo neste e-mail estão clipes reais que editamos. Cada um é editado à mão por uma pessoa de verdade: legendas revisadas palavra por palavra, o melhor momento da live e o enquadramento pensado para TikTok, Shorts e Reels.", "Se gostar do resultado, escolha seu pacote aqui. É só mandar o link da sua live e nós cuidamos do resto:", "Ver pacotes", "", "Abraço,\nEllie · Assistente virtual da streamlogics"],
  fr: ["Voici tes échantillons streamlogics", "Salut !", "Merci d'avoir demandé des échantillons sur streamlogicsweb.com. Tu trouveras en pièce jointe de vrais clips que nous avons montés. Chacun est monté à la main par une vraie personne : sous-titres vérifiés mot par mot, le meilleur moment du live et un cadrage pensé pour TikTok, Shorts et Reels.", "Si le résultat te plaît, choisis ton offre ici. Tu nous envoies juste le lien de ton live et on s'occupe du reste :", "Voir les offres", "", "À bientôt,\nEllie · Assistante virtuelle de streamlogics"],
};
const CAMPOS = ["Idioma", "Asunto", "Saludo", "Texto antes de las muestras", "Texto antes del botón", "Botón", "Texto final", "Firma"];

/* ═══ Primera vez ═══ */
function configurar() {
  const props = PropertiesService.getScriptProperties();
  let form;
  if (props.getProperty("FORM_ID")) form = FormApp.openById(props.getProperty("FORM_ID"));
  else {
    form = FormApp.create("Muestras");
    form.setDescription("Solicitudes de muestras de streamlogicsweb.com");
    form.addTextItem().setTitle("Correo electronico").setRequired(true);
    form.addTextItem().setTitle("Como nos conociste").setRequired(true);
    const hoja = SpreadsheetApp.create("Muestras (respuestas)");
    form.setDestination(FormApp.DestinationType.SPREADSHEET, hoja.getId());
    props.setProperty("FORM_ID", form.getId());
    props.setProperty("SHEET_ID", hoja.getId());
    SpreadsheetApp.flush();
  }
  const ss = ss_();
  if (!ss.getSheetByName("Muestras")) {
    const m = ss.insertSheet("Muestras");
    m.appendRow(["Título", "Enlace", "Activa (sí/no)"]);
    m.appendRow(["Ejemplo: Clutch 1v4 en Valorant", "https://drive.google.com/…", "no"]);
    m.setFrozenRows(1);
    m.getRange("A1:C1").setFontWeight("bold");
    m.setColumnWidths(1, 2, 320);
  }
  if (!ss.getSheetByName("Mensaje")) {
    const t = ss.insertSheet("Mensaje");
    t.appendRow(CAMPOS);
    IDIOMAS.forEach((l) => t.appendRow([l, ...TEXTOS[l]]));
    t.setFrozenRows(1);
    t.getRange(1, 1, 1, CAMPOS.length).setFontWeight("bold");
    t.getRange(2, 2, IDIOMAS.length, CAMPOS.length - 1).setWrap(true);
  }
  // Disparadores: al recibir una respuesta, y cada hora para los pendientes
  ScriptApp.getProjectTriggers().forEach((g) => ScriptApp.deleteTrigger(g));
  ScriptApp.newTrigger("alRecibir").forSpreadsheet(ss).onFormSubmit().create();
  ScriptApp.newTrigger("enviarPendientes").timeBased().everyHours(1).create();
  hojaRespuestas_();
  // Lo que necesita la web: dirección de envío y los "entry." de cada pregunta
  const [pc, po] = form.getItems();
  const pre = form.createResponse()
    .withItemResponse(pc.asTextItem().createResponse("CORREO"))
    .withItemResponse(po.asTextItem().createResponse("ORIGEN")).toPrefilledUrl();
  const entry = (v) => (pre.match(new RegExp("(entry\\.\\d+)=" + v)) || [])[1];
  console.log("LISTO. Copia y pásale a Claude estas 3 líneas:\n" +
    `formAction: ${form.getPublishedUrl().replace(/\/viewform.*$/, "/formResponse")}\n` +
    `correo: ${entry("CORREO")}\norigen: ${entry("ORIGEN")}`);
  console.log("Hoja (aquí cargas las muestras): " + ss.getUrl());
}

function ss_() {
  return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty("SHEET_ID"));
}

/* ═══ Cada solicitud nueva ═══ */
function alRecibir(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { procesarFila_(e.range.getSheet(), e.range.getRow()); } finally { lock.releaseLock(); }
}

function enviarPendientes() {
  if (!muestras_("es").length) return console.log("Aún no hay muestras activas: no se envía nada.");
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { enviarPendientes_(); } finally { lock.releaseLock(); }
}

function enviarPendientes_() {
  const h = hojaRespuestas_();
  const est = columna_(h, COL_ESTADO);
  let n = 0;
  for (let f = 2; f <= h.getLastRow() && n < TOPE_POR_TANDA; f++) {
    const v = String(h.getRange(f, est).getValue());
    if (v === "" || v.startsWith("Pendiente")) { if (procesarFila_(h, f) === "enviado") n++; }
  }
  console.log(n ? `Enviados: ${n}` : "Nada para enviar (o la pestaña Muestras no tiene filas activas).");
}

function probar() {
  const yo = Session.getActiveUser().getEmail();
  const ok = mandar_(yo, "es");
  console.log(ok ? `Correo de prueba enviado a ${yo}.` : "La pestaña Muestras no tiene ninguna fila activa todavía.");
}

/* ═══ Lógica ═══ */
// Devuelve "enviado", "pendiente" u otro estado; lo deja escrito en la fila
function procesarFila_(h, f) {
  const est = columna_(h, COL_ESTADO);
  const correo = String(h.getRange(f, columna_(h, "Correo")).getValue()).trim();
  const origen = String(h.getRange(f, columna_(h, "conociste")).getValue());
  const marcar = (s) => { h.getRange(f, est).setValue(s); return s.split(" ")[0].toLowerCase(); };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(correo)) return marcar("Correo no válido");
  if (!LIBRES.includes(correo.toLowerCase()) && yaEnviado_(h, correo, f)) return marcar("Duplicado (ya se le enviaron)");
  const lang = (origen.match(/\[(es|en|pt|fr)\]\s*$/) || [, "en"])[1];
  if (!mandar_(correo, lang)) return marcar("Pendiente (aún no hay muestras)");
  return marcar("Enviado " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm"));
}

function mandar_(correo, lang) {
  const muestras = muestras_(lang);
  if (!muestras.length) return false;
  const t = mensaje_(lang);
  const web = `${WEB}/?lang=${lang}&ref=muestras#pricing`;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const p = (s) => `<p style="margin:0 0 16px">${esc(s).replace(/\n/g, "<br>")}</p>`;
  // Los clips de la web van adjuntos; los extra de la hoja (enlaces) van como botón
  const adjuntos = [];
  muestras.forEach((m) => {
    if (!m.archivo) return;
    try {
      const r = UrlFetchApp.fetch(ADJUNTOS + m.archivo, { muteHttpExceptions: true });
      if (r.getResponseCode() === 200) { adjuntos.push(r.getBlob().setName(m.archivo)); m.adjunto = true; return; }
    } catch (e) { console.log("No se pudo adjuntar " + m.archivo + ": " + e); }
    m.enlace = WEB + "/media/muestras/" + m.archivo; // si falla, al menos el enlace
  });
  const lista = muestras.map((m, i) => {
    const t = esc(m.titulo || "Clip " + (i + 1));
    return m.adjunto
      ? `<tr><td style="padding:6px 0"><div style="padding:14px 18px;border-radius:14px;background:#eef3ef;color:#2f5547;font-weight:600">📎 ${t}</div></td></tr>`
      : `<tr><td style="padding:6px 0"><a href="${esc(m.enlace)}" style="display:block;padding:14px 18px;border-radius:14px;background:#eef3ef;color:#2f5547;text-decoration:none;font-weight:600">▶ ${t}</a></td></tr>`;
  }).join("");
  const html = `<div style="font-family:Inter,Arial,sans-serif;font-size:16px;line-height:1.5;color:#1d2b25;max-width:560px">
    ${p(t.saludo)}${p(t.antes)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px">${lista}</table>
    ${p(t.boton_txt)}
    <p style="margin:0 0 24px"><a href="${esc(web)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#2f5547;color:#fff;text-decoration:none;font-weight:600">${esc(t.boton)}</a></p>
    ${t.final ? p(t.final) : ""}${p(t.firma)}</div>`;
  const texto = [t.saludo, "", t.antes, "", ...muestras.map((m, i) => `- ${m.titulo || "Clip " + (i + 1)}` + (m.adjunto ? ` (${m.archivo})` : `\n  ${m.enlace}`)), "", t.boton_txt, web, ...(t.final ? ["", t.final] : []), "", t.firma].join("\n");
  GmailApp.sendEmail(correo, t.asunto, texto, { htmlBody: html, name: REMITENTE, attachments: adjuntos });
  return true;
}

function muestras_(lang) {
  const web = MUESTRAS_WEB.slice().sort((a, b) => (b.idioma === lang) - (a.idioma === lang))
    .map((m) => ({ titulo: m.titulo[lang] || m.titulo.en, archivo: m.archivo }));
  const m = ss_().getSheetByName("Muestras");
  const hoja = !m || m.getLastRow() < 2 ? [] : m.getRange(2, 1, m.getLastRow() - 1, 3).getValues()
    .filter((r) => /^https?:\/\//i.test(String(r[1]).trim()) && /^s[ií]/i.test(String(r[2]).trim()))
    .map((r) => ({ titulo: String(r[0]).trim(), enlace: String(r[1]).trim() }));
  return web.concat(hoja.filter((x) => !web.some((w) => x.enlace.endsWith("/" + w.archivo))));
}

function mensaje_(lang) {
  const [asunto, saludo, antes, boton_txt, boton, final, firma] = TEXTOS[lang] || TEXTOS.en;
  return { asunto, saludo, antes, boton_txt, boton, final, firma };
}

function yaEnviado_(h, correo, filaActual) {
  const cc = columna_(h, "Correo"), est = columna_(h, COL_ESTADO);
  const datos = h.getRange(2, 1, Math.max(h.getLastRow() - 1, 1), h.getLastColumn()).getValues();
  return datos.some((r, i) => i + 2 !== filaActual && String(r[cc - 1]).trim().toLowerCase() === correo.toLowerCase() && String(r[est - 1]).startsWith("Enviado"));
}

function hojaRespuestas_() {
  const ss = ss_();
  const h = ss.getSheets().find((s) => /respuestas|responses/i.test(s.getName())) || ss.getSheets()[0];
  columna_(h, COL_ESTADO);
  return h;
}

// Busca una columna por parte de su título; la de estado se crea si no existe
function columna_(h, nombre) {
  const tit = h.getRange(1, 1, 1, Math.max(h.getLastColumn(), 1)).getValues()[0].map(String);
  const i = tit.findIndex((x) => x.toLowerCase().includes(nombre.toLowerCase()));
  if (i >= 0) return i + 1;
  if (nombre !== COL_ESTADO) throw new Error(`No encuentro la columna "${nombre}" en ${h.getName()}`);
  h.getRange(1, tit.length + 1).setValue(COL_ESTADO).setFontWeight("bold");
  return tit.length + 1;
}
