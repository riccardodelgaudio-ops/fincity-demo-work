# FinCity — digitales Immobilien-Auktionsspiel (Demo)

## Grundidee
FinCity ist ein Spiel auf einer echten Schweizer Karte. Spieler ersteigern **digitale FinCity-Spielgebäude**, die realen Kartenstandorten zugeordnet sind — **nicht** die reale Immobilie oder irgendwelche Rechte daran. Ein ganzes Gebäude ist jeweils ein Spielobjekt. Keine Mieter, vermieteten Unterwohnungen, Strategie-Kopien, Depot- oder Asset Allocation.

## Neuer wöchentlicher Auktionskalender pro Stadt

| Wöchentliches Auktionsfenster | Start | Ende |
|---|---|---|
| City Drop 1 | **Montag, 20:00 Uhr** | **Freitag, 20:00 Uhr** |
| City Drop 2 | **Dienstag, 20:00 Uhr** | **Samstag, 20:00 Uhr** |
| City Drop 3 | **Mittwoch, 20:00 Uhr** | **Sonntag, 20:00 Uhr** |

- Diese Uhrzeiten gelten für **jede Stadt separat** und durchgehend in der Zeitzone **Europe/Zurich (MEZ/MESZ)**. Zeitumstellungen werden berücksichtigt.
- Es gibt in dieser Demo **drei feste Zeitfenster pro Stadt und Woche**. Das ältere Modell mit zwei Basisauktionen plus einer weiteren pro 250 Spielern wird vorläufig ausgesetzt.
- Die Spielerzahl bleibt als Demo-Information verfügbar. Ein künftig dynamisches Kontingent nach aktiven Nutzern oder Nachfrage muss separat abgestimmt werden.
- Jeder Wochenplan enthält eine **zufällige, aber nach Stadt und Kalenderwoche stabile Auswahl** aus noch nicht verkauften, freigegebenen Spielgebäuden. Die Auswahl bleibt beim Neuladen des Browsers bestehen. Dieselbe Immobilie kann nicht gleichzeitig auf zwei zeitlich überlappende Slots verteilt werden.
- Die Administration darf für **noch nicht gestartete** Slots das Gebäude ändern, die noch offenen Objekte neu mischen oder ein Los freilassen. Sobald das Zeitfenster beginnt, ist die Zuordnung gesperrt.
- Drei feste Slots garantieren **keine erfundenen Immobilien**: Falls nicht genügend freigegebene Objekte vorhanden sind, erscheint «Gebäude wird noch ausgewählt». Spieler können auf der realen Karte weitere Standorte vorschlagen; nur die Administration nimmt sie in den freigegebenen Pool auf.
- Bei fehlenden Geboten endet die Auktion ohne Verkauf. Ein solches Objekt darf später erneut angeboten werden; das nächste Auktionsereignis erhält eine **neue ID**, damit die alte Historie erhalten bleibt.

## Kleine Vorschau der nächsten Auktionen

Die Stadtübersicht und der Bereich «Auktionen» zeigen die **nächsten drei laufenden oder bevorstehenden** City Drops mit:
- Stadt und Gebäude,
- Starttag und Endtag, jeweils um 20:00 Uhr Schweizer Zeit,
- genauer Zeit-/Datumsangabe, Status (bald/live/beendet),
- soweit verfügbar Standort und Startpreis.

Auf grossen Desktop-Bildschirmen gibt es zusätzlich eine kompakte, dauerhaft sichtbare Vorschau rechts auf der Karte. Auf kleinen Bildschirmen bleibt die Vorschau innerhalb der Stadt-/Auktionsansicht zugänglich.

## Spielablauf

1. Stadt auf der Karte auswählen und die nächsten drei City Drops ansehen.
2. Aus dem vom Admin freigegebenen Gebäudevorrat wird pro Stadt/Woche eine wechselnde Vorauswahl erstellt; Admins können zukünftige Lose anpassen.
3. Beim Startzeitpunkt (Montag/Dienstag/Mittwoch **20:00 Uhr**) wird der zugeordnete City Drop **automatisch in der geöffneten Demo** als «live» markiert. Erst danach dürfen Spieler bieten. Das Höchstgebot wird im Demo-Konto reserviert.
4. Beim vorgesehenen Ende (Freitag/Samstag/Sonntag **20:00 Uhr**) wird die Auktion beim nächsten laufenden Browser-Abgleich abgeschlossen. Der Höchstbietende erhält bei gültigem Guthaben das digitale Gebäude; sein Guthaben wird belastet. Ohne gültiges Gebot endet sie ohne Verkauf.
5. Ein Eigentümer kann seine digitale Immobilie für einen Wiederverkauf **vorschlagen**; auch für diesen gilt die Admin-Freigabe und eines der festen Wochenfenster.
6. Ein gestarteter City Drop erzeugt eine lokale In-App-Meldung; echte Push-Nachrichten an andere Geräte sind noch nicht vorhanden.

**Wichtig:** Dieses Projekt ist aktuell eine **rein statische Browser-Demo**. Die zeitlichen Übergänge erfolgen nur bei geöffnetem/erneut geöffnetem Browser. Sie sind **keine echte serverseitig garantierte Uhrzeit-Automation**, und die Spielstände werden **nicht zwischen Geräten synchronisiert**. Für einen öffentlichen Multiplayer-Start braucht FinCity serverseitige Auktionen mit autoritativer Schweizer Zeit, gesicherte Admin-Berechtigungen, atomare Gebotsprüfungen, zuverlässige Jobs/Worker für den Abschluss und transaktionale Guthabenbuchungen.

## Anfangspreise

| Gebäudegrösse (Wohnungen ausschliesslich als Grössenmerkmal) | Digitaler Startpreis |
|---|---:|
| 1–4 Wohnungen | CHF 100 |
| 5–10 Wohnungen | CHF 200 |
| 11–20 Wohnungen | CHF 250 |
| über 20 Wohnungen | CHF 300 |

Keine Wohnung wird einzeln vermietet oder gehandelt. Gebäudegrössen in m² und genaue Adressen werden nur als verifiziert angezeigt, wenn die Daten vorliegen; ansonsten «nicht verifiziert» bzw. «Adresse wird geprüft». Die realen Kartenstandorte allein sind keine Grundbuchnachweise.

## Wertanzeige und Ranglisten

- **Verkaufte Immobilien:** Anzahl einzigartiger digitaler Spielgebäude mit bestätigtem Verkauf.
- **Plattformwert:** Summe der **jeweils letzten Zuschlagspreise** aller verkauften digitalen Gebäude. Ein Wiederverkauf ersetzt den vorherigen Betrag; er zählt nicht doppelt.
- **Persönlicher Immobilienwert:** Summe der letzten Zuschlagspreise aller Gebäude im persönlichen Spielbesitz — **keine Schätzung des Marktwerts echter Häuser**.
- Historische Demo-Beispielwerte sind **nicht live verifiziert**.

## Monumente und Stadtpreise (Konzeptvorschläge)

- **Höchster Jahreszuschlag:** grösste faire, abgeschlossene digitale Auktion in einer Stadt.
- **Bester Wiederverkauf:** prozentuale Wertsteigerung beim Verkauf (nur unabhängige Käufer und nach Mindesthaltedauer).
- **Stadtsammler:** mögliche Auszeichnung für Spielaktivität in unterschiedlichen Stadtteilen.

Monumente sind **digitale Auszeichnungen** und keine käuflichen Grundstücke. Bevor solche Auszeichnungen vergeben werden, sind konkrete Kriterien, Missbrauchsprüfungen (z. B. abgestimmte Käufe, Mehrfachaccounts, Bots) und allfällige steuerliche/rechtliche Aspekte festzulegen.

## Guthaben und Test-Kreditkarte

Diese Demo enthält **simuliertes Spielguthaben** (+CHF 100, +CHF 500, +CHF 1'000) und eine **simulierte Test-Kreditkartenbestätigung**, die erst nach explizitem Bestätigen Testguthaben verbucht. Es werden **keine Kreditkartennummern erfasst** und **keine echten Zahlungen ausgelöst**.

Vor einem Echtbetrieb sind ein Zahlungsdienstleister mit gehostetem Checkout, bestätigte serverseitige Webhooks, ein Buchungsledger, Rückerstattungen/Chargebacks, Betrugs- und Bot-Schutz sowie rechtliche/steuerliche Prüfungen notwendig. Der Browser darf nie allein über Guthaben oder Zuschläge entscheiden.

## Technischer Stand

- `weekly-auctions.js` berechnet die Schweizer Zeitfenster (einschliesslich Sommer-/Winterzeit) und die wochenabhängige, reproduzierbare Gebäudeauswahl.
- `game-mode.js` verwaltet lokale Wochenpläne, Auktionen, Guthaben, Profile, Admin-Zuordnung und Statusübergänge.
- `game-mode.css` und `index.html` zeigen die Stadtvorschau, den Auktionsplan und die kompakte Karten-Vorschau.
- `map-layers-fix.js` unterstützt neben numerischen IDs auch die String-IDs von vorgeschlagenen oder wiederverkauften Spielgebäuden.
- `generic-buildings.js` speichert Kartenstandort-Vorschläge lokal in einer Admin-Warteschlange.
- Das alte Investmentmodell ist aus der aktiven Oberfläche entfernt; Teile der ursprünglichen Karten-Seed-Daten enthalten aus Kompatibilitätsgründen noch historische Investmentbegriffe und werden vor Produktion bereinigt.
- Keine echte Multiplayer-Synchronisation, Authentifizierung, Push-Infrastruktur oder Kartenzahlung.
