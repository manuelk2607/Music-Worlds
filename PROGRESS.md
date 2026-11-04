# Music-Worlds — Fortschritt

Stand: 04.11.2026, Europe/Stockholm. Ziel: eigenständige Musikspielplattform unter https://music-worlds.maki26.workers.dev/ und https://github.com/manuelk2607/Music-Worlds.

## Erledigt
- P0: Privates Repository nach Existenzprüfung erstellt; eigener Worker und getrenntes Neon-Free-Projekt green-sound-19865298 (Frankfurt), Produktion br-proud-recipe-b9c8f33h, QA br-odd-snow-b9pi19w4. Drei idempotente, checksummengeprüfte Migrationen angewandt. Keine bezahlten Dienste aktiviert.
- P1: Vier Bereiche, eigene responsive Musikgestaltung, Katalog/Suche/Genre/Sammlungen, Metadaten, eigene Beiträge mit Bearbeitung/Rückzug, serverseitige Rechte-/Versionsprüfung, Dubletten, Moderation und Meldungen. YouTube-URL-Normalisierung, offizieller sichtbarer Player nach Zustimmung/Auflösung, Zeitparameter und Fehlerfallback. Private Upload-/Speicherverträge vorbereitet; keine öffentliche Audiofreigabe.
- P2: Portabler vorbereiteter Sprachwelten-Quizkern adaptiert. Errate das Lied für 1–10 Personen: Lobby, Einladungen, serverseitige Runden/Fristen, opake Multiple-Choice-IDs, Freitext, +1 Punkte, atomare Versionskontrolle, getrennte Anwesenheit, Wiederverbindung, Hostwechsel, aktuelle gestufte Hilfen, Ergebnisse und Rematch-Verlauf.
- P3: Sichere lokale Gastidentitäten, Einstellungen/Themes, Statistik, Erfolge, Bestenliste und Datenlöschung. Eingeschränkte DB-Laufzeitrolle music_worlds_app eingerichtet; Migrationsverwaltung für sie nachweislich gesperrt. Hub-OIDC-Stand geprüft: produktive Discovery weiterhin 404, Linking-Pilot nicht freigegeben. Adaptergrenze vorbereitet, kein konkurrierender zentraler Login.
- P4: 20 Unit-Tests und 66 echte isolierte PostgreSQL-Assertions bestanden, Typprüfung, ESLint, Build und vollständiger npm-Audit (0 bekannte Schwachstellen). Browser: zwei unabhängige Clients, Reload während Abstimmung, verdeckte Lösung, Punkte/Ergebnis, Katalogsuche, 390px-Profil, Theme sowie Beitragserstellung/-bearbeitung/-rückzug geprüft. Echter produktiver Solo-Durchlauf samt Statistik und anschließender Löschung seiner Testdaten erfolgreich.

## Datenübernahme / Sprachwelten
- Quelle HEAD 933c84110d4e4f98ce19fc8540ffb2f4ff1f4a34 geprüft. Lokaler älterer Transferkern übernommen; der aktuelle Remote enthielt ihn noch nicht.
- Alle 8 Songfragen samt Revisionen, Quellen und Übersetzungen read-only archiviert. Keine Audios, abhängigen Datensätze oder aktiven Songräume vorhanden. SHA-256 und isolierte Wiederherstellung geprüft; erneuter Vergleich bestätigt alle 8 Quellrows unverändert.
- Alle 8 Ursprungs-IDs und Legacy-Mappings im Ziel erhalten. 4 historische englische Fragen individuell als gemeinfrei geprüft/freigegeben. 4 französische Fragen bleiben wegen fehlender datierter Editionsnachweise privat (rights_unverified). Zusätzlich 8 neu formulierte Hinweise: aktuell 12 öffentliche Fragen, 10 Songs.
- Sprachwelten-Cutover umgesetzt: neue Auswahl/Beiträge/Live-Pools und öffentliche Sammlung auf Personenzitate beschränken, Music-Worlds verlinken; Altbearbeitung und gespeicherte Engine kompatibel halten. Kein Source-SQL-Delete. Nach abschließender Diffprüfung eine unbeabsichtigte Zungenbrecher-UI-Änderung korrigiert; vollständige erneute Prüfung: 196 Tests, Typen, Lint, Übersetzungen und Build erfolgreich. Minimatch-Update beseitigt vorhandene Auditmeldung. Cutover a31f1177b19e98fef3763feff062bc2979c19edd ist gepusht und produktiv (Cloudflare-Version 9e742f1a-b875-455e-9852-de77f1a0320a). Live-Sperren, Personenrunde und Zungenbrecher erfolgreich geprüft; alle 8 Quellrows nach Veröffentlichung exakt unverändert.

## Veröffentlichung / letzte konkrete Schritte
- Music-Worlds ist live. Vollständiger GitHub-Actions-Test-/Deploylauf [41801619849](https://github.com/manuelk2607/Music-Worlds/actions/runs/41801619849) erfolgreich: Commit f797dbcf3f26f74fa4de4f9e5540f1f5452d5938, Cloudflare-Version 9a25e2e8-4d9f-4c70-9147-d778457cb870. Alle vier Repository-Secrets vorhanden; separater Token und 0-$-Ausgabenlimit durch Nutzer bestätigt.
- Abschlussverbesserungen lokal vollständig geprüft: explizite Anbieteradapter (YouTube/externer Link), künftiger autorisierter Privatwiedergabevertrag, Schließen des unnötigen kompletten Fragen-/Lösungspools, direkte Meldung der aufgelösten Frage, strengere Live-Prüfung für Commit/SEO. 20 Unit-Tests, 66 echte DB-Assertions, Typen, Lint, Audit (0), Build bestanden.
- Echte Browserprüfung des sichtbaren offiziellen YouTube-Players einschließlich Nicht-verfügbar-Fehler und Quellenfallback erfolgreich; keine fremden Mediendateien gespeichert. Eigene QA-Fixtures entfernt.
- Nächster konkreter Schritt: diese Abschlussverbesserungen committen/pushen, denselben geprüften CI-Deploylauf ausführen, Live-Solo/SEO/Commit prüfen und finale Release-Nachweise ergänzen. Screenshot unter outputs/music-worlds-live.jpg.

## Bewusst gesperrt / externe Voraussetzungen
- Audio-/Nachweisuploads: private Adapter vorhanden, R2 nicht gebunden. Vor Aktivierung konkrete Speicher-/Medienprüfung und dokumentierte Rechte erforderlich; kein kostenpflichtiges Angebot aktiviert.
- Vier französische Originaltextfragen: datierte Edition/Schutzfristnachweise fehlen, bleiben erhalten und privat.
- Zentrales SSO: produktiver getesteter Hub-IdP/Client und sichere Linking-/Logout-Abnahme fehlen. Lokale Gastfunktion bleibt unabhängig.
- Nur `/` darf indexiert werden; alle weiteren Informations-, Spiel- und Kontoseiten bleiben noindex. Keine Search-Console-Property oder fremde Verifizierung übernommen; neue Property-Schritte dokumentiert.
- Verantwortlichen-/Kontakt- und langfristige Aufbewahrungsangaben vor größerer öffentlicher Nutzung vervollständigen. Der Nutzer hat deren SEO-Freigabe nicht gewünscht.

Private Secrets und Archivdaten liegen physisch in work/music-worlds-private (0700/0600), ausschließlich ignorierte lokale Verweise im Checkout. Nicht in Git oder in auszuliefernde Archive aufnehmen. Details: docs/OPERATIONS.md, RIGHTS.md, MIGRATION.md, SSO.md und VERIFICATION.md.
