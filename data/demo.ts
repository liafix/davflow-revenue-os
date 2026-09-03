import type { DemoState } from "../domain/types";

export function createInitialDemoState(): DemoState {
  return {
    opportunity: {
      id: "OPP-001",
      clientName: "Northbuild s.r.o.",
      projectName: "Corporate Website Redesign",
      rawRequest: "We need a modern company website that generates qualified enquiries, presents our services and references, includes a CMS, contact forms, analytics and solid SEO foundations.",
      budgetMin: 2000,
      budgetMax: 3000,
      targetDate: "2026-09-30",
      businessGoal: "Generate more qualified inbound enquiries.",
      status: "NEW",
      requirements: [], assumptions: [], exclusions: [], excludedCapabilities: [], openQuestions: [], risks: [], scope: [],
    },
    quote: null,
    project: null,
    changeRequest: null,
    auditLog: [{ id: "RESET-1", code: "DEMO_RESET", message: "Demo reset to initial opportunity state." }],
    error: null,
  };
}
