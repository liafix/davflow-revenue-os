import { describe, expect, it } from "vitest";
import {
  calculateChangeRequestEstimate,
  calculateClientPrice,
  calculateExpectedMargin,
  calculateInternalCost,
  calculateProfitAtRisk,
  calculateProjectEconomics,
  calculateProjectedHours,
  calculateRiskAdjustedHours,
  calculateScopeEstimate,
  classifyMargin,
} from "../domain/economics";
import { demoScenario } from "../domain/scenario";

describe("PASS 2 revenue economics", () => {
  it("applies explicit risk multipliers to effort", () => {
    expect(calculateRiskAdjustedHours(6, "LOW")).toBe(6);
    expect(calculateRiskAdjustedHours(7, "MEDIUM")).toBe(8);
    expect(calculateRiskAdjustedHours(10, "MEDIUM")).toBe(12);
    expect(calculateRiskAdjustedHours(10, "HIGH")).toBe(13);
  });

  it("keeps the approved demo quote coherent after risk adjustment", () => {
    const estimate = calculateScopeEstimate(demoScenario.analyzedScope);
    expect(estimate.baseHours).toBe(38);
    expect(estimate.riskBufferHours).toBe(2);
    expect(estimate.riskAdjustedHours).toBe(40);
    expect(estimate.revenue).toBe(2400);
    expect(estimate.cost).toBe(1440);
    expect(estimate.profit).toBe(960);
    expect(estimate.margin).toBeCloseTo(0.4);
    expect(estimate.marginStatus).toBe("HEALTHY");
    expect(estimate.overallRisk).toBe("MEDIUM");
  });

  it("derives quote value from risk-adjusted hours and the supplied rate", () => {
    const estimate = calculateScopeEstimate(demoScenario.analyzedScope, { billableHourlyRate: 100 });
    expect(estimate.riskAdjustedHours).toBe(40);
    expect(estimate.revenue).toBe(4000);
  });

  it("derives change request price from base effort, risk and rate", () => {
    const estimate = calculateChangeRequestEstimate(10, "MEDIUM", { billableHourlyRate: 60 });
    expect(estimate.baseHours).toBe(10);
    expect(estimate.riskBufferHours).toBe(2);
    expect(estimate.riskAdjustedHours).toBe(12);
    expect(estimate.revenue).toBe(720);
  });

  it("classifies margin health using explicit thresholds", () => {
    expect(classifyMargin(0.4)).toBe("HEALTHY");
    expect(classifyMargin(0.35)).toBe("WATCH");
    expect(classifyMargin(0.25)).toBe("AT_RISK");
    expect(classifyMargin(0.1)).toBe("CRITICAL");
  });

  it("quantifies gross profit erosion without calling it revenue", () => {
    expect(calculateProfitAtRisk(2400, 0.4, 0.29)).toBeCloseTo(264);
    expect(calculateProfitAtRisk(2400, 0.4, 0.49)).toBe(0);
  });

  it("keeps baseline project economics coherent", () => {
    const result = calculateProjectEconomics(2400, 40);
    expect(result.cost).toBe(1440);
    expect(result.profit).toBe(960);
    expect(result.margin).toBeCloseTo(0.4);
    expect(result.marginStatus).toBe("HEALTHY");
  });

  it("handles zero revenue without division errors", () => expect(calculateExpectedMargin(0, 0)).toBe(0));
  it("projects hours from progress", () => expect(calculateProjectedHours(12, 0.35)).toBeCloseTo(34.285714, 5));
  it("returns unavailable projection at zero completion", () => expect(calculateProjectedHours(0, 0)).toBeNull());

  it("rejects invalid inputs", () => {
    expect(() => calculateProjectedHours(12, -0.1)).toThrow();
    expect(() => calculateProjectedHours(12, 1.1)).toThrow();
    expect(() => calculateInternalCost(-1)).toThrow();
    expect(() => calculateClientPrice(10, 0)).toThrow();
    expect(() => calculateRiskAdjustedHours(-1, "LOW")).toThrow();
  });
});
