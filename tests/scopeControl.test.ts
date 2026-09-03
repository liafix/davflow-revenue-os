import { describe, expect, it } from "vitest";
import { addCalendarDays, evaluateScopeRequest } from "../domain/scopeControl";
import type { Quote } from "../domain/types";

const quote: Quote = {
  id: "Q-1",
  opportunityId: "O-1",
  status: "APPROVED",
  originalContractValue: 600,
  currentContractValue: 600,
  baseEffortHours: 10,
  originalEffortHours: 10,
  riskBufferHours: 0,
  billableHourlyRate: 60,
  internalHourlyCost: 36,
  scopeRisk: "LOW",
  scopeItemIds: ["S1"],
  scopeSnapshot: [{ id: "S1", name: "CMS", capability: "CMS", baseHours: 10, risk: "LOW", pricedHours: 10, price: 600 }],
  excludedCapabilitiesSnapshot: ["BOOKING"],
  targetDateSnapshot: "2026-09-30",
  deliveryWeeks: 2,
  validityDays: 15,
  paymentMilestones: [{ label: "Delivery", percent: 100 }],
  assumptionsSnapshot: [],
  exclusionsSnapshot: ["Online booking"],
};

describe("PASS 5 scope-control evidence", () => {
  it("proves an excluded capability is out of scope", () => {
    const decision = evaluateScopeRequest(quote, { id: "R1", text: "Add booking", capability: "BOOKING" });
    expect(decision.status).toBe("OUT_OF_SCOPE");
    expect(decision.explicitlyExcluded).toBe(true);
    expect(decision.approvedScopeMatches).toHaveLength(0);
    expect(decision.quoteId).toBe("Q-1");
  });

  it("recognizes a capability already in approved scope", () => {
    const decision = evaluateScopeRequest(quote, { id: "R2", text: "Adjust CMS", capability: "CMS" });
    expect(decision.status).toBe("IN_SCOPE");
    expect(decision.approvedScopeMatches[0]?.name).toBe("CMS");
  });

  it("calculates schedule impact deterministically", () => {
    expect(addCalendarDays("2026-09-30", 3)).toBe("2026-10-03");
    expect(() => addCalendarDays("bad", 3)).toThrow();
    expect(() => addCalendarDays("2026-09-30", -1)).toThrow();
  });
});
