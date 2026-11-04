# Betrieb und Kosten

Stand 04.11.2026. Verbindlicher Worker `music-worlds`, Origin https://music-worlds.maki26.workers.dev/, bestehendes Konto ec3c070d8e4f88d2fc533d7d797f2daa. Vor Anlage über Wrangler geprüft: gleichnamiger Worker fehlte. Eigenes privates GitHub-Repository und eigenes Neon-Free-Projekt `green-sound-19865298`, Region Frankfurt. Produktionsbranch `br-proud-recipe-b9c8f33h`, isolierte QA `br-odd-snow-b9pi19w4`. Andere Projektressourcen werden nicht benutzt.

## Kostenrahmen

Neon-Organisationstarif über API als Free bestätigt. [Aktuelle Preisseite](https://neon.com/pricing) nennt 100 CU-Stunden und 1 GB je Free-Projekt. Dieses Projekt ist zusätzlich auf 0,25 CU, 7200 Compute-Sekunden, 512 MiB logische Daten und 1 GiB Transfer begrenzt; die genaue Quotenabrechnung ist im Dashboard zu prüfen. Der kostenlose Standard-Suspendwert wurde beibehalten; ein eigener Suspend-Override wurde vom Free-Konto abgewiesen und nicht erzwungen. QA zum Testen nutzen, nicht dauerhaft pollen lassen.

[Cloudflare-Grenzen](https://developers.cloudflare.com/workers/platform/limits/): Free-Worker haben eine tägliche Request-/CPU-Grenze. Der dokumentierte Free-Rahmen umfasst 100.000 Worker-Anfragen/Tag und 10 ms CPU je HTTP-Anfrage; andere Workers teilen Kontogrenzen. Es wurde kein Tarifwechsel vorgenommen. Kein R2, KV, D1, Durable Object, bezahlter Builddienst, KI- oder GPU-Dienst angelegt. Die Anwendung nutzt nur Worker/Assets, eine Rate-Limit-Bindung und Neon. Zielkosten derzeit **0 zusätzlich gebuchte laufende Kosten**; keine Behauptung über eine abschließende Anbieterrechnung.

300 Leseanfragen/Minute je IP erlauben zehn Personen hinter demselben Anschluss. Zusätzliche begrenzte Datenbankzähler schützen Sitzungsanlage, Beiträge, Räume und Meldungen. Raum-Polling alle drei Sekunden, bei verborgenem Tab/Fehlern langsamer. Zehn Personen verursachen ungefähr 12.000 Poll-Anfragen je Stunde. Zwei Leseabfragen plus Anwesenheits-/Freigabeabfragen können die Datenbank aktiv halten: Free-Limits und Quoten regelmäßig prüfen, keine automatische kostenpflichtige Hochstufung.

## Secrets und Deployment

Worker-Secrets: DATABASE_URL (gepoolt; separater eingeschränkter music_worlds_app-Login), SESSION_PEPPER, ADMIN_TOKEN. Datenbankadministrator-Connection nur für Migrationen. Der Laufzeitrolle wurden ausschließlich DML-Rechte auf Anwendungstabellen und Sequenzen erteilt; Zugriff auf die Migrationsverwaltung ist nachweislich verweigert. Die Rolle wird mit scripts/setup-runtime-role.ts eingerichtet; nach neuen Tabellen notwendige Grants explizit ergänzen. Credentials nie in Git, Webseiten, CI-Ausgaben oder URLs für Besucher. Lokale Hilfsdateien `.dev.vars*` und `private/` sind ignoriert und mit Dateirechten geschützt. Ein privates Archiv ist kein öffentliches Seedpaket.

1. `npm ci --ignore-scripts`, Typprüfung, Lint, Unit-Tests, Audit, isolierte Integration, Build.
2. Additive Migrationen mit direkter Verbindung ausführen. Checksums verhindern Änderung bereits angewandter Migrationen; Advisory-Lock serialisiert Deploys. Vor bestehenden Produktionsdaten zuerst QA/Backup-Restore prüfen.
3. Worker-Secrets per `wrangler secret put`/`secret bulk` via stdin setzen; `wrangler deploy`. Die lokale Hilfe `scripts/deploy.ts` verwendet nur ignorierte lokale Secrets und gibt keine Werte aus.
4. `npm run smoke` und echte Browserabnahme. `wrangler deployments list --name music-worlds` protokollieren. Rollback über `wrangler rollback <version-id>`; additive Tabellen bleiben erhalten. Keine produktiven Datenbankschemata automatisch zurückbauen.

Der Actions-Workflow ist zunächst manuell (`workflow_dispatch`, optional `deploy`), acht Minuten Timeout, Ubuntu, keine bezahlten großen Runner. [GitHub-Abrechnung](https://docs.github.com/en/billing/concepts/product-billing/github-actions): private Repositories verbrauchen das Kontofreikontingent. Dieses Restkontingent/Spending-Cap ist nicht bestätigt; deshalb wurden keine Runner gestartet. Nach Prüfung von Restguthaben und 0-Dollar-Ausgabenlimit können Push-/PR-Trigger ergänzt werden.

GitHub-Secrets für CI: TEST_DATABASE_URL (nur QA), DATABASE_URL_UNPOOLED (nur Music-Worlds), CLOUDFLARE_ACCOUNT_ID und ein zweckgebundener CLOUDFLARE_API_TOKEN mit Worker-Edit im vorhandenen Konto. Der kurzlebige lokale OAuth-Token wird nicht in GitHub hinterlegt. Ohne diesen separaten Token bleibt nur der CI-Deployschritt gesperrt; lokale Bereitstellung funktioniert über die bestätigte Wrangler-Anmeldung.

## Datenschutz, SEO und Administration

Gastsitzungen verfallen nach 30 Tagen, Räume nach 24 Stunden; täglicher Cron entfernt abgelaufene Räume, Sessions und Missbrauchszähler in begrenzten Batches. Spielername/Statistiken sind innerhalb der Plattform sichtbar. Eigene Daten lassen sich in Profil endgültig löschen; betroffene Räume schließen, eigene Texte/Belege/Audittexte werden entfernt und Sitzungen widerrufen. Verantwortlichen-/Kontaktangaben und verbindliche langfristige Aufbewahrungsregel für verwaiste Gastdaten vor einer breiteren Freigabe ergänzen. Produktivlogs enthalten keine Anfragekörper oder Secrets.

Auf ausdrückliche Nutzervorgabe wird nur die Landingpage indexiert (`PUBLIC_INDEXING=true` mit serverseitiger Pfad-Whitelist `/`). Alle anderen Seiten und privaten Screens bleiben noindex, auch nach JavaScript-Navigation. Canonical/OG und HTML-Informationsseiten sind vorhanden; die Sitemap enthält nur die Landingpage. Eine neue Search-Console-URL-Präfix-Property exakt für diese Origin erstellen; neuen HTML-Meta-Verifizierungscode oder Datei separat verifizieren (workers.dev erfordert typischerweise URL-Präfix statt eigener DNS-Domain-Property). Keine fremden Property-Tokens übernehmen. Robots/Sitemap und private noindex-Routen prüfen und die Landingpage-Sitemap einreichen. Keine Erweiterung der Index-Whitelist ohne Nutzerauftrag. Ranking oder Indexierung ist nicht garantiert.
