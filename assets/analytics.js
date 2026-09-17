(() => {
  // Analytics are deliberately limited to the published GitHub Pages origin.
  // This keeps localhost, preview, and other development environments private.
  if (location.origin !== "https://yuktun.github.io" || !location.pathname.startsWith("/jpy5/")) return;
  if (window.__JPY5_GOATCOUNTER_LOADED || document.querySelector("script[data-jpy5-goatcounter]")) return;

  window.__JPY5_GOATCOUNTER_LOADED = true;
  const script = document.createElement("script");
  script.dataset.jpy5Goatcounter = "true";
  script.dataset.goatcounter = "https://sasukimm-jp5y.goatcounter.com/count";
  script.async = true;
  script.src = "https://gc.zgo.at/count.js";
  // A failed analytics request must remain invisible to the study app.
  script.onerror = () => {};
  document.head.append(script);
})();
