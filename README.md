# FinCity – Digitales Immobilien-Auktionsspiel (Demo)

FinCity ist **ein Spiel auf einer echten Schweizer Karte**. Spieler erwerben ausschliesslich digitale FinCity-Spielobjekte, die einem realen Kartenstandort zugeordnet sind. **Keine Transaktion überträgt Eigentum, Besitz, Miet- oder sonstige Rechte an der realen Immobilie.**

## Produktmodell

- **Ein Gebäude = ein digitales Spielobjekt.** Keine mietbaren Unterwohnungen, Strategie-Kopien, Anlagen- oder Depotallokation.
- **City Drops:** Administratoren geben digitale Gebäude in Auktionen frei. Spieler bieten in Schritten von CHF 10, das höchste gültige Gebot gewinnt bei Beendigung der Auktion durch den Admin.
- **Reale Karte:** Kartenpositionen und Adressen stammen aus der bestehenden Schweiz-Demo; nicht verifizierte Adressen und Gebäudeflächen werden ausdrücklich als unbekannt markiert. Auf der Karte können weitere reale Gebäude als zukünftige digitale Auktionsobjekte vorgeschlagen werden.
- **Digitale Bestände:** Je Stadt werden erworbene Spielimmobilien, letzter Kaufpreis, Käufer, Stadtauktionen und Rangliste angezeigt. Der **Plattformwert** ist die Summe der letzten digitalen Verkaufspreise sämtlicher erworbener Spielgebäude, **keine** Bewertung realer Gebäude.
- **FinCity-Spielkonto:** Simuliertes CHF-Guthaben; Höchstgebote werden für den Käufer reserviert, beim Zuschlag abgezogen. Gutschriften über Testguthaben oder **simulierte** Kreditkartenzahlungen sind ausdrücklich keine realen Zahlungsflüsse.
- **Monumente:** Auf der Karte sichtbare Wahrzeichen sind nicht käufliche Prestige- bzw. Trophäenobjekte. Wettbewerbsregeln müssen noch festgelegt werden.

## Verfügbarkeit und Knappheit – vorläufiger Demo-Algorithmus

Pro Stadt und Kalenderwoche (Montag–Sonntag):

```
Freigaben = min(10, 2 + floor(aktive_Stadtspieler / 250))
```

Beispiele: 50 aktive Nutzer → 2 City Drops; 250 → 3; 500 → 4; 1'000 → 6; 2'000 → 10.

Nur der Admin startet Auktionen; jede gestartete Auktion verbraucht genau eine wöchentliche Freigabe. **Die Benutzerzahl wird in der Demo simuliert**, da es noch keine serverseitige Zählung aktiver, eindeutig registrierter Spieler gibt. Die Parameter sind eine erste Arbeitshypothese, keine endgültige Wirtschaftssimulation.

## Anfangspreise für neue Gebäude

| Reale Wohneinheiten als Grössenklasse | Digitaler Startpreis |
| --- | ---: |
| 1–4 | CHF 100 |
| 5–10 | CHF 200 |
| 11–20 | CHF 250 |
| ab 21 | CHF 300 |

Wohneinheiten dienen ausschliesslich der Einordnung von Gebäuden. **Es gibt keine mietbaren Wohnungen oder Slots**. Beim Wiederverkauf kann der Besitzer einen digitalen Startpreis vorschlagen; der Admin schaltet die Auktion frei.

## Mögliche Stadt-Wettbewerbe (noch nicht endgültig)

1. **Auktionsrekord der Stadt:** Höchster bestätigter Zuschlag des Kalenderjahres – möglicher digitaler Monument-Titel für den Käufer.
2. **Wiederverkaufs-Champion:** Beste bestätigte prozentuale Wertsteigerung beim Weiterverkauf. Vor einer Preisvergabe: Mindesthaltedauer, unabhängige Käufer und Ausschluss von abgesprochenen Käufen.
3. **Stadtsammler:** Sammlung digitaler Immobilien aus unterschiedlichen Vierteln oder Bezirken.

Monument-Titel werden in der Demo noch **nicht** automatisch vergeben. Echte geldwerte Prämien bedürfen eigener, vorher veröffentlichter Regeln und rechtlicher Prüfung.

## Technische Demo-Grenzen

Der Stand ist ein statischer HTML/CSS/JavaScript-Prototyp. Spielkonten, Auktionen, Administrator-Vorschau und Meldungen werden im `localStorage` des jeweiligen Browsers gespeichert. **Sie sind nicht über mehrere Nutzergeräte synchronisiert und können lokal manipuliert werden.** Es gibt keine echten User-Logins, keine serverseitigen Admin-Rechte, keine belastbare Auktionsabwicklung und keine echte Zahlungsabwicklung.

Die **Kreditkarten-Demo** fragt absichtlich keine Karteninformationen ab und löst keine Zahlung aus. Für den Livebetrieb werden ein Backend, eine verbindliche Gebotstransaktion, Zugriffssteuerung, Zahlungen über einen geprüften Zahlungsdienstleister, Rückerstattungsregeln und rechtliche Prüfung benötigt. Auch echte Push-Benachrichtigungen an weitere Geräte benötigen Backend, Zustimmung und einen Nachrichtendienst; derzeit existieren lokale In-App-Meldungen.

## Dateien und Aufruf

`index.html` lädt die vorhandene Karten-Engine und zuletzt `game-mode.js`. Letzteres ersetzt die früheren Anlegeransichten durch das Spiel. `game-mode.css` enthält die Spiel-Oberfläche. `generic-buildings.js` verbindet Karten-Auktionsvorschläge mit der lokalen Admin-Warteschlange. Alte Investmentfunktionen bleiben **nur aus Kompatibilitätsgründen in der historischen Basiskarte (`app.js` und Teilen von `city-network.js`) im Quelltext**; sie gehören nicht mehr zur aktiven Spieloberfläche und müssen vor einer Produktionsversion technisch bereinigt werden.

### Demo prüfen

1. `index.html` in einem Browser öffnen; in der Stadtansicht Auktionen und digitale Plattformwerte prüfen.
2. **Auktionen** → **ADMIN-DEMO** → Vorschau aktivieren → eine geplante Auktion starten (Wochenlimit beachten).
3. **Meldungen** öffnen und die neue In-App-Ankündigung sehen.
4. Ein digitales Haus öffnen, mit genügend Demo-Guthaben bieten und die Auktion im Admin-Modus beenden.
5. **Mein Konto** → **Guthaben aufladen** → eine simulierte Kreditkartenzahlung bestätigen.
6. Die Karte an einem weiteren Gebäude öffnen → **Digitalen City Drop vorschlagen** → im Admin-Bereich den Vorschlag übernehmen.
