# Dungeon Companion (MVP)

App multipiattaforma (Windows/macOS/Linux + Android/iOS) per gestire campagne D&D, con **Tauri 2 + React + TypeScript**.
Le campagne si sincronizzano tra i giocatori tramite un piccolo server gratuito su **Cloudflare**; gli aggiornamenti dell'app arrivano dalle **release di GitHub**.

## Cosa c'è
- **Profili campagna** multipli, ognuno con edizione (OD&D → 5.5e) e manuali/espansioni propri.
- **Slot manuali**: carichi tu i PDF (l'app non include contenuti protetti da copyright). Ogni manuale può restare solo sul tuo dispositivo oppure essere condiviso col party; i file grandi (centinaia di MB) vengono caricati a parti e, se la rete cade, riprendono da dove erano arrivati.
- **Scheda personaggio** con calcoli automatici per la **5e (2014)** e la **5.5e (2024)**: modificatori, competenza, tiri salvezza, abilità, iniziativa, velocità, bonus razziali (2014) o dal background (2024), CD/attacco incantesimi, slot per classe e livello, inventario con oggetti «in uso», monete, backstory. Le altre edizioni hanno i campi ma non i calcoli.
- **Diario**, **quest**, **PNG**.
- **Mappe**: carichi un'immagine oppure **disegni e generi** dungeon, caverne e mappe del mondo (stanze, corridoi, porte, scale, foreste, montagne, strade, città, nomi). Editor con matita, gomma, linea, rettangolo, riempi, annulla/ripeti, zoom a rotella o pizzico, esportazione PNG; la generazione usa un seme, quindi lo stesso numero dà la stessa mappa. Segnaposto e appunti si mettono sopra qualsiasi mappa.
- **Sincronizzazione col party** con codice d'invito, senza account.
- **Avviso di nuova versione** con pulsante di aggiornamento.
- **Ritratti AI**: solo interfaccia e prompt (descrizione + razza/classe + equipaggiamento in uso); «Genera» è disattivato.

## Pubblicare il repository (pubblico)
```bash
git init && git add -A && git commit -m "Prima versione"
gh repo create dungeon-companion --public --source . --push      # oppure crea il repo dal sito e fai git push
```
Il repository è pubblico: **non committare mai** chiavi, file `.env`, PDF dei manuali o il file `.key` della firma (il `.gitignore` li esclude). I secret di GitHub e di Cloudflare non sono visibili a chi legge il codice.

## Server di sincronizzazione (Cloudflare, gratuito)
Cartella `server/`: un Worker con database D1 e spazio R2 per i file. Una volta sola, da `server/`:
```bash
npm install
npx wrangler login
npx wrangler d1 create dungeon-companion          # copia il database_id in server/wrangler.toml
npx wrangler r2 bucket create dungeon-companion-blobs
npx wrangler d1 migrations apply dungeon-companion --remote
npx wrangler secret put CREATE_KEY                # scegli una chiave lunga: serve per creare campagne
npx wrangler deploy                               # stampa l'indirizzo https://….workers.dev
```
Per attivare R2 Cloudflare può chiedere di registrare un metodo di pagamento; entro i limiti gratuiti non si paga (controlla i limiti attuali sul loro sito).

Uso:
1. Chi gestisce la campagna: *Impostazioni → Sincronizzazione* → indirizzo del server + chiave di creazione → **Attiva sincronizzazione**.
2. Copia il **codice d'invito** e mandalo ai giocatori.
3. I giocatori: *Campagne → Unisciti con un codice*. Nessun account.

Note:
- Chi ha il codice può leggere e modificare la campagna: condividilo solo con il party.
- La sincronizzazione è automatica (all'apertura, ogni 2 minuti, ~10 secondi dopo una modifica). Se due persone modificano la stessa scheda, vince l'ultima modifica.
- I file si caricano a parti da 32 MB (il piano gratuito accetta richieste fino a 100 MB), quindi non c'è un limite per singolo manuale. Ogni campagna può occupare fino a 3 GB (`MAX_CAMPAIGN_BYTES` in `wrangler.toml`); lo spazio R2 gratuito è 10 GB in totale, quindi con più campagne conviene abbassarlo.
- Chi vuole può tenere un manuale solo sul proprio dispositivo (non lo carica sul server): utile per i PDF che non vuoi ospitare online.
- Se usi un dominio personalizzato invece di `workers.dev`, aggiungilo a `connect-src` in `src-tauri/tauri.conf.json`.
- Prova in locale: `npx wrangler dev --local` con un file `server/.dev.vars` contenente `CREATE_KEY=prova`.
- Opzionale: `.github/workflows/deploy-server.yml` ripubblica il server a ogni modifica di `server/` (secret `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`).

## Aggiornamenti da GitHub
Una volta sola:
1. `npm run tauri signer generate -- -w ~/.tauri/dnd.key`
   - incolla la chiave **pubblica** in `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`
   - repo → Settings → Secrets and variables → Actions: `TAURI_SIGNING_PRIVATE_KEY` (contenuto del file `.key`) e `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
   - **non perdere la chiave privata**: senza, le app già installate non accettano più aggiornamenti.
2. Settings → Actions → General → Workflow permissions: *Read and write*.

Per ogni versione:
```bash
npm run release -- 0.2.0     # allinea le versioni, crea commit e tag v0.2.0
git push && git push --tags  # parte la GitHub Action
```
La Action compila Windows, macOS (Apple Silicon e Intel) e Linux, firma gli installer, crea la release e pubblica `latest.json`. L'indirizzo del repository nell'updater viene impostato in automatico in CI (`OWNER/REPO`).

- **Desktop**: l'avviso installa e riavvia da solo.
- **Android**: workflow separato `.github/workflows/android.yml` (parte con lo stesso tag `v*`, o a mano da Actions). Richiede i secret `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`. Allega alla release l'APK firmato e `android.json` (usato dall'avviso di aggiornamento, che apre il download). Conserva il keystore: serve identico a ogni versione per poter aggiornare l'app.
- **Manuali PDF**: letti con pdf.js (funziona anche nel WebView Android); i file di supporto vengono copiati in `public/pdfjs` da `scripts/copy-pdfjs.mjs`.
- **iOS**: Apple non permette installazioni fuori da App Store/TestFlight; serve un account Apple Developer.
- Le build macOS non firmate/notarizzate mostrano l'avviso di Gatekeeper (per toglierlo servono i certificati Apple, a pagamento).

## Sviluppo
```bash
npm install
npm run dev                # solo web, http://localhost:1420
npm run tauri dev          # app desktop
npm run tauri icon logo.png   # per rigenerare le icone da un tuo logo (quelle incluse sono provvisorie)
```
Prerequisiti di compilazione (Tauri):
- **Linux (Debian/Ubuntu)**: `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`
- **Windows**: Microsoft C++ Build Tools («Sviluppo desktop con C++») e WebView2.
- **macOS**: `xcode-select --install` (Xcode completo per iOS).
- **Android**: Android Studio, `JAVA_HOME`, `ANDROID_HOME`, `NDK_HOME`, target Rust Android; poi `npm run tauri android init`.

## Prossimi passi proposti
1. Strumento di disegno mappe/dungeon e generazione automatica.
2. Collegamento del servizio di generazione immagini.
3. Lettura dei PDF per precompilare incantesimi, razze e classi.
4. Ruoli (DM/giocatore) e visibilità selettiva delle note.
5. Moduli di regole per le altre edizioni.
