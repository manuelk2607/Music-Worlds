# Music-Worlds — Fortschritt

## Worlds-Anmeldung setzt den Einstieg fort – 24.11.2026

Nach bestätigter Worlds-Anmeldung kehrt Music-Worlds in demselben Tab zum
Spielbereich, zum Beitragsformular, zum eingeladenen Raum oder zur
Moderationsanmeldung zurück. Falls erst ein Profil erstellt oder übernommen
werden muss, folgt der Rücksprung danach. Der Tab verwirft das Ziel nach
einmaliger Nutzung oder nach 15 Minuten. Ein Raumcode bleibt im Tab.
Der registrierte Rücksprung zum Profil und die Berechtigungsprüfungen für
Räume, Beiträge und Moderation greifen wie bisher.

26 Tests, Typprüfung, Lint und Worker-Build bestanden. Chromium DE am Desktop
prüfte die Rückkehr zum Beitragsformular nach einer Profilerstellung. WebKit
EN bei 320 px prüfte einen privaten Raumeinladungslink mit bestehendem Profil.
Beide nutzten simulierte Auth-Antworten und prüften die einmalige Rückkehr.

## Verbleibendes Gastprofil geprüft – 24.11.2026

Der Produktionsabgleich zählt zwei Profile. Eines ist über Worlds verknüpft.
Zum zweiten gehören acht Beiträge und keine Spielergebnisse. Für dieses
Profil gibt es keine gespeicherte Gastsitzung, keine frühere zentrale
Zuordnung, keine archivierte Quellautor-Referenz und keinen gültigen
Übernahmenachweis. Die vorhandene Selbstübernahme wäre selbst bei
allgemeiner Freischaltung für dieses Profil nicht nutzbar. Profil und
Beiträge wurden unverändert belassen. Für eine Übernahme ist ein
unabhängiger, überprüfbarer Eigentumsnachweis erforderlich.

## Automatischer Migrationsversand korrigiert – 24.11.2026

Das gemeinsame Auth-Paket 0.1.7 verwendet Cloudflares unterstützten
Weiterleitungsmodus und weist 3xx-Antworten ab. Die Warteschlange behält
ihren Eintrag bei einem Fehler. 24 Tests, Typprüfung, Lint und Worker-Build
bestanden. Die Veröffentlichung verwendet den vorhandenen Worker-Schlüssel
und denselben Zeitplan.
`f798f88` läuft als Worker `7c0341bc-0e38-4570-94ef-73b3cfad5039`.
[GitHub und Produktionsprüfung](https://github.com/manuelk2607/Music-Worlds/actions/runs/45389185697)
bestanden mit Worlds-Anmeldung, Logout, Katalog und 03:17-UTC-Zeitplan.
Die Schema-Prüfung musste keine Migration anwenden. Rücknahmeversion
`8e97e0e5`. Ein automatischer Lauf mit neuem Nachweis steht aus.

## Zentraler Migrationsnachweis produktiv – 23.11.2026

Der produktive Nur-Lese-Abgleich bestätigt genau eine bestehende
Zuordnung. Migration 008 kennzeichnet eine Gastprofilübernahme direkt
bei der bestätigten Zuordnung und erfasst ihren Widerruf. Für die
bereits bestätigte Übernahme kann nur das exakt freigegebene Paar aus
dem bestehenden Worker-Secret nachgetragen werden. Ein im selben
Schritt neu angelegtes Worlds-Profil fällt auch dann aus dem Nachtrag,
wenn es als Ziel angegeben wird. Ein wiederholter Nachtrag erzeugt
keinen weiteren Nachweis.

Der signierte Sender greift über die eingeschränkte Music-Worlds-Rolle
und eng begrenzte Datenbankfunktionen auf offene Nachweise zu. Nur der
exakte Produktions-Worker mit eigener Signatur darf zum fest
konfigurierten Hub-Endpunkt senden. Der Versand nutzt den bisherigen
täglichen Cron. Das neue Worker-Secret aktiviert ihn. Die Hub-Datenbank
benötigt keine weitere Migration.

24 Unit-Tests, Typprüfung, Lint, Sicherheitscheck und Worker-Build
bestanden. Lokale PostgreSQL-Prüfung mit der eingeschränkten Rolle:
eindeutiger Nachtrag, Ausschluss von Neuprofilen, Quittierung und
Widerruf nach Löschung. [GitHub QA](https://github.com/manuelk2607/Music-Worlds/actions/runs/45267464276)
bestand einschließlich des bestätigten Gastprofil-Ablaufs.
Produktives Paar stimmt mit der bereits bestätigten Slop-Identität überein.
Neon-Sicherung `br-mute-dust-b9q9wt0a`, LSN `0/212BF68`, ohne Compute
und bereit. Migration 008 ist produktiv. Prüfsumme und eingeschränkte
Funktionen bestätigt. Der direkte Lesezugriff auf das Audit und das
Ändern von Zuordnungen bleiben für die Laufzeitrolle gesperrt.

`8069540` ist als Worker `8e97e0e5-e8ec-413a-b28f-9df8e8852bc4` live.
[GitHub-Release](https://github.com/manuelk2607/Music-Worlds/actions/runs/45268081000)
bestand mit QA und produktivem Smoke-Test für Anmeldung, Abmeldung und
Zugriffsschutz. Vorherige Worker-Version `5af39fb2`. Der signierte
Einzellauf bestätigte Revision 1 ohne Konflikt. Die Prüfsummen von zwei
Profilen, 16 Beiträgen, null Spielresultaten und der einen Zuordnung
stimmen überein. Der automatische Versand ist eingerichtet. Eine
automatische Zustellung und die persönliche Kontoansicht sind für
Music-Worlds noch nicht beobachtet.

## Neuanlage nur über Worlds produktiv – 17.11.2026

Im Worlds-Modus konnte ein direkter Aufruf der alten Gast-API weiterhin
ein zweites Profil anlegen. Die API verlangt bei einer Neuanlage jetzt
die Worlds-Anmeldung. Eine bereits gültige Gastsitzung gibt weiterhin
ihre bestehende Profil-ID zurück. Der Rückfallmodus kann wie bisher
Gastprofile anlegen. Es ist keine Datenbankmigration nötig.
23 Tests, Typprüfung, Lint und Worker-Build bestanden. Die zusätzliche
Integration prüft die Ablehnung ohne Cookie und mit ungültigem Cookie,
die Wiederverwendung eines vorhandenen Profils und die bestätigte
Übernahme.

Der neue Auditbefund für `picomatch` kam aus der TypeScript-Lint-Kette.
ESLint nutzt jetzt Babel ausschließlich zum Parsen von TypeScript. Dieselben
Regeln und Dateien bleiben aktiv; der Worker hat keine neue Abhängigkeit.
23 Tests, Typprüfung, Lint, sechs gezielte Syntax-/Regelproben, Audit
(0 Befunde) und Worker-Trockenlauf bestanden. Die Freigabeprüfung läuft
erfolgreich gegen dieselbe vorhandene Testdatenbank: 87 Integrationsprüfungen
und der separate Test für Worlds-Anmeldung und Profilübernahme.
[GitHub-Prüfung](https://github.com/manuelk2607/Music-Worlds/actions/runs/44170143756)
Der Release erhält die bestehenden Worker-Einstellungen. Der Live-Test
prüft auch die Sperre für neue Gastprofile und den Empfänger für globale
Abmeldung. Bei einem fehlgeschlagenen Live-Test stellt der Workflow nur
dann den vorherigen Worker wieder her, wenn sein Upload weiterhin aktiv ist.

`76eb5da` läuft als Worker-Version `5af39fb2-c8fb-4465-b22e-ea98a7520892`.
Rücknahmeversion: `33431568-a564-4cb5-8dce-5329bc30693c`.
Der [Produktionslauf](https://github.com/manuelk2607/Music-Worlds/actions/runs/44170781249)
bestand 23 Tests, 87 Datenbankprüfungen, den separaten Worlds-Test und den
Live-Smoke. Ohne Anmeldung legt die alte API kein Profil und kein Cookie
an; PKCE-Anmeldung und Abmelde-Empfänger bleiben erreichbar. Der Vergleich
vor und nach dem Release bestätigt unveränderte Prüfsummen für zwei
Profile, 16 Beiträge, null Ergebnisse und eine bestehende Zuordnung.
Ein zweites Altprofil bleibt für einen nachgewiesenen Eigentümer offen.

## Übernahme eines bestehenden Gastprofils – 16.11.2026

Nur das ausdrücklich ausgewählte Kontopaar ist produktiv freigeschaltet.
Commit `c7936bb`, Worker `759b3fdd-da23-4369-9667-302ae5bc8bc1`, Deployment
`f4f07b8e-910a-44c3-9e84-6941513b2883`, 100 % Traffic. Rücknahmeversion
`637db59b-e68e-4085-971a-c1f9dc951068`.
Der Neon-Sicherungszweig `br-frosty-bar-b90srija` ist bereit, ohne
Compute, mit LSN `0/1FEFC68` direkt von Main.

[GitHub CI](https://github.com/manuelk2607/Music-Worlds/actions/runs/43768076585)
bestand für den veröffentlichten Commit. Live-Smoke bestätigte öffentliche
Seiten, PKCE, SEO, Datenschutz und die Ablehnung anonymer Übernahme.
Nach der persönlichen Bestätigung meldete die Seite eine aktive
Worlds-Anmeldung. Die Produktionsdatenbank bestätigt genau eine Zuordnung
zur ursprünglichen Gastprofil-UUID, eine aktive Worlds-Sitzung mit
verifiziertem Anmeldezeitpunkt und dieselbe zentrale Identität wie in
Slop Urself. Beide Musikprofile, alle 16 Beiträge und die leere
Ergebnistabelle behalten ihre Prüfsummen. Der Einmalnachweis wurde verbraucht.
Das zweite Musikprofil ist weiterhin nicht verknüpft.

Der geprüfte Übergang ist auf genau eine zentrale Identität und genau
eine vorhandene Musikprofil-UUID begrenzbar. Beide Sitzungen sind für
die erneute Anmeldung, Vorschau und ausdrückliche Bestätigung erforderlich.
Fehlende oder ungültige Freigabe schließt die Übernahme. Das vorab
ausgewählte Worlds-Konto kann auch ohne Gastcookie kein zweites Profil anlegen.
Die Profilansicht verweist dann auf den Browser mit der bisherigen Sitzung.
Chromium am DE-Desktop (1440 px) und WebKit mobil auf EN (320 px) haben
beide Ansichten geprüft.

23 Unit-Tests, Typprüfung, Lint und Worker-Trockenlauf bestanden.
Der isolierte PostgreSQL-Test bestätigte den Erhalt von Profil-UUID,
Punkten und Sprache sowie die Ablehnung anderer Kontopaare, abgelaufener
Nachweise und doppelter Bestätigung. Die bestehende Migration 006 genügt.

## Produktive Worlds-Anmeldung – 12.11.2026

**Live seit 11:26 UTC.** Commit `48af04e` läuft als Cloudflare-Version
`637db59b-e68e-4085-971a-c1f9dc951068`. GitHub **43209000635** bestand
23 Unit-Tests, 87 Prüfungen mit dem vorhandenen QA-PostgreSQL, die
OIDC- und Gastprofilprüfung, Migrationen 005–007 und den Live-Smoke.
Der öffentliche Worker meldet `hubAuth: true`. Der Startlink antwortet
mit der registrierten Callback-Adresse, PKCE S256 und hostgebundenem
Cookie. Am 15.11. bestätigte der Kontoinhaber den echten Rücksprung zu
„Dein bisheriges Musikprofil“. Die Produktionsdatenbank meldete eine
aktive Worlds-Sitzung, zwei Musikprofile und null Zuordnungen. Die
Oberfläche erkennt die bisherige Gastsitzung und bietet kein Duplikat an.
Nach dem Release weiterhin zwei Profile, eine aktive Gastsitzung,
16 Beiträge und null Ergebnisse. Die drei Prüfsummen stimmen überein.
Es wurden noch keine bestehenden Music-Profile verknüpft.

Der erste Lauf **43208753639** stoppte vor der Produktionsmigration,
weil der QA-Zugang die Pooler-Adresse desselben Endpunkts verwendete.
Der Test normalisiert diese Adresse und prüft anschließend exakt
Endpunkt und Datenbankname.

Der vorhandene Release-Workflow kann den registrierten produktiven OAuth-
Client freischalten. Vor dem Deployment prüft er den Anmeldeablauf und die
Gastübernahme mit der bestehenden QA-Datenbank. Ein gültiges Gastprofil
im selben Browser sperrt die Neuanlage eines zweiten Musikprofils. Die
bisherige Gastsitzung bleibt nutzbar. Die produktive Verknüpfung wird nach
der echten Callback-Abnahme separat aktiviert.

Cloudflare-Ausgangsversion `b8ec5cbf` hatte 100 Prozent Traffic.
Neon-Ausgangspunkt am 12.11.2026 um 11:22:54 UTC, WAL-Position `0/1EB5F68`,
innerhalb des sechs Stunden langen Wiederherstellungsfensters. Vor dem
Release zwei Profile, eine aktive Gastsitzung, 16 Beiträge, null Ergebnisse
und keine Mapping-Tabelle. Prüfsummen für Profile, Beiträge und Ergebnisse
wurden für den Nachvergleich erfasst. Bei einem Rücknahmebedarf die
Cloudflare-Ausgangsversion aktivieren. Die additiven Tabellen enthalten
keine Änderungen an den bisherigen Profilen oder Beiträgen.

## Zentrale Abmeldung – 12.11.2026

Der Worlds-Client 0.1.5 akzeptiert signierte Sitzungswiderrufe vom Hub. Migration
007 beendet die bisherigen Worlds- und Gast-Sitzungen des verknüpften Profils.
Auch eine erst nach dem Widerruf gespeicherte Zuordnung beendet das alte
Gast-Token. Beiträge und Profil-IDs bleiben erhalten. Eine neuere zentrale
Anmeldung und Sitzungen anderer Profile funktionieren weiterhin.

23 lokale Tests, Typprüfung, Lint und Worker-Trockenlauf bestanden. Migration
007 wurde in lokalem Postgres zweimal mit dem bestehenden Migrationsformat
angewendet und mit der eingeschränkten Worker-Rolle geprüft. Der Test gegen
den separaten QA-Datenbankzweig läuft über den GitHub-Prüfworkflow.
Für eine Abnahme sind Migration 007 und der öffentliche
`WORLDS_HUB_SESSION_EVENT_JWK` erforderlich. Produktionsaktivierung steht aus.

## Zentrale Anmeldelinks – 08.11.2026

Im aktivierten Worlds-Modus führen Profil-/Anmeldeaktionen direkt über
`/auth/start` zur zentralen Anmeldung. Es gibt dabei kein neues lokales
Namens-/Passwortformular; gültige bestehende Gastprofile bleiben verwendbar.
Die Profiltexte unterscheiden Worlds-Anmeldung und lokale Gastverwaltung in
DE/EN. Links verwenden die bestehenden Schaltflächenstile. Gemeinsamer Client
0.1.3 ist mit Subtree-Provenienz und Dateiprüfsummen vendort. PKCE, Serverlimits,
Redirect-Allowlist, Sprache und hostgebundene Transaktion bleiben erhalten.

23 Tests, Typprüfung, Lint, Build und Worker-Trockenlauf bestanden. Chromium und
WebKit prüften beide Sprachen bei 320/1280 px mit lokalen Testantworten: direkte
Links, lokalisierte Profiltexte, Touch-Größe, Sprachwechsel und kein zusätzliches
lokales Anmeldeformular. Reale Providerabnahme bleibt offen. GitHub-Lauf `42514848840` für `01e95bd` vollständig erfolgreich, einschließlich
bestehender isolierter Datenbankintegration und Produktionsaudit. Produktionsflag
`HUB_AUTH_ENABLED=false` unverändert; kein Deployment/Account-Cutover ausgelöst.

Produktion read-only: 2 Profile, eines mit aktiver Sitzung, 16 Beiträge und null
Ergebnisse. Reserviertes `hub_subject` ist bei keinem Profil gesetzt; produktive
Mapping-Tabellen fehlen. Keine lokale ID, Sitzung, Rolle oder Inhaltsbeziehung
geändert. Offene Aufgaben: sichere bestehende Gast-/Worlds-Zuordnung ohne
Namens-/E-Mail-Automerge, echte Migration/Rücknahme, vollständige Dokumentansicht
bei Providerfehlern und projektübergreifender Logout.

Stand: 04.11.2026, Europe/Stockholm. Ziel: eigenständige Musikspielplattform unter https://music-worlds.maki26.workers.dev/ und https://github.com/manuelk2607/Music-Worlds.

## Erledigt

Nachprüfung 07.11.2026. Der bestehende SSO-Featurebranch verwendet den
gemeinsamen OIDC-Client 0.1.1 mit `max_age=300` und prüft den signierten
Anmeldezeitpunkt. Der Hub-QA-Anbieter bestätigte den Codeflow für aktuelle
und ältere Sitzungen mit positivem Zeitfenster. 22 Tests, Typprüfung,
Lint und Build samt Worker-Trockenlauf bestanden. Die echte Music-Abnahme
mit Gastverknüpfung und Rücknahme ist vor der Aktivierung erforderlich.

- Sprachumschaltung DE/EN vollständig ergänzt: zentrale getrennte Kataloge, Browsererkennung mit DE-Fallback, dauerhafte lokale und profilgebundene Auswahl, mobiler barrierefreier Schalter sowie Zustands-/Raumerhalt. Navigation, Auth/Profile, Beiträge, Spiel/Lobby, Dialoge, Meldungen und Serverfehler sind lokalisiert; Datum, Zeit, Zahlen und Prozente verwenden `Intl`. Nutzergenerierte Inhalte bleiben unverändert und erhalten, soweit bekannt, ein eigenes `lang`-Attribut.
- Lokalisierte öffentliche Pfade und SEO umgesetzt: DE `/`, `/spiele`, `/ueber`; EN `/en`, `/en/games`, `/en/about`; Canonical, `hreflang`, `lang`, Open Graph und JSON-LD konsistent. Nur `/` und `/en` als äquivalente Landingpage-Varianten indexierbar, alle weiteren Seiten noindex. Explizites `language`-Profilfeld und Hub-Vertrag für spätere zentrale Präferenz vorbereitet; keine Cookie-Freigabe zwischen Anwendungen.
- Sprachrelease lokal geprüft: 22 Unit-Tests, 73 isolierte PostgreSQL-Assertions, Typprüfung, ESLint, Build und npm-Audit (0 Schwachstellen) erfolgreich. Browserprüfung in DE/EN einschließlich Navigation, Profil, Beitragsformular, unverändertem Nutzerinhalt und 390×844-Mobilansicht bestanden.
- P0: Privates Repository nach Existenzprüfung erstellt; eigener Worker und getrenntes Neon-Free-Projekt green-sound-19865298 (Frankfurt), Produktion br-proud-recipe-b9c8f33h, QA br-odd-snow-b9pi19w4. Vier idempotente, checksummengeprüfte Migrationen definiert; die Sprachmigration ist in QA angewandt und wird beim Produktionsdeployment ausgeführt. Keine bezahlten Dienste aktiviert.
- P1: Vier Bereiche, eigene responsive Musikgestaltung, Katalog/Suche/Genre/Sammlungen, Metadaten, eigene Beiträge mit Bearbeitung/Rückzug, serverseitige Rechte-/Versionsprüfung, Dubletten, Moderation und Meldungen. YouTube-URL-Normalisierung, offizieller sichtbarer Player nach Zustimmung/Auflösung, Zeitparameter und Fehlerfallback. Private Upload-/Speicherverträge vorbereitet; keine öffentliche Audiofreigabe.
- P2: Portabler vorbereiteter Sprachwelten-Quizkern adaptiert. Errate das Lied für 1–10 Personen: Lobby, Einladungen, serverseitige Runden/Fristen, opake Multiple-Choice-IDs, Freitext, +1 Punkte, atomare Versionskontrolle, getrennte Anwesenheit, Wiederverbindung, Hostwechsel, aktuelle gestufte Hilfen, Ergebnisse und Rematch-Verlauf.
- P3: Sichere lokale Gastidentitäten, Einstellungen/Themes, Statistik, Erfolge, Bestenliste und Datenlöschung. Eingeschränkte DB-Laufzeitrolle music_worlds_app eingerichtet; Migrationsverwaltung für sie nachweislich gesperrt. Hub-OIDC-Stand geprüft: produktive Discovery weiterhin 404, Linking-Pilot nicht freigegeben. Adaptergrenze vorbereitet, kein konkurrierender zentraler Login.
- P4: 20 Unit-Tests und 66 echte isolierte PostgreSQL-Assertions bestanden, Typprüfung, ESLint, Build und vollständiger npm-Audit (0 bekannte Schwachstellen). Browser: zwei unabhängige Clients, Reload während Abstimmung, verdeckte Lösung, Punkte/Ergebnis, Katalogsuche, 390px-Profil, Theme sowie Beitragserstellung/-bearbeitung/-rückzug geprüft. Echter produktiver Solo-Durchlauf samt Statistik und anschließender Löschung seiner Testdaten erfolgreich.

## Datenübernahme / Sprachwelten
- Quelle HEAD 933c84110d4e4f98ce19fc8540ffb2f4ff1f4a34 geprüft. Lokaler älterer Transferkern übernommen; der aktuelle Remote enthielt ihn noch nicht.
- Alle 8 Songfragen samt Revisionen, Quellen und Übersetzungen read-only archiviert. Keine Audios, abhängigen Datensätze oder aktiven Songräume vorhanden. SHA-256 und isolierte Wiederherstellung geprüft; erneuter Vergleich bestätigt alle 8 Quellrows unverändert.
- Alle 8 Ursprungs-IDs und Legacy-Mappings im Ziel erhalten. 4 historische englische Fragen individuell als gemeinfrei geprüft/freigegeben. 4 französische Fragen bleiben wegen fehlender datierter Editionsnachweise privat (rights_unverified). Zusätzlich 8 neu formulierte Hinweise: aktuell 12 öffentliche Fragen, 10 Songs.
- Sprachwelten-Cutover umgesetzt: neue Auswahl/Beiträge/Live-Pools und öffentliche Sammlung auf Personenzitate beschränken, Music-Worlds verlinken; Altbearbeitung und gespeicherte Engine kompatibel halten. Kein Source-SQL-Delete. Nach abschließender Diffprüfung eine unbeabsichtigte Zungenbrecher-UI-Änderung korrigiert; vollständige erneute Prüfung: 196 Tests, Typen, Lint, Übersetzungen und Build erfolgreich. Minimatch-Update beseitigt vorhandene Auditmeldung. Cutover a31f1177b19e98fef3763feff062bc2979c19edd ist gepusht und produktiv (Cloudflare-Version 9e742f1a-b875-455e-9852-de77f1a0320a). Live-Sperren, Personenrunde und Zungenbrecher erfolgreich geprüft; alle 8 Quellrows nach Veröffentlichung exakt unverändert.

## Veröffentlichung / Abschluss
- DE/EN-Anwendungscode committed/gepusht: `1c9ac77aea383b5106e625a2a2dabcf6a3d85821`. Vollständiger GitHub-Actions-Test-/Deploylauf [41896974341](https://github.com/manuelk2607/Music-Worlds/actions/runs/41896974341) erfolgreich: 22 Unit-Tests, 73 echte isolierte DB-Assertions, Typen, Lint, Audit (0), Build, Produktionsmigration `004_profile_language`, Deployment und bilingualer Live-Smoke.
- Sprachrelease produktiv veröffentlicht am 04.11.2026 um 19:27:35 UTC, Cloudflare-Version `b8ec5cbf-ec12-4b95-b624-6440487021e7`. Nach dem Workflow erneut alle sechs öffentlichen DE-/EN-Pfade, Sitemap/Robots, Assets, Health, Datenschutz-/CSRF-Grenzen und erwartete Commit-ID live geprüft. Zusätzlicher echter englischer Solo-Durchlauf mit Lobby, Einstellungen, verdeckter Lösung, serverseitiger Antwort, Punkten, Abschluss und persistierter Statistik bestanden; ausschließlich seine automatisch erzeugten Testdaten gelöscht.
- Finale Anwendung committed/gepusht: `f75ee9b6c29a91c1079bd5414a9c7294cbf519d1`. Vollständiger GitHub-Actions-Test-/Deploylauf [41804115829](https://github.com/manuelk2607/Music-Worlds/actions/runs/41804115829) erfolgreich: 20 Unit-Tests, 66 echte isolierte DB-Assertions, Typen, Lint, Audit (0), Build, Produktionsmigrationen und Live-Smoke.
- Produktiv veröffentlicht am 04.11.2026 um 09:02:57 UTC: Cloudflare-Deployment `74e57308-8536-42ce-bca3-9c27e9deb2f2`, Version `ccc44cfd-cd08-4860-85e8-8fb673499987`. Health meldet exakt den Anwendungscodecommit; Datenbank gesund, Hub/Uploads wie vorgesehen deaktiviert.
- Nach Veröffentlichung erneut live geprüft: Seiten/Assets 200, Landingpage index, weitere Seiten noindex, Sitemap genau eine URL, Katalog 12 Fragen/10 Songs, private Route 401/no-store und CSRF 403. Echter Solo-Durchlauf mit Lobby, verdeckter Lösung, Antwort, Punkten, Ergebnis und persistenter Statistik bestanden; nur seine eigenen Testdaten danach gelöscht. Authentifizierter kompletter Frage-/Lösungspool 404.
- Browser neu geladen, funktionsfähige Landingpage bestätigt und Screenshot unter outputs/music-worlds-live.jpg aktualisiert. Zuvor echte Zwei-Client-/Mobile-/Beitrags- und offizielle YouTube-Fehlerfallprüfung bestanden. QA-Fixtures entfernt.
- Abschlussverbesserungen: Anbieteradapter (YouTube/externer Link), künftiger autorisierter Privatwiedergabevertrag, direkte Meldung der aufgelösten Frage, geschlossener Sammelzugriff auf Lösungen, strengere Commit-/SEO-Prüfung.
- Sprachwelten-Anwendungscode `a31f1177b19e98fef3763feff062bc2979c19edd` live geprüft; dokumentarischer Folgecommit `edee8a0f138f70d79b3f27cf81622f2d0b5f77cb` gepusht. 196 Source-Tests, keine Quelldatenänderung. Keine weiteren Source-Laufzeitänderungen erforderlich.
- Alle vier Repository-Secrets eingerichtet und praktisch geprüft. Nutzer bestätigte separaten Token und 0-$-Actions-Ausgabenlimit. Keine bezahlte Ressource beauftragt.
- P0–P4 für den freigegebenen Umfang abgeschlossen. Die letzte Aktualisierung nach dem obigen Anwendungscode betrifft ausschließlich Dokumentation; keine Laufzeitabweichung. Abnahmematrix und nächste optionale Freigabeschritte: docs/ACCEPTANCE.md. Keine verbleibende Implementierungsblockade.

## Bewusst gesperrt / externe Voraussetzungen
- Audio-/Nachweisuploads: private Adapter vorhanden, R2 nicht gebunden. Vor Aktivierung konkrete Speicher-/Medienprüfung und dokumentierte Rechte erforderlich; kein kostenpflichtiges Angebot aktiviert.
- Vier französische Originaltextfragen: datierte Edition/Schutzfristnachweise fehlen, bleiben erhalten und privat.
- Zentrales SSO: produktiver getesteter Hub-IdP/Client und sichere Linking-/Logout-Abnahme fehlen. Lokale Gastfunktion bleibt unabhängig.
- Nur die Sprachvarianten derselben Landingpage (`/` und `/en`) dürfen indexiert werden; alle weiteren Informations-, Spiel- und Kontoseiten bleiben noindex. Keine Search-Console-Property oder fremde Verifizierung übernommen; neue Property-Schritte dokumentiert.
- Verantwortlichen-/Kontakt- und langfristige Aufbewahrungsangaben vor größerer öffentlicher Nutzung vervollständigen. Der Nutzer hat deren SEO-Freigabe nicht gewünscht.

Private Secrets und Archivdaten liegen physisch in work/music-worlds-private (0700/0600), ausschließlich ignorierte lokale Verweise im Checkout. Nicht in Git oder in auszuliefernde Archive aufnehmen. Details: docs/OPERATIONS.md, RIGHTS.md, MIGRATION.md, SSO.md und VERIFICATION.md.
