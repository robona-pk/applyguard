# Rolewise

**A local-first, evidence-grounded job-search copilot for product managers.**

Rolewise turns a candidate's resume into a reviewable profile, imports only the job-alert emails they explicitly label, applies hard eligibility filters, ranks the remaining roles with an inspectable model, and prepares an editable application packet. It is decision support—not an auto-apply bot.

[Open the live app](https://rolewise-pk.vercel.app) · [Watch the walkthrough](./docs/assets/applyguard-walkthrough.mov) · [Read the product case study](./docs/portfolio-case-study.md)

> **Portfolio build.** This project demonstrates product judgment as much as implementation: where automation is useful, where it is risky, and how to preserve a candidate's control over their own career data and applications.

## The problem

Job search tools often make two unhelpful trade-offs: they either flood candidates with undifferentiated listings or promise autonomous applications that can make unsupported claims on their behalf. Product managers need a faster way to find opportunities **and** a trustworthy way to judge fit.

Rolewise is designed around a smaller, more credible loop:

```text
Resume → editable evidence ledger → labeled job alerts → hard eligibility gates
       → transparent ranking and gaps → candidate approval → reviewed handoff
```

## What it does

- **Local resume analysis** — paste or load a TXT, PDF, or DOCX resume. Text, profile data, decisions, and packets remain in the browser's `localStorage`.
- **Verified evidence ledger** — extracted achievements are hypotheses until the candidate reviews and saves them. Only verified evidence can support a recommendation or packet.
- **Candidate-controlled Gmail import** — after explicit Google OAuth consent, the app reads only emails carrying the `rolewise-jobs` label and extracts original LinkedIn, Naukri, IIMJobs, and Instahyre links.
- **Supplementary open-feed search** — an on-demand search checks permitted public feeds for extra startup and remote roles. It does not scrape protected job boards.
- **Hard filters before ranking** — target role and location are eligibility gates. A role that fails either is shown as excluded, never promoted because it has matching keywords.
- **Transparent soft-signal ranking** — skill signals, industry alignment, and seniority are adjustable local weights that always total 100%.
- **Human-approved application packets** — approval creates a reviewed draft, surfaces missing information, and opens the official job URL only when the candidate chooses to continue.

## Walkthrough

1. Upload or paste a resume and review the suggested profile.
2. Correct the inferred signals, add evidence, target roles, industries, and location; then save the verified profile.
3. Create job alerts on preferred boards and apply the Gmail label `rolewise-jobs`.
4. Connect Google with read-only access and import only those labeled alerts—or run the supplementary public-feed search.
5. Review ranked eligible roles, fit signals, evidence, and gaps.
6. Approve a role to create a packet, complete the checklist, and hand off to the official job page.

The recorded walkthrough uses illustrative data only. See the [demo script](./docs/DEMO_SCRIPT.md) for the exact narrative.

## Product decisions

| Decision | Why it matters |
| --- | --- |
| `localStorage` by default | A portfolio MVP should not silently centralize resumes, job decisions, or application data. |
| Gmail labels as the import boundary | The candidate chooses exactly which emails Rolewise may read; it never scans the full inbox. |
| Role + location as hard filters | Eligibility should not be diluted by a scoring model. Bengaluru and Bangalore are treated as the same location. |
| Evidence ledger before explanations | The product cannot turn weak resume inference into a confident claim. |
| No autofill or submit | A job application is representational and high stakes. The candidate reviews and submits on the employer's site. |

## Architecture

```text
Browser (static app)
├── Resume parsing + profile inference
├── Local state / evidence / decisions / packets
├── Deterministic hard filters and fit scoring
└── Public-source discovery requests

Vercel Functions (only when enabled)
├── Google OAuth bridge → ephemeral Gmail read-only token
├── Gmail labeled-alert importer
├── Jobvetta India search proxy (optional API key)
└── Startup Jobs source proxy
```

## Repository guide

```text
dist/
  index.html                 # Accessible product workflow and content
  app.js                     # State, parsing, import, ranking, packet creation
  styles.css                 # Responsive visual system
api/
  google/auth.js             # OAuth entry point
  google/callback.js         # Token exchange and safe popup bridge
  gmail/jobs.js              # Label-scoped Gmail role-link extraction
  jobvetta.js                # Optional server-side India search proxy
  startupjobs.js             # Supplementary public-source proxy
docs/
  portfolio-case-study.md    # Portfolio-ready product narrative
  DEMO_SCRIPT.md             # Walkthrough narration and test data guardrails
  assets/                    # Recorded product walkthrough
```

## Run locally

There is no build step or dependency install. Serve `dist/` with any static server and open it in a modern browser.

```bash
cd dist
python3 -m http.server 4173
```

Then visit `http://localhost:4173`. Gmail import and server-side source proxies require a Vercel deployment.

## Deploy to Vercel

This repository is a static app plus Vercel Functions. Configure Vercel's output directory as `dist`.

For Gmail alert import, set these variables for the relevant environment (Preview and/or Production):

```text
APP_ORIGIN=https://your-deployment-url
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

In Google Cloud, add the exact environment-specific values as:

- Authorized JavaScript origin: `https://your-deployment-url`
- Redirect URI: `https://your-deployment-url/api/google/callback`

For optional Jobvetta coverage, also add `JOBVETTA_API_KEY`. API keys are read only inside the serverless function and are never sent to the browser.

## Important boundaries

- LinkedIn, Naukri, IIMJobs, and Instahyre are imported through candidate-controlled alerts; this app does **not** scrape their protected pages.
- Google access is `gmail.readonly`, scoped by the label query, and uses an ephemeral browser-session token. Refresh tokens are not retained.
- Resume parsing happens in-browser. PDF/DOCX parsing loads an open-source parser at runtime; when that cannot load, paste the extracted text instead.
- `localStorage` is device/browser scoped and not encrypted. Do not use a shared browser profile for private career data.
- Do not commit resumes, OAuth credentials, API keys, or exported user data.

## Roadmap

1. Move structured local data to IndexedDB for more resilient client-side storage.
2. Build a labeled evaluation set for fit quality, unsupported-claim prevention, and gap detection.
3. Add a candidate-authorized scheduled discovery service with encrypted token storage, an account model, and a privacy policy.
4. Explore a browser-extension handoff that still requires a visible, candidate-confirmed final submission.

## License

This is a portfolio project. Do not reuse it to collect candidate data without implementing appropriate privacy, security, and consent controls.
