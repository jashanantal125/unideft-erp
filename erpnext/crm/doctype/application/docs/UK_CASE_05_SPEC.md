# UK Case 5 — Process Plan

## Router
- **Case ID:** UK Case 5
- **Condition:** Qualification = `Post-graduation` AND Marital Status = `Married`

## Source-backed deltas vs Case 2
Use `UK_CASE_02_SPEC.md` baseline; apply the following from "Case 5 & 6" PDF:

1. **Processing pre-gate (new)**
   - `eligible_for_research_program` (Y/N)
   - If No: `process_on_single_basis` (Y/N)
   - If No: `process_another_country` (Y/N) -> route to another country or close with reason.

2. **Processing -> Documents**
   - Document pack becomes: **10th to Post Graduation in one PDF**
   - Includes bachelor verification branch from Case 3/4.

3. **Offer Letter**
   - Add `funds_required_for_spouse` (living expenses in GBP)

4. **Financial**
   - Sponsor section explicitly says **for Applicant/Spouse**
   - Separate sponsor/fund logic for main applicant and spouse.

5. **CAS stage**
   - Add `marriage_certificate` upload
   - Embassy login details separate for main applicant and spouse.

6. **Visa stage**
   - eVisa flow marked as separate for main applicant and spouse.

## Open question
- Header matrix says married cases should be single-basis only, but body includes spouse-specific tracks.
- Confirm whether Case 5 should run dual applicant/spouse processing or forced single basis.

## Implementation readiness
- Stage shell: ready
- New fields: research gate, PG doc pack, spouse-funds, marriage cert, separate embassy/eVisa credentials
- Status: **Ready after spouse-policy confirmation**
