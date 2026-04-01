# EV Price Watcher (Sverige)

Fristående projekt för att bevaka ändringar hos:
- Tesla Sverige
- Xpeng Sverige
- BYD Sverige
- Kia Sverige
- Regeringen (elbilspremie/stöd)
- Transportstyrelsen (bonus/malus/premie)

## Funktion
- Kör mot definierade källor.
- Extraherar rader med pris/ränta.
- Sparar snapshot i `state.json`.
- Skickar **endast kort sammanfattning när något ändrats**.
- Inkluderar direktlänk + förenklad TCO-påverkan över 36 månader.

## Körning
```bash
cd ev-price-watcher
npm run watch:run
```

## Webhook
```bash
cd ev-price-watcher
WEBHOOK_URL="https://din-webhook" npm run watch:run
```

## Schemaläggning (cron)
```bash
0 * * * * cd /path/to/familj-dokument/ev-price-watcher && /usr/bin/npm run watch:run >> /tmp/ev-price-watch.log 2>&1
```
