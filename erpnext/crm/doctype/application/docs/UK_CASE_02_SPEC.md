# UK Case 2 — Process Specification

**Router condition:** Qualification = **12th** AND Marital Status = **Not Married** (single applicant).

**Source:** UK Process flow case 1 & 2.docx (sections under heading "Case 1 & 2")  
**Pipeline:** Identical stage structure to Case 1.

> **Important:** The client document groups Case 1 and Case 2 under one detailed flow. **Every field and reminder rule below applies to both Case 1 and Case 2** unless noted in [UK_CASE_ROUTER.md](./UK_CASE_ROUTER.md).

---

## Difference from Case 1

| | Case 1 | Case 2 |
|---|--------|--------|
| Qualification | 12th | 12th |
| Marital status | Married | Not married |
| Spouse processing | **Not allowed** — single basis only | Standard single-applicant |
| Documented stages | Processing → Refunded | **Same** |

No separate spouse/funds blocks appear in the source for Case 2 vs Case 1 in Processing–Enrolment. Implementation should still **hide spouse-specific UI** for Case 1 via `country_flow_case`.

---

## Stage map (quick reference)

| Stage | Purpose | Reminder-heavy? |
|-------|---------|-----------------|
| Assessment | Classify case + eligibility | Refusal letters if prior refusal |
| Processing | Email, academics, English, gap, LOR, passport, agent, apply | Application submitted |
| Submitted | Offer letter pending requirements | Follow-up offer / complete requirements |
| Offer Letter | Fees, living costs, CAS payable, conditions, defer | Deposit deadline, defer loops |
| Financial | Conditions, interview, sponsors, funds, medical | Many (28-day funds, interview, tuition) |
| Acceptance | CAS letter pending | Pendency / CAS follow-up |
| CAS | CAS doc, lodge prep, IHS, biometrics path | Lodge file, affidavits, medical |
| Visa Lodged | Application + biometrics | Expected decision date |
| Visa | e-Visa, share code, copy | Activation / share code / verify |
| Enrolment | Proof + student ID | |
| Refused | Letter, other country, refund kickoff | Refund application |
| Refund Processing / Refunded | Tuition + IHS refunds | Expected refund dates |

Full field-level tables: [UK_CASE_01_SPEC.md](./UK_CASE_01_SPEC.md) (sections 1–12).

---

## Assessment fields (Case 2)

| Field | Required value for Case 2 |
|-------|-------------------------|
| Qualification | 12th |
| Marital Status | Not Married (any non-married option) |
| Study gap | If yes → proof workflow in Processing |
| Prior refusal | If yes → refusal letters |

**System:** `country_flow_case = UK Case 2` (auto, read-only).

---

## Processing — highlights for Case 2

### English test matrix

One dropdown drives which sub-form opens:

```
IELTS Waiver | IELTS | UKVI IELTS | PTE | UKVI PTE | Duolingo | TOEFL
```

Each non-waiver type needs: validity gate, scores, credentials, verified flag, upload.

### Study gap — decision tree

```
Study Gap Proof
├── Educational
│   ├── Reappear Exam
│   ├── Pursuing Higher Studies
│   ├── Diploma / Certificate
│   └── IELTS / PTE
├── Work
└── Other
```

Use **child table or repeating section** — not 40 flat columns.

### Application submission gate

```
Application Submitted = Yes  →  status = Submitted
Application Submitted = No   →  create reminder (when will submit)
```

---

## Offer Letter — UK-specific calculations

```
Living expense = Inner London (£13,347) OR Outer London (£10,224)
Funds Required (GBP) = Full year tuition + Living expense − Payable fee for CAS
```

**Conditions** (multi-select) feed Financial tab branches:

- Interview
- English Requirement
- Verification (Academics)
- Gap Justification
- Other

---

## Financial — interview state machine (Case 2)

High-level states (implement as status sub-field or checklist):

```text
[Condition: Interview selected]
    → Timing: Before Deposit | After Deposit | Other
        → CAS Shield or Manual (if before deposit)
        → Student Prepare? → Interview Scheduled? → Schedule Interview?
        → Tuition / Initial deposit paid?
        → Interview Status: Approved | Rejected
            → Rejected: 2nd chance? → close or retry loop
            → Approved: Pending CAS amount? → reminder
```

This is the **highest complexity area** — use a dedicated **Interview** child table or sub-doctype for UK.

---

## Financial — sponsors & funds (Case 2)

**Sponsors** (multi-select): Student, Father, Mother — each opens sponsor block.

**Funds per sponsor:**

| Type | Validation chain |
|------|------------------|
| Bank statement | Nationalized bank → balance cert same date → 28 days old |
| FD | Nationalized → balance cert → 28 days |
| Education loan | Purpose, holder name, amount coverage, collateral, letter |

---

## CAS & visa — UK-specific

| Concept | AU equivalent | UK field |
|---------|---------------|----------|
| COE | CAS | CAS upload, CAS number, sponsor license |
| OSHC | IHS | IHS upload + number |
| Immiaccount | UKVI | Embassy login link / id / password |
| TRN | — | (UK uses different tracking) |
| e-Visa + share code | — | UK-only post-grant steps |

**Aadhar name matching** (student, mother, father) → affidavit + reminder if mismatch.

---

## Reminder catalog (Case 2 — implement as Reminder templates)

| Trigger | Reminder text (from doc) |
|---------|--------------------------|
| App not submitted | When application will be submitted |
| No offer requirements | Follow up on Offer Letter |
| Pending requirements incomplete | Complete pending requirement |
| Defer offer | Apply / receive defer offer letter |
| Interview deadline | Interview date / prepare student |
| Tuition not paid | Pay tuition fee |
| 28-day funds | Wait for 28 days old statement |
| CAS not received | CAS letter follow-up |
| Visa not lodged | Lodge visa file |
| Biometric pending | Complete biometric |
| e-Visa / share code | Activate / receive / verify |
| Refund not applied | Apply for refund |
| IHS / tuition refund pending | Expected refund date |

Store as **Application Reminder Rule** master keyed by `country + stage + field`.

---

## Implementation notes for Case 2

1. **Reuse AU Processing sections** where identical (email, passport, agent) — add `depends_on: destination_country == 'United Kingdom'`.
2. **Do not duplicate** English test UI — one `English Test Detail` child table with `test_type` column (AU already has `english_test_details`).
3. **Case 2 is the “template”** for Cases 4 & 6 (unmarried grad/PG); Case 1/3/5 add `single_basis_only` flag.
4. Cases 3–6 specs: clone this doc and adjust Assessment router + academic doc section when client provides deltas.

---

## Next: Cases 3–6

When client shares flows for Graduation / Post-graduation:

| Case | Expected delta vs Case 2 |
|------|--------------------------|
| Case 3 | Graduation docs + married + single basis |
| Case 4 | Graduation docs + unmarried |
| Case 5 | PG docs + married + single basis |
| Case 6 | PG docs + unmarried |

**Stage tabs stay the same** — only Assessment + document verification sections change.
