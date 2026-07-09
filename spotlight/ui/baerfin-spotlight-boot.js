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

  function bindVisibility(homeTab, iframe) {
    var sync = function () {
      iframe.style.display = homeTab.classList.contains("is-active") ? "block" : "none";
    };
    sync();
    new MutationObserver(sync).observe(homeTab, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  // Fuegt den Banner-iframe oben in einen Home-Tab ein (einmal pro Tab-Instanz).
  function enhance(homeTab) {
    if (!homeTab || homeTab.dataset[FLAG] === "1") return;
    homeTab.dataset[FLAG] = "1";
    injectStyleOnce();
    var iframe = document.createElement("iframe");
    iframe.className = IFRAME_CLASS;
    iframe.src = "ui/spotlight.html";
    var sections = homeTab.querySelector(".sections");
    if (sections) homeTab.insertBefore(iframe, sections);
    else homeTab.insertBefore(iframe, homeTab.firstChild);
    bindVisibility(homeTab, iframe);
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
