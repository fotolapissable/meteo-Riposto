<div align="center">

```
⚡ METEO RIPOSTO
```

# Radar Meteo Live · Riposto (CT)

**Radar precipitazioni · Fulminazione in tempo reale · Previsioni NWP · Allerta meteo**

[![PWA](https://img.shields.io/badge/PWA-installabile-C8813A?style=flat-square&logo=pwa&logoColor=white)](https://fotolapissable.github.io/meteo-riposto/)
[![Open-Meteo](https://img.shields.io/badge/Open--Meteo-NWP-00d4ff?style=flat-square)](https://open-meteo.com)
[![RainViewer](https://img.shields.io/badge/RainViewer-Radar-39ff14?style=flat-square)](https://rainviewer.com)
[![Blitzortung](https://img.shields.io/badge/Blitzortung-Fulmini%20live-ffd000?style=flat-square)](https://blitzortung.org)
[![Made in Sicily](https://img.shields.io/badge/Made%20in-Sicilia%20🌋-C8813A?style=flat-square)](https://fotolapissable.it)

<br>

> *Un progetto di [**fotolapissable.it**](https://fotolapissable.it) — Fine Art & Nature Photography · Riposto, Catania*

</div>

---

## ✨ Funzionalità

| Modulo | Fonte | Aggiornamento |
|--------|-------|---------------|
| 🌧 **Radar precipitazioni** | RainViewer API | ogni 5 min (retry automatico con backoff se non risponde) |
| ⚡ **Fulminazione live** | Blitzortung WebSocket | tempo reale |
| 🌡 **Dati meteo correnti** | Open-Meteo NWP | ogni 10 min |
| 💨 **Vento e raffiche** | Open-Meteo NWP | ogni 10 min |
| ☀️ **Indice UV** | Open-Meteo NWP | ogni 10 min |
| 🌅 **Alba / Tramonto + Golden Hour** | Open-Meteo NWP (calcolo astronomico) | giornaliero |
| 🛡 **Allerta automatica** | codici WMO + soglie mm precipitazione | dinamico |
| 📋 **Link bollettino ufficiale** | Protezione Civile (rimando esterno) | — |
| 📊 **Previsione domani/dopodomani** | Open-Meteo giornaliero | ogni 10 min |
| 📤 **Condividi condizioni** | Web Share API (solo se supportata dal browser) | — |
| 📴 **Cache offline** | localStorage (dati meteo) + Service Worker (tile mappa) | — |

> ⚠️ **Nota RainViewer (dal 1° gennaio 2026):** il servizio gratuito ha dismesso satellite IR e nowcast, limitato lo zoom radar a 7 (upsampling client-side oltre questo livello via `maxNativeZoom`) e ridotto gli schemi colore al solo "Universal Blue" (id `2`). Il radar mostra quindi solo la situazione delle ultime 2 ore, senza satellite né proiezioni future. Dettagli: [rainviewer.com/api/transition-faq.html](https://www.rainviewer.com/api/transition-faq.html)

### Dettagli tecnici
- **Raggio di monitoraggio**: 50 km centrato su Riposto (37.7285°N, 15.2027°E), o sulla posizione geolocalizzata dell'utente
- **Animazione radar**: playback frame-by-frame con nowcast fino a +1h
- **Modalità demo fulmini**: se il WebSocket Blitzortung non è raggiungibile (comune su reti dati mobili che bloccano certe porte), l'app passa a una simulazione di pattern convettivi tipici siciliani, segnalata chiaramente in etichetta
- **Mappa base**: OpenStreetMap standard, resa scura via filtro CSS dedicato (isolato in un pane separato da radar/fulmini, che mantengono i colori originali)
- **Layout responsive**: sidebar e mappa si impilano verticalmente sotto i 760px di larghezza; gestione corretta di notch/home-indicator su iOS (`viewport-fit=cover` + `env(safe-area-inset-*)`)
- **Marker Riposto**: animazione ripple ambra con popup coordinate; bottone "🏠 Riposto" per tornare alla posizione di default dopo aver usato la geolocalizzazione

---

## 📲 Installazione come App (PWA)

### Android (Chrome)
1. Apri il link su **Chrome per Android**
2. Appare il banner *"Installa app"* in basso
3. Tocca **Installa** → icona sul desktop
4. Si apre a schermo intero senza barra browser

### iOS (Safari)
Su iOS il prompt di installazione automatico non esiste (limite di Safari, non dell'app). L'app rileva questo caso e mostra istruzioni dedicate:
1. Apri il link in **Safari**
2. Tocca **Condividi** (icona □↑)
3. Seleziona **"Aggiungi a schermata Home"**
4. Conferma → icona sul desktop

### Desktop (Chrome / Edge)
- Clicca sull'icona **⊕** nella barra degli indirizzi
- Oppure: Menu → *"Installa Meteo Riposto"*

---

## 🛠 Struttura del progetto

```
meteo-riposto/
├── index.html    # App completa (single-file)
├── manifest.json # Configurazione PWA
├── sw.js         # Service worker (cache offline: shell app + tile mappa)
├── guida.html    # Guida utente in-app (aperta dal pulsante "?")
├── icons/
│   ├── icon-192.png  # ← icona principale Android
│   └── icon-512.png  # ← Play Store / Splash screen
└── README.md
```

---

## 🚀 Deploy locale (test)

```bash
# Clona il repository
git clone https://github.com/fotolapissable/meteo-riposto.git
cd meteo-riposto

# Avvia un server locale (Python 3)
python3 -m http.server 8000

# Apri nel browser
# → http://localhost:8000
```

> ⚠️ Il Service Worker richiede HTTPS o `localhost`. Aprire direttamente `index.html` come file disabilita solo il caching offline; tutte le funzionalità meteo rimangono operative.

> ⚠️ **Aggiornare `sw.js`**: ad ogni deploy, incrementare `APP_VERSION` in cima al file per forzare il refresh della cache su tutti i dispositivi già installati.

---

## 🌐 API e servizi utilizzati

| Servizio | Endpoint | Autenticazione | Uso |
|----------|----------|-----------------|-----|
| [Open-Meteo](https://open-meteo.com) | `api.open-meteo.com/v1/forecast` | nessuna | Meteo corrente, previsioni, alba/tramonto, UV |
| [RainViewer](https://rainviewer.com/api.html) | `api.rainviewer.com` + `tilecache.rainviewer.com` | nessuna | Radar precipitazioni (solo storico, zoom max 7) |
| [Blitzortung](https://blitzortung.org) | `wss://ws1/ws7/ws8.blitzortung.org:3000` | nessuna | Fulminazione live (con fallback demo) |
| [OpenStreetMap](https://www.openstreetmap.org) | `tile.openstreetmap.org` | nessuna | Basemap |
| [Protezione Civile](https://mappe.protezionecivile.gov.it) | link esterno diretto | — | Bollettino ufficiale (non integrato via API) |
| [Nominatim](https://nominatim.org) | `nominatim.openstreetmap.org/reverse` | nessuna | Geocoding inverso per la geolocalizzazione utente |

Tutte le API sono **gratuite e senza chiave**. Nessun backend richiesto.

> Nota: l'uso di OpenStreetMap standard per la basemap segue la normale policy di utilizzo tile di OSM — adatta a un traffico applicativo moderato come questo. Per volumi più alti, valutare un provider con chiave dedicata (es. Stadia Maps, MapTiler).

---

## 📷 Chi sono

<div align="center">

**Michele** · [fotolapissable.it](https://fotolapissable.it)

Fine Art & Nature Photography dalla costa ionica dell'Etna.
Paesaggi vulcanici, macro natura, luce crepuscolare.

[![Portfolio](https://img.shields.io/badge/Portfolio-fotolapissable.it-C8813A?style=for-the-badge)](https://fotolapissable.it)
[![Shutterstock](https://img.shields.io/badge/Shutterstock-Stock-EE2722?style=for-the-badge&logo=shutterstock&logoColor=white)](https://www.shutterstock.com)
[![Adobe Stock](https://img.shields.io/badge/Adobe%20Stock-Stock-FF0000?style=for-the-badge&logo=adobe&logoColor=white)](https://stock.adobe.com)
[![Alamy](https://img.shields.io/badge/Alamy-Stock-00A3E0?style=for-the-badge)](https://alamy.com)

</div>

---

## 📄 Licenza

Codice rilasciato sotto licenza **MIT** — libero di usare, modificare e distribuire con attribuzione.
Dati meteo soggetti ai termini delle rispettive API (Open-Meteo CC BY 4.0, RainViewer, Blitzortung, © OpenStreetMap contributors).

---

<div align="center">

*Fatto con ☕ e ⚡ a Riposto, alle pendici dell'Etna*

</div>
