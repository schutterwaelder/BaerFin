# BaerFin — persönlicher Jellyfin-Skin (Abyss-basiert)

Persönlicher Jellyfin-Web-Skin auf Basis von
[**Abyss for Jellyfin** von Om Gupta](https://github.com/AumGupta/abyss-jellyfin) (MIT).
Ziel: ein eigenes, stabiles Theme für Nicolas' Jellyfin auf dem Synology-NAS, das auf
**PC-Browser, Handy und Android-TVs** (alle WebView-Clients) gut aussieht — inklusive
des **Spotlight-Banners** auf der Startseite.

> Vorher war BaerFin ein JellySkin-Fork. Umgestellt auf Abyss am 2026-07-09, weil der
> Look besser gefällt und Abyss den Spotlight-Banner mitbringt.

> Private NAS-/Deployment-Notizen liegen im Infra-Repo `VPS-und-Server-Config` unter
> `Synology NAS (DS918+)/Jellyfin/`. Dieses Repo ist **nur der Skin** und öffentlich teilbar.

---

## Die zwei Schichten

BaerFin besteht aus zwei **unabhängigen** Teilen. Schicht 1 reicht für den Look;
Schicht 2 fügt den Startseiten-Banner hinzu.

| Schicht | Was | Wie eingebunden | Risiko |
| --- | --- | --- | --- |
| **1 — Look** | `theme/baerfin.css` | Dashboard-`@import` (jsDelivr) | keins, wirkt PC/Handy/TV |
| **2 — Spotlight** | `spotlight/` (Banner + Patch) | Host-Ordner + Compose-`entrypoint` | Container-Web-UI wird gepatcht |

## Repo-Struktur

- `theme/baerfin.css` — **der Skin** (geforkte Abyss-CSS). Angepasst wird nur der
  Variablen-Block ganz oben (Akzentfarbe, Rundung).
- `spotlight/ui/spotlight.html`, `spotlight.css` — der Banner selbst (unverändert von
  Abyss; holt Continue-Watching/Next-Up über die **stabile Jellyfin-REST-API**).
- `spotlight/ui/baerfin-spotlight-boot.js` — **unser** Boot-Script: blendet den
  Banner-iframe per DOM in den Home-Tab ein. Ersetzt bewusst Abyss' fragilen
  Webpack-Chunk-Austausch → hängt an **keinen internen Jellyfin-IDs** und übersteht
  Jellyfin-Updates.
- `spotlight/apply-spotlight.sh` — Patch-Script, das beim Container-Start die
  UI-Dateien nach `web/ui/` kopiert und `web/index.html` das Boot-Script hinzufügt.
  Idempotent & self-healing.
- `docker/compose-snippet.yml` — die Compose-Ergänzungen (Referenz).

---

## Schicht 1 einbinden (Look)

Im Jellyfin-Dashboard → **Allgemein → Benutzerdefiniertes CSS** (Version über Tag pinnen):

```css
@import url("https://cdn.jsdelivr.net/gh/schutterwaelder/BaerFin@v1.0.0/theme/baerfin.css");
```

Danach am PC **Strg+F5**, an Handy/TV die App neu starten.

**Anpassen:** Farbe/Rundung stehen im Variablen-Block oben in `theme/baerfin.css`
(`--abyss-accent`, `--abyss-radius`). Ändern → committen → neuen Tag → `@import` erhöhen.

## Schicht 2 einbinden (Spotlight)

Das offizielle `jellyfin/jellyfin`-Image hat **keinen** `custom-cont-init.d`-Hook.
Deshalb läuft der Patch über einen **entrypoint-Wrapper**, der die UI patcht und
dann Jellyfin normal startet.

**Ist auf der DS918+ bereits deployed** (2026-07-09). Setup dort:
`abyss/`-Ordner liegt neben der Compose unter `/volume1/docker/jellyfin/abyss/`,
Compose-Projekt unter `/volume1/docker/jellyfin/compose.yaml` (Container-Manager),
Web-Dir im Container `/jellyfin/jellyfin-web`. Zum Neu-Ausrollen:

1. **Spotlight-Dateien auf den Host legen** (Inhalt von `spotlight/` aus diesem Repo)
   nach `/volume1/docker/jellyfin/abyss/` — enthält danach `ui/` **und**
   `apply-spotlight.sh`. (Synology-SSH hat kein SFTP-Subsystem → Upload via
   `base64` über den Exec-Kanal, oder Dateien im Container Manager / File Station ablegen.)

2. **Compose ergänzen** (`/volume1/docker/jellyfin/compose.yaml`):
   ```yaml
   services:
     jellyfin:
       entrypoint: ["/bin/bash", "-c", "bash /abyss/apply-spotlight.sh; exec /jellyfin/jellyfin"]
       volumes:
         - "/volume1/docker/jellyfin/abyss:/abyss:ro"
   ```

3. **Neu starten:** `docker-compose -f /volume1/docker/jellyfin/compose.yaml up -d`
   (Synology hat `docker-compose`, nicht `docker compose`). Im Log muss
   `**** [baerfin] ... angewendet ****` stehen. Rollback: `compose.yaml.baerfin.bak`
   zurückkopieren, `up -d`.

4. Startseite öffnen → Banner sollte oben erscheinen. Falls nicht: Abschnitt
   „Fehlersuche" unten.

> **Hinweis:** Der Banner erzwingt **Dark-Theme** (per localStorage) — so ist Abyss
> gebaut. Der `user:`-Eintrag in der Compose muss auskommentiert bleiben (der Patch
> braucht Root-Schreibrechte im Web-Verzeichnis des Containers).

---

## Updates nachziehen (~3× im Jahr, macht Claude)

**Schicht 1 (CSS):** unkritisch. Neue Abyss-Version bei Bedarf in `theme/baerfin.css`
nachziehen (Variablen-Block erhalten), committen, neuen Tag, `@import` erhöhen.

**Schicht 2 (Spotlight):** Der self-healing Patch läuft nach jedem Jellyfin-Update
von allein wieder. Weil wir **nicht** Jellyfins Home-Chunk ersetzen (sondern nur ein
Script in `index.html` einhängen), bricht ein JF-Update den Banner normalerweise
**nicht**. Zu prüfen ist nach großen JF-Releases nur:
- Heißt der Home-Tab-Container noch `#homeTab` und trägt er die Klasse `is-active`?
  (Beides steuert `baerfin-spotlight-boot.js`.) Falls Jellyfin das umbenennt →
  Selektor im Boot-Script anpassen, Host-Ordner neu befüllen, Container neu starten.

## Fehlersuche

- **Kein Banner, Log ok:** Browser-Konsole auf `[Abyss Spotlight]`-Fehler prüfen
  (Token/API). Hartes Reload (Strg+F5).
- **Log zeigt „Web-Verzeichnis nicht gefunden":** Pfad im Container prüfen
  (`docker exec jellyfin sh -c 'ls /jellyfin/jellyfin-web/index.html'`).
- **Patch zurücknehmen:** `entrypoint` + `/abyss`-Volume aus der Compose entfernen und
  Container neu bauen (frisches Image = saubere Web-UI). Backup liegt zusätzlich als
  `web/index.html.baerfin.bak`.

---

## Lizenz / Attribution

Fork von **Abyss for Jellyfin** (© Om Gupta), **MIT**. Siehe [`LICENSE`](LICENSE).
Änderungen (Branding, Theme-Variablen, Boot-Script, Patch-Script) ebenfalls MIT.
