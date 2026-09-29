# FindAMatch — portfolio case study

## A job-search copilot that helps candidates decide, without pretending to be them

**Role:** Product strategy, UX, interaction design, and implementation  
**Build:** Static JavaScript app with Vercel Functions  
**Focus:** AI workflow design, privacy boundaries, explainable matching, and supervised automation

## The opportunity

Applying for product roles is fragmented: candidates track job boards, compare vague descriptions with an evolving resume, and repeatedly reconstruct the same application context. Existing tools tend to optimize for volume, not confidence. At the other extreme, "auto-apply" products can make unsupported claims or submit applications without meaningful review.

The hypothesis behind FindAMatch was that a useful AI workflow should reduce the manual synthesis work while leaving high-stakes representation with the candidate.

## The product loop

1. The candidate adds a resume. The browser suggests skills, industries, roles, and evidence candidates.
2. The candidate reviews that interpretation in an evidence ledger. Unverified items are not used as proof.
3. The candidate labels job-alert emails they want considered. FindAMatch imports only those emails with Gmail read-only access.
4. Target role and location become hard eligibility checks. Soft signals are transparent weights, not hidden model behavior.
5. Every eligible job shows supporting signals, evidence, explicit gaps, and a non-predictive recommendation.
6. The candidate approves a role only after review. The product creates a packet and opens the official job page; it never submits an application.

## What makes it agentic

The "agent" is not a black box that applies everywhere. It is a controlled workflow with distinct stages:

```text
Ingest → interpret → constrain → rank → explain → request approval → hand off
```

Each stage has an observable output and a clear boundary:

- **Ingest:** label-scoped job alerts and permitted public feeds.
- **Interpret:** resume-derived hypotheses that must be reviewed.
- **Constrain:** hard filters for non-negotiables such as role and location.
- **Rank:** deterministic, configurable skill/industry/seniority score.
- **Explain:** evidence used and gaps found for each job.
- **Approve:** a candidate action creates an editable packet.
- **Hand off:** official job pages are opened only after that review.

## Product trade-offs

| Trade-off | Choice |
| --- | --- |
| Convenience vs. privacy | Local-first profile and application data; no user database for the MVP. |
| Job-board coverage vs. platform rules | Source-native alerts for protected boards; public feeds only as a supplement. |
| Match confidence vs. honesty | Explainable evidence and gaps instead of a false "hire probability." |
| Automation vs. representation risk | Packet preparation and candidate-controlled final application, never autonomous submission. |

## What I would measure next

- Import-to-shortlist rate: do labeled alerts produce a useful review queue?
- Acceptance quality: how many approved roles are later opened/applied to?
- Explanation quality: do candidates say the fit/gap reasoning is accurate and actionable?
- False-positive rate for role/location gates and unsupported evidence claims.
- Time saved from alert arrival to an application-ready packet.

## Demo

- [Live app](https://applyguard.vercel.app)
- [Source repository](https://github.com/robona-pk/applyguard)
- [Walkthrough recording](./assets/applyguard-walkthrough.mov)
