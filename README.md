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

## 📸 Preview

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ METEO // RIPOSTO          37.7285°N · 15.2027°E · CT        │
│  ● RAINVIEWER  ● BLITZORTUNG  ● OPEN-METEO  ○ DPC              │
├─────────────────┬───────────────────────────────────────────────┤
│  Condizioni     │                                               │
│  Temperatura    │          🗺  MAPPA RADAR LIVE                 │
│  Vento          │                                               │
│  ─────────────  │   [Radar] [Satellite] [Fulmini] [Animazione] │
│  ⚡ Fulminazione │                                               │
│  ─────────────  │         ◎ RIPOSTO                             │
│  🌩 ETA Celle   │       ╌ ╌ ╌ 50 km ╌ ╌ ╌                     │
│  ─────────────  │                                               │
│  🛡 Allerta      │                                               │
│  ─────────────  │                  RADAR: 14:30 (LIVE)         │
│  📊 Previsione  │                                               │
└─────────────────┴───────────────────────────────────────────────┘
```

---

## ✨ Funzionalità

| Modulo | Fonte | Aggiornamento |
|--------|-------|---------------|
| 🌧 **Radar precipitazioni** | RainViewer API | ogni 5 min |
| 🛰 **Satellite infrarosso** | RainViewer API | ogni 5 min |
| ⚡ **Fulminazione live** | Blitzortung WebSocket | tempo reale |
| 🌡 **Dati meteo correnti** | Open-Meteo NWP | ogni 10 min |
| 🌩 **ETA celle temporalesche** | calcolo vettoriale vento | dinamico |
| 🛡 **Allerta automatica** | codici WMO + soglie mm | dinamico |
| 📊 **Previsione +6h** | Open-Meteo orario | ogni 10 min |

### Dettagli tecnici
- **Raggio di monitoraggio**: 50 km centrato su Riposto (37.7285°N, 15.2027°E)
- **Animazione radar**: playback frame-by-frame con nowcast fino a +1h
- **Modalità demo**: se Blitzortung WebSocket non è disponibile, simula pattern convettivi tipici siciliani (più intensi nelle ore pomeridiane)
- **Mappa base**: CartoDB Dark (Leaflet 1.9.4)
- **Marker Riposto**: animazione ripple ambra con popup coordinate

---

## 📲 Installazione come App (PWA)

### Android (Chrome)
1. Apri il link su **Chrome per Android**
2. Appare il banner *"Installa app"* in basso
3. Tocca **Installa** → icona sul desktop
4. Si apre a schermo intero senza barra browser

### iOS (Safari)
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
├── index.html          # App completa (single-file)
├── manifest.json       # Configurazione PWA
├── sw.js               # Service worker (cache offline)
├── icons/
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-192.png    # ← icona principale Android
│   └── icon-512.png    # ← Play Store / Splash screen
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

---

## 🌐 API utilizzate

| API | Endpoint | Autenticazione |
|-----|----------|----------------|
| [Open-Meteo](https://open-meteo.com) | `api.open-meteo.com/v1/forecast` | nessuna |
| [RainViewer](https://rainviewer.com/api.html) | `api.rainviewer.com/public/weather-maps.json` | nessuna |
| [Blitzortung](https://blitzortung.org) | `wss://ws1.blitzortung.org:3000` | nessuna |
| [CartoDB Tiles](https://carto.com) | `basemaps.cartocdn.com/dark_all` | nessuna |

Tutte le API sono **gratuite e senza chiave**. Nessun backend richiesto.

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
Dati meteo soggetti ai termini delle rispettive API (Open-Meteo CC BY 4.0, RainViewer, Blitzortung).

---

<div align="center">

*Fatto con ☕ e ⚡ a Riposto, alle pendici dell'Etna*

</div>
