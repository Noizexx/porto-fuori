# Porto Fuori

Calendario della raccolta differenziata di Porto Torres: cosa mettere fuori stasera.
Live: https://porto-fuori.pages.dev/

## File

| File | Cosa è |
|---|---|
| `index.html` | La webapp. **Fonte unica dei dati** (`calendar`, `collectionInfo`) |
| `calendario.json` | Dati in JSON, letti dal widget iPhone |
| `raccolta.ics` | Calendario: un evento alle 20:00 la sera prima di ogni raccolta (per iPhone e Alexa) |
| `widget/porto-fuori-widget.js` | Widget per l'app Scriptable |
| `tools/genera-dati.mjs` | Rigenera `calendario.json` e `raccolta.ics` da `index.html` |

## Aggiornare il calendario (es. 2027)

1. Aggiorna l'oggetto `calendar` in `index.html`
2. `node tools/genera-dati.mjs`
3. Commit + push: Cloudflare Pages pubblica da solo
4. Reimporta `raccolta.ics` nel calendario "Raccolta" su iPhone
