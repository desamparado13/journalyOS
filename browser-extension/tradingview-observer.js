(function startJournalyTradingViewObserver() {
  if (globalThis.__journalyEdgeObserver?.running) {
    globalThis.__journalyEdgeObserver.publish();
    return;
  }

  let running = true;
  let publishTimer = 0;
  const textFrom = (selectors) => selectors.map((selector) => document.querySelector(selector)?.textContent || "").find((value) => value.trim()) || "";
  const publish = () => {
    if (!running || !globalThis.JournalyEdgeContext) return;
    const context = globalThis.JournalyEdgeContext.parseTradingViewContext({
      title: document.title,
      url: location.href,
      chartLabel: textFrom(["[data-name='legend-source-title']", "[data-name='series-legend']", "[class*='legend'] [class*='title']"]),
      intervalLabel: textFrom(["[data-name='header-intervals-button']", "button[data-name='intervals-menu']", "[data-value='resolution']"]),
    });
    chrome.runtime.sendMessage({ type: "JOURNALY_EDGE_CONTEXT", context }).catch(() => {});
  };
  const schedulePublish = () => {
    window.clearTimeout(publishTimer);
    publishTimer = window.setTimeout(publish, 600);
  };
  const observer = new MutationObserver(schedulePublish);
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "data-symbol", "data-value"] });
  const interval = window.setInterval(publish, 5000);

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "JOURNALY_EDGE_STOP") {
      running = false;
      observer.disconnect();
      window.clearInterval(interval);
      window.clearTimeout(publishTimer);
      delete globalThis.__journalyEdgeObserver;
    }
  });

  globalThis.__journalyEdgeObserver = { running: true, publish };
  publish();
})();
