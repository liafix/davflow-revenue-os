export const candidateStory = {
  thesis:
    "Turn an unstructured client request into a controlled commercial workflow where scope, pricing, delivery evidence and revenue impact remain explainable from first quote to final change approval.",
  roleMap: [
    {
      responsibility: "Client discovery",
      proof: "Editable intake, structured requirements analysis and explicit open questions before commercial approval.",
    },
    {
      responsibility: "Estimating + quoting",
      proof: "Human-reviewed scope flows into deterministic risk-adjusted effort, pricing, margin and payment terms.",
    },
    {
      responsibility: "Project delivery",
      proof: "Approved quote scope becomes task-level delivery evidence with actual effort and weighted completion.",
    },
    {
      responsibility: "Margin control",
      proof: "Margin Guard forecasts effort and profit erosion from delivery evidence instead of a manually entered project percentage.",
    },
    {
      responsibility: "Scope control",
      proof: "New requests are compared against the immutable approved quote snapshot and explicit exclusions.",
    },
    {
      responsibility: "AI-assisted development",
      proof: "A deterministic Demo AI fallback structures requirements while humans retain approval of scope and commercial commitments.",
    },
  ],
  architecture: [
    "Client Request",
    "Demo AI Structuring",
    "Human Review",
    "Deterministic Economics",
    "Approved Quote Snapshot",
    "Delivery Evidence",
    "Margin Guard",
    "Scope Control",
    "Revenue Expansion",
  ],
  principles: [
    "AI assists; humans approve.",
    "Commercial numbers are derived from one source of truth.",
    "Approved quote terms remain immutable historical evidence.",
    "Delivery risk is calculated from task evidence, not vanity metrics.",
    "Out-of-scope work becomes an explicit commercial decision before revenue or delivery scope changes.",
  ],
  interviewRoute: [
    "Start with the client brief and show how raw requirements become a reviewable scope.",
    "Approve scope and explain how risk-adjusted effort produces the commercial quote and margin.",
    "Create the delivery project, then simulate effort overrun to show Margin Guard reacting to evidence.",
    "Add the booking request, prove it is outside the approved quote, and approve the priced change request.",
  ],
  disclaimer:
    "Synthetic candidate demonstration inspired only by public responsibilities in the job posting. It does not represent DavSol internal data, clients, processes or proprietary systems. Demo AI is a deterministic fallback, not a live model call.",
} as const;
