# ApplyGuard

> A supervised PM job-search workspace built around the job boards you already trust.

ApplyGuard turns a resume into an editable evidence ledger, imports opted-in job-alert emails from LinkedIn, Naukri, IIMJobs, and Instahyre, ranks them transparently, and prepares a reviewed application packet. It assists the candidate; it does not impersonate them.

## What works now

The browser profile and decisions remain local. A small Vercel backend is used only when the candidate explicitly connects Google to import job-alert emails.

- Paste a resume or load a TXT, Markdown, PDF, or DOCX file; parsing occurs in the browser and the resulting text/profile stay in `localStorage` in the current browser.
- Analyze the text locally to suggest product skills, relevant industries, target roles, and achievement-shaped evidence candidates.
- Review, edit, and save an evidence ledger. Saved evidence is the only candidate material used in job-match explanations.
- Import Gmail messages carrying the `applyguard-jobs` label. The importer reads only those messages, extracts LinkedIn, Naukri, IIMJobs, and Instahyre role links, de-duplicates them, and keeps the original platform URL. It never reads mail outside that label.
- Optionally run an on-demand search against permitted public feeds: Remotive, Arbeitnow, Remote OK, Jobicy APAC, Himalayas India-eligible remote roles, Hopin's India feed, and Startup Jobs. These are supplementary, not the primary India PM search source.
- Optionally connect Jobvetta's India job index through a Vercel Function. Its free API key is read only on the server, never exposed to the browser.
- Filter recent jobs, deduplicate them, and rank PM roles with visible, adjustable deterministic weights.
- See supporting skill signals, evidence items, gaps, and an explicitly non-predictive recommendation for every role.
- Approve/reject a job locally. Approval creates an editable application packet with a missing-information checklist.
- Open the official job URL only after an approved packet is reviewed; the app never pre-fills or submits a third-party form.
- Export or permanently delete all local data.

## Workflow

```text
LinkedIn / Naukri / IIMJobs / Instahyre job alerts
  → Gmail label `applyguard-jobs`
  → candidate-authorized, read-only import
  → source-link extraction and de-duplication
  → hard eligibility gates
  → transparent role/evidence/gap assessment
  → candidate approves or rejects a role
  → reviewable application packet
  → official job page opens in a new tab

Resume text (browser local storage)
  → editable verified evidence ledger
  → supports only the assessment and packet steps above
```

## Intentional boundaries

This is a local-first MVP. That has material limits:

- It does not yet run unattended daily imports. A scheduled private-mail inbox requires encrypted refresh-token storage, an account model, and a privacy policy; this implementation deliberately avoids storing refresh tokens.
- It only uses public feeds that the browser can access; source availability and CORS policy can change.
- It does not scrape LinkedIn, Naukri, IIMJobs, Instahyre, Indeed, or other protected boards. Their source-native job alerts are the primary ingestion route.
- PDF and DOCX parsing downloads an open-source parser library at runtime. The file contents stay in the browser; if the parser cannot load, paste extracted text instead.
- `localStorage` is not encrypted and is scoped to this browser/device. Do not use a shared browser profile for sensitive application data.
- The app never stores passwords, Gmail refresh tokens, job-board credentials, uploads files to job boards, sends messages, or submits applications. Google access is `gmail.readonly`, is limited by the Gmail label query, and is kept only for the active browser session.

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

## Connect Gmail alert import in Vercel

This feature requires a Google Cloud OAuth client because Gmail does not expose a public inbox API without candidate authorization.

1. In [Google Cloud Console](https://console.cloud.google.com/), create a **Web application** OAuth client and enable the Gmail API.
2. Add `https://applyguard.vercel.app` (or your actual production domain) as an authorized JavaScript origin.
3. Add `https://applyguard.vercel.app/api/google/callback` as an authorized redirect URI. Google requires an exact HTTPS redirect-URI match.
4. In Vercel **Settings → Environment Variables**, add production values for `APP_ORIGIN`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`.
5. Redeploy, create a Gmail label named `applyguard-jobs`, and use Gmail filters to apply it to the four platforms’ job-alert emails.

The consent screen should request **View your email messages and settings** only. ApplyGuard does not retain the refresh token returned by Google, so reconnection is required after the short-lived session expires.

## Run locally

No package installation is required. Open `dist/index.html` in a modern browser. For live source requests, serve the `dist` folder with any static server if your browser restricts network requests from `file://` pages.

### Enable Jobvetta India coverage in Vercel

1. Create a free API key at [Jobvetta](https://www.jobvetta.com/).
2. In the Vercel project, open **Settings → Environment Variables** and add `JOBVETTA_API_KEY` for **Production**.
3. Redeploy. The `/api/jobvetta` Vercel Function will then search Product Manager roles in the saved location (for example, Bengaluru) without exposing the key to visitors.

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
