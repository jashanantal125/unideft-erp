# Australia Case 1 & 2 — Full Source Extract

**Source PDF:** `apps/public/Australia Case 1 & 2.pdf`  
**Pages:** 83  
**Purpose:** Full text of the process PDF for stage-by-stage verification.  
**Note:** Extracted from PDF; common OCR/ligature artifacts normalized for readability without removing instructions.

---

## Page 1 of 83

Australia

Details Stage – Fields &
Workflow

Application Information

Sr.  Field Name  Ty p e  Mandatory  Remarks
No.

I  Student Name  Te  x  t  Ye  s

II  Student Contact  Number  Ye  s
  No.

III  Marital Status  Dropdown  Ye  s  Single, Married, Divorced,
  Widowed

IV  Date of Birth  Date Picker  Ye  s

V  Age (As of Now)  Auto  Ye  s  Calculated from DOB (Read Only)
  Calculated

VI  Student Email ID  Email  Ye  s  Email validation required

VII  Qualification  Dropdown  Ye  s  As per qualification master

VIII  Study Gap  Dropdown  Ye  s  Values:  Ye  s  /  No

Study Gap Logic
•  Study Gap = Ye  s

  o  Save response only.

  o  No additional fields required.
•  Study Gap = No

  o  Save response only.

  o  No additional fields required.

Previous Visa Refusal (Australia / New Zealand)

---

## Page 2 of 83

Refused from Australia / New Zealand?

Dropdown
•  Ye  s
•  No
If "No"

No further action.
If "Yes"
Display:

Country of Refusal

Dropdown
•  Australia
•  New Zealand
If Country = Australia
Display:

Visa Type Refused

Dropdown
•  Study Visa
•  Tourist Visa
•  Work Visa
•  Other Visa
Case 1 – Study Visa Refused

Display message:

This case cannot be processed for Australia.
Ask:

---

## Page 3 of 83

Does the student want to process another country?

Dropdown
•  Ye  s
•  No
If Yes
Display:
•  New Destination Country
System Action
•  Create a new application for the selected country.
•  Close the Australia application.
If No

Display
•  Reason for Closing Case (Mandatory)
System Action
•  Close Australia application.
Case 2 – To  u  r  i  s  t  V  i  s  a  R  e  f  u  s  e  d
Ask:

Can this case be processed for Australia?

Dropdown
•  Ye  s
•  No
If Yes

Continue processing.
If No
Ask:

Does the student want to apply for another country?

Dropdown

---

## Page 4 of 83

•  Ye  s
•  No
If Yes
•  New Destination Country
System Action
•  Create new application.
•  Close Australia case.
If No
•  Reason for Closing Case (Mandatory)

Close Australia case.
Case 3 – Work Visa Refused

Same workflow as Tourist Visa.
Case 4 – Other Visa Refused

Same workflow as Tourist Visa.
If Country = New Zealand
Display:

Visa Type Refused

Dropdown
•  Study Visa
•  Tourist Visa
•  Work Visa
•  Other Visa

Study Visa Refused
Ask:

---

## Page 5 of 83

Can this case be processed for Australia?

Dropdown
•  Ye  s
•  No
If Yes

Continue with Australia application.
If No
Ask:

Does the student want to process another country?

Dropdown
•  Ye  s
•  No
If Yes
•  New Destination Country
System Action
•  Create new application.
•  Close Australia application.
If No
•  Reason for Closing Case (Mandatory)

Close case.

To  u  r  i  s  t  V  i  s  a  R  e  f  u  s  e  d

Follow the same workflow as above.

Work Visa Refused

Follow the  same workflow as above.

Other Visa Refused

---

## Page 6 of 83

Follow the same workflow as above.

There  are six  processing  scenarios,  and  the  subsequent  workflow  and  stages  will  be
determined based on the selected case.
Case 1: If the Qualifica'on is 12th Pass and the Marital Status is Married, the application will
be processed only on a single applicant basis. Spouse-based processing will not be available.

Case  2: If  the Qualifica'on is 12th  Pass and  the Marital  Status is Single,  the  application  will
follow the standard processing workflow.

Processing Stage
A. Application Submission

Application Submitted

Dropdown
•  Ye  s
•  No
Workflow
If Application Submitted = Yes
•  The system will automatically change the application status to Submitted.
•  The application will move to the Submitted Stage.
If Application Submitted = No
Display:

Expected Application Submission Date
•  Date Picker

Set Reminder
•  Reminder can be scheduled for the selected expected submission date.
System Action
•  The  application  will  remain  in  the Processing  Stage until Application  Submitted is
  updated to Ye  s.

---

## Page 7 of 83

•  On submission, the status will automatically move to the Submitted Stage.
B. Student Login Credentials

 Field  Ty p e  Mandatory  Remarks

 Our Email ID  Email  Conditional  Mandatory  for  Package  Cases;
  Optional for Non  -Package Cases

 Password  Password  Conditional  Mandatory  for  Package  Cases;
  Optional for Non  -Package Cases

 Recovery Email ID  Email  Conditional  Mandatory  for  Package  Cases;
  Optional for Non  -Package Cases

 Login  Contact  Number  Conditional  Mandatory  for  Package  Cases;
 Number  Optional for Non-Package Cases

Note:
For Pa c ka ge  C a s e s, all the above fields are mandatory.
For Non-Pa c ka ge  C a s e s, these fields are optional.
C. Academic Documents

Educational Documents

The applicant must provide academic documents from:
•  10th Standard
•  12th Standard
•  Diploma (if applicable)

12th Verifica'on Options

The execuMve must verify the student's 12th qualification using any one of the following:
•  12th Admit Card Upload
  OR
•  School Domain Email ID
  OR

---

## Page 8 of 83

•  DigiLocker Credentials

DigiLocker Details

 Field  Ty p e

 DigiLocker ID  Te  x  t

 Password  Password

Documents Verifica'on

Documents Ve  r  i  fi  e  d

Dropdown
•  Ye  s
•  No
If Yes
•  Upload all verified academic documents as a single PDF.
If No
•  Documents will be marked as Not Accepted.
D. English Proficiency Test
Te  s  t  T  y  p  e

Dropdown
•  IELTS
•  PTE
•  TO E F L
If Test = IELTS

 Field  Ty p e

 Exam Date  Calendar

 Validity  Ye  s  /  N  o

 Valid Months Remaining  Auto / Number

---

## Page 9 of 83

Field  Ty p e

 Listening Score  Number

 Reading Score  Number

 Wr i M n g  S c o re  Number

 Speaking Score  Number

 Overall Score  Number

 Login User ID  Te  x  t

 Password  Password

 Ve  r  i  fi  e  d  Ye  s  /  N  o

Va  l  i  d  a  '  o  n
If Validity = Yes
•  Continue processing.
If Validity = No
•  Test is marked as Not Accepted.
If Verified = Yes
•  Upload IELTS Score Report.
If Verified = No
•  Mark as Not Accepted.
If Test = PTE

 Field  Ty p e

 Exam Date  Calendar

 Validity  Ye  s  /  N  o

 Valid Months Remaining  Auto / Number

---

## Page 10 of 83

Field  Ty p e

 Listening Score  Number

 Reading Score  Number

 Wr i M n g  S c o re  Number

 Speaking Score  Number

 Overall Score  Number

 Login User ID  Te  x  t

 Password  Password

 Ve  r  i  fi  e  d  Ye  s  /  N  o

Va  l  i  d  a  '  o  n
If Validity = Yes
•  Continue processing.
If Validity = No
•  Test is marked as Not Accepted.
If Verified = Yes
•  Upload PTE Score Report.
If Verified = No
•  Mark as Not Accepted.
If Test = TOEFL

Test Mode

Dropdown
•  IBT Centre-Based
•  IBT Home Edition
If IBT Centre-Based

---

## Page 11 of 83

Field  Ty p e

 Exam Date  Calendar

 Validity  Ye  s  /  N  o

 Valid Months Remaining  Auto / Number

 Listening Score  Number

 Reading Score  Number

 Wr i M n g  S c o re  Number

 Speaking Score  Number

 Overall Score  Number

 Login User ID  Te  x  t

 Password  Password

 Ve  r  i  fi  e  d  Ye  s  /  N  o

Va  l  i  d  a  '  o  n
•
If Validity = Yes  , continue processing.
•
If Validity = No, mark the test as Not Accepted.
•
If Verified = Yes, upload the TOEFL Score Report.
•
If Verified = No, mark the test as Not Accepted.
If IBT Home Edition
•  Status: Not Accepted
•  No further processing will be allowed.
E. Study Gap

The processing workflow should depend on the value selected in the Details stage.
If Study Gap = No
•  Study Gap Proof should remain inac've/hidden.

---

## Page 12 of 83

•  No further action is required.
If Study Gap = Yes
•  Study Gap Proof should become ac've.
•  Display the following field:
Gap Duration: Dropdown
•  Below 1 Year
•  Below 2 Years
•  Above 2 Years

Logic:
•  Below 1 Year – Accepted.
•  Below 2 Years – Accepted.
•  Above 2 Years – Not Accepted.

For all cases where Study Gap = Yes, the user must upload a Study Gap Proof document.

Study Gap Proof – Processing Stage
If Study Gap = Yes, the Study Gap Proof section should become active.

Study Gap Proof

Dropdown:
•  Educational
•  Wo  r  k
•  Other
If Study Gap Proof = Educational
Display the following dropdown:

Educational Reason
•  Reappear Exam
•  Pursuing Higher Studies
•  Diploma / CerMficate
•  IELTS / PTE

---

## Page 13 of 83

If Educational Reason = Reappear Exam

Display the following fields:
•  Subject of Reappear
•  Month / Year
•  Supporting Documents (Multiple File Upload)

  o  Reappear Admit Card

  o  DMC
If Educational Reason = Pursuing Higher Studies
Display the following fields:
•  University Name
•  Course Name

Supporting Documents (Multiple File Upload):
•  Admit Card
•  Fee Receipt
•  DMC
•  Proof of Enrollment
If Educational Reason = Diploma / Cer'ficate
Display the following fields:
•  Institute Name
•  Course Name
•  Course Duration
•  Verification Link or Email ID

Supporting Documents
•  File Upload

Ve  r  i  fi  c  a  '  o  n
•  ☐ Documents Verified

---

## Page 14 of 83

If Educational Reason = IELTS / PTE

Display the following fields:
•  Date of Issue
•  Score Card (File Upload)
If Study Gap Proof = Work

Display the following section:

Work Experience Details
•  Company Name
•  Po s i M o n
•  Duration (From – To  )
•  Employer Domain / Oﬃcial Email ID

Supporting Documents (Multiple File Upload)
•  ITR
•  Salary Slips
•  Experience Letter
•  Bank Statement

Verifica'on Checklist
•  ☐ Wo  r  k  E  x  p  e  r  i  e  n  c  e  Ve  r  i  fi  e  d
•  ☐ ITR Verified (as per Work Experience)
•  ☐ Salary Slips Verified (Last 6 Months)
•  ☐ Bank Statement Verified
If Study Gap Proof = Other

Display the following fields:
•  Details (Text Area)

Supporting Documents
•  File Upload

---

## Page 15 of 83

F. Passport

 Field  Ty p e  Mandatory  Remarks

 Passport Copy  File Upload  Ye  s  Upload a clear copy of the student's passport.
G. Processing Agent

Processing Agent Type
Dropdown
•  Direct
•  Ve  n  d  o  r

Logic
If Direct
•  The Processing  Agent  Name will  be automatically  populated based  on  the  company
  associated with the selected university.
If Vendor
Display:

Ve  n  d  o  r  N  a  m  e

Dropdown
•  Show  only  the top  three vendors  as  per  the  company's  predefined  priority  for  the
  selected university.
H. Application Preparation
Application Filled By

Dropdown
•  Application Filled by Us
•  Application Filled on Portal
•  Application Filled by Vendor
If "Application Filled by Us"

The following uploads will be available:

---

## Page 16 of 83

Document  Upload

 Application Form 1  Upload

 Application Form 2  Upload

 Application Form 3  Upload

 Application Form 4  Upload

 Statement of Purpose (SOP)  Upload
If "Application Filled on Portal"

 Document  Upload

 Statement of Purpose (SOP)  Upload
If "Application Filled by Vendor"

 Document  Upload

 Statement of Purpose (SOP)  Upload

Submitted Stage

Have You Submitted Another Application?

Dropdown: Ye  s  /  N  o

Logic
If Yes
•  The student will proceed with the Another Application process.
•  Enter another application id Mandatory Field
If No
Display the following field:

---

## Page 17 of 83

Is There a Need to Apply for Another Application?

Dropdown: Ye  s  /  N  o
If Yes
•  Display  an  opMon  to Set  a  Reminder for  when  the  next  application  should  be
  processed.
If No
•  Display  a  mandatory  Reason  field  to  capture  why  another  application  will  not  be
  processed.

Any Further Requirement for Offer Letter?

Dropdown
•  Ye  s
•  No
Workflow
If No
System Action
•  Display Set Reminder pop-up.

The user can configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks
Reminder Purpose
•  Follow-up on Offer Letter.
If Yes

Requirement Type

 Field  Ty p e  Mandatory

 Requirement Type  Dropdown  Ye  s

---

## Page 18 of 83

Dropdown Values
•  Interview
•  Other
If Requirement Type = Other
Display:

 Field  Ty p e  Mandatory

 Pending Requirement Details  Text Area  Ye  s

Pending Requirements Completed?
Dropdown: Ye  s  /  N  o

Logic
If Yes
•  Display Supporting Documents (File Upload).
•  After  the supporting  documents  are  uploaded,  the  details  window  should
  automatically proceed to the next step.
•  Display a Set Reminder pop-up where the user can configure:

  o  Reminder Date

  o  Reminder Time

  o  Short Note / Remarks
•  The reminder should be saved for Follow-up on the Offer Letter.
If No
•  Display a Set Reminder pop-up where the user can configure:

  o  Reminder Date

  o  Reminder Time

  o  Short Note / Remarks
•  The reminder should be saved for Completing the Pending Requirements.

---

## Page 19 of 83

If Requirement Type = Interview

Display the fo l l ow i n g  fi e l d s :

 Field  Ty p e  Mandatory

 Interview Deadline  Date Picker  Ye  s

Set Reminder

The user should be able to configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks
Business Logic
•  If  the  interview  is  completed  before  the  deadline,  the  reminder  should  be
  automatically deactivated.
•  If the interview is not completed, the reminder should remain active until completion.

Student Prepared

 Field  Ty p e  Mandatory

 Student Prepared  Dropdown (Yes/No)  Ye  s
If Student Prepared = Yes
Display:

 Field  Ty p e  Mandatory

 Schedule Interview  Dropdown (Yes/No)  Ye  s
If Schedule Interview = Yes
•  Prepare the student for the interview.
•  Set a reminder for the Interview Date.
If Schedule Interview = No
•  Set a reminder to follow up for interview scheduling.

---

## Page 20 of 83

If Student Prepared = No
•  Prepare the student for the interview.
•  Set a reminder to follow up on student preparation.

  Offer Letter Stage
A. Offer Letter Details

Field  Ty p e  Mandatory  Remarks

University Name  Auto-filled  Ye  s  Populated from the selected application

Course Name  Auto-filled  Ye  s  Populated from the selected application

Intake Date  Date  Ye  s  Display the selected  intake date

Full  Year  Tuition  Fee Currency Ye  s Enter as per the Offer Letter
(AUD)

Scholarship (AUD)  Currency  Optional

Payable Fee (AUD)  Currency  Ye  s  Amount  payable  after  scholarship  (if
  applicable)

OSHC (AUD)  Currency  Ye  s  Overseas Student  Health Cover

Living Expenses (AUD)  Auto-filled  Ye  s  29,710 AUD

Tr  a  v  e  l  E  x  p  e  n  s  e  s  (  A  U  D  ) Auto-filled Ye  s  2,200 AUD

Funds Required  Dropdown  Ye  s  With Full Year Fee / Without Full Year Fee
B. Funds Required Calcula'on

  Funds Required

  Dropdown
•  With Full Year Fee
•  Without Full Year Fee
  Logic
If With Full Year Fee

---

## Page 21 of 83

The system should automatically calculate:

Funds Required =

Full Year Tuition Fee

+ OSHC
+ Living Expenses

+ Travel Expenses

The calculated amount should be displayed in AUD.
If Without Full Year Fee
The system should automatically calculate:

Funds Required =

Full Year Tuition Fee

+ OSHC

+ Living Expenses
+ Travel Expenses

− Payable Fee

The calculated amount should be displayed in AUD.
C. Tuition Fee Deposit Deadline Reminder
The selected Intake Date should be displayed.

Provide an opMon to Set a Reminder for the Tuition  F  e  e  D  e  p  o  s  i  t  D  e  a  d  l  i  n  e.

Set Reminder

The reminder pop-up should allow the user to configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks

Reminder Logic
If Tuition Fee is Paid Before the Deposit Deadline

---

## Page 22 of 83

•  The system should automatically deactivate the pending reminder.
If Tuition Fee is Not Paid
•  The  reminder  should  remain  active  until  the  tuition  fee  payment  is  completed  or  the
  reminder is manually updated.

Current
Enhancement Required

Current Issue:

The Set Reminder pop-up/window is currently not available in the Offer Letter stage.
Requirement:

Implement the  Set Reminder functionality with the following fields:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks

The reminder should be linked to the  Tuition  F  e  e  D  e  p  o  s  i  t  D  e  a  d  l  i  n  e and should automatically
deactivate once the tuition fee payment is recorded before the deadline.
D.  C o n d i ' o n s  o n  O ffe r  L e[e r

Field Ty p e : Multi-Select Dropdown

Mandatory:  Optional (Applicable only if the offer letter contains any conditions.)
Ava i l a b l e  O p ' o n s
•  Interview
•  English Requirement
•  Ve  r  i  fi  c  a  M  o  n
•  Gap JusMficaMon
•  Other
Business Logic
•  The user should be able to select one or more conditions applicable to the offer letter.
•  Multiple selections should be supported within the same application.
•  If no conditions are mentioned in the offer letter, the field may be left blank.

---

## Page 23 of 83

If Other is Selected

Display the following field:

 Field  Ty p e

 Specify Other Condition  Text Area

The user must enter the details of the additional condition specified in the offer letter.

System Requirements
•  The selected conditions should be saved against the application record.
•  Multiple  selected  values  should  be  displayed  wherever  the  application  details  are
  viewed.
•  The selected conditions should remain editable until the application progresses to the
  next stage, subject to user permissions.
E. Defer Offer Required

Dropdown: Ye  s  /  N  o
Logic
If No
•  No further action is required.
If Yes
Display the following field:

Have You Applied for a Defer Offer Letter?

Dropdown: Ye  s  /  N  o
If No
•  Set Reminder: Follow up on the Defer Offer Letter application.
If Yes
Display the following field:

Any Further Requirement for the Defer Offer Letter?

---

## Page 24 of 83

Dropdown: Ye  s  /  N  o
If No
•  Set Reminder: Follow up on the Defer Offer Letter.
If Yes
Display the following fields:
•  Pending Requirement Details (Text Area)

Pending Requirements Completed?

Dropdown: Ye  s  /  N  o
If Yes
•  Display Supporting Documents (File Upload).
•  Set Reminder: Follow up on the Defer Offer Letter.
If No
•  Set Reminder: Complete the Pending Requirements.

The following sections will remain the same as the Offer Letter Stage:
•  Offer Letter Details
•  Funds Required Calcula'on
•  Tuition  F  e  e  D  e  p  o  s  i  t  D  e  a  d  l  i  n  e  R  e  m  i  n  d  e  r

(Refer to the  Offer Letter Stage for the complete business logic and calculaMons.)

Financial Stage
A. GS Submission
GS Submitted

 Field  Ty p e

 GS Submitted  Dropdown
Business Logic
If GS Submitted = Yes

---

## Page 25 of 83

System Actions:
•  Mark the Financial Stage as Completed.
•  Automatically move the application to the GS Processing Stage.
If GS Submitted = No

Display the following field:

Will the student proceed with GS for this application?

 Field  Ty p e

 Will the student process for GS?  Dropdown (Yes/No)
If Will the student process for GS = No
Display:

 Field  Ty p e

 Will the student  process for GS in another university?  Dropdown (Yes/No)
If Yes
Display:

 Field  Ty p e  Mandatory

 Another Application ID  Te  x  t  Ye  s
System Action
•  Link the entered Application ID.
•  Close the current application for GS processing.
If No
Display:

---

## Page 26 of 83

Field  Ty p e  Mandatory

 Will the student process for another country?  Dropdown (Yes/No)  Ye  s
If Yes
Display:

 Field  Ty p e  Mandatory

 Country  Dropdown  Ye  s

 Application ID  Te  x  t  Ye  s
System Action
•  Link the new application.
•  Close the current application.
If No
Display:

 Field  Ty p e  Mandatory

 Reason for Not Proceeding  Text Area  Ye  s
System Action
•  Close the application.

Reminder

Whenever GS Submitted = No, display the Set Reminder pop-up.
Reminder Details

The user should be able to configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks
Business Logic

---

## Page 27 of 83

•  The reminder should be saved against the application for follow-up.
•  Multiple reminders should be allowed if required.
•  The application will remain in the Financial Stage until GS Submitted is updated to Ye  s
  or the application is closed.
B. Conditions

The  conditions  selected  in  the Offer  Letter  Stage should  be  automatically  displayed  in  the
Financial Stage. The system should only display the corresponding section(s) for the selected
condition(s).
1. Interview

This  section  should  be  displayed  only  if Interview was  selected  in  the Conditions  on  Offer
Letter.
Interview Required Before

 Field  Ty p e  Mandatory

 Interview Required Before  Dropdown  Ye  s

---

## Page 28 of 83

Dropdown Values
•  Before GS Approval
•  Before Acceptance
•  Before COE
•  Before Financial
Business Logic
If Before Financial
Display:

 Field  Ty p e  Mandatory

 Interview Deadline  Date Picker  Ye  s

The system should provide a  Set Reminder opMon.

Reminder Logic
•  If  the  interview  is  completed  before  the  deadline,  the  reminder  should  be
  automatically deactivated.
•  If the interview is not completed, the reminder should remain active until completion.

Student Prepared

 Field  Ty p e  Mandatory

 Student Prepared  Dropdown (Yes/No)  Ye  s
If Student Prepared = Yes
Display:

 Field  Ty p e  Mandatory

 Schedule Interview  Dropdown (Yes/No)  Ye  s
If Schedule Interview = Yes
•  Set a reminder for the Interview Date.

---

## Page 29 of 83

•  Continue interview follow-up until completed.
If Schedule Interview = No
•  Set a reminder to follow up for interview scheduling.
If Student Prepared = No
System Action
•  Set a reminder to prepare the student.
•  Continue follow-up until the student is marked as prepared.
If Before Acceptance
•  This process will be completed during the GS Approved Stage.
If Before COE
•  This process will be completed during the Acceptance Stage.
If Before GS Approval
•  This workflow will be completed during the GS Submitted Stage.
2. English Requirement
This section should be displayed only if English Requirement was selected.

 Field  Ty p e  Mandatory

 Requirement Details  Text Area  Ye  s

 Supporting Documents  File Upload  Optional
3. Gap Jus'fica'on

This section should be displayed only if Gap Jus'fica'on was selected.

---

## Page 30 of 83

Field  Ty p e  Mandatory

 Gap JusMficaMon Details  Text Area  Ye  s

 Supporting Documents  File Upload  Optional
4. Verifica'on

This section should be displayed only if Ve  r  i  fi  c  a  '  o  n was selected.
Ve  r  i  fi  c  a  '  o  n  T y  p  e

 Field  Ty p e  Mandatory

 Ve  r  i  fi  c  a  M  o  n  Ty  p  e Dropdown  Ye  s
Dropdown Values
•  Academics
•  Wo  r  k  E  x  p  e  r  i  e  n  c  e
Business Logic
•  Display  only  the  sections  corresponding  to  the  conditions  selected  in  the Offer  Letter
  Stage.
•  Multiple  conditions  can  be  displayed  simultaneously  if  more  than  one  condition  was
  selected.
•  Each condition should be updated and tracked independently.

---

## Page 31 of 83

C. Sponsors
The system should support mul'ple sponsors for a single application.

Sponsor Selec'on

 Field  Ty p e  Mandatory

 Sponsors  Multi-Select Dropdown  Ye  s

Ava i l a b l e  O p ' o n s
•  Father
•  Mother
•  Self
•  Spouse
•  Brother
•  Sister
•  Guardian

---

## Page 32 of 83

•  Other
Business Logic
•  The user can select one or more sponsors.
•  A separate Sponsor Details section should be generated for each selected sponsor.
•  All sponsor information should be stored independently.

Sponsor Details

The following details should be captured for each sponsor.
Basic Information

 Field  Ty p e  Mandatory

 Sponsor Name  Te  x  t  Ye  s

 Date of Birth matches Passport & Aadhaar Card  Dropdown (Yes/No)  Ye  s

 Name matches on Aadhaar Card & Passport  Dropdown (Yes/No)  Ye  s
Business Logic

DOB Match
•
If Ye  s, proceed.
•
If No, correcMon is required before proceeding.

Name Match
•
If Ye  s, upload Aadhaar Card.
•
If No, correcMon is required before proceeding.

Income Supporting Documents

 Field  Ty p e  Mandatory

 Income Supporting Documents  Dropdown  Ye  s

Ava i l a b l e  O p ' o n s
•  ITR

---

## Page 33 of 83

•  Form 16
•  Family ID

ITR Details
The system should allow multiple ITR records using an  Add More ITR  opMon.

Each ITR should capture:

 Field  Ty p e

 Assessment Year  Te  x  t

 ITR Value  Currency

 Acknowledgement Number  Te  x  t

 DOB matches Aadhaar & Passport  Ye  s  /  N  o

 Name matches Aadhaar & Passport  Ye  s  /  N  o

 ITR Verified  Ye  s  /  N  o

 Upload ITR  File Upload
Business Logic
•
If DOB or Name does not match, correcMon is required.
•
If ITR Verified = Yes, allow document upload.
•
If ITR Verified = No, verification is required and a reminder should be set.
•  The system should support multiple ITR uploads using the Add More ITR opMon.

Form 16

The system should support multiple Form 16 records.
Each record should include:

 Field  Ty p e

 Assessment Year  Te  x  t

 Income Value  Currency

---

## Page 34 of 83

Field  Ty p e

 Upload Form 16  File Upload

Provide an  Add More Form 16  opMon.
D.  Occupation Documents

Occupation Documents Available

 Field  Ty p e  Mandatory

 Occupation Documents Available  Dropdown (Yes/No)  Ye  s
If No
Display:

 Field  Ty p e

 Reason  Text Area
If Yes
Display:
Sponsor Occupation

Multi-Select Dropdown
Available Options
•  Business
•  Job
•  Farmer
•  Other

Each selected occupation should display its corresponding details in the next section.
Business Logic
•  Multiple sponsors are supported.

---

## Page 35 of 83

•  Each sponsor should have an independent profile.
•  Each sponsor can have multiple ITRs and multiple Form 16 records.
•  The system should support Add More functionality for ITRs and Form 16 documents.
•  If any verification fails, the user should be able to set a reminder for follow-up.
•  The  selected  occupation(s)  should  determine  the  fields  displayed  in  the  next  section
  (Business, Job, Farmer, or Other).
1. Business
If Business is selected, display:

Business Proof

 Field  Ty p e  Mandatory

 Business Proof  Multi-Select Dropdown  Ye  s

Ava i l a b l e  O p ' o n s
•  GST CerMficate
•  MSME CerMficate
•  Incorporation CerMficate
•  Shop Act CerMficate
•  IEC CerMficate
•  Other

GST Cer'ficate

 Field  Ty p e  Mandatory

 GST Number  Te  x  t  Ye  s

 GST Verified  Checkbox  Ye  s

 GST CerMficate  File Upload  Ye  s

MSME Cer'ficate

---

## Page 36 of 83

Field  Ty p e  Mandatory

 Company Name  Te  x  t  Ye  s

 Business Start Date  Date  Ye  s

 MSME  Registration Date  Date  Ye  s

 Registration Duration  Dropdown  Ye  s

 MSME CerMficate  File Upload  Ye  s

Registration Duration
•  Below 1 Year
•  Below 2 Years
•  Above 2 Years
Business Logic
•  Below 1 Year / Below 2 Years

  o  Current Account Statement (Mandatory)

  o  GST CerMficate (Mandatory)
•  Above 2 Years

  o  No additional documents required.

Incorporation Cer'ficate

 Field  Ty p e  Mandatory

 Business Start Date  Date  Ye  s

 Registration Date  Date  Ye  s

 Incorporation  CerMficate  File Upload  Ye  s

 Current Account Statement  File Upload  Ye  s

Shop Act Cer'ficate

---

## Page 37 of 83

Field  Ty p e  Mandatory

 Company Name  Te  x  t  Ye  s

 Business Start Date  Date  Ye  s

 Registration Date  Date  Ye  s

 Registration Duration  Dropdown  Ye  s

 Shop Act  CerMficate  File Upload  Ye  s
Business Logic
•  Below  1  Year  /  Below  2  Years  →  Current  Account  Statement  and  GST  CerMficate  are
  mandatory.
•  Above 2 Years → No additional documents required.

IEC Cer'ficate

 Field  Ty p e  Mandatory

 Company Name  Te  x  t  Ye  s

 Business Start Date  Date  Ye  s

 Registration Date  Date  Ye  s

 Registration Duration  Dropdown  Ye  s

 IEC CerMficate  File Upload  Ye  s
Business Logic
•  Below  1  Year  /  Below  2  Years  →  Current  Account  Statement  and  GST  CerMficate  are
  mandatory.
•  Above 2 Years → No additional documents required.

Other Business Proof

---

## Page 38 of 83

Field  Ty p e  Mandatory

 Details  Text Area  Ye  s

 Supporting Documents  File Upload  Ye  s
2. Job

Job Type

 Field  Ty p e  Mandatory

 Job Type  Dropdown  Ye  s

Ava i l a b l e  O p ' o n s
•  Government
•  Private
•  Retired Government Employee

Government Employee
Capture the following details:
•  Department
•  Po s i M o n
•  Employee ID Card (Upload)

Salary Proof
Multi-Select Dropdown
•  Salary Slips
•  Salary Statement

Salary Slips
•  Current Salary
•  GPF Amount
•  Upload last 6 months Salary Slips

Salary Statement
•  Current Salary

---

## Page 39 of 83

•  Upload last 6 months Salary Statement

Private Employee

Capture:
•  Company Name
•  Department
•  Po s i M o n
•  Experience Letter (Upload)
•  Employee ID Card (Upload)
Salary Proof

Multi-Select Dropdown
•  Salary Slips
•  Salary Statement

Upload a minimum of 6 months salary records.

Retired Government Employee

Capture:
•  Department
•  Po s i M o n
•  Retirement Date
•  Employee ID Card
•  Pe n s i o n  P ro o f
•  Current Pension Amount
•  Upload minimum  6 months Pension Statement
3. Farmer

Capture:

---

## Page 40 of 83

Field  Ty p e  Mandatory

 Annual Income  Currency  Ye  s

 Income Supporting Documents  Dropdown  Ye  s

Ava i l a b l e  O p ' o n s
•  Tehsildar Income CerMficate
•  Family ID
•  J Forms
Business Logic

Te  h  s  i  l  d  a  r  I  n  c  o  m  e  C  e  r  '  fi  c  a  t  e
•  Verify whether the income matches the submitted ITRs.
•  If matched, upload the document.
•  If not matched, correcMon is required and a reminder should be set.

Fa m i l y  I D
•  Verify income with the submitted ITRs.
•  If mismatched, correcMon is required.

J Forms
Capture:
•  Assessment Year
•  Amount

Verify whether 60% of the amount matches the submitted ITRs.

If not, correcMon is required and a reminder should be set.
4. Other

Capture:

 Field  Ty p e  Mandatory

 Details  Text Area  Ye  s

---

## Page 41 of 83

Field  Ty p e  Mandatory

 Supporting Documents  File Upload  Ye  s
Business Logic
•  Multiple occupations may be selected for a sponsor.
•  The corresponding section(s) should be displayed based on the selected occupation(s).
•  Each occupation's documents and verification should be stored independently.
•  If any mandatory verification fails, the system should allow the user to set a follow-up
  reminder.
E. Source of Funds

Funds Type

 Field  Ty p e  Mandatory

 Funds Type  Dropdown  Ye  s

Ava i l a b l e  O p ' o n s
•  Fixed Deposit (FD)
•  Bank Statement
•  Education Loan
•  Other

Note: If the sponsor is providing GPF or Post  Oﬃce  Statement as proof of funds, the amount
must  first  be  transferred  to  a Savings  Account  in  a  Nationalized  Bank before  it  can  be
accepted.
1. Fixed Deposit (FD)
If Fixed Deposit  is selected, display the following fields:

 Field  Ty p e  Mandatory

 Bank Name  Te  x  t  Ye  s

---

## Page 42 of 83

Field  Ty p e  Mandatory

 Is this a Nationalized Bank?  Dropdown (Yes/No)  Ye  s

 FD Age  Dropdown  Ye  s

 Balance CerMficate Available  Dropdown (Yes/No)  Ye  s

 FD Verified  Dropdown (Yes/No)  Ye  s

 Other Details  Text Area  Optional

 Upload FD CerMficate  File Upload  Ye  s

FD Age
•  1 Month
•  2 Months
•  3 Months
•  More than 3 Months
Business Logic

Nationalized Bank
•
If Ye  s, continue.
•
If No,  the  FD  will  not  be  accepted.  The  funds  must  be  transferred  to  a  Nationalized
  Bank.
Source of Funds
•  1 Month → Source of Funds required.
•  2 Months → Source of Funds required.
•  3 Months → Source of Funds not required.
•  More than 3 Months → Source of Funds not required.
Balance Cer'ficate
•
If Ye  s, continue.
•
If No, the Balance CerMficate is mandatory and a reminder should be set.

FD Verifica'on
•
If Ye  s, proceed.
•
If No, verification comments should be recorded before proceeding.

---

## Page 43 of 83

2. Bank Statement
If Bank Statement is selected, display:

 Field  Ty p e  Mandatory

 Bank Name  Te  x  t  Ye  s

 Is this a Nationalized Bank?  Dropdown (Yes/No)  Ye  s

 Number of Deposits Above ₹50,000  Dropdown  Ye  s

 Balance CerMficate Available  Dropdown (Yes/No)  Ye  s

 Statement Verified  Dropdown (Yes/No)  Ye  s

 Other Details  Text Area  Optional

 Upload Bank Statement  File Upload  Ye  s
Business Logic

Nationalized Bank
•
If Ye  s, continue.
•
If No, the statement will not be accepted.

Large Deposits
•  Deposit within 1 Month → Source of Funds required.
•  Deposit within 2 Months → Source of Funds required.
•  Deposit within 3 Months → Source of Funds not required.
•  Deposit older than 3 Months → Source of Funds not required.

Balance Cer'ficate

If available:
•  Verify that the Balance Cer'ficate Date and Bank Statement Date are the same.

If dates do not match:
•  Updated documents are required.
•  Set a reminder.

If the Balance CerMficate is not available:

---

## Page 44 of 83

•  Request the Balance CerMficate.
•  Set a reminder.

Statement Verifica'on
•
If Verified = Yes, continue.
•
If Verified = No, verification comments should be recorded.
3. Education Loan
If Education Loan is selected, display:

 Field  Ty p e  Mandatory

 Bank  Name  Te  x  t  Ye  s

 Loan Holder Name  Te  x  t  Ye  s

 Loan Amount  Currency  Ye  s

 Is Loan for Education Purpose?  Dropdown (Yes/No)  Ye  s

 Is Loan Holder the Student?  Dropdown (Yes/No)  Ye  s

 Does Loan Amount Cover Required Funds?  Dropdown (Yes/No)  Ye  s

 Security Type  Dropdown  Optional

 Loan Letter  File Upload  Ye  s

Security Type
•  Property
•  Other
If Property is selected:
•  Upload Property Documents.
If Other is selected:
•  Enter Details.
•  Upload Supporting Documents.
Business Logic

Education Purpose

---

## Page 45 of 83

•
If Ye  s, continue.
•
If No, a revised Education Loan Letter is required and a reminder should be set.

Loan Holder
•  If the Loan Holder is the Student, continue.
•  Otherwise, request a revised Education Loan Letter and set a reminder.

Loan Amount
•  If the loan amount covers the required funds, continue.
•  Otherwise, request a revised Education Loan Letter and set a reminder.
4. Other Funds
If Other is selected, display:

 Field  Ty p e  Mandatory

 Details  Text Area  Ye  s

 Supporting Documents  File Upload  Ye  s
Business Logic
•  Only one Funds Type can be selected for each funding source.
•  The system should validate the selected funds based on the applicable business rules.
•  If  any  mandatory  document  or  verification  is  pending,  the  system  should  allow  the
  user to set a reminder fo r  fo l l ow-up.
•  All uploaded financial documents should be linked to the corresponding sponsor.
E. Academics

This  section  captures  the  academic,  passport,  financial,  and  aﬃdavit  documents  required
before proceeding to the GS Processing Stage.
1. Academic Documents Notariza'on

---

## Page 46 of 83

Field  Ty p e  Mandatory

  Notarized Academic Documents Required  Dropdown (Yes/No)  Ye  s
Business Logic
If Yes
Display:

  Field  Ty p e  Mandatory

  Upload Notarized Academic Documents  File Upload  Ye  s
2. Parent Name Verifica'on (Academic Documents)

Field  Ty p e  Mandatory

Parent's Name Matches Student's Academic Documents  Dropdown (Yes/No)  Ye  s
Business Logic
•
If Yes: No further action required.
•
If No: Upload a Same Name Aﬃdavit (Mandatory).

  Field  Ty p e  Mandatory

  Same Name Aﬃdavit  File Upload  Yes
3. Parent Name Verifica'on (Passport)

  Field  Ty p e  Mandatory

  Parent's Name Matches Passport  Dropdown (Yes/No)  Ye  s
Business Logic
•
If Yes: No further action required.
•
If No: Upload a Same Name Aﬃdavit (Mandatory).

  Field  Ty p e  Mandatory

  Same Name Aﬃdavit  File Upload  Ye  s

---

## Page 47 of 83

4. Gap Documents

 Field  Ty p e  Mandatory

 Gap Documents (Notarized)  File Upload  Conditional
5. Passport Verifica'on

 Field  Ty p e  Mandatory

 Passport Contains Stamp or  Immigration History  Dropdown (Yes/No)  Ye  s
Business Logic
If Yes
•  Review the immigration history.
•  Verify whether the application is eligible for further processing.
If No
Display:

 Field  Ty p e  Mandatory

 Upload Full Notarized Passport  File Upload  Ye  s
6. Financial Documents Upload

Upload the complete financial document set for each sponsor.

 Field  Ty p e  Mandatory

 Sponsor 1 Documents (Single PDF)  File Upload  Conditional

 Sponsor 2 Documents (Single PDF)  File Upload  Conditional

 Sponsor 3 Documents (Single PDF)  File Upload  Conditional

Each Sponsor PDF should include:
•  Aadhaar Card (AC)
•  Passport Copy (PC)

---

## Page 48 of 83

•  ITR(s)
•  Occupation Proof
•  Other Supporting Documents (if applicable)
7. GS Documents

 Field  Ty p e  Mandatory

 GTE / GS SOP  File Upload  Ye  s

 GTE / GS Form 1  File Upload  Ye  s

 GTE / GS Form 2  File Upload  Ye  s

 Sponsorship Aﬃdavit  File Upload  Ye  s

 Student Aﬃdavit  File Upload  Ye  s
Business Logic
•  All mandatory documents must be uploaded before the application can proceed to the
  GS Processing Stage.
•  Where aﬃdavits are required due to name mismatches, they must be uploaded before
  conMnuing.
•  Sponsor  documents  should  be  uploaded  as  a single  consolidated  PDF for  each
  sponsor.
•  Passport verification should be completed before moving to the next stage.
•  The  system  should  validate  that  all  required  uploads  are  completed  before  marking
  the Academics section as complete.

GS Submitted Stage
A. Interview Before GS Approval
This section should be displayed only if the "Interview" condi'on is selected in the Financial
Stage → Conditions.
Business Logic

---

## Page 49 of 83

•  If  Interview  is  selected  in  the Financial  Stage,  the Interview  Before  Acceptance
  section should automatically become available in the GS Processing Stage.
•
If Interview is not selected, this section should remain hidden.

Interview Required Before

This section is applicable only when Interview Required Before = Before Acceptance.

 Field  Ty p e  Mandatory

 Interview Deadline  Date Picker  Ye  s

Reminder

Provide a  Set Reminder opMon.

The reminder pop-up should allow the user to configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks
Business Logic
•  If  the  interview  is  completed  before  the  deadline,  the  reminder  should  be
  automatically deactivated.
•  If the interview is not completed, the reminder should remain active until completion.

Student Prepared

 Field  Ty p e  Mandatory

 Student Prepared  Dropdown (Yes/No)  Ye  s
If Yes
Display:

 Field  Ty p e  Mandatory

 Schedule Interview  Dropdown (Yes/No)  Ye  s
If Schedule Interview = Yes
•  Prepare the student for the interview.

---

## Page 50 of 83

•  Set a reminder for the Interview Date.
If Schedule Interview = No
•  Set a reminder to follow up for interview scheduling.
If Student Prepared = No
•  Prepare the student for the interview.
•  Set a reminder to follow up on student preparation.
B. GS Approval

 Field  Ty p e  Mandatory

 GS Approved  Dropdown (Yes/No)  Ye  s
Business Logic
If GS Approved = Yes
System Action
•  Mark the GS Processing Stage as completed.
•  Automatically move the application to the GS Approved Stage.
If GS Approved = No
Display:

 Field  Ty p e  Mandatory

 Any Further Requirements?  Dropdown (Yes/No)  Ye  s
If Any Further Requirements = No
Display the  Set Reminder pop-up.

The user should be able to configure:
•  Reminder Date
•  Reminder Time

---

## Page 51 of 83

•  Short Note / Remarks
Reminder Purpose
•  Follow up for GS Approval  .
If Any Further Requirements = Yes
Display:

 Field  Ty p e  Mandatory

 Requirement Details  Text Area  Ye  s

Requirements Completed

 Field  Ty p e  Mandatory

 Requirements Completed  Dropdown (Yes/No)  Ye  s
If Requirements Completed = Yes
Display:

 Field  Ty p e  Mandatory

 Supporting Details  Text Area  Ye  s

 Upload Supporting Documents  File Upload  Ye  s

After uploading the required documents:
•  Display the  Set Reminder pop-up.
•  Allow the user to configure:

  o  Reminder Date

  o  Reminder Time

  o  Short Note / Remarks
Reminder Purpose
•  Follow up for GS Approval.

---

## Page 52 of 83

If Requirements Completed = No

Display the Set Reminder pop-up.

The user should be able to configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks
Reminder Purpose
•  Follow up for completion of pending requirements.

The  application  will  remain  in  the GS  Processing  Stage until  the  pending  requirements  are
completed or the GS is approved.

GS Approved Stage
A. Tuition Fee Payment (Counselor Flow)

Tuition  F  e  e  P  a  i  d

 Field  Ty p e  Mandatory

 Tuition Fee Paid  Dropdown (Yes/No)  Ye  s
If Tuition Fee Paid = Yes

 Field  Ty p e  Mandatory

 Tu  i  M  o  n  F  e  e  R  e  c  e  i  p  t File Upload Ye  s
Display:

Wa  s  t  h  e  Tu  i  '  o  n  F e  e  P a y  m  e  n t  P  r o  c  e  s  s  e  d  T  h  r o  u  g  h  U  s  ?

 Field  Ty p e  Mandatory

 Fee Payment  Processed Through GHA  Dropdown (Yes/No)  Ye  s
If Yes
System Action

---

## Page 53 of 83

•  Start the OSHC workflow.
•  Simultaneously  trigger  the Accounts  Department workflow  (to  be  developed
  separately).
If No
Display:

Have You Convinced the Student/Concerned Person to Process the Fee Through GHA?

Field  Ty p e  Mandatory

Convinced for Fee Processing Through GHA  Dropdown (Yes/No)  Ye  s
If Yes
Display:

Field  Ty p e  Mandatory

Reason Why Fee Payment Was Not Processed Through GHA  Text Area  Ye  s
If No
Display:

Field  Ty p e  Mandatory

Reason Why No Efforts Were Made to Process the Fee Through GHA  Text Area  Ye  s
If Tuition Fee Paid = No

Display the  Set Reminder pop-up.
The reminder should allow the user to configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks
Reminder Purpose
•  Follow-up for Tuition Fee Payment.

---

## Page 54 of 83

B. OSHC
This section becomes available only after Tuition Fee Paid = Yes.

OSHC Arranged By

Field  Ty p e  Mandatory

OSHC Arranged By  Dropdown  Ye  s

Ava i l a b l e  O p ' o n s
•  GHA
•  University
•  Agent
•  Student

---

## Page 55 of 83

If GHA
Display:

Have You Received the Policy?

 Field  Ty p e  Mandatory

 Po l i c y  Re c e i ve d  Dropdown (Yes/No)  Ye  s
If Yes

 Field  Ty p e  Mandatory

 OSHC Company Name  Te  x  t  Ye  s

 Po l i c y  N u m b e r  Te  x  t  Ye  s

 Upload OSHC Policy  File Upload  Ye  s

 Policy Amount  Te  x  t  Ye  s

 Po l i c y  D u raM o n  Te  x  t  Ye  s
If No

Display the Set Reminder pop-up.
Reminder Purpose
•  Follow-up for OSHC Policy.
If University

No additional action is required.
If Agent
Display:
Have You Received the Policy?

 Field  Ty p e  Mandatory

 Po l i c y  Re c e i ve d  Dropdown (Yes/No)  Ye  s

---

## Page 56 of 83

If Ye  s

 Field  Ty p e  Mandatory

 OSHC Company Name  Te  x  t  Ye  s

 Po l i c y  N u m b e r  Te  x  t  Ye  s

 Amount  Currency  Ye  s

 Upload OSHC Policy  File Upload  Ye  s
If No
•  Display the Set Reminder pop-up.
If Student
Display:
Have You Received the Policy?

 Field  Ty p e  Mandatory

 Po l i c y  Re c e i ve d  Dropdown (Yes/No)  Ye  s
If Ye  s

 Field  Ty p e  Mandatory

 OSHC Company Name  Te  x  t  Ye  s

 Po l i c y  N u m b e r  Te  x  t  Ye  s

 Amount  Currency  Ye  s

 Upload OSHC Policy  File Upload  Ye  s
If No
•  Display the Set Reminder pop-up.
C. Acceptance Submission

 Field  Ty p e  Mandatory

 Acceptance Submitted  Dropdown (Yes/No)  Ye  s

---

## Page 57 of 83

Business Logic
If Acceptance Submitted = Yes
System Action
•  Mark the GS Approved Stage as completed.
•  Automatically move the application to the Acceptance Stage.
If Acceptance Submitted = No
Display:

Field  Ty p e  Mandatory

Any Pending Conditions?  Dropdown (Yes/No)  Ye  s
If No

Display the Set Reminder pop-up.
Reminder Purpose
•  Follow-up for Acceptance Submission.
If Yes
Display:

Field  Ty p e  Mandatory

Condition Details  Text Area  Ye  s
Display:

Field  Ty p e  Mandatory

Condition Completed  Dropdown (Yes/No)  Ye  s
If Condition Completed = Yes
•  Display the  Set Reminder pop-up for Acceptance Submission.
If Condition Completed = No

---

## Page 58 of 83

•  Display the Set Reminder pop-up for completion of pending conditions.

Interview Before Acceptance

This section should be displayed only if:
•  Interview was selected in Offer Letter → Conditions, and
•  Interview Required Before = Before Acceptance.

The  complete Interview  Before  Acceptance workflow  (Interview  Deadline,  Student
Preparation, Schedule Interview, and Reminder Logic) will follow the same process defined in
the GS Processing Stage.
Enhancement Required
•  Implement two separate workflows for Tuition  F  e  e  P  a  y  m  e  n  t:

  o  Counselor
Workflow (covered in this section)

  o  Accounts Department
Workflow (to be implemented separately).
•  Implement  automatic  transiMon  to  the OSHC section  after  successful  tuition  fee
  payment.
•  Implement automatic transiMon to the Acceptance Stage once Acceptance Submitted
  = Yes.
•  Ensure all reminder pop-ups support:

  o  Reminder Date

  o  Reminder Time

  o  Short Note / Remarks
•  Automatically deactivate reminders once the  respective task has been completed.

Acceptance Stage
A. Interview Before COE

This  section  should  be  displayed only  if  the  "Interview"  condi'on  is  selected in  the Offer
Letter Stage and the interview is required Before COE.
Business Logic
•
If Interview  Required  Before  =  Before  COE,  the Interview  Before  COE section  should
  automatically become available in the Acceptance Stage.

---

## Page 59 of 83

•  If this condition is not selected, the section should remain hidden.

Interview Deadline

 Field  Ty p e  Mandatory

 Interview Deadline  Date Picker  Ye  s

Set Reminder
The reminder pop-up should allow the user to configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks
Business Logic
•  If  the  interview  is  completed  before  the  deadline,  the  reminder  should  be
  automatically deactivated.
•  If the interview is not completed, the reminder should remain active until completion.

Student Prepared

 Field  Ty p e  Mandatory

 Student Prepared  Dropdown (Yes/No)  Ye  s
If Student Prepared = Yes
Display:

 Field  Ty p e  Mandatory

 Schedule Interview  Dropdown (Yes/No)  Ye  s
If Schedule Interview = Yes
•  Prepare the student for the interview.
•  Set a reminder for the Interview Date.
If Schedule Interview = No
•  Set a reminder to follow up for interview scheduling.

---

## Page 60 of 83

If Student Prepared = No
•  Prepare the student for the interview.
•  Set a reminder to follow up on student preparation.
B. COE Requirements

Any Requirements Before COE?

Field  Ty p e  Mandatory

Any Requirements  Dropdown (Yes/No)  Ye  s
Business Logic
If Any Requirements = No

Display the Set Reminder pop-up.

The reminder should allow the user to configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks
Reminder Purpose
•  Follow-up for COE Receipt.
If Any Requirements = Yes
Display:

Field  Ty p e  Mandatory

Requirement Details  Text Area  Ye  s

Requirements Completed

---

## Page 61 of 83

Field  Ty p e  Mandatory

Requirements Completed  Dropdown (Yes/No)  Ye  s
If Requirements Completed = Yes
Display:

Field  Ty p e  Mandatory

Completion Details  Text Area  Ye  s

Supporting Documents  File Upload  Ye  s

After uploading the documents:
•  Display the  Set Reminder pop-up.

The user can configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks
Reminder Purpose
•  Follow-up for COE Receipt.
If Requirements Completed = No

Display the  Set Reminder pop-up.
The reminder should allow the user to configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks
Reminder Purpose
•  Follow-up for completion of pending requirements.
C. Confirma'on of COE

Have You Received the COE?

---

## Page 62 of 83

Field  Ty p e  Mandatory

COE Received  Dropdown (Yes/No)  Ye  s
Business Logic
If COE Received = Yes
System Action
•  Mark the Acceptance Stage as completed.
•  Automatically move the application to the COE Stage.
If COE Received = No

Display the Set Reminder pop-up.
The reminder should allow the user to configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks
Reminder Purpose
•  Follow-up for COE Receipt.
Enhancement Required
•  The  Interview  Before  COE section  should  be  displayed  dynamically  only  when
  Interview Required Before = Before COE.
•  All reminder pop-ups should include:

  o  Reminder Date

  o  Reminder Time

  o  Short Note / Remarks
•  Reminders  should  automatically  deactivate  once  the  interview  is  completed,  pending
  requirements are fulfilled, or the COE is received.
•  When  COE  Received  =  Yes,  the  application  should  automatically  move  to  the COE
  Stage.

---

## Page 63 of 83

eCOE Stage – Renam e to eCO E
A. Confirma'on of Enrolment (COE)

Field  Ty p e  Mandatory

COE  File Upload  Ye  s

Send COE to Student Chat  Dropdown (Yes/No)  Ye  s

Intake Date  Date Picker  Ye  s
Business Logic
•  Upload the COE document.
•
If Send  COE  to  Student  Chat  =  Yes,  the  COE  should  be  automatically  shared  in  the
  student's chat.
•
If No, no action is required.
B. Medical Examination

Medical Arranged By

Field  Ty p e  Mandatory

Medical Arranged By  Dropdown  Ye  s

Ava i l a b l e  O p ' o n s
•  Our Side
•  Agent
•  Student
If Our Side

Medical Scheduled

Field  Ty p e  Mandatory

Medical Scheduled  Dropdown  Ye  s
  (Yes/No)
Business Logic
If Medical Scheduled = Yes

---

## Page 64 of 83

•  Set a reminder to follow up until the Medical Report is received.
If Medical Scheduled = No
•  Set a reminder to schedule the medical examination.
If Agent

Field  Ty p e  Mandatory

Upload Medical Report  File Upload  Ye  s
If Student

Field  Ty p e  Mandatory

Upload Medical Report  File Upload  Ye  s
C. Form 956A

Field  Ty p e  Mandatory

Form 956A Completed  Dropdown (Yes/No)  Ye  s
Business Logic
If Yes

Field  Ty p e  Mandatory

Upload Form 956A  File Upload  Ye  s
If No
•  Display the Set Reminder pop-up to complete Form 956A.
D. Mandatory Visa Documents

Field  Ty p e  Mandatory

Visa SOP  File Upload  Ye  s

Original Financial Documents  File Upload  Ye  s

---

## Page 65 of 83

Field  Ty p e  Mandatory

Financial Matrix  File Upload  Ye  s
E. Visa File Lodgement

File Lodged By (table View)

Field  Ty p e  Mandatory

File Lodged By  Dropdown  Ye  s

Ava i l a b l e  O p ' o n s
•  Our Side
•  Agent
•  Student
•  Ve  n  d  o  r
If Our Side
Display:

Field  Ty p e  Mandatory

Login ID  Te  x  t  Ye  s

Password  Password  Ye  s

Visa Application Checked By  Dropdown  Ye  s

Upload Visa  Application  File Upload  Ye  s

Visa Application Checked By
•  Agent
•  Student

Visa File Lodged

Field  Ty p e  Mandatory

Visa File Lodged  Dropdown (Yes/No)  Ye  s

---

## Page 66 of 83

If Yes
System Action
•  Automatically move the application to the File Lodged Stage.
If No
•  Display the Set Reminder pop-up to follow up for Visa File Lodgement.
If Agent
Display:

Field  Ty p e  Mandatory

Visa File Lodged  Dropdown (Yes/No)  Ye  s
Business Logic
•
If Yes: Move the application to the File Lodged Stage.
•
If No: Display the Set Reminder pop-up for Visa File Lodgement.
If Student
Display:

Field  Ty p e  Mandatory

Visa File Lodged  Dropdown (Yes/No)  Ye  s
Business Logic
•
If Yes: Move the application to the File Lodged Stage.
•
If No: Display the Set Reminder pop-up for Visa File Lodgement.
If Vendor
Display:

Field  Ty p e  Mandatory

Visa File Lodged  Dropdown (Yes/No)  Ye  s
Business Logic
•
If Yes: Move the application to the File Lodged Stage.

---

## Page 67 of 83

•
If No: Display the Set Reminder pop-up for Visa File Lodgement.

Reminder Functionality

Whenever a reminder is required in this stage, the Set Reminder pop-up should allow the user
to configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks
Enhancement Required
•  Implement the Send COE to Student Chat functionality.
•  Implement reminder functionality for Medical, Form 956A, and Visa File Lodgement.
•  Automatically  move  the  application  to  the File  Lodged  Stage once Visa  File  Lodged  =
  Ye  s, irrespective of who lodges the application.
•  Ensure  all  uploaded  documents  are  stored  against  the  respective  application  and
  remain accessible throughout the visa processing lifecycle.

 File Lodged Stage
A. Visa Lodgement Details

 Field  Ty p e  Mandatory

 TRN Number  Te  x  t  Ye  s

 IMMI Acknowledgement  File Upload  Ye  s

 HAP ID  File Upload  Ye  s
B. Visa Decision Status
Decision Received

 Field  Ty p e  Mandatory

 Decision Received  Dropdown (Yes/No)  Ye  s

---

## Page 68 of 83

Business Logic
If Decision Received = No
Display:

Field  Ty p e  Mandatory

Have You Checked the Visa Status?  Dropdown (Yes/No)  Ye  s
If Visa Status Checked = Yes
Display:

Field  Ty p e  Mandatory

Upload Visa Status Screenshot  File Upload  Ye  s

Display the  Set Reminder pop-up.

The user should be able to configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks
Reminder Purpose
•  Follow-up for Visa Decision.
If Visa Status Checked = No
Display:

Field  Ty p e  Mandatory

Reason for Not Checking Visa Status  Text Area  Ye  s
System Action
•  Automatically notify the  Concerned Manager / Higher Authority  with:

  o  Application ID

  o  Student Name

  o  Counselor Name

  o  Reason entered by the counselor

---

## Page 69 of 83

The  noMficaMon  should  appear  in  the  higher  authority's  dashboard  for  review  and necessary
action.
If Decision Received = Yes
Display:

Field  Ty p e  Mandatory

Visa Decision  Dropdown  Ye  s

Ava i l a b l e  O p ' o n s
•  Visa Granted
•  Visa Refused
If Visa Granted
System Action
•  Change the application status to Visa Granted.
•  Automatically move the application to the Visa Granted Stage.
•  Notify  the Accounts  Department with  all  relevant  application  details  and  uploaded
  documents.
If Visa Refused
System Action
•  Change the application status to Visa Refused.
•  Automatically move the application to the Visa Refused Stage.

Reminder Functionality

Whenever a reminder is required in this stage, the Set Reminder pop-up should allow the user
to configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks

---

## Page 70 of 83

Enhancement Required
•  Implement  automatic  noMficaMon  to  the Concerned  Manager  /  Higher  Authority
  when the counselor has not checked the visa status.
•  Implement automatic noMficaMon to the  Accounts Department  when a visa is granted.
•  Automatically  move  the  application  to  the  appropriate  stage  based  on  the  visa
  decision.
•  Ensure  all  uploaded  documents  (TRN,  IMMI  Acknowledgement,  HAP  ID,  Visa  Status
  Screenshot) remain linked to the application record.

Visa Granted Stage
A. Visa Grant Details

 Field  Ty p e  Mandatory

 Visa Grant Copy  File Upload  Ye  s
B. Student Enrolment
Student Enrolled

 Field  Ty p e  Mandatory

 Student Enrolled  Dropdown (Yes/No)  Ye  s
Business Logic
If Student Enrolled = Yes
System Action
•  Mark the Visa Granted Stage as completed.
•  Automatically move the application to the Enrolment Stage.
If Student Enrolled = No

Display the Set Reminder pop-up.

The reminder should allow the user to configure:
•  Reminder Date

---

## Page 71 of 83

•  Reminder Time
•  Short Note / Remarks
Reminder Purpose
•  Follow-up for Student Enrolment.
The application will remain in the  Visa Granted Stage until the student is marked as Enrolled.

Reminder Functionality

Whenever a reminder is required in this stage, the Set Reminder pop-up should allow the user
to configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks

The reminder should automatically deactivate once  Student Enrolled = Yes  .

Enrolment Stage
A. Enrolment Proof

Field  Ty p e  Mandatory

Enrolment Proof  File Upload  Ye  s

Examples of Enrolment  Proof:
•  ConfirmaMon of Enrolment Letter
•  Student ID Card
•  Class Registration ConfirmaMon
•  University Enrolment ConfirmaMon
•  Any other oﬃcial enrolment document issued by the institution
Business Logic
•  The counselor must upload the student's oﬃcial enrolment proof.
•  The uploaded document should be securely linked to the respective application.
•  The document should remain accessible for future reference and auditing purposes.

---

## Page 72 of 83

System Action

Once the Enrolment Proof is successfully uploaded:
•  Mark the Enrolment Stage as Completed.
•  Mark the entire application as Completed.
•  Change the application status to Completed.
•  Record the application completion date in the system.

Onshore College Change Stage

Note:  This  stage  should  be visible  only  to  internal  users (Counselor/Admin/Manager).  It
should not be visible to Agents or Students.
A. Country Eligibility

Is Onshore College Change Allowed in This Country?

Field  Ty p e  Mandatory

Onshore College Change  Allowed  Dropdown (Yes/No)  Ye  s
Business Logic
If No
System Action
•  Close the Onshore College Change case.
•  No further action is required.
If Yes

Display the following section.
B. Student Request

Does the Student Want to Change College?

---

## Page 73 of 83

Field  Ty p e  Mandatory

Student Wants to Change College  Dropdown (Yes/No)  Ye  s
Business Logic
If No
•  No further action is required.
•  Keep the current application active.
If Yes
Display:

Field  Ty p e  Mandatory

College Change Requested Through  Dropdown  Ye  s

Ava i l a b l e  O p ' o n s
•  Ganpati House of Achievers (GHA)
•  Others
If College Change Requested Through = Others
Display:

Field  Ty p e  Mandatory

Reason for Choosing Another Consultant  Text Area  Ye  s

Number of Follow-up / Convincing Attempts Made  Number  Ye  s
System Action
•  Save the reason and follow  -up details.
•  Close the Onshore College Change case.
If College Change Requested Through = Ganpati House of Achievers (GHA)
Display:
Current Application Stage

---

## Page 74 of 83

Field  Ty p e  Mandatory

Current Stage  Dropdown  Ye  s

Ava i l a b l e  O p ' o n s
•  Processing
•  Offer Letter
•  COE
•  Enrolled
Business Logic
•  Create a new Onshore College Change application linked to the existing student.
•  The newly created application should start from the stage selected above.
•  Link both applications for future reference and reporting.
System Actions
•  Automatically notify the Accounts Department with:

  o  Student Details

  o  Existing Application ID

  o  New Onshore Application ID

  o  Current Stage

  o  Uploaded Documents
•  Transfer  all  applicable  documents  from  the  previous  application  to  the  new  Onshore
  application.
•  Maintain a complete audit trail of the college change request.

Refusal Handling

If  the  student  receives  a  visa  or  application  refusal  during  the  Onshore  College  Change
process:
System Action
•  Automatically change the application status to Refused.

---

## Page 75 of 83

•  Move the application to the Refused Stage.
Enhancement Required
•  Restrict access to this stage for Agents and Students.
•  Allow access only to authorized internal users.
•  Automatically create and link a new Onshore College Change application.
•  Notify the Accounts Department whenever a new Onshore application is created.
•  Ensure all relevant documents and application history are carried forward to the new
  application.
•  Maintain complete audit logs for all Onshore College Change activities.

Refused Stage
A. Visa Refusal Details

Field  Ty p e  Mandatory

Visa Refusal Letter  File Upload  Ye  s

Send Refusal Letter to Student Chat  Dropdown (Yes/No)  Ye  s
Business Logic
•  Upload the oﬃcial Visa Refusal Letter.
•
If Send  Refusal  Letter  to  Student  Chat  =  Yes,  the  uploaded  refusal  letter  should  be
  automatically shared in the student's chat.
•
If No, no further action is required.
B. Refund Processing

Refund Processed By

Field  Ty p e  Mandatory

Ref u n d  Pro c es s ed  By  Dropdown  Ye  s

Ava i l a b l e  O p ' o n s
•  Our Side
•  Agent

---

## Page 76 of 83

•  Student
If Refund Processed By = Our Side

Refund Form Filled By

Field  Ty p e  Mandatory

Ref u n d  Fo rm  F i l l ed  By  Dropdown  Ye  s

Ava i l a b l e  O p ' o n s
•  Student
•  Agent

Note: The refund form must not be filled by any member of the GHA team.

Refund Form Cross Checked

Field  Ty p e  Mandatory

Ref u n d  Fo rm  C ro s s  C h ec ked  Dropdown (Yes/No)  Ye  s

Upload Refund Form

Field  Ty p e  Mandatory

Ref u n d  Fo rm  File Upload  Ye  s

Declara'on

The following declaraMon should be displayed before submission:
Declara'on:
I  confirm  that  the  refund  form  has not  been  completed  by  any  GHA  team  member.  I
understand that if incorrect account details are provided due to negligence, the responsibility
for any refund-related issues will lie with the person submitting this information.

Employee Details

---

## Page 77 of 83

Field  Ty p e  Mandatory

Employee Name  Te  x  t  Ye  s

Employee Position  Te  x  t  Ye  s

Employee Code  Te  x  t  Ye  s

OSHC Refund

Field  Ty p e  Mandatory

OSHC Refund Form  File Upload  Optional
C. Future Processing  – take it to the last step

Does the Student Want to Apply for Another Country?

Field  Ty p e  Mandatory

Process in Another Country  Dropdown (Yes/No)  Ye  s
Business Logic
If No
Display:

Field  Ty p e  Mandatory

Comments  Text Area  Ye  s

Exact Reason  Text Area  Ye  s
System Action
•  Close the application.
If Yes
Display:

---

## Page 78 of 83

Field  Ty p e  Mandatory

 Country  Dropdown  Ye  s

 Concern Handling Team / Assigned Person  Dropdown  Ye  s
System Action
•  Create a  new application for the selected country.
•  Assign the application to the selected Concern Handling Team / Person.
•  Link  the  previous  refused  application  with  the  newly  created  application  for  future
  reference.
•  Carry forward applicable student details and documents to the new application.
Enhancement Required
•  Implement the Send Refusal Letter to Student Chat functionality.
•  Ensure  refund  forms  can  only  be  uploaded  after  compleMng  the  mandatory
  declaraMon.
•  Automatically create and assign a new application when the student chooses to apply
  for another country.
•  Maintain  an  audit  trail  linking  the  refused application  with  the  new  application  for
  reporting and tracking purposes.

Refund Processing Stage
A. Tuition Fee Refund

Tuition  F  e  e  R  e  f  u  n  d  R  e  c  e  i  v  e  d

 Field  Ty p e  Mandatory

 Tu  i  M  o  n  F  e  e  R  e  f  u  n  d  R  e  c  e  i  v  e  d Dropdown (Yes/No) Ye  s
Business Logic
If Tuition Fee Refund Received = Yes
System Action

---

## Page 79 of 83

•  Mark the Tuition Fee Refund as completed.
•  Automatically move the application to the Refund Stage.
If Tuition Fee Refund Received = No
Display the Set Reminder pop-up.

The reminder should allow the user to configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks
Reminder Purpose
•  Follow-up for Tuition Fee Refund.
B. OSHC Refund

OSHC Refund Received

Field  Ty p e  Mandatory

OSHC Refund Received  Dropdown (Yes/No)  Ye  s
Business Logic
If OSHC Refund Received = Yes
Display:

Field  Ty p e  Mandatory

Refund Receipt / Invoice  File Upload  Ye  s
If OSHC Refund Received = No
Display the  Set Reminder pop-up.

The reminder should allow the user to configure:
•  Reminder Date
•  Reminder Time

---

## Page 80 of 83

•  Short Note / Remarks
Reminder Purpose
•  Follow-up for OSHC Refund.

Reminder Functionality

Whenever a reminder is required in this stage, the  Set Reminder pop-up should allow the user
to configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks

The  reminder  should  automatically  deactivate  once  the  corresponding  refund  has  been
received.
Enhancement Required
•  Automatically move the application to the Refund  Stage once the Tuition  F  e  e  R  e  f  u  n  d
  Received status is updated to  Ye  s.
•  Ensure  the  uploaded OSHC  Refund  Receipt/Invoice is  stored  against  the  application
  record.
•  Automatically deactivate all pending refund reminders once the respective refund has
  been received.

Refunded Stage
A. Tuition Fee Refund Verifica'on
Is There Any Issue with the Tuition  F  e  e  R  e  f  u  n  d  ?

 Field  Ty p e  Mandatory

 Tuition Fee Refund Issue  Dropdown (Yes/No)  Ye  s
Business Logic
If Tuition Fee Refund Issue = No
Display:

---

## Page 81 of 83

OSHC Refund Received

Field  Ty p e  Mandatory

OSHC Refund Received  Dropdown (Yes/No)  Ye  s
If OSHC Refund Received = No

Display the Set Reminder pop-up.
The reminder should allow the user to configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks
Reminder Purpose
•  Follow-up for OSHC Refund.
If OSHC Refund Received = Yes
Display:

Field  Ty p e  Mandatory

Tuition Fee Refund Invoice  File Upload  Ye  s
System Action
•  Upload the Tuition Fee Refund Invoice.
•  Mark the  Refunded Stage as completed.
•  Close the application.
If Tuition Fee Refund Issue = Yes
Display:

Field  Ty p e  Mandatory

Refund Issue  Details  Text Area  Ye  s
Display:

---

## Page 82 of 83

Field  Ty p e  Mandatory

Refund Issue Resolved  Dropdown (Yes/No) Ye  s
If Refund Issue Resolved = Yes
Display:

OSHC Refund Received

Field  Ty p e  Mandatory

OSHC Refund Received  Dropdown (Yes/No)  Ye  s
If OSHC Refund Received = No
•  Display the Set Reminder pop-up for OSHC Refund.
If OSHC Refund Received = Yes
Display:

Field  Ty p e  Mandatory

Tuition Fee Refund Invoice  File Upload  Ye  s
System Action
•  Upload the Tuition Fee Refund Invoice.
•  Mark the  Refunded Stage as completed.
•  Close the application.
If Refund Issue Resolved = No

Display the  Set Reminder pop-up.
The reminder should allow the user to configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks
Reminder Purpose
•  Follow-up for Refund Issue Resolution.

The application will remain in the  Refunded Stage until the refund issue is resolved.

---

## Page 83 of 83

Reminder Functionality

Whenever a reminder is required in this stage, the Set Reminder pop-up should allow the user
to configure:
•  Reminder Date
•  Reminder Time
•  Short Note / Remarks

All  reminders  should  automatically  deactivate  once  the  corresponding  task  has  been
completed.
Enhancement Required
•  Automatically close the application once:

  o  There are no refund issues,

  o  The OSHC refund has been received, and

  o  The Tuition  F  e  e  R  e  f  u  n  d  I  n  v  o  i  c  e has been uploaded.
•  Ensure all refund  -related documents remain linked to the application.
•  Implement  automatic  reminder  deactivation  once  the  refund  issue  is  resolved  or  the
  OSHC refund is received.
•  Maintain  a  complete  audit  trail  for  refund  verification,  issue  resolution,  and  case
  closure.

---
