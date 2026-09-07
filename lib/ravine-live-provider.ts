export type RAVINELiveProviderAdapter = {
  key: string;
  createSession: (input: { title: string; mode: string }) => Promise<{ externalId: string }>;
  endSession: (externalId: string) => Promise<void>;
  getHealth?: () => Promise<{ ok: boolean }>;
};

let activeProvider: RAVINELiveProviderAdapter | null = null;

export function registerRAVINELiveProvider(provider: RAVINELiveProviderAdapter) {
  activeProvider = provider;
}

export function getRAVINELiveProvider() {
  return activeProvider;
}

export function assertRAVINELiveProviderConfigured(): RAVINELiveProviderAdapter {
  if (!activeProvider) throw new Error("RAVINE Live provider is not configured yet; this remains an open product decision.");
  return activeProvider;
}
