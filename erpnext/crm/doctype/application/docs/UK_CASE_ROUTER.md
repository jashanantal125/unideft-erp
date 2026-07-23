# UK Application — Case Router (Cases 1-8 Planning View)

The UK flow does **not** use separate full pipelines per case. It uses **one UK pipeline** with a **case router** at assessment time. Cases mainly control:

- Whether processing is **single applicant only** (married cases 1, 3, 5)
- Which **assessment inputs** were used to classify the file
- Future spouse/dependant fields (Cases 3–6 doc not yet provided — expect deltas in Financial / CAS / funds)

## Router matrix

| Case | Qualification | Marital status | Processing basis | Notes |
|------|---------------|----------------|------------------|-------|
| **UK Case 1** | 12th | Married | **Single only** — not on spouse basis | Same stage tabs as Case 2; no spouse track |
| **UK Case 2** | 12th | Not married | Standard single applicant | Documented in detail in source |
| **UK Case 3** | Graduation | Married | **Single only** — not on spouse basis | Stage shell same; TBD spouse/funds deltas |
| **UK Case 4** | Graduation | Not married | Standard single applicant | TBD — likely mirrors Case 2 with grad docs |
| **UK Case 5** | Post-graduation | Married | **Single only** — not on spouse basis | TBD |
| **UK Case 6** | Post-graduation | Not married | Standard single applicant | Detailed in Case 5 & 6 source |
| **UK Case 7** | TBD | TBD | TBD | Awaiting correct source |
| **UK Case 8** | TBD | TBD | TBD | Awaiting correct source |

## Auto-detection (recommended)

Do **not** ask users to pick case manually if assessment fields are already captured (for known cases):

```text
IF qualification == "12th" AND marital_status == "Married"      → UK Case 1
IF qualification == "12th" AND marital_status != "Married"    → UK Case 2
IF qualification == "Graduation" AND marital_status == "Married" → UK Case 3
IF qualification == "Graduation" AND marital_status != "Married" → UK Case 4
IF qualification == "Post-graduation" AND marital_status == "Married" → UK Case 5
IF qualification == "Post-graduation" AND marital_status != "Married" → UK Case 6
```

Store as read-only field: `country_flow_case` after save.

## Case-specific behaviour (known)

| Area | Case 1 | Case 2 | Cases 3–6 (planned) |
|------|--------|--------|---------------------|
| Assessment | 12th + married | 12th + single | Grad / PG variants |
| Spouse processing | **Blocked** — single basis | N/A | Married: single basis; Unmarried: standard |
| Processing → Refunded stages | **Same UK pipeline** (per source doc) | Same | Same shell; field deltas TBD |
| Academic docs | 10th–12th / diploma track | Same | Likely graduation verification added |

## UK status pipeline (high level)

```text
Assessment → Processing → Submitted → Offer Letter → Financial
  → Acceptance → CAS → Visa Lodged → Visa → Enrolment
Terminal: Refused → Refund Processing → Refunded → Closed
```

## Source caveat

- `UK process flow case 7 & 8.pdf` currently appears to contain "Case 5 & 6" body text in extraction.
- Case 7/8 specs are placeholders until corrected source is shared.

## Related docs

- [UK_CASE_01_SPEC.md](./UK_CASE_01_SPEC.md) — Case 1 field & logic detail
- [UK_CASE_02_SPEC.md](./UK_CASE_02_SPEC.md) — Case 2 field & logic detail
- [UK_PLATFORM_UI_UX_PLAN.md](./UK_PLATFORM_UI_UX_PLAN.md) — UI for UK + 10–20 countries
- [UK_CASE_03_SPEC.md](./UK_CASE_03_SPEC.md)
- [UK_CASE_04_SPEC.md](./UK_CASE_04_SPEC.md)
- [UK_CASE_05_SPEC.md](./UK_CASE_05_SPEC.md)
- [UK_CASE_06_SPEC.md](./UK_CASE_06_SPEC.md)
- [UK_CASE_07_SPEC.md](./UK_CASE_07_SPEC.md)
- [UK_CASE_08_SPEC.md](./UK_CASE_08_SPEC.md)
- [UK_CASE_3_8_DELTA_SUMMARY.md](./UK_CASE_3_8_DELTA_SUMMARY.md)
