# ApplyGuard

> A supervised job-application copilot that turns a job description into an evidence-based approval packet.

## Why this exists

Job seekers increasingly need help tailoring applications, but an auto-apply agent can easily invent claims, disclose the wrong information, or submit the wrong application. ApplyGuard is a product prototype for the safer alternative: an agent that does the analysis and drafting, while the candidate approves every external action.

The demo uses a Search & Conversational Discovery Product Manager job description and illustrative candidate evidence from a consumer product-management background.

## Product flow

```text
Job description
  → requirement extraction
  → evidence ledger + fit assessment
  → approval packet (resume, answers, disclosure flags)
  → candidate approval
  → supervised browser handoff
  → submission receipt + audit log
```

## What the prototype demonstrates

- JD parsing into role signals: experimentation, discovery, AI/ML, consumer product and cross-functional delivery.
- Explainable fit scoring. A score is a prioritisation aid, not a hiring prediction.
- Evidence-grounded answer drafting, with explicit gaps rather than invented experience.
- A human approval state and audit trail.
- A hard product guardrail: the demo cannot log in, upload files, send messages, or submit applications.

## Run locally

No dependencies are required. Open `dist/index.html` in a browser.

## Production architecture (next iteration)

| Layer | Responsibility | Product guardrail |
| --- | --- | --- |
| Ingestion | Parse pasted JDs or user-approved job alerts | Treat JD text as untrusted input |
| Candidate ledger | Store approved resume facts, preferences and answer policies | Never infer facts or work history |
| LLM workflow | Extract requirements, draft grounded answers and identify gaps | Retrieve evidence before generation; require structured output |
| Evaluation | Measure claim grounding, job-match precision and approval rate | Human review set plus regression tests |
| Browser handoff | Prefill only after the candidate approves the packet | Separate confirmation immediately before submission |
| Audit store | Record source JD, evidence, edits, approvals and application receipt | Encrypt personal data; minimise retention |

## Metrics

- **Candidate value:** qualified applications approved per week; time from JD to reviewable packet; interview rate by fit band.
- **Quality:** unsupported-claim rate; human disagreement with fit rating; answer edit rate.
- **Safety:** submissions without final confirmation (target: zero); sensitive fields sent without explicit approval (target: zero).
- **Efficiency:** cost per approval packet; median time to first packet; browser handoff completion rate.

## Portfolio case-study framing

**Problem:** tailoring applications is repetitive and error-prone; fully autonomous applying trades time saved for trust and accuracy risk.

**Product decision:** prioritise supervised automation. The agent can analyse and draft, but the candidate owns sensitive data, factual claims and the final submission.

**Trade-off:** this is slower than indiscriminate auto-apply tools, but it is more defensible for high-stakes career decisions and creates an audit trail for evaluation.

## Roadmap

1. Replace keyword matching with a structured LLM extraction step and a candidate evidence retrieval layer.
2. Add an evaluation set of 50 real job descriptions labelled for fit, missing facts and risky claims.
3. Add a review queue with versioned answers and explicit approval prompts.
4. Add user-authorised browser handoff for career pages and LinkedIn Easy Apply, retaining a final submit confirmation.

## Privacy note

Do not commit real resumes, email addresses, phone numbers, compensation, cookies, credentials, or job-application receipts to this repository. The shipped demo uses illustrative content only.
