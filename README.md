# FamiljDokument — Säkert dokumentarkiv för familjen

Lagra kvitton och viktiga dokument säkert. Sök, export och realtids-sync mellan enheter.

---

## Installation på Windows (utan WSL eller Docker)

Den här guiden förutsätter en ren Windows-dator med bara VS Code installerat.
Allt körs direkt i Windows — ingen WSL, Docker eller Linux behövs.

---

### Steg 1 — Installera Node.js

1. Öppna **https://nodejs.org**
2. Ladda ner **LTS-versionen** (grön knapp, 20.x eller senare)
3. Kör installationsfilen (.msi)
   - Klicka **Next** genom alla steg
   - Bocka **INTE** i "Automatically install the necessary tools" (Chocolatey) — det behövs inte
4. Klicka **Install** → **Finish**

**Verifiera installationen:**
Öppna en ny terminal (Terminal, PowerShell eller CMD):

```
node --version
npm --version
```

Du bör se t.ex. `v20.x.x` och `10.x.x`. Om kommandona inte hittas — stäng och öppna terminalen igen.

---

### Steg 2 — Ladda ner projektet

Du har fått en ZIP-fil med hela projektet (`familj-dokument.zip`).

1. **Spara ZIP-filen** på valfri plats, t.ex. `C:\Projekt\`
2. **Högerklicka** → **Extrahera alla...** → Välj destination, t.ex. `C:\Projekt\familj-dokument`
3. Kontrollera att mappen innehåller filer som `package.json`, `server/`, `client/` osv.

> **Tips:** Undvik att lägga projektet i en mapp med mellanslag eller specialtecken i sökvägen (t.ex. "Mina Dokument"). Använd något kort som `C:\Projekt\familj-dokument`.

---

### Steg 3 — Öppna projektet i VS Code

1. Öppna **VS Code**
2. **File** → **Open Folder...** → Välj mappen `familj-dokument`
3. Öppna en **terminal i VS Code**: Meny → **Terminal** → **New Terminal**

   (Eller tryck `` Ctrl+` ``)

Nu ser du en terminal nere i VS Code som pekar på projektmappen.

---

### Steg 4 — Installera beroenden

I terminalen i VS Code, skriv:

```
npm install
```

Vänta tills det är klart (kan ta 1–3 minuter första gången). Du ser en `node_modules`-mapp dyka upp i filträdet.

---

### Steg 5 — Starta appen

I samma terminal, skriv:

```
npm run dev
```

Vänta tills du ser något i stil med:

```
serving on port 5000
```

**Appen körs nu!**

---

### Steg 6 — Öppna i webbläsaren

1. Öppna **Chrome** eller **Edge**
2. Gå till: **http://localhost:5000**
3. Du ser inloggningssidan

**Skapa ditt konto:**
- Klicka **"Registrera dig"**
- Fyll i e-post och lösenord
- Första kontot blir automatiskt admin

**Bjud in din partner:**
- Hon öppnar samma adress och registrerar sig som användare #2
- Max 2 konton — ni ser samma dokument

---

### Steg 7 — Öppna på mobilen (samma WiFi)

Om din telefon är på samma WiFi-nätverk som datorn kan du nå appen från mobilen.

#### a) Hitta datorns IP-adress

Öppna en ny terminal (eller PowerShell) och skriv:

```
ipconfig
```

Leta efter raden **IPv4 Address** under din WiFi-adapter, t.ex:

```
IPv4 Address. . . . . . . . . . . : 192.168.1.42
```

#### b) Öppna Windows-brandväggen för port 5000

Om mobilen inte kan nå appen, öppna **PowerShell som administratör** (högerklicka → "Kör som administratör") och kör:

```powershell
New-NetFirewallRule -DisplayName "FamiljDokument" -Direction Inbound -Port 5000 -Protocol TCP -Action Allow
```

#### c) Surfa till appen på mobilen

Öppna Chrome/Safari på mobilen och gå till:

```
http://192.168.1.42:5000
```

(Byt ut `192.168.1.42` mot din faktiska IP från steg a.)

---

### Steg 8 — Installera som app (PWA)

Appen kan installeras som en "riktig app" på hemskärmen:

| Enhet | Instruktion |
|-------|-------------|
| **Windows (Chrome/Edge)** | Klicka installera-ikonen i adressfältet, eller Meny → "Installera FamiljDokument" |
| **Android (Chrome)** | Meny (⋮) → "Installera app" eller "Lägg till på startskärmen" |
| **iPhone (Safari)** | Dela-knappen (□↑) → "Lägg till på hemskärmen" |

---

## Daglig användning

### Starta appen

Varje gång du vill använda appen:

1. Öppna **VS Code** → öppna projektmappen
2. Öppna terminalen (`` Ctrl+` ``)
3. Skriv `npm run dev`
4. Öppna **http://localhost:5000** i webbläsaren

### Stänga appen

Tryck `Ctrl+C` i terminalen för att stoppa servern.

---

## Bygga för produktion (valfritt)

Om du vill köra en optimerad version:

```
npm run build
npm start
```

Appen körs då på **http://localhost:5000** i produktionsläge (snabbare, men utan hot reload).

---

## Viktig information

### Data och lagring

⚠️ **Appen använder just nu in-memory lagring** — det betyder att alla dokument försvinner när du stoppar servern (Ctrl+C) eller startar om datorn.

Det här är medvetet valt för enkelhetens skull. För permanent lagring kan appen uppgraderas till SQLite (en fil-baserad databas som inte kräver installation av separata databasservrar).

### Säkerhet

- Appen körs bara på ditt lokala nätverk — ingen utanför ditt WiFi kan nå den
- Lösenord hashas med bcrypt
- All kommunikation inom hemmanätverket är okrypterad (HTTP, inte HTTPS). Det är normalt för hemmanätverk, men undvik att skicka känsliga uppgifter över öppna/publika WiFi-nät

---

## Felsökning

| Problem | Lösning |
|---------|---------|
| `node` eller `npm` hittas inte | Stäng och öppna terminalen igen efter Node.js-installationen. Om det fortfarande inte fungerar — starta om datorn. |
| `npm install` ger fel | Kontrollera att du står i rätt mapp (ska innehålla `package.json`). Prova `npm install` igen. |
| `npm run dev` kraschar | Kontrollera att Node.js v20+ är installerat (`node --version`). |
| Mobilen kan inte nå appen | 1. Kontrollera att telefon och dator är på samma WiFi. 2. Kör brandväggsregeln (Steg 7b). 3. Dubbelkolla IP-adressen. |
| Port 5000 redan upptagen | Något annat program använder porten. Stäng det, eller ändra port i `server/index.ts`. |

---

## Filstruktur

```
familj-dokument/
├── client/                  # React frontend
│   ├── src/
│   │   ├── pages/           # Login, Dashboard, Upload, Gallery, Trash
│   │   ├── components/      # shadcn/ui komponenter
│   │   ├── hooks/           # useAuth, useTheme
│   │   └── lib/             # API, auth, queryClient
│   └── public/              # PWA-filer (manifest, icons, service worker)
├── server/                  # Express backend
│   ├── routes.ts            # API-endpoints
│   └── storage.ts           # In-memory lagring
├── shared/
│   └── schema.ts            # Datamodell och validering
└── README.md
```

## Teknik

| Del | Teknik |
|-----|--------|
| Frontend | React, Tailwind CSS, shadcn/ui |
| Backend | Express.js, Node.js |
| Auth | bcryptjs + token-baserad session |
| Realtid | WebSocket |
| Export | JSZip (ZIP med CSV-sammanställning) |
| PWA | Service Worker, Web App Manifest |

## Framtida förbättringar (valfritt)

- **Persistent lagring**: Uppgradera till SQLite så att data överlever omstarter
- **HTTPS**: Installera Caddy som reverse proxy för krypterad trafik
- **Backup**: Schemalägg automatisk ZIP-export av alla filer
- **Domännamn**: Peka ett domännamn mot din IP med DuckDNS (gratis)
- **Autostart**: Skapa en .bat-fil som startar appen automatiskt vid datorstart
