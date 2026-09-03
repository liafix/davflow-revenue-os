import { describe, expect, it } from "vitest";
import { createInitialDemoState } from "../data/demo";
import { demoReducer, type DemoAction } from "../domain/demoEngine";
import { deriveExecutiveReadout } from "../domain/executive";
import { candidateStory } from "../domain/candidateStory";

function run(actions: DemoAction[]) {
  return actions.reduce(demoReducer, createInitialDemoState());
}

const toProject: DemoAction[] = [
  { type: "ANALYZE" },
  { type: "APPROVE_SCOPE" },
  { type: "GENERATE_QUOTE" },
  { type: "SEND_QUOTE" },
  { type: "APPROVE_QUOTE" },
  { type: "CREATE_PROJECT" },
];

describe("PASS 6 executive readout + candidate story", () => {
  it("claims no contract or revenue expansion during discovery", () => {
    const executive = deriveExecutiveReadout(createInitialDemoState());
    expect(executive.stage).toBe("DISCOVERY");
    expect(executive.currentContractValue).toBeNull();
    expect(executive.originalContractValue).toBeNull();
    expect(executive.approvedChangeRevenue).toBe(0);
    expect(executive.scopeProtectionStatus).toBe("NOT_EVALUATED");
  });

  it("derives delivery profitability without creating a second source of truth", () => {
    const executive = deriveExecutiveReadout(run(toProject));
    expect(executive.stage).toBe("DELIVERY_ACTIVE");
    expect(executive.currentContractValue).toBe(2400);
    expect(executive.plannedMargin).toBeCloseTo(0.4);
    expect(executive.projectedMargin).toBeCloseTo(0.485714, 5);
    expect(executive.profitAtRisk).toBe(0);
  });

  it("surfaces scope protection before monetization", () => {
    const state = run([
      ...toProject,
      { type: "ADD_CLIENT_REQUEST" },
      { type: "ANALYZE_SCOPE_CHANGE" },
    ]);
    const executive = deriveExecutiveReadout(state);
    expect(executive.stage).toBe("SCOPE_CHANGE_REVIEW");
    expect(executive.scopeProtectionStatus).toBe("OUT_OF_SCOPE");
    expect(executive.approvedChangeRevenue).toBe(0);
    expect(executive.currentContractValue).toBe(2400);
  });

  it("shows revenue expansion only after approved change", () => {
    const state = run([
      ...toProject,
      { type: "ADD_CLIENT_REQUEST" },
      { type: "ANALYZE_SCOPE_CHANGE" },
      { type: "CREATE_CHANGE_REQUEST" },
      { type: "PROPOSE_CHANGE_REQUEST" },
      { type: "APPROVE_CHANGE_REQUEST" },
    ]);
    const executive = deriveExecutiveReadout(state);
    expect(executive.stage).toBe("REVENUE_EXPANDED");
    expect(executive.scopeProtectionStatus).toBe("MONETIZED");
    expect(executive.originalContractValue).toBe(2400);
    expect(executive.approvedChangeRevenue).toBe(720);
    expect(executive.currentContractValue).toBe(3120);
    expect(executive.revenueExpansionRatio).toBeCloseTo(0.3);
    expect(executive.deliveryTargetDate).toBe("2026-10-03");
  });

  it("keeps candidate framing explicit and non-proprietary", () => {
    expect(candidateStory.roleMap.length).toBeGreaterThanOrEqual(5);
    expect(candidateStory.architecture).toContain("Human Review");
    expect(candidateStory.architecture).toContain("Revenue Expansion");
    expect(candidateStory.disclaimer).toMatch(/synthetic candidate demonstration/i);
    expect(candidateStory.disclaimer).toMatch(/does not represent DavSol internal data/i);
    expect(candidateStory.disclaimer).toMatch(/deterministic fallback/i);
  });
});
