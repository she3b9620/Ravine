export type RAVINEAIExecution = {
  actionClass: "read" | "recommend" | "tool" | "sensitive";
  permission: boolean;
  humanApproval: boolean;
  audit: boolean;
};

export type RAVINEAIGatewayRequest<T = unknown> = {
  toolKey: string;
  userId: string | null;
  permissionScope: string;
  actionClass: RAVINEAIExecution["actionClass"];
  input: T;
  confidence?: number;
  riskScore?: number;
};

export function authorizeRAVINEAI(request: RAVINEAIGatewayRequest): RAVINEAIExecution {
  const permission = Boolean(request.userId) && Boolean(request.permissionScope);
  const humanApproval = request.actionClass === "sensitive";
  return { actionClass: request.actionClass, permission, humanApproval, audit: true };
}

export function shouldExecuteRAVINEAI(request: RAVINEAIGatewayRequest): boolean {
  const decision = authorizeRAVINEAI(request);
  if (!decision.permission) return false;
  if (decision.actionClass === "sensitive" && !decision.humanApproval) return false;
  if (typeof request.riskScore === "number" && request.riskScore >= 0.9) return false;
  return true;
}

export function confidenceBand(value: number | undefined): "high" | "medium" | "low" {
  if (value == null) return "low";
  if (value >= 0.85) return "high";
  if (value >= 0.6) return "medium";
  return "low";
}

export function ravineAIResultFrame(input: {
  fact?: unknown;
  inference?: unknown;
  recommendation?: unknown;
  confidence?: number;
}) {
  return {
    fact: input.fact ?? null,
    inference: input.inference ?? null,
    recommendation: input.recommendation ?? null,
    confidence: confidenceBand(input.confidence),
  };
}
