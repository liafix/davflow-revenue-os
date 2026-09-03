import { describe, expect, it } from "vitest";
import { applyDeliveryEffortMultiplier, createChangeRequestDeliveryTask, createDeliveryTasksFromScope, summarizeDelivery, updateDeliveryTask } from "../domain/delivery";
import { demoScenario } from "../domain/scenario";

describe("PASS 4 delivery evidence", () => {
  it("derives the deterministic baseline from approved scope", () => {
    const tasks = createDeliveryTasksFromScope(demoScenario.analyzedScope);
    const summary = summarizeDelivery(tasks);
    expect(summary.plannedHours).toBe(40);
    expect(summary.actualHours).toBeCloseTo(12);
    expect(summary.completionRatio).toBeCloseTo(0.35);
  });

  it("changes actual effort without changing earned progress", () => {
    const baseline = createDeliveryTasksFromScope(demoScenario.analyzedScope);
    const overrun = applyDeliveryEffortMultiplier(baseline, demoScenario.delivery.atRiskEffortMultiplier);
    expect(summarizeDelivery(overrun).actualHours).toBeCloseTo(18);
    expect(summarizeDelivery(overrun).completionRatio).toBeCloseTo(0.35);
    expect(summarizeDelivery(overrun).plannedHours).toBe(40);
  });

  it("validates manual delivery evidence", () => {
    const tasks = createDeliveryTasksFromScope(demoScenario.analyzedScope);
    expect(() => updateDeliveryTask(tasks, tasks[0].id, { actualHours: -1 })).toThrow();
    expect(() => updateDeliveryTask(tasks, tasks[0].id, { completionRatio: 1.01 })).toThrow();
  });

  it("creates explicit backlog work for an approved change request", () => {
    const task = createChangeRequestDeliveryTask({ id: "CR-004", name: "Online booking", capability: "BOOKING", plannedHours: 12 });
    expect(task.source).toBe("CHANGE_REQUEST");
    expect(task.status).toBe("BACKLOG");
    expect(task.actualHours).toBe(0);
    expect(task.completionRatio).toBe(0);
  });
});
