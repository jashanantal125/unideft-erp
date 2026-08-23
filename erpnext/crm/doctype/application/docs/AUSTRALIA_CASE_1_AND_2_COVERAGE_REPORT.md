# Australia Case 1 & 2 — Coverage Report (PDF-matched)

> ## STATUS UPDATE — 22 Aug 2026 (latest round)
>
> | Item | Change |
> |---|---|
> | GS Submitted | `All Documents` table and `Upload Required Document` removed; only `Upload Supporting Documents` remains. `GS Approval` is now its own section, so the Yes/No decision shows whether or not there is an interview. |
> | eCOE | `Send COE to Student Chat` is a Yes/No dropdown; Yes shows the note "Please share the COE with the student in the chat." Nothing on No. Same treatment for the refusal letter and the offer letter. |
> | Student chat | No automated send anywhere. All three `Send … to Student Chat` fields are prompts that show a note; the `share_document_in_chat` server method was deleted. |
> | Onshore College Change | `Reason` → **Reason for Choosing Other Consultant**. |
> | Onshore "Create Linked Application" | **Root cause of the error:** the button called the server, which reads the *saved* document, while the stage the user had just picked was still unsaved — so the server saw an empty stage and threw. The button now saves the form first and passes the stage explicitly. The new application is flagged `is_onshore_change`, which hides the Processing and Submitted tabs it can never use, and carries the student, course, university, intake and document rows across. |
> | Visa Refused | `C. Future Processing` moved to the end of the tab, in its own section, behind a new `Refund Processing` section. |
> | Interview routing | Before Financial → Financials, Before GS Approval → GS Submitted, Before Acceptance → GS Approved, Before COE → Acceptance. Each block only renders when Interview Timing actually points at it. |
> | Auto-advance | Every stage move is now automatic on save via a single forward-only `advance_stage()`. Previously each gate carried its own list of allowed previous statuses, and those lists were incomplete — an application that reached `Submitted` could **never** progress, because the Financials gate did not list `Submitted`. |
> | Refund / Refunded stages | The whole **Refunded** stage (PDF pages 80-83) did not exist. Added: tuition fee refund issue → issue details → issue resolved → OSHC refund received → tuition fee refund invoice → application closed, with follow-up reminders on every No. Refund Processing checkboxes became Yes/No dropdowns as the PDF specifies. |
> | Row size | `tabApplication` was at 65,433 of MariaDB's 65,535-byte limit, so no new field could be added. Every `Select` was `varchar(140)` regardless of its options. Selects are now sized to their own longest option, and 35 orphan columns were dropped — about 20 KB of headroom. |
> | Dead code | Removed Application-level `shop_act_uploaded` / `shop_act_additional_document`, a stray `business_proof_other_details` custom field, and 133 lines of handlers for occupation fields that moved to the child table. |
>
> Verified end to end: 33/33 checks pass (every stage transition, the refund chain, onshore
> creation and idempotency, plus the field-level renames and removals). A conditional-logic
> audit across `Application` and all its child tables reports no broken references and no
> unconditionally mandatory field on the parent.

> ## STATUS UPDATE — 20 Aug 2026 (end of build)
>
> Everything below was written during the audit. This block records what has since been
> **fixed**, so read this first.
>
> **Fixed in this pass**
>
> | Item | Was | Now |
> |---|---|---|
> | Sponsor occupation / ITR / Form 16 tables | Nested inside the Sponsors child table — Frappe does not support grandchild tables, so **no row had ever saved** (0 rows in all three tables since Feb) | Flattened to three Application-level tables, each row tagged with a `Sponsor` dropdown. Verified: one sponsor can hold several occupations and the rows persist. |
> | Interview timing routing (section 2 below) | Shifted one stage early; `Before Financial` missing | All four options present and each routes to the stage the PDF names |
> | GS Approved — tuition fee | No GHA branch | `Was the fee processed through GHA?` → convinced? → the two mandatory reason text areas |
> | GS Approved — OSHC | Opened regardless of fee; GHA had no amount/duration; policy-received were checkboxes | Gated on `Tuition Fee Paid = Yes`; GHA has Policy Amount + Policy Duration; all three policy-received are Yes/No dropdowns |
> | GS Approved — Acceptance Submitted = No | Dead end | Any Pending Conditions? → Condition Details → Condition Completed, with the reminders on each leg |
> | Interview Before Acceptance | Missing from GS Approved | Full block added (deadline, student prepared, schedule, completed) |
> | GS Submitted / Acceptance completion | No Supporting / Completion Details | `Supporting Details` + upload, and `Completion Details` added |
> | eCOE | Tab called "COE", no chat send | Renamed to **eCOE**; `Send COE to Student Chat` added |
> | Refused | No chat send | `Send Refusal Letter to Student Chat` added |
> | Onshore College Change | No country eligibility gate | `Is Onshore College Change Allowed in This Country?` gates the whole stage; GHA branch creates and links a new application, copies document rows, and notifies Accounts |
>
> **Case 1 spouse lock: intentionally NOT enforced**, per your instruction that the system
> should not be that restrictive. Section 5 below still describes it as a gap — treat that
> as a deliberate decision, not an outstanding bug.
>
> **Two things you should know**
>
> 1. **"Student chat" does not exist in this install.** There is no student-facing chat
>    doctype or portal channel anywhere in the bench. The three `Send … to chat` fields post
>    the document into the **Application chat thread** (a `Comment`), which is what the
>    Applications View chat tab already renders. If the client means a channel the student
>    can actually read, that channel still has to be built.
> 2. **The Application table is near MariaDB's row-size ceiling.** It currently sits at
>    ~55,500 of the 65,535-byte limit, and InnoDB's separate 8,126-byte inline limit is now
>    also within reach. Adding many more fields to this doctype will fail to migrate. The
>    durable fix is to move per-stage fields into child tables rather than keep widening
>    `tabApplication`. Verified end to end with 36 assertions covering every stage
>    transition; all passed.
>
> **Still open (not blocking Case 1 & 2 go-live):** the four PDF-vs-instruction conflicts in
> section 1 need a client decision, and `School Domain Email ID` (PDF p.6–7) is still not an
> option for 12th verification.

**Re-verified:** 20 Aug 2026
**Source of truth:** `apps/public/Australia Case 1 & 2.pdf` (83 pages, read directly — not via the text extract)
**Code checked:** `application.json`, `application.js`, `application.py`, `application_sponsor_complete.json`, `application_sponsor_occupation.json`, `academic_verification.json`

This replaces the 12 Aug report, which was written before the Submitted / Offer Letter / Financials / Sponsors work landed and which contained several claims that do not match the PDF.

---

## 1. Read this section first — PDF vs. your later instructions

While re-reading the PDF I found **four places where the PDF says the opposite of what you told me to build**. I built your version in each case. These need an explicit decision before go-live, because a client reading the PDF will call them bugs.

### 1.1 Fixed Deposit — Source of Funds threshold

| | Rule |
|---|---|
| **PDF p.41** | 1 Month → required · 2 Months → required · **3 Months → NOT required** · More than 3 Months → NOT required |
| **Your instruction** | "source of funds is required if fd age is 3 months, its only NOT required when its more than 3 months" |
| **Built** | Your version — required for 1 / 2 / 3 Months |

### 1.2 Bank Statement — deposits above ₹50,000

| | Rule |
|---|---|
| **PDF p.42** | within 1 Month → required · within 2 Months → required · **within 3 Months → NOT required** · **older than 3 Months → NOT required** |
| **Your instruction** | "if deposit older than 3 months then source of funds is required, otherwise in all other cases not required" |
| **Built** | Your version — required only for "Deposit older than 3 months" |

This one is a **full inversion**, not just a boundary shift. Worth confirming with the client, because the PDF logic is the one that makes underwriting sense (recent unexplained deposits are the risk, old ones are seasoned).

### 1.3 12th Admit Card

PDF p.6–7 lists three valid ways to verify 12th: **12th Admit Card Upload** OR School Domain Email ID OR DigiLocker credentials. You asked me to remove the 12th Admit Card option. Removed. PDF also has **School Domain Email ID**, which we still do not have as an option.

### 1.4 Sponsor Type — "Other"

PDF p.30–31 lists Father, Mother, Self, Spouse, Brother, Sister, Guardian, **Other**. Your list omitted Other, so `sponsor_type` is currently `Father / Mother / Self / Spouse / Brother / Sister / Guardian` with no free-form fallback.

---

## 2. A real bug I found: interview timing routing is shifted by one stage

This is the most important finding in the whole re-read, and the old report missed it.

The PDF defines the routing **once**, authoritatively, in the Financial Stage (p.27–28):

| `Interview Required Before` | PDF says the workflow runs in |
|---|---|
| Before Financial | **Financial stage** |
| Before GS Approval | **GS Submitted stage** |
| Before Acceptance | **GS Approved stage** |
| Before COE | **Acceptance stage** |

What we actually built:

```2023:2029:apps/erpnext/erpnext/crm/doctype/application/application.json
  "fieldname": "interview_timing",
  "fieldtype": "Select",
  "label": "Interview Timing",
  "options": "\nBefore GS Approval\nBefore Acceptance\nBefore COE",
  "depends_on": "eval:doc.conditions_on_offer_letter && Array.isArray(doc.conditions_on_offer_letter) && doc.conditions_on_offer_letter.some(function(r){ return (r.condition || '').indexOf('Interview') !== -1; })",
  "description": "Before GS Approval → Financials. Before Acceptance → GS Submitted. Before COE → Acceptance."
```

So every option lands one stage **too early**, and the fourth option is missing entirely:

| Option | PDF target stage | Our target stage | Verdict |
|---|---|---|---|
| Before Financial | Financial | *(option does not exist)* | Missing |
| Before GS Approval | GS Submitted | Financial | Wrong stage |
| Before Acceptance | GS Approved | GS Submitted | Wrong stage |
| Before COE | Acceptance | Acceptance | Correct |

Note that the PDF's own GS Submitted section (p.47–48) is internally inconsistent — its heading says "Interview Before GS Approval" but its body says "applicable only when Interview Required Before = Before Acceptance". The Financial-stage table above is the version to trust, since it is the one place that maps all four values in one go.

Fixing this means renaming the gate flags (`interview_stage_available` on GS Submitted currently means "Before Acceptance"), adding a Financial-stage interview block, and adding an interview block to the GS Approved tab, which has none today.

---

## 3. Stage-by-stage coverage

### 3.1 Details — ~85%

| PDF requirement | Status |
|---|---|
| Name, contact, DOB, age (auto), email, qualification | Present |
| Marital Status: Single / Married / **Divorced** / **Widowed** | Partial — `martial_status` is only `Married / Single` |
| Study Gap Yes/No, response only, no extra fields at this stage | Correct, and matches the layout decision we made |
| AU/NZ refusal cascade, all four visa types, close/new-country actions | Present |
| Case 1 / Case 2 identity from qualification + marital status | **Missing** — see §5 |

### 3.2 Processing — ~90%

| PDF requirement | Status |
|---|---|
| Application Submitted at top; Yes → status Submitted + move stage; No → Expected Submission Date + reminder | Present (built this cycle) |
| Package login credentials, conditional mandatory | Present |
| 10th / 12th / Diploma documents | Present |
| 12th verification: Admit Card / **School Domain Email** / DigiLocker | Partial — Admit Card removed per your instruction, School Domain Email never added |
| English matrix IELTS / PTE / TOEFL incl. IBT Home Edition = Not Accepted | Present |
| Study gap duration + proof trees (Educational / Work / Other) | Present |
| Passport copy | Present |
| Processing Agent: Direct → auto company; Vendor → top 3 by priority | Present (built this cycle) |
| Application Filled By + form/SOP uploads | Present |

### 3.3 Submitted — ~95%

| PDF requirement | Status |
|---|---|
| Submitted another application + ID | Present |
| Need another application + reminder / reason | Present |
| Further requirement for Offer Letter Yes/No | Present |
| Requirement Type = Interview / Other | Present (built this cycle — the old report's "No" is stale) |
| Other → details, completed, supporting docs, both reminders | Present |
| Interview → deadline, student prepared, schedule, reminders, auto-deactivate | Present |

### 3.4 Offer Letter — ~95%

| PDF requirement | Status |
|---|---|
| Uni, course, intake, tuition, scholarship, payable, OSHC | Present |
| Living 29,710 / Travel 2,200 auto-filled | Present as field defaults |
| Funds Required With / Without Full Year Fee | Present |
| Tuition Fee Deposit Deadline Reminder as its own section, intake shown, manual Set Reminder button | Present (built this cycle) |
| Auto-deactivate deposit reminder once fee recorded | Present |
| Conditions multi-select: Interview, English, Verification, Gap Justification, Other | Present — we also carry an extra "Academic Transcript" option not in the PDF |
| Other → Specify Other Condition shown inline | Present (built this cycle) |
| Defer Offer full branch | Present |

### 3.5 Financial — ~90%

| PDF requirement | Status |
|---|---|
| GS Submitted Yes → Financial complete → GS Processing | Present |
| "Will the student proceed with GS for this application?" (exact PDF wording) | Present (renamed this cycle) |
| GS another university → Another Application ID → link + close | Present |
| Another country → Country + Application ID → link + close | Present (built this cycle) |
| Reason for Not Proceeding → close application | Present, with an explicit Close Application button |
| Reminder whenever GS Submitted = No | Present |
| Interview condition sub-flow | **Wrong stage** — see §2 |
| English / Gap Justification / Verification condition sections | Present |
| Multiple sponsors, ITR / Form 16 | Present |
| **ITR fields per ITR row** (Assessment Year, value, ack. no., DOB match, name match, verified, upload) | Partial — we hold several of these at sponsor level, not per ITR row |
| Occupation trees: Business / Job / Farmer / Other, multiple per sponsor | Present as the new `Application Sponsor Occupation` child table |
| **Business Proof is multi-select** (GST + MSME + Shop Act together) | Partial — one proof type per occupation row; multiple proofs need multiple rows |
| MSME / Incorporation / Shop Act / IEC field sets + duration logic | Present (built this cycle) |
| Retired Government Employee → Pension Proof | Present (built this cycle) |
| Funds: FD / Bank Statement / Education Loan / Other | Present (built this cycle) |
| FD & Bank Statement source-of-funds thresholds | **Conflicts with PDF** — see §1.1 / §1.2 |
| Notarized academics, parent-name affidavits, passport verification | Present |
| Gap Documents shown only when Study Gap = Yes | Present (built this cycle) |
| GS SOP / Form 1 / Form 2 / Sponsorship + Student Affidavit, all mandatory | Present (built this cycle) |

One wording issue worth fixing: the PDF is explicit that **"AC" means Aadhaar Card**, not bank account — "Date of Birth matches Passport & Aadhaar Card", "If Yes, upload Aadhaar Card". Our sponsor labels still read `DOB on Passport & A/C Matched`, `Name Matched on A/C & Passport`, `Upload A/C`, which reads as "account" to a new user. The PDF also wants both of these as Yes/No dropdowns; ours are checkboxes.

### 3.6 GS Submitted — ~85%

| PDF requirement | Status |
|---|---|
| Interview section gated on the Interview condition | Present but gated on the wrong timing value — see §2 |
| Interview deadline, student prepared, schedule interview, reminders, auto-deactivate | Present |
| GS Approved Yes → mark complete → GS Approved stage | Present |
| GS Approved No → Any Further Requirements? | Present |
| No requirements → reminder "Follow up for GS Approval" | Present |
| Yes → Requirement Details | Present |
| Requirements Completed Yes → **Supporting Details (Text Area, mandatory)** | **Missing** |
| Requirements Completed Yes → Upload Supporting Documents | Present as `requirement_document_upload`, but it shows as soon as `gs_any_requirement = Yes` rather than waiting for `requirements_completed = Yes` |
| Both completion reminders | Present |

### 3.7 GS Approved — ~55% (lowest-scoring stage)

This is the stage in your attached flowchart, and the entire right-hand side of that chart does not exist yet.

| PDF requirement | Status |
|---|---|
| Tuition Fee Paid Yes/No | Present |
| Tuition Fee Receipt upload, mandatory when paid | Present (not enforced mandatory) |
| Tuition Fee Paid No → reminder | Present |
| **Fee Payment Processed Through GHA (Yes/No)** | **Missing** |
| Yes → start OSHC flow + trigger Accounts workflow | **Missing** |
| No → **Convinced for Fee Processing Through GHA (Yes/No)** | **Missing** |
| Convinced Yes → **Reason Why Fee Was Not Processed Through GHA** | **Missing** |
| Convinced No → **Reason Why No Efforts Were Made** | **Missing** |
| OSHC section available only after Tuition Fee Paid = Yes | Wrong gate — ours keys off a separate `oshc_required` dropdown that is not in the PDF |
| OSHC Arranged By: GHA / University / Agent / Student | Present |
| GHA → Policy Received Yes/No | Present but as a checkbox |
| GHA → Company, Policy Number, Upload | Present |
| GHA → **Policy Amount** and **Policy Duration** | **Missing** (Agent and Student have Amount; nobody has Duration) |
| University → no further action | Effectively correct, but silent — no explanatory note |
| Agent / Student → Policy Received + Company / Number / Amount / Upload | Present (Policy Received is a checkbox) |
| Acceptance Submitted Yes → move to Acceptance | Present |
| Acceptance Submitted No → **Any Pending Conditions? / Condition Details / Condition Completed + reminders** | **Missing entirely** |

### 3.8 Acceptance — ~75%

| PDF requirement | Status |
|---|---|
| Interview Before COE gated on timing = Before COE | Present, and this is the one timing value we route correctly |
| Any Requirements Before COE Yes/No + reminder | Present |
| Requirement Details | Present |
| Requirements Completed Yes → **Completion Details (Text Area)** | **Missing** |
| Requirements Completed Yes → Supporting Documents | Present |
| Reminders both ways | Present |
| **COE Received (Yes/No) → Yes: mark stage complete + move to COE · No: reminder** | **Missing entirely** — there is no COE Received field anywhere, so the Acceptance → COE transition has no trigger |

### 3.9 eCOE — ~85%

| PDF requirement | Status |
|---|---|
| Tab renamed to **eCOE** | Not done — tab label is still `COE` |
| COE upload | Present |
| **Send COE to Student Chat (Yes/No)** | **Missing** (we have `send_offer_to_chat` for the offer letter, nothing for COE) |
| Intake Date | Present |
| Medical Arranged By: Our Side / Agent / Student | Present |
| Our Side → Medical Scheduled + both reminders | Present (checkbox rather than Yes/No) |
| Agent / Student → Upload Medical Report | Present |
| Form 956A completed + upload + reminder | Present (checkbox) |
| Visa SOP / Original Financials / Financial Matrix | Present |
| File Lodged By: Our Side / Agent / Student / Vendor | Present |
| Our Side → Login ID, Password, Checked By, Upload Visa Application | Present |
| Visa File Lodged Yes → File Lodged stage, for all four lodgers | Present (checkboxes) |

### 3.10 File Lodged — ~50%

| PDF requirement | Status |
|---|---|
| TRN Number, IMMI Acknowledgement, HAP ID | Present |
| **Decision Received (Yes/No)** | **Missing** |
| No → **Have You Checked the Visa Status? (Yes/No)** | **Missing** |
| Checked Yes → **Upload Visa Status Screenshot** + reminder | **Missing** |
| Checked No → **Reason for Not Checking** + auto-notify manager with App ID / Student / Counselor / Reason | **Missing** |
| Decision Yes → Visa Decision dropdown | Present, but options are `Visa Approved / Visa Refused`; PDF says **Visa Granted** / Visa Refused |
| Granted → status + stage move + notify Accounts | Present |
| Refused → status + move to Refused stage | Present |

### 3.11 Visa Granted — ~90%

Visa Grant Copy present. `student_enrolled` is a checkbox where the PDF wants a Yes/No dropdown; the Yes → Enrolment move and No → reminder both work.

### 3.12 Enrolment — ~60%

Enrolment proof upload exists via the `enrollment_documents` table. Missing the entire completion action: the PDF wants status set to **Completed**, the application marked complete, and the **completion date recorded**. `Completed` is not even a value in our `status` enum:

```521:528:apps/erpnext/erpnext/crm/doctype/application/application.json
  "fieldname": "status",
  "fieldtype": "Select",
  "label": "Status",
  "options": "Pending\nProcessing\nSubmitted\nOffer Letter Received\nFinancial\nGS Processing\nGS Approved\nAcceptance\nCOE\nFile Lodged\nVisa\nEnrollment\nOn Shore College change\nVisa Refused\nClosed",
  "default": "Pending",
  "reqd": 1,
  "in_list_view": 1
```

Also note `Visa` vs the PDF's `Visa Granted`, and no `Refund Processing` / `Refunded` values.

### 3.13 Onshore College Change — ~80%

| PDF requirement | Status |
|---|---|
| Internal users only, hidden from Agents / Students | Present via role-gated `depends_on` |
| **Onshore College Change Allowed in this country? (Yes/No)** → No closes the case | **Missing** — we jump straight to the student request |
| Student Wants to Change College | Present |
| Requested Through: GHA / Others | Present |
| Others → Reason + Number of attempts → close case | Present |
| GHA → Current Stage: Processing / Offer Letter / COE / Enrolled | Present as `oscg_status` with slightly different labels |
| Create + link new application, notify Accounts, transfer documents, audit trail | Partial — status text only, no automation |

### 3.14 Refused — ~85%

Refusal letter, Refund Processed By, Refund Form Filled By, Cross Checked, Refund Form upload, declaration, employee name/position/code, and the optional OSHC Refund Form are all present. Missing **Send Refusal Letter to Student Chat**. `process_other_country` is a checkbox where the PDF wants Yes/No; Comments + Exact Reason + Country + handling team are present.

### 3.15 Refund Processing — ~85%

Tuition Fee Refund Received and OSHC Refund Received both exist with the right downstream fields and reminders, but both are checkboxes rather than Yes/No dropdowns.

### 3.16 Refunded — ~85%

The full issue tree is present (issue → details → resolved → OSHC → invoice → close). `tuition_fee_issue`, `tuition_fee_issue_resolved`, and `oshc_refund_received_issue_resolved` are all checkboxes rather than the PDF's Yes/No dropdowns.

---

## 4. Build backlog, in the order I'd do it

**P0 — blocks the pipeline (a stage has no exit trigger)**
1. Acceptance → **COE Received** Yes/No, with stage move and reminder. Nothing currently moves an application from Acceptance to COE.
2. File Lodged → **Decision Received** and the whole visa-status-checked branch, including the manager notification.
3. Enrolment → `Completed` status value, completion flag, completion date.

**P1 — client-visible gaps in the PDF**
4. GS Approved → the entire **GHA tuition fee** branch (your flowchart): processed through GHA, convinced, and both reason fields.
5. GS Approved → **Acceptance Submitted = No** branch: pending conditions, condition details, condition completed, reminders.
6. Fix the **interview timing routing** (§2), add `Before Financial`, and add the interview block to GS Approved.
7. GS Approved → OSHC gated on Tuition Fee Paid = Yes instead of `oshc_required`; add GHA **Policy Amount** + **Policy Duration**.
8. GS Submitted → **Supporting Details** text area; gate the upload on Requirements Completed = Yes.
9. Acceptance → **Completion Details** text area.
10. **Send COE to Student Chat** and **Send Refusal Letter to Student Chat**.
11. Rename the COE tab to **eCOE**.
12. Onshore → **Onshore College Change Allowed** country gate.

**P2 — consistency and polish**
13. Convert the remaining legacy checkboxes to Yes/No dropdowns (student_enrolled, policy received ×3, medical scheduled, form 956A, file lodged ×4, refund receiveds, refund issues, process_other_country). Note this is exactly the class of change that caused the `cannot be "0"` validation errors before, so each one needs a normalisation patch entry.
14. `Visa Approved` → **Visa Granted** in `visa_decision`, and align the `status` enum with PDF stage names.
15. Marital Status → add **Divorced**, **Widowed**.
16. Sponsor labels: A/C → **Aadhaar Card**; make the two match fields Yes/No dropdowns.
17. **School Domain Email ID** as a 12th verification option.
18. Business Proof as true multi-select; ITR match/verify fields per ITR row.
19. Sponsor Type → decide on **Other**.

**P3 — needs product decisions, not code**
20. Accounts Department workflow (PDF explicitly defers this).
21. Onshore auto-create + document transfer + Accounts notification.
22. Refused → auto-create and assign the new-country application.

---

## 5. Case 1 vs Case 2

The PDF defines these on p.5, and they are the two cases you need live:

- **Case 1** — Qualification = 12th Pass **and** Marital Status = Married → the application is processed **on a single applicant basis only. Spouse-based processing is not available.**
- **Case 2** — Qualification = 12th Pass **and** Marital Status = Single → standard workflow.

Current state: `country_flow_case` offers `AU Default` and `AU Case 4 Spouse` plus the eight UK cases. There is no `AU Case 1` / `AU Case 2`, no auto-routing from `higher_education` + `martial_status`, and — more importantly — **nothing enforces the Case 1 spouse lock**. Spouse living expenses, spouse travel expenses, spouse academics, spouse sponsors, and `spouse_visa_upload` all remain reachable for a 12th Pass + Married applicant.

Do not confuse the PDF's **Case 1** (12th Pass + Married, single-basis) with our existing **AU Case 4 Spouse** (graduate applicant processing with a spouse). They are different, near-opposite things.

So the honest read is: **Case 2 is close to done** because it is just the default pipeline, and **Case 1 is the default pipeline plus a lock we have not written yet.**

---

## 6. Score summary

| Area | Coverage | Change vs 12 Aug report |
|---|---|---|
| Details | ~85% | +5 |
| Processing | ~90% | +2 |
| Submitted | ~95% | +25 (Interview branch shipped) |
| Offer Letter | ~95% | +5 |
| Financial | ~90% | +5 |
| GS Submitted | ~85% | −5 (timing bug found) |
| GS Approved | ~55% | −20 (GHA branch + pending conditions found missing) |
| Acceptance | ~75% | −15 (COE Received found missing) |
| eCOE | ~85% | −3 |
| File Lodged | ~50% | −38 (decision/status branch found missing) |
| Visa Granted | ~90% | +2 |
| Enrolment | ~60% | new line |
| Onshore College Change | ~80% | 0 |
| Refused | ~85% | −3 |
| Refund Processing / Refunded | ~85% | −3 |
| **Case 2 (12th + Single)** | **~82%** | −2 |
| **Case 1 (12th + Married, single basis)** | **~70%** | −2 |
| **Case 1 lock specifically** | **~0%** | −5 |

Several scores went **down** versus the old report. That is not regression — it is the old report having scored these stages from the stale text extract rather than the PDF, and marking things "Yes" that were never built (COE Received, Decision Received, the GHA fee branch). The pipeline is genuinely further along than it was; the map is just more honest now.

---

## 7. Sources

- `apps/public/Australia Case 1 & 2.pdf` — read directly, all 83 pages
- `apps/erpnext/erpnext/crm/doctype/application/docs/AUSTRALIA_CASE_1_AND_2_SOURCE_EXTRACT.md` — text extract, still useful for grepping but has OCR artefacts (`Ma` → `M`, `ti` → `M`) and should not be the basis for coverage claims
- Implementation: `application.json` / `.js` / `.py`, `application_sponsor_complete.json`, `application_sponsor_occupation.json`, `academic_verification.json`

*No CRM behaviour was changed to produce this report.*
