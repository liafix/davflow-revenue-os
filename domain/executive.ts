import { deriveDemoView } from "./viewModel";
import type { DemoState, MarginStatus, ScopeDecisionStatus } from "./types";

export type ExecutiveStage =
  | "DISCOVERY"
  | "SCOPE_REVIEW"
  | "QUOTE_READY"
  | "QUOTE_IN_PROGRESS"
  | "CONTRACT_APPROVED"
  | "DELIVERY_ACTIVE"
  | "SCOPE_CHANGE_REVIEW"
  | "CHANGE_PROPOSED"
  | "REVENUE_EXPANDED";

export type ScopeProtectionStatus = "NOT_EVALUATED" | ScopeDecisionStatus | "MONETIZED";

function deriveStage(state: DemoState): ExecutiveStage {
  if (state.changeRequest?.status === "APPROVED") return "REVENUE_EXPANDED";
  if (state.changeRequest?.status === "PROPOSED") return "CHANGE_PROPOSED";
  if (state.project?.scopeDecision) return "SCOPE_CHANGE_REVIEW";
  if (state.project) return "DELIVERY_ACTIVE";
  if (state.quote?.status === "APPROVED") return "CONTRACT_APPROVED";
  if (state.quote) return "QUOTE_IN_PROGRESS";
  if (state.opportunity.status === "SCOPE_APPROVED") return "QUOTE_READY";
  if (state.opportunity.status === "SCOPE_REVIEW") return "SCOPE_REVIEW";
  return "DISCOVERY";
}

function deriveScopeProtectionStatus(state: DemoState): ScopeProtectionStatus {
  if (state.changeRequest?.status === "APPROVED") return "MONETIZED";
  return state.project?.scopeDecision?.status ?? "NOT_EVALUATED";
}

function deriveNextAction(state: DemoState): string {
  if (state.changeRequest?.status === "APPROVED") return "Review expanded contract, delivery target and protected margin.";
  if (state.changeRequest?.status === "PROPOSED") return "Approve the commercial change to update revenue, work and schedule atomically.";
  if (state.changeRequest?.status === "DRAFT") return "Propose the priced change to the client without changing the active contract.";
  if (state.project?.scopeDecision?.status === "OUT_OF_SCOPE") return "Convert verified scope creep into a priced change request.";
  if (state.project?.newClientRequest) return "Compare the new request with the immutable approved quote snapshot.";
  if (state.project) return "Use delivery evidence to monitor margin, then introduce the client scope change.";
  if (state.quote?.status === "APPROVED") return "Convert the approved commercial agreement into auditable delivery work.";
  if (state.quote?.status === "SENT") return "Approve the quote before contract value becomes active.";
  if (state.quote?.status === "DRAFT") return "Send the explainable commercial quote.";
  if (state.opportunity.status === "SCOPE_APPROVED") return "Generate the quote from the human-approved scope snapshot.";
  if (state.opportunity.status === "SCOPE_REVIEW") return "Review assumptions, effort and risk before approving commercial scope.";
  return "Analyze the client request into a structured, reviewable scope draft.";
}

function deriveSummary(stage: ExecutiveStage, state: DemoState, marginStatus: MarginStatus | null): string {
  switch (stage) {
    case "REVENUE_EXPANDED":
      return "Scope change was commercialized before delivery expanded; contract value, work and target date moved together after approval.";
    case "CHANGE_PROPOSED":
      return "Commercial impact is priced and proposed, while the active contract remains unchanged until explicit approval.";
    case "SCOPE_CHANGE_REVIEW":
      return state.project?.scopeDecision?.status === "OUT_OF_SCOPE"
        ? "New work is evidenced outside the approved quote, creating a controlled commercial decision instead of silent scope creep."
        : "The client request is being compared with the approved commercial baseline before delivery changes.";
    case "DELIVERY_ACTIVE":
      return marginStatus && marginStatus !== "HEALTHY"
        ? "Delivery evidence is signalling margin pressure before the project silently absorbs the overrun."
        : "Approved commercial scope is executing with task-level evidence and live profitability forecasting.";
    case "CONTRACT_APPROVED":
      return "Commercial terms are approved and snapshotted; revenue is active and ready to convert into delivery work.";
    case "QUOTE_IN_PROGRESS":
      return "The approved scope has become an explainable commercial proposal without activating contract revenue prematurely.";
    case "QUOTE_READY":
      return "Human-approved scope is ready for deterministic pricing and quote generation.";
    case "SCOPE_REVIEW":
      return "AI-assisted structure remains a draft while the human reviews deliverables, effort and risk assumptions.";
    default:
      return "The workflow starts with raw client context; no contract value or margin is claimed before commercial scope exists.";
  }
}

export function deriveExecutiveReadout(state: DemoState) {
  const view = deriveDemoView(state);
  const stage = deriveStage(state);
  const originalContractValue = state.quote?.status === "APPROVED" ? state.quote.originalContractValue : null;
  const currentContractValue = view.contractValue;
  const approvedChangeRevenue = view.approvedChangeRevenue;
  const revenueExpansionRatio = originalContractValue && approvedChangeRevenue > 0
    ? approvedChangeRevenue / originalContractValue
    : 0;
  const plannedMargin = view.plannedEconomics?.margin ?? view.quoteEstimate?.margin ?? null;
  const projectedMargin = view.projectedEconomics?.margin ?? null;
  const marginStatus = view.projectedEconomics?.marginStatus ?? view.plannedEconomics?.marginStatus ?? view.quoteEstimate?.marginStatus ?? null;
  const deliveryTargetDate = state.project?.deliveryTargetDate ?? state.quote?.targetDateSnapshot ?? state.opportunity.targetDate;
  const scopeProtectionStatus = deriveScopeProtectionStatus(state);
  const profitabilitySignal = marginStatus === null
    ? "PENDING"
    : marginStatus;

  return {
    stage,
    summary: deriveSummary(stage, state, marginStatus),
    nextAction: deriveNextAction(state),
    originalContractValue,
    currentContractValue,
    approvedChangeRevenue,
    revenueExpansionRatio,
    plannedMargin,
    projectedMargin,
    marginStatus,
    profitabilitySignal,
    profitAtRisk: view.profitAtRisk,
    deliveryTargetDate,
    scopeProtectionStatus,
    deliverySummary: view.deliverySummary,
    changeImpact: view.changeImpact,
  };
}
