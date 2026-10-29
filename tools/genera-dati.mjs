// Genera calendario.json e raccolta.ics a partire dai dati in index.html.
// Uso: node tools/genera-dati.mjs   (dalla root del repo)
// Fonte unica dei dati: gli oggetti `calendar` e `collectionInfo` in index.html.

import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync("index.html", "utf8");

function estrai(nome) {
  const m = html.match(new RegExp(`const ${nome} = (\\{[\\s\\S]*?\\n\\});?`));
  if (!m) throw new Error(`Oggetto ${nome} non trovato in index.html`);
  return vm.runInNewContext(`(${m[1]})`);
}

const calendar = estrai("calendar");
const info = estrai("collectionInfo");

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ymd = (d) => iso(d).replaceAll("-", "");

// ── calendario.json ─────────────────────────────────────────────
const giorni = {};
for (const [k, v] of Object.entries(calendar)) {
  const [y, m, d] = k.split("-").map(Number);
  const data = new Date(y, m - 1, d);
  for (const c of v.c) if (!info[c]) throw new Error(`Codice sconosciuto ${c} il ${k}`);
  giorni[iso(data)] = { c: v.c, ...(v.asterisk ? { festivo: true } : {}) };
}
const chiavi = Object.keys(giorni).sort();
const tipi = Object.fromEntries(
  Object.entries(info).map(([k, v]) => [k, { nome: v.name, icona: v.icon, descrizione: v.desc }])
);
const json = {
  comune: "Porto Torres",
  dal: chiavi[0],
  al: chiavi.at(-1),
  nota: "Le date sono quelle della raccolta (mattina): i rifiuti si mettono fuori la sera prima.",
  tipi,
  giorni: Object.fromEntries(chiavi.map((k) => [k, giorni[k]])),
};
writeFileSync("calendario.json", JSON.stringify(json, null, 1) + "\n");

// ── raccolta.ics ────────────────────────────────────────────────
// Un evento la SERA PRIMA di ogni raccolta, 20:00-20:30, con promemoria.
// Titolo senza emoji: Alexa le leggerebbe ad alta voce.
const ORA = "200000", FINE = "203000";
const nomi = (c) => c.map((x) => info[x].name).join(", ");
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
const GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

// Spezza le righe a 75 ottetti come da RFC 5545
function fold(line) {
  const out = [];
  let buf = Buffer.from(line, "utf8");
  let first = true;
  while (buf.length > (first ? 75 : 74)) {
    let n = first ? 75 : 74;
    while ((buf[n] & 0xc0) === 0x80) n--; // non spezzare un carattere UTF-8
    out.push((first ? "" : " ") + buf.subarray(0, n).toString("utf8"));
    buf = buf.subarray(n);
    first = false;
  }
  out.push((first ? "" : " ") + buf.toString("utf8"));
  return out.join("\r\n");
}

const righe = [
  "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Porto Fuori//Raccolta Porto Torres//IT",
  "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
  "X-WR-CALNAME:Raccolta differenziata", "X-WR-TIMEZONE:Europe/Rome",
  "BEGIN:VTIMEZONE", "TZID:Europe/Rome",
  "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST",
  "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
  "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET",
  "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
  "END:VTIMEZONE",
];
let eventi = 0;
for (const k of chiavi) {
  const g = giorni[k];
  if (!g.c.length) continue;
  const [y, m, d] = k.split("-").map(Number);
  const raccolta = new Date(y, m - 1, d);
  const sera = new Date(y, m - 1, d - 1);
  const desc =
    `Raccolta di ${GIORNI[raccolta.getDay()]} ${d}/${m}: ${nomi(g.c)}.` +
    (g.festivo ? "\nGiorno con variazioni: verifica sul calendario ufficiale." : "");
  righe.push(
    "BEGIN:VEVENT",
    `UID:porto-fuori-${ymd(raccolta)}@porto-fuori.pages.dev`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Europe/Rome:${ymd(sera)}T${ORA}`,
    `DTEND;TZID=Europe/Rome:${ymd(sera)}T${FINE}`,
    `SUMMARY:${esc(`Fuori stasera: ${nomi(g.c)}`)}`,
    `DESCRIPTION:${esc(desc)}`,
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(`Fuori stasera: ${nomi(g.c)}`)}`,
    "TRIGGER:PT0M", "END:VALARM",
    "END:VEVENT"
  );
  eventi++;
}
righe.push("END:VCALENDAR");
writeFileSync("raccolta.ics", righe.map(fold).join("\r\n") + "\r\n");

console.log(`calendario.json: ${chiavi.length} giorni (${json.dal} → ${json.al})`);
console.log(`raccolta.ics: ${eventi} eventi`);
