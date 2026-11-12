"use strict";
/* ============================================================================
   BaerFin Spotlight — Bootstrap
   Blendet den Abyss-Spotlight-Banner in Jellyfins Home-Tab ein, OHNE ein
   Webpack-Chunk zu ersetzen. Dadurch haengt nichts an internen Jellyfin-IDs
   -> ueberlebt Jellyfin-Updates. Wird von apply-spotlight.sh in web/index.html
   eingebunden. Banner-Inhalt liegt in ui/spotlight.html (unveraendert von Abyss).
   Basis-Idee (iframe + Dark-Theme-Force + Sichtbarkeit) aus Abyss (MIT, Om Gupta).
   ============================================================================ */
(function () {
  var IFRAME_CLASS = "featurediframe";
  var STYLE_ID = "baerfin-spotlight-style";
  var FLAG = "baerfinSpotlight";
  var ASSET_V = "5";   // Cache-Bust: bei jeder UI-Aenderung hochzaehlen (auch in apply-spotlight.sh)
  var q = function (src) { return src + (src.indexOf("?") < 0 ? "?" : "&") + "v=" + ASSET_V; };

  // --- Zusatz-Reihen zwischen den Home-Zeilen (Netflix-Stil) ---
  var SUGGEST_STYLE_ID = "baerfin-suggest-style";
  var suggestFrames = [];       // iframe-Referenzen fuer Groessen/Ausblenden per postMessage
  // nativeIndex = vor welcher NATIVEN Jellyfin-Zeile die Reihe erscheint
  // (0-basiert; eigene Reihen zaehlen NICHT mit).
  var EXTRA_ROWS = [
    { id: "suggest",  src: "ui/suggestions.html", nativeIndex: 1 },
    { id: "showcase", src: "ui/showcase.html",    nativeIndex: 2 }
  ];

  // Auto-Hoehe / Ausblenden anhand der Meldungen aus den Reihen-iframes
  window.addEventListener("message", function (ev) {
    var d = ev && ev.data && ev.data.baerfinSuggest;
    if (!d) return;
    for (var i = 0; i < suggestFrames.length; i++) {
      var fr = suggestFrames[i];
      if (fr && fr.contentWindow === ev.source) {
        if (d.empty) { if (fr.parentNode) fr.parentNode.style.display = "none"; }
        else if (d.height) { fr.style.height = Math.max(120, d.height) + "px"; }
      }
    }
  });

  function injectSuggestStyleOnce() {
    if (document.getElementById(SUGGEST_STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = SUGGEST_STYLE_ID;
    s.textContent =
      ".baerfin-suggest{width:100%;margin:0.4em 0 0.8em}" +
      ".baerfin-suggest iframe{width:100%;display:block;border:0;margin:0;padding:0;height:400px;transition:height .2s ease}";
    (document.head || document.documentElement).appendChild(s);
  }

  // native (nicht von uns injizierte) Home-Zeilen
  function nativeSections(sections) {
    var out = [];
    for (var i = 0; i < sections.children.length; i++) {
      var ch = sections.children[i];
      if (!ch.classList || !ch.classList.contains("baerfin-suggest")) out.push(ch);
    }
    return out;
  }

  // Fuegt alle EXTRA_ROWS zwischen die nativen Home-Zeilen ein und stellt sie
  // nach einem Jellyfin-Re-Render selbst wieder her (self-healing).
  function enhanceRows(homeTab) {
    var sections = homeTab.querySelector(".sections");
    if (!sections) return;
    injectSuggestStyleOnce();
    EXTRA_ROWS.forEach(function (cfg) {
      var sel = '[data-baerfin-row="' + cfg.id + '"]';
      var build = function () {
        var wrap = document.createElement("div");
        wrap.className = "baerfin-suggest";
        wrap.setAttribute("data-baerfin-row", cfg.id);
        var iframe = document.createElement("iframe");
        iframe.src = q(cfg.src);
        iframe.setAttribute("scrolling", "no");
        wrap.appendChild(iframe);
        suggestFrames.push(iframe);
        return wrap;
      };
      var fallback = null;
      var ensure = function () {
        if (sections.querySelector(sel)) return;
        var natives = nativeSections(sections);
        // erst einsetzen, wenn die Zielposition existiert (sonst wandert die Reihe)
        if (natives.length > cfg.nativeIndex) {
          sections.insertBefore(build(), natives[cfg.nativeIndex]);
          if (fallback) { clearTimeout(fallback); fallback = null; }
        }
      };
      ensure();
      new MutationObserver(ensure).observe(sections, { childList: true });
      // Sicherheitsnetz: hat die Startseite weniger Zeilen als nativeIndex -> ans Ende
      fallback = setTimeout(function () {
        if (!sections.querySelector(sel) && nativeSections(sections).length) {
          sections.appendChild(build());
        }
      }, 2000);
    });
  }

  // --- Dark-Theme erzwingen (der Banner ist fuer Dark gebaut) ---
  try {
    Object.keys(localStorage)
      .filter(function (k) { return k.endsWith("-appTheme"); })
      .forEach(function (k) { localStorage.setItem(k, "dark"); });
    var _set = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (key, value) {
      if (typeof key === "string" && key.endsWith("-appTheme")) value = "dark";
      _set(key, value);
    };
  } catch (e) { /* Theme-Force optional – niemals den Rest blockieren */ }

  function injectStyleOnce() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "#indexPage.abyss-spotlight-active{padding:0 !important}" +
      "#homeTab.abyss-spotlight-active{padding:0 !important;margin:0 !important}" +
      ".featurediframe{width:100%;display:block;border:0;margin:0;padding:0;" +
      "height:70vh;min-height:420px;max-height:680px}" +
      "@media (min-width:1400px){.featurediframe{height:72vh;max-height:760px}}" +
      "@media (min-width:1920px){.featurediframe{height:68vh;max-height:860px}}" +
      "@media (max-width:1024px) and (orientation:portrait){.featurediframe{height:90vh;min-height:320px;max-height:720px}}" +
      "@media (max-width:1024px) and (orientation:landscape){.featurediframe{height:100vh;min-height:280px;max-height:420px}}" +
      "@media (max-width:600px) and (orientation:portrait){.featurediframe{height:90vh;min-height:260px;max-height:720px}}" +
      "@media (max-width:900px) and (orientation:landscape) and (max-height:500px){.featurediframe{height:100vh;min-height:200px}}";
    (document.head || document.documentElement).appendChild(style);
  }

  // --- Sichtbarkeit + Status-Klassen (Jellyfin 12 / Modern-Layout) ---
  // Das Abyss-CSS (ab Jellyfin 12) erwartet:
  //   html.abyss-spotlight-visible   -> Banner sichtbar: MUI-AppBar schwebt transparent darueber
  //   #indexPage/#homeTab.abyss-spotlight-active -> Banner eingebaut (Innenabstaende weg)
  // Im Modern-Layout bleiben alte Seiten versteckt im DOM; daher pro Banner pruefen,
  // ob seine Seite wirklich sichtbar ist (wie Abyss' spotlight-loader.js).
  var banners = [];   // {homeTab, iframe}

  function isShown(b) {
    var tab = b.homeTab;
    if (!tab.isConnected || !b.iframe.isConnected || document.hidden) return false;
    if (!tab.classList.contains("is-active")) return false;
    var page = tab.closest ? tab.closest("#indexPage") : null;
    if (page && (page.classList.contains("hide") || page.hidden)) return false;
    var fav = page ? page.querySelector("#favoritesTab") : null;
    if (fav && fav.classList.contains("is-active")) return false;
    var st = window.getComputedStyle(tab);
    if (st.display === "none" || st.visibility === "hidden") return false;
    return tab.offsetParent !== null || tab.getClientRects().length > 0;
  }

  function syncAll() {
    var any = false;
    banners = banners.filter(function (b) { return b.homeTab.isConnected; });
    for (var i = 0; i < banners.length; i++) {
      var b = banners[i];
      // erst einblenden, dann messen (ein ausgeblendeter iframe aendert die Tab-Groesse nicht)
      var on = isShown(b);
      b.iframe.style.display = on ? "block" : "none";
      if (on) any = true;
    }
    document.documentElement.classList.toggle("abyss-spotlight-visible", any);
  }

  var syncScheduled = false;
  function scheduleSync() {
    if (syncScheduled) return;
    syncScheduled = true;
    var run = function () { syncScheduled = false; syncAll(); };
    if (window.requestAnimationFrame) window.requestAnimationFrame(run); else setTimeout(run, 16);
  }

  function bindVisibility(homeTab, iframe) {
    banners.push({ homeTab: homeTab, iframe: iframe });
    var page = homeTab.closest ? homeTab.closest("#indexPage") : null;
    if (page) page.classList.add("abyss-spotlight-active");
    homeTab.classList.add("abyss-spotlight-active");
    var mo = new MutationObserver(scheduleSync);
    mo.observe(homeTab, { attributes: true, attributeFilter: ["class", "style"] });
    // Seiten-/Routenwechsel: Klassen der Vorfahren (#indexPage .hide, MUI-Container) beobachten
    for (var el = homeTab.parentElement; el; el = el.parentElement) {
      mo.observe(el, { attributes: true, attributeFilter: ["class", "hidden", "style"] });
      if (el === document.body) break;
    }
    syncAll();
  }

  // Fuegt den Banner-iframe oben in einen Home-Tab ein (einmal pro Tab-Instanz).
  function enhance(homeTab) {
    if (!homeTab || homeTab.dataset[FLAG] === "1") return;
    homeTab.dataset[FLAG] = "1";
    injectStyleOnce();
    var iframe = document.createElement("iframe");
    iframe.className = IFRAME_CLASS;
    iframe.src = q("ui/spotlight.html");
    var sections = homeTab.querySelector(".sections");
    if (sections) homeTab.insertBefore(iframe, sections);
    else homeTab.insertBefore(iframe, homeTab.firstChild);
    bindVisibility(homeTab, iframe);

    // Zusatz-Reihen einbauen, sobald .sections existiert (kann spaeter kommen)
    var trySuggest = function () {
      if (!homeTab.querySelector(".sections")) return false;
      enhanceRows(homeTab);
      return true;
    };
    if (!trySuggest()) {
      var mo = new MutationObserver(function () { if (trySuggest()) mo.disconnect(); });
      mo.observe(homeTab, { childList: true, subtree: true });
    }
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    var tabs = root.querySelectorAll("#homeTab");
    for (var i = 0; i < tabs.length; i++) enhance(tabs[i]);
  }

  function start() {
    scan(document);
    // Jellyfin ist eine SPA: der Home-Tab wird bei Navigation neu erzeugt.
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (node.nodeType !== 1) continue;
          if (node.id === "homeTab") enhance(node);
          else scan(node);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener("visibilitychange", scheduleSync);
    window.addEventListener("hashchange", scheduleSync);
    // Sicherheitsnetz gegen veralteten SPA-Zustand (wie Abyss): alle 2 s abgleichen
    setInterval(syncAll, 2000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
