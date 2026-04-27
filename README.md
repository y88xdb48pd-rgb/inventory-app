# 📦 Inventory App

Eine moderne Equipment-Verwaltungssoftware für Unternehmen.

## 🚀 Lokal starten

### Voraussetzungen
- [Node.js](https://nodejs.org) (Version 18 oder höher)

### Installation

```bash
# 1. In den Projektordner wechseln
cd inventory-app

# 2. Abhängigkeiten installieren
npm install

# 3. Entwicklungsserver starten
npm run dev
```

Die App ist dann unter **http://localhost:5173** erreichbar.

## 📦 Für Produktion bauen

```bash
npm run build
```

Der fertige Build liegt im `dist/` Ordner.

## 🌐 Auf Vercel deployen

1. Code auf GitHub hochladen (siehe unten)
2. Auf [vercel.com](https://vercel.com) einloggen
3. „New Project" → GitHub-Repo auswählen
4. Deploy klicken — fertig!

## 📁 Projektstruktur

```
inventory-app/
├── src/
│   ├── App.jsx        ← Haupt-App-Komponente
│   ├── main.jsx       ← React Entry Point
│   └── index.css      ← Tailwind CSS
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 🔧 Features

- ✅ Inventar-Verwaltung mit Mengen & Einheiten
- ✅ Ordner-System
- ✅ Bilder-Upload pro Artikel
- ✅ Barcode-Scanner (Kamera)
- ✅ Ablaufdatum-Warnungen
- ✅ Wartungskalender
- ✅ Ausleihe & Rückgabe-Tracking
- ✅ Dashboard mit konfigurierbaren Widgets
- ✅ Export (CSV, JSON, Druck/PDF)
- ✅ QR-Code-Generator
