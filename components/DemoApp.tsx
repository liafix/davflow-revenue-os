"use client";

import { useReducer, useState } from "react";
import { createInitialDemoState } from "@/data/demo";
import { demoReducer } from "@/domain/demoEngine";
import { deriveGuidedDemoControl } from "@/lib/demoGuidance";
import { deriveDemoView } from "@/domain/viewModel";
import { deriveExecutiveReadout } from "@/domain/executive";
import { candidateStory } from "@/domain/candidateStory";
import type { MarginStatus, Risk } from "@/domain/types";

const money = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const pct = (value: number) => `${Math.round(value * 100)}%`;
const signedPct = (value: number) => `${value >= 0 ? "+" : ""}${Math.round(value * 100)}%`;
const hours = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(1)}h`;
const dateLabel = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "Not set";
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "Not set" : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
};

type Tone = "neutral" | "good" | "warn" | "danger" | "accent";

function riskTone(risk: Risk): Tone {
  return risk === "HIGH" ? "danger" : risk === "MEDIUM" ? "warn" : "neutral";
}

function marginTone(status: MarginStatus): Tone {
  return status === "HEALTHY" ? "good" : status === "WATCH" ? "warn" : "danger";
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  const classes = {
    neutral: "border-slate-700 bg-slate-900 text-slate-300",
    good: "border-emerald-700/50 bg-emerald-500/10 text-emerald-300",
    warn: "border-amber-600/50 bg-amber-500/10 text-amber-200",
    danger: "border-rose-700/50 bg-rose-500/10 text-rose-200",
    accent: "border-blue-500/50 bg-blue-500/10 text-blue-200",
  }[tone];
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide ${classes}`}>{children}</span>;
}

function Button({ children, onClick, disabled = false, secondary = false, title }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; secondary?: boolean; title?: string }) {
  return <button type="button" onClick={onClick} disabled={disabled} title={title} className={`min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-35 ${secondary ? "border border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600 hover:bg-slate-800" : "bg-blue-500 text-white shadow-lg shadow-blue-950/20 hover:bg-blue-400"}`}>{children}</button>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p>{detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>{children}</label>;
}

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60";

function ListPanel({ title, items, tone = "neutral" }: { title: string; items: string[]; tone?: Tone }) {
  const border = tone === "warn" ? "border-amber-700/30" : tone === "danger" ? "border-rose-700/30" : "border-slate-800";
  return <div className={`rounded-xl border ${border} bg-slate-900/50 p-4`}><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p><ul className="mt-3 space-y-2 text-sm leading-5 text-slate-300">{items.map((item) => <li key={item} className="flex gap-2"><span className="text-slate-600">•</span><span>{item}</span></li>)}</ul></div>;
}

export function DemoApp() {
  const [state, dispatch] = useReducer(demoReducer, undefined, createInitialDemoState);
  const [resetArmed, setResetArmed] = useState(false);
  const view = deriveDemoView(state);
  const executive = deriveExecutiveReadout(state);
  const step = state.changeRequest?.status === "APPROVED" ? 10 : state.changeRequest ? 9 : state.project?.scopeDecision ? 8 : state.project?.newClientRequest ? 7 : state.project ? 6 : state.quote?.status === "APPROVED" ? 5 : state.quote ? 4 : state.opportunity.status === "SCOPE_APPROVED" ? 3 : state.opportunity.status === "SCOPE_REVIEW" ? 2 : 1;
  const contractDetail = state.changeRequest?.status === "APPROVED"
    ? `${money.format(view.approvedChangeRevenue)} approved change`
    : state.quote?.status === "APPROVED"
      ? "Approved client contract"
      : "Becomes active after quote approval";
  const expectedEconomics = view.quoteEstimate;
  const intakeLocked = state.opportunity.status !== "NEW";
  const reviewLocked = state.opportunity.status !== "SCOPE_REVIEW";
  const executiveTone: Tone = executive.stage === "REVENUE_EXPANDED" ? "good" : executive.marginStatus === "AT_RISK" || executive.marginStatus === "CRITICAL" ? "danger" : executive.stage === "SCOPE_CHANGE_REVIEW" || executive.stage === "CHANGE_PROPOSED" ? "warn" : "accent";
  const scopeProtectionTone: Tone = executive.scopeProtectionStatus === "MONETIZED" ? "good" : executive.scopeProtectionStatus === "OUT_OF_SCOPE" ? "warn" : executive.scopeProtectionStatus === "IN_SCOPE" ? "good" : "neutral";
  const guidedControl = deriveGuidedDemoControl(state);
  const demoProgress = Math.min(100, Math.round((step / 10) * 100));

  const runGuidedAction = () => {
    if (!guidedControl.action) return;
    setResetArmed(false);
    dispatch(guidedControl.action);
    window.requestAnimationFrame(() => document.getElementById(guidedControl.targetId)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const handleReset = () => {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    dispatch({ type: "RESET" });
    setResetArmed(false);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <a href="#workflow" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-slate-950">Skip to demo workflow</a>
      <header className="flex flex-col gap-5 border-b border-slate-800 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3"><Badge tone="accent">Candidate Demo</Badge><Badge tone="good">Release Candidate</Badge><span className="text-xs text-slate-500">Guided interview mode · synthetic data</span></div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">DavFlow Revenue OS</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">An explainable quote-to-delivery workflow for a small web team: client discovery, risk-aware pricing, delivery economics, margin protection and approved revenue expansion stay traceable to one commercial source of truth.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 md:justify-end"><nav aria-label="Demo sections" className="hidden items-center gap-3 text-xs font-semibold text-slate-400 lg:flex"><a className="rounded-md px-1 py-1 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" href="#executive">Executive</a><a className="rounded-md px-1 py-1 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" href="#workflow">Workflow</a><a className="rounded-md px-1 py-1 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" href="#architecture">Architecture</a><a className="rounded-md px-1 py-1 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" href="#candidate-story">Candidate Story</a></nav><div className="text-left md:text-right"><p className="text-xs uppercase tracking-[0.14em] text-slate-500">Demo progress</p><p className="text-sm font-semibold text-slate-200">{demoProgress}% · step {step}/10</p></div></div>
      </header>

      <section aria-label="Guided demo controls" className="sticky top-3 z-40 mt-4 rounded-2xl border border-slate-700/80 bg-slate-950/90 p-3 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><Badge tone={guidedControl.action ? "accent" : "good"}>{guidedControl.action ? "Guided next step" : "Demo complete"}</Badge><span aria-live="polite" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{executive.stage.replaceAll("_", " ")}</span></div>
            <p className="mt-2 max-w-3xl text-sm leading-5 text-slate-300">{guidedControl.note}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button onClick={runGuidedAction} disabled={!guidedControl.action} title="Uses the same reducer action as the corresponding workflow control">{guidedControl.label}</Button>
            <Button secondary onClick={handleReset}>{resetArmed ? "Confirm Reset" : "Reset Demo"}</Button>
            {resetArmed ? <button type="button" onClick={() => setResetArmed(false)} className="min-h-11 rounded-xl px-3 py-2 text-sm font-semibold text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">Cancel</button> : null}
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800" aria-hidden="true"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-[width] duration-300" style={{ width: `${demoProgress}%` }} /></div>
      </section>

      {state.error ? <div role="alert" aria-live="assertive" className="mt-5 rounded-xl border border-rose-700/50 bg-rose-500/10 p-3 text-sm text-rose-200"><strong className="font-bold">Action blocked.</strong> <span>{state.error}</span></div> : null}

      <section id="executive" className="mt-6 scroll-mt-36 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <article className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-slate-950/80 to-violet-500/10 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Badge tone={executiveTone}>{executive.stage.replaceAll("_", " ")}</Badge><span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Executive revenue readout</span></div><span className="text-xs text-slate-500">Derived from hardened domain state</span></div>
          <h2 className="mt-5 max-w-3xl text-2xl font-black tracking-tight text-white sm:text-3xl">Commercial control from first brief to approved revenue expansion.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{executive.summary}</p>
          <div className="mt-5 rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Best next demo action</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-100">{executive.nextAction}</p></div>
          <div className="mt-5 grid gap-2 sm:grid-cols-5">{[
            ["Discovery", step >= 2],
            ["Quote", step >= 4],
            ["Delivery", step >= 6],
            ["Scope Control", step >= 8],
            ["Revenue Expansion", step >= 10],
          ].map(([label, complete]) => <div key={String(label)} className={`rounded-xl border px-3 py-3 text-center text-xs font-semibold ${complete ? "border-emerald-700/40 bg-emerald-500/10 text-emerald-200" : "border-slate-800 bg-slate-950/50 text-slate-600"}`}>{String(label)}</div>)}</div>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Executive signals</p>
          <div className="mt-5 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3"><span className="text-slate-500">Scope protection</span><Badge tone={scopeProtectionTone}>{executive.scopeProtectionStatus.replaceAll("_", " ")}</Badge></div>
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3"><span className="text-slate-500">Profitability</span><Badge tone={executive.marginStatus ? marginTone(executive.marginStatus) : "neutral"}>{executive.profitabilitySignal}</Badge></div>
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3"><span className="text-slate-500">Target date</span><span className="font-semibold text-slate-200">{dateLabel(executive.deliveryTargetDate)}</span></div>
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3"><span className="text-slate-500">Original contract</span><span className="font-semibold text-slate-200">{executive.originalContractValue === null ? "—" : money.format(executive.originalContractValue)}</span></div>
            <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Revenue expansion</span><span className="font-black text-emerald-300">{executive.approvedChangeRevenue > 0 ? `+${money.format(executive.approvedChangeRevenue)} · ${pct(executive.revenueExpansionRatio)}` : "—"}</span></div>
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Active Contract" value={view.contractValue === null ? "—" : money.format(view.contractValue)} detail={contractDetail} />
        <Metric label="Planned Margin" value={expectedEconomics ? pct(expectedEconomics.margin) : "—"} detail={expectedEconomics ? expectedEconomics.marginStatus : "Available after scope approval"} />
        <Metric label="Projected Margin" value={view.projectedEconomics ? pct(view.projectedEconomics.margin) : "—"} detail={view.projectedEconomics ? `${view.projectedEconomics.marginStatus} · ${hours(view.projectedEconomics.projectedHours)} projected` : "Available during delivery"} />
        <Metric label="Profit At Risk" value={view.projectedEconomics ? money.format(view.profitAtRisk) : "—"} detail={view.projectedEconomics ? "Planned gross profit erosion" : "Available during delivery"} />
        <Metric label="Approved Change Revenue" value={money.format(view.approvedChangeRevenue)} detail="Counts only after approval" />
      </section>

      <section id="workflow" className="mt-6 grid scroll-mt-36 gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-5">
          <article id="intake" className="scroll-mt-36 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">01 · Client Intake</p><h2 className="mt-2 text-xl font-bold text-white">Turn an unstructured enquiry into a reviewable commercial brief</h2></div><Badge tone={state.opportunity.status === "SCOPE_APPROVED" ? "good" : state.opportunity.status === "SCOPE_REVIEW" ? "warn" : "neutral"}>{state.opportunity.status}</Badge></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Client"><input className={inputClass} disabled={intakeLocked} value={state.opportunity.clientName} onChange={(event) => dispatch({ type: "UPDATE_OPPORTUNITY", patch: { clientName: event.target.value } })} /></Field>
              <Field label="Project"><input className={inputClass} disabled={intakeLocked} value={state.opportunity.projectName} onChange={(event) => dispatch({ type: "UPDATE_OPPORTUNITY", patch: { projectName: event.target.value } })} /></Field>
              <Field label="Budget min"><input className={inputClass} type="number" min="0" disabled={intakeLocked} value={state.opportunity.budgetMin} onChange={(event) => dispatch({ type: "UPDATE_OPPORTUNITY", patch: { budgetMin: Number(event.target.value) } })} /></Field>
              <Field label="Budget max"><input className={inputClass} type="number" min="0" disabled={intakeLocked} value={state.opportunity.budgetMax} onChange={(event) => dispatch({ type: "UPDATE_OPPORTUNITY", patch: { budgetMax: Number(event.target.value) } })} /></Field>
              <Field label="Target date"><input className={inputClass} type="date" disabled={intakeLocked} value={state.opportunity.targetDate} onChange={(event) => dispatch({ type: "UPDATE_OPPORTUNITY", patch: { targetDate: event.target.value } })} /></Field>
              <Field label="Business goal"><input className={inputClass} disabled={intakeLocked} value={state.opportunity.businessGoal} onChange={(event) => dispatch({ type: "UPDATE_OPPORTUNITY", patch: { businessGoal: event.target.value } })} /></Field>
            </div>
            <div className="mt-4"><Field label="Raw client request"><textarea className={`${inputClass} min-h-28 resize-y`} disabled={intakeLocked} value={state.opportunity.rawRequest} onChange={(event) => dispatch({ type: "UPDATE_OPPORTUNITY", patch: { rawRequest: event.target.value } })} /></Field></div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-sm"><div><span className="text-slate-500">Budget</span><span className="ml-2 font-semibold text-slate-200">{money.format(state.opportunity.budgetMin)}–{money.format(state.opportunity.budgetMax)}</span><span className="mx-2 text-slate-700">·</span><span className="text-slate-500">Target</span><span className="ml-2 font-semibold text-slate-200">{dateLabel(state.opportunity.targetDate)}</span></div><Button onClick={() => dispatch({ type: "ANALYZE" })} disabled={state.opportunity.status !== "NEW"}>Analyze Requirements</Button></div>
          </article>

          {state.opportunity.status !== "NEW" ? <article id="scope-review" className="scroll-mt-36 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">Demo AI · deterministic fallback</p><Badge tone="neutral">No live LLM required</Badge></div><h2 className="mt-2 text-xl font-bold text-white">Requirements analysis + human commercial review</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">The analyzer proposes structure; the human can exclude deliverables or change effort/risk assumptions before anything becomes approved or priced as a contract.</p></div><Badge tone={state.opportunity.status === "SCOPE_APPROVED" ? "good" : "warn"}>{state.opportunity.status === "SCOPE_APPROVED" ? "Human Approved" : "Human Review Required"}</Badge></div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ListPanel title="Structured requirements" items={state.opportunity.requirements} />
              <ListPanel title="Open questions" items={state.opportunity.openQuestions} tone="warn" />
              <ListPanel title="Assumptions" items={state.opportunity.assumptions} />
              <ListPanel title="Risks" items={state.opportunity.risks} tone="warn" />
            </div>
            <div className="mt-3"><ListPanel title="Explicit exclusions" items={state.opportunity.exclusions} tone="danger" /></div>

            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-4 py-3">Include</th><th className="px-4 py-3">Deliverable</th><th className="px-4 py-3">Base</th><th className="px-4 py-3">Risk</th><th className="px-4 py-3">Priced</th><th className="px-4 py-3 text-right">Line value</th></tr></thead>
                <tbody>
                  {view.scopeRows.map((item) => <tr key={item.id} className={`border-t border-slate-800 ${item.selected ? "bg-slate-950/30" : "bg-slate-950/70 opacity-55"}`}>
                    <td className="px-4 py-3"><input aria-label={`Include ${item.name}`} type="checkbox" checked={item.selected} disabled={reviewLocked} onChange={() => dispatch({ type: "TOGGLE_SCOPE_ITEM", id: item.id })} className="h-4 w-4 accent-blue-500" /></td>
                    <td className="px-4 py-3"><p className="font-semibold text-slate-200">{item.name}</p><p className="mt-1 max-w-sm text-xs text-slate-500">{item.description}</p><p className="mt-1 text-[11px] uppercase tracking-wide text-slate-600">{item.capability}</p></td>
                    <td className="px-4 py-3"><input aria-label={`${item.name} base hours`} className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-right text-slate-200 disabled:opacity-60" type="number" min="1" step="1" disabled={reviewLocked || !item.selected} value={item.baseHours} onChange={(event) => dispatch({ type: "UPDATE_SCOPE_ITEM", id: item.id, patch: { baseHours: Number(event.target.value) } })} /></td>
                    <td className="px-4 py-3"><select aria-label={`${item.name} risk`} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200 disabled:opacity-60" disabled={reviewLocked || !item.selected} value={item.risk} onChange={(event) => dispatch({ type: "UPDATE_SCOPE_ITEM", id: item.id, patch: { risk: event.target.value as Risk } })}><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option></select></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="font-semibold text-slate-200">{hours(item.adjustedHours)}</span>{item.riskBufferHours > 0 ? <span className="text-xs text-amber-300">+{hours(item.riskBufferHours)}</span> : null}</div></td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-200">{item.selected ? money.format(item.linePrice) : "—"}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>

            {view.reviewEstimate ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Included" value={`${view.selectedScopeCount}`} detail={`${view.excludedScopeCount} excluded`} /><Metric label="Base Effort" value={hours(view.reviewEstimate.baseHours)} /><Metric label="Risk Buffer" value={`+${hours(view.reviewEstimate.riskBufferHours)}`} /><Metric label="Quote Preview" value={money.format(view.reviewEstimate.revenue)} detail={`${money.format(view.reviewEstimate.billableHourlyRate)}/h`} /><Metric label="Budget Fit" value={view.budgetFit ?? "—"} detail={`${money.format(state.opportunity.budgetMin)}–${money.format(state.opportunity.budgetMax)}`} /></div> : null}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="max-w-2xl text-xs leading-5 text-slate-500">Changing inclusion, effort or risk recalculates the preview through the same hardened pricing engine. Approval freezes the reviewed scope; later actions cannot edit it.</p><Button onClick={() => dispatch({ type: "APPROVE_SCOPE" })} disabled={state.opportunity.status !== "SCOPE_REVIEW" || view.selectedScopeCount === 0}>Approve Reviewed Scope</Button></div>
          </article> : null}

          {state.opportunity.status === "SCOPE_APPROVED" && expectedEconomics ? <article id="quote" className="scroll-mt-36 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">02 · Commercial Quote</p><h2 className="mt-2 text-xl font-bold text-white">Explainable proposal generated only from approved scope</h2><p className="mt-2 text-sm text-slate-400">Every line item, rate and margin can be traced back to the reviewed scope and the quote pricing snapshot.</p></div><div className="flex items-center gap-2">{view.budgetFit ? <Badge tone={view.budgetFit === "WITHIN" ? "good" : "warn"}>Budget · {view.budgetFit}</Badge> : null}{state.quote ? <Badge tone={state.quote.status === "APPROVED" ? "good" : "neutral"}>{state.quote.status}</Badge> : <Badge tone="warn">Preview</Badge>}</div></div>

            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-4 py-3">Deliverable</th><th className="px-4 py-3">Risk</th><th className="px-4 py-3">Base</th><th className="px-4 py-3">Priced</th><th className="px-4 py-3 text-right">Price</th></tr></thead>
                <tbody>{view.quoteLineItems.map((item) => <tr key={item.id} className="border-t border-slate-800"><td className="px-4 py-3"><p className="font-semibold text-slate-200">{item.name}</p><p className="mt-1 text-[11px] uppercase tracking-wide text-slate-600">{item.capability}</p></td><td className="px-4 py-3"><Badge tone={riskTone(item.risk)}>{item.risk}</Badge></td><td className="px-4 py-3 text-slate-300">{hours(item.baseHours)}</td><td className="px-4 py-3 text-slate-200">{hours(item.pricedHours)}</td><td className="px-4 py-3 text-right font-semibold text-slate-100">{money.format(item.price)}</td></tr>)}</tbody>
                <tfoot><tr className="border-t border-slate-700 bg-slate-900/50"><td colSpan={4} className="px-4 py-3 text-sm font-semibold text-slate-300">Total quote value</td><td className="px-4 py-3 text-right text-xl font-black text-white">{money.format(state.quote?.originalContractValue ?? view.quotePreview ?? 0)}</td></tr></tfoot>
              </table>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Metric label="Base Effort" value={hours(expectedEconomics.baseHours)} /><Metric label="Risk Buffer" value={`+${hours(expectedEconomics.riskBufferHours)}`} /><Metric label="Priced Effort" value={hours(expectedEconomics.riskAdjustedHours)} /><Metric label="Expected Cost" value={money.format(expectedEconomics.cost)} /><Metric label="Expected Profit" value={money.format(expectedEconomics.profit)} /><Metric label="Planned Margin" value={pct(expectedEconomics.margin)} detail={expectedEconomics.marginStatus} /></div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Commercial terms</p><p className="mt-3 text-sm text-slate-300">Delivery: <span className="font-semibold text-white">{view.quoteTerms.deliveryWeeks} weeks</span></p><p className="mt-2 text-sm text-slate-300">Validity: <span className="font-semibold text-white">{view.quoteTerms.validityDays} days</span></p><p className="mt-2 text-xs text-slate-500">Rate snapshot: {money.format(expectedEconomics.billableHourlyRate)}/h · internal {money.format(expectedEconomics.internalHourlyCost)}/h</p></div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Payment milestones</p><div className="mt-3 space-y-2">{view.quoteTerms.paymentMilestones.map((milestone) => <div key={milestone.label} className="flex justify-between gap-3 text-sm"><span className="text-slate-300">{milestone.label}</span><span className="text-right"><span className="font-semibold text-white">{milestone.percent}%</span><span className="ml-2 text-xs text-slate-500">{money.format((view.quotePreview ?? 0) * milestone.percent / 100)}</span></span></div>)}</div></div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Commercial boundary</p><p className="mt-3 text-sm leading-5 text-slate-300">{view.quoteTerms.exclusions.length} exclusions are carried into the proposal snapshot so later requests can be compared against the approved contract.</p><p className="mt-2 text-xs text-slate-500">AI never generates financial values; pricing stays deterministic.</p></div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2"><ListPanel title="Quote assumptions" items={view.quoteTerms.assumptions} /><ListPanel title="Out of scope" items={view.quoteTerms.exclusions} tone="danger" /></div>
            <div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => dispatch({ type: "GENERATE_QUOTE" })} disabled={Boolean(state.quote)}>Generate Quote Snapshot</Button><Button secondary onClick={() => dispatch({ type: "SEND_QUOTE" })} disabled={state.quote?.status !== "DRAFT"}>Mark Sent</Button><Button secondary onClick={() => dispatch({ type: "APPROVE_QUOTE" })} disabled={state.quote?.status !== "SENT"}>Approve Quote</Button><Button secondary onClick={() => dispatch({ type: "CREATE_PROJECT" })} disabled={state.quote?.status !== "APPROVED" || Boolean(state.project)}>Create Project</Button></div>
          </article> : null}

          {state.project ? <article id="delivery" className="scroll-mt-36 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">03 · Delivery + Margin Guard</p><h2 className="mt-2 text-xl font-bold text-white">Track delivery evidence before margin silently erodes</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Project progress is derived from task-level planned hours, actual effort and completion. Margin Guard projects the end-state from this evidence instead of relying on a manually entered project percentage.</p></div><Badge tone="good">{state.project.status}</Badge></div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Planned Effort" value={view.deliverySummary ? hours(view.deliverySummary.plannedHours) : "—"} /><Metric label="Actual Effort" value={view.deliverySummary ? hours(view.deliverySummary.actualHours) : "—"} /><Metric label="Weighted Completion" value={view.deliverySummary ? pct(view.deliverySummary.completionRatio) : "—"} /><Metric label="Projected Effort" value={view.projectedEconomics ? hours(view.projectedEconomics.projectedHours) : "Unavailable"} /><Metric label="Profit At Risk" value={money.format(view.profitAtRisk)} /></div>

            {view.marginGuard && view.plannedEconomics && view.projectedEconomics ? <div className={`mt-4 rounded-2xl border p-4 ${view.marginGuard.status === "HEALTHY" ? "border-emerald-700/40 bg-emerald-500/10" : view.marginGuard.status === "WATCH" ? "border-amber-700/40 bg-amber-500/10" : "border-rose-700/40 bg-rose-500/10"}`}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Explainable Margin Guard</p><h3 className="mt-1 text-lg font-black text-white">{view.marginGuard.headline}</h3></div><div className="flex flex-wrap gap-2"><Badge tone={marginTone(view.plannedEconomics.marginStatus)}>Plan {pct(view.plannedEconomics.margin)}</Badge><Badge tone={marginTone(view.projectedEconomics.marginStatus)}>Forecast {pct(view.projectedEconomics.margin)} · {view.projectedEconomics.marginStatus}</Badge></div></div><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{view.marginGuard.message}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400"><span>Margin delta <strong className="text-slate-200">{view.marginDelta === null ? "—" : signedPct(view.marginDelta)}</strong></span><span>Projected hour variance <strong className="text-slate-200">{view.projectedHourVariance === null ? "—" : `${view.projectedHourVariance >= 0 ? "+" : ""}${hours(view.projectedHourVariance)}`}</strong></span><span>Gross profit erosion <strong className="text-slate-200">{money.format(view.profitAtRisk)}</strong></span></div></div> : null}

            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-4 py-3">Delivery task</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Actual</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Status</th></tr></thead>
                <tbody>{state.project.tasks.map((task) => <tr key={task.id} className="border-t border-slate-800"><td className="px-4 py-3"><p className="font-semibold text-slate-200">{task.name}</p><p className="mt-1 text-[11px] uppercase tracking-wide text-slate-600">{task.capability} · {task.source === "CHANGE_REQUEST" ? "change" : "original scope"}</p></td><td className="px-4 py-3 font-semibold text-slate-200">{hours(task.plannedHours)}</td><td className="px-4 py-3"><input aria-label={`${task.name} actual hours`} className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-right text-slate-200" type="number" min="0" step="0.5" value={Number(task.actualHours.toFixed(2))} onChange={(event) => dispatch({ type: "UPDATE_DELIVERY_TASK", id: task.id, patch: { actualHours: Number(event.target.value) } })} /></td><td className="px-4 py-3"><div className="flex min-w-44 items-center gap-3"><input aria-label={`${task.name} progress`} className="w-full accent-blue-500" type="range" min="0" max="100" step="5" value={Math.round(task.completionRatio * 100)} onChange={(event) => dispatch({ type: "UPDATE_DELIVERY_TASK", id: task.id, patch: { completionRatio: Number(event.target.value) / 100 } })} /><span className="w-10 text-right text-xs font-semibold text-slate-300">{pct(task.completionRatio)}</span></div></td><td className="px-4 py-3"><Badge tone={task.status === "DONE" ? "good" : task.status === "IN_PROGRESS" ? "accent" : "neutral"}>{task.status}</Badge></td></tr>)}</tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3"><p className="max-w-2xl text-xs leading-5 text-slate-500">Use the deterministic overrun control to demonstrate why profitability monitoring matters. It changes actual delivery effort only; approved scope, rate, contract value and earned progress stay untouched.</p><div className="flex flex-wrap gap-2"><Button secondary onClick={() => dispatch({ type: "SIMULATE_DELIVERY_OVERRUN" })} disabled={state.project.deliveryMode === "OVERRUN"}>Simulate Effort Overrun</Button><Button secondary onClick={() => dispatch({ type: "RESTORE_DELIVERY_BASELINE" })} disabled={state.project.deliveryMode === "BASELINE"}>Restore Delivery Baseline</Button><Badge tone={state.project.deliveryMode === "OVERRUN" ? "danger" : state.project.deliveryMode === "CUSTOM" ? "warn" : "neutral"}>Evidence · {state.project.deliveryMode}</Badge></div></div>

            {state.project.newClientRequest ? <div className="mt-4 rounded-xl border border-amber-700/40 bg-amber-500/10 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">New client request · {state.project.newClientRequest.capability}</p><p className="mt-2 text-sm text-amber-100">“{state.project.newClientRequest.text}”</p></div> : null}
            {view.scopeDecision ? <div className={`mt-4 rounded-2xl border p-5 ${view.scopeDecision.status === "OUT_OF_SCOPE" ? "border-rose-700/50 bg-rose-500/10" : "border-emerald-700/50 bg-emerald-500/10"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Contract comparison evidence</p><p className={`mt-2 text-2xl font-black ${view.scopeDecision.status === "OUT_OF_SCOPE" ? "text-rose-200" : "text-emerald-200"}`}>{view.scopeDecision.status.replaceAll("_", " ")}</p><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{view.scopeDecision.reason}</p></div><Badge tone={view.scopeDecision.status === "OUT_OF_SCOPE" ? "danger" : "good"}>Compared with {view.scopeDecision.quoteId}</Badge></div><ul className="mt-4 space-y-2 text-sm text-slate-300">{view.scopeDecision.evidence.map((item) => <li key={item} className="flex gap-2"><span className="text-slate-600">•</span><span>{item}</span></li>)}</ul></div> : null}
            <div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => dispatch({ type: "ADD_CLIENT_REQUEST" })} disabled={Boolean(state.project.newClientRequest)}>Add Client Request</Button><Button secondary onClick={() => dispatch({ type: "ANALYZE_SCOPE_CHANGE" })} disabled={!state.project.newClientRequest || Boolean(state.project.scopeDecision)}>Compare With Approved Scope</Button><Button secondary onClick={() => dispatch({ type: "CREATE_CHANGE_REQUEST" })} disabled={view.scopeDecision?.status !== "OUT_OF_SCOPE" || Boolean(state.changeRequest)}>Create Change Request</Button></div>
          </article> : null}

          {state.changeRequest ? <article id="change-request" className="scroll-mt-36 rounded-2xl border border-blue-500/40 bg-blue-500/5 p-5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">04 · Revenue Expansion</p><h2 className="mt-2 text-2xl font-black text-white">{state.changeRequest.id} · {state.changeRequest.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Commercial change is anchored to scope evidence {state.changeRequest.scopeDecisionId}; original quote pricing and contract baseline are snapshotted before client approval.</p></div><Badge tone={state.changeRequest.status === "APPROVED" ? "good" : "accent"}>{state.changeRequest.status}</Badge></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6"><Metric label="Base Effort" value={hours(state.changeRequest.baseHours)} /><Metric label="Risk Buffer" value={`+${hours(state.changeRequest.riskBufferHours)}`} /><Metric label="Priced Effort" value={hours(state.changeRequest.addedHours)} /><Metric label="Added Revenue" value={`+${money.format(state.changeRequest.price)}`} /><Metric label="Expected Profit" value={money.format(state.changeRequest.expectedProfit)} detail={`${pct(state.changeRequest.expectedMargin)} change margin`} /><Metric label="Delivery Impact" value={`+${state.changeRequest.deliveryImpactDays} days`} /></div>
            <div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Commercial impact if approved</p><div className="mt-3 flex flex-wrap items-baseline gap-2"><span className="text-lg text-slate-400">{money.format(state.changeRequest.previousContractValue)}</span><span className="text-emerald-300">+ {money.format(state.changeRequest.price)}</span><span className="text-2xl font-black text-white">= {money.format(state.changeRequest.resultingContractValue)}</span></div><p className="mt-2 text-xs text-slate-500">No contract value changes while status is {state.changeRequest.status}.</p></div><div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Schedule impact</p><p className="mt-3 text-sm text-slate-300">{dateLabel(state.changeRequest.targetDateBefore)} <span className="mx-2 text-slate-600">→</span> <strong className="text-white">{dateLabel(state.changeRequest.targetDateAfter)}</strong></p><p className="mt-2 text-xs text-slate-500">Explicit +{state.changeRequest.deliveryImpactDays} calendar-day impact attached to this commercial change.</p></div></div>
            <div className="mt-4 flex flex-wrap items-center gap-2"><Badge tone={riskTone(state.changeRequest.risk)}>Risk · {state.changeRequest.risk}</Badge><span className="text-xs text-slate-500">Price = risk-adjusted effort × quote snapshot rate {money.format(state.changeRequest.billableHourlyRate)}/h · expected internal cost {money.format(state.changeRequest.expectedCost)}.</span></div>
            <div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => dispatch({ type: "PROPOSE_CHANGE_REQUEST" })} disabled={state.changeRequest.status !== "DRAFT"}>Propose Change</Button><Button secondary onClick={() => dispatch({ type: "APPROVE_CHANGE_REQUEST" })} disabled={state.changeRequest.status !== "PROPOSED"}>Approve Change</Button></div>
            {state.changeRequest.status === "APPROVED" && state.quote ? <div className="mt-5 rounded-2xl border border-emerald-600/40 bg-emerald-500/10 p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">Approved revenue expansion</p><div className="mt-2 flex flex-wrap items-baseline gap-3"><span className="text-xl text-slate-400">{money.format(state.changeRequest.previousContractValue)}</span><span className="text-xl text-emerald-300">+ {money.format(state.changeRequest.price)}</span><span className="text-3xl font-black text-white">= {money.format(state.quote.currentContractValue)}</span></div><p className="mt-2 text-sm text-emerald-100">Contract value increased by {pct(view.increaseRatio)} only after explicit client approval; {hours(state.changeRequest.addedHours)} of approved delivery work was added to the project.</p></div> : null}
          </article> : null}
        </div>

        <aside className="space-y-5">
          <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Release readiness</p><ul className="mt-4 space-y-3 text-sm text-slate-300"><li>✓ Executive dashboard remains read-only and derived from hardened state.</li><li>✓ Guided controls reuse the same reducer actions and cannot bypass approval gates.</li><li>✓ Reset requires explicit confirmation during the demo.</li><li>✓ Revenue, margin and scope evidence remain lifecycle-aware.</li><li>✓ Synthetic data and Demo AI labeling remain explicit.</li><li>○ Run <code className="rounded bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-300">npm run validate</code> in a networked environment before production deploy.</li></ul></article>
          <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current brief</p><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-slate-500">Client</span><span className="text-right font-semibold text-slate-200">{state.opportunity.clientName}</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">Goal</span><span className="max-w-48 text-right text-slate-300">{state.opportunity.businessGoal}</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">Target</span><span className="font-semibold text-slate-200">{dateLabel(state.project?.deliveryTargetDate ?? state.opportunity.targetDate)}</span></div>{view.quotePreview !== null ? <div className="flex justify-between gap-3"><span className="text-slate-500">Current quote</span><span className="font-semibold text-slate-100">{money.format(view.quotePreview)}</span></div> : null}</div></article>
          <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Business invariants</p><ul className="mt-4 space-y-3 text-sm text-slate-300"><li>✓ Scope requires human approval.</li><li>✓ Quote requires approved scope.</li><li>✓ Contract value appears only after quote approval.</li><li>✓ Project requires approved quote.</li><li>✓ Change revenue counts only after approval.</li><li>✓ Scope changes cannot mutate the original quote snapshot.</li></ul></article>
          <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Audit trail</p><ol className="mt-4 max-h-80 space-y-3 overflow-auto pr-1">{state.auditLog.slice().reverse().map((event) => <li key={event.id} className="border-l border-slate-700 pl-3 text-xs leading-5 text-slate-400"><span className="font-semibold text-slate-300">{event.code}</span><br />{event.message}</li>)}</ol></article>
          <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-sm leading-6 text-slate-400"><p className="font-semibold text-slate-200">Candidate-demo framing</p><p className="mt-2">This is a synthetic workflow inspired only by public responsibilities in the job posting. It does not represent DavSol internal data, clients or systems. “Demo AI” is a deterministic fallback in this build, not a live model call.</p></article>
        </aside>
      </section>
      <section id="architecture" className="mt-8 scroll-mt-36 rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">Architecture</p><h2 className="mt-2 text-2xl font-black text-white">One explainable path from client ambiguity to commercial control</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">The presentation layer never writes economics. Each executive signal is derived from the same approved scope, quote snapshot, delivery evidence and change-control state used by the workflow.</p></div><Badge tone="good">Read-only presentation layer</Badge></div>
        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{candidateStory.architecture.map((item, index) => <div key={item} className="relative rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{String(index + 1).padStart(2, "0")}</p><p className="mt-2 text-sm font-bold text-slate-100">{item}</p></div>)}</div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{candidateStory.principles.map((principle) => <div key={principle} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm leading-6 text-slate-300">{principle}</div>)}</div>
      </section>

      <section id="candidate-story" className="mt-8 scroll-mt-36 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Candidate story</p>
          <h2 className="mt-2 text-2xl font-black text-white">Why I built DavFlow Revenue OS</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{candidateStory.thesis}</p>
          <div className="mt-6 divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900/40">{candidateStory.roleMap.map((item) => <div key={item.responsibility} className="grid gap-2 p-4 sm:grid-cols-[0.32fr_0.68fr]"><p className="text-sm font-bold text-white">{item.responsibility}</p><p className="text-sm leading-6 text-slate-400">{item.proof}</p></div>)}</div>
          <div className="mt-5 rounded-2xl border border-amber-700/30 bg-amber-500/5 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-300">Credibility guardrail</p><p className="mt-2 text-sm leading-6 text-amber-100/80">{candidateStory.disclaimer}</p></div>
        </article>

        <article className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">3–5 minute interview route</p>
          <h2 className="mt-2 text-2xl font-black text-white">Show the business story, not every screen</h2>
          <ol className="mt-6 space-y-4">{candidateStory.interviewRoute.map((item, index) => <li key={item} className="flex gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-700/50 bg-emerald-500/10 text-xs font-black text-emerald-300">{index + 1}</span><p className="pt-1 text-sm leading-6 text-slate-300">{item}</p></li>)}</ol>
          <div className="mt-6 rounded-2xl border border-blue-700/30 bg-blue-500/5 p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">What the recruiter should understand</p><p className="mt-2 text-lg font-black leading-7 text-white">This candidate can connect client requirements, engineering decisions and project economics — and can explain where AI helps without outsourcing commercial judgment to it.</p></div>
        </article>
      </section>

      <footer className="mt-10 border-t border-slate-800 py-6 text-xs leading-5 text-slate-500">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p>DavFlow Revenue OS · release candidate · synthetic candidate demonstration.</p><p>No proprietary DavSol data or live AI dependency is used in this build.</p></div>
      </footer>

    </main>
  );
}
