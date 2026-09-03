import { calculateRiskAdjustedHours } from "./economics";
import { demoScenario } from "./scenario";
import type { Capability, DeliveryTask, DeliveryTaskSource, DeliveryTaskStatus, QuoteScopeSnapshotItem, ScopeItem } from "./types";

function validateCompletion(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error("Completion ratio must be between 0 and 1.");
  return value;
}

function statusFromCompletion(completionRatio: number): DeliveryTaskStatus {
  if (completionRatio >= 1) return "DONE";
  if (completionRatio > 0) return "IN_PROGRESS";
  return "BACKLOG";
}

type PlannedTaskSeed = {
  id: string;
  name: string;
  capability: Capability;
  plannedHours: number;
  source: DeliveryTaskSource;
};

function createBaselineDeliveryTasks(planned: PlannedTaskSeed[]): DeliveryTask[] {
  if (planned.length === 0) throw new Error("Delivery project requires at least one planned task.");
  const totalPlanned = planned.reduce((sum, item) => sum + item.plannedHours, 0);
  if (!Number.isFinite(totalPlanned) || totalPlanned <= 0) throw new Error("Delivery project requires positive planned effort.");

  const targetEarnedHours = totalPlanned * demoScenario.delivery.baselineCompletionRatio;
  const targetActualHours = totalPlanned * demoScenario.delivery.baselineActualToPlannedRatio;
  let remainingEarned = targetEarnedHours;

  const withProgress = planned.map((item) => {
    const earned = Math.min(item.plannedHours, Math.max(0, remainingEarned));
    remainingEarned -= earned;
    const completionRatio = item.plannedHours === 0 ? 0 : earned / item.plannedHours;
    return { ...item, completionRatio };
  });

  const earnedTotal = withProgress.reduce((sum, item) => sum + item.plannedHours * item.completionRatio, 0);
  return withProgress.map((item) => {
    const earned = item.plannedHours * item.completionRatio;
    const actualHours = earnedTotal === 0 ? 0 : (earned / earnedTotal) * targetActualHours;
    return { ...item, actualHours, status: statusFromCompletion(item.completionRatio) };
  });
}

export function createDeliveryTasksFromScope(scope: ScopeItem[]): DeliveryTask[] {
  return createBaselineDeliveryTasks(scope.map((item) => ({
    id: `TASK-${item.id}`,
    name: item.name,
    capability: item.capability,
    plannedHours: calculateRiskAdjustedHours(item.baseHours, item.risk),
    source: "ORIGINAL_SCOPE" as const,
  })));
}

export function createDeliveryTasksFromQuoteScope(scope: QuoteScopeSnapshotItem[]): DeliveryTask[] {
  return createBaselineDeliveryTasks(scope.map((item) => ({
    id: `TASK-${item.id}`,
    name: item.name,
    capability: item.capability,
    plannedHours: item.pricedHours,
    source: "ORIGINAL_SCOPE" as const,
  })));
}

export function createChangeRequestDeliveryTask(input: { id: string; name: string; capability: DeliveryTask["capability"]; plannedHours: number }): DeliveryTask {
  if (!Number.isFinite(input.plannedHours) || input.plannedHours <= 0) throw new Error("Change request delivery effort must be positive.");
  return {
    id: `TASK-${input.id}`,
    name: input.name,
    capability: input.capability,
    plannedHours: input.plannedHours,
    actualHours: 0,
    completionRatio: 0,
    status: "BACKLOG",
    source: "CHANGE_REQUEST",
  };
}

export function updateDeliveryTask(tasks: DeliveryTask[], id: string, patch: Partial<Pick<DeliveryTask, "actualHours" | "completionRatio">>) {
  return tasks.map((task) => {
    if (task.id !== id) return task;
    const actualHours = patch.actualHours ?? task.actualHours;
    const completionRatio = patch.completionRatio ?? task.completionRatio;
    if (!Number.isFinite(actualHours) || actualHours < 0) throw new Error("Actual hours must be a finite non-negative number.");
    const normalizedCompletion = validateCompletion(completionRatio);
    return { ...task, actualHours, completionRatio: normalizedCompletion, status: statusFromCompletion(normalizedCompletion) };
  });
}

export function summarizeDelivery(tasks: DeliveryTask[]) {
  const plannedHours = tasks.reduce((sum, task) => sum + task.plannedHours, 0);
  const actualHours = tasks.reduce((sum, task) => sum + task.actualHours, 0);
  const earnedHours = tasks.reduce((sum, task) => sum + task.plannedHours * task.completionRatio, 0);
  const completionRatio = plannedHours === 0 ? 0 : earnedHours / plannedHours;
  return { plannedHours, actualHours, earnedHours, completionRatio };
}

export function applyDeliveryEffortMultiplier(tasks: DeliveryTask[], multiplier: number) {
  if (!Number.isFinite(multiplier) || multiplier <= 0) throw new Error("Delivery multiplier must be positive.");
  return tasks.map((task) => ({ ...task, actualHours: task.actualHours * multiplier }));
}
