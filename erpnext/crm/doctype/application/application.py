# Copyright (c) 2025, Unideft and contributors
# For license information, please see license.txt

from urllib.parse import quote_plus

import frappe
from frappe.model.document import Document


class Application(Document):
	@staticmethod
	def get_list_query(query):
		"""Filter applications based on user role hierarchy."""
		user_roles = set(frappe.get_roles())
		user = frappe.session.user
		App = frappe.qb.DocType("Application")

		if user_roles & {"System Manager", "Administrator", "CRM Admin"}:
			return query

		if "CRO Head" in user_roles:
			agent_names = _agents_under_cro_head(user)
			if agent_names:
				return query.where(App.agent.isin(agent_names))
			return query.where(App.name == "__no_match__")

		if "Country Head" in user_roles:
			teams = frappe.get_all("Team", filters={"country_head": user}, pluck="name")
			if teams:
				return query.where(App.assigned_team.isin(teams))
			return query.where(App.name == "__no_match__")

		if "CRO" in user_roles:
			agent_names = _agents_under_cro(user)
			if agent_names:
				return query.where(App.agent.isin(agent_names))
			return query.where(App.name == "__no_match__")

		if "Admission 1" in user_roles:
			teams = frappe.get_all("Team", filters={"admission_1": user}, pluck="name")
			if teams:
				return query.where(App.assigned_team.isin(teams))
			return query.where(App.name == "__no_match__")

		if "Admission 2" in user_roles:
			teams = frappe.get_all("Team", filters={"admission_2": user}, pluck="name")
			if teams:
				return query.where(App.assigned_team.isin(teams))
			return query.where(App.name == "__no_match__")

		if "Team Lead" in user_roles:
			teams = frappe.get_all("Team", filters={"team_leader": user}, pluck="name")
			if teams:
				return query.where(App.assigned_team.isin(teams))
			return query.where(App.name == "__no_match__")

		if "Team Executive" in user_roles:
			return query.where(App.assigned_executive == user)

		if user_roles & {"Agent", "B2B Agent", "B2C Agent"}:
			return query.where(App.agent == user)

		if user_roles & {"Marketing Head", "Marketing Member", "Telecalling Head", "Telecalling Member"}:
			agent_names = _agents_under_cro_for_support(user)
			if agent_names:
				return query.where(App.agent.isin(agent_names))
			return query.where(App.name == "__no_match__")

		return query.where(App.name == "__no_match__")

	def on_trash(self):
		"""Delete paired Application UK when this index row is removed."""
		if self.flags.get("skip_paired_delete"):
			return
		uk_name = self.uk_data or frappe.db.get_value(
			"Application UK", {"application": self.name}, "name"
		)
		if not uk_name:
			return
		# Unlink both sides before deleting the pair (link check runs after on_trash)
		frappe.db.set_value("Application UK", uk_name, "application", None, update_modified=False)
		frappe.db.set_value("Application", self.name, "uk_data", None, update_modified=False)
		self.uk_data = None
		if frappe.db.exists("Application UK", uk_name):
			uk = frappe.get_doc("Application UK", uk_name)
			uk.flags.skip_paired_delete = True
			uk.flags.ignore_permissions = True
			uk.delete()

	def before_save(self):
		"""Auto-assign team based on destination country"""
		self.auto_assign_team()
		self.apply_country_flow_defaults()

	def after_insert(self):
		if not self.flags.get("skip_country_pack"):
			self.link_uk_index()

	def on_update(self):
		if not self.flags.get("skip_country_pack"):
			self.link_uk_index()

	def link_uk_index(self):
		"""UK applications are edited on Application UK — keep index row linked only."""
		if not self.name or not self.is_united_kingdom():
			return

		existing = self.uk_data or frappe.db.get_value(
			"Application UK", {"application": self.name}, "name"
		)
		if existing and self.uk_data != existing:
			self.db_set("uk_data", existing, update_modified=False)

	def apply_country_flow_defaults(self):
		"""Set AU/UK default case when country is known and case empty."""
		country = (self.destination_country or "").strip()
		if not country:
			return

		if self.is_united_kingdom():
			return
		elif self.is_australia():
			if not self.country_flow_case or not str(self.country_flow_case).startswith("AU"):
				# Preserve AU Case 4 Spouse if already set by spouse gate
				if self.country_flow_case != "AU Case 4 Spouse":
					self.country_flow_case = "AU Default"

	def is_united_kingdom(self):
		c = (self.destination_country or "").strip().lower()
		return c in {"united kingdom", "uk", "great britain", "britain", "england"}

	def is_australia(self):
		c = (self.destination_country or "").strip().lower()
		return "australia" in c

	def auto_assign_team(self):
		"""Find the team that handles this destination country and assign it"""
		if self.destination_country and not self.assigned_team:
			# Find team whose territories include this country
			team_result = frappe.db.sql("""
				SELECT parent FROM `tabTeam Territory`
				WHERE country = %s
				LIMIT 1
			""", (self.destination_country,), as_dict=True)
			
			if team_result:
				self.assigned_team = team_result[0].parent
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from erpnext.crm.doctype.academic_verification.academic_verification import AcademicVerification
		from erpnext.crm.doctype.application_course.application_course import ApplicationCourse
		from erpnext.crm.doctype.application_documents_10th_to_12th.application_documents_10th_to_12th import ApplicationDocuments10thTo12th
		from erpnext.crm.doctype.application_english_test.application_english_test import ApplicationEnglishTest
		from erpnext.crm.doctype.application_offer_letter_condition.application_offer_letter_condition import ApplicationOfferLetterCondition
		from erpnext.crm.doctype.application_sponsor_complete.application_sponsor_complete import ApplicationSponsorComplete
		from erpnext.crm.doctype.enrollment_document.enrollment_document import EnrollmentDocument
		from erpnext.crm.doctype.graduation_verification.graduation_verification import GraduationVerification
		from erpnext.crm.doctype.need_assessment_vendor.need_assessment_vendor import NeedAssessmentVendor
		from erpnext.crm.doctype.processing_agent_details.processing_agent_details import ProcessingAgentDetails
		from erpnext.crm.doctype.spouse_details.spouse_details import SpouseDetails
		from erpnext.crm.doctype.student_documents.student_documents import studentdocuments
		from erpnext.crm.doctype.study_gap_proof.study_gap_proof import StudyGapProof
		from frappe.types import DF

		academic_transcript_details: DF.Text | None
		academic_transcript_documents: DF.Table[studentdocuments]
		acceptance_any_requirement: DF.Check
		acceptance_before_coe_available: DF.Check
		acceptance_interview_deadline: DF.Date | None
		acceptance_no_requirement_status: DF.Text | None
		acceptance_not_available_status: DF.Text | None
		acceptance_not_submitted_status: DF.Text | None
		acceptance_requirement_details: DF.Text | None
		acceptance_requirement_upload: DF.Attach | None
		acceptance_requirements_completed: DF.Check
		acceptance_requirements_completed_no_status: DF.Text | None
		acceptance_requirements_completed_yes_status: DF.Text | None
		acceptance_schedule_interview: DF.Check
		acceptance_schedule_interview_no_status: DF.Text | None
		acceptance_schedule_interview_yes_status: DF.Text | None
		acceptance_student_prepare: DF.Check
		acceptance_student_prepare_no_status: DF.Text | None
		acceptance_student_prepare_yes_status: DF.Text | None
		acceptance_submitted: DF.Check
		acceptance_submitted_status: DF.Text | None
		agent: DF.Link | None
		agent_file_lodged_no_status: DF.Text | None
		agent_file_lodged_status: DF.Check
		agent_file_lodged_yes_status: DF.Text | None
		agent_medical_upload: DF.Attach | None
		agent_oshc_amount: DF.Text | None
		agent_oshc_company_name: DF.Text | None
		agent_oshc_policy_no: DF.Text | None
		agent_oshc_upload: DF.Attach | None
		agent_policy_not_received_status: DF.Text | None
		agent_policy_received: DF.Check
		all_documents: DF.Table[studentdocuments]
		any_further_requirement_offer_letter: DF.Literal["", "Yes", "No"]
		any_visa_refused: DF.Literal["", "Yes", "No"]
		application_closed: DF.Check
		application_filled_by: DF.Literal["", "Application filled by us", "Filled on portal", "Filled by Vendor"]
		application_form_1_upload: DF.Attach | None
		application_form_2_upload: DF.Attach | None
		application_form_3_upload: DF.Attach | None
		application_form_4_upload: DF.Attach | None
		application_type: DF.Literal["B2B"]
		applied_for_defer_offer_letter: DF.Literal["", "Yes", "No"]
		applied_for_defer_offer_no_note: DF.Text | None
		assigned_executive: DF.Link | None
		assigned_team: DF.Link | None
		case_4_close_reason: DF.SmallText | None
		case_4_marriage_duration: DF.Literal["", "1 year or above", "Below 1 year"]
		case_4_note_convince: DF.Data | None
		case_4_note_wait: DF.Data | None
		case_4_proceed_above_1_year: DF.Literal["", "On single basis", "with Spouse"]
		case_4_proceed_below_1_year: DF.Literal["", "on single basis", "wait to complete one year"]
		case_4_proceed_below_graduate: DF.Literal["", "on single basis", "Don\u2019t want to procced"]
		case_4_spouse_qualification: DF.Literal["", "Graduate or above Graduation", "Below Graduate"]
		close_case: DF.Check
		close_case_status: DF.Text | None
		close_case_upload_issue_resolved: DF.Attach | None
		close_case_upload_no_issue: DF.Attach | None
		coe_uploaded: DF.Attach | None
		conditions_note: DF.Text | None
		conditions_on_offer_letter: DF.TableMultiSelect[ApplicationOfferLetterCondition]
		convince_times: DF.Int
		country_flow_case: DF.Literal["", "AU Default", "AU Case 4 Spouse", "UK Case 1", "UK Case 2", "UK Case 3", "UK Case 4", "UK Case 5", "UK Case 6", "UK Case 7", "UK Case 8"]
		course_name: DF.Link | None
		current_age: DF.Int
		data_swym: DF.Text | None
		defer_any_further_requirement: DF.Literal["", "Yes", "No"]
		defer_conditions_on_offer_letter: DF.TableMultiSelect[ApplicationOfferLetterCondition]
		defer_course_name: DF.Link | None
		defer_full_year_tuition_fee: DF.Currency
		defer_funds_required_amount: DF.Currency
		defer_funds_required_type: DF.Literal["", "With Full Year fee (single basis)", "Without Full Year fee (single basis)", "With Full Year fee (With spouse)", "Without Full Year fee (With spouse)", "With Full Year fee (With spouse and Kid)", "Without Full Year fee (With spouse and Kid)", "With Full Year fee (With Kid)", "Without Full Year fee (With Kid)"]
		defer_living_expenses: DF.Currency
		defer_living_expenses_kid_unit: DF.Currency
		defer_living_expenses_spouse: DF.Currency
		defer_no_further_requirement_note: DF.Text | None
		defer_no_of_kids: DF.Int
		defer_offer_currency: DF.Literal["AUD", "CAD", "NZD", "USD", "INR", "GBP"]
		defer_offer_letter_upload: DF.Table[studentdocuments]
		defer_offer_ok: DF.Text | None
		defer_offer_required: DF.Literal["", "Yes", "No"]
		defer_oshc: DF.Currency
		defer_other_documents: DF.Table[studentdocuments]
		defer_payable_fee: DF.Currency
		defer_pending_requirement_details: DF.Text | None
		defer_pending_requirements_completed: DF.Literal["", "Yes", "No"]
		defer_pending_requirements_completed_yes_note: DF.Text | None
		defer_pending_requirements_reminder_note: DF.Text | None
		defer_process_with_kids: DF.Check
		defer_scholarship: DF.Currency
		defer_supporting_documents: DF.Table[studentdocuments]
		defer_travel_expenses: DF.Currency
		defer_travel_expenses_kid_unit: DF.Currency
		defer_travel_expenses_spouse: DF.Currency
		defer_university_intake: DF.Date | None
		defer_university_name: DF.Link | None
		destination_country: DF.Link
		dob: DF.Date
		documents_10th_to_12th: DF.Table[ApplicationDocuments10thTo12th]
		documents_not_accepted_alert: DF.Text | None
		documents_passport_application_form_sop: DF.Table[studentdocuments]
		documents_verified: DF.Check
		documents_verified_pdf: DF.Table[studentdocuments]
		employee_code: DF.Text | None
		employee_name: DF.Text | None
		employee_position: DF.Text | None
		english_requirement_details: DF.Text | None
		english_requirement_documents: DF.Table[studentdocuments]
		english_test_details: DF.Table[ApplicationEnglishTest]
		enrollment_documents: DF.Table[EnrollmentDocument]
		file_lodged_by: DF.Literal["", "Our Side", "Agent", "Student", "Vendor"]
		file_lodged_status: DF.Check
		financial_matrix_upload: DF.Attach | None
		financial_stage_completed: DF.Text | None
		form_956a_filled: DF.Check
		form_956a_filled_no_status: DF.Text | None
		form_956a_filled_yes_status: DF.Text | None
		form_956a_upload: DF.Attach | None
		from_where_change: DF.Literal["", "Others", "Ganpati House of Achievers"]
		full_year_tuition_fee: DF.Currency
		funds_required_amount: DF.Currency
		funds_required_type: DF.Literal["", "With Full Year fee (single basis)", "Without Full Year fee (single basis)", "With Full Year fee (With spouse)", "Without Full Year fee (With spouse)", "With Full Year fee (With spouse and Kid)", "Without Full Year fee (With spouse and Kid)", "With Full Year fee (With Kid)", "Without Full Year fee (With Kid)"]
		ganpati_new_app_status: DF.Text | None
		gap_justification_details: DF.Text | None
		gap_justification_documents: DF.Table[studentdocuments]
		gha_oshc_company_name: DF.Text | None
		gha_oshc_policy_no: DF.Text | None
		gha_oshc_upload: DF.Attach | None
		gha_policy_not_received_status: DF.Text | None
		gha_policy_received: DF.Check
		graduation_verification_documents: DF.Table[GraduationVerification]
		gs_any_requirement: DF.Literal["", "Yes", "No"]
		gs_approved_check: DF.Literal["", "Yes", "No"]
		gs_approved_yes_status: DF.Text | None
		gs_form_1_upload: DF.Attach | None
		gs_form_2_upload: DF.Attach | None
		gs_sop_upload: DF.Attach | None
		gs_submitted: DF.Literal["", "Yes", "No"]
		gs_submitted_no_note: DF.Text | None
		gs_submitted_reminder_date: DF.Date | None
		hap_id_upload: DF.Attach | None
		higher_education: DF.Literal["", "12th pass", "Graduation", "Post-graduation", "Others"]
		immi_acknowledgement_upload: DF.Attach | None
		intake: DF.Literal["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
		intake_date: DF.Date | None
		interview_deadline: DF.Date | None
		interview_deadline_date: DF.Date | None
		interview_not_available_status: DF.Text | None
		interview_stage_available: DF.Check
		interview_timing: DF.Literal["", "Before GS Approval", "Before Acceptance", "Before COE"]
		is_package_case: DF.Check
		issue_not_resolved_reminder: DF.Text | None
		living_expenses: DF.Currency
		living_expenses_kid_unit: DF.Currency
		living_expenses_spouse: DF.Currency
		login_contact_no: DF.Phone | None
		martial_status: DF.Literal["", "Married", "Single"]
		medical_arranged_by: DF.Literal["", "Our Side", "Agent", "Student"]
		naming_series: DF.Literal["APP-.YYYY.-"]
		need_another_application: DF.Literal["", "Yes", "No"]
		need_another_application_yes_note: DF.Text | None
		need_assessment: DF.Literal["", "Yes", "No"]
		need_assessment_course: DF.Link | None
		need_assessment_university: DF.Link | None
		need_assessment_vendors: DF.Table[NeedAssessmentVendor]
		new_app_handling_person: DF.Text | None
		new_app_handling_team: DF.Text | None
		no_further_requirement_note: DF.Text | None
		no_of_kids: DF.Int
		no_process_comments: DF.Text | None
		no_process_reason: DF.Text | None
		no_requirement_status: DF.Text | None
		not_processing_another_application_reason: DF.Text | None
		offer_currency: DF.Literal["AUD", "CAD", "NZD", "USD", "INR", "GBP"]
		offer_letter_upload: DF.Table[studentdocuments]
		original_funds_upload: DF.Attach | None
		oscg_status: DF.Literal["", "Processing", "On Offer Letter", "On COE", "On Enrolled"]
		oshc_arranged_by_type: DF.Literal["", "GHA", "University", "Agent", "Student"]
		oshc_no_reminder_issue_resolved: DF.Text | None
		oshc_no_reminder_no_issue: DF.Text | None
		oshc_offer: DF.Currency
		oshc_refund_form_upload: DF.Attach | None
		oshc_refund_invoice_upload: DF.Attach | None
		oshc_refund_no: DF.Text | None
		oshc_refund_no_issue: DF.Check
		oshc_refund_received: DF.Check
		oshc_refund_received_issue_resolved: DF.Check
		oshc_required: DF.Check
		other_condition_details: DF.Text | None
		other_condition_documents: DF.Table[studentdocuments]
		other_country_name: DF.Text | None
		other_documents_offer: DF.Table[studentdocuments]
		others_reason: DF.Text | None
		our_side_file_lodged_no_status: DF.Text | None
		our_side_file_lodged_yes_status: DF.Text | None
		our_side_login_id: DF.Text | None
		our_side_login_password: DF.Text | None
		our_side_medical_scheduled: DF.Check
		our_side_medical_scheduled_no_status: DF.Text | None
		our_side_medical_scheduled_yes_status: DF.Text | None
		passport_upload: DF.Attach | None
		password: DF.Password | None
		payable_fee: DF.Currency
		pending_requirement_details: DF.Text | None
		pending_requirements_completed: DF.Literal["", "Yes", "No"]
		pending_requirements_completed_yes_note: DF.Text | None
		pending_requirements_reminder_note: DF.Text | None
		preferred_courses: DF.Table[ApplicationCourse]
		preferred_university: DF.Link | None
		process_other_country: DF.Check
		process_with_kids: DF.Check
		processing_agent_details: DF.Table[ProcessingAgentDetails]
		recovery_email_id: DF.Text | None
		refund_declaration: DF.Text | None
		refund_form_cross_checked: DF.Check
		refund_form_filled_by: DF.Literal["", "Student", "Agent"]
		refund_form_upload: DF.Attach | None
		refund_processed_by: DF.Literal["", "Our Side", "Agent", "Student"]
		refused_letter_upload: DF.Attach | None
		requirement_details: DF.Text | None
		requirement_document_upload: DF.Attach | None
		requirements_completed: DF.Check
		requirements_completed_no_status: DF.Text | None
		requirements_completed_yes_status: DF.Text | None
		schedule_interview: DF.Literal["", "Yes", "No"]
		schedule_interview_no_status: DF.Text | None
		schedule_interview_yes_status: DF.Text | None
		scholarship: DF.Currency
		school_digi_locker_id: DF.Data | None
		school_digi_locker_password: DF.Password | None
		school_docs_pdf: DF.Attach | None
		school_docs_status: DF.Data | None
		school_docs_verified: DF.Literal["", "Yes", "No"]
		send_offer_to_chat: DF.Check
		shop_act_additional_document: DF.Attach | None
		shop_act_uploaded: DF.Check
		sop_portal_or_vendor_upload: DF.Attach | None
		sop_upload: DF.Attach | None
		sponsor_1_docs_pdf_upload: DF.Attach | None
		sponsor_2_docs_pdf_upload: DF.Attach | None
		sponsor_3_docs_pdf_upload: DF.Attach | None
		sponsorship_affidavit_upload: DF.Attach | None
		spouse_academic_verification: DF.Table[AcademicVerification]
		spouse_details_list: DF.Table[SpouseDetails]
		spouse_visa_upload: DF.Attach | None
		status: DF.Literal["Pending", "Processing", "Offer Letter Received", "Financial", "GS Processing", "GS Approved", "Acceptance", "COE", "File Lodged", "Visa", "Enrollment", "On Shore College change", "Visa Refused", "Closed"]
		student: DF.Link
		student_academic_verification: DF.Table[AcademicVerification]
		student_affidavit_upload: DF.Attach | None
		student_contact_no: DF.Phone | None
		student_email: DF.Data | None
		student_enrolled: DF.Check
		student_enrolled_no_status: DF.Text | None
		student_enrolled_yes_status: DF.Text | None
		student_file_lodged_no_status: DF.Text | None
		student_file_lodged_status: DF.Check
		student_file_lodged_yes_status: DF.Text | None
		student_medical_upload: DF.Attach | None
		student_no_change_status: DF.Text | None
		student_oshc_amount: DF.Text | None
		student_oshc_company_name: DF.Text | None
		student_oshc_policy_no: DF.Text | None
		student_oshc_upload: DF.Attach | None
		student_policy_not_received_status: DF.Text | None
		student_policy_received: DF.Check
		student_prepare: DF.Literal["", "Yes", "No"]
		student_prepare_no_status: DF.Text | None
		student_prepare_yes_status: DF.Text | None
		student_wants_college_change: DF.Literal["", "No", "Yes"]
		study_gap: DF.Literal["", "Yes", "No"]
		study_gap_not_accepted_status: DF.Data | None
		study_gap_ok: DF.Text | None
		study_gap_proof: DF.Table[studentdocuments]
		study_gap_proof_list: DF.Table[StudyGapProof]
		study_gap_status: DF.Data | None
		study_gap_upto_1_year: DF.Literal["", "Yes", "No"]
		submitted_another_application: DF.Literal["", "Yes", "No"]
		submitted_another_application_yes_note: DF.Text | None
		submitted_date: DF.Date | None
		supporting_documents: DF.Table[studentdocuments]
		table_ihmq: DF.Table[ApplicationSponsorComplete]
		travel_expenses: DF.Currency
		travel_expenses_kid_unit: DF.Currency
		travel_expenses_spouse: DF.Currency
		trn_number: DF.Text | None
		tuition_fee_issue: DF.Check
		tuition_fee_issue_details: DF.Text | None
		tuition_fee_issue_resolved: DF.Check
		tuition_fee_not_paid_status: DF.Text | None
		tuition_fee_paid: DF.Check
		tuition_fee_paid_status: DF.Text | None
		tuition_fee_refund_no: DF.Text | None
		tuition_fee_refund_received: DF.Check
		tuition_fee_refund_yes: DF.Text | None
		tuition_fee_upload: DF.Attach | None
		twelfth_admit_card_uploaded: DF.Check
		uk_data: DF.Link | None
		university_intake: DF.Date | None
		university_name: DF.Link | None
		vendor_file_lodged_no_status: DF.Text | None
		vendor_file_lodged_status: DF.Check
		vendor_file_lodged_yes_status: DF.Text | None
		verification_type: DF.Literal["", "Academics", "Work Experience"]
		visa_application_checked_by: DF.Literal["", "Agent", "Student"]
		visa_application_upload: DF.Attach | None
		visa_approved_notification_status: DF.Text | None
		visa_approved_status: DF.Text | None
		visa_copy_upload: DF.Attach | None
		visa_decision: DF.Literal["", "Visa Approved", "Visa Refused"]
		visa_refused_can_process: DF.Literal["", "Yes", "No"]
		visa_refused_close_reason: DF.SmallText | None
		visa_refused_closed_status: DF.Text | None
		visa_refused_country: DF.Literal["", "Australia", "New Zealand"]
		visa_refused_go_ahead_status: DF.Text | None
		visa_refused_new_application: DF.Link | None
		visa_refused_not_able_to_process: DF.Text | None
		visa_refused_ok: DF.Text | None
		visa_refused_other_country: DF.Literal["", "Yes", "No"]
		visa_refused_other_country_name: DF.Link | None
		visa_refused_status: DF.Text | None
		visa_refused_type: DF.Literal["", "Study Visa", "Tourist Visa", "Work Visa", "Other Visa"]
		visa_sop_upload: DF.Attach | None
		visa_status: DF.Literal["File Lodged", "Visa Approved", "Visa Refused"]
	# end: auto-generated types

	def validate(self):
		# Preferred courses are Australia Details flow — skip for UK (university/course live on UK Offer)
		if not self.is_united_kingdom() and not self.flags.get("skip_preferred_course_validation"):
			if len(self.preferred_courses or []) > 3:
				frappe.throw("You can select a maximum of 3 courses only.")

			if len(self.preferred_courses or []) == 0:
				frappe.throw("Please select at least one course.")
		
		# For B2C: Auto-set agent to Unideft if not set or if wrong agent selected
		if self.application_type == "B2C":
			unideft_agent = frappe.db.get_value("Agent", {"company_name": "Unideft"}, "name")
			if unideft_agent:
				# Always set to Unideft for B2C
				if not self.agent or self.agent != unideft_agent:
					self.agent = unideft_agent
			else:
				frappe.throw("Unideft agent not found. Please create it first.")
		
		# For B2B: No validation - can select any agent or leave empty



def _agents_under_cro_head(user):
	"""All agents whose CRO's cro_head is this user."""
	cro_agents = frappe.get_all("Agent", filters={"cro_head": user}, pluck="name")
	return cro_agents or []


def _agents_under_cro(user):
	"""All agents linked to teams where this user is the CRO."""
	teams = frappe.get_all("Team", filters={"cro": user}, pluck="name")
	if not teams:
		return []
	agents = frappe.get_all(
		"Agent", filters={"sales_team": ["in", teams]}, pluck="name"
	)
	return agents or []


def _agents_under_cro_for_support(user):
	"""Marketing/Telecalling see apps from agents under same CRO."""
	cro_teams = frappe.get_all("Team", filters={"cro": user}, pluck="name")
	if not cro_teams:
		return []
	return frappe.get_all(
		"Agent", filters={"sales_team": ["in", cro_teams]}, pluck="name"
	) or []

def _map_au_qualification_to_uk(higher_education):
	"""Map Application.higher_education options to UK assessment qualification."""
	he = (higher_education or "").strip()
	if he in ("12th pass", "12th"):
		return "12th"
	if he in ("Graduation", "Bachelors", "Diploma"):
		return "Graduation"
	if he in ("Masters", "Post-graduation", "Post Graduation"):
		return "Post-graduation"
	return ""


def resolve_uk_case(uk_qualification=None, uk_marital_status=None):
	"""UK Cases 1–6 router from assessment inputs."""
	qual = (uk_qualification or "").strip()
	marital = (uk_marital_status or "").strip()
	married = marital == "Married"

	if qual == "12th":
		return "UK Case 1" if married else "UK Case 2"
	if qual == "Graduation":
		return "UK Case 3" if married else "UK Case 4"
	if qual == "Post-graduation":
		return "UK Case 5" if married else "UK Case 6"
	return "UK Case 2"


@frappe.whitelist()
def recompute_uk_case(application=None, uk_qualification=None, uk_marital_status=None, uk_application=None):
	"""Recompute UK case — supports legacy Application index or Application UK."""
	if uk_application:
		return frappe.get_attr(
			"erpnext.crm.doctype.application_uk.application_uk.recompute_uk_case"
		)(uk_application, uk_qualification, uk_marital_status)

	if not application:
		frappe.throw("Application is required")

	doc = frappe.get_doc("Application", application)
	if not doc.is_united_kingdom():
		frappe.throw("Application destination is not United Kingdom")

	case = resolve_uk_case(uk_qualification, uk_marital_status)
	doc.db_set("country_flow_case", case, update_modified=False)

	if doc.uk_data:
		frappe.db.set_value(
			"Application UK",
			doc.uk_data,
			{
				"country_flow_case": case,
				"single_basis_only": 1 if case in ("UK Case 1", "UK Case 3", "UK Case 5") else 0,
				"higher_education": uk_qualification,
				"martial_status": uk_marital_status,
			},
			update_modified=False,
		)

	return case


@frappe.whitelist()
def create_uk_application(student, dob=None, application_type="B2B"):
	"""Create Application UK + index row; open the UK native form."""
	if not student:
		frappe.throw("Student is required")

	stu = frappe.get_doc("Student", student)
	uk = frappe.new_doc("Application UK")
	uk.student = student
	uk.application_type = application_type or "B2B"
	uk.uk_current_stage = "Details"
	uk.country_flow_case = "UK Case 2"
	uk.dob = dob or getattr(stu, "dob", None) or getattr(stu, "date_of_birth", None)
	uk.student_email = getattr(stu, "email", None) or getattr(stu, "student_email", None)
	uk.student_contact_no = (
		getattr(stu, "mobile_no", None)
		or getattr(stu, "phone", None)
		or getattr(stu, "contact_no", None)
	)
	uk.flags.ignore_permissions = True
	uk.insert(ignore_mandatory=True)
	uk.reload()

	return {
		"application": uk.application,
		"uk_application": uk.name,
		"uk_data": uk.name,
		"country_flow_case": uk.country_flow_case,
	}


@frappe.whitelist()
def create_application_for_other_country(source_name, destination_country):
	"""Create a new Application for another country and close the Australia case."""
	if not source_name or not destination_country:
		frappe.throw("Source application and destination country are required.")

	source = frappe.get_doc("Application", source_name)
	if source.visa_refused_new_application:
		frappe.throw(
			f"New application already created: {source.visa_refused_new_application}"
		)

	new_app = frappe.new_doc("Application")
	new_app.naming_series = source.naming_series or "APP-.YYYY.-"
	new_app.student = source.student
	new_app.student_email = source.student_email
	new_app.student_contact_no = source.student_contact_no
	new_app.application_type = source.application_type or "B2B"
	new_app.agent = source.agent
	new_app.destination_country = destination_country
	new_app.dob = source.dob
	new_app.martial_status = source.martial_status
	new_app.higher_education = source.higher_education
	new_app.preferred_university = source.preferred_university
	new_app.intake = source.intake
	new_app.status = "Pending"

	for row in source.preferred_courses or []:
		new_app.append("preferred_courses", {"course": row.course})

	new_app.flags.skip_preferred_course_validation = not bool(new_app.preferred_courses)
	new_app.insert(ignore_permissions=True)

	source.visa_refused_new_application = new_app.name
	source.visa_refused_closed_status = "Case Closed from Australia — new application created"
	source.status = "Closed"
	source.save(ignore_permissions=True)

	return new_app.name


APPLICATION_ATTACH_STAGE_MAP = {
	"school_docs_pdf": "Processing — Academics",
	"passport_upload": "Processing — Passport",
	"application_form_1_upload": "Processing — Applications",
	"application_form_2_upload": "Processing — Applications",
	"application_form_3_upload": "Processing — Applications",
	"application_form_4_upload": "Processing — Applications",
	"sop_upload": "Processing — Applications",
	"sop_portal_or_vendor_upload": "Processing — Applications",
	"sponsor_1_docs_pdf_upload": "Submitted — Funds & Documents",
	"sponsor_2_docs_pdf_upload": "Submitted — Funds & Documents",
	"sponsor_3_docs_pdf_upload": "Submitted — Funds & Documents",
	"gs_sop_upload": "Submitted — GS & Affidavits",
	"gs_form_1_upload": "Submitted — GS & Affidavits",
	"gs_form_2_upload": "Submitted — GS & Affidavits",
	"sponsorship_affidavit_upload": "Submitted — GS & Affidavits",
	"student_affidavit_upload": "Submitted — GS & Affidavits",
	"requirement_document_upload": "GS Processing",
	"shop_act_additional_document": "Financial / Sponsors",
	"tuition_fee_upload": "GS Approved",
	"gha_oshc_upload": "GS Approved",
	"agent_oshc_upload": "GS Approved",
	"student_oshc_upload": "GS Approved",
	"acceptance_requirement_upload": "Acceptance",
	"coe_uploaded": "COE",
	"agent_medical_upload": "COE",
	"student_medical_upload": "COE",
	"form_956a_upload": "COE",
	"visa_sop_upload": "COE",
	"original_funds_upload": "COE",
	"financial_matrix_upload": "COE",
	"visa_application_upload": "COE",
	"immi_acknowledgement_upload": "File Lodged",
	"hap_id_upload": "File Lodged",
	"visa_copy_upload": "Visa",
	"spouse_visa_upload": "Visa",
	"refused_letter_upload": "Visa Refused",
	"refund_form_upload": "Visa Refused",
	"oshc_refund_form_upload": "Visa Refused",
	"oshc_refund_invoice_upload": "Refund Processing",
	"close_case_upload_issue_resolved": "Refunded",
	"close_case_upload_no_issue": "Refunded",
}

# Child tables often store Attach as upload_document but File.attached_to_field
# becomes "upload_document" on parent — map by parentfield instead.
APPLICATION_CHILD_TABLE_STAGE_MAP = {
	"documents_10th_to_12th": "Processing — Academics",
	"documents_verified_pdf": "Processing — Academics",
	"graduation_verification_documents": "Processing — Academics",
	"study_gap_proof": "Details — Study Gap",
	"study_gap_proof_list": "Processing — Study Gap",
	"documents_passport_application_form_sop": "Processing — Applications",
	"english_test_details": "Processing — English Test",
	"spouse_details_list": "Processing — Spouse",
	"supporting_documents": "Submitted — Supporting Documents",
	"student_academic_verification": "Submitted — Academics",
	"spouse_academic_verification": "Submitted — Academics",
	"table_ihmq": "Submitted — Sponsors",
	"all_documents": "Financials",
	"financial_documents": "Financials",
	"offer_letter_upload": "Offer Letter",
	"other_documents_offer": "Offer Letter",
	"defer_supporting_documents": "Offer Letter — Defer",
	"defer_offer_letter_upload": "Offer Letter — Defer",
	"defer_other_documents": "Offer Letter — Defer",
	"english_requirement_documents": "Financials — Conditions",
	"gap_justification_documents": "Financials — Conditions",
	"academic_transcript_documents": "Financials — Conditions",
	"other_condition_documents": "Financials — Conditions",
	"enrollment_documents": "Enrollment",
	"need_assessment_vendors": "Details — Need Assessment",
}

CHILD_ATTACH_FIELDNAMES = (
	"upload_document",
	"ielts_upload",
	"pte_upload",
	"toefl_upload",
	"document",
	"attach",
	"file",
)


def _register_file_keys(mapping, value, meta):
	"""Store multiple stage hints per file key (same file can appear in multiple tables)."""
	if not value or not isinstance(value, str):
		return
	for key in (value, value.split("?")[0], value.rsplit("/", 1)[-1]):
		if not key:
			continue
		mapping.setdefault(key, [])
		if meta not in mapping[key]:
			mapping[key].append(meta)


def _pick_best_hint(hints_list):
	if not hints_list:
		return None
	priority = {
		"Processing — Academics": 0,
		"Processing — Passport": 1,
		"Processing — Applications": 2,
		"Processing — English Test": 3,
		"Offer Letter": 4,
		"Offer Letter — Defer": 5,
		"Submitted — Supporting Documents": 6,
		"Submitted — Academics": 7,
		"Submitted — Sponsors": 8,
		"Submitted — Funds & Documents": 9,
		"Submitted — GS & Affidavits": 10,
		"Financials — Conditions": 11,
		"Financials": 12,
		"Details — Study Gap": 13,
		"Details — Need Assessment": 14,
	}
	return sorted(hints_list, key=lambda h: priority.get(h.get("stage"), 50))[0]


def _collect_application_file_stage_hints(doc):
	"""Build file_url/file_name → [{stage, fieldname, field_label}, ...] from parent + child attaches."""
	hints = {}
	meta = frappe.get_meta("Application")
	label_by_field = {df.fieldname: df.label for df in meta.fields if df.fieldname}

	for fieldname, stage in APPLICATION_ATTACH_STAGE_MAP.items():
		_register_file_keys(
			hints,
			doc.get(fieldname),
			{
				"stage": stage,
				"fieldname": fieldname,
				"field_label": label_by_field.get(fieldname) or fieldname,
			},
		)

	# Child tables currently on the DocType
	for table_field in doc.meta.get_table_fields():
		parentfield = table_field.fieldname
		stage = APPLICATION_CHILD_TABLE_STAGE_MAP.get(parentfield)
		if not stage:
			stage = label_by_field.get(parentfield) or parentfield.replace("_", " ").title()

		table_label = label_by_field.get(parentfield) or parentfield
		for row in doc.get(parentfield) or []:
			for child_field in CHILD_ATTACH_FIELDNAMES:
				value = row.get(child_field) if hasattr(row, "get") else None
				if not value:
					continue
				_register_file_keys(
					hints,
					value,
					{
						"stage": stage,
						"fieldname": parentfield,
						"field_label": table_label,
					},
				)

	# Also scan historical/orphan child rows by parent (field may no longer be on meta)
	for doctype, value_field in (
		("student documents", "upload_document"),
		("Application Documents 10th To 12th", "upload_document"),
		("Graduation Verification", "upload_document"),
		("Enrollment Document", "upload_document"),
		("Study Gap Proof", "upload_document"),
	):
		if not frappe.db.exists("DocType", doctype):
			continue
		child_meta = frappe.get_meta(doctype)
		if not child_meta.has_field(value_field):
			attach_fields = [
				df.fieldname
				for df in child_meta.fields
				if df.fieldtype in ("Attach", "Attach Image")
			]
			if not attach_fields:
				continue
			value_field = attach_fields[0]

		rows = frappe.get_all(
			doctype,
			filters={"parenttype": "Application", "parent": doc.name},
			fields=["parentfield", value_field],
		)
		for row in rows:
			parentfield = row.get("parentfield") or ""
			value = row.get(value_field)
			if not value:
				continue
			stage = APPLICATION_CHILD_TABLE_STAGE_MAP.get(parentfield) or (
				label_by_field.get(parentfield)
				or (parentfield.replace("_", " ").title() if parentfield else "Other / Uncategorized")
			)
			table_label = label_by_field.get(parentfield) or parentfield or "Attachment"
			_register_file_keys(
				hints,
				value,
				{
					"stage": stage,
					"fieldname": parentfield or value_field,
					"field_label": table_label,
				},
			)

	return hints


@frappe.whitelist()
def get_application_documents_by_stage(name):
	"""Return Application attachments grouped by stage/upload field."""
	if not name or not frappe.db.exists("Application", name):
		frappe.throw("Application not found")

	frappe.has_permission("Application", "read", doc=name, throw=True)

	doc = frappe.get_doc("Application", name)
	hints = _collect_application_file_stage_hints(doc)

	files = frappe.get_all(
		"File",
		filters={"attached_to_doctype": "Application", "attached_to_name": name},
		fields=[
			"name",
			"file_name",
			"file_url",
			"file_size",
			"is_private",
			"creation",
			"attached_to_field",
		],
		order_by="creation desc",
	)

	grouped = {}
	for row in files:
		fieldname = row.get("attached_to_field") or ""
		matched = []

		# Prefer matching by actual stored file URL / name (child tables use upload_document)
		for candidate in (
			row.file_url or "",
			(row.file_url or "").split("?")[0],
			row.file_name or "",
			(row.file_url or "").rsplit("/", 1)[-1],
		):
			if candidate and candidate in hints:
				matched = hints[candidate]
				break

		hint = _pick_best_hint(matched)
		if hint:
			stage = hint["stage"]
			fieldname = hint["fieldname"]
			field_label = hint["field_label"]
		elif fieldname in APPLICATION_ATTACH_STAGE_MAP:
			stage = APPLICATION_ATTACH_STAGE_MAP[fieldname]
			df = frappe.get_meta("Application").get_field(fieldname)
			field_label = (df.label if df else None) or fieldname
		elif fieldname in APPLICATION_CHILD_TABLE_STAGE_MAP:
			stage = APPLICATION_CHILD_TABLE_STAGE_MAP[fieldname]
			df = frappe.get_meta("Application").get_field(fieldname)
			field_label = (df.label if df else None) or fieldname
		else:
			stage = "Other / Uncategorized"
			field_label = "Attachment"

		file_url = row.file_url or ""
		if row.is_private and file_url:
			file_url = (
				"/api/method/frappe.core.doctype.file.file.download_file"
				f"?file_url={quote_plus(file_url)}"
			)

		grouped.setdefault(stage, []).append(
			{
				"name": row.name,
				"file_name": row.file_name,
				"file_url": file_url,
				"file_size": row.file_size,
				"creation": frappe.format(row.creation, {"fieldtype": "Datetime"}) if row.creation else "",
				"attached_to_field": fieldname,
				"field_label": field_label,
			}
		)

	# Stable stage order
	ordered = {}
	seen = set()
	preferred = []
	for stage in list(APPLICATION_ATTACH_STAGE_MAP.values()) + list(
		APPLICATION_CHILD_TABLE_STAGE_MAP.values()
	):
		if stage not in preferred:
			preferred.append(stage)
	preferred.append("Other / Uncategorized")

	for stage in preferred:
		if stage in grouped:
			ordered[stage] = grouped[stage]
			seen.add(stage)
	for stage, rows in grouped.items():
		if stage not in seen:
			ordered[stage] = rows

	return ordered

