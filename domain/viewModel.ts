import {
  calculateClientPrice,
  calculateProfitAtRisk,
  calculateProjectEconomics,
  calculateProjectedEconomics,
  calculateRiskAdjustedHours,
  calculateScopeEstimate,
} from "./economics";
import { demoScenario } from "./scenario";
import { summarizeDelivery } from "./delivery";
import type { DemoState } from "./types";

export function deriveDemoView(state: DemoState) {
  const activeReviewScope = state.opportunity.status === "SCOPE_REVIEW"
    ? state.opportunity.scope.filter((item) => item.selected)
    : state.opportunity.scope.filter((item) => item.approved);

  const currentBillableRate = state.quote?.billableHourlyRate ?? demoScenario.pricing.billableHourlyRate;
  const scopeRows = state.opportunity.scope.map((item) => {
    const adjustedHours = calculateRiskAdjustedHours(item.baseHours, item.risk);
    return {
      ...item,
      adjustedHours,
      riskBufferHours: adjustedHours - item.baseHours,
      linePrice: calculateClientPrice(adjustedHours, currentBillableRate),
    };
  });

  const reviewEstimate = activeReviewScope.length > 0 ? calculateScopeEstimate(activeReviewScope) : null;
  const approvedScope = state.opportunity.scope.filter((item) => item.approved);
  const approvedScopeEstimate = approvedScope.length > 0 ? calculateScopeEstimate(approvedScope) : null;

  const quoteEstimate = state.quote
    ? {
        baseHours: state.quote.baseEffortHours,
        riskAdjustedHours: state.quote.originalEffortHours,
        riskBufferHours: state.quote.riskBufferHours,
        billableHourlyRate: state.quote.billableHourlyRate,
        internalHourlyCost: state.quote.internalHourlyCost,
        overallRisk: state.quote.scopeRisk,
        ...calculateProjectEconomics(state.quote.originalContractValue, state.quote.originalEffortHours, state.quote.internalHourlyCost),
      }
    : state.opportunity.status === "SCOPE_APPROVED"
      ? approvedScopeEstimate
      : null;

  const quotePreview = quoteEstimate?.revenue ?? reviewEstimate?.revenue ?? null;
  const budgetFit = quotePreview === null
    ? null
    : quotePreview < state.opportunity.budgetMin
      ? "BELOW"
      : quotePreview > state.opportunity.budgetMax
        ? "ABOVE"
        : "WITHIN";

  const quoteLineItems = state.quote
    ? state.quote.scopeSnapshot.map((item) => ({ ...item }))
    : approvedScope.map((item) => {
        const pricedHours = calculateRiskAdjustedHours(item.baseHours, item.risk);
        return {
          id: item.id,
          name: item.name,
          capability: item.capability,
          risk: item.risk,
          baseHours: item.baseHours,
          pricedHours,
          price: calculateClientPrice(pricedHours, demoScenario.pricing.billableHourlyRate),
        };
      });

  const quoteTerms = state.quote
    ? {
        deliveryWeeks: state.quote.deliveryWeeks,
        validityDays: state.quote.validityDays,
        paymentMilestones: state.quote.paymentMilestones,
        assumptions: state.quote.assumptionsSnapshot,
        exclusions: state.quote.exclusionsSnapshot,
      }
    : {
        deliveryWeeks: demoScenario.quoteTerms.deliveryWeeks,
        validityDays: demoScenario.quoteTerms.validityDays,
        paymentMilestones: demoScenario.quoteTerms.paymentMilestones,
        assumptions: state.opportunity.assumptions,
        exclusions: state.opportunity.exclusions,
      };

  const contractValue = state.quote?.status === "APPROVED" ? state.quote.currentContractValue : null;
  const approvedChangeRevenue = state.changeRequest?.status === "APPROVED" ? state.changeRequest.price : 0;
  const deliverySummary = state.project ? summarizeDelivery(state.project.tasks) : null;
  const plannedHours = deliverySummary?.plannedHours ?? (state.quote
    ? state.quote.originalEffortHours + (state.changeRequest?.status === "APPROVED" ? state.changeRequest.addedHours : 0)
    : 0);
  const plannedEconomics = state.quote && contractValue !== null
    ? calculateProjectEconomics(contractValue, plannedHours, state.quote.internalHourlyCost)
    : null;
  const projectedEconomics = deliverySummary && state.quote && contractValue !== null
    ? calculateProjectedEconomics(contractValue, deliverySummary.actualHours, deliverySummary.completionRatio, state.quote.internalHourlyCost)
    : null;
  const profitAtRisk = contractValue !== null && plannedEconomics && projectedEconomics
    ? calculateProfitAtRisk(contractValue, plannedEconomics.margin, projectedEconomics.margin)
    : 0;
  const marginDelta = plannedEconomics && projectedEconomics ? projectedEconomics.margin - plannedEconomics.margin : null;
  const projectedHourVariance = projectedEconomics ? projectedEconomics.projectedHours - plannedHours : null;
  const marginGuard = plannedEconomics && projectedEconomics
    ? {
        status: projectedEconomics.marginStatus,
        headline: projectedEconomics.marginStatus === "HEALTHY"
          ? "Margin protected"
          : projectedEconomics.marginStatus === "WATCH"
            ? "Margin watch"
            : projectedEconomics.marginStatus === "AT_RISK"
              ? "Margin at risk"
              : "Critical margin erosion",
        message: projectedHourVariance !== null && projectedHourVariance > 0
          ? `Actual effort is growing faster than earned progress. Current trajectory projects ${projectedEconomics.projectedHours.toFixed(1)}h against ${plannedHours.toFixed(1)}h planned, moving gross margin from ${(plannedEconomics.margin * 100).toFixed(0)}% to ${(projectedEconomics.margin * 100).toFixed(0)}%.`
          : `Delivery is tracking within the approved effort envelope. Current trajectory projects ${projectedEconomics.projectedHours.toFixed(1)}h against ${plannedHours.toFixed(1)}h planned, with gross margin at ${(projectedEconomics.margin * 100).toFixed(0)}%.`,
      }
    : null;
  const scopeDecision = state.project?.scopeDecision ?? null;
  const changeImpact = state.changeRequest
    ? {
        previousContractValue: state.changeRequest.previousContractValue,
        addedRevenue: state.changeRequest.price,
        resultingContractValue: state.changeRequest.resultingContractValue,
        expectedCost: state.changeRequest.expectedCost,
        expectedProfit: state.changeRequest.expectedProfit,
        expectedMargin: state.changeRequest.expectedMargin,
        addedHours: state.changeRequest.addedHours,
        deliveryImpactDays: state.changeRequest.deliveryImpactDays,
        targetDateBefore: state.changeRequest.targetDateBefore,
        targetDateAfter: state.changeRequest.targetDateAfter,
        increaseRatio: state.changeRequest.previousContractValue > 0
          ? state.changeRequest.price / state.changeRequest.previousContractValue
          : 0,
      }
    : null;
  const increaseRatio = changeImpact?.increaseRatio ?? 0;

  return {
    scopeRows,
    reviewEstimate,
    approvedScopeEstimate,
    quoteEstimate,
    quotePreview,
    budgetFit,
    quoteLineItems,
    quoteTerms,
    contractValue,
    approvedChangeRevenue,
    deliverySummary,
    plannedHours,
    plannedEconomics,
    projectedEconomics,
    profitAtRisk,
    marginDelta,
    projectedHourVariance,
    marginGuard,
    scopeDecision,
    changeImpact,
    increaseRatio,
    selectedScopeCount: state.opportunity.scope.filter((item) => item.selected).length,
    excludedScopeCount: state.opportunity.scope.filter((item) => !item.selected).length,
  };
}
