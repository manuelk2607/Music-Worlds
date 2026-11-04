# Abnahme und Abschluss

Stand 04.11.2026. Die Plattform ist für die angefragte kleine Nutzergruppe produktiv; neue Spiele werden erst nach gesonderter Definition ergänzt.

| Zielbereich | Ergebnis und Nachweis |
| --- | --- |
| Repository / Infrastruktur | Eigenes privates [Music-Worlds-Repository](https://github.com/manuelk2607/Music-Worlds), eigener Worker unter [verbindlicher Adresse](https://music-worlds.maki26.workers.dev/), getrenntes Neon-Free-Projekt, drei checksummengeschützte additive Migrationen. Secrets außerhalb Git, eingeschränkte DB-Laufzeitrolle. |
| Sprachwelten-Vorbild | Vorbereiteten datenfreien Quizkern und bewährte Abläufe adaptiert; eigenständiger Client und Datenbank. Keine Laufzeitabhängigkeit von Sprachwelten. [Migration](MIGRATION.md). |
| Plattform | Spielen, Entdecken, Beitragen, Profil; mobile Navigation, Tastatur-/Formularbeschriftungen, Themes, Suche/Genre/Sammlungen, Songdetails, eigene Beiträge, Meldungen und Moderation. Kein Anspruch auf eine zertifizierte Barrierefreiheitsprüfung. |
| Datenmodell / Beiträge | Songs/Künstler/Album/Jahr/Genre/Sprache/IDs, Fragen/Alternativen/Aliase, Kategorie/Schwierigkeit, Quellen/Rechte/Revisionen; serverseitige Validierung, Eigentum, Dubletten und getrennte Rechteprüfung. Manuelle Metadaten funktionieren ohne externe API. [Quellenbewertung](RIGHTS.md). |
| YouTube / weitere Anbieter | Normalisierte offizielle URLs, sichtbarer offizieller Player mit Start/Ende erst nach Zustimmung und Auflösung, Fehlerfallback; Anbieteradapter für YouTube und reine externe Links. Keine Medienextraktion. |
| Rechte / spätere Uploads | Alle sechs Rechtebasen, Nachweise und Nutzungsarten, versionsgebundene Moderation, Melden/Sperren/Rückzug/Löschen. Private Speicher- und autorisierte Wiedergabeverträge vorbereitet; öffentliche Audioauslieferung gesperrt. |
| Engine | Solo und bis zu zehn Personen, Lobby/Einladung/Beitritt/Austritt, serverseitige Fristen und Punkte, Multiple Choice/Freitext, atomare konkurrierende Aktionen, Wiederverbindung, Hostwechsel und Rematch-Verlauf. Medienquelle unabhängig vom Mechanikkern. |
| Errate das Lied / Bestand | Erster und einziger konkreter Modus aktiv. 12 öffentliche Fragen zu 10 Songs: acht eigene Hinweise plus vier individuell geprüfte historische englische Textfragen. Alle acht Legacy-IDs erhalten; vier französische Texte privat in Rechteprüfung. Source-Cutover live, alle acht Originalrows nachher exakt unverändert. |
| Worlds Hub | Tatsächlichen Stand geprüft; produktive OIDC-Discovery fehlt. Sicheres lokales Gastprofil und SSO-Adapter vorbereitet, keine konkurrierende zentrale Benutzerverwaltung. [Aktivierungsbedingungen](SSO.md). |
| Sicherheit / Datenschutz / Kosten | Origin/CSRF, sichere opaque Cookies, begrenzte Anfragen/Uploads, private Rechtebelege, lokale Datenlöschung, Datenminimierung und Wartungs-Cron. Keine KI/GPU, keine bezahlte Ressource beauftragt. [Betrieb und Free-Grenzen](OPERATIONS.md). |
| SEO | Ausschließlich `/` indexierbar gemäß ausdrücklicher Folgeanweisung. Eigene Titel/Canonical/OG/JSON-LD, robots.txt und Sitemap mit genau einer URL. Private Screens und weitere Seiten noindex; Schwesterprojekte verlinkt. Search Console nicht ungeprüft übernommen. |
| Umsetzung P0–P4 | Grundlage, Beiträge/Medien, Engine, Profile/Moderation und Produktivprüfung umgesetzt. Externe Freigaben bleiben ausdrücklich gesperrt statt vorgetäuscht. |
| Qualität / Veröffentlichung | 20 Unit-Tests und 66 echte isolierte PostgreSQL-Assertions; Typprüfung, Lint, Audit ohne Schwachstellen und Build bestanden. Browser: zwei Identitäten, Wiederverbindung, Beitragspflege, 390px und echter YouTube-Fehlerfall. Sprachwelten: 196 Tests und Live-Cutover-Prüfung. Finale Release-Referenzen in [PROGRESS](../PROGRESS.md). |
| Übergabe | Quellcode, Betriebs-/Rechte-/Migrations-/SSO-Dokumentation, Tests und Fortschritt sind committed und gepusht. [Prüfnachweise](VERIFICATION.md). |

## Bewusste Freigabegrenzen und nächste Schritte

- Fremde Originalaufnahmen oder weitere Originaltexte erst mit konkret dokumentierten Nutzungsrechten, aktueller individueller Moderation und geprüfter privater Speicher-/Wiedergabeanbindung aktivieren. Ohne R2-Bindung werden Uploads nicht angeboten.
- Vier französische Altfragen erst nach datiertem Editions- und Schutzfristnachweis freigeben; sie bleiben archiviert und privat erhalten.
- Hub-Anmeldung erst mit produktivem getestetem OIDC-Anbieter, registriertem Client sowie Linking-/Logout-Abnahme aktivieren. Bis dahin funktioniert der lokale Gastzugang unabhängig.
- Vor einem breiteren öffentlichen Start Betreiber-/Kontaktangaben und langfristige Aufbewahrung vervollständigen. Nur Landingpage-SEO ist freigegeben. Eine neue Search-Console-Property kann der Eigentümer optional verifizieren.
- Derzeit 0 zusätzlich gebuchte laufende Kosten; Free-Tier-Verbrauch ist nutzungsabhängig. Neon-/Worker-Quoten und das vom Nutzer bestätigte GitHub-Actions-Ausgabenlimit von 0 Dollar beibehalten. Kontogesamtrechnung nicht als null garantiert.
- Weitere Spielmodi erst nach konkreter Nutzerdefinition. Kein laufender Implementierungsblocker für den abgenommenen Umfang.
