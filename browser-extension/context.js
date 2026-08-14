(function exposeJournalyContextParser(scope) {
  const PAIRS = ["AUDUSD", "EURUSD", "EURJPY", "AUDJPY", "GBPUSD", "NZDJPY", "EURAUD"];

  function normalizePair(value) {
    const compact = String(value || "").toUpperCase().replace(/[^A-Z]/g, "");
    return PAIRS.find((pair) => compact.includes(pair)) || null;
  }

  function parseTradingViewContext(input) {
    const title = String(input?.title || "").slice(0, 240);
    const url = String(input?.url || "").slice(0, 1200);
    const chartLabel = String(input?.chartLabel || "").replace(/\s+/g, " ").trim().slice(0, 240);
    const intervalLabel = String(input?.intervalLabel || "").replace(/\s+/g, " ").trim().slice(0, 40);
    const pair = normalizePair(`${title} ${url} ${chartLabel}`);
    const titleParts = title.split(/[·|—-]/).map((part) => part.trim()).filter(Boolean);
    const inferredInterval = titleParts.find((part) => /^(?:\d{1,3}(?:m|h|d|w)?|[MHDW])$/i.test(part)) || null;
    return {
      source: "TradingView",
      pair,
      timeframe: intervalLabel || inferredInterval,
      title,
      url,
      chartLabel: chartLabel || null,
      observedAt: new Date().toISOString(),
    };
  }

  scope.JournalyEdgeContext = { normalizePair, parseTradingViewContext };
  if (typeof module !== "undefined" && module.exports) module.exports = scope.JournalyEdgeContext;
})(typeof globalThis !== "undefined" ? globalThis : this);
