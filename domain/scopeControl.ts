import type { ClientRequest, Quote, ScopeDecision } from "./types";

export function evaluateScopeRequest(quote: Quote, request: ClientRequest): ScopeDecision {
  const approvedScopeMatches = quote.scopeSnapshot
    .filter((item) => item.capability === request.capability)
    .map((item) => ({ id: item.id, name: item.name }));
  const explicitlyExcluded = quote.excludedCapabilitiesSnapshot.includes(request.capability);
  const outOfScope = approvedScopeMatches.length === 0 || explicitlyExcluded;

  const evidence = [
    approvedScopeMatches.length > 0
      ? `${request.capability} matches approved deliverable${approvedScopeMatches.length === 1 ? "" : "s"}: ${approvedScopeMatches.map((item) => item.name).join(", ")}.`
      : `${request.capability} is absent from the ${quote.scopeSnapshot.length} approved quote deliverables.`,
    explicitlyExcluded
      ? `${request.capability} is explicitly excluded in the approved quote capability snapshot.`
      : `${request.capability} is not explicitly excluded in the approved quote capability snapshot.`,
    `Comparison is pinned to approved quote ${quote.id}; later opportunity edits cannot change this decision.`,
  ];

  return {
    id: `DEC-${request.id}`,
    requestId: request.id,
    quoteId: quote.id,
    capability: request.capability,
    status: outOfScope ? "OUT_OF_SCOPE" : "IN_SCOPE",
    approvedScopeMatches,
    explicitlyExcluded,
    evidence,
    reason: outOfScope
      ? `${request.capability} requires a commercial scope change because it is not part of the immutable approved quote scope${explicitlyExcluded ? " and is explicitly excluded" : ""}.`
      : `${request.capability} is already covered by the immutable approved quote scope; no commercial change request is required.`,
  };
}

export function addCalendarDays(isoDate: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new Error("Target date must use YYYY-MM-DD format.");
  if (!Number.isInteger(days) || days < 0) throw new Error("Delivery impact days must be a non-negative integer.");
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error("Target date is invalid.");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
