# Worlds Hub

## Stand 05.11.2026

Der Branch `feature/worlds-hub-sso` verwendet die gemeinsame OIDC-Implementierung aus Worlds Hub `049279b`. `HUB_AUTH_ENABLED` ist in beiden Worker-Konfigurationen aus. Für die spätere Abnahme gelten der zentrale Neon-Issuer, der registrierte Music-Client, `https://music-worlds.maki26.workers.dev/auth/callback` und die Music-API-Resource. Die öffentliche Hub-URL bleibt der Navigationslink.

Der Callback erzeugt eine Music-eigene Sitzung. Nach ausdrücklicher Profilerstellung wird die geprüfte Kombination aus Issuer und Subject einer lokalen UUID zugeordnet. Ein Gastprofil behält seinen eigenen Cookie und seine UUID. Wenn eine Worlds-Sitzung vorliegt, prüft der Worker diese zuerst. Eine abgelaufene oder unverknüpfte Worlds-Sitzung erhält keinen Zugriff auf ein Gastprofil. Das lokale Logout widerruft die Worlds-Sitzung in Music und kehrt zur Profilansicht zurück. Eine Gastprofilübernahme benötigt noch den frischen zentralen Nachweis, die gültige Gastsitzung und eine Bestätigung für genau dieses Profil.

Migration 005 wurde auf dem bestehenden Neon-Zweig `qa-initial` angewendet. SHA-256 `3e7d382708a70ad6aeca7433484404a8b32208293f4f3fc626de919023022041`. Der Integrationstest nutzt dort eine signierte OIDC-Testantwort und echte Postgres-Transaktionen. Er prüft den deaktivierten Einstieg, PKCE, CSRF, genau ein Profil bei paralleler Erstellung, Erhalt der Gast-UUID und Widerruf beim Logout. Zusätzlich liefen 73 bestehende Integrationsprüfungen, 22 Unit-Tests, Typprüfung, Lint und der Worker-Trockenlauf erfolgreich. Die DE/EN-Profilansicht und der Dialog wurden mit einer lokalen Testantwort im Browser geprüft.

Die reale Anmeldung mit dem Managed-Provider und die Produktionsaktivierung folgen nach Abnahme des isolierten IT-Piloten. Der Hub-Token bleibt auf Worlds Hub beschränkt.

## Ausgangslage vom 04.11.2026

GitHub-PROGRESS von manuelk2607/Worlds-Hub und vorhandenes Auth-Paket am 04.11.2026 geprüft. Die gewünschte Hub-Origin liefert für `/.well-known/openid-configuration` 404. Der zentrale Neon-Pilot ist angelegt, aber OIDC-Clientregistrierung, echte Cross-App-Abnahme und frische Reauth für sicheres Linking sind noch offen. Daher kein produktives SSO integriert und keine neue zentrale Benutzerverwaltung aufgebaut.

Music-Worlds hat nur lokale Gastprofile und Spiel-/Beitragsdaten. `src/identity.ts` beschreibt die Adaptergrenze, `profiles.hub_subject` ist eine reservierte eindeutige Zuordnung, `HUB_AUTH_ENABLED=false` bleibt wirksam. Ein Flag allein schaltet keine ungetestete Anmeldung frei. Keine geteilten Cookies, URL-Tokens, Mail-/Namenszusammenführung oder Synchronisierung fremder Rollen.

Nach Freigabe dasselbe versionierte Hub-Auth-Paket verwenden: Authorization Code + PKCE, exakte Redirect-URI, einmalige serverseitige State/Nonce, JWS/Issuer/Audience/Userinfo-Prüfung und widerrufbare lokale Sessions. Lokale Profile behalten ihre UUID; zentrale Identität ist eine zusätzliche Issuer/Subject-Zuordnung. Ein vorhandenes Gastprofil nur mit aktiver Gastsession, frischem zentralem Nachweis und expliziter Zustimmung atomar verknüpfen. Keine historischen Eigentümerzuordnungen aus Anzeigenamen ableiten.

Vor Aktivierung echte Tests für zwei Konten, unterschiedliche Issuer bei gleichem Subject, CSRF, Tokenreplay, Linkingkonflikt, Sitzungsfixierung, Sessionwiderruf und Hubausfall. Lokales Logout muss die lokale Sitzung widerrufen. Globales Logout nur mit nachgewiesenem Anbieterprotokoll; aktive lokale Sitzungen dürfen bei einem vorübergehenden Hubausfall im geprüften Gültigkeitsfenster weiter funktionieren. Kein Silent-Fallback von fehlgeschlagenem SSO auf eine andere Person.
