const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("journalyDesktop", {
  isPrivateDesktop: true,
  // Desktop Jarvis is currently text-chat only; the Codex bridge and voice
  // companion remain available in source for a later opt-in build.
  codexChatEnabled: false,
  voiceChatEnabled: false,
  getStatus: () => ipcRenderer.invoke("desktop:get-status"),
  restartBridge: () => ipcRenderer.invoke("desktop:restart-bridge"),
  checkCodex: () => ipcRenderer.invoke("desktop:check-codex"),
  loginCodex: () => ipcRenderer.invoke("desktop:login-codex"),
  getCTraderStatus: () => ipcRenderer.invoke("desktop:ctrader-status"),
  connectCTrader: () => ipcRenderer.invoke("desktop:ctrader-connect"),
  stopCTrader: () => ipcRenderer.invoke("desktop:ctrader-stop"),
  previewCTraderOrder: (intent) => ipcRenderer.invoke("desktop:ctrader-preview-order", intent),
  executeCTraderOrder: (confirmation) => ipcRenderer.invoke("desktop:ctrader-execute-order", confirmation),
  openJournaly: () => ipcRenderer.invoke("desktop:open-journaly"),
  setWakeWordActive: (active) => ipcRenderer.invoke("desktop:set-wake-word-active", active === true),
  onStatus: (listener) => {
    const handler = (_event, status) => listener(status);
    ipcRenderer.on("desktop:status", handler);
    return () => ipcRenderer.removeListener("desktop:status", handler);
  },
  onCodexOutput: (listener) => ipcRenderer.on("desktop:codex-output", (_event, output) => listener(output)),
  onWakeWord: (listener) => {
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on("desktop:wake-word", handler);
    return () => ipcRenderer.removeListener("desktop:wake-word", handler);
  },
});
