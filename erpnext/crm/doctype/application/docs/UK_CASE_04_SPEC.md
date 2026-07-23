# UK Case 4 — Process Plan

## Router
- **Case ID:** UK Case 4
- **Condition:** Qualification = `Graduation` AND Marital Status = `Not Married`

## Source-backed deltas vs Case 2
Case 4 shares the same "Case 3 & 4" PDF body. Apply these deltas from baseline (`UK_CASE_02_SPEC.md`):

1. **Processing -> Documents**
   - Document pack: **10th to Bachelor**
   - Add Bachelor acceptance + verification branch (same as Case 3)

2. **Processing -> LOR**
   - Add **Experience LOR** section

3. **Financial / sponsor**
   - Standard single-applicant sponsor model unless client explicitly wants spouse-related financial fields for Case 4.

## Notes
- Since Case 4 is unmarried, spouse-specific branches should generally remain hidden.
- Keep full reminders and downstream stages identical to Case 2 unless client says otherwise.

## Implementation readiness
- Stage shell: ready
- New fields: bachelor verification + experience LOR
- Status: **Ready for implementation**
