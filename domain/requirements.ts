import { demoScenario } from "./scenario";
import type { Capability, Opportunity, ScopeItem } from "./types";

export type RequirementAnalysis = Pick<
  Opportunity,
  "requirements" | "assumptions" | "exclusions" | "excludedCapabilities" | "openQuestions" | "risks" | "scope"
>;

function includesAny(text: string, terms: string[]) {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

export function validateOpportunityInput(opportunity: Opportunity) {
  if (!opportunity.clientName.trim()) throw new Error("Client name is required.");
  if (!opportunity.projectName.trim()) throw new Error("Project name is required.");
  if (!opportunity.rawRequest.trim()) throw new Error("Raw client request is required.");
  if (!opportunity.businessGoal.trim()) throw new Error("Business goal is required.");
  if (!Number.isFinite(opportunity.budgetMin) || !Number.isFinite(opportunity.budgetMax) || opportunity.budgetMin < 0 || opportunity.budgetMax < 0) {
    throw new Error("Budget values must be finite non-negative numbers.");
  }
  if (opportunity.budgetMin > opportunity.budgetMax) throw new Error("Minimum budget cannot exceed maximum budget.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opportunity.targetDate)) throw new Error("Target date must use YYYY-MM-DD format.");
}

export function analyzeOpportunity(opportunity: Opportunity): RequirementAnalysis {
  validateOpportunityInput(opportunity);
  const text = `${opportunity.rawRequest} ${opportunity.businessGoal}`.toLowerCase();

  const scope: ScopeItem[] = demoScenario.analyzedScope
    .filter((item) => {
      if (item.id === "S1") return true;
      if (item.id === "S2") return includesAny(text, ["service", "offer", "solution"]);
      if (item.id === "S3") return includesAny(text, ["reference", "case stud", "portfolio", "project"]);
      if (item.capability === "CMS") return includesAny(text, ["cms", "editable", "manage content", "content management"]);
      if (item.capability === "LEAD_CAPTURE") return includesAny(text, ["contact", "form", "enquir", "lead"]);
      if (item.capability === "ANALYTICS") return includesAny(text, ["analytic", "tracking", "measurement"]);
      if (item.capability === "SEO") return includesAny(text, ["seo", "search", "index"]);
      return false;
    })
    .map((item) => ({ ...item, selected: true, approved: false }));

  const requestedBooking = includesAny(text, ["booking", "reservation", "appointment"]);
  if (requestedBooking) {
    scope.push({
      id: "S8",
      name: demoScenario.changeRequest.title,
      description: demoScenario.changeRequest.description,
      capability: "BOOKING",
      baseHours: demoScenario.changeRequest.baseHours,
      risk: demoScenario.changeRequest.risk,
      selected: true,
      approved: false,
    });
  }

  const requestedCapabilities = new Set<Capability>(scope.map((item) => item.capability));
  const excludedCapabilities = demoScenario.excludedCapabilities.filter((capability) => !requestedCapabilities.has(capability));
  const exclusions = [
    ...(excludedCapabilities.includes("BOOKING") ? ["Online booking"] : []),
    ...(excludedCapabilities.includes("CRM") ? ["Custom CRM"] : []),
    "Paid media management",
  ];

  const requirements = scope.map((item) => `${item.name}: ${item.description}`);
  const assumptions = ["Client provides final copy and imagery", "One language", "Standard hosting environment"];
  const openQuestions = ["Who owns content approval?", "Is migration from an existing CMS required?"];
  const risks = [
    "Content delivery could affect the timeline",
    ...(scope.some((item) => item.capability === "CMS") ? ["CMS scope should be frozen before implementation"] : []),
    ...(requestedBooking ? ["Booking integration requires confirmation-flow acceptance criteria"] : []),
  ];

  return { requirements, assumptions, exclusions, excludedCapabilities, openQuestions, risks, scope };
}

export function updateScopeItem(scope: ScopeItem[], id: string, patch: Partial<Pick<ScopeItem, "selected" | "baseHours" | "risk">>) {
  return scope.map((item) => (item.id === id ? { ...item, ...patch } : item));
}
