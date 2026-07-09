#!/usr/bin/env bash
# ============================================================================
# BaerFin Spotlight — Patch beim Container-Start (offizielles jellyfin/jellyfin)
#
# Wird aus dem Compose-`entrypoint` VOR dem Jellyfin-Start aufgerufen. Kopiert
# die Spotlight-UI nach web/ui/ und bindet das Boot-Script in web/index.html ein.
# Idempotent & self-healing: darf bei jedem Start laufen und patcht nach einem
# Jellyfin-Update automatisch neu. Bricht Jellyfin NIE ab (immer exit 0).
#
# Dieser Ordner (spotlight/) wird read-only als /abyss in den Container gemountet.
# ============================================================================
set -u
SRC_DIR="${BAERFIN_SRC:-/abyss}"     # hierhin ist spotlight/ gemountet
UI_SRC="${SRC_DIR}/ui"
MARKER="baerfin-spotlight-boot"      # eindeutige Kennung in index.html

log() { echo "**** [baerfin] $* ****"; }

# 1) Jellyfin-Web-Verzeichnis finden (offiziell: /jellyfin/jellyfin-web)
WEB_DIR=""
for c in /jellyfin/jellyfin-web /usr/share/jellyfin/web /usr/lib/jellyfin/bin/jellyfin-web; do
  if [ -f "$c/index.html" ]; then WEB_DIR="$c"; break; fi
done
if [ -z "$WEB_DIR" ]; then
  found="$(find / -maxdepth 6 -name index.html -path '*jellyfin*web*' 2>/dev/null | head -1)"
  [ -n "$found" ] && WEB_DIR="$(dirname "$found")"
fi
if [ -z "$WEB_DIR" ] || [ ! -f "$WEB_DIR/index.html" ]; then
  log "ERROR: Jellyfin-Web-Verzeichnis nicht gefunden – Patch uebersprungen"
  exit 0
fi
log "Web-Verzeichnis: $WEB_DIR"

# 2) Spotlight-UI nach web/ui/ kopieren
UI_DEST="${WEB_DIR}/ui"
mkdir -p "$UI_DEST"
for f in spotlight.html spotlight.css baerfin-spotlight-boot.js; do
  if [ -f "${UI_SRC}/${f}" ]; then
    cp -f "${UI_SRC}/${f}" "${UI_DEST}/${f}" && log "kopiert: ui/${f}"
  else
    log "WARN: ${UI_SRC}/${f} fehlt (Mount /abyss korrekt?)"
  fi
done

# 3) Boot-Script in index.html einbinden (idempotent)
INDEX="${WEB_DIR}/index.html"
if grep -q "$MARKER" "$INDEX" 2>/dev/null; then
  log "index.html bereits gepatcht – ok"
else
  cp -f "$INDEX" "${INDEX}.baerfin.bak" 2>/dev/null || true
  TAG="<script defer src=\"ui/baerfin-spotlight-boot.js\" data-${MARKER}></script>"
  if grep -q "</body>" "$INDEX"; then
    sed -i "s#</body>#${TAG}</body>#" "$INDEX" && log "index.html gepatcht"
  else
    printf '\n%s\n' "$TAG" >> "$INDEX" && log "index.html gepatcht (angehaengt)"
  fi
fi

log "BaerFin Spotlight angewendet"
exit 0
