# Application — Planning docs index

Client source: `UK Process flow case 1 & 2.docx` (from Downloads)

## UK

| Document | Description |
|----------|-------------|
| [UK_PROCESS_SOURCE_EXTRACT.txt](./UK_PROCESS_SOURCE_EXTRACT.txt) | Plain-text extract from client docx |
| [UK_CASE_ROUTER.md](./UK_CASE_ROUTER.md) | Cases **1-8** router matrix and status |
| [UK_CASE_01_SPEC.md](./UK_CASE_01_SPEC.md) | **Case 1** — 12th + married, single basis, full stage fields |
| [UK_CASE_02_SPEC.md](./UK_CASE_02_SPEC.md) | **Case 2** — 12th + unmarried, reminders & state machines |
| [UK_PLATFORM_UI_UX_PLAN.md](./UK_PLATFORM_UI_UX_PLAN.md) | **10–20 country** UI/UX + phased build plan |
| [country_configs/uk.yaml](./country_configs/uk.yaml) | Machine-readable UK config draft |
| [UK_PROCESS_SOURCE_EXTRACT_CASE_3_8.txt](./UK_PROCESS_SOURCE_EXTRACT_CASE_3_8.txt) | Extract notes for uploaded Case 3-8 PDFs |
| [UK_CASE_03_SPEC.md](./UK_CASE_03_SPEC.md) | Case 3 plan (Graduation + Married) |
| [UK_CASE_04_SPEC.md](./UK_CASE_04_SPEC.md) | Case 4 plan (Graduation + Not Married) |
| [UK_CASE_05_SPEC.md](./UK_CASE_05_SPEC.md) | Case 5 plan (Post-grad + Married) |
| [UK_CASE_06_SPEC.md](./UK_CASE_06_SPEC.md) | Case 6 plan (Post-grad + Not Married) |
| [UK_CASE_07_SPEC.md](./UK_CASE_07_SPEC.md) | Case 7 placeholder (awaiting correct source) |
| [UK_CASE_08_SPEC.md](./UK_CASE_08_SPEC.md) | Case 8 placeholder (awaiting correct source) |
| [UK_CASE_3_8_DELTA_SUMMARY.md](./UK_CASE_3_8_DELTA_SUMMARY.md) | Delta view of new cases vs Case 2 baseline |

## Australia (existing)

| Document | Description |
|----------|-------------|
| [../APPLICATION_MULTI_COUNTRY_BLUEPRINT.md](../APPLICATION_MULTI_COUNTRY_BLUEPRINT.md) | Single-doctype organization rules |
| [../application_field_registry.csv](../application_field_registry.csv) | 287 live fields export |
| [../application_fields_australia.csv](../application_fields_australia.csv) | AU-tagged export |

## Key insight from client doc

- UK planning now includes Case 1-8 docs.
- Cases 1-6 have source-backed router/data (with some policy conflicts noted).
- Case 7/8 are placeholders until corrected source is provided (uploaded file content mismatch).

## Recommended next step

Review `UK_PLATFORM_UI_UX_PLAN.md` §9 decisions with client, then start **Phase 1** (Country Config + case router + create wizard).
