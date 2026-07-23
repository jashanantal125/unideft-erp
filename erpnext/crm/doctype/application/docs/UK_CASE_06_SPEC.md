# UK Case 6 — Process Plan

## Router
- **Case ID:** UK Case 6
- **Condition:** Qualification = `Post-graduation` AND Marital Status = `Not Married`

## Source-backed deltas vs Case 2
Case 6 shares "Case 5 & 6" body. Use baseline (`UK_CASE_02_SPEC.md`) and apply:

1. **Processing pre-gate**
   - Research-program eligibility gate + alternate-country/close branches.

2. **Processing -> Documents**
   - 10th to Post Graduation pack.

3. **Downstream stages**
   - Keep UK standard flow (Submitted -> Offer -> Financial -> Acceptance -> CAS -> Visa ...)

4. **Spouse-related fields**
   - Source includes spouse-capable structures; for Case 6 (unmarried), hide spouse branches by default.

## Implementation readiness
- Stage shell: ready
- New fields: research gate + PG document controls
- Status: **Ready for implementation**
