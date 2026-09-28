# ApplyGuard

> A local-first, supervised job-search copilot for product managers.

ApplyGuard turns a resume into an editable evidence ledger, finds recent product jobs from public feeds, ranks them transparently, and prepares a reviewed application packet. It assists the candidate; it does not impersonate them.

## What works now

The shipped static app has no backend, account, database, or API key.

- Paste a resume or load a TXT, Markdown, PDF, or DOCX file; parsing occurs in the browser and the resulting text/profile stay in `localStorage` in the current browser.
- Analyze the text locally to suggest product skills, relevant industries, target roles, and achievement-shaped evidence candidates.
- Review, edit, and save an evidence ledger. Saved evidence is the only candidate material used in job-match explanations.
- Run an on-demand search against permitted public job feeds (Remotive, Arbeitnow, and Remote OK). Source failures are visible and do not prevent other sources from returning results.
- Filter recent jobs, deduplicate them, and rank PM roles with visible, adjustable deterministic weights.
- See supporting skill signals, evidence items, gaps, and an explicitly non-predictive recommendation for every role.
- Approve/reject a job locally. Approval creates an editable application packet with a missing-information checklist.
- Open the official job URL only after an approved packet is reviewed; the app never pre-fills or submits a third-party form.
- Export or permanently delete all local data.

## Workflow

```text
Resume text (browser local storage)
  → editable verified evidence ledger
  → public job-feed query, normalization and deduplication
  → transparent role/evidence/gap assessment
  → candidate approves or rejects a role
  → reviewable application packet
  → official job page opens in a new tab
  → candidate completes and submits the application themselves
```

## Intentional boundaries

This is a browser-only MVP. That has material limits:

- It cannot run a scheduled daily search while the browser is closed.
- It only uses public feeds that the browser can access; source availability and CORS policy can change.
- PDF and DOCX parsing downloads an open-source parser library at runtime. The file contents stay in the browser; if the parser cannot load, paste extracted text instead.
- `localStorage` is not encrypted and is scoped to this browser/device. Do not use a shared browser profile for sensitive application data.
- The app never stores credentials, logs into job boards, uploads files, sends messages, or submits applications.

## Ranking model

Every role receives a 0–100 prioritization score, not a prediction of whether the candidate will be hired.

| Component | Default weight | Meaning |
| --- | ---: | --- |
| Skill signals | 45 | Overlap between resume-derived, verified skills and job language |
| Role alignment | 20 | Alignment with target roles and product-management titles |
| Industry alignment | 15 | Overlap with candidate-selected industries |
| Seniority | 10 | A cautious adjustment for roles labelled senior/lead/director |
| Location | 10 | Match with explicit location/remote preference |

The slider weights are local, inspectable, and adjustable. The interface always shows evidence used and gaps that need human review.

## Run locally

No package installation is required. Open `dist/index.html` in a modern browser. For live source requests, serve the `dist` folder with any static server if your browser restricts network requests from `file://` pages.

## Repository structure

```text
dist/
  index.html     # application markup and accessible workflow screens
  styles.css     # responsive styles
  app.js         # local state, resume analysis, sources, ranking, packets
```

## Next milestones

1. Migrate structured local data from `localStorage` to IndexedDB for larger resume files and more robust client-side retention.
2. Add a labeled evaluation set for fit accuracy, unsupported-claim prevention, and gap detection.
3. Add a small serverless scheduled discovery service for a genuine daily run, with source consent and an explicit privacy policy.
4. Add a user-authorized browser extension handoff that still requires visible per-site, final-submit confirmation.

## Privacy

Do not commit resumes, contact details, compensation information, cookies, credentials, or application receipts to this repository. The illustrative job data is synthetic.
