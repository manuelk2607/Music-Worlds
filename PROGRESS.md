# Music-Worlds — Fortschritt

## Produktive Worlds-Anmeldung – 12.11.2026

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
