(function startJournalyBridge() {
  const PAGE_SOURCE = "journaly-os";
  const EXTENSION_SOURCE = "journaly-edge-companion";
  const postState = (state) => window.postMessage({ source: EXTENSION_SOURCE, type: "JOURNALY_EDGE_STATE", state }, location.origin);
  const requestState = () => chrome.runtime.sendMessage({ type: "JOURNALY_EDGE_GET_STATE" }).then(postState).catch(() => postState({ installed: true, connected: false, context: null }));

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== PAGE_SOURCE) return;
    if (event.data.type === "JOURNALY_EDGE_REQUEST") requestState();
    if (event.data.type === "JOURNALY_EDGE_DISCONNECT") chrome.runtime.sendMessage({ type: "JOURNALY_EDGE_DISCONNECT" }).then(postState).catch(() => {});
  });
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "JOURNALY_EDGE_STATE_CHANGED") postState(message.state);
  });
  window.postMessage({ source: EXTENSION_SOURCE, type: "JOURNALY_EDGE_READY" }, location.origin);
  requestState();
})();
