/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly NEXT_PUBLIC_SUPABASE_URL: string;
  readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_JOURNALY_CODEX_BRIDGE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  journalyDesktop?: {
    isPrivateDesktop: boolean;
    codexChatEnabled: boolean;
    voiceChatEnabled: boolean;
    getStatus: () => Promise<{ launchId: string; bridgeReady: boolean; codexLoggedIn: boolean; codexMessage: string; wakeWordReady?: boolean; wakeWordMessage?: string; ctrader?: Record<string, unknown> }>;
    restartBridge: () => Promise<unknown>;
    checkCodex: () => Promise<unknown>;
    loginCodex: () => Promise<unknown>;
    getCTraderStatus: () => Promise<Record<string, unknown>>;
    connectCTrader: () => Promise<Record<string, unknown>>;
    stopCTrader: () => Promise<Record<string, unknown>>;
    previewCTraderOrder: (intent: Record<string, unknown>) => Promise<Record<string, unknown>>;
    executeCTraderOrder: (confirmation: Record<string, unknown>) => Promise<Record<string, unknown>>;
    openJournaly: () => Promise<unknown>;
    setWakeWordActive: (active: boolean) => Promise<unknown>;
    onStatus: (listener: (status: { launchId?: string; bridgeReady?: boolean; codexLoggedIn?: boolean }) => void) => () => void;
    onCodexOutput: (listener: (output: string) => void) => void;
    onWakeWord: (listener: (payload: { type?: string; text?: string; message?: string }) => void) => () => void;
  };
}
