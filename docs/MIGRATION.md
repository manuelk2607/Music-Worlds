# Sprachwelten → Music-Worlds

Quell-HEAD geprüft: `933c84110d4e4f98ce19fc8540ffb2f4ff1f4a34`. Dieser GitHub-Stand enthält noch keinen Transferordner. Im früheren lokalen Sprachwelten-Arbeitsstand unter dem Codex-Projekt vom 20.10.2026 liegen dagegen `transfer/music-worlds/quiz.ts`, Tests und `docs/music-worlds-transfer.md` vor. Der datenfreie Kern wurde nach `src/core/ported-quiz.ts` übernommen und über die Rechte-/Mediengrenze angebunden.

Übernommen/adaptiert: vier eindeutige Titeloptionen, opake IDs, geheime Lösung, +1 Punkte, Tipp-vor-Album, nur aktuelle Karte, Membership, Match-/Rundenschutz, Versionsvergleich, Hostwechsel, gleichzeitige Antworten, Verlauf und ungespielte Prompts bei Rematches. Keine großen UI-/Framework-/Sprachdatenabhängigkeiten übernommen; Navigation und Beitragsabläufe gezielt neu in einer eigenständigen Musikgestaltung umgesetzt.

## Datenarchiv und Übernahme

Mit `scripts/archive-source.ts` einen read-only Repeatable-Read-Export erstellt. Archiv enthält alle acht Songrows mit IDs, Revisionen, Quellreferenzen, Übersetzungen und ursprünglichen Eigentümerreferenzen sowie alle abhängigen entry_id-Tabellen und Audio-Metadaten. Ergebnis: acht redaktionelle Rows ohne Benutzerautor; keine abhängigen Erläuterungen, Vorschläge, Prüfungen, Reports, Audios oder aktiven Songräume. Keine Audio-Bytes exportiert. SHA-256 und vollständige IDs nach Wiederherstellung in `legacy_archive.source_snapshots` der isolierten QA-Datenbank geprüft.

Archiv und Prüfnachweise liegen ausschließlich unter `private/legacy/` (ignoriert, 0600; Verzeichnis 0700). Das QA-Archiv ist nur über privilegierten Datenbankzugang erreichbar, niemals über die öffentliche Anwendung. Archiv bei Lösch-/Aufbewahrungsfragen gesondert behandeln. Nicht als GitHub-Artefakt veröffentlichen.

`scripts/import-legacy.ts qa|production` erhält alle acht Ursprungs-IDs. `legacy_imports` speichert Quellrevision, ursprüngliche Eigentümerreferenz und Archivchecksum. Da alle acht Quellautoren NULL sind, erfolgt keine erfundene Kontozuordnung. Bei zukünftigen Benutzerbeiträgen verweigert der Import ohne explizit bestätigtes Mapping die Übernahme. Originale Übersetzungen/Metadaten bleiben im privaten Archiv; in die deutschsprachige Zieloberfläche werden keine unreviewten Übersetzungen publiziert.

Vier historische englische Textfragen sind individuell als gemeinfrei freigegeben; vier französische Rows bleiben `rights_unverified`/pending erhalten. Begründungen/Quellen in RIGHTS.md und versionsgebundenen Datenbankreviews. Keine Aufnahme und kein moderner Liedtext kopiert. Zusätzlich acht eigene neue Hinweise. Zwei verschiedene historische Zeilen desselben Songs bleiben zwei eigenständige Fragen, wie in der Quelle.

## Cutover

Der Cutover ist produktiv: Sprachwelten-Commit `a31f1177b19e98fef3763feff062bc2979c19edd`, Cloudflare-Version `9e742f1a-b875-455e-9852-de77f1a0320a`. Neue Songräume und Songbeiträge liefern 410 und verweisen auf Music-Worlds. Neue Zitatspiele und öffentliche Sammlungen verwenden ausschließlich Personen; alte Songrows bleiben für Archiv und tatsächliche Eigentümerbearbeitung erhalten. Die bisherige Engine kann gespeicherte Decks weiterhin lesen. Keine Quelldaten wurden gelöscht.

Vor Veröffentlichung bestanden 196 Sprachwelten-Tests, Typprüfung, Lint, Übersetzungsprüfung, Audit und Build. Live geprüft: Homepage, gesperrter alter öffentlicher Songlink, neue Songräume/-beiträge 410, leere Liedtextsuche, Personenrunde bei bisheriger Mischanfrage und unveränderte Zungenbrecher-Mischauswahl. Alle acht Quellrows wurden nach Veröffentlichung nochmals exakt mit dem verifizierten Archiv verglichen: unverändert.
