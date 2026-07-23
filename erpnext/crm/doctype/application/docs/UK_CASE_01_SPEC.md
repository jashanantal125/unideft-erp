# UK Case 1 — Process Specification

**Router condition:** Qualification = **12th** AND Marital Status = **Married**  
**Key rule:** Process on **single basis only** — **not on spouse basis** (even though student is married).

**Source:** UK Process flow case 1 & 2.docx  
**Pipeline:** Shares the same UK stage tabs as Case 2 (Processing → … → Enrolment / Refused / Refund).

---

## 1. Assessment

| # | Field | Type | Logic |
|---|-------|------|-------|
| 1 | Student Name | Data | From Student link |
| 2 | Student Contact No. | Data | |
| 3 | Marital Status | Select | Must be **Married** for Case 1 |
| 4 | D.O.B | Date | |
| 5 | Age (as of now) | Int | Auto from DOB |
| 6 | Student email id | Data | |
| 7 | Qualification | Select | Must be **12th** for Case 1 |
| 8 | Study gap | Select | If yes → study gap proof required; if no → ok |
| 9 | Refused from UK or other country? | Select | If yes → refusal letters required |

**System:** Set `country_flow_case = UK Case 1` (read-only).

---

## 2. Processing

### 2A — Email / login (package cases: mandatory)

| Field | Type | Notes |
|-------|------|-------|
| Our Email Id | Data | |
| Password | Password | |
| Recovery Email Id | Data | |
| Login Contact No | Data | |

### 2B — Documents (10th to 12th / diploma)

| Field | Type | Logic |
|-------|------|-------|
| 12th admit card uploaded | Attach | OR path below |
| School domain email id | Data | Alternative verification |
| Digi locker ID | Data | |
| Digi locker Password | Password | |
| Document verified | Select: Yes / No | Yes → upload one PDF; No → Still Processing / Not Accepted + reason |

### 2C — English proficiency test

**Type** (Select): IELTS Waiver | IELTS | UKVI IELTS | PTE | UKVI PTE | Duolingo | TOEFL

| Test type | Fields |
|-----------|--------|
| **IELTS Waiver** | Marks in English subject (12th) |
| **IELTS / UKVI IELTS / PTE / UKVI PTE** | Exam date, Validity Y/N, month count if valid, L/R/W/S, Overall, Login User/Password, Verified Y/N → upload or not accepted |
| **Duolingo** | Exam date, validity, individual subscores (S/W/R/L), integrated scores (Literacy, Conversation, Comprehension, Production), overall, login verification link, verified |
| **TOEFL** | IBT Center / IBT Home edition; Center: same as IELTS pattern; Home: **Conditional Accepted** |

### 2D — Study gap proof

| Level 1 | Level 2 | Fields |
|---------|---------|--------|
| Educational | Reappear Exam | Subject, Month/Year, Reappear admit card, DMC |
| Educational | Pursuing Higher Studies | University, Course, Admit card, Fee receipt, DMC, Proof of enrolment |
| Educational | Diploma / Certificate | Institute, Course, Duration, documents |
| Educational | IELTS / PTE | Date of issue, Score card |
| Work | — | Company, Position, Duration, Employer email |
| Other | — | Details (textarea), supporting documents |

### 2E — Academic LOR

| Field | Type |
|-------|------|
| LOR1 — Issuing Authority Name | Data |
| LOR1 — Position | Data |
| LOR1 — uploaded | Attach |
| LOR2 — Issuing Authority Name | Data |
| LOR2 — Position | Data |
| LOR2 — uploaded | Attach |

### 2F — Passport

| Field | Type |
|-------|------|
| Passport | Attach |

### 2G — Processing agent

| Field | Type | Logic |
|-------|------|-------|
| Processing agent | Select: Direct / Vendor | Direct → auto company name; Vendor → priority vendor list (max 3) |

### 2H — Applications

| Field | Type | Logic |
|-------|------|-------|
| Applications | Select: Filled by us / Portal / Vendor | Us → forms 1–4 + SOP; Portal/Vendor → SOP only |
| Application Form 1–4 | Attach | If filled by us |
| SOP | Attach | All paths |
| Application Submitted | Y/N | Yes → move to **Submitted**; No → reminder |

---

## 3. Submitted

| Field | Logic |
|-------|-------|
| Any Further Requirement for offer letter? | No → reminder: follow up offer letter |
| | Yes → Pending requirements (textarea), Completed Y/N |
| | Completed Yes → supporting docs + reminder follow up |
| | Completed No → reminder complete pending requirement |

---

## 4. Offer Letter

| Field | Notes |
|-------|-------|
| University name | Default from application |
| Course name | Default |
| Intake | Exact date + reminder for deposit deadline (auto-off when tuition paid before deadline) |
| Full year tuition fee | |
| Scholarship | |
| Payable fee for CAS | |
| Living expense | Inner London £13,347 / Outer London £10,224 |
| Funds required | `tuition + living - payable_for_cas` (GBP) |
| Conditions on offer letter | Multi-select: Interview, English Requirement, Verification, Gap Justification, Other |
| Offer letter | Upload; optional send to chat |
| Other documents | Upload |
| Defer offer required | Y/N → full defer sub-flow (mirror offer fields + reminders) |

---

## 5. Financial

### 5A — Condition branches (from offer letter multi-select)

| Condition | Shows |
|-----------|-------|
| English Requirement | Details + optional docs |
| Gap Justification | Details + optional docs |
| Verification | Academics dropdown |
| Interview | Before Deposit / After Deposit / Other (see below) |

### 5B — Interview logic (summary)

**Before Deposit:** CAS Shield / Manual → deadline + reminders; Student prepare Y/N → schedule interview; Tuition fee paid Y/N.

**After Deposit:** Initial deposit amount → paid Y/N → then interview prep/schedule loop.

**Other:** Free-text details + same prep/schedule pattern.

**Interview status:** Approved / Rejected → if rejected: 2nd chance Y/N → close university or retry loop.

**If approved:** Pending amount for CAS Y/N → reminder if yes.

### 5C — Sponsors (multi-select)

Who sponsored: Student / Father / Mother (multiple allowed)

**Father / Mother:** Birth certificate available Y/N → language Hindi/English/Other → translate reminder or upload; if no cert → Parents Support Affidavit + reminder.

**Student:** (funds section below)

### 5D — Funds type (per sponsor)

| Type | Key checks |
|------|------------|
| Bank statement | Bank name, amount, nationalized bank Y/N, balance certificate, same date as statement, 28-day rule, upload |
| FD | Bank, amount, nationalized, balance cert, 28-day rule |
| Education loan | Education purpose, holder = student, amount covers requirements, collateral details, loan letter upload |

| Field | Logic |
|-------|-------|
| Showing amount meets requirements | Y/N → reminder if no |
| Medical schedule | Y/N → reminders |
| Financial documents submitted | Y → next stage; N → reminder |

---

## 6. Acceptance

| Field | Logic |
|-------|-------|
| CAS letter received? | Yes → **CAS** stage |
| | No → Any pendency Y/N → details, completed Y/N, upload + reminders; or reminder for CAS |

---

## 7. CAS

| Field | Notes |
|-------|-------|
| Upload CAS | |
| CAS Number | |
| Sponsor License Number | |
| Extension required | Y/N + reminder |
| Who lodges visa | Our Team / Agent / Student |

**Our Team — visa file documents:** Passport (+ stamp/history details), CAS letter, Student Aadhar (name match Y/N → affidavit), Mother/Father Aadhar (name match), Medical Y/N, Other docs, Embassy login (link, id, password), IHS upload + IHS number.

| Field | Logic |
|-------|-------|
| Visa file lodged | Y → Visa Lodged; N → reminder |

(Agent / Student: lodged Y/N → same stage move or reminder)

---

## 8. Visa Lodged

| Who | Fields / logic |
|-----|----------------|
| Our Team | Visa application uploaded Y/N; IMMI acknowledgement; Biometric instruction (date, place); Biometric completed Y/N → reminders / expected decision |
| Agent / Student | Reminder for expected visa decision |

**Decision:** If visa granted → **Visa** stage + accounts notification.

---

## 9. Visa

| Who | Logic |
|-----|-------|
| Our Team | e-Visa activated Y/N → Share code received Y/N → Verified with share code Y/N → upload visa copy |
| Agent / Student | Upload visa copy |
| Student enrolled | Yes → Enrolment; No → follow up |

---

## 10. Enrolment

| Field | Type |
|-------|------|
| Enrolment proof | Attach |
| Student ID card | Attach |

---

## 11. Refused

| Field | Logic |
|-------|-------|
| Refused letter | Upload; optional send to chat |
| Process other country? | No → comments + exact reason |
| | Yes → country name; new app with handling team/person |
| Refund processed by | Our side / Agent / Student |
| Refund form filled by / cross-checked / upload | Our side rules |
| Declaration + employee name, position, code | |
| Applied for refund | Y → Refund Processing; N → reminder |

---

## 12. Refund Processing & Refunded

**Processing:** Tuition refund received Y/N; IHS refund received Y/N (+ invoice).

**Refunded:** Tuition fee issue Y/N → issue details / resolved → IHS refund loop → close case + upload invoice.

---

## Case 1 vs Case 2 difference (only)

| Topic | Case 1 | Case 2 |
|-------|--------|--------|
| Qualification | 12th | 12th |
| Marital status | Married | Not married |
| Spouse track | **Explicitly disabled** | N/A |
| All stages above | **Identical field set in source doc** | Identical |

When Cases 3–6 are documented, expect the same stage shell with qualification-specific document rules and married = single-basis flag.
