# FinCity — digitales Immobilien-Auktionsspiel (Demo)

## Grundidee
FinCity ist ein Spiel auf einer echten Schweizer Karte. Ein User erwirbt **ein digitales FinCity-Spielgebäude** am echten Kartenstandort, **nicht** die echte Immobilie und keine Rechte daran. Ein Gebäude wird als Ganzes gehandelt. Keine Mieter, Mietwohnungen, Kopierstrategien, Anlegerdepots, Asset Allocation oder finanzielle Rendite.

## Spielablauf
1. Stadt auf der Karte auswählen, geplante und aktive City Drops ansehen.
2. Nur ein Administrator gibt die Auktionslose frei (in der Demo über einen klar gekennzeichneten **unsicheren Admin-Testschalter**).
3. Während einer aktiven Auktion bieten Spieler mit ihrem verfügbaren Spielguthaben. Das Höchstgebot wird reserviert.
4. Bei Auktionsende bekommt der Höchstbietende das digitale Spielgebäude, sein Guthaben sinkt und der neue Eigentümer erscheint im Profil.
5. Eigentümer können ihr digitales Gebäude für eine Zweitmarkt-Auktion **vorschlagen**; es braucht erneut einen Admin-Start.
6. Admin-Auktionsstarts erzeugen derzeit nur lokale In-App-Meldungen. Ein echtes Push-System ist noch nicht implementiert.

Alle Demo-Transaktionen werden im lokalen Browser gespeichert und sind **nicht für Multiuser-Betrieb geeignet**.

## Begrenztes Angebot / Knappheit
Vorläufige, testbare Formel für den wöchentlichen Auktionsstart je Stadt:

`Freigaben = min(10, 2 + floor(aktive_stadtspieler / 250))`

Beispiele: 100 aktive User → 2 Freigaben; 250 → 3; 500 → 4; maximal 10. Das Limit wird pro Stadt und Kalenderwoche bei **Auktionsstart**, nicht beim Auktionsende, verbraucht. Nicht freigegebene Gebäude bleiben vorgemerkt.

**Vor echtem Start definieren:** «aktive Stadtspieler» als eindeutige, verifizierte Accounts mit Aktivität in den letzten 7 Tagen; Bot- und Mehrfachaccount-Schutz; mögliche redaktionelle Obergrenze bei Nachfragespitzen und Stadtwechseln.

## Anfangspreise (nur digitale Spielgebäude)
Die **Gebäudegrundfläche** ist für die Preisempfehlung entscheidend, nicht die Anzahl Wohnungen oder Wohneinheiten. Die fünf Stufen sind ein FinCity-Spielvorschlag:

| Gebäudegrundfläche | Vorgeschlagener Startpreis |
|---|---:|
| bis 120 m² | CHF 100 |
| 121–250 m² | CHF 200 |
| 251–500 m² | CHF 300 |
| 501–900 m² | CHF 400 |
| über 900 m² | CHF 500 |

Die tatsächliche Grundfläche wird nach Möglichkeit aus dem amtlichen GWR (GAREA) übernommen. Alternativ kann die Karten-Geometrie als **geschätzte Grundfläche** dienen. Seed-Auktionen ohne amtliche Flächendaten nutzen eine als Demo gekennzeichnete Grössenklasse, ebenfalls ohne Bezug zu Wohnungszahlen. Ist die Grösse unbekannt, erscheint nur ein vorläufiger Mindeststartpreis von CHF 100. Bestehende laufende Auktionen behalten ihren ursprünglich ausgewiesenen Startpreis; noch nicht gestartete Demo-Auktionen werden angepasst. Der Betrag ist **keine Bewertung der realen Immobilie**. Echte Gebäude- und Adressverknüpfungen müssen vor einer Veröffentlichung anhand offizieller IDs geprüft werden.

## Wertanzeige und Ranglisten
- **Verkaufte Immobilien** = Zahl einzigartiger Spielgebäude mit bestätigtem Verkauf.
- **Plattformwert** = Summe der **jeweils letzten Zuschlagspreise** aller verkauften digitalen Gebäude. Ein Weiterverkauf ersetzt für dieses Gebäude den vorherigen Betrag (kein doppeltes Zählen).
- **Persönlicher Wert** = Summe der jeweils letzten Zuschlagspreise der eigenen Gebäude. Das ist ein historischer Spielwert, **kein geschätzter Marktwert**.
- Beispielhistorie der Demo wird separat als Demo-Beispielbasis behandelt. Die Zähler sind keine Live-Wirtschaftsdaten.

## Monumente: Vorschlag für Preise, nicht handelbare Immobilien
- **Jahres-Rekordzuschlag** je Stadt: höchster fair abgeschlossener Auktionskauf.
- **Bester Wiederverkauf**: prozentualer Wertzuwachs gegenüber dem vorherigen Zuschlag (nur unabhängige Handelspartner und Mindesthaltedauer).
- **Stadtsammler**: ggf. Auszeichnung für abwechslungsreiche Spielaktivität; nicht automatisch an die Person mit den meisten Einzahlungsmöglichkeiten.
- Ein Monument ist eine **digitale Auszeichnung/Profil-Trophäe**, niemals Eigentum am realen Monument. Die genauen Regeln, Häufigkeiten und Preisformen sind noch offen.

Bietabsprachen, künstliche Eigenkäufe, Wash-Trading, Mehrfachaccounts und Bots müssen vor der Vergabe geprüft werden.

## Guthaben und Kreditkarten
Diese Demo enthält ausschliesslich **simuliertes Testguthaben** (+100/+500/+1'000) und einen ausdrücklich **deaktivierten Kreditkarten-Button**. Es gibt keine Kartenerfassung und keine echten Zahlungen. Für einen echten Launch sind ein Zahlungsdienstleister mit gehostetem Checkout, serverseitige bestätigte Webhooks, Buchungsledger, Rückerstattungen, Chargeback-/Betrugsbearbeitung, sichere Rollen und entsprechende rechtliche/steuerliche Prüfungen erforderlich. Kein Guthaben oder Kaufzustand darf im Echtbetrieb vom Browser als alleiniger Wahrheitspunkt geführt werden.

## Technischer Stand / technische Schulden
- Das neue `game-mode.js` stellt Spiel-, Konto-, Ranglisten- und Admin-Ansichten bereit und überschreibt die ursprünglichen Anlegeransichten. `game-mode.css` ergänzt das Design.
- Die bisherige Karten-Engine und ihre statischen Seed-Daten existieren für Kompatibilität noch im Hintergrund; die alten Anleger-Skripte wurden aus `index.html` entfernt. Das vollständige Bereinigen der alten Datentypen (`investment`, `allocation` etc.) ist für einen echten Neuaufbau der Engine vorgesehen.
- Kein Backend, kein echter Account-Login, keine sichere Adminberechtigung, kein Multiuser-Bieten, keine Kartenzahlungen, keine echten Push-Benachrichtigungen.
- Die Demo-Daten dienen der Visualisierung; Gebäude- und Adressdaten vor echter Freischaltung verifizieren.
