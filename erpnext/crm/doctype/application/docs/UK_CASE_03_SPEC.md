# UK Case 3 — Process Plan

## Router
- **Case ID:** UK Case 3
- **Condition:** Qualification = `Graduation` AND Marital Status = `Married`

## Source-backed deltas vs Case 2
Use `UK_CASE_02_SPEC.md` as baseline stage flow. Apply these changes:

1. **Processing -> Documents**
   - Replace school-only pack with: **"Documents 10th to Bachelor in one PDF"**
   - Keep 12th admit card / school domain / digilocker alternatives.
   - Add **Bachelor verification sub-flow**:
     - University name
     - University accepted? Y/N
     - Documents verified Y/N + upload / still processing / not accepted
     - If not accepted: "accepted in any other UK university" branch -> create separate app or close with reason.

2. **Processing -> LOR**
   - Add **Experience LOR** block (in addition to Academic LOR).

3. **Financial / sponsor logic**
   - Source contains spouse-related entries in Case 3 & 4 PDF (possible conflict with earlier "single basis" statement).
   - Planning flag: keep sponsor model as configurable and decide with client whether spouse sponsor block is enabled for Case 3.

## Open questions (must confirm before build)
- Should Case 3 enforce **single basis only** (no spouse processing), or allow spouse blocks shown in the PDF body?
- If single-basis is true, hide spouse in sponsor selector and visa/cas dual-login sections.

## Implementation readiness
- Stage shell: ready (same as UK Case 2)
- New fields needed: bachelor verification + experience LOR
- Status: **Ready for implementation after conflict confirmation**
