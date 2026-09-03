import { describe, expect, it } from "vitest";
import { createInitialDemoState } from "../data/demo";
import { demoReducer } from "../domain/demoEngine";
import { deriveGuidedDemoControl } from "../lib/demoGuidance";

describe("guided demo presentation controller", () => {
  it("walks the default commercial path without bypassing domain gates", () => {
    let state = createInitialDemoState();
    const labels: string[] = [];

    for (let index = 0; index < 20; index += 1) {
      const control = deriveGuidedDemoControl(state);
      labels.push(control.label);
      if (!control.action) break;
      state = demoReducer(state, control.action);
      expect(state.error).toBeNull();
    }

    expect(labels).toEqual([
      "Start Guided Demo",
      "Approve Reviewed Scope",
      "Generate Quote",
      "Send Quote",
      "Approve Quote",
      "Create Delivery Project",
      "Add Client Request",
      "Compare Approved Scope",
      "Create Change Request",
      "Propose Change",
      "Approve Change",
      "Demo Complete",
    ]);
    expect(state.quote?.currentContractValue).toBe(3120);
    expect(state.changeRequest?.status).toBe("APPROVED");
  });
});
