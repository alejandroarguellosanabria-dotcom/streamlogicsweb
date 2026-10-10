/* Defensas de los formularios (la web no tiene servidor ni cuentas de usuario).
   - Trampa invisible: un campo que solo rellenan los robots.
   - Tiempo minimo: nadie rellena un formulario de verdad en menos de 3 s.
   - Freno a envios repetidos y rapidos: como un bloqueo tras muchos intentos de inicio de sesion.
   - Limpieza: quita caracteres de control y desactiva formulas (=, +, -, @) al llegar a la hoja de calculo. */
const T0 = performance.now();
const KEY = "sl-sends";

export function isBot(form) {
  const trap = form.querySelector('input[name="website"]');
  return Boolean(trap && trap.value) || performance.now() - T0 < 3000;
}

// Devuelve los segundos que hay que esperar, o 0 si se puede enviar
export function waitFor() {
  let log = [];
  try { log = JSON.parse(localStorage.getItem(KEY) || "[]").filter((t) => Date.now() - t < 3600e3); } catch {}
  const recent = log.filter((t) => Date.now() - t < 600e3);
  if (log.length && Date.now() - log[log.length - 1] < 30e3) return Math.ceil((30e3 - (Date.now() - log[log.length - 1])) / 1000);
  if (recent.length >= 3) return Math.ceil((600e3 - (Date.now() - recent[0])) / 1000);
  if (log.length >= 6) return Math.ceil((3600e3 - (Date.now() - log[0])) / 1000);
  return 0;
}

export function noteSend() {
  try {
    const log = JSON.parse(localStorage.getItem(KEY) || "[]").filter((t) => Date.now() - t < 3600e3);
    log.push(Date.now());
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {}
}

export function clean(v, max = 2000) {
  let s = String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}
