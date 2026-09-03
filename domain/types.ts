export type OpportunityStatus = "NEW" | "SCOPE_REVIEW" | "SCOPE_APPROVED";
export type QuoteStatus = "DRAFT" | "SENT" | "APPROVED";
export type ProjectStatus = "ACTIVE";
export type ChangeRequestStatus = "DRAFT" | "PROPOSED" | "APPROVED";
export type Risk = "LOW" | "MEDIUM" | "HIGH";
export type MarginStatus = "HEALTHY" | "WATCH" | "AT_RISK" | "CRITICAL";
export type Capability = "CONTENT" | "CMS" | "LEAD_CAPTURE" | "ANALYTICS" | "SEO" | "BOOKING" | "CRM";
export type DeliveryTaskStatus = "BACKLOG" | "IN_PROGRESS" | "DONE";
export type DeliveryTaskSource = "ORIGINAL_SCOPE" | "CHANGE_REQUEST";
export type DeliveryMode = "BASELINE" | "CUSTOM" | "OVERRUN";
export type ScopeDecisionStatus = "IN_SCOPE" | "OUT_OF_SCOPE";

export type ScopeItem = {
  id: string;
  name: string;
  description: string;
  capability: Capability;
  baseHours: number;
  risk: Risk;
  selected: boolean;
  approved: boolean;
};

export type Opportunity = {
  id: string;
  clientName: string;
  projectName: string;
  rawRequest: string;
  budgetMin: number;
  budgetMax: number;
  targetDate: string;
  businessGoal: string;
  status: OpportunityStatus;
  requirements: string[];
  assumptions: string[];
  exclusions: string[];
  excludedCapabilities: Capability[];
  openQuestions: string[];
  risks: string[];
  scope: ScopeItem[];
};

export type PaymentMilestone = {
  label: string;
  percent: number;
};

export type QuoteScopeSnapshotItem = {
  id: string;
  name: string;
  capability: Capability;
  baseHours: number;
  risk: Risk;
  pricedHours: number;
  price: number;
};

export type Quote = {
  id: string;
  opportunityId: string;
  status: QuoteStatus;
  originalContractValue: number;
  currentContractValue: number;
  baseEffortHours: number;
  originalEffortHours: number;
  riskBufferHours: number;
  billableHourlyRate: number;
  internalHourlyCost: number;
  scopeRisk: Risk;
  scopeItemIds: string[];
  scopeSnapshot: QuoteScopeSnapshotItem[];
  excludedCapabilitiesSnapshot: Capability[];
  targetDateSnapshot: string;
  deliveryWeeks: number;
  validityDays: number;
  paymentMilestones: PaymentMilestone[];
  assumptionsSnapshot: string[];
  exclusionsSnapshot: string[];
};

export type DeliveryTask = {
  id: string;
  name: string;
  capability: Capability;
  plannedHours: number;
  actualHours: number;
  completionRatio: number;
  status: DeliveryTaskStatus;
  source: DeliveryTaskSource;
};

export type ClientRequest = { id: string; text: string; capability: Capability };

export type ScopeDecision = {
  id: string;
  requestId: string;
  quoteId: string;
  capability: Capability;
  status: ScopeDecisionStatus;
  approvedScopeMatches: Array<{ id: string; name: string }>;
  explicitlyExcluded: boolean;
  evidence: string[];
  reason: string;
};

export type Project = {
  id: string;
  quoteId: string;
  status: ProjectStatus;
  tasks: DeliveryTask[];
  deliveryMode: DeliveryMode;
  deliveryTargetDate: string;
  newClientRequest: ClientRequest | null;
  scopeDecision: ScopeDecision | null;
};

export type ChangeRequest = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  capability: Capability;
  baseHours: number;
  addedHours: number;
  riskBufferHours: number;
  risk: Risk;
  price: number;
  billableHourlyRate: number;
  internalHourlyCost: number;
  expectedCost: number;
  expectedProfit: number;
  expectedMargin: number;
  previousContractValue: number;
  resultingContractValue: number;
  targetDateBefore: string;
  targetDateAfter: string;
  scopeDecisionId: string;
  sourceRequestId: string;
  deliveryImpactDays: number;
  status: ChangeRequestStatus;
};

export type AuditEvent = {
  id: string;
  code: string;
  message: string;
  data?: Record<string, string | number | boolean>;
};

export type DemoState = {
  opportunity: Opportunity;
  quote: Quote | null;
  project: Project | null;
  changeRequest: ChangeRequest | null;
  auditLog: AuditEvent[];
  error: string | null;
};
