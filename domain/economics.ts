import { demoScenario, marginPolicy, riskPolicy } from "./scenario";
import type { MarginStatus, Risk, ScopeItem } from "./types";

function assertFiniteNonNegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a finite non-negative number.`);
}

function assertFinitePositive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be a finite positive number.`);
}

export function calculateRiskAdjustedHours(baseHours: number, risk: Risk) {
  assertFiniteNonNegative(baseHours, "Base hours");
  const multiplier = riskPolicy[risk];
  assertFinitePositive(multiplier, "Risk multiplier");
  return Math.max(baseHours, Math.round(baseHours * multiplier));
}

export function calculateBaseScopeHours(scope: ScopeItem[]) {
  return scope.reduce((sum, item) => {
    assertFiniteNonNegative(item.baseHours, `Base hours for ${item.id}`);
    return sum + item.baseHours;
  }, 0);
}

export function calculateRiskAdjustedScopeHours(scope: ScopeItem[]) {
  return scope.reduce((sum, item) => sum + calculateRiskAdjustedHours(item.baseHours, item.risk), 0);
}

export function calculateScopeRiskBufferHours(scope: ScopeItem[]) {
  return calculateRiskAdjustedScopeHours(scope) - calculateBaseScopeHours(scope);
}

export function calculateInternalCost(hours: number, hourlyCost: number = demoScenario.pricing.internalHourlyCost) {
  assertFiniteNonNegative(hours, "Hours");
  assertFiniteNonNegative(hourlyCost, "Hourly cost");
  return hours * hourlyCost;
}

export function calculateClientPrice(hours: number, billableRate: number = demoScenario.pricing.billableHourlyRate) {
  assertFiniteNonNegative(hours, "Hours");
  assertFinitePositive(billableRate, "Billable rate");
  return hours * billableRate;
}

export function calculateExpectedProfit(revenue: number, cost: number) {
  assertFiniteNonNegative(revenue, "Revenue");
  assertFiniteNonNegative(cost, "Cost");
  return revenue - cost;
}

export function calculateExpectedMargin(revenue: number, cost: number) {
  assertFiniteNonNegative(revenue, "Revenue");
  assertFiniteNonNegative(cost, "Cost");
  if (revenue === 0) return 0;
  return (revenue - cost) / revenue;
}

export function classifyMargin(margin: number): MarginStatus {
  if (!Number.isFinite(margin)) throw new Error("Margin must be finite.");
  if (margin >= marginPolicy.healthy) return "HEALTHY";
  if (margin >= marginPolicy.watch) return "WATCH";
  if (margin >= marginPolicy.atRisk) return "AT_RISK";
  return "CRITICAL";
}

export function calculateProfitAtRisk(revenue: number, plannedMargin: number, projectedMargin: number) {
  assertFiniteNonNegative(revenue, "Revenue");
  if (!Number.isFinite(plannedMargin) || !Number.isFinite(projectedMargin)) throw new Error("Margins must be finite.");
  const amount = Math.max(0, revenue * (plannedMargin - projectedMargin));
  return Math.round(amount * 100) / 100;
}

export function calculateProjectedHours(actualHours: number, completionRatio: number): number | null {
  assertFiniteNonNegative(actualHours, "Actual hours");
  if (!Number.isFinite(completionRatio) || completionRatio < 0 || completionRatio > 1) {
    throw new Error("Completion ratio must be between 0 and 1.");
  }
  if (completionRatio === 0) return null;
  return actualHours / completionRatio;
}

export function calculateProjectEconomics(revenue: number, effortHours: number, internalHourlyCost: number = demoScenario.pricing.internalHourlyCost) {
  const cost = calculateInternalCost(effortHours, internalHourlyCost);
  const profit = calculateExpectedProfit(revenue, cost);
  const margin = calculateExpectedMargin(revenue, cost);
  return { revenue, effortHours, cost, profit, margin, marginStatus: classifyMargin(margin) };
}

export function calculateProjectedEconomics(revenue: number, actualHours: number, completionRatio: number, internalHourlyCost: number = demoScenario.pricing.internalHourlyCost) {
  const projectedHours = calculateProjectedHours(actualHours, completionRatio);
  if (projectedHours === null) return null;
  return { projectedHours, ...calculateProjectEconomics(revenue, projectedHours, internalHourlyCost) };
}

export function calculateScopeEstimate(
  scope: ScopeItem[],
  pricing: { billableHourlyRate?: number; internalHourlyCost?: number } = {},
) {
  const baseHours = calculateBaseScopeHours(scope);
  const riskAdjustedHours = calculateRiskAdjustedScopeHours(scope);
  const riskBufferHours = riskAdjustedHours - baseHours;
  const billableHourlyRate = pricing.billableHourlyRate ?? demoScenario.pricing.billableHourlyRate;
  const internalHourlyCost = pricing.internalHourlyCost ?? demoScenario.pricing.internalHourlyCost;
  const revenue = calculateClientPrice(riskAdjustedHours, billableHourlyRate);
  const economics = calculateProjectEconomics(revenue, riskAdjustedHours, internalHourlyCost);
  const riskCounts = scope.reduce<Record<Risk, number>>((counts, item) => {
    counts[item.risk] += 1;
    return counts;
  }, { LOW: 0, MEDIUM: 0, HIGH: 0 });
  const overallRisk: Risk = riskCounts.HIGH > 0 ? "HIGH" : riskCounts.MEDIUM > 0 ? "MEDIUM" : "LOW";
  return { baseHours, riskAdjustedHours, riskBufferHours, billableHourlyRate, internalHourlyCost, riskCounts, overallRisk, ...economics };
}

export function calculateChangeRequestEstimate(
  baseHours: number,
  risk: Risk,
  pricing: { billableHourlyRate?: number; internalHourlyCost?: number } = {},
) {
  const riskAdjustedHours = calculateRiskAdjustedHours(baseHours, risk);
  const riskBufferHours = riskAdjustedHours - baseHours;
  const billableHourlyRate = pricing.billableHourlyRate ?? demoScenario.pricing.billableHourlyRate;
  const internalHourlyCost = pricing.internalHourlyCost ?? demoScenario.pricing.internalHourlyCost;
  const revenue = calculateClientPrice(riskAdjustedHours, billableHourlyRate);
  return { baseHours, risk, riskAdjustedHours, riskBufferHours, billableHourlyRate, internalHourlyCost, ...calculateProjectEconomics(revenue, riskAdjustedHours, internalHourlyCost) };
}
