# BaerFin

Persönlicher Jellyfin-Web-Skin, Fork von
[**Abyss for Jellyfin**](https://github.com/AumGupta/abyss-jellyfin) von Om Gupta (MIT).

Zwei Schichten:

- **Look** — `theme/baerfin.css`, eingebunden per Dashboard-`@import`.
- **Spotlight-Banner** — `spotlight/`, per Container-`entrypoint` in die Web-UI gepatcht.

**Vollständige Anleitung (Einbinden, Anpassen, Updates, Fehlersuche):**
👉 [`BAERFIN.md`](BAERFIN.md)

## Schnellstart (nur Look)

```css
@import url("https://cdn.jsdelivr.net/gh/schutterwaelder/BaerFin@v1.0.0/theme/baerfin.css");
```

Ins Dashboard → Allgemein → Benutzerdefiniertes CSS. Farbe/Rundung anpassen im
Variablen-Block oben in `theme/baerfin.css`.

## Lizenz

MIT — siehe [`LICENSE`](LICENSE). Basiert auf Abyss (© Om Gupta), Änderungen © Nicolas Baer.

---

*Dank an [Om Gupta / Abyss](https://github.com/AumGupta/abyss-jellyfin) und das
[JellySkin](https://github.com/prayag17/JellySkin)-Projekt (frühere Basis dieses Repos).*
