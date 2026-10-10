/* streamlogics · Correo automático de muestras (Google Apps Script)
   ------------------------------------------------------------------
   Va pegado en la hoja de respuestas del Formulario de Google "Muestras"
   (Extensiones > Apps Script). Cuando alguien pide muestras en la web:
     1. el formulario guarda su correo y cómo nos conoció (con el idioma, ej. "Google [es]");
     2. este script le manda un correo en su idioma con todas las muestras de la hoja "Muestras".
   Mientras la hoja "Muestras" esté vacía no se manda nada: las solicitudes quedan
   "Pendiente" y se envían todas juntas con el menú streamlogics > Enviar a los pendientes.

   Todo lo que hay que tocar está en las hojas, no aquí:
     - "Muestras": una fila por clip (Título, Enlace, Activa = sí/no).
     - "Mensaje":  el texto del correo en cada idioma.
   Primera vez: elegir la función "configurar" y pulsar Ejecutar (pide permisos una sola vez). */

const WEB = "https://streamlogicsweb.com";
const REMITENTE = "streamlogics";
const IDIOMAS = ["es", "en", "pt", "fr"];
const TOPE_POR_TANDA = 80; // Gmail limita los envíos diarios (100 en cuentas gratis, 1500 en Workspace)
const COL_ESTADO = "Estado muestras";

const TEXTOS = {
  es: ["Tus muestras de streamlogics", "¡Hola!", "Gracias por pedir muestras. Aquí tienes clips que editamos nosotros; cada uno lo edita una persona de verdad, no un programa:", "Si te gusta lo que ves, elige tu paquete aquí:", "Ver paquetes", "Y si tienes cualquier duda, responde a este correo y te contesta una persona.", "Saludos,\nAlejandro, de streamlogics"],
  en: ["Your streamlogics samples", "Hi!", "Thanks for asking for samples. Here are some clips we edited; every one is edited by a real person, not a program:", "If you like what you see, pick your package here:", "See packages", "Any questions? Just reply to this email and a real person will answer.", "Best,\nAlejandro, from streamlogics"],
  pt: ["Suas amostras da streamlogics", "Olá!", "Obrigado por pedir amostras. Aqui estão clipes que editamos; cada um é editado por uma pessoa de verdade, não por um programa:", "Se gostar do que viu, escolha seu pacote aqui:", "Ver pacotes", "Qualquer dúvida, é só responder este e-mail que uma pessoa te responde.", "Abraço,\nAlejandro, da streamlogics"],
  fr: ["Tes échantillons streamlogics", "Salut !", "Merci d'avoir demandé des échantillons. Voici des clips que nous avons montés ; chacun est monté par une vraie personne, pas par un programme :", "Si ça te plaît, choisis ton offre ici :", "Voir les offres", "Une question ? Réponds simplement à cet e-mail, une vraie personne te répondra.", "À bientôt,\nAlejandro, de streamlogics"],
};
const CAMPOS = ["Idioma", "Asunto", "Saludo", "Texto antes de las muestras", "Texto antes del botón", "Botón", "Texto final", "Firma"];

/* ═══ Primera vez ═══ */
function configurar() {
  const ss = SpreadsheetApp.getActive();
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
  // Un solo disparador "al enviar el formulario"
  ScriptApp.getProjectTriggers().filter((g) => g.getHandlerFunction() === "alRecibir").forEach((g) => ScriptApp.deleteTrigger(g));
  ScriptApp.newTrigger("alRecibir").forSpreadsheet(ss).onFormSubmit().create();
  hojaRespuestas_();
  SpreadsheetApp.getUi().alert("Listo. Desde ahora cada solicitud de muestras recibe su correo automáticamente.");
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu("streamlogics")
    .addItem("Enviar a los pendientes", "enviarPendientes")
    .addItem("Probar: mandarme el correo a mí", "probar")
    .addToUi();
}

/* ═══ Cada solicitud nueva ═══ */
function alRecibir(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { procesarFila_(e.range.getSheet(), e.range.getRow()); } finally { lock.releaseLock(); }
}

function enviarPendientes() {
  const h = hojaRespuestas_();
  const est = columna_(h, COL_ESTADO);
  let n = 0;
  for (let f = 2; f <= h.getLastRow() && n < TOPE_POR_TANDA; f++) {
    const v = String(h.getRange(f, est).getValue());
    if (v === "" || v.startsWith("Pendiente")) { if (procesarFila_(h, f) === "enviado") n++; }
  }
  SpreadsheetApp.getUi().alert(n ? `Enviados: ${n}` : "No había nada pendiente para enviar (o la hoja Muestras está vacía).");
}

function probar() {
  const yo = Session.getActiveUser().getEmail();
  const ok = mandar_(yo, "es");
  SpreadsheetApp.getUi().alert(ok ? `Correo de prueba enviado a ${yo}.` : "La hoja Muestras no tiene ninguna fila activa todavía.");
}

/* ═══ Lógica ═══ */
// Devuelve "enviado", "pendiente" u otro estado; lo deja escrito en la fila
function procesarFila_(h, f) {
  const est = columna_(h, COL_ESTADO);
  const correo = String(h.getRange(f, columna_(h, "Correo")).getValue()).trim();
  const origen = String(h.getRange(f, columna_(h, "conociste")).getValue());
  const marcar = (s) => { h.getRange(f, est).setValue(s); return s.split(" ")[0].toLowerCase(); };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(correo)) return marcar("Correo no válido");
  if (yaEnviado_(h, correo, f)) return marcar("Duplicado (ya se le enviaron)");
  const lang = (origen.match(/\[(es|en|pt|fr)\]\s*$/) || [, "en"])[1];
  if (!mandar_(correo, lang)) return marcar("Pendiente (aún no hay muestras)");
  return marcar("Enviado " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm"));
}

function mandar_(correo, lang) {
  const muestras = muestras_();
  if (!muestras.length) return false;
  const t = mensaje_(lang);
  const web = `${WEB}/?lang=${lang}&ref=muestras#pricing`;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const p = (s) => `<p style="margin:0 0 16px">${esc(s).replace(/\n/g, "<br>")}</p>`;
  const lista = muestras.map((m, i) =>
    `<tr><td style="padding:6px 0"><a href="${esc(m.enlace)}" style="display:block;padding:14px 18px;border-radius:14px;background:#eef3ef;color:#2f5547;text-decoration:none;font-weight:600">▶ ${esc(m.titulo || "Clip " + (i + 1))}</a></td></tr>`).join("");
  const html = `<div style="font-family:Inter,Arial,sans-serif;font-size:16px;line-height:1.5;color:#1d2b25;max-width:560px">
    ${p(t.saludo)}${p(t.antes)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px">${lista}</table>
    ${p(t.boton_txt)}
    <p style="margin:0 0 24px"><a href="${esc(web)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#2f5547;color:#fff;text-decoration:none;font-weight:600">${esc(t.boton)}</a></p>
    ${p(t.final)}${p(t.firma)}</div>`;
  const texto = [t.saludo, "", t.antes, "", ...muestras.map((m, i) => `- ${m.titulo || "Clip " + (i + 1)}: ${m.enlace}`), "", t.boton_txt, web, "", t.final, "", t.firma].join("\n");
  GmailApp.sendEmail(correo, t.asunto, texto, { htmlBody: html, name: REMITENTE });
  return true;
}

function muestras_() {
  const m = SpreadsheetApp.getActive().getSheetByName("Muestras");
  if (!m || m.getLastRow() < 2) return [];
  return m.getRange(2, 1, m.getLastRow() - 1, 3).getValues()
    .filter((r) => /^https?:\/\//i.test(String(r[1]).trim()) && /^s[ií]/i.test(String(r[2]).trim()))
    .map((r) => ({ titulo: String(r[0]).trim(), enlace: String(r[1]).trim() }));
}

function mensaje_(lang) {
  const t = SpreadsheetApp.getActive().getSheetByName("Mensaje");
  const filas = t ? t.getDataRange().getValues().slice(1) : [];
  const fila = filas.find((r) => String(r[0]).trim() === lang) || [lang, ...TEXTOS[lang] || TEXTOS.en];
  const [, asunto, saludo, antes, boton_txt, boton, final, firma] = fila;
  return { asunto, saludo, antes, boton_txt, boton, final, firma };
}

function yaEnviado_(h, correo, filaActual) {
  const cc = columna_(h, "Correo"), est = columna_(h, COL_ESTADO);
  const datos = h.getRange(2, 1, Math.max(h.getLastRow() - 1, 1), h.getLastColumn()).getValues();
  return datos.some((r, i) => i + 2 !== filaActual && String(r[cc - 1]).trim().toLowerCase() === correo.toLowerCase() && String(r[est - 1]).startsWith("Enviado"));
}

function hojaRespuestas_() {
  const ss = SpreadsheetApp.getActive();
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
