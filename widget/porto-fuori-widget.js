// Porto Fuori – widget iPhone per Scriptable
// Mostra cosa mettere fuori STASERA (= raccolta di domani mattina).
// Formati: Home piccolo/medio, schermata di blocco (rettangolare, in linea, tondo).

// ── Impostazioni ──────────────────────────────────────────────
const URL_DATI = "https://porto-fuori.pages.dev/calendario.json";
const URL_APP  = "https://porto-fuori.pages.dev/";
const NASCONDI = []; // es. ["P", "SV"] per nascondere Pannolini e Sfalci se non sei iscritto

// Tipi: nome breve, colore, testo sul colore, simboli SF (il primo disponibile)
const TIPI = {
  U:  { nome: "Umido",     col: "#40916c", txt: "#ffffff", sf: ["carrot.fill", "leaf.fill"] },
  CC: { nome: "Carta",     col: "#3a6ea5", txt: "#ffffff", sf: ["newspaper.fill", "doc.fill"] },
  V:  { nome: "Vetro",     col: "#2a9d8f", txt: "#ffffff", sf: ["wineglass.fill", "drop.fill"] },
  PL: { nome: "Plastica",  col: "#f2c14e", txt: "#2b2412", sf: ["waterbottle.fill", "arrow.3.trianglepath"] },
  SV: { nome: "Sfalci",    col: "#a7c957", txt: "#1f2a10", sf: ["tree.fill", "leaf.fill"] },
  S:  { nome: "Secco",     col: "#5c636a", txt: "#ffffff", sf: ["trash.fill"] },
  P:  { nome: "Pannolini", col: "#9d4edd", txt: "#ffffff", sf: ["figure.and.child.holdinghands", "heart.fill"] },
};

const SFONDO_1 = Color.dynamic(new Color("#fbf8f2"), new Color("#1c1f26"));
const SFONDO_2 = Color.dynamic(new Color("#efe7d8"), new Color("#12141a"));
const TESTO    = Color.dynamic(new Color("#1a1a2e"), new Color("#f2efe8"));
const TENUE    = Color.dynamic(new Color("#8a8778"), new Color("#8d909a"));
const ACCENT   = Color.dynamic(new Color("#2d6a4f"), new Color("#74c69d"));
const RIGA     = Color.dynamic(new Color("#ffffff", 0.7), new Color("#ffffff", 0.06));
const AVVISO   = new Color("#e76f51");
const GIORNI   = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

// ── Dati (con copia locale per quando sei offline) ────────────
const fm = FileManager.local();
const cache = fm.joinPath(fm.documentsDirectory(), "porto-fuori.json");

async function caricaDati() {
  try {
    const req = new Request(URL_DATI);
    req.timeoutInterval = 10;
    const dati = await req.loadJSON();
    if (!dati?.giorni) throw new Error("formato");
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
  return {
    c: (g?.c ?? []).filter((x) => TIPI[x] && !NASCONDI.includes(x)),
    festivo: !!g?.festivo,
    scaduto: !!dati && chiave(data) > dati.al,
  };
}

// ── Mattoncini grafici ────────────────────────────────────────
function simbolo(nomi) {
  for (const n of nomi) {
    const s = SFSymbol.named(n);
    if (s && s.image) return s;
  }
  return SFSymbol.named("circle.fill");
}

function icona(stack, nomi, size, colore) {
  const s = simbolo(nomi);
  s.applyFont(Font.semiboldSystemFont(size));
  const img = stack.addImage(s.image);
  img.imageSize = new Size(size, size);
  img.tintColor = colore;
  img.resizable = true;
  return img;
}

function testo(stack, t, font, colore) {
  const x = stack.addText(t);
  x.font = font;
  x.textColor = colore;
  x.lineLimit = 1;
  x.minimumScaleFactor = 0.6;
  return x;
}

// Pillola piena: icona + nome, su colore del tipo
function pillola(stack, codice, altezza) {
  const t = TIPI[codice];
  const p = stack.addStack();
  p.layoutHorizontally();
  p.centerAlignContent();
  p.backgroundColor = new Color(t.col);
  p.cornerRadius = altezza / 2.6;
  p.size = new Size(0, altezza);
  p.setPadding(0, 10, 0, 10);
  icona(p, t.sf, altezza * 0.5, new Color(t.txt));
  p.addSpacer(7);
  testo(p, t.nome, Font.boldRoundedSystemFont(altezza * 0.5), new Color(t.txt));
  p.addSpacer();
  return p;
}

// Bollino tondo con icona (per le prossime sere)
function bollino(stack, codice, d) {
  const t = TIPI[codice];
  const b = stack.addStack();
  b.size = new Size(d, d);
  b.cornerRadius = d / 2;
  b.backgroundColor = new Color(t.col);
  b.centerAlignContent();
  icona(b, t.sf, d * 0.55, new Color(t.txt));
}

function intestazione(stack, oggi) {
  const h = stack.addStack();
  h.layoutHorizontally();
  h.centerAlignContent();
  icona(h, ["moon.stars.fill", "moon.fill"], 12, ACCENT);
  h.addSpacer(4);
  testo(h, "STASERA", Font.heavyRoundedSystemFont(12), ACCENT);
  h.addSpacer();
  testo(h, `${GIORNI[oggi.getDay()].toLowerCase()} ${oggi.getDate()}`, Font.semiboldRoundedSystemFont(11), TENUE);
}

function vuoto(stack, info, dati) {
  const v = stack.addStack();
  v.layoutVertically();
  if (!dati || info.scaduto) {
    icona(v, ["exclamationmark.arrow.circlepath", "exclamationmark.circle.fill"], 26, AVVISO);
    v.addSpacer(6);
    testo(v, !dati ? "Nessun dato" : "Calendario scaduto", Font.boldRoundedSystemFont(15), TESTO);
    testo(v, !dati ? "Controlla la connessione" : "Aggiorna i dati dell'app", Font.mediumRoundedSystemFont(11), TENUE);
  } else {
    icona(v, ["moon.zzz.fill", "moon.fill"], 28, ACCENT);
    v.addSpacer(6);
    testo(v, "Niente da", Font.boldRoundedSystemFont(17), TESTO);
    testo(v, "portare fuori", Font.boldRoundedSystemFont(17), TESTO);
  }
}

function etichettaFestivo(stack) {
  const f = stack.addStack();
  f.centerAlignContent();
  icona(f, ["exclamationmark.triangle.fill"], 10, AVVISO);
  f.addSpacer(3);
  testo(f, "Festivo · verifica", Font.semiboldRoundedSystemFont(10), AVVISO);
}

// ── Widget ────────────────────────────────────────────────────
async function creaWidget() {
  const dati = await caricaDati();
  const oggi = new Date();
  const domani = piuGiorni(oggi, 1);
  const stasera = raccolte(dati, domani);
  const famiglia = config.widgetFamily ?? "medium";
  const w = new ListWidget();
  w.url = URL_APP;
  w.refreshAfterDate = new Date(domani.getFullYear(), domani.getMonth(), domani.getDate(), 0, 5);
  const nomi = stasera.c.map((c) => TIPI[c].nome);

  // ── Schermata di blocco ──
  if (famiglia === "accessoryInline") {
    w.addText(nomi.length ? `🌙 ${nomi.join(" · ")}` : "🌙 Niente stasera");
    return w;
  }
  if (famiglia === "accessoryCircular") {
    w.addAccessoryWidgetBackground = true;
    const s = w.addStack();
    s.layoutVertically();
    s.centerAlignContent();
    const r1 = s.addStack(); r1.addSpacer();
    icona(r1, stasera.c.length ? TIPI[stasera.c[0]].sf : ["moon.zzz.fill"], 20, Color.white());
    r1.addSpacer();
    if (stasera.c.length > 1) {
      s.addSpacer(2);
      const r2 = s.addStack(); r2.addSpacer();
      testo(r2, `+${stasera.c.length - 1}`, Font.boldRoundedSystemFont(11), Color.white());
      r2.addSpacer();
    }
    return w;
  }
  if (famiglia === "accessoryRectangular") {
    const h = w.addStack();
    h.centerAlignContent();
    icona(h, ["moon.stars.fill"], 12, Color.white());
    h.addSpacer(4);
    testo(h, "FUORI STASERA", Font.heavyRoundedSystemFont(12), Color.white());
    w.addSpacer(3);
    const r = w.addStack();
    r.centerAlignContent();
    if (!stasera.c.length) {
      testo(r, "Niente 😴", Font.boldRoundedSystemFont(16), Color.white());
    } else {
      stasera.c.forEach((c, i) => {
        if (i) r.addSpacer(8);
        icona(r, TIPI[c].sf, 14, Color.white());
        r.addSpacer(3);
        testo(r, TIPI[c].nome, Font.boldRoundedSystemFont(14), Color.white());
      });
    }
    return w;
  }

  // ── Home ──
  const g = new LinearGradient();
  g.colors = [SFONDO_1, SFONDO_2];
  g.locations = [0, 1];
  w.backgroundGradient = g;
  w.setPadding(14, 14, 14, 14);

  const corpo = w.addStack();
  corpo.layoutHorizontally();

  const sx = corpo.addStack();
  sx.layoutVertically();
  intestazione(sx, oggi);
  sx.addSpacer(10);

  if (!stasera.c.length) {
    vuoto(sx, stasera, dati);
  } else {
    const n = stasera.c.length;
    const h = n <= 2 ? 34 : n === 3 ? 28 : 22;
    stasera.c.slice(0, 4).forEach((c, i) => {
      if (i) sx.addSpacer(n <= 2 ? 8 : 5);
      pillola(sx, c, h);
    });
  }
  sx.addSpacer();
  if (stasera.festivo) etichettaFestivo(sx);

  if (famiglia !== "small" && dati) {
    corpo.addSpacer(14);
    const dx = corpo.addStack();
    dx.layoutVertically();
    dx.size = new Size(128, 0);
    const h = dx.addStack();
    testo(h, "PROSSIME SERE", Font.heavyRoundedSystemFont(11), TENUE);
    dx.addSpacer(10);
    for (let i = 2; i <= 4; i++) {
      const giorno = piuGiorni(oggi, i);
      const info = raccolte(dati, giorno);
      const r = dx.addStack();
      r.layoutHorizontally();
      r.centerAlignContent();
      r.backgroundColor = RIGA;
      r.cornerRadius = 10;
      r.size = new Size(128, 30);
      r.setPadding(0, 8, 0, 6);
      const sera = piuGiorni(giorno, -1);
      testo(r, GIORNI[sera.getDay()], Font.boldRoundedSystemFont(12), TESTO);
      r.addSpacer();
      if (!info.c.length) {
        testo(r, "—", Font.boldRoundedSystemFont(12), TENUE);
      }
      info.c.slice(0, 3).forEach((c, j) => {
        if (j) r.addSpacer(3);
        bollino(r, c, 20);
      });
      if (i < 4) dx.addSpacer(6);
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
