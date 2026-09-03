import { describe, expect, it } from "vitest";
import { createInitialDemoState } from "../data/demo";
import { demoReducer, detectScopeChange, type DemoAction } from "../domain/demoEngine";
import { deriveDemoView } from "../domain/viewModel";

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

describe("PASS 5 scope control + revenue expansion invariants", () => {
  it("shows no contract before quote approval", () => {
    expect(deriveDemoView(createInitialDemoState()).contractValue).toBeNull();
  });

  it("keeps intake editable only before analysis", () => {
    const edited = demoReducer(createInitialDemoState(), { type: "UPDATE_OPPORTUNITY", patch: { clientName: "Edited Client" } });
    expect(edited.opportunity.clientName).toBe("Edited Client");
    const analyzed = demoReducer(edited, { type: "ANALYZE" });
    const blocked = demoReducer(analyzed, { type: "UPDATE_OPPORTUNITY", patch: { clientName: "Too Late" } });
    expect(blocked.opportunity.clientName).toBe("Edited Client");
    expect(blocked.error).toMatch(/locked/i);
  });

  it("builds the default structured scope from the intake", () => {
    const analyzed = run([{ type: "ANALYZE" }]);
    expect(analyzed.opportunity.scope).toHaveLength(7);
    expect(analyzed.opportunity.scope.every((item) => item.selected && !item.approved)).toBe(true);
    expect(analyzed.opportunity.excludedCapabilities).toContain("BOOKING");
    expect(analyzed.opportunity.requirements.length).toBeGreaterThan(0);
  });

  it("allows human scope overrides before approval and prices only selected scope", () => {
    const analyzed = run([{ type: "ANALYZE" }]);
    const services = analyzed.opportunity.scope.find((item) => item.name === "Services");
    if (!services) throw new Error("Expected Services scope item");
    const withoutServices = demoReducer(analyzed, { type: "TOGGLE_SCOPE_ITEM", id: services.id });
    const homepage = withoutServices.opportunity.scope.find((item) => item.name === "Homepage");
    if (!homepage) throw new Error("Expected Homepage scope item");
    const adjusted = demoReducer(withoutServices, { type: "UPDATE_SCOPE_ITEM", id: homepage.id, patch: { baseHours: 8, risk: "HIGH" } });
    const approved = demoReducer(adjusted, { type: "APPROVE_SCOPE" });
    const quoted = demoReducer(approved, { type: "GENERATE_QUOTE" });
    expect(quoted.quote?.scopeItemIds).not.toContain(services.id);
    expect(quoted.quote?.scopeItemIds).toContain(homepage.id);
    expect(quoted.quote?.originalContractValue).not.toBe(2400);
  });

  it("locks scope edits after human approval", () => {
    const approved = run([{ type: "ANALYZE" }, { type: "APPROVE_SCOPE" }]);
    const item = approved.opportunity.scope[0];
    const blocked = demoReducer(approved, { type: "UPDATE_SCOPE_ITEM", id: item.id, patch: { baseHours: 99 } });
    expect(blocked.opportunity.scope[0].baseHours).toBe(item.baseHours);
    expect(blocked.error).toMatch(/only change during/i);
  });

  it("prevents project creation before quote approval", () => {
    const state = demoReducer(createInitialDemoState(), { type: "CREATE_PROJECT" });
    expect(state.project).toBeNull();
    expect(state.error).toMatch(/approved quote/i);
  });

  it("snapshots risk-adjusted quote economics and commercial terms from approved scope", () => {
    const state = run([{ type: "ANALYZE" }, { type: "APPROVE_SCOPE" }, { type: "GENERATE_QUOTE" }]);
    expect(state.quote?.baseEffortHours).toBe(38);
    expect(state.quote?.riskBufferHours).toBe(2);
    expect(state.quote?.originalEffortHours).toBe(40);
    expect(state.quote?.billableHourlyRate).toBe(60);
    expect(state.quote?.internalHourlyCost).toBe(36);
    expect(state.quote?.scopeRisk).toBe("MEDIUM");
    expect(state.quote?.originalContractValue).toBe(2400);
    expect(state.quote?.scopeItemIds).toHaveLength(7);
    expect(state.quote?.scopeSnapshot).toHaveLength(7);
    expect(state.quote?.scopeSnapshot.reduce((sum, item) => sum + item.price, 0)).toBe(2400);
    expect(state.quote?.excludedCapabilitiesSnapshot).toContain("BOOKING");
    expect(state.quote?.targetDateSnapshot).toBe("2026-09-30");
    expect(state.quote?.deliveryWeeks).toBe(3);
    expect(state.quote?.validityDays).toBe(15);
    expect(state.quote?.paymentMilestones.reduce((sum, item) => sum + item.percent, 0)).toBe(100);
    expect(state.quote?.exclusionsSnapshot).toContain("Online booking");
  });

  it("derives quote line items from the approved scope and reconciles to the quote total", () => {
    const state = run([{ type: "ANALYZE" }, { type: "APPROVE_SCOPE" }, { type: "GENERATE_QUOTE" }]);
    const view = deriveDemoView(state);
    expect(view.quoteLineItems.reduce((sum, item) => sum + item.price, 0)).toBe(state.quote?.originalContractValue);
    expect(view.budgetFit).toBe("WITHIN");
  });


  it("creates auditable delivery tasks from the approved quote scope", () => {
    const state = run(toProject);
    const view = deriveDemoView(state);
    expect(state.project?.tasks).toHaveLength(7);
    expect(view.deliverySummary?.plannedHours).toBe(40);
    expect(view.deliverySummary?.actualHours).toBeCloseTo(12);
    expect(view.deliverySummary?.completionRatio).toBeCloseTo(0.35);
    expect(view.projectedEconomics?.projectedHours).toBeCloseTo(34.285714, 5);
    expect(view.projectedEconomics?.margin).toBeCloseTo(0.485714, 5);
    expect(view.projectedEconomics?.marginStatus).toBe("HEALTHY");
  });

  it("projects an explainable margin warning from task-level effort overrun", () => {
    const state = run([...toProject, { type: "SIMULATE_DELIVERY_OVERRUN" }]);
    const view = deriveDemoView(state);
    expect(view.deliverySummary?.actualHours).toBeCloseTo(18);
    expect(view.deliverySummary?.completionRatio).toBeCloseTo(0.35);
    expect(view.projectedEconomics?.projectedHours).toBeCloseTo(51.428571, 5);
    expect(view.projectedEconomics?.margin).toBeCloseTo(0.228571, 5);
    expect(view.projectedEconomics?.marginStatus).toBe("AT_RISK");
    expect(view.profitAtRisk).toBeCloseTo(411.43, 2);
    expect(view.marginGuard?.message).toMatch(/actual effort is growing faster/i);
  });

  it("lets task evidence change without mutating approved commercial terms", () => {
    const state = run(toProject);
    const task = state.project?.tasks[0];
    if (!task || !state.quote) throw new Error("Expected delivery task and quote");
    const changed = demoReducer(state, { type: "UPDATE_DELIVERY_TASK", id: task.id, patch: { actualHours: task.actualHours + 4, completionRatio: 0.5 } });
    expect(changed.quote?.originalContractValue).toBe(state.quote.originalContractValue);
    expect(changed.quote?.billableHourlyRate).toBe(state.quote.billableHourlyRate);
    expect(changed.project?.tasks[0].actualHours).toBeCloseTo(task.actualHours + 4);
  });

  it("rejects invalid delivery evidence", () => {
    const state = run(toProject);
    const task = state.project?.tasks[0];
    if (!task) throw new Error("Expected delivery task");
    const negative = demoReducer(state, { type: "UPDATE_DELIVERY_TASK", id: task.id, patch: { actualHours: -1 } });
    expect(negative.error).toMatch(/non-negative/i);
    const invalidProgress = demoReducer(state, { type: "UPDATE_DELIVERY_TASK", id: task.id, patch: { completionRatio: 1.2 } });
    expect(invalidProgress.error).toMatch(/between 0 and 1/i);
  });

  it("uses the immutable approved quote snapshot for scope change evidence", () => {
    const state = run(toProject);
    expect(detectScopeChange(state, "BOOKING")).toBe(true);
    expect(detectScopeChange(state, "CMS")).toBe(false);
    expect(detectScopeChange(state, "SEO")).toBe(false);

    const withRequest = demoReducer(state, { type: "ADD_CLIENT_REQUEST" });
    const analyzed = demoReducer(withRequest, { type: "ANALYZE_SCOPE_CHANGE" });
    expect(analyzed.project?.scopeDecision?.status).toBe("OUT_OF_SCOPE");
    expect(analyzed.project?.scopeDecision?.quoteId).toBe(state.quote?.id);
    expect(analyzed.project?.scopeDecision?.explicitlyExcluded).toBe(true);
    expect(analyzed.project?.scopeDecision?.evidence.join(" ")).toMatch(/approved quote/i);
  });

  it("does not let later opportunity mutation rewrite scope evidence", () => {
    const state = run(toProject);
    const mutated = {
      ...state,
      opportunity: {
        ...state.opportunity,
        excludedCapabilities: [],
        scope: [...state.opportunity.scope, { id: "MUT", name: "Booking mutation", description: "not contracted", capability: "BOOKING" as const, baseHours: 1, risk: "LOW" as const, selected: true, approved: true }],
      },
    };
    const withRequest = demoReducer(mutated, { type: "ADD_CLIENT_REQUEST" });
    const analyzed = demoReducer(withRequest, { type: "ANALYZE_SCOPE_CHANGE" });
    expect(analyzed.project?.scopeDecision?.status).toBe("OUT_OF_SCOPE");
    expect(analyzed.project?.scopeDecision?.explicitlyExcluded).toBe(true);
  });

  it("prices the change request from base effort plus risk buffer", () => {
    const state = run([
      ...toProject,
      { type: "ADD_CLIENT_REQUEST" },
      { type: "ANALYZE_SCOPE_CHANGE" },
      { type: "CREATE_CHANGE_REQUEST" },
    ]);
    expect(state.changeRequest?.baseHours).toBe(10);
    expect(state.changeRequest?.riskBufferHours).toBe(2);
    expect(state.changeRequest?.addedHours).toBe(12);
    expect(state.changeRequest?.price).toBe(720);
    expect(state.changeRequest?.expectedCost).toBe(432);
    expect(state.changeRequest?.expectedProfit).toBe(288);
    expect(state.changeRequest?.expectedMargin).toBeCloseTo(0.4);
    expect(state.changeRequest?.previousContractValue).toBe(2400);
    expect(state.changeRequest?.resultingContractValue).toBe(3120);
    expect(state.changeRequest?.targetDateBefore).toBe("2026-09-30");
    expect(state.changeRequest?.targetDateAfter).toBe("2026-10-03");
    expect(state.quote?.currentContractValue).toBe(2400);
    expect(state.project?.deliveryTargetDate).toBe("2026-09-30");
  });

  it("reuses the approved quote pricing snapshot for change requests", () => {
    const base = run([
      ...toProject,
      { type: "ADD_CLIENT_REQUEST" },
      { type: "ANALYZE_SCOPE_CHANGE" },
    ]);
    if (!base.quote) throw new Error("Expected quote");
    const repriced = { ...base, quote: { ...base.quote, billableHourlyRate: 75 } };
    const state = demoReducer(repriced, { type: "CREATE_CHANGE_REQUEST" });
    expect(state.changeRequest?.billableHourlyRate).toBe(75);
    expect(state.changeRequest?.price).toBe(900);
  });


  it("blocks approval when the commercial baseline changed after proposal", () => {
    const proposed = run([
      ...toProject,
      { type: "ADD_CLIENT_REQUEST" },
      { type: "ANALYZE_SCOPE_CHANGE" },
      { type: "CREATE_CHANGE_REQUEST" },
      { type: "PROPOSE_CHANGE_REQUEST" },
    ]);
    if (!proposed.quote) throw new Error("Expected quote");
    const stale = { ...proposed, quote: { ...proposed.quote, currentContractValue: proposed.quote.currentContractValue + 1 } };
    const blocked = demoReducer(stale, { type: "APPROVE_CHANGE_REQUEST" });
    expect(blocked.error).toMatch(/baseline is stale/i);
    expect(blocked.changeRequest?.status).toBe("PROPOSED");
  });

  it("does not add change revenue before approval", () => {
    const state = run([
      ...toProject,
      { type: "ADD_CLIENT_REQUEST" },
      { type: "ANALYZE_SCOPE_CHANGE" },
      { type: "CREATE_CHANGE_REQUEST" },
      { type: "PROPOSE_CHANGE_REQUEST" },
    ]);
    expect(state.quote?.currentContractValue).toBe(2400);
  });

  it("runs the full PASS 5 golden path without changing hardened economics", () => {
    const state = run([
      ...toProject,
      { type: "ADD_CLIENT_REQUEST" },
      { type: "ANALYZE_SCOPE_CHANGE" },
      { type: "CREATE_CHANGE_REQUEST" },
      { type: "PROPOSE_CHANGE_REQUEST" },
      { type: "APPROVE_CHANGE_REQUEST" },
    ]);
    const view = deriveDemoView(state);
    expect(state.quote?.currentContractValue).toBe(3120);
    expect(state.changeRequest?.status).toBe("APPROVED");
    expect(state.auditLog.at(-1)?.data?.newContractValue).toBe(3120);
    expect(view.plannedHours).toBe(52);
    expect(state.project?.tasks.at(-1)?.source).toBe("CHANGE_REQUEST");
    expect(state.project?.tasks.at(-1)?.plannedHours).toBe(12);
    expect(state.project?.deliveryTargetDate).toBe("2026-10-03");
    expect(view.deliverySummary?.actualHours).toBeCloseTo(12);
    expect(view.deliverySummary?.completionRatio).toBeCloseTo(14 / 52);
    expect(view.plannedEconomics?.margin).toBeCloseTo(0.4);
    expect(view.plannedEconomics?.marginStatus).toBe("HEALTHY");
  });

  it("keeps reset deterministic", () => {
    const dirty = run(toProject);
    const reset = demoReducer(dirty, { type: "RESET" });
    expect(reset).toEqual(createInitialDemoState());
  });
});
