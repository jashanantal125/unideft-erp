# One-off builder: align Application UK fields with Application (Australia) where shared.
# Run: bench --site SITE execute erpnext.crm.doctype.application_uk.build_application_uk_schema.build

import copy
import json
from pathlib import Path

MODULE_DIR = Path(__file__).parent
AU_JSON = MODULE_DIR.parent / "application" / "application.json"
UK_JSON = MODULE_DIR / "application_uk.json"

# Details first (like Application) — meta fields must sit inside this tab,
# otherwise Frappe creates an extra implicit "Details" tab for pre-tab fields.
UK_DETAILS = [
	"details_tab",
	"naming_series",
	"application",
	"uk_current_stage",
	"single_basis_only",
	"application_section",
	"student",
	"student_email",
	"student_contact_no",
	"agent",
	"column_break_jdtj",
	"application_type",
	"status",
	"country_flow_case",
	"column_break_ilyf",
	"dob",
	"current_age",
	"martial_status",
	"higher_education",
	"details_program_section",
	"preferred_university",
	"column_break_details_program_1",
	"intake",
	"column_break_details_program_2",
	"assigned_team",
	"assigned_executive",
	"details_courses_section",
	"preferred_courses",
	"details_visa_section",
	"any_visa_refused",
	"column_break_details_visa_1",
	"visa_refusal_letters",
	"visa_refused_ok",
	"details_study_gap_section",
	"study_gap",
	"column_break_details_gap_1",
	"study_gap_ok",
	"study_gap_next_stage_note",
]

# Processing — Application information_tab (no spouse block on UK single-basis cases)
UK_PROCESSING = [
	"information_tab",
	"section_a_email",
	"is_package_case",
	"data_swym",
	"recovery_email_id",
	"column_break_section_a",
	"password",
	"login_contact_no",
	"section_b_documents",
	"twelfth_admit_card_uploaded",
	"school_domain_email",
	"documents_10th_to_12th",
	"documents_verified",
	"documents_verified_pdf",
	"documents_not_accepted_alert",
	"school_digi_locker_id",
	"school_digi_locker_password",
	"column_break_section_b",
	"section_c_english_test",
	"english_test_details",
	"section_d_study_gap_proof",
	"study_gap_proof_list",
	"section_d_passport",
	"passport_upload",
	"column_break_section_d",
	"section_e_lor",
	"academic_lor_list",
	"section_e_processing_agent",
	"processing_agent_details",
	"section_f_applications",
	"application_filled_by",
	"application_form_1_upload",
	"application_form_2_upload",
	"application_form_3_upload",
	"application_form_4_upload",
	"sop_upload",
	"sop_portal_or_vendor_upload",
	"application_submitted",
]

UK_SUBMITTED = [
	"submitted_tab",
	"submitted_date",
	"any_further_requirement_offer_letter",
	"no_further_requirement_note",
	"pending_requirement_details",
	"pending_requirements_completed",
	"pending_requirements_reminder_note",
	"pending_requirements_completed_yes_note",
	"supporting_documents",
]

UK_OFFER = [
	"offer_tab",
	"offer_section",
	"offer_currency",
	"university_name",
	"course_name",
	"university_intake",
	"column_break_offer_1",
	"full_year_tuition_fee",
	"scholarship",
	"payable_fee",
	"living_expenses_location",
	"living_expenses",
	"funds_required_type",
	"funds_required_amount",
	"deposit_deadline",
	"tuition_paid_before_deadline",
	"conditions_on_offer_letter",
	"section_break_offer_docs",
	"offer_letter_upload",
	"send_offer_to_chat",
	"other_documents_offer",
	"defer_offer_required",
	"defer_offer_ok",
	"applied_for_defer_offer_letter",
	"applied_for_defer_offer_yes_section",
	"defer_any_further_requirement",
	"defer_no_further_requirement_note",
	"defer_pending_requirement_details",
	"defer_pending_requirements_completed",
	"defer_pending_requirements_reminder_note",
	"defer_pending_requirements_completed_yes_note",
	"defer_supporting_documents",
	"applied_for_defer_offer_no_note",
	"defer_offer_section",
	"defer_offer_currency",
	"defer_university_name",
	"defer_course_name",
	"defer_university_intake",
	"column_break_defer_1",
	"defer_full_year_tuition_fee",
	"defer_scholarship",
	"defer_payable_fee",
	"defer_living_expenses_location",
	"defer_living_expenses",
	"column_break_defer_2",
	"defer_funds_required_type",
	"defer_funds_required_amount",
	"section_break_defer_docs",
	"defer_offer_letter_upload",
	"defer_other_documents",
]

UK_FINANCIAL = [
	"financials_tab",
	"conditions_section",
	"conditions_note",
	"interview_condition_section",
	"interview_timing",
	"interview_deadline_date",
	"english_requirement_section",
	"english_requirement_details",
	"english_requirement_documents",
	"c_sponsors_section",
	"uk_sponsors",
	"gap_justification_section",
	"gap_justification_details",
	"gap_justification_documents",
	"verification_section",
	"verification_type",
	"academic_transcript_section",
	"academic_transcript_details",
	"academic_transcript_documents",
	"other_condition_section",
	"other_condition_details",
	"other_condition_documents",
	"student_prepare",
	"student_prepare_yes_status",
	"student_prepare_no_status",
	"schedule_interview",
	"schedule_interview_yes_status",
	"schedule_interview_no_status",
	"interview_status",
	"interview_second_chance",
	"funds_28_day_ok",
	"funds_meet_requirement",
	"medical_scheduled",
	"financial_docs_submitted",
	"financial_notes",
]

UK_ACCEPTANCE = [
	"acceptance_tab",
	"acceptance_submitted",
	"acceptance_submitted_status",
	"acceptance_not_submitted_status",
	"deposit_paid",
	"acceptance_docs",
]

UK_CAS = [
	"cas_tab",
	"cas_section",
	"cas_letter_received",
	"cas_any_pendency",
	"cas_pendency_details",
	"cas_pendency_completed",
	"cas_received",
	"cas_number",
	"cas_upload",
	"cas_notes",
	"sponsor_license_number",
	"cas_extension_required",
	"who_lodges_visa",
	"ihs_number",
	"ihs_upload",
]

UK_FILE_LODGED = [
	"file_lodged_tab",
	"file_lodged_section",
	"visa_file_lodged",
	"gwf_number",
	"biometrics_done",
	"visa_lodge_docs",
	"biometric_date",
	"biometric_place",
	"expected_visa_decision",
	"trn_number",
	"immi_acknowledgement_upload",
]

UK_VISA = [
	"visa_tab",
	"visa_section",
	"visa_decision",
	"visa_copy_upload",
	"visa_notes",
	"evisa_activated",
	"share_code_received",
	"share_code_verified",
]

UK_ENROLLMENT = [
	"enrollment_tab",
	"enrollment_section",
	"student_enrolled",
	"student_enrolled_yes_status",
	"student_enrolled_no_status",
	"enrolment_docs",
	"student_id_card",
]

UK_REFUSED = [
	"visa_refused_tab",
	"refusal_reason",
	"refusal_letter_upload",
	"process_other_country",
	"other_country_name",
	"applied_for_refund",
]

UK_REFUND = [
	"refund_processing_tab",
	"refund_status",
	"refund_docs",
	"tuition_refund_received",
	"ihs_refund_received",
]

UK_FIELD_ORDER = (
	UK_DETAILS
	+ UK_PROCESSING
	+ UK_SUBMITTED
	+ UK_OFFER
	+ UK_FINANCIAL
	+ UK_ACCEPTANCE
	+ UK_CAS
	+ UK_FILE_LODGED
	+ UK_VISA
	+ UK_ENROLLMENT
	+ UK_REFUSED
	+ UK_REFUND
)

# Renames from old UK-only fieldnames (for patch migration)
UK_FIELD_RENAMES = {
	"uk_student_contact": "student_contact_no",
	"uk_student_email": "student_email",
	"uk_dob": "dob",
	"uk_age": "current_age",
	"uk_qualification": "higher_education",
	"uk_marital_status": "martial_status",
	"uk_study_gap": "study_gap",
	"uk_refused_any_country": "any_visa_refused",
	"uk_refusal_letters": "visa_refusal_letters",
	"preferred_intake": "intake",
	"uk_case_display": "country_flow_case",
	"uk_is_package_case": "is_package_case",
	"uk_our_email_id": "data_swym",
	"uk_email_password": "password",
	"uk_recovery_email": "recovery_email_id",
	"uk_login_contact_no": "login_contact_no",
	"uk_12th_admit_card": "twelfth_admit_card_uploaded",
	"uk_school_domain_email": "school_domain_email",
	"uk_digi_locker_id": "school_digi_locker_id",
	"uk_digi_locker_password": "school_digi_locker_password",
	"uk_documents_verified": "documents_verified",
	"uk_documents_pdf": "documents_verified_pdf",
	"uk_documents_not_accepted_reason": "documents_not_accepted_alert",
	"uk_english_tests": "english_test_details",
	"uk_study_gap_list": "study_gap_proof_list",
	"uk_lor_list": "academic_lor_list",
	"uk_passport_upload": "passport_upload",
	"uk_application_filled_by": "application_filled_by",
	"uk_application_form_1": "application_form_1_upload",
	"uk_application_form_2": "application_form_2_upload",
	"uk_application_form_3": "application_form_3_upload",
	"uk_application_form_4": "application_form_4_upload",
	"uk_sop_upload": "sop_upload",
	"uk_application_submitted": "application_submitted",
	"uk_further_requirement_offer": "any_further_requirement_offer_letter",
	"uk_pending_requirements": "pending_requirement_details",
	"uk_pending_requirements_completed": "pending_requirements_completed",
	"uk_supporting_documents": "supporting_documents",
	"uk_university_name": "university_name",
	"uk_course_name": "course_name",
	"uk_intake": "university_intake",
	"uk_tuition_fee": "full_year_tuition_fee",
	"uk_offer_letter_upload": "offer_letter_upload",
	"uk_scholarship": "scholarship",
	"uk_payable_fee_cas": "payable_fee",
	"uk_living_location": "living_expenses_location",
	"uk_living_expense": "living_expenses",
	"uk_funds_required": "funds_required_amount",
	"uk_deposit_deadline": "deposit_deadline",
	"uk_tuition_paid_before_deadline": "tuition_paid_before_deadline",
	"uk_defer_offer_required": "defer_offer_required",
	"uk_funds_28_day_ok": "funds_28_day_ok",
	"uk_funds_meet_requirement": "funds_meet_requirement",
	"uk_medical_scheduled": "medical_scheduled",
	"uk_financial_docs_submitted": "financial_docs_submitted",
	"uk_financial_notes": "financial_notes",
	"uk_acceptance_submitted": "acceptance_submitted",
	"uk_deposit_paid": "deposit_paid",
	"uk_acceptance_docs": "acceptance_docs",
	"uk_cas_letter_received": "cas_letter_received",
	"uk_cas_any_pendency": "cas_any_pendency",
	"uk_cas_pendency_details": "cas_pendency_details",
	"uk_cas_pendency_completed": "cas_pendency_completed",
	"uk_cas_received": "cas_received",
	"uk_cas_number": "cas_number",
	"uk_cas_upload": "cas_upload",
	"uk_cas_notes": "cas_notes",
	"uk_sponsor_license_number": "sponsor_license_number",
	"uk_cas_extension_required": "cas_extension_required",
	"uk_who_lodges_visa": "who_lodges_visa",
	"uk_ihs_number": "ihs_number",
	"uk_ihs_upload": "ihs_upload",
	"uk_visa_file_lodged": "visa_file_lodged",
	"uk_gwf_number": "gwf_number",
	"uk_biometrics_done": "biometrics_done",
	"uk_visa_lodge_docs": "visa_lodge_docs",
	"uk_biometric_date": "biometric_date",
	"uk_biometric_place": "biometric_place",
	"uk_expected_visa_decision": "expected_visa_decision",
	"uk_visa_decision": "visa_decision",
	"uk_visa_copy": "visa_copy_upload",
	"uk_visa_notes": "visa_notes",
	"uk_evisa_activated": "evisa_activated",
	"uk_share_code_received": "share_code_received",
	"uk_share_code_verified": "share_code_verified",
	"uk_enrolled": "student_enrolled",
	"uk_enrolment_docs": "enrolment_docs",
	"uk_student_id_card": "student_id_card",
	"uk_refusal_reason": "refusal_reason",
	"uk_refusal_letter_upload": "refusal_letter_upload",
	"uk_process_other_country": "process_other_country",
	"uk_other_country_name": "other_country_name",
	"uk_applied_for_refund": "applied_for_refund",
	"uk_refund_status": "refund_status",
	"uk_refund_docs": "refund_docs",
	"uk_tuition_refund_received": "tuition_refund_received",
	"uk_ihs_refund_received": "ihs_refund_received",
	"processing_tab": "information_tab",
	"financial_tab": "financials_tab",
	"offer_tab": "offer_tab",
	"enrolment_tab": "enrollment_tab",
	"refused_tab": "visa_refused_tab",
	"refund_tab": "refund_processing_tab",
}


def _patch_depends_on(expr):
	if not expr:
		return expr
	expr = expr.replace("doc.destination_country=='Australia'", "1")
	expr = expr.replace("destination_country=='Australia'", "1")
	expr = expr.replace(
		"in_list(frappe.user_roles, 'System Manager') || in_list(frappe.user_roles, 'Team Lead') || in_list(frappe.user_roles, 'Team Executive')",
		"1",
	)
	for old, new in UK_FIELD_RENAMES.items():
		expr = expr.replace(f"doc.{old}", f"doc.{new}")
		expr = expr.replace(old, new)
	return expr


def _patch_field(field, fieldname):
	f = copy.deepcopy(field)
	f["fieldname"] = fieldname

	if f.get("depends_on"):
		f["depends_on"] = _patch_depends_on(f["depends_on"])

	if fieldname == "any_visa_refused":
		f["label"] = "Refused from UK or any other country?"
	elif fieldname == "visa_refusal_letters":
		f["depends_on"] = "eval:doc.any_visa_refused=='Yes'"
	elif fieldname == "visa_refused_ok":
		f["depends_on"] = "eval:doc.any_visa_refused=='No'"
	elif fieldname == "study_gap_ok":
		f["depends_on"] = "eval:doc.study_gap=='No'"
	elif fieldname == "study_gap_next_stage_note":
		f = {
			"fieldname": "study_gap_next_stage_note",
			"fieldtype": "HTML",
			"label": " ",
			"depends_on": "eval:doc.study_gap=='Yes'",
			"options": '<p class="text-muted">Please fill in the study gap proof details in the <strong>Processing</strong> stage.</p>',
		}
	elif fieldname == "offer_currency":
		f["default"] = "GBP"
	elif fieldname == "higher_education":
		f["options"] = "\n12th pass\nGraduation\nPost-graduation\nOthers"
	elif fieldname == "martial_status":
		f["label"] = "Marital Status"
		f["options"] = "\nMarried\nSingle\nNot Married"
	elif fieldname == "living_expenses_location":
		f["fieldtype"] = "Select"
		f["label"] = "Living Expense Location"
		f["options"] = "\nInner London\nOuter London"
	elif fieldname == "living_expenses":
		f["label"] = "Living Expense"
		f["options"] = "GBP"
	elif fieldname == "payable_fee":
		f["label"] = "Payable Fee for CAS"
	elif fieldname == "funds_required_amount":
		f["label"] = "Funds Required"
		f["options"] = "GBP"
		f["read_only"] = 1
	elif fieldname == "english_test_details":
		f["options"] = "Application English Test"
	elif fieldname == "uk_sponsors":
		f = {
			"fieldname": "uk_sponsors",
			"fieldtype": "Table",
			"label": "Sponsors / Funds",
			"options": "Application UK Sponsor",
			"description": "Father / Mother / Student — funds type branches inside each row",
		}
	elif fieldname == "study_gap_proof_list":
		f["options"] = "Study Gap Proof"
	elif fieldname == "academic_lor_list":
		f = {
			"fieldname": "academic_lor_list",
			"fieldtype": "Table",
			"label": "Academic LOR",
			"options": "Application UK LOR",
		}
	elif fieldname == "school_domain_email":
		f = {
			"fieldname": "school_domain_email",
			"fieldtype": "Data",
			"label": "School Domain Email Id",
			"options": "Email",
		}
	elif fieldname == "application_submitted":
		f = {
			"fieldname": "application_submitted",
			"fieldtype": "Select",
			"label": "Application Submitted?",
			"options": "\nYes\nNo",
		}
	elif fieldname == "application":
		f.update({"hidden": 1, "read_only": 1, "label": "Application Index"})
	elif fieldname == "country_flow_case":
		f["read_only"] = 1
		f["label"] = "UK Case"
	elif fieldname == "uk_current_stage":
		f = {
			"fieldname": "uk_current_stage",
			"fieldtype": "Select",
			"label": "Current Stage",
			"options": "\nDetails\nProcessing\nSubmitted\nOffer Letter\nFinancial\nAcceptance\nCAS\nVisa Lodged\nVisa\nEnrolment\nVisa Refused\nRefund",
			"default": "Details",
			"in_list_view": 1,
			"reqd": 1,
		}
	elif fieldname == "naming_series":
		f.update({"default": "APP-UK-.YYYY.-", "options": "APP-UK-.YYYY.-", "hidden": 1})
	elif fieldname == "cas_tab":
		f = {"fieldname": "cas_tab", "fieldtype": "Tab Break", "label": "CAS"}
	elif fieldname == "cas_section":
		f = {"fieldname": "cas_section", "fieldtype": "Section Break", "label": "CAS"}
	elif fieldname.startswith("cas_") or fieldname in (
		"sponsor_license_number",
		"who_lodges_visa",
		"ihs_number",
		"ihs_upload",
	):
		old_key = "uk_" + fieldname if not fieldname.startswith("uk_") else fieldname
		# pull from old uk json via renames reverse
		pass

	return f


def _field_from_sources(fieldname, au_fields, uk_old_fields):
	if fieldname in ("study_gap_next_stage_note", "uk_current_stage", "cas_tab", "cas_section", "academic_lor_list", "school_domain_email", "application_submitted"):
		return _patch_field(au_fields.get(fieldname, {}), fieldname)

	if fieldname in au_fields:
		return _patch_field(au_fields[fieldname], fieldname)

	# try old uk name
	for old, new in UK_FIELD_RENAMES.items():
		if new == fieldname and old in uk_old_fields:
			return _patch_field(uk_old_fields[old], fieldname)

	if fieldname in uk_old_fields:
		return _patch_field(uk_old_fields[fieldname], fieldname)

	# minimal stubs for UK-only names
	stubs = {
		"visa_file_lodged": ("Select", "Visa File Lodged?", "\nYes\nNo"),
		"gwf_number": ("Data", "GWF Number", None),
		"biometrics_done": ("Select", "Biometrics Done?", "\nYes\nNo"),
		"visa_lodge_docs": ("Attach", "Visa Lodge Documents", None),
		"biometric_date": ("Date", "Biometric Date", None),
		"biometric_place": ("Data", "Biometric Place", None),
		"expected_visa_decision": ("Date", "Expected Visa Decision", None),
		"evisa_activated": ("Select", "E-Visa Activated?", "\nYes\nNo"),
		"share_code_received": ("Select", "Share Code Received?", "\nYes\nNo"),
		"share_code_verified": ("Select", "Share Code Verified?", "\nYes\nNo"),
		"enrolment_docs": ("Attach", "Enrolment Documents", None),
		"student_id_card": ("Attach", "Student ID Card", None),
		"refusal_reason": ("Small Text", "Refusal Reason", None),
		"refusal_letter_upload": ("Attach", "Refusal Letter", None),
		"process_other_country": ("Select", "Process Other Country?", "\nYes\nNo"),
		"other_country_name": ("Link", "Other Country", "Country"),
		"applied_for_refund": ("Select", "Applied for Refund?", "\nYes\nNo"),
		"refund_status": ("Select", "Refund Status", "\nNot Applicable\nPending\nProcessed"),
		"refund_docs": ("Attach", "Refund Documents", None),
		"tuition_refund_received": ("Select", "Tuition Refund Received?", "\nYes\nNo"),
		"ihs_refund_received": ("Select", "IHS Refund Received?", "\nYes\nNo"),
		"deposit_paid": ("Select", "Deposit Paid?", "\nYes\nNo"),
		"acceptance_docs": ("Attach", "Acceptance Documents", None),
		"cas_letter_received": ("Select", "CAS Letter Received?", "\nYes\nNo"),
		"cas_any_pendency": ("Select", "Any CAS Pendency?", "\nYes\nNo"),
		"cas_pendency_details": ("Small Text", "CAS Pendency Details", None),
		"cas_pendency_completed": ("Select", "CAS Pendency Completed?", "\nYes\nNo"),
		"cas_received": ("Select", "CAS Received?", "\nYes\nNo"),
		"cas_number": ("Data", "CAS Number", None),
		"cas_upload": ("Attach", "CAS Letter Upload", None),
		"cas_notes": ("Small Text", "CAS Notes", None),
		"sponsor_license_number": ("Data", "Sponsor License Number", None),
		"cas_extension_required": ("Select", "CAS Extension Required?", "\nYes\nNo"),
		"who_lodges_visa": ("Select", "Who Lodges Visa?", "\nStudent\nAgent\nVendor"),
		"ihs_number": ("Data", "IHS Number", None),
		"ihs_upload": ("Attach", "IHS Payment Proof", None),
		"funds_28_day_ok": ("Select", "28-day Funds Rule Met?", "\nYes\nNo"),
		"funds_meet_requirement": ("Select", "Showing Amount Meets Requirements?", "\nYes\nNo"),
		"medical_scheduled": ("Select", "Medical Scheduled?", "\nYes\nNo"),
		"financial_docs_submitted": ("Select", "Financial Documents Submitted?", "\nYes\nNo"),
		"financial_notes": ("Small Text", "Financial Notes", None),
		"interview_status": ("Select", "Interview Status", "\nPending\nApproved\nRejected"),
		"interview_second_chance": ("Select", "2nd Chance for Interview?", "\nYes\nNo"),
		"deposit_deadline": ("Date", "Deposit Deadline", None),
		"tuition_paid_before_deadline": ("Select", "Tuition Paid Before Deadline?", "\nYes\nNo"),
		"defer_living_expenses_location": ("Select", "Living Expense Location", "\nInner London\nOuter London"),
		"enrollment_section": ("Section Break", "Enrolment", None),
		"section_e_lor": ("Section Break", "Academic LOR", None),
	}
	if fieldname in stubs:
		entry = stubs[fieldname]
		ft, label, opts = entry if len(entry) == 3 else (*entry, None)
		f = {"fieldname": fieldname, "fieldtype": ft, "label": label}
		if opts:
			f["options"] = opts
		if fieldname == "other_country_name":
			f["depends_on"] = "eval:doc.process_other_country=='Yes'"
		return f

	return None


def build():
	au = json.loads(AU_JSON.read_text())
	uk_old = json.loads(UK_JSON.read_text())
	au_fields = {f["fieldname"]: f for f in au["fields"]}
	uk_old_fields = {f["fieldname"]: f for f in uk_old["fields"]}

	fields = []
	seen = set()
	for fieldname in UK_FIELD_ORDER:
		if fieldname in seen:
			continue
		f = _field_from_sources(fieldname, au_fields, uk_old_fields)
		if not f:
			print(f"WARN: missing field definition for {fieldname}")
			continue
		fields.append(f)
		seen.add(fieldname)

	fields = _compact_row_size(fields)

	out = copy.deepcopy(uk_old)
	out["field_order"] = [f["fieldname"] for f in fields]
	out["fields"] = fields
	out["title_field"] = "student"
	out["modified"] = "2026-07-28 12:00:00.000000"

	UK_JSON.write_text(json.dumps(out, indent=1) + "\n")
	print(f"Wrote {UK_JSON} with {len(fields)} fields")


def _compact_row_size(fields):
	"""Keep Select/Link; store long Data labels as Small Text to avoid MySQL row-size limits."""
	keep_data = {
		"student_email",
		"school_domain_email",
		"recovery_email_id",
		"login_contact_no",
		"gwf_number",
		"cas_number",
		"ihs_number",
		"sponsor_license_number",
		"biometric_place",
		"trn_number",
	}
	for f in fields:
		if f.get("fieldtype") == "Data" and f.get("fieldname") not in keep_data:
			if f.get("options") in ("Email", "Phone"):
				continue
			f["fieldtype"] = "Small Text"
	return fields


if __name__ == "__main__":
	build()
