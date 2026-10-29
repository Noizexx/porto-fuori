// Porto Fuori – widget iPhone per Scriptable
// Mostra cosa mettere fuori STASERA (= raccolta di domani mattina).
// Formati: Home piccolo/medio, schermata di blocco (rettangolare, in linea, tondo).

// ── Impostazioni ──────────────────────────────────────────────
const URL_DATI = "https://porto-fuori.pages.dev/calendario.json";
const URL_APP  = "https://porto-fuori.pages.dev/";
const NASCONDI = []; // es. ["P", "SV"] per nascondere Pannolini e Sfalci se non sei iscritto

const BREVE = { U: "Umido", CC: "Carta", V: "Vetro", PL: "Plastica", SV: "Sfalci", S: "Secco", P: "Pannolini" };
const COLORI = { U: "#52b788", CC: "#457b9d", V: "#6a994e", PL: "#e9c46a", SV: "#a7c957", S: "#6c757d", P: "#c77dff" };
const SFONDO = Color.dynamic(new Color("#f5f0e8"), new Color("#1a1a2e"));
const TESTO  = Color.dynamic(new Color("#1a1a2e"), new Color("#f5f0e8"));
const TENUE  = Color.dynamic(new Color("#7a7a8a"), new Color("#a0a0b0"));
const ACCENT = Color.dynamic(new Color("#2d6a4f"), new Color("#52b788"));
const GIORNI = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

// ── Dati (con copia locale per quando sei offline) ────────────
const fm = FileManager.local();
const cache = fm.joinPath(fm.documentsDirectory(), "porto-fuori.json");

async function caricaDati() {
  try {
    const req = new Request(URL_DATI);
    req.timeoutInterval = 10;
    const dati = await req.loadJSON();
    fm.writeString(cache, JSON.stringify(dati));
    return dati;
  } catch (e) {
    if (fm.fileExists(cache)) return JSON.parse(fm.readString(cache));
    return null;
  }
}

const pad = (n) => String(n).padStart(2, "0");
const chiave = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const piuGiorni = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function raccolte(dati, data) {
  const g = dati?.giorni?.[chiave(data)];
  return { c: (g?.c ?? []).filter((x) => !NASCONDI.includes(x)), festivo: !!g?.festivo, presente: !!g };
}

// ── Disegno ───────────────────────────────────────────────────
function riga(stack, codice, size) {
  const r = stack.addStack();
  r.centerAlignContent();
  const pallino = r.addText("●");
  pallino.font = Font.systemFont(size);
  pallino.textColor = new Color(COLORI[codice] ?? "#999999");
  r.addSpacer(5);
  const t = r.addText(BREVE[codice] ?? codice);
  t.font = Font.semiboldSystemFont(size);
  t.textColor = TESTO;
  t.lineLimit = 1;
  t.minimumScaleFactor = 0.7;
}

function bloccoSera(stack, info, dati, size) {
  if (!dati) {
    const t = stack.addText("Dati non disponibili");
    t.font = Font.systemFont(size - 2); t.textColor = TENUE;
  } else if (!info.presente && info.c.length === 0 && chiave(piuGiorni(new Date(), 1)) > dati.al) {
    const t = stack.addText("Calendario scaduto: aggiorna l'app");
    t.font = Font.systemFont(size - 2); t.textColor = TENUE;
  } else if (info.c.length === 0) {
    const t = stack.addText("Niente stasera 🎉");
    t.font = Font.semiboldSystemFont(size); t.textColor = TESTO;
  } else {
    info.c.forEach((c, i) => { if (i) stack.addSpacer(3); riga(stack, c, size); });
  }
  if (info.festivo) {
    stack.addSpacer(3);
    const t = stack.addText("⚠︎ Festivo: verifica");
    t.font = Font.systemFont(size - 4); t.textColor = TENUE;
  }
}

function intestazione(stack, testo) {
  const t = stack.addText(testo);
  t.font = Font.boldSystemFont(11);
  t.textColor = ACCENT;
}

async function creaWidget() {
  const dati = await caricaDati();
  const oggi = new Date();
  const domani = piuGiorni(oggi, 1);
  const stasera = raccolte(dati, domani);
  const famiglia = config.widgetFamily ?? "medium";
  const w = new ListWidget();
  w.url = URL_APP;

  // aggiorna poco dopo mezzanotte
  w.refreshAfterDate = new Date(domani.getFullYear(), domani.getMonth(), domani.getDate(), 0, 5);

  if (famiglia === "accessoryInline") {
    w.addText(stasera.c.length ? `🗑 ${stasera.c.map((c) => BREVE[c]).join(" · ")}` : "🗑 Niente stasera");
    return w;
  }
  if (famiglia === "accessoryCircular") {
    w.addAccessoryWidgetBackground = true;
    const t = w.addText(stasera.c.length ? stasera.c.map((c) => BREVE[c][0]).join("") : "–");
    t.font = Font.boldSystemFont(16); t.centerAlignText();
    return w;
  }
  if (famiglia === "accessoryRectangular") {
    const h = w.addText("🌙 Fuori stasera");
    h.font = Font.boldSystemFont(12);
    const t = w.addText(stasera.c.length ? stasera.c.map((c) => BREVE[c]).join(", ") : "Niente 🎉");
    t.font = Font.systemFont(14); t.minimumScaleFactor = 0.7;
    return w;
  }

  // Home: piccolo e medio
  w.backgroundColor = SFONDO;
  w.setPadding(14, 14, 14, 14);
  const corpo = w.addStack();
  corpo.layoutHorizontally();

  const sx = corpo.addStack();
  sx.layoutVertically();
  intestazione(sx, "🌙 STASERA");
  sx.addSpacer(6);
  bloccoSera(sx, stasera, dati, famiglia === "small" ? 15 : 16);
  sx.addSpacer();

  if (famiglia !== "small" && dati) {
    corpo.addSpacer();
    const dx = corpo.addStack();
    dx.layoutVertically();
    intestazione(dx, "PROSSIME SERE");
    dx.addSpacer(6);
    for (let i = 2; i <= 4; i++) {
      const giorno = piuGiorni(oggi, i);
      const info = raccolte(dati, giorno);
      const r = dx.addStack();
      r.centerAlignContent();
      const g = r.addText(GIORNI[piuGiorni(giorno, -1).getDay()]);
      g.font = Font.mediumSystemFont(12); g.textColor = TENUE;
      r.addSpacer(6);
      if (!info.c.length) {
        const t = r.addText("–"); t.font = Font.systemFont(12); t.textColor = TENUE;
      }
      info.c.forEach((c) => {
        const p = r.addText("●");
        p.font = Font.systemFont(13);
        p.textColor = new Color(COLORI[c] ?? "#999999");
      });
      dx.addSpacer(5);
    }
    dx.addSpacer();
  }
  return w;
}

const widget = await creaWidget();
if (config.runsInWidget || config.runsInAccessoryWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
