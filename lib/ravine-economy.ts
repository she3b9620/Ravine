export type RAVINEEconomyCapability = "tips" | "memberships" | "paid_works" | "paid_events" | "rentals" | "marketplace";

export type RAVINEEconomyAdapter = {
  key: string;
  createCheckout?: (input: { capability: RAVINEEconomyCapability; referenceId: string }) => Promise<{ checkoutUrl: string }>;
  recordEntitlement?: (input: { userId: string; referenceId: string }) => Promise<void>;
};

let economyAdapter: RAVINEEconomyAdapter | null = null;

export function registerRAVINEEconomyAdapter(adapter: RAVINEEconomyAdapter) {
  economyAdapter = adapter;
}

export function getRAVINEEconomyAdapter() {
  return economyAdapter;
}

export function assertRAVINEEconomyConfigured() {
  if (!economyAdapter) throw new Error("RAVINE economy provider is not configured yet; pricing/payment/revenue-share remain open decisions.");
  return economyAdapter;
}
