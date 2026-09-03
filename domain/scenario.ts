import type { Capability, PaymentMilestone, Risk, ScopeItem } from "./types";

export const riskPolicy: Record<Risk, number> = {
  LOW: 1,
  MEDIUM: 1.15,
  HIGH: 1.3,
};

export const marginPolicy = {
  healthy: 0.4,
  watch: 0.3,
  atRisk: 0.2,
} as const;

export const demoScenario = {
  pricing: {
    internalHourlyCost: 36,
    billableHourlyRate: 60,
  },
  quoteTerms: {
    deliveryWeeks: 3,
    validityDays: 15,
    paymentMilestones: [
      { label: "Project start", percent: 40 },
      { label: "Implementation", percent: 40 },
      { label: "Delivery", percent: 20 },
    ] satisfies PaymentMilestone[],
  },
  delivery: {
    baselineActualToPlannedRatio: 0.30,
    baselineCompletionRatio: 0.35,
    atRiskEffortMultiplier: 1.5,
  },
  analyzedScope: [
    { id: "S1", name: "Homepage", description: "Conversion-focused homepage and navigation.", capability: "CONTENT", baseHours: 7, risk: "MEDIUM", selected: true, approved: false },
    { id: "S2", name: "Services", description: "Service overview and detail content structure.", capability: "CONTENT", baseHours: 6, risk: "LOW", selected: true, approved: false },
    { id: "S3", name: "References", description: "Case-study and project reference presentation.", capability: "CONTENT", baseHours: 6, risk: "LOW", selected: true, approved: false },
    { id: "S4", name: "CMS", description: "Editable content for core website sections.", capability: "CMS", baseHours: 9, risk: "MEDIUM", selected: true, approved: false },
    { id: "S5", name: "Lead capture", description: "Contact forms with validation and conversion tracking.", capability: "LEAD_CAPTURE", baseHours: 4, risk: "LOW", selected: true, approved: false },
    { id: "S6", name: "Analytics", description: "Analytics setup with core conversion events.", capability: "ANALYTICS", baseHours: 3, risk: "LOW", selected: true, approved: false },
    { id: "S7", name: "SEO foundations", description: "Technical metadata, indexing and on-page foundations.", capability: "SEO", baseHours: 3, risk: "LOW", selected: true, approved: false },
  ] satisfies ScopeItem[],
  excludedCapabilities: ["BOOKING", "CRM"] satisfies Capability[],
  changeRequest: {
    title: "Online booking",
    description: "Online booking flow with confirmation emails.",
    capability: "BOOKING" as Capability,
    baseHours: 10,
    risk: "MEDIUM" as Risk,
    deliveryImpactDays: 3,
  },
} as const;
