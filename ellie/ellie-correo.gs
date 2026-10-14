/* streamlogics · Ellie por correo (Google Apps Script)
   ------------------------------------------------------------------
   Ellie lee los correos que te llegan y deja una respuesta en BORRADOR dentro
   del mismo hilo. Tú la revisas, la ajustas si hace falta y pulsas Enviar.
   No envía nada sola (ENVIO_AUTOMATICO = false).

   Instalación (una vez, con la cuenta del buzón donde contestan los clientes):
     1. Abrir https://script.new, borrar lo que haya, pegar este archivo y guardar.
     2. Engranaje "Configuración del proyecto" > "Propiedades del script" >
        Añadir: nombre GEMINI_API_KEY, valor = tu clave gratis de https://aistudio.google.com/apikey
        (si algún día usas Claude: nombre ANTHROPIC_API_KEY con tu clave de Claude).
     3. Elegir la función "probar" y Ejecutar (acepta los permisos). En el registro
        verás la respuesta que Ellie daría al último correo, sin crear nada.
     4. Elegir la función "activar" y Ejecutar. Desde ahí revisa el buzón cada 30 min
        (@gmail.com) o 15 min (Workspace), con topes diarios: ver LIMITES.
   Para pararla: función "desactivar".

   Etiquetas que pone en Gmail:
     ellie-borrador  -> hay un borrador de Ellie esperando que lo revises.
     ellie-escalar   -> tema delicado (reembolso, pedido con problemas, legal...):
                        el borrador solo dice que lo revisa el equipo. Contesta tú.
     ellie-ejemplos  -> la persona dijo "sí" o pidió ejemplos: el borrador ya lleva los 3 clips adjuntos. */

const MODELO_GEMINI = "gemini-flash-latest";
const MODELO_GEMINI_RESPALDO = "gemini-flash-lite-latest"; // gratis con clave de Google AI Studio
const MODELO = "claude-haiku-5-5";         // se usa solo si pones ANTHROPIC_API_KEY en vez de GEMINI_API_KEY
const ENVIO_AUTOMATICO = false; // NO cambiar sin decidirlo: con true enviaría las respuestas normales sin revisión
const DIAS_ATRAS = 2;           // solo mira correos recientes
const HILOS_POR_VUELTA = 20;    // hilos que mira como máximo en cada vuelta
const MAX_BORRADORES = 5;       // si borras el borrador, Ellie lo reescribe hasta 5 veces por mensaje

/* Límites para no forzar Gmail (2026-10-13: Google bloqueó streamlogicsz@gmail.com por
   "uso inusual"). Las cuentas @gmail.com gratis van mucho más suaves que Workspace. */
const LIMITES = {
  gratis:    { cadaMin: 30, porVuelta: 3, porDia: 15, ejemplosDia: 5 },
  workspace: { cadaMin: 15, porVuelta: 5, porDia: 40, ejemplosDia: 10 },
};
const HORAS_PAUSA = [1, 3, 6, 12, 24]; // si Gmail o Gemini fallan, para y espera cada vez más
function limites_() {
  return /@gmail\.com$/i.test(Session.getEffectiveUser().getEmail()) ? LIMITES.gratis : LIMITES.workspace;
}
const WEB = "https://streamlogicsweb.com";

const PROMPT = `Eres Ellie, asistente virtual de streamlogics. Respondes correos de streamers. Hablas como una IA amable e inteligente: suave, serena y clara, que entiende exactamente qué le preguntan y lo explica bien ordenado. No finges ser humana.

TONO
- Suave, cercano y profesional, con frases calmadas y bien construidas. Nada de jerga, bromas, emojis ni exclamaciones en cadena. Tampoco frases de call center ("estimado cliente", "no dude en contactarnos").
- Trabajamos en 4 idiomas: español, inglés, portugués y francés. Escribe TODO el correo (saludo, cuerpo y firma) en el idioma de quien escribe; con otro idioma, en inglés. En español, de "tú".
- La marca se escribe "streamlogics" en minúscula. Nunca digas "pagar"; di "comprar" o "pedir".

ESTRUCTURA DEL CORREO (siempre en este orden, con una línea en blanco entre bloques)
1. Saludo con su nombre si lo sabes ("Hola, Marcos:"). Si no, "Hola:".
1b. SIEMPRE, en todos los correos, una frase de presentación justo después del saludo: "Soy Ellie, la asistente virtual de streamlogics." (traducida al idioma del correo). Nunca la omitas.
2. Respuesta directa a lo que preguntó, en 1 a 3 frases. Si pregunta varias cosas, contesta cada una en su propia línea, breve.
3. Siguiente paso concreto en una frase (por ejemplo, dónde ver o pedir el paquete), con el enlace https://streamlogicsweb.com. Un solo enlace.
4. Solo si es tu primer mensaje a esta persona (te lo indico): una frase diciendo que, si prefiere hablar con una persona del equipo, puede pedirlo respondiendo a este correo.
5. Firma, en el idioma del correo:
es: "Un saludo,
Ellie
Asistente virtual de streamlogics"
en: "Best regards,
Ellie
Virtual assistant at streamlogics"
pt: "Um abraço,
Ellie
Assistente virtual da streamlogics"
fr: "Bien à vous,
Ellie
Assistante virtuelle de streamlogics"

Largo total: 50 a 120 palabras. Texto plano: sin negritas, sin asteriscos, sin markdown.

SIN DATOS DE MÁS
- Contesta solo lo que preguntó. No enumeres todos los paquetes si no los pidió; menciona como mucho el que encaja con su pregunta.
- No repitas lo que la persona ya sabe ni resumas su correo.
- Si no sabes algo con certeza, no lo inventes: escala.

LO QUE PUEDES RESPONDER (solo si viene a cuento)
- Qué hacemos: clips verticales con subtítulos a partir de sus streams (VOD). Cada clip lo edita una persona de verdad.
- Paquetes de pago único (Oferta limitada, Esencial, Pro, Premium y Editor dedicado) y una oferta especial: todos se ven en la web. NUNCA des precios, montos, cantidades de clips ni plazos en horas: di que los paquetes y la oferta especial están en la web.
- Cómo se compra: desde la web, aceptando los términos, con Stripe.
- Cómo trabajamos (explícalo con gusto si pregunta cómo funciona o qué hacemos): el streamer elige paquete y nos pasa el enlace de su VOD; transcribimos el audio y una persona del equipo elige los mejores momentos y edita cada clip a mano (formato vertical, subtítulos, ritmo); le enviamos los clips listos por enlace de descarga dentro del plazo de su paquete.
- Que hay plazos de entrega según el paquete (detalle en la web), idiomas de la web (es, en, pt, fr), que los archivos se borran en 4 días.

SI DICE "SÍ", PIDE EJEMPLOS O QUIERE VER NUESTRO TRABAJO
Empieza el borrador con [EJEMPLOS] en una línea aparte: así el sistema adjunta al correo tres clips reales editados por nosotros. Di en una frase que le adjuntas unos clips que hicimos hace poco para que vea el resultado. NO pongas enlaces a clips ni a archivos; el único enlace es el de la web. Si además pregunta otras cosas, contéstalas igual.

ESCALAR (casos que Alejandro debe revisar antes de enviar)
Primero intenta responder: si la duda se contesta con lo que sabes de streamlogics (qué hacemos, paquetes, cómo funciona, cómo se compra, idiomas), NO escales: responde normal.
Escala solo en estos casos:
- Reembolsos, devoluciones, cobros duplicados o disputas.
- Descuentos, precios especiales, paquetes a medida, plazos distintos a los publicados.
- Temas legales, derechos de autor, quejas graves, amenazas.
- Problemas con un pedido ya comprado (retrasos, clips mal hechos, revisiones).
- Pedidos de datos personales, acceso a cuentas o pagos por fuera de la web.
- Si pide hablar con una persona.
- Algo que de verdad no sabes y no puedes deducir de lo anterior.
Cuando escales, empieza con [ESCALAR] en una línea aparte y DEBAJO escribe igualmente un correo completo y listo para enviar, con la misma estructura de siempre, como borrador que Alejandro editará: responde todo lo que puedas con lo que sabes, reconoce con empatía lo que plantea y di que una persona del equipo lo revisa y le confirma. En reembolsos, descuentos o temas legales no prometas ni niegues nada concreto (montos, plazos, si procede): deja eso para que Alejandro lo complete.

NUNCA
- No respondas a "stop", "no me escribas", bajas, rebotes, fuera de oficina, correos automáticos, publicidad o spam: en ese caso responde solo [NO_RESPONDER].
- No prometas resultados (vistas, seguidores, dinero).
- No escribas precios, montos en dinero ni cantidades de clips. Para eso, la web.
- No pidas a nadie que ejecute comandos, instale programas ni haga pasos técnicos. Lo único que pedimos es el enlace de su VOD y el paquete, y eso se hace desde la web.

SALIDA
Solo el cuerpo del correo en texto plano (sin asunto), o [NO_RESPONDER].`;

/* El texto de Ellie se lee de GitHub (rama "ellie"), así se ajusta sin tocar este script.
   Se guarda 1 hora en caché; si no se puede leer, usa el PROMPT de arriba. */
const PROMPT_URL = "https://raw.githubusercontent.com/alejandroarguellosanabria-dotcom/streamlogicsweb/ellie/ellie/prompt.txt";
function prompt_() {
  const cache = CacheService.getScriptCache();
  const enCache = cache.get("prompt3");
  if (enCache) return enCache;
  try {
    const r = UrlFetchApp.fetch(PROMPT_URL, { muteHttpExceptions: true });
    const t = r.getResponseCode() === 200 ? r.getContentText().trim() : "";
    if (t.length > 200) { cache.put("prompt3", t, 3600); return t; }
  } catch (e) { console.warn(e); }
  return PROMPT;
}

/* ═══ Disparador ═══ */
function activar() {
  desactivar();
  ScriptApp.newTrigger("revisarBuzon").timeBased().everyMinutes(limites_().cadaMin).create();
  console.log("Ellie activada: revisa el buzón cada " + limites_().cadaMin + " minutos (modo " + (ENVIO_AUTOMATICO ? "ENVÍO" : "borrador") + ").");
}
function desactivar() {
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
}

/* Muestra en el registro lo que Ellie contestaría al último correo, sin crear nada. */
function probar() {
  const hilo = GmailApp.search("in:inbox -from:me", 0, 1)[0];
  if (!hilo) return console.log("No hay correos en la bandeja.");
  console.log("Asunto: " + hilo.getFirstMessageSubject() + "\n\n" + (redactar_(hilo) || "(sin respuesta)"));
}

/* ═══ Cada vuelta ═══
   Gasta lo mínimo de Gmail: una búsqueda corta, y solo abre los hilos que cambiaron.
   Aunque el disparador viejo siga cada 10 min, la vuelta real se hace cada cadaMin. */
function revisarBuzon() {
  const props = PropertiesService.getScriptProperties();
  const ahora = Date.now();
  const lim = limites_();
  if (ahora < Number(props.getProperty("PAUSA_HASTA") || 0)) return;
  if (ahora - Number(props.getProperty("ULTIMA_VUELTA") || 0) < (lim.cadaMin - 1) * 60000) return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  props.setProperty("ULTIMA_VUELTA", String(ahora));
  const hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const [dia, b, e] = String(props.getProperty("CUENTA_DIA") || "").split("#");
  const cuenta = dia === hoy ? { b: Number(b) || 0, e: Number(e) || 0 } : { b: 0, e: 0 };
  const hechos = leerHechos_();
  try {
    if (cuenta.b >= lim.porDia) return;
    const hilos = GmailApp.search(`in:inbox newer_than:${DIAS_ATRAS}d -category:promotions -category:social -category:forums`, 0, HILOS_POR_VUELTA);
    let conBorrador = null; // se busca solo si hace falta
    const tieneBorrador = (id) => {
      if (!conBorrador) conBorrador = new Set(GmailApp.search(`in:drafts newer_than:${DIAS_ATRAS + 1}d`, 0, 50).map((h) => h.getId()));
      return conBorrador.has(id);
    };
    let n = 0, fallo = false;
    for (const hilo of hilos) {
      if (n >= lim.porVuelta || cuenta.b >= lim.porDia) break;
      const id = hilo.getId();
      const fecha = String(hilo.getLastMessageDate().getTime());
      // hechos[id] = "fecha#idDelUltimoMensaje#borradoresHechos" (formato viejo: "id#n")
      const partes = String(hechos[id] || "").split("#");
      const [f, visto, v] = partes.length === 3 ? partes : ["", partes[0], partes[1]];
      let veces = Number(v) || 0;
      const terminado = visto && (veces === 0 || veces >= MAX_BORRADORES);
      if (f === fecha && terminado) continue;                       // nada nuevo: ni lo abre
      if (visto && veces > 0 && veces < MAX_BORRADORES && tieneBorrador(id)) continue; // su borrador sigue ahí
      const msgs = hilo.getMessages().filter((m) => !m.isDraft());
      const ultimo = msgs[msgs.length - 1];
      if (!ultimo) continue;
      if (visto === ultimo.getId()) {
        if (partes.length === 1) veces = 1;      // registro muy viejo: un reintento
        if (veces === 0 || veces >= MAX_BORRADORES || tieneBorrador(id)) { hechos[id] = fecha + "#" + visto + "#" + veces; continue; }
      } else veces = 0;
      hechos[id] = fecha + "#" + ultimo.getId() + "#0";
      if (esMio_(ultimo) || esAutomatico_(ultimo) || tieneBorrador(id)) continue;
      n++;
      let texto;
      try { texto = redactar_(hilo, msgs); } catch (err) { console.warn(err); delete hechos[id]; pausar_(props, "Gemini: " + err); fallo = true; break; }
      if (!texto) { hechos[id] = fecha + "#" + ultimo.getId() + "#" + MAX_BORRADORES; continue; } // [NO_RESPONDER]: no insistir
      const conClips = texto.includes("[EJEMPLOS]") && cuenta.e < lim.ejemplosDia;
      aplicar_(hilo, ultimo, texto, conClips);
      hechos[id] = fecha + "#" + ultimo.getId() + "#" + (veces + 1);
      cuenta.b++;
      if (conClips) cuenta.e++;
    }
    if (!fallo) props.deleteProperty("PAUSAS");
  } catch (err) {
    console.warn(err);
    pausar_(props, "Gmail: " + err); // Gmail se queja (tope, bloqueo...): no insistir
  } finally {
    props.setProperty("CUENTA_DIA", hoy + "#" + cuenta.b + "#" + cuenta.e);
    guardarHechos_(hechos);
    lock.releaseLock();
  }
}

function pausar_(props, motivo) {
  const i = Math.min(Number(props.getProperty("PAUSAS") || 0), HORAS_PAUSA.length - 1);
  props.setProperty("PAUSAS", String(i + 1));
  props.setProperty("PAUSA_HASTA", String(Date.now() + HORAS_PAUSA[i] * 3600000));
  console.warn("Ellie en pausa " + HORAS_PAUSA[i] + " h por: " + motivo);
}

function aplicar_(hilo, ultimo, texto, conClips) {
  const escalar = texto.includes("[ESCALAR]");
  const ejemplos = texto.includes("[EJEMPLOS]");
  if (escalar) hilo.addLabel(etiqueta_("ellie-escalar"));
  if (ejemplos) hilo.addLabel(etiqueta_("ellie-ejemplos"));
  if (ENVIO_AUTOMATICO && !escalar && !ejemplos) {
    ultimo.reply(texto);
  } else if (ejemplos) {
    // Pidió ejemplos: el borrador lleva adjuntos los clips de muestra y sin la marca [EJEMPLOS].
    // Pasado el tope diario de borradores con clips, sale sin adjuntos y con aviso arriba para ti.
    const cuerpo = texto.replace(/^\s*\[EJEMPLOS\]\s*\n?/m, "").trim();
    if (conClips) ultimo.createDraftReply(cuerpo, { attachments: clips_() });
    else ultimo.createDraftReply("[ADJUNTA LOS CLIPS: tope diario de adjuntos alcanzado; borra esta línea]\n\n" + cuerpo);
    hilo.addLabel(etiqueta_("ellie-borrador"));
  } else {
    ultimo.createDraftReply(texto); // [ESCALAR] queda arriba: bórralo antes de enviar
    hilo.addLabel(etiqueta_("ellie-borrador"));
  }
}

/* Clips de muestra (versión liviana, los mismos del correo de muestras) */
const CLIPS = ["rubius-fortnite.mp4", "anyme-mario-party.mp4", "stableronaldo.mp4"];
function clips_() {
  return CLIPS.map((f) => {
    const r = UrlFetchApp.fetch(WEB + "/media/muestras/correo/" + f, { muteHttpExceptions: true });
    return r.getResponseCode() === 200 ? r.getBlob().setName(f) : null;
  }).filter(Boolean);
}

/* ═══ Claude ═══ */
function redactar_(hilo, todos) {
  todos = todos || hilo.getMessages().filter((m) => !m.isDraft());
  const msgs = todos.slice(-6);
  const yaHablo = todos.some((m) => esMio_(m) && /Ellie/.test(m.getPlainBody()));
  const historia = msgs.map((m) =>
    `--- ${esMio_(m) ? "NOSOTROS" : "CLIENTE"} (${m.getFrom()}) ---\n${limpiar_(m.getPlainBody())}`).join("\n\n");
  const delCliente = todos.filter((m) => !esMio_(m));
  const idioma = idioma_(delCliente.length ? limpiar_(delCliente[delCliente.length - 1].getPlainBody()) : "");
  const lineaIdioma = idioma ? `Idioma de la respuesta: ${idioma}. Todo el correo, incluidos saludo y firma, en ${idioma}.\n` : "";
  const usuario = lineaIdioma + `Asunto: ${hilo.getFirstMessageSubject()}\n` +
    `¿Primer mensaje de Ellie a esta persona?: ${yaHablo ? "no" : "sí"}\n\n` +
    `Conversación (la última es la que hay que contestar):\n\n${historia}` +
    (lineaIdioma ? `\n\n${lineaIdioma}` : "");

  const props = PropertiesService.getScriptProperties();
  const texto = props.getProperty("GEMINI_API_KEY") ? gemini_(props.getProperty("GEMINI_API_KEY"), usuario)
    : props.getProperty("ANTHROPIC_API_KEY") ? claude_(props.getProperty("ANTHROPIC_API_KEY"), usuario)
    : (() => { throw new Error("Falta la propiedad del script GEMINI_API_KEY (o ANTHROPIC_API_KEY)."); })();
  if (!texto || texto.includes("[NO_RESPONDER]")) return null;
  return texto;
}

const ESCALAR_SEGURO = "[ESCALAR]\nLo reviso con el equipo y te escribo hoy.\n\nEllie, streamlogics";

function gemini_(clave, usuario) {
  // Reintenta si Google está saturado (503/429/500) y prueba un modelo de respaldo
  let ultimo = "";
  for (const modelo of [MODELO_GEMINI, MODELO_GEMINI_RESPALDO]) {
    for (let i = 0; i < 2; i++) {
      const r = UrlFetchApp.fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: "post",
        contentType: "application/json",
        headers: { "x-goog-api-key": clave },
        muteHttpExceptions: true,
        payload: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt_() }] },
          contents: [{ role: "user", parts: [{ text: usuario }] }],
          generationConfig: { maxOutputTokens: 4000 },
        }),
      });
      const cod = r.getResponseCode();
      if (cod === 200) {
        const c = (JSON.parse(r.getContentText()).candidates || [])[0];
        if (!c || c.finishReason === "SAFETY" || c.finishReason === "PROHIBITED_CONTENT") return ESCALAR_SEGURO;
        return ((c.content && c.content.parts) || []).map((p) => p.text || "").join("").trim();
      }
      ultimo = "Gemini " + cod + ": " + r.getContentText().slice(0, 200);
      if (![429, 500, 503].includes(cod)) throw new Error(ultimo);
      Utilities.sleep(2000 * (i + 1));
    }
  }
  throw new Error(ultimo);
}

function claude_(clave, usuario) {
  const r = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
    method: "post",
    contentType: "application/json",
    headers: { "x-api-key": clave, "anthropic-version": "2023-06-01" },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      model: MODELO,
      max_tokens: 2000,
      output_config: { effort: "low" },
      system: prompt_(),
      messages: [{ role: "user", content: usuario }],
    }),
  });
  if (r.getResponseCode() !== 200) throw new Error("API " + r.getResponseCode() + ": " + r.getContentText().slice(0, 300));
  const res = JSON.parse(r.getContentText());
  if (res.stop_reason === "refusal") return ESCALAR_SEGURO;
  return res.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}

/* ═══ Ayudas ═══ */
function limpiar_(t) {
  // Quita el texto citado de correos anteriores
  const corte = t.search(/^(On .+wrote:|El .+escribió:|Em .+escreveu:|Le .+a écrit :|-{2,} ?Original Message|De: .+)$/m);
  if (corte > 0) t = t.slice(0, corte);
  return t.split("\n").filter((l) => !l.startsWith(">")).join("\n").trim().slice(0, 4000);
}
/* Idioma del cliente por palabras frecuentes. "" si no está claro (decide el modelo). */
const PALABRAS = {
  "inglés": ["the", "and", "you", "is", "are", "to", "it", "what", "how", "my", "your", "for", "with", "this", "that", "do", "can", "i", "yes", "thanks", "hi", "hello"],
  "español": ["el", "la", "que", "de", "y", "es", "por", "para", "con", "una", "como", "mi", "tu", "sí", "gracias", "hola", "pero", "los", "las", "qué", "cómo"],
  "portugués": ["não", "você", "obrigado", "obrigada", "olá", "oi", "para", "com", "uma", "como", "meu", "seu", "sim", "é", "está", "isso", "muito", "vocês"],
  "francés": ["le", "la", "et", "est", "vous", "je", "pour", "avec", "une", "comment", "mon", "votre", "oui", "merci", "bonjour", "salut", "c'est", "pas", "les", "des"],
};
function idioma_(t) {
  const w = String(t).toLowerCase().match(/[a-zà-ÿ']+/g) || [];
  let mejor = "", max = 0, seg = 0;
  for (const [idi, lista] of Object.entries(PALABRAS)) {
    const n = w.filter((x) => lista.includes(x)).length;
    if (n > max) { seg = max; max = n; mejor = idi; } else if (n > seg) seg = n;
  }
  return max >= 2 && max > seg ? mejor : "";
}
function correo_(s) { return ((s.match(/<([^>]+)>/) || [])[1] || s).trim().toLowerCase(); }
let MIS_CORREOS = null; // una sola consulta por vuelta
function misCorreos_() {
  if (!MIS_CORREOS) MIS_CORREOS = [Session.getActiveUser().getEmail(), ...GmailApp.getAliases()].map((c) => c.toLowerCase());
  return MIS_CORREOS;
}
function esMio_(m) { return misCorreos_().includes(correo_(m.getFrom())); }
function esAutomatico_(m) {
  const de = correo_(m.getFrom());
  if (/(no-?reply|mailer-daemon|postmaster|notifications?@|bounce)/.test(de)) return true;
  const auto = (m.getHeader("Auto-Submitted") || "").toLowerCase();
  const prec = (m.getHeader("Precedence") || "").toLowerCase();
  return (auto && auto !== "no") || /bulk|list|junk/.test(prec) || !!m.getHeader("List-Unsubscribe");
}
function etiqueta_(n) { return GmailApp.getUserLabelByName(n) || GmailApp.createLabel(n); }
function leerHechos_() {
  return JSON.parse(PropertiesService.getScriptProperties().getProperty("HECHOS") || "{}");
}
function guardarHechos_(h) {
  const claves = Object.keys(h);
  claves.slice(0, Math.max(0, claves.length - 150)).forEach((k) => delete h[k]); // últimos 150 hilos (una propiedad admite ~9 KB)
  PropertiesService.getScriptProperties().setProperty("HECHOS", JSON.stringify(h));
}
