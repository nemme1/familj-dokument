# Nå FamiljDokument över internet — Steg för steg

Med Cloudflare Tunnel kan du nå appen från var som helst (jobbet, mobilen ute, etc.)
utan att öppna portar i routern. Gratis, säkert (HTTPS), och tar ca 5 minuter.

---

## Steg 1 — Installera Cloudflare Tunnel

Öppna **PowerShell** eller **CMD** och kör:

```
winget install --id Cloudflare.cloudflared
```

Stäng och öppna terminalen igen efter installationen.

Verifiera:

```
cloudflared --version
```

> **Om `winget` inte fungerar:** Ladda ner manuellt från
> https://github.com/cloudflare/cloudflared/releases/latest
> Välj filen `cloudflared-windows-amd64.msi`, kör den, och starta om terminalen.

---

## Steg 2 — Starta appen (om den inte redan körs)

I VS Code-terminalen, i projektmappen:

```
npm run dev
```

Vänta tills du ser `serving on port 5000`.

---

## Steg 3 — Starta tunneln

Öppna en **ny terminal** (antingen i VS Code med `+`-knappen, eller PowerShell separat) och kör:

```
cloudflared tunnel --url http://localhost:5000
```

Efter några sekunder ser du något i stil med:

```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://random-words-here.trycloudflare.com                                               |
+--------------------------------------------------------------------------------------------+
```

**Den URL:en är din app — tillgänglig från hela internet med HTTPS!**

---

## Steg 4 — Använd appen

1. **Kopiera URL:en** från terminalen (t.ex. `https://random-words-here.trycloudflare.com`)
2. **Öppna den** i valfri webbläsare — dator, mobil, surfplatta
3. **Skicka länken till din partner** — hon kan nå appen var hon än är

### Installera som app på mobilen

Med den publika URL:en kan du installera PWA:n även utanför hemmanätverket:

- **Android**: Chrome → Meny (⋮) → "Installera app"
- **iPhone**: Safari → Dela (□↑) → "Lägg till på hemskärmen"

---

## Viktigt att veta

### URL:en ändras varje gång
Varje gång du kör `cloudflared tunnel --url ...` får du en ny slumpmässig URL.
Det betyder att du behöver skicka den nya länken till din partner varje gång.

### Appen är bara tillgänglig när datorn är på
Tunneln fungerar så länge:
- Datorn är igång
- `npm run dev` körs (appservern)
- `cloudflared tunnel` körs (tunneln)

Stänger du något av dessa nås inte appen utifrån längre.

---

## Uppgradering: Fast URL med Cloudflare-konto (gratis)

Vill du ha en fast URL som inte ändras? Då behöver du ett gratis Cloudflare-konto:

### 1. Skapa konto
Gå till https://dash.cloudflare.com/sign-up och registrera dig.

### 2. Logga in med cloudflared

```
cloudflared tunnel login
```

En webbläsare öppnas — logga in och välj din domän (eller använd den gratis-domänen).

### 3. Skapa en namngiven tunnel

```
cloudflared tunnel create familj-dokument
```

### 4. Koppla en subdomain

```
cloudflared tunnel route dns familj-dokument dokument.din-doman.se
```

### 5. Skapa konfigurationsfil

Skapa filen `%USERPROFILE%\.cloudflared\config.yml`:

```yaml
tunnel: <tunnel-id>
credentials-file: C:\Users\DITTNAMN\.cloudflared\<tunnel-id>.json

ingress:
  - hostname: dokument.din-doman.se
    service: http://localhost:5000
  - service: http_status:404
```

### 6. Starta tunneln

```
cloudflared tunnel run familj-dokument
```

Nu har du alltid samma URL!

---

## Snabbstart-script (valfritt)

Skapa en fil `starta.bat` i projektmappen med detta innehåll:

```bat
@echo off
echo Startar FamiljDokument...
start "FamiljDokument Server" cmd /c "npm run dev"
timeout /t 5 /nobreak > nul
echo Startar tunnel...
cloudflared tunnel --url http://localhost:5000
```

Dubbelklicka på `starta.bat` för att starta allt med ett klick.
