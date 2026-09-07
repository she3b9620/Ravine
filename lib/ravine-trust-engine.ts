export type RAVINETrustDecision = "ALLOW" | "REVIEW" | "RESTRICT" | "BLOCK";

export function resolveRAVINETrustDecision(riskScore: number, confidence: number): RAVINETrustDecision {
  if (riskScore >= 0.9 && confidence >= 0.8) return "BLOCK";
  if (riskScore >= 0.7) return "REVIEW";
  if (riskScore >= 0.45) return "RESTRICT";
  return "ALLOW";
}

export function requiresHumanReview(decision: RAVINETrustDecision, confidence: number) {
  return decision === "REVIEW" || (decision === "BLOCK" && confidence < 0.95);
}

export function buildRAVINETrustSignal(input: {
  riskScore: number;
  confidence: number;
  reasonCodes?: string[];
}) {
  const decision = resolveRAVINETrustDecision(input.riskScore, input.confidence);
  return {
    riskScore: input.riskScore,
    confidence: input.confidence,
    decision,
    reasonCodes: input.reasonCodes ?? [],
    reviewRequired: requiresHumanReview(decision, input.confidence),
  };
}
