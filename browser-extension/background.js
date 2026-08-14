const STATE_KEY = "journalyEdgeCompanionStateV1";
const JOURNALY_URLS = [
  "https://journaly-os-daytrade.sandaraslark.chatgpt.site/*",
  "https://journaly-os.vercel.app/*",
  "http://localhost/*",
  "http://127.0.0.1/*",
];
const lastCaptureByTab = new Map();

async function readState() {
  const stored = (await chrome.storage.local.get(STATE_KEY))[STATE_KEY] || {};
  return { sharedTabId: Number.isInteger(stored.sharedTabId) ? stored.sharedTabId : null, context: stored.context || null };
}

async function writeState(state) {
  await chrome.storage.local.set({ [STATE_KEY]: state });
  return publicState(state);
}

function publicState(state) {
  const fresh = state.context?.observedAt && Date.now() - new Date(state.context.observedAt).getTime() < 120000;
  return { installed: true, connected: Boolean(state.sharedTabId && fresh), context: fresh ? { ...state.context, tabId: state.sharedTabId } : null };
}

async function broadcast(state) {
  const tabs = await chrome.tabs.query({ url: JOURNALY_URLS });
  await Promise.all(tabs.map(async (tab) => {
    if (!tab.id) return;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "JOURNALY_EDGE_STATE_CHANGED", state });
    } catch {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["journaly-bridge.js"] }).catch(() => {});
      await chrome.tabs.sendMessage(tab.id, { type: "JOURNALY_EDGE_STATE_CHANGED", state }).catch(() => {});
    }
  }));
}

async function stopSharing() {
  const previous = await readState();
  if (previous.sharedTabId) await chrome.tabs.sendMessage(previous.sharedTabId, { type: "JOURNALY_EDGE_STOP" }).catch(() => {});
  const state = await writeState({ sharedTabId: null, context: null });
  await chrome.action.setBadgeText({ text: "" });
  await broadcast(state);
  return state;
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !/^https:\/\/([^.]+\.)?tradingview\.com\//i.test(tab.url || "")) return;
  const current = await readState();
  if (current.sharedTabId === tab.id) {
    await stopSharing();
    return;
  }
  if (current.sharedTabId) await chrome.tabs.sendMessage(current.sharedTabId, { type: "JOURNALY_EDGE_STOP" }).catch(() => {});
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["context.js", "tradingview-observer.js"] });
  const state = await writeState({ sharedTabId: tab.id, context: null });
  await chrome.action.setBadgeBackgroundColor({ color: "#0f766e" });
  await chrome.action.setBadgeText({ tabId: tab.id, text: "ON" });
  await broadcast(state);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === "JOURNALY_EDGE_CONTEXT") {
      const state = await readState();
      if (sender.tab?.id !== state.sharedTabId) return sendResponse(publicState(state));
      let screenshot = state.context?.screenshot || null;
      let screenshotObservedAt = state.context?.screenshotObservedAt || null;
      const lastCapture = lastCaptureByTab.get(sender.tab.id) || 0;
      if (sender.tab.active && Date.now() - lastCapture > 12000) {
        lastCaptureByTab.set(sender.tab.id, Date.now());
        const captured = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "jpeg", quality: 76 }).catch(() => null);
        if (typeof captured === "string" && captured.startsWith("data:image/jpeg;base64,") && captured.length <= 5_500_000) {
          screenshot = captured;
          screenshotObservedAt = new Date().toISOString();
        }
      }
      const next = await writeState({ sharedTabId: state.sharedTabId, context: { ...message.context, screenshot, screenshotObservedAt } });
      await broadcast(next);
      return sendResponse(next);
    }
    if (message?.type === "JOURNALY_EDGE_GET_STATE") return sendResponse(publicState(await readState()));
    if (message?.type === "JOURNALY_EDGE_DISCONNECT") return sendResponse(await stopSharing());
  })().catch(() => sendResponse({ installed: true, connected: false, context: null }));
  return true;
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  lastCaptureByTab.delete(tabId);
  const state = await readState();
  if (state.sharedTabId === tabId) await stopSharing();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  const state = await readState();
  if (state.sharedTabId !== tabId) return;
  if (!/^https:\/\/([^.]+\.)?tradingview\.com\//i.test(tab.url || "")) {
    await stopSharing();
    return;
  }
  await chrome.scripting.executeScript({ target: { tabId }, files: ["context.js", "tradingview-observer.js"] }).catch(() => {});
});
