export type RAVINEDiscoverySignal = {
  key: string;
  value: number;
  explanation?: string;
};

export type RAVINEDiscoveryProfile = {
  signals: RAVINEDiscoverySignal[];
  diversityKey?: string;
  novelty?: number;
};

export function normalizeRAVINEDiscoverySignals(signals: RAVINEDiscoverySignal[]): RAVINEDiscoverySignal[] {
  return signals
    .filter((signal) => Number.isFinite(signal.value))
    .map((signal) => ({ ...signal, value: Math.max(0, Math.min(1, signal.value)) }));
}

export function explainRAVINEDiscovery(signals: RAVINEDiscoverySignal[], locale: "ar" | "en") {
  const normalized = normalizeRAVINEDiscoverySignals(signals).filter((signal) => signal.value > 0);
  return normalized.slice(0, 3).map((signal) => ({
    key: signal.key,
    value: signal.value,
    text: signal.explanation || (locale === "ar" ? "إشارة اكتشاف ذات صلة" : "Relevant discovery signal"),
  }));
}

export function rankRAVINEWithExplicitWeights(
  profiles: Array<{ id: string; signals: RAVINEDiscoverySignal[] }>,
  weights: Record<string, number>,
) {
  return profiles
    .map((profile) => ({
      id: profile.id,
      score: normalizeRAVINEDiscoverySignals(profile.signals).reduce((sum, signal) => sum + signal.value * (weights[signal.key] ?? 0), 0),
    }))
    .sort((a, b) => b.score - a.score);
}
