import type { DemoAction } from "../domain/demoEngine";
import type { DemoState } from "../domain/types";

export type GuidedDemoControl = {
  label: string;
  note: string;
  action: DemoAction | null;
  targetId: "workflow" | "scope-review" | "quote" | "delivery" | "change-request" | "executive";
};

export function deriveGuidedDemoControl(state: DemoState): GuidedDemoControl {
  if (state.changeRequest?.status === "APPROVED") {
    return {
      label: "Demo Complete",
      note: "Revenue expansion is approved. Review the executive readout, then use Reset Demo to replay the scenario.",
      action: null,
      targetId: "executive",
    };
  }
  if (state.changeRequest?.status === "PROPOSED") {
    return {
      label: "Approve Change",
      note: "Commit the commercial change atomically: revenue, delivery work and target date move together.",
      action: { type: "APPROVE_CHANGE_REQUEST" },
      targetId: "executive",
    };
  }
  if (state.changeRequest?.status === "DRAFT") {
    return {
      label: "Propose Change",
      note: "Present the priced change without changing the active contract before client approval.",
      action: { type: "PROPOSE_CHANGE_REQUEST" },
      targetId: "change-request",
    };
  }
  if (state.project?.scopeDecision?.status === "OUT_OF_SCOPE") {
    return {
      label: "Create Change Request",
      note: "Convert verified scope creep into an explicit commercial proposal.",
      action: { type: "CREATE_CHANGE_REQUEST" },
      targetId: "change-request",
    };
  }
  if (state.project?.newClientRequest) {
    return {
      label: "Compare Approved Scope",
      note: "Compare the new booking request with immutable quote evidence before delivery expands.",
      action: { type: "ANALYZE_SCOPE_CHANGE" },
      targetId: "delivery",
    };
  }
  if (state.project) {
    return {
      label: "Add Client Request",
      note: "Optional: demonstrate Margin Guard first, then introduce the booking request that triggers scope control.",
      action: { type: "ADD_CLIENT_REQUEST" },
      targetId: "delivery",
    };
  }
  if (state.quote?.status === "APPROVED") {
    return {
      label: "Create Delivery Project",
      note: "Convert the approved commercial snapshot into task-level delivery evidence.",
      action: { type: "CREATE_PROJECT" },
      targetId: "delivery",
    };
  }
  if (state.quote?.status === "SENT") {
    return {
      label: "Approve Quote",
      note: "Activate contract value only after the quote has been explicitly approved.",
      action: { type: "APPROVE_QUOTE" },
      targetId: "quote",
    };
  }
  if (state.quote?.status === "DRAFT") {
    return {
      label: "Send Quote",
      note: "Move the explainable proposal to SENT without activating contract revenue.",
      action: { type: "SEND_QUOTE" },
      targetId: "quote",
    };
  }
  if (state.opportunity.status === "SCOPE_APPROVED") {
    return {
      label: "Generate Quote",
      note: "Generate commercial terms from the human-approved scope and pricing engine.",
      action: { type: "GENERATE_QUOTE" },
      targetId: "quote",
    };
  }
  if (state.opportunity.status === "SCOPE_REVIEW") {
    return {
      label: "Approve Reviewed Scope",
      note: "Review inclusion, effort and risk first; this action freezes the current human-approved selection.",
      action: { type: "APPROVE_SCOPE" },
      targetId: "quote",
    };
  }
  return {
    label: "Start Guided Demo",
    note: "Analyze the seeded client brief into a deterministic AI-assisted draft for human review.",
    action: { type: "ANALYZE" },
    targetId: "scope-review",
  };
}
