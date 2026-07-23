# UK Cases 3–8 — Delta Summary (Planning)

This summary is for planning only (no implementation yet).

## Baseline
- Use `UK_CASE_02_SPEC.md` as the baseline UK stage flow.

## Case 3 / 4 (from case 3&4 PDF)
- Documents become **10th to Bachelor**
- Adds Bachelor acceptance/verification branch
- Adds Experience LOR
- Remaining stages and reminder patterns largely same as baseline

## Case 5 / 6 (from case 5&6 PDF)
- Adds **Research Program eligibility gate** at Processing start
- Documents become **10th to Post Graduation**
- Adds spouse-aware financial/offer/cas/visa fields:
  - funds for spouse
  - spouse/applicant sponsor handling
  - marriage certificate
  - separate embassy login and eVisa handling

## Case 7 / 8
- Not yet available from current uploads (filename/content mismatch)
- Placeholder specs created; pending correct source.

## Critical consistency checks before implementation
1. Married cases in header say "single basis only" while Case 5/6 body includes spouse tracks.
2. Confirm whether spouse logic is enabled for Case 3/5 or always blocked in married cases.
3. Confirm whether Case 7/8 are truly new UK cases or mislabeled duplicates.
