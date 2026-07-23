# Multi-Country Application Platform — UI/UX & Architecture Plan

**Scope:** UK (6 cases documented / 4 pending detail) + Australia (live) + **10–20 countries** roadmap.  
**Constraint from client:** Prefer keeping **one Application** entry point; country + case drive what users see.

---

## 1. The core problem

| Today (AU) | At 15 countries × ~6 cases |
|------------|----------------------------|
| 17 tabs, 349 fields | 200+ tabs if copied naively |
| 221 `depends_on` rules | Unmaintainable JS eval strings |
| One long form | Agents get lost; slow load |

**Goal:** Same **one Applications list** and **one card view**, but each application feels like a **country-specific app** — not a warehouse of hidden fields.

---

## 2. Recommended architecture (hybrid — best of both worlds)

```
┌─────────────────────────────────────────────────────────────┐
│  Application (parent — always)                               │
│  • student, agent, destination_country, country_flow_case    │
│  • status (high-level), team, intake, university, course     │
│  • ~40–60 shared fields                                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ 1:1 auto-created
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Application Country Data (per country extension)            │
│  • Application UK Data  (Cases 1–6, all UK stages)           │
│  • Application AU Data  (migrate existing AU fields here)    │
│  • Application CA Data  (future)                             │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │ driven by
┌─────────────────────────────────────────────────────────────┐
│  Application Country Config (master)                         │
│  • country, extension_doctype, cases[], stages[], reminders  │
└─────────────────────────────────────────────────────────────┘
```

**Why hybrid after reviewing UK doc:**

- UK alone has **12 stages**, deep **interview state machine**, **3 sponsor types × 3 fund types**, **6 English test variants** — adding 6 cases × 15 countries into one `application.json` is not “smooth.”
- Parent stays for **list, filters, card view, permissions, agent scoping** (already built).
- Country extension holds **heavy fields** — form opens as **two-panel or tabbed linked form**, user still feels one application.

If client insists on **literal single table**, use §7 (config-driven UI) inside one doctype — but extension is strongly recommended.

---

## 3. Perfect UI/UX principles (10–20 countries)

### 3.1 Create flow — 3 steps max

```
Step 1: Select country          [🇬🇧 UK] [🇦🇺 AU] [🇨🇦 CA] …
Step 2: Confirm case (auto)     "UK Case 2 — 12th, Single"
        (editable only by Team Lead if misclassified)
Step 3: Open application        Stage stepper + current stage form only
```

**Never** show all tabs on create.

### 3.2 Stage stepper (primary navigation)

Replace 17 flat tabs with a **horizontal stepper**:

```text
Assessment ● → Processing ○ → Submitted ○ → Offer ○ → Financial ○ → …
```

- ● = completed, ◉ = current, ○ = upcoming  
- Click step = jump (with permission)  
- Steps **defined in Country Config**, not hardcoded per country in JS

**UK steps (from doc):** Assessment → Processing → Submitted → Offer Letter → Financial → Acceptance → CAS → Visa Lodged → Visa → Enrolment  
**AU steps:** Different labels (GS, COE, …) — same component, different config JSON

### 3.3 Progressive disclosure inside a stage

Within **Financial** (UK example):

```
┌─ Conditions from offer letter ─────────────────┐
│ ☑ Interview  ☑ English Requirement           │
└────────────────────────────────────────────────┘
┌─ Interview (expanded because selected) ────────┐
│  Timing: Before Deposit                        │
│  CAS Shield / Manual …                         │
└────────────────────────────────────────────────┘
┌─ Sponsors ─────────────────────────────────────┐
│  [+ Father] [+ Mother] [+ Student]  cards      │
└────────────────────────────────────────────────┘
```

Only expanded sections render — not 80 hidden columns.

### 3.4 Case router — invisible to most users

Cases 1–6 computed from Assessment:

| Input | Field |
|-------|-------|
| Qualification | `qualification` |
| Marital status | `marital_status` |

Show read-only badge: `UK Case 2 · 12th · Single`

Cases 3–6: same UI shell; swap **Assessment document checklist** section.

### 3.5 Applications list & card view

| Feature | Behaviour |
|---------|-----------|
| Country filter chips | `All | UK | AU | CA` — top of list + card view |
| Case badge on card | `UK C2` small pill |
| Stage on card | Current step from config (not raw status string) |
| Agent view | Default country from user profile |

### 3.6 Reminders as first-class UI

UK doc has **40+ reminder triggers**. Do not hardcode in `application.js`.

```
Application Reminder Rule (master)
  country, stage, trigger_field, trigger_value, reminder_text, offset_days
```

Show on card: **Next action** + due date (like CRM tasks).

### 3.7 Child tables for repeating structures

| Structure | Child doctype |
|-----------|---------------|
| English tests | `Application English Test` (exists — extend for UKVI) |
| Study gap proofs | `Application Study Gap Proof` |
| LORs | `Application LOR` |
| Sponsors + funds | `Application Sponsor` + `Application Fund Source` |
| Interview attempts | `Application Interview` |
| Embassy documents checklist | `Application Visa Document` |

---

## 4. Country Config schema (draft)

```yaml
country: United Kingdom
extension_doctype: Application UK Data
currency: GBP

cases:
  - id: UK Case 1
    when: { qualification: 12th, marital_status: Married }
    flags: { single_basis_only: true }
  - id: UK Case 2
    when: { qualification: 12th, marital_status: Not Married }

stages:
  - id: assessment
    label: Assessment
    order: 1
  - id: processing
    label: Processing
    order: 2
  # … through enrolment

status_map:
  - stage: processing
    status: Processing
  - stage: submitted
    status: Submitted
  # …

shared_with_au:
  - processing.email_login
  - processing.passport
  - processing.agent
```

File: `docs/country_configs/uk.yaml` (to be created when implementing).

---

## 5. Phased rollout (smooth plan)

### Phase 0 — Documentation ✅ (this folder)
- UK Case 1 & 2 specs, router, source extract
- AU field registry CSV

### Phase 1 — Platform skeleton (2–3 weeks)
- `Application Country Config` doctype
- `country_flow_case` auto-router (UK 6 cases)
- Country picker on create
- Stage stepper component (read-only progress first)
- `Application UK Data` empty shell linked 1:1

### Phase 2 — UK Cases 1 & 2 MVP (3–4 weeks)
- Assessment + Processing + Submitted + Offer (Cases 1 & 2)
- English test + study gap child tables
- Reminder rule engine (top 10 triggers)

### Phase 3 — UK financial & CAS (3–4 weeks)
- Financial interview state machine
- Sponsors / funds child tables
- CAS → Visa Lodged → Visa → Enrolment

### Phase 4 — UK Cases 3–6 (1–2 weeks)
- Same stages; graduation/PG document sections
- Married single-basis flag on Cases 3 & 5

### Phase 5 — AU migration (parallel track)
- Move AU fields → `Application AU Data`
- AU config in Country Config
- Card view reads both parent + extension

### Phase 6 — Country #3+ template (1 week per country)
- Clone UK config pattern
- 80% reuse: Processing email, passport, agent, refused/refund shell

---

## 6. What to reuse from Australia

| Block | Reuse for UK? |
|-------|---------------|
| Email / password / recovery | ✅ Same |
| Passport upload | ✅ Same |
| Processing agent Direct/Vendor | ✅ Same |
| Application forms 1–4 + SOP | ✅ Same pattern |
| Submitted → offer pending | ✅ Same logic |
| Defer offer duplicate block | ✅ Same (GBP not AUD) |
| Sponsor child table | ✅ Extend (UK birth cert / affidavit rules) |
| Refused / refund / closed | ✅ Same shell (IHS vs OSHC) |
| GS / COE / OSHC / 956A | ❌ AU only |
| CAS / IHS / share code | ❌ UK only |

**Target:** ~35% field reuse across countries — build **shared modules**, not copy-paste countries.

---

## 7. Fallback: single doctype + config UI (if no extension)

If client refuses extension doctypes:

1. **One** `application.json` but fields grouped by prefix (`uk_`, `au_`)
2. **Custom Application Form** page (not standard Form) loads JSON from Country Config
3. Standard Form only for admins

Higher build cost, same UX — not recommended unless politically required.

---

## 8. File index (this planning package)

| File | Purpose |
|------|---------|
| `UK_PROCESS_SOURCE_EXTRACT.txt` | Raw extract from client docx |
| `UK_CASE_ROUTER.md` | All 6 cases matrix |
| `UK_CASE_01_SPEC.md` | Case 1 full field spec |
| `UK_CASE_02_SPEC.md` | Case 2 full field spec + reminders |
| `UK_PLATFORM_UI_UX_PLAN.md` | This document |
| `../application_field_registry.csv` | Live AU fields |
| `../APPLICATION_MULTI_COUNTRY_BLUEPRINT.md` | Earlier single-doctype blueprint |

---

## 9. Decisions needed from client (before build)

1. **Extension doctype OK?** (recommended) vs single mega form  
2. **Cases 3–6:** same stages as 1–2 with different assessment docs only?  
3. **Married + single basis (Cases 1,3,5):** hide all spouse fields globally?  
4. **Default country** per agent user?  
5. **Card view:** show UK stepper or AU timeline per country?

Once confirmed → Phase 1 implementation can start.
