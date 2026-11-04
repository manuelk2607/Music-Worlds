# Music-Worlds

Eigenständige Musikspielplattform für Freunde und Familie. Ziel: **https://music-worlds.maki26.workers.dev/**. Repository: https://github.com/manuelk2607/Music-Worlds (privat).

Vier Bereiche: **Spielen**, **Entdecken**, **Beitragen**, **Profil**. Ein konkreter Modus: **Errate das Lied**, solo oder mit bis zu zehn Personen, Multiple Choice oder freie Titelantwort. Ein Punkt pro richtiger Antwort; private Räume, serverseitige Fristen, Auflösung, Wiederverbindung, Hostwechsel, Rematches und Bestenliste.

## Architektur

TypeScript-Worker mit Static Assets, kleiner Browserclient ohne Frameworklaufzeit und eigener Neon-PostgreSQL-Datenbank. Sprachwelten-Konzepte und der lokal vorbereitete portable Quizkern wurden gezielt adaptiert; keine laufende Abhängigkeit von Sprachwelten oder Hub. SQL ist parametrisiert. Räume verwenden atomare Versionsvergleiche; Ergebnisse werden nur beim erfolgreichen Abschluss einmal gespeichert. Anwesenheit liegt getrennt vom Spielzustand. Private Rechtebelege gelangen nicht in öffentliche Projektionen.

`src/core/` enthält Mechanik, `src/domain.ts` Beitrag/Rechtevalidierung, `src/urls.ts` Medien-URLs, `src/media.ts` private Speicherverträge, `src/worker.ts` HTTP/Persistenz, `src/client.ts` UI. Migrationen unter `migrations/`, reproduzierbare Tests unter `tests/` und `scripts/`.

## Entwickeln und prüfen

Node 24+, `npm ci --ignore-scripts`, `.env.example` beachten. Für normalen Wrangler-Betrieb `DATABASE_URL`, `SESSION_PEPPER` und `ADMIN_TOKEN` als lokale `.dev.vars` oder Worker-Secrets bereitstellen. Wirkliche Werte niemals committen. `npm run dev` verwendet Wrangler; die projektspezifische QA-Hilfe `npx tsx scripts/dev.ts` erwartet eine private lokale `connections.json` und verwendet ausschließlich QA.

```sh
npm run typecheck
npm run lint
npm test
npm audit --audit-level=moderate
npm run build
# ausschließlich isolierte Testdatenbank; erzeugt und löscht eigene Testidentitäten
TEST_DATABASE_URL=... CONFIRM_ISOLATED_TEST_DATABASE=1 npm run test:integration
# direkter, nicht gepoolter Connection-String; bestehende Migrationen nie ändern
DATABASE_URL_UNPOOLED=... npm run db:migrate
DATABASE_URL_UNPOOLED=... npm run db:seed
npm run deploy
npm run smoke
```

Bei Sandbox-Betrieb Wrangler-Log/Registry und npm-Cache auf beschreibbare Projekt-/Temp-Verzeichnisse setzen; keine Systemverzeichnisse ändern. Lokale Dateien mit Secrets sind gitignoriert und mit 0600 geschützt.

## Betrieb

Gastprofile verwenden zufällige HttpOnly-/Secure-/SameSite-Cookies; keine E-Mail-/Passwortverwaltung. Profile und Daten können unter Profil gelöscht werden. Moderation unter `/#moderation`: separater `ADMIN_TOKEN`, nur im Arbeitsspeicher des Browsers. Er muss zusätzlich zur eigenen Sitzung vorhanden sein. Den zufälligen lokalen Schlüssel aus `.dev.vars` in einen Passwortmanager übernehmen; niemals in Tickets/Chat/Repository veröffentlichen.

Öffentliche Informationsseiten: `/`, `/spiele`, `/ueber`; individuelle Titel, Description, Canonical, Open Graph, JSON-LD, Sitemap. Auf ausdrücklichen Nutzerwunsch wird ausschließlich die Landingpage `/` indexiert. `/spiele`, `/ueber`, private Screens und APIs bleiben noindex; die Sitemap enthält nur `/`. Die QA bleibt vollständig noindex. Vor einer breiteren Freigabe Verantwortlichen-/Kontaktangaben, Rechtsraum und Datenschutzhinweise vervollständigen.

Siehe [Betrieb & Kosten](docs/OPERATIONS.md), [Rechte und Quellen](docs/RIGHTS.md), [Sprachwelten-Übernahme](docs/MIGRATION.md), [Worlds Hub](docs/SSO.md), [Prüfnachweise](docs/VERIFICATION.md), [Fortschritt](PROGRESS.md).
