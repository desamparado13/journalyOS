(function startJournalyBridge() {
  if (globalThis.__journalyLocalBridgeStarted) {
    window.postMessage({ source: "journaly-local-bridge", type: "JOURNALY_LOCAL_READY" }, location.origin);
    return;
  }
  globalThis.__journalyLocalBridgeStarted = true;
  const PAGE_SOURCE = "journaly-os";
  const EXTENSION_SOURCE = "journaly-local-bridge";
  const postLocalState = (state) => window.postMessage({ source: EXTENSION_SOURCE, type: "JOURNALY_LOCAL_STATE", state }, location.origin);

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== PAGE_SOURCE) return;
    if (event.data.type === "JOURNALY_LOCAL_REQUEST") chrome.runtime.sendMessage({ type: "JOURNALY_LOCAL_GET_STATE" }).then(postLocalState).catch(() => postLocalState({ installed: true, available: false, model: null }));
    if (event.data.type === "JOURNALY_LOCAL_ANALYZE") {
      const requestId = String(event.data.requestId || "");
      chrome.runtime.sendMessage({ type: "JOURNALY_LOCAL_ANALYZE", question: event.data.question, context: event.data.context, image: event.data.image })
        .then((result) => window.postMessage({ source: EXTENSION_SOURCE, type: "JOURNALY_LOCAL_RESULT", requestId, result }, location.origin))
        .catch((error) => window.postMessage({ source: EXTENSION_SOURCE, type: "JOURNALY_LOCAL_RESULT", requestId, result: { available: false, analysis: null, error: String(error?.message || error) } }, location.origin));
    }
  });
  window.postMessage({ source: EXTENSION_SOURCE, type: "JOURNALY_LOCAL_READY" }, location.origin);
  chrome.runtime.sendMessage({ type: "JOURNALY_LOCAL_GET_STATE" }).then(postLocalState).catch(() => {});
})();
