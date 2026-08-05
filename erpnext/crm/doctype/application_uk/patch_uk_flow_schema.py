#!/usr/bin/env python3
"""Patch Application UK Offer/Interview/Acceptance/CAS/Visa Lodged/Visa flow to match UK process PDF."""

from __future__ import annotations

import copy
import json
from pathlib import Path

JSON_PATH = Path(__file__).with_name("application_uk.json")

HAS_INTERVIEW = (
	"doc.conditions_on_offer_letter && Array.isArray(doc.conditions_on_offer_letter) "
	"&& doc.conditions_on_offer_letter.some(function(r){ return (r.condition || '').indexOf('Interview') !== -1; })"
)
BEFORE = f"{HAS_INTERVIEW} && doc.interview_timing == 'Before Deposit'"
AFTER = f"{HAS_INTERVIEW} && doc.interview_timing == 'After Deposit'"
OTHER = f"{HAS_INTERVIEW} && doc.interview_timing == 'Other'"
CAS_SHIELD = f"{BEFORE} && doc.before_deposit_method == 'CAS Shield'"
# Prepare/schedule flow shown for Before Deposit (any method), After Deposit (after initial paid), Other
PREPARE_BASE = (
	f"(({BEFORE}) || ({AFTER} && doc.initial_amount_paid == 'Yes') || ({OTHER}))"
)
OUR_TEAM = "doc.who_lodges_visa == 'Our Team'"
VISA_LODGED_YES = "doc.visa_file_lodged == 'Yes'"
VISA_APPROVED = "doc.visa_decision == 'Visa Approved'"
VISA_REFUSED = "doc.visa_decision == 'Visa Refused'"


def _dep(expr: str) -> str:
	"""Ensure a single eval: prefix for depends_on."""
	expr = (expr or "").strip()
	if expr.startswith("eval:"):
		return expr
	return f"eval:{expr}"


def f(
	fieldname,
	fieldtype,
	label=None,
	*,
	options=None,
	depends_on=None,
	default=None,
	read_only=None,
	description=None,
	hidden=None,
	reqd=None,
	bold=None,
):
	out = {"fieldname": fieldname, "fieldtype": fieldtype}
	if label is not None:
		out["label"] = label
	if options is not None:
		out["options"] = options
	if depends_on is not None:
		out["depends_on"] = _dep(depends_on)
	if default is not None:
		out["default"] = default
	if read_only is not None:
		out["read_only"] = read_only
	if description is not None:
		out["description"] = description
	if hidden is not None:
		out["hidden"] = hidden
	if reqd is not None:
		out["reqd"] = reqd
	if bold is not None:
		out["bold"] = bold
	return out


def note(fieldname, text, depends_on, label="Note"):
	return f(
		fieldname,
		"Small Text",
		label,
		default=text,
		depends_on=depends_on,
		read_only=1,
		bold=1,
	)


def yn(fieldname, label, depends_on=None):
	return f(fieldname, "Select", label, options="\nYes\nNo", depends_on=depends_on)


def interview_block():
	"""Financials → Interview Condition (UK Before/After Deposit/Other)."""
	fields = [
		f("interview_condition_section", "Section Break", "Interview Condition", depends_on=HAS_INTERVIEW),
		f(
			"interview_timing",
			"Select",
			"Interview Timing",
			options="\nBefore Deposit\nAfter Deposit\nOther",
			depends_on=HAS_INTERVIEW,
			description="When the interview is required relative to deposit / CAS.",
		),
		# Before Deposit
		f(
			"before_deposit_method",
			"Select",
			"Before Deposit Method",
			options="\nCAS Shield\nManual",
			depends_on=BEFORE,
		),
		f(
			"interview_deadline_date",
			"Date",
			"Interview Deadline Date",
			depends_on=CAS_SHIELD,
			description="Reminder auto-deactivates when interview is done before this date.",
		),
		# After Deposit
		f(
			"initial_deposit_amount_payable",
			"Currency",
			"Initial Deposit Amount Payable",
			options="offer_currency",
			depends_on=AFTER,
		),
		yn("initial_amount_paid", "Initial Amount Paid?", AFTER),
		note(
			"initial_amount_paid_no_note",
			"→ Set reminder to pay initial amount",
			f"{AFTER} && doc.initial_amount_paid == 'No'",
		),
		# Other
		f("interview_other_details", "Small Text", "Other Interview Details", depends_on=OTHER),
		# Shared prepare / schedule (Before Deposit any method; After Deposit after paid; Other)
		yn("student_prepare", "Student Prepare for Interview?", PREPARE_BASE),
		note(
			"student_prepare_yes_status",
			"✓ If scheduled → reminder for interview; if not → reminder to schedule interview",
			f"{PREPARE_BASE} && doc.student_prepare == 'Yes'",
			"Status",
		),
		note(
			"student_prepare_no_status",
			"⚠ Prepare student — set reminder to prepare student",
			f"{PREPARE_BASE} && doc.student_prepare == 'No'",
			"Status",
		),
		yn(
			"interview_scheduled",
			"Interview Scheduled?",
			f"{PREPARE_BASE} && doc.student_prepare == 'Yes'",
		),
		f(
			"interview_date",
			"Date",
			"Interview Date",
			depends_on=f"{PREPARE_BASE} && doc.student_prepare == 'Yes' && doc.interview_scheduled == 'Yes'",
		),
		note(
			"interview_scheduled_no_note",
			"→ Set reminder to schedule interview",
			f"{PREPARE_BASE} && doc.student_prepare == 'Yes' && doc.interview_scheduled == 'No'",
		),
		yn("schedule_interview", "Schedule Interview?", PREPARE_BASE),
		note(
			"schedule_interview_yes_status",
			"✓ Prepare student strongly — set reminder for interview date",
			f"{PREPARE_BASE} && doc.schedule_interview == 'Yes'",
			"Status",
		),
		note(
			"schedule_interview_no_status",
			"⚠ Prepare student — set reminder to follow up interview schedule",
			f"{PREPARE_BASE} && doc.schedule_interview == 'No'",
			"Status",
		),
		# Tuition only for Before Deposit
		yn("tuition_fee_paid_interview", "Tuition Fee Paid?", BEFORE),
		note(
			"tuition_fee_paid_interview_no_note",
			"→ Set reminder to pay tuition fee",
			f"{BEFORE} && doc.tuition_fee_paid_interview == 'No'",
		),
		# Status / 2nd chance / pending CAS amount
		f(
			"interview_status",
			"Select",
			"Interview Status",
			options="\nApproved\nRejected",
			depends_on=HAS_INTERVIEW,
		),
		yn(
			"interview_second_chance",
			"2nd Chance for Interview?",
			f"{HAS_INTERVIEW} && doc.interview_status == 'Rejected'",
		),
		note(
			"interview_close_case_note",
			"⚠ Close case for this university",
			f"{HAS_INTERVIEW} && doc.interview_status == 'Rejected' && doc.interview_second_chance == 'No'",
			"Status",
		),
		# 2nd chance yes → prepare again
		yn(
			"second_chance_student_prepare",
			"Student Prepare for Interview? (2nd Chance)",
			f"{HAS_INTERVIEW} && doc.interview_status == 'Rejected' && doc.interview_second_chance == 'Yes'",
		),
		yn(
			"second_chance_interview_scheduled",
			"Interview Scheduled? (2nd Chance)",
			f"{HAS_INTERVIEW} && doc.interview_status == 'Rejected' && doc.interview_second_chance == 'Yes' && doc.second_chance_student_prepare == 'Yes'",
		),
		f(
			"second_chance_interview_date",
			"Date",
			"Interview Date (2nd Chance)",
			depends_on=f"{HAS_INTERVIEW} && doc.interview_status == 'Rejected' && doc.interview_second_chance == 'Yes' && doc.second_chance_student_prepare == 'Yes' && doc.second_chance_interview_scheduled == 'Yes'",
		),
		yn(
			"second_chance_schedule_interview",
			"Schedule Interview? (2nd Chance)",
			f"{HAS_INTERVIEW} && doc.interview_status == 'Rejected' && doc.interview_second_chance == 'Yes'",
		),
		yn(
			"pending_amount_for_cas",
			"Any Pending Amount for CAS?",
			f"{HAS_INTERVIEW} && doc.interview_status == 'Approved'",
		),
		note(
			"pending_amount_for_cas_yes_note",
			"→ Set reminder to pay pending tuition fee",
			f"{HAS_INTERVIEW} && doc.interview_status == 'Approved' && doc.pending_amount_for_cas == 'Yes'",
		),
		note(
			"pending_amount_for_cas_ok",
			"✓ OK",
			f"{HAS_INTERVIEW} && doc.interview_status == 'Approved' && doc.pending_amount_for_cas == 'No'",
			"Status",
		),
	]
	return fields


def acceptance_block():
	return [
		f("acceptance_tab", "Tab Break", "Acceptance"),
		f("acceptance_section", "Section Break", "Acceptance / CAS Letter"),
		yn("cas_letter_received", "Have you received CAS letter?"),
		note(
			"cas_letter_received_yes_note",
			"✓ Move to CAS stage",
			"eval:doc.cas_letter_received == 'Yes'",
			"Status",
		),
		yn("cas_any_pendency", "Is there any Pendency?", "eval:doc.cas_letter_received == 'No'"),
		f(
			"cas_pendency_details",
			"Small Text",
			"Pendency Details",
			depends_on="eval:doc.cas_letter_received == 'No' && doc.cas_any_pendency == 'Yes'",
		),
		yn(
			"cas_pendency_completed",
			"Pendency Completed?",
			"eval:doc.cas_letter_received == 'No' && doc.cas_any_pendency == 'Yes'",
		),
		f(
			"cas_pendency_upload",
			"Attach",
			"Pendency / Supporting Upload",
			depends_on="eval:doc.cas_letter_received == 'No' && doc.cas_any_pendency == 'Yes' && doc.cas_pendency_completed == 'Yes'",
		),
		note(
			"cas_pendency_completed_yes_note",
			"→ Set reminder for CAS letter",
			"eval:doc.cas_letter_received == 'No' && doc.cas_any_pendency == 'Yes' && doc.cas_pendency_completed == 'Yes'",
		),
		note(
			"cas_pendency_completed_no_note",
			"→ Set reminder to complete pendency",
			"eval:doc.cas_letter_received == 'No' && doc.cas_any_pendency == 'Yes' && doc.cas_pendency_completed == 'No'",
		),
		note(
			"cas_letter_no_pendency_note",
			"→ Set reminder for CAS letter",
			"eval:doc.cas_letter_received == 'No' && doc.cas_any_pendency == 'No'",
		),
		# keep deposit_paid / acceptance_docs as optional helpers (hidden unless useful)
		yn("deposit_paid", "Deposit Paid?", "eval:doc.cas_letter_received == 'Yes'"),
		f("acceptance_docs", "Attach", "Acceptance Documents", depends_on="eval:doc.cas_letter_received == 'Yes'"),
	]


def cas_block():
	our = f"eval:doc.cas_letter_received == 'Yes' && {OUR_TEAM}"
	cas_yes = "eval:doc.cas_letter_received == 'Yes'"
	return [
		f("cas_tab", "Tab Break", "CAS", depends_on=cas_yes),
		f("cas_section", "Section Break", "CAS Details", depends_on=cas_yes),
		f("cas_upload", "Attach", "Upload CAS", depends_on=cas_yes),
		f("cas_number", "Data", "CAS Number", depends_on=cas_yes),
		f("sponsor_license_number", "Data", "Sponsor License Number", depends_on=cas_yes),
		yn("cas_extension_required", "Extension Required?", cas_yes),
		note(
			"cas_extension_yes_note",
			"→ Complete extension and set reminder",
			f"{cas_yes} && doc.cas_extension_required == 'Yes'",
		),
		note(
			"cas_extension_ok_note",
			"✓ OK",
			f"{cas_yes} && doc.cas_extension_required == 'No'",
			"Status",
		),
		f("cas_notes", "Small Text", "CAS Notes", depends_on=cas_yes),
		f(
			"who_lodges_visa",
			"Select",
			"Who will lodge visa application at embassy?",
			options="\nOur Team\nAgent\nStudent",
			depends_on=cas_yes,
		),
		# Our Team — documents
		f("visa_lodge_docs_section", "Section Break", "Documents for Visa File Lodgement", depends_on=our),
		f("lodge_passport_upload", "Attach", "Passport", depends_on=our),
		yn("passport_immigration_history", "Any stamp on passport or immigration history?", our),
		f(
			"passport_stamp_details",
			"Small Text",
			"Details about stamp / immigration history",
			depends_on=f"{our} && doc.passport_immigration_history == 'Yes'",
		),
		f(
			"stamped_passport_upload",
			"Attach",
			"Stamped Passport Upload",
			depends_on=f"{our} && doc.passport_immigration_history == 'Yes'",
		),
		f(
			"lodge_passport_plain_upload",
			"Attach",
			"Passport Upload",
			depends_on=f"{our} && doc.passport_immigration_history == 'No'",
		),
		f("cas_letter_for_visa_upload", "Attach", "CAS Letter", depends_on=our),
		yn(
			"national_id_name_match",
			"National ID (Aadhar) — Student Name Match with Passport?",
			our,
		),
		f(
			"national_id_upload",
			"Attach",
			"National ID / Aadhar Upload",
			depends_on=f"{our} && doc.national_id_name_match == 'Yes'",
		),
		f(
			"national_id_affidavit_upload",
			"Attach",
			"Same Name Affidavit (Student)",
			depends_on=f"{our} && doc.national_id_name_match == 'No'",
		),
		note(
			"national_id_affidavit_note",
			"→ Upload same name affidavit and set reminder",
			f"{our} && doc.national_id_name_match == 'No'",
		),
		yn(
			"mother_aadhar_name_match",
			"Mother Aadhar — Name Match with Passport & Academics?",
			our,
		),
		f(
			"mother_aadhar_upload",
			"Attach",
			"Mother Aadhar Upload",
			depends_on=f"{our} && doc.mother_aadhar_name_match == 'Yes'",
		),
		f(
			"mother_aadhar_affidavit_upload",
			"Attach",
			"Same Name Affidavit (Mother)",
			depends_on=f"{our} && doc.mother_aadhar_name_match == 'No'",
		),
		note(
			"mother_aadhar_affidavit_note",
			"→ Upload same name affidavit and set reminder",
			f"{our} && doc.mother_aadhar_name_match == 'No'",
		),
		yn(
			"father_aadhar_name_match",
			"Father Aadhar — Name Match with Passport & Academics?",
			our,
		),
		f(
			"father_aadhar_upload",
			"Attach",
			"Father Aadhar Upload",
			depends_on=f"{our} && doc.father_aadhar_name_match == 'Yes'",
		),
		f(
			"father_aadhar_affidavit_upload",
			"Attach",
			"Same Name Affidavit (Father)",
			depends_on=f"{our} && doc.father_aadhar_name_match == 'No'",
		),
		note(
			"father_aadhar_affidavit_note",
			"→ Upload same name affidavit and set reminder",
			f"{our} && doc.father_aadhar_name_match == 'No'",
		),
		yn("medical_done", "Medical Done?", our),
		f(
			"medical_upload",
			"Attach",
			"Medical Upload",
			depends_on=f"{our} && doc.medical_done == 'Yes'",
		),
		note(
			"medical_done_no_note",
			"→ Set reminder when medical will be done",
			f"{our} && doc.medical_done == 'No'",
		),
		f("other_visa_lodge_docs", "Attach", "Other Documents", depends_on=our),
		f("embassy_login_section", "Section Break", "Embassy Login Details", depends_on=our),
		f("embassy_login_link", "Data", "Link", depends_on=our),
		f("embassy_login_id", "Data", "Login Id", depends_on=our),
		f("embassy_login_password", "Password", "Password", depends_on=our),
		f("ihs_upload", "Attach", "IHS Upload", depends_on=our),
		f("ihs_number", "Data", "IHS Number", depends_on=our),
		# Lodge question for all lodge parties
		yn("visa_file_lodged", "Have visa file lodged?", cas_yes),
		note(
			"visa_file_lodged_yes_note",
			"✓ Move to Visa Lodged stage",
			f"{cas_yes} && doc.visa_file_lodged == 'Yes'",
			"Status",
		),
		note(
			"visa_file_lodged_no_note",
			"→ Set reminder to lodge visa file",
			f"{cas_yes} && doc.visa_file_lodged == 'No'",
		),
	]


def visa_lodged_block():
	show = f"eval:{VISA_LODGED_YES}"
	our = f"eval:{VISA_LODGED_YES} && {OUR_TEAM}"
	agent_or_student = f"eval:{VISA_LODGED_YES} && (doc.who_lodges_visa == 'Agent' || doc.who_lodges_visa == 'Student')"
	return [
		f("file_lodged_tab", "Tab Break", "Visa Lodged", depends_on=show),
		f("file_lodged_section", "Section Break", "Visa Lodged", depends_on=show, bold=1),
		yn("visa_application_uploaded", "Have you uploaded Visa application?", our),
		note(
			"visa_application_uploaded_ok",
			"✓ OK",
			f"{our} && doc.visa_application_uploaded == 'Yes'",
			"Status",
		),
		note(
			"visa_application_uploaded_no_note",
			"→ Set reminder to upload visa application",
			f"{our} && doc.visa_application_uploaded == 'No'",
		),
		f("immi_acknowledgement_upload", "Attach", "IMMI Acknowledgement Uploaded", depends_on=our),
		f("biometric_instruction_letter", "Attach", "Biometric Instruction Letter", depends_on=our),
		f("biometric_date", "Date", "Biometric Date", depends_on=our),
		f("biometric_place", "Data", "Biometric Place", depends_on=our),
		yn("biometrics_done", "Biometric Completed?", our),
		note(
			"biometrics_done_no_note",
			"→ Set reminder for biometrics",
			f"{our} && doc.biometrics_done == 'No'",
		),
		f(
			"expected_visa_decision",
			"Date",
			"Expected Visa Decision",
			depends_on=f"eval:{VISA_LODGED_YES} && (({OUR_TEAM} && doc.biometrics_done == 'Yes') || doc.who_lodges_visa == 'Agent' || doc.who_lodges_visa == 'Student')",
			description="Set reminder for expected visa decision",
		),
		note(
			"agent_student_visa_decision_note",
			"→ Set reminder for expected visa decision",
			agent_or_student,
		),
		f(
			"visa_decision",
			"Select",
			"Decision",
			options="\nVisa Approved\nVisa Refused",
			depends_on=show,
		),
		note(
			"visa_decision_approved_note",
			"✓ Stage → Visa. Accounts will be notified with details & documents.",
			f"eval:{VISA_LODGED_YES} && {VISA_APPROVED}",
			"Status",
		),
		f("gwf_number", "Data", "GWF / Application Number", depends_on=show),
		f("trn_number", "Data", "TRN Number", depends_on=show),
		f("visa_lodge_docs", "Attach", "Visa Lodge Documents", depends_on=show),
	]


def visa_block():
	show = f"eval:{VISA_APPROVED}"
	our = f"eval:{VISA_APPROVED} && {OUR_TEAM}"
	agent_or_student = f"eval:{VISA_APPROVED} && (doc.who_lodges_visa == 'Agent' || doc.who_lodges_visa == 'Student')"
	return [
		f("visa_tab", "Tab Break", "Visa", depends_on=show),
		f("visa_section", "Section Break", "Visa", depends_on=show, bold=1),
		yn("evisa_activated", "Have you activated e-Visa?", our),
		note(
			"evisa_activated_no_note",
			"→ Set reminder to activate e-Visa",
			f"{our} && doc.evisa_activated == 'No'",
		),
		yn(
			"share_code_received",
			"Have you received share code?",
			f"{our} && doc.evisa_activated == 'Yes'",
		),
		note(
			"share_code_received_no_note",
			"→ Set reminder to receive share code",
			f"{our} && doc.evisa_activated == 'Yes' && doc.share_code_received == 'No'",
		),
		yn(
			"share_code_verified",
			"Have you verified e-Visa with share code?",
			f"{our} && doc.evisa_activated == 'Yes' && doc.share_code_received == 'Yes'",
		),
		note(
			"share_code_verified_no_note",
			"→ Set reminder to verify e-Visa",
			f"{our} && doc.evisa_activated == 'Yes' && doc.share_code_received == 'Yes' && doc.share_code_verified == 'No'",
		),
		f(
			"visa_copy_upload",
			"Attach",
			"Upload Visa Copy",
			depends_on=f"eval:{VISA_APPROVED} && (({OUR_TEAM} && doc.evisa_activated == 'Yes' && doc.share_code_received == 'Yes' && doc.share_code_verified == 'Yes') || doc.who_lodges_visa == 'Agent' || doc.who_lodges_visa == 'Student')",
		),
		note(
			"agent_student_upload_visa_note",
			"→ Upload visa copy",
			agent_or_student,
		),
		f("visa_notes", "Small Text", "Visa Notes", depends_on=show),
		f(
			"student_enrolled",
			"Select",
			"Student Enrolled?",
			options="\nYes\nNo",
			depends_on=show,
		),
		note(
			"student_enrolled_yes_status",
			"✓ Move to Enrolment stage",
			f"eval:{VISA_APPROVED} && doc.student_enrolled == 'Yes'",
			"Status",
		),
		note(
			"student_enrolled_no_status",
			"→ Follow up enrolment accordingly (set reminder)",
			f"eval:{VISA_APPROVED} && doc.student_enrolled == 'No'",
		),
	]


def enrolment_block():
	show = "eval:doc.student_enrolled == 'Yes'"
	return [
		f("enrollment_tab", "Tab Break", "Enrolled", depends_on=show),
		f("enrollment_section", "Section Break", "Enrolment", depends_on=show),
		f("enrolment_docs", "Attach", "Enrolment Documents", depends_on=show),
		f("student_id_card", "Attach", "Student ID Card", depends_on=show),
	]


def refused_block():
	show = f"eval:{VISA_REFUSED}"
	our = f"{show} && doc.refund_processed_by == 'Our Side'"
	return [
		f("visa_refused_tab", "Tab Break", "Visa Refused", depends_on=show),
		f("visa_refused_section", "Section Break", "Visa Refused", depends_on=show, bold=1),
		f("refusal_letter_upload", "Attach", "Upload Refused Letter", depends_on=show),
		f("send_refusal_to_chat", "Check", "Send directly to chat", depends_on=show, default="0"),
		yn("process_other_country", "Want to process in any other country?", show),
		f(
			"no_process_comments",
			"Small Text",
			"Comments",
			depends_on=f"{show} && doc.process_other_country == 'No'",
		),
		f(
			"no_process_reason",
			"Small Text",
			"Exact Reason",
			depends_on=f"{show} && doc.process_other_country == 'No'",
		),
		f(
			"other_country_name",
			"Link",
			"Country Name",
			options="Country",
			depends_on=f"{show} && doc.process_other_country == 'Yes'",
		),
		f(
			"new_app_handling_team",
			"Data",
			"Concern Handling Team",
			depends_on=f"{show} && doc.process_other_country == 'Yes'",
		),
		f(
			"new_app_handling_person",
			"Data",
			"Person Name",
			depends_on=f"{show} && doc.process_other_country == 'Yes'",
		),
		f(
			"refund_processed_by",
			"Select",
			"Refund Processed By",
			options="\nOur Side\nAgent\nStudent",
			depends_on=show,
		),
		f(
			"refund_form_filled_by",
			"Select",
			"Refund Form Filled By",
			options="\nStudent\nAgent",
			depends_on=our,
		),
		yn("refund_form_cross_checked", "Refund Form Cross Checked?", our),
		f("refund_form_upload", "Attach", "Upload Refund Form", depends_on=our),
		f(
			"refund_declaration",
			"Small Text",
			"Declaration",
			default="Note: It will not be filled by our Team. Declaration — Refund form not filled by you otherwise you will be responsible for refund issue if occurred due to negligence in account details from your side.",
			depends_on=our,
			read_only=1,
			bold=1,
		),
		f("employee_name", "Data", "Employee Name", depends_on=our),
		f("employee_position", "Data", "Position", depends_on=our),
		f("employee_code", "Data", "Employee Code", depends_on=our),
		yn("applied_for_refund", "Have you applied for refund?", show),
		note(
			"applied_for_refund_yes_note",
			"✓ Move to Refund Processing stage",
			f"{show} && doc.applied_for_refund == 'Yes'",
			"Status",
		),
		note(
			"applied_for_refund_no_note",
			"→ Set reminder to apply for refund",
			f"{show} && doc.applied_for_refund == 'No'",
		),
		f("refusal_reason", "Small Text", "Refusal Notes (optional)", depends_on=show),
	]


def refund_block():
	show = f"eval:{VISA_REFUSED} && doc.applied_for_refund == 'Yes'"
	return [
		f("refund_processing_tab", "Tab Break", "Refund Processing", depends_on=show),
		f("refund_processing_section", "Section Break", "Refund Processing", depends_on=show, bold=1),
		yn("tuition_refund_received", "Tuition Fee — Refund Received?", show),
		note(
			"tuition_refund_yes_note",
			"✓ Stage moved to Refunded",
			f"{show} && doc.tuition_refund_received == 'Yes'",
			"Status",
		),
		note(
			"tuition_refund_no_note",
			"→ Set reminder when expected refund will be received",
			f"{show} && doc.tuition_refund_received == 'No'",
		),
		yn("ihs_refund_received", "IHS — Refund Received?", show),
		f(
			"ihs_refund_invoice_upload",
			"Attach",
			"Upload IHS Refund Invoice",
			depends_on=f"{show} && doc.ihs_refund_received == 'Yes'",
		),
		note(
			"ihs_refund_no_note",
			"→ Set reminder when expected IHS refund will be received",
			f"{show} && doc.ihs_refund_received == 'No'",
		),
		f("refund_docs", "Attach", "Other Refund Documents", depends_on=show),
		f(
			"refund_status",
			"Select",
			"Refund Status",
			options="\nNot Applicable\nPending\nProcessed",
			depends_on=show,
			hidden=1,
		),
	]


def refunded_block():
	show = "eval:doc.tuition_refund_received == 'Yes'"
	no_issue = f"{show} && doc.tuition_fee_issue == 'No'"
	yes_issue = f"{show} && doc.tuition_fee_issue == 'Yes'"
	resolved = f"{yes_issue} && doc.tuition_fee_issue_resolved == 'Yes'"
	not_resolved = f"{yes_issue} && doc.tuition_fee_issue_resolved == 'No'"
	return [
		f("refunded_tab", "Tab Break", "Refunded", depends_on=show),
		f("refunded_section", "Section Break", "Refunded", depends_on=show, bold=1),
		yn("tuition_fee_issue", "Tuition Fee — Is There Any Issue in Fee Refund?", show),
		yn("ihs_refund_received_no_issue", "IHS Refund Received?", no_issue),
		note(
			"ihs_refund_no_issue_reminder",
			"→ Set reminder when you expect IHS refund received",
			f"{no_issue} && doc.ihs_refund_received_no_issue == 'No'",
		),
		f(
			"close_case_upload_no_issue",
			"Attach",
			"Upload Tuition Fee Refund Invoice",
			depends_on=f"{no_issue} && doc.ihs_refund_received_no_issue == 'Yes'",
			description="Close this case after uploading the tuition fee refund invoice",
		),
		note(
			"close_case_no_issue_note",
			"✓ Close this case",
			f"{no_issue} && doc.ihs_refund_received_no_issue == 'Yes'",
			"Status",
		),
		f("tuition_fee_issue_details", "Small Text", "Issue Details", depends_on=yes_issue),
		yn("tuition_fee_issue_resolved", "Refund Issue Resolved?", yes_issue),
		note(
			"issue_not_resolved_reminder",
			"→ Set reminder when you expect refund issue resolved",
			not_resolved,
		),
		yn("ihs_refund_received_after_issue", "IHS Refund Received?", resolved),
		note(
			"ihs_refund_after_issue_reminder",
			"→ Set reminder when you expect IHS refund received",
			f"{resolved} && doc.ihs_refund_received_after_issue == 'No'",
		),
		f(
			"close_case_upload_issue_resolved",
			"Attach",
			"Upload Tuition Fee Refund Invoice",
			depends_on=f"{resolved} && doc.ihs_refund_received_after_issue == 'Yes'",
			description="Close this case after uploading the tuition fee refund invoice",
		),
		note(
			"close_case_issue_resolved_note",
			"✓ Close this case",
			f"{resolved} && doc.ihs_refund_received_after_issue == 'Yes'",
			"Status",
		),
	]


REPLACE_START = "interview_condition_section"
REPLACE_END = "refund_processing_tab"  # keep refund tab and after as-is from existing


def index_by_name(fields):
	return {df["fieldname"]: i for i, df in enumerate(fields)}


def main():
	doc = json.loads(JSON_PATH.read_text())
	fields = doc["fields"]
	by_name = index_by_name(fields)

	# --- 1. Currency fixes ---
	for fname in ("living_expenses", "funds_required_amount"):
		if fname in by_name:
			fields[by_name[fname]]["options"] = "offer_currency"
	if "defer_offer_currency" in by_name:
		fields[by_name["defer_offer_currency"]]["default"] = "GBP"
	if "offer_currency" in by_name:
		fields[by_name["offer_currency"]]["default"] = "GBP"

	# --- 2. Replace interview → refused (before refund tab) ---
	start = by_name[REPLACE_START]
	end = by_name[REPLACE_END]

	# Preserve fields that live between financial conditions and interview that we should keep
	# Actually REPLACE_START is interview_condition_section — keep english/sponsors/gap etc BEFORE interview
	# Current order has interview early then english... Looking at field_order, interview is before english.
	# We only replace from interview_condition_section through student_prepare...interview_second_chance
	# then leave english through financial_notes, then replace acceptance through enrollment/refused.

	# Safer approach: replace in two slices
	# A) interview fields only (interview_condition_section .. interview_second_chance)
	# B) acceptance_tab .. visa_refused applied_for_refund (before refund_processing_tab)

	interview_end_names = {
		"interview_condition_section",
		"interview_timing",
		"interview_deadline_date",
		"student_prepare",
		"student_prepare_yes_status",
		"student_prepare_no_status",
		"schedule_interview",
		"schedule_interview_yes_status",
		"schedule_interview_no_status",
		"interview_status",
		"interview_second_chance",
	}

	# Remove old interview block fields wherever they sit
	fields = [df for df in fields if df["fieldname"] not in interview_end_names]
	by_name = index_by_name(fields)

	# Insert new interview block before english_requirement_section (or after conditions_note)
	insert_at = by_name.get("english_requirement_section")
	if insert_at is None:
		insert_at = by_name.get("conditions_note", 0) + 1
	new_interview = interview_block()
	fields[insert_at:insert_at] = new_interview
	by_name = index_by_name(fields)

	# Replace acceptance through applied_for_refund (keep refund_processing_tab+)
	acc_start = by_name["acceptance_tab"]
	# Find last field before refund_processing_tab
	ref_start = by_name["refund_processing_tab"]
	# Keep acceptance_submitted* removed — new acceptance block replaces AU-style checks
	remove_names = set()
	for df in fields[acc_start:ref_start]:
		remove_names.add(df["fieldname"])

	fields = [df for df in fields if df["fieldname"] not in remove_names]
	by_name = index_by_name(fields)
	ref_start = by_name["refund_processing_tab"]

	replacement = (
		acceptance_block()
		+ cas_block()
		+ visa_lodged_block()
		+ visa_block()
		+ enrolment_block()
		+ refused_block()
		+ refund_block()
		+ refunded_block()
	)
	fields[ref_start:ref_start] = replacement

	# Drop obsolete AU acceptance checkboxes if somehow left
	obsolete = {
		"acceptance_submitted",
		"acceptance_submitted_status",
		"acceptance_not_submitted_status",
		"interview_stage_available",
	}
	fields = [df for df in fields if df["fieldname"] not in obsolete]

	# Fix financials_tab / other depends that referenced visa_status — already handled in new blocks
	doc["fields"] = fields
	doc["field_order"] = [df["fieldname"] for df in fields]

	# Ensure unique fieldnames
	names = [df["fieldname"] for df in fields]
	dups = {n for n in names if names.count(n) > 1}
	if dups:
		raise SystemExit(f"Duplicate fieldnames: {sorted(dups)}")

	JSON_PATH.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n")
	print(f"Updated {JSON_PATH} — {len(fields)} fields")


if __name__ == "__main__":
	main()
