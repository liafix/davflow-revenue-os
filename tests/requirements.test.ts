import { describe, expect, it } from "vitest";
import { createInitialDemoState } from "../data/demo";
import { analyzeOpportunity, validateOpportunityInput } from "../domain/requirements";

describe("PASS 3 deterministic requirements analyzer", () => {
  it("maps the default enquiry into all intended initial capabilities", () => {
    const analysis = analyzeOpportunity(createInitialDemoState().opportunity);
    const capabilities = new Set(analysis.scope.map((item) => item.capability));
    expect(capabilities.has("CONTENT")).toBe(true);
    expect(capabilities.has("CMS")).toBe(true);
    expect(capabilities.has("LEAD_CAPTURE")).toBe(true);
    expect(capabilities.has("ANALYTICS")).toBe(true);
    expect(capabilities.has("SEO")).toBe(true);
    expect(capabilities.has("BOOKING")).toBe(false);
  });

  it("can add booking to initial scope when the intake explicitly requests it", () => {
    const opportunity = createInitialDemoState().opportunity;
    const analysis = analyzeOpportunity({ ...opportunity, rawRequest: `${opportunity.rawRequest} We also need online booking.` });
    expect(analysis.scope.some((item) => item.capability === "BOOKING")).toBe(true);
    expect(analysis.excludedCapabilities).not.toContain("BOOKING");
  });

  it("rejects incoherent budget input before analysis", () => {
    const opportunity = { ...createInitialDemoState().opportunity, budgetMin: 5000, budgetMax: 1000 };
    expect(() => validateOpportunityInput(opportunity)).toThrow(/minimum budget/i);
  });
});
