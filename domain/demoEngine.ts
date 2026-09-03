import { createInitialDemoState } from "../data/demo";
import { calculateChangeRequestEstimate, calculateClientPrice, calculateRiskAdjustedHours, calculateScopeEstimate } from "./economics";
import { applyDeliveryEffortMultiplier, createChangeRequestDeliveryTask, createDeliveryTasksFromQuoteScope, updateDeliveryTask } from "./delivery";
import { analyzeOpportunity, updateScopeItem, validateOpportunityInput } from "./requirements";
import { demoScenario } from "./scenario";
import { addCalendarDays, evaluateScopeRequest } from "./scopeControl";
import type { AuditEvent, Capability, DemoState, Opportunity, Risk } from "./types";

function addEvent(state: DemoState, code: string, message: string, data?: AuditEvent["data"]): DemoState {
  const event: AuditEvent = { id: `${code}-${state.auditLog.length + 1}`, code, message, ...(data ? { data } : {}) };
  return { ...state, auditLog: [...state.auditLog, event], error: null };
}

function fail(state: DemoState, message: string): DemoState {
  return { ...state, error: message };
}

export function detectScopeChange(state: DemoState, capability: Capability) {
  if (state.quote) {
    const request = { id: "REQ-PROBE", text: `Capability probe: ${capability}`, capability };
    return evaluateScopeRequest(state.quote, request).status === "OUT_OF_SCOPE";
  }
  const approved = state.opportunity.scope.some((item) => item.approved && item.capability === capability);
  const explicitlyExcluded = state.opportunity.excludedCapabilities.includes(capability);
  return !approved || explicitlyExcluded;
}

type EditableOpportunityPatch = Partial<Pick<Opportunity, "clientName" | "projectName" | "rawRequest" | "budgetMin" | "budgetMax" | "targetDate" | "businessGoal">>;

export type DemoAction =
  | { type: "RESET" }
  | { type: "UPDATE_OPPORTUNITY"; patch: EditableOpportunityPatch }
  | { type: "ANALYZE" }
  | { type: "TOGGLE_SCOPE_ITEM"; id: string }
  | { type: "UPDATE_SCOPE_ITEM"; id: string; patch: Partial<{ baseHours: number; risk: Risk }> }
  | { type: "APPROVE_SCOPE" }
  | { type: "GENERATE_QUOTE" }
  | { type: "SEND_QUOTE" }
  | { type: "APPROVE_QUOTE" }
  | { type: "CREATE_PROJECT" }
  | { type: "UPDATE_DELIVERY_TASK"; id: string; patch: Partial<{ actualHours: number; completionRatio: number }> }
  | { type: "SIMULATE_DELIVERY_OVERRUN" }
  | { type: "RESTORE_DELIVERY_BASELINE" }
  | { type: "ADD_CLIENT_REQUEST" }
  | { type: "ANALYZE_SCOPE_CHANGE" }
  | { type: "CREATE_CHANGE_REQUEST" }
  | { type: "PROPOSE_CHANGE_REQUEST" }
  | { type: "APPROVE_CHANGE_REQUEST" };

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "RESET":
      return createInitialDemoState();

    case "UPDATE_OPPORTUNITY": {
      if (state.opportunity.status !== "NEW") return fail(state, "Opportunity intake is locked after analysis starts.");
      return { ...state, opportunity: { ...state.opportunity, ...action.patch }, error: null };
    }

    case "ANALYZE": {
      if (state.opportunity.status !== "NEW") return fail(state, "Opportunity can only be analyzed from NEW state.");
      try {
        validateOpportunityInput(state.opportunity);
        const analysis = analyzeOpportunity(state.opportunity);
        if (analysis.scope.length === 0) return fail(state, "Analysis must produce at least one scope item.");
        return addEvent(
          {
            ...state,
            opportunity: {
              ...state.opportunity,
              ...analysis,
              status: "SCOPE_REVIEW",
            },
          },
          "SCOPE_DRAFTED",
          "Demo AI deterministic fallback created a structured scope draft for human review.",
          { mode: "deterministic-fallback", suggestedItems: analysis.scope.length },
        );
      } catch (error) {
        return fail(state, error instanceof Error ? error.message : "Opportunity analysis failed.");
      }
    }

    case "TOGGLE_SCOPE_ITEM": {
      if (state.opportunity.status !== "SCOPE_REVIEW") return fail(state, "Scope selection can only change during SCOPE_REVIEW.");
      const item = state.opportunity.scope.find((scopeItem) => scopeItem.id === action.id);
      if (!item) return fail(state, "Scope item not found.");
      return {
        ...state,
        opportunity: {
          ...state.opportunity,
          scope: updateScopeItem(state.opportunity.scope, action.id, { selected: !item.selected }),
        },
        error: null,
      };
    }

    case "UPDATE_SCOPE_ITEM": {
      if (state.opportunity.status !== "SCOPE_REVIEW") return fail(state, "Scope assumptions can only change during SCOPE_REVIEW.");
      if (action.patch.baseHours !== undefined && (!Number.isFinite(action.patch.baseHours) || action.patch.baseHours <= 0)) {
        return fail(state, "Scope base hours must be a finite positive number.");
      }
      const item = state.opportunity.scope.find((scopeItem) => scopeItem.id === action.id);
      if (!item) return fail(state, "Scope item not found.");
      return {
        ...state,
        opportunity: {
          ...state.opportunity,
          scope: updateScopeItem(state.opportunity.scope, action.id, action.patch),
        },
        error: null,
      };
    }

    case "APPROVE_SCOPE": {
      if (state.opportunity.status !== "SCOPE_REVIEW") return fail(state, "Scope approval requires SCOPE_REVIEW state.");
      const selectedScope = state.opportunity.scope.filter((item) => item.selected);
      if (selectedScope.length === 0) return fail(state, "At least one scope item must be selected before approval.");
      const estimate = calculateScopeEstimate(selectedScope);
      if (estimate.riskAdjustedHours <= 0) return fail(state, "Approved scope must contain positive effort.");
      return addEvent(
        {
          ...state,
          opportunity: {
            ...state.opportunity,
            status: "SCOPE_APPROVED",
            scope: state.opportunity.scope.map((item) => ({ ...item, approved: item.selected })),
          },
        },
        "SCOPE_APPROVED",
        "Human approved the selected, risk-adjusted project scope.",
        {
          approvedItems: selectedScope.length,
          baseHours: estimate.baseHours,
          riskBufferHours: estimate.riskBufferHours,
          approvedHours: estimate.riskAdjustedHours,
          overallRisk: estimate.overallRisk,
        },
      );
    }

    case "GENERATE_QUOTE": {
      if (state.opportunity.status !== "SCOPE_APPROVED") return fail(state, "Quote cannot be generated before scope approval.");
      if (state.quote) return fail(state, "Quote already exists.");
      const approvedScope = state.opportunity.scope.filter((item) => item.approved);
      const estimate = calculateScopeEstimate(approvedScope);
      const paymentTotal = demoScenario.quoteTerms.paymentMilestones.reduce((sum, milestone) => sum + milestone.percent, 0);
      if (paymentTotal !== 100) return fail(state, "Payment milestones must total 100%.");
      return addEvent(
        {
          ...state,
          quote: {
            id: "DF-2026-014",
            opportunityId: state.opportunity.id,
            status: "DRAFT",
            originalContractValue: estimate.revenue,
            currentContractValue: estimate.revenue,
            baseEffortHours: estimate.baseHours,
            originalEffortHours: estimate.riskAdjustedHours,
            riskBufferHours: estimate.riskBufferHours,
            billableHourlyRate: estimate.billableHourlyRate,
            internalHourlyCost: estimate.internalHourlyCost,
            scopeRisk: estimate.overallRisk,
            scopeItemIds: approvedScope.map((item) => item.id),
            scopeSnapshot: approvedScope.map((item) => {
              const pricedHours = calculateRiskAdjustedHours(item.baseHours, item.risk);
              return {
                id: item.id,
                name: item.name,
                capability: item.capability,
                baseHours: item.baseHours,
                risk: item.risk,
                pricedHours,
                price: calculateClientPrice(pricedHours, estimate.billableHourlyRate),
              };
            }),
            excludedCapabilitiesSnapshot: [...state.opportunity.excludedCapabilities],
            targetDateSnapshot: state.opportunity.targetDate,
            deliveryWeeks: demoScenario.quoteTerms.deliveryWeeks,
            validityDays: demoScenario.quoteTerms.validityDays,
            paymentMilestones: demoScenario.quoteTerms.paymentMilestones.map((milestone) => ({ ...milestone })),
            assumptionsSnapshot: [...state.opportunity.assumptions],
            exclusionsSnapshot: [...state.opportunity.exclusions],
          },
        },
        "QUOTE_GENERATED",
        "Commercial proposal generated from the approved scope and snapshotted pricing assumptions.",
        {
          deliverables: approvedScope.length,
          baseHours: estimate.baseHours,
          riskBufferHours: estimate.riskBufferHours,
          pricedHours: estimate.riskAdjustedHours,
          billableRate: estimate.billableHourlyRate,
          quoteValue: estimate.revenue,
          expectedMargin: estimate.margin,
        },
      );
    }

    case "SEND_QUOTE":
      if (!state.quote || state.quote.status !== "DRAFT") return fail(state, "Only a DRAFT quote can be sent.");
      return addEvent({ ...state, quote: { ...state.quote, status: "SENT" } }, "QUOTE_SENT", "Quote marked as sent to client.");

    case "APPROVE_QUOTE":
      if (!state.quote || state.quote.status !== "SENT") return fail(state, "Only a SENT quote can be approved.");
      return addEvent(
        { ...state, quote: { ...state.quote, status: "APPROVED" } },
        "QUOTE_APPROVED",
        "Client approved quote.",
        { contractValue: state.quote.currentContractValue },
      );

    case "CREATE_PROJECT": {
      if (!state.quote || state.quote.status !== "APPROVED") return fail(state, "Project creation requires an approved quote.");
      if (state.project) return fail(state, "Delivery project already exists.");
      const tasks = createDeliveryTasksFromQuoteScope(state.quote.scopeSnapshot);
      return addEvent(
        {
          ...state,
          project: {
            id: "PRJ-001",
            quoteId: state.quote.id,
            status: "ACTIVE",
            tasks,
            deliveryMode: "BASELINE",
            deliveryTargetDate: state.quote.targetDateSnapshot,
            newClientRequest: null,
            scopeDecision: null,
          },
        },
        "PROJECT_CREATED",
        "Approved quote converted into active delivery tasks with auditable planned and actual effort.",
        { tasks: tasks.length, plannedHours: tasks.reduce((sum, task) => sum + task.plannedHours, 0) },
      );
    }

    case "UPDATE_DELIVERY_TASK": {
      if (!state.project) return fail(state, "Delivery task update requires an active project.");
      if (!state.project.tasks.some((task) => task.id === action.id)) return fail(state, "Delivery task not found.");
      try {
        const tasks = updateDeliveryTask(state.project.tasks, action.id, action.patch);
        return { ...state, project: { ...state.project, tasks, deliveryMode: "CUSTOM" }, error: null };
      } catch (error) {
        return fail(state, error instanceof Error ? error.message : "Delivery task update failed.");
      }
    }

    case "SIMULATE_DELIVERY_OVERRUN": {
      if (!state.project) return fail(state, "Margin Guard simulation requires an active project.");
      if (state.project.deliveryMode === "OVERRUN") return fail(state, "Delivery overrun scenario is already active.");
      const tasks = applyDeliveryEffortMultiplier(state.project.tasks, demoScenario.delivery.atRiskEffortMultiplier);
      return addEvent(
        { ...state, project: { ...state.project, tasks, deliveryMode: "OVERRUN" } },
        "DELIVERY_OVERRUN_SIMULATED",
        "Demo scenario increased actual effort while keeping earned progress unchanged to expose margin risk.",
        { multiplier: demoScenario.delivery.atRiskEffortMultiplier },
      );
    }

    case "RESTORE_DELIVERY_BASELINE": {
      if (!state.project || !state.quote) return fail(state, "Delivery baseline requires an active project and quote.");
      const originalTasks = createDeliveryTasksFromQuoteScope(state.quote.scopeSnapshot);
      const changeTask = state.changeRequest?.status === "APPROVED"
        ? createChangeRequestDeliveryTask({ id: state.changeRequest.id, name: state.changeRequest.title, capability: state.changeRequest.capability, plannedHours: state.changeRequest.addedHours })
        : null;
      const tasks = changeTask ? [...originalTasks, changeTask] : originalTasks;
      return addEvent(
        { ...state, project: { ...state.project, tasks, deliveryMode: "BASELINE" } },
        "DELIVERY_BASELINE_RESTORED",
        "Delivery evidence restored to the deterministic demo baseline.",
      );
    }

    case "ADD_CLIENT_REQUEST": {
      if (!state.project) return fail(state, "New client request requires an active project.");
      if (state.project.newClientRequest) return fail(state, "Client request already exists.");
      const request = { id: "REQ-CHANGE-001", text: "Add online booking with confirmation emails.", capability: demoScenario.changeRequest.capability };
      return addEvent(
        { ...state, project: { ...state.project, newClientRequest: request, scopeDecision: null } },
        "CLIENT_REQUEST_ADDED",
        "Client requested online booking during delivery.",
        { capability: request.capability },
      );
    }

    case "ANALYZE_SCOPE_CHANGE": {
      if (!state.project?.newClientRequest) return fail(state, "There is no new client request to analyze.");
      if (!state.quote || state.quote.status !== "APPROVED") return fail(state, "Scope comparison requires an approved quote snapshot.");
      if (state.project.scopeDecision) return fail(state, "Client request has already been compared with the approved quote snapshot.");
      const decision = evaluateScopeRequest(state.quote, state.project.newClientRequest);
      return addEvent(
        {
          ...state,
          project: {
            ...state.project,
            scopeDecision: decision,
          },
        },
        decision.status === "OUT_OF_SCOPE" ? "SCOPE_CHANGE_DETECTED" : "REQUEST_CONFIRMED_IN_SCOPE",
        decision.reason,
        { capability: decision.capability, decision: decision.status, quoteId: decision.quoteId, explicitlyExcluded: decision.explicitlyExcluded },
      );
    }

    case "CREATE_CHANGE_REQUEST": {
      if (!state.project?.scopeDecision || state.project.scopeDecision.status !== "OUT_OF_SCOPE") return fail(state, "Change request requires evidence of an out-of-scope decision.");
      if (!state.project.newClientRequest) return fail(state, "Change request requires the source client request.");
      if (state.project.scopeDecision.requestId !== state.project.newClientRequest.id) return fail(state, "Scope evidence must reference the active client request.");
      if (state.project.scopeDecision.quoteId !== state.quote?.id) return fail(state, "Scope decision must reference the active approved quote snapshot.");
      if (state.project.newClientRequest.capability !== demoScenario.changeRequest.capability) return fail(state, "No deterministic pricing template exists for this demo capability.");
      if (state.changeRequest) return fail(state, "Change request already exists.");
      if (!state.quote || state.quote.status !== "APPROVED") return fail(state, "Change request requires an approved quote pricing snapshot.");
      const estimate = calculateChangeRequestEstimate(
        demoScenario.changeRequest.baseHours,
        demoScenario.changeRequest.risk,
        { billableHourlyRate: state.quote.billableHourlyRate, internalHourlyCost: state.quote.internalHourlyCost },
      );
      return addEvent(
        {
          ...state,
          changeRequest: {
            id: "CR-004",
            projectId: state.project.id,
            title: demoScenario.changeRequest.title,
            description: demoScenario.changeRequest.description,
            capability: demoScenario.changeRequest.capability,
            baseHours: estimate.baseHours,
            addedHours: estimate.riskAdjustedHours,
            riskBufferHours: estimate.riskBufferHours,
            risk: estimate.risk,
            price: estimate.revenue,
            billableHourlyRate: estimate.billableHourlyRate,
            internalHourlyCost: estimate.internalHourlyCost,
            expectedCost: estimate.cost,
            expectedProfit: estimate.profit,
            expectedMargin: estimate.margin,
            previousContractValue: state.quote.currentContractValue,
            resultingContractValue: state.quote.currentContractValue + estimate.revenue,
            targetDateBefore: state.project.deliveryTargetDate,
            targetDateAfter: addCalendarDays(state.project.deliveryTargetDate, demoScenario.changeRequest.deliveryImpactDays),
            scopeDecisionId: state.project.scopeDecision.id,
            sourceRequestId: state.project.newClientRequest.id,
            deliveryImpactDays: demoScenario.changeRequest.deliveryImpactDays,
            status: "DRAFT",
          },
        },
        "CHANGE_REQUEST_CREATED",
        "Draft change request created with explicit risk-adjusted effort and pricing.",
        {
          baseHours: estimate.baseHours,
          riskBufferHours: estimate.riskBufferHours,
          addedHours: estimate.riskAdjustedHours,
          risk: estimate.risk,
          billableRate: estimate.billableHourlyRate,
          price: estimate.revenue,
          expectedCost: estimate.cost,
          expectedProfit: estimate.profit,
          expectedMargin: estimate.margin,
          resultingContractValue: state.quote.currentContractValue + estimate.revenue,
        },
      );
    }

    case "PROPOSE_CHANGE_REQUEST":
      if (!state.changeRequest || state.changeRequest.status !== "DRAFT") return fail(state, "Only a DRAFT change request can be proposed.");
      return addEvent(
        { ...state, changeRequest: { ...state.changeRequest, status: "PROPOSED" } },
        "CHANGE_REQUEST_PROPOSED",
        "Change request proposed to client.",
      );

    case "APPROVE_CHANGE_REQUEST": {
      if (!state.changeRequest || state.changeRequest.status !== "PROPOSED") return fail(state, "Only a PROPOSED change request can be approved.");
      if (!state.quote || state.quote.status !== "APPROVED") return fail(state, "Approved change request requires an approved quote contract.");
      if (!state.project) return fail(state, "Approved change request requires an active project.");

      if (state.changeRequest.scopeDecisionId !== state.project.scopeDecision?.id) return fail(state, "Change request evidence no longer matches the active scope decision.");
      if (state.changeRequest.sourceRequestId !== state.project.newClientRequest?.id) return fail(state, "Change request no longer matches the active client request.");
      if (state.quote.currentContractValue !== state.changeRequest.previousContractValue) return fail(state, "Change request commercial baseline is stale; regenerate before approval.");

      const newPlannedHours = state.quote.originalEffortHours + state.changeRequest.addedHours;
      const newValue = state.changeRequest.resultingContractValue;
      const changeTask = createChangeRequestDeliveryTask({
        id: state.changeRequest.id,
        name: state.changeRequest.title,
        capability: state.changeRequest.capability,
        plannedHours: state.changeRequest.addedHours,
      });

      return addEvent(
        {
          ...state,
          changeRequest: { ...state.changeRequest, status: "APPROVED" },
          quote: { ...state.quote, currentContractValue: newValue },
          project: { ...state.project, tasks: [...state.project.tasks, changeTask], deliveryTargetDate: state.changeRequest.targetDateAfter },
        },
        "CHANGE_REQUEST_APPROVED",
        "Change request approved; contract value and risk-adjusted delivery scope updated.",
        {
          previousContractValue: state.quote.currentContractValue,
          addedRevenue: state.changeRequest.price,
          newContractValue: newValue,
          newPlannedHours,
        },
      );
    }

    default:
      return state;
  }
}
