# Application — Multi-Country Field Blueprint (Single DocType)

**Purpose:** Keep one `Application` doctype (as today) but organize fields cleanly for **Australia + UK (Case 1 & Case 2) + future countries** without the form becoming unmaintainable.

**Companion files (same folder):**
| File | Description |
|------|-------------|
| `application_field_registry.csv` | All **287 live fields** exported from `application.json` |
| `application_fields_australia.csv` | Same data with draft `country_scope` / `flow_case` tags |
| `application_fields_uk_template.csv` | Empty template — **paste your UK Case 1 & Case 2 fields here** |

---

## 1. Decision: Stay on one DocType

You asked to keep the current model. That is workable **if** we enforce strict organization rules from day one:

| Rule | Why |
|------|-----|
| Every country-specific field has a **prefix** | `au_`, `uk_c1_`, `uk_c2_` (or tab-scoped sections) |
| Every country-specific tab has `depends_on` on `destination_country` | Hides irrelevant tabs |
| Case logic uses **one router field** | Avoid 50 copies of `higher_education && martial_status && …` |
| Shared fields live only in **Details / common tabs** | Student, agent, country, team, status |
| UK Case 1 vs Case 2 is a **sub-flow**, not a new doctype | Same as AU “Case 4 Spouse” pattern |

**Storage:** Not a blocker for 10 countries (NULL columns are cheap). **Complexity** is the real risk — this blueprint controls that.

---

## 2. New meta fields (add to Details tab)

These two fields drive the whole form:

| Fieldname | Type | Label | When set | Notes |
|-----------|------|-------|----------|-------|
| `destination_country` | Link → Country | Destination Country | **Create** (required) | Already exists — make **read-only after save** |
| `country_flow_case` | Select | Application Case / Flow | **Create** (required) | Options depend on country (see §4) |

Optional but recommended:

| Fieldname | Type | Label | Notes |
|-----------|------|-------|-------|
| `country_flow_version` | Data | Flow Version | e.g. `UK-2026-03` when client changes requirements |
| `country_config` | Link → Application Country Config | Country Config | Future: master table for teams, statuses, cases |

### Create UX (unchanged intent)

1. User clicks **New Application**
2. Dialog: **Destination Country** → **Case / Flow** (Case 1 / Case 2 for UK)
3. Open form with both fields set and locked
4. Only matching tabs/sections render

---

## 3. Tab layout — recommended order

### Layer A — Always visible (all countries)

| Order | Tab | Contents |
|------:|-----|----------|
| 1 | **Details** | Student, agent, country, case, team, status, intake, shared eligibility |
| 2 | **Processing** | Generic sections (email login, passport, English test) — country sections nested inside |
| 3 | **Submitted** | Shared post-submission checklist |
| 4 | **Closed / Refused / Refund** | Shared terminal states |

### Layer B — Australia only (`destination_country == 'Australia'`)

| Tab | AU-specific terms | ~Fields today |
|-----|-------------------|---------------|
| Offer Letter | OSHC, defer offer, funds matrix | 46 |
| Financials | GS docs, sponsors, verification | 22 |
| GS Processing | Interview schedule | 19 |
| GS Approved | Tuition, OSHC policies | 26 |
| Acceptance | Pre-COE acceptance | 16 |
| COE | COE, medical, 956A, file prep | 32 |
| File Lodged | TRN, immi ack | 8 |
| Visa | Visa copy, spouse visa | 5 |
| Enrolled | Enrollment docs | 1 |
| On Shore College Change | OSCG | 9 |
| Visa Refused | AU refusal + other country | 16 |
| Refund Processing / Refunded | AU refund flow | 16 |

**AU case routing (existing):** `country_flow_case = AU Case 4 Spouse` → show `case_4_*` block on Details (rename to `au_case4_*` over time).

### Layer C — United Kingdom only (`destination_country == 'United Kingdom'`)

> **Fill from your spec** in `application_fields_uk_template.csv`. Draft structure below.

| Tab | UK term (typical) | Case 1 | Case 2 |
|-----|-------------------|--------|--------|
| UK — Screening | Eligibility / risk gates | ✓ | ✓ |
| UK — Documents | CAS prep documents | ✓ | ✓ (different checklist) |
| UK — Offer & CAS | CAS letter, conditions | ✓ | ✓ |
| UK — Financials | 28-day funds, sponsor | ✓ | ✓ |
| UK — Visa Application | UKVI, biometrics | ✓ | ✓ |
| UK — Decision | Granted / Refused | ✓ | ✓ |

Use **one tab per stage**, with **Section Breaks** inside:

```
[Tab] UK — Documents          depends_on: UK
  [Section] Case 1 Checklist   depends_on: country_flow_case == 'UK Case 1'
  [Section] Case 2 Checklist   depends_on: country_flow_case == 'UK Case 2'
```

---

## 4. `country_flow_case` options (draft)

```
# Australia
AU Default
AU Case 4 Spouse

# United Kingdom  ← your two flows
UK Case 1
UK Case 2

# Future
CA Default
US Default
…
```

Populate via **Application Country Config** later; hardcode Select options for v1.

---

## 5. Naming convention (mandatory for new fields)

| Pattern | Example | Use |
|---------|---------|-----|
| `au_<stage>_<field>` | `au_coe_upload` | Australia-only (migrate old names gradually) |
| `uk_c1_<stage>_<field>` | `uk_c1_cas_upload` | UK Case 1 only |
| `uk_c2_<stage>_<field>` | `uk_c2_sponsor_income` | UK Case 2 only |
| `uk_<stage>_<field>` | `uk_visa_decision` | UK shared across Case 1 & 2 |
| *(no prefix)* | `student`, `status` | Global shared fields |

**Child tables:** `UK Case 1 Sponsor Detail`, `UK Case 2 Employment History` — one table per repeating structure, not 40 duplicate columns.

---

## 6. `depends_on` patterns (copy-paste templates)

**Country gate (tab or section):**
```js
eval: doc.destination_country == 'United Kingdom'
```

**UK Case 1 only:**
```js
eval: doc.destination_country == 'United Kingdom' && doc.country_flow_case == 'UK Case 1'
```

**UK Case 2 only:**
```js
eval: doc.destination_country == 'United Kingdom' && doc.country_flow_case == 'UK Case 2'
```

**AU Case 4 (today — migrate to this shape):**
```js
eval: doc.destination_country == 'Australia' && doc.country_flow_case == 'AU Case 4 Spouse'
```

**Role-restricted tab (keep as today):**
```js
eval: in_list(frappe.user_roles, 'System Manager') || in_list(frappe.user_roles, 'Team Lead')
```

---

## 7. Status field strategy

Today `status` is one Select with AU stages (GS, COE, …). For multi-country:

**Option A (minimal change):** Keep one `status` with grouped options:
```
Pending
Processing
…
[AU] Offer Letter Received
[AU] GS Processing
[AU] COE
[UK] CAS Received
[UK] Visa Applied
Closed
```

**Option B (cleaner):** Add `country_status` Link → **Application Status** child master filtered by country.

**Recommendation:** Option A for now (matches “stay same as now”); move to Option B when >3 countries.

---

## 8. Current Australia inventory (live — 287 data fields)

| Tab | Fields | Notes |
|-----|-------:|-------|
| Details | 31 | Includes Case 4 spouse gate (`case_4_*`) |
| Processing | 30 | Sections A–F (email, docs, English, gap, passport, forms) |
| Submitted | 7 | Offer requirements |
| Offer Letter | 46 | Largest tab — OSHC, defer duplicate block |
| Financials | 22 | Sponsors child table, GS uploads |
| GS Processing | 19 | Interview workflow |
| GS Approved | 26 | Tuition + OSHC variants |
| Acceptance | 16 | Mirror of GS interview pattern |
| COE | 32 | Medical, 956A, visa prep |
| File Lodged | 8 | TRN, acknowledgement |
| Visa | 5 | |
| Enrolled | 1 | Child table `enrollment_documents` |
| On Shore College Change | 9 | |
| Visa Refused | 16 | |
| Refund Processing | 6 | |
| Refunded | 10 | |
| Closed | 3 | |

Full field-level export: **`application_field_registry.csv`**

---

## 9. UK Case 1 & Case 2 — paste your fields here

> You mentioned you have UK fields ready. Add them to **`application_fields_uk_template.csv`** using these columns:

`country_scope, flow_case, tab, section, fieldname, label, fieldtype, options, depends_on, reqd, read_only, in_list_view, implementation_status, notes`

### 9.1 UK Case 1 — screening & gates (placeholder)

| section | fieldname (draft) | label | fieldtype | notes |
|---------|-------------------|-------|-----------|-------|
| UK C1 Screening | `uk_c1_student_age_ok` | Age eligible | Check | **replace with your field** |
| UK C1 Screening | `uk_c1_qualification_level` | Highest qualification | Select | **paste options** |
| UK C1 Screening | `uk_c1_study_gap_months` | Study gap (months) | Int | |
| UK C1 Screening | `uk_c1_cas_history` | Previous CAS / visa history | Select | |
| UK C1 Screening | `uk_c1_risk_notes` | Screening notes | Small Text | |

### 9.2 UK Case 2 — screening & gates (placeholder)

| section | fieldname (draft) | label | fieldtype | notes |
|---------|-------------------|-------|-----------|-------|
| UK C2 Screening | `uk_c2_application_route` | Application route | Select | **your Case 2 differentiator** |
| UK C2 Screening | `uk_c2_sponsor_type` | Sponsor type | Select | |
| UK C2 Screening | `uk_c2_dependants` | Travelling with dependants | Check | |
| UK C2 Screening | `uk_c2_risk_notes` | Screening notes | Small Text | |

### 9.3 UK shared stages (both cases — placeholder)

| tab | fieldname (draft) | label | fieldtype |
|-----|-------------------|-------|-----------|
| UK — Offer & CAS | `uk_cas_received` | CAS received | Check |
| UK — Offer & CAS | `uk_cas_document` | CAS letter upload | Attach |
| UK — Offer & CAS | `uk_cas_conditions` | CAS conditions | Text Editor |
| UK — Financials | `uk_funds_28_day_ok` | 28-day funds rule met | Check |
| UK — Financials | `uk_financial_evidence` | Financial evidence PDF | Attach |
| UK — Visa Application | `uk_visa_application_date` | Visa application date | Date |
| UK — Visa Application | `uk_biometrics_done` | Biometrics completed | Check |
| UK — Decision | `uk_visa_decision` | Visa decision | Select |

**→ Replace this section with your real Case 1 / Case 2 field lists when you share them.**

---

## 10. Implementation phases (single doctype path)

| Phase | Work | Risk |
|-------|------|------|
| **1** | Add `country_flow_case` + create dialog (country → case) | Low |
| **2** | Add UK tabs/sections + `depends_on` gates | Medium |
| **3** | Paste UK fields from template → `application.json` | Medium |
| **4** | Tag AU fields with country `depends_on` on tabs | Medium — test AU regression |
| **5** | Update `application.js` / card view for UK stages | Medium |
| **6** | Optional: rename `case_4_*` → `au_case4_*` | Low priority |

---

## 11. What I need from you next

To replace §9 placeholders with the real design, share **either**:

1. Your UK Case 1 / Case 2 Excel or doc, **or**
2. Fill rows in `application_fields_uk_template.csv`, **or**
3. Paste field lists in chat (grouped by Case 1 / Case 2 and by stage)

I will then:
- Merge into the registry
- Propose exact tab/section order
- Flag duplicates with existing AU fields (e.g. passport, English test → shared vs UK-only)
- Estimate final field count per country

---

## 12. Quick reference — files in this folder

```
application.json                      # live doctype (349 field defs, 287 data fields)
application_field_registry.csv        # full export of live fields
application_fields_australia.csv      # AU-tagged export
application_fields_uk_template.csv    # UK Case 1 & 2 template (for you to fill)
APPLICATION_MULTI_COUNTRY_BLUEPRINT.md  # this document
```
