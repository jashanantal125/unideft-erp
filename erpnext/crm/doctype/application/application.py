# Copyright (c) 2025, Unideft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Application(Document):
	@staticmethod
	def get_list_query(query):
		"""Filter applications based on user role hierarchy"""
		user_roles = frappe.get_roles()
		ApplicationDoc = frappe.qb.DocType("Application")
		
		# System Manager, Administrator, and CRM Admin see all applications
		if "System Manager" in user_roles or "Administrator" in user_roles or "CRM Admin" in user_roles:
			return query
		
		# Team Lead sees applications assigned to their team(s)
		if "Team Lead" in user_roles:
			teams = frappe.get_all("Team", filters={"team_leader": frappe.session.user}, pluck="name")
			if teams:
				query = query.where(ApplicationDoc.assigned_team.isin(teams))
			else:
				# Team Lead with no team sees nothing
				query = query.where(ApplicationDoc.assigned_team == "__no_match__")
			return query
		
		# Team Executive sees only applications assigned to them
		if "Team Executive" in user_roles:
			query = query.where(ApplicationDoc.assigned_executive == frappe.session.user)
			return query
		
		# Agent sees only their own applications (where agent field matches logged-in user)
		if "Agent" in user_roles or "B2B Agent" in user_roles or "B2C Agent" in user_roles:
			query = query.where(ApplicationDoc.agent == frappe.session.user)
			return query
		
		# Default: show nothing for unknown roles
		query = query.where(ApplicationDoc.name == "__no_match__")
		return query
	
	def before_save(self):
		"""Auto-assign team based on destination country"""
		self.auto_assign_team()
	
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
		from erpnext.crm.doctype.application_course.application_course import ApplicationCourse
		from erpnext.crm.doctype.application_documents_10th_to_12th.application_documents_10th_to_12th import ApplicationDocuments10thTo12th
		from erpnext.crm.doctype.application_english_test.application_english_test import ApplicationEnglishTest
		from erpnext.crm.doctype.application_offer_letter_condition.application_offer_letter_condition import ApplicationOfferLetterCondition
		from erpnext.crm.doctype.enrollment_document.enrollment_document import EnrollmentDocument
		from erpnext.crm.doctype.application_sponsor_complete.application_sponsor_complete import ApplicationSponsorComplete
		from erpnext.crm.doctype.processing_agent_details.processing_agent_details import ProcessingAgentDetails
		from erpnext.crm.doctype.student_documents.student_documents import studentdocuments
		from frappe.types import DF

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
		any_further_requirement_offer_letter: DF.Check
		any_visa_refused: DF.Check
		application_closed: DF.Check
		application_filled_by: DF.Text | None
		application_form_1_upload: DF.Attach | None
		application_form_2_upload: DF.Attach | None
		application_form_3_upload: DF.Attach | None
		application_form_4_upload: DF.Attach | None
		application_type: DF.Literal["B2B"]
		asd: DF.Data | None
		assigned_executive: DF.Link | None
		assigned_team: DF.Link | None
		close_case: DF.Check
		close_case_status: DF.Text | None
		close_case_upload_issue_resolved: DF.Attach | None
		close_case_upload_no_issue: DF.Attach | None
		coe_uploaded: DF.Attach | None
		conditions_note: DF.Text | None
		conditions_on_offer_letter: DF.TableMultiSelect[ApplicationOfferLetterCondition]
		convince_times: DF.Int
		course_name: DF.Link | None
		current_age: DF.Int
		data_swym: DF.Text | None
		defer_conditions_on_offer_letter: DF.TableMultiSelect[ApplicationOfferLetterCondition]
		defer_course_name: DF.Link | None
		defer_full_year_tuition_fee: DF.Currency
		defer_funds_required_amount: DF.Currency
		defer_funds_required_type: DF.Literal["", "With Full Year Fee", "Without Full Year Fee"]
		defer_living_expenses: DF.Currency
		defer_offer_currency: DF.Literal["AUD", "CAD", "NZD", "USD", "INR"]
		defer_offer_letter_upload: DF.Table[studentdocuments]
		defer_offer_ok: DF.Text | None
		defer_offer_required: DF.Check
		defer_oshc: DF.Currency
		defer_other_documents: DF.Table[studentdocuments]
		defer_payable_fee: DF.Currency
		defer_scholarship: DF.Currency
		defer_travel_expenses: DF.Currency
		defer_university_intake: DF.Date | None
		defer_university_name: DF.Link | None
		destination_country: DF.Link
		dob: DF.Date
		documents_10th_to_12th: DF.Table[ApplicationDocuments10thTo12th]
		documents_10th_to_12thgraduation_copy: DF.Table[studentdocuments]
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
		full_notarized_passport_upload: DF.Attach | None
		full_year_tuition_fee: DF.Currency
		funds_required_amount: DF.Currency
		funds_required_type: DF.Literal["", "With Full Year Fee", "Without Full Year Fee"]
		ganpati_new_app_status: DF.Text | None
		gap_docs_notarized_upload: DF.Attach | None
		gap_justification_details: DF.Text | None
		gap_justification_documents: DF.Table[studentdocuments]
		gha_oshc_company_name: DF.Text | None
		gha_oshc_policy_no: DF.Text | None
		gha_oshc_upload: DF.Attach | None
		gha_policy_not_received_status: DF.Text | None
		gha_policy_received: DF.Check
		gs_any_requirement: DF.Check
		gs_approved_check: DF.Check
		gs_approved_yes_status: DF.Text | None
		gs_form_1_upload: DF.Attach | None
		gs_form_2_upload: DF.Attach | None
		gs_sop_upload: DF.Attach | None
		gs_submitted: DF.Check
		gs_submitted_reminder_date: DF.Date | None
		hap_id_upload: DF.Attach | None
		higher_education: DF.Literal["", "12th pass", "Bachelors", "Diploma", "Masters", "Certification", "Others"]
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
		login_contact_no: DF.Phone | None
		martial_status: DF.Literal["", "Married", "Single"]
		medical_arranged_by: DF.Literal["", "Our Side", "Agent", "Student"]
		naming_series: DF.Literal["APP-.YYYY.-"]
		new_app_handling_person: DF.Text | None
		new_app_handling_team: DF.Text | None
		no_process_comments: DF.Text | None
		no_process_reason: DF.Text | None
		no_requirement_status: DF.Text | None
		notarize_docs_required: DF.Check
		notarized_academic_docs_upload: DF.Attach | None
		offer_currency: DF.Literal["AUD", "CAD", "NZD", "USD", "INR"]
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
		parents_name_academics_affidavit_upload: DF.Attach | None
		parents_name_academics_status: DF.Text | None
		parents_name_matched_academics: DF.Check
		parents_name_matched_passport: DF.Check
		parents_name_passport_affidavit_upload: DF.Attach | None
		parents_name_passport_status: DF.Text | None
		passport_documents: DF.Table[studentdocuments]
		passport_stamp_check_details: DF.Text | None
		passport_stamp_or_immigration_history: DF.Check
		passport_uploaded: DF.Check
		password: DF.Password | None
		payable_fee: DF.Currency
		pending_requirement_details: DF.Text | None
		pending_requirements_completed: DF.Literal["", "Yes", "No"]
		preferred_courses: DF.Table[ApplicationCourse]
		preferred_university: DF.Link | None
		process_other_country: DF.Check
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
		schedule_interview: DF.Check
		schedule_interview_no_status: DF.Text | None
		schedule_interview_yes_status: DF.Text | None
		scholarship: DF.Currency
		send_offer_to_chat: DF.Check
		shop_act_additional_document: DF.Attach
		shop_act_uploaded: DF.Check
		sop_upload: DF.Attach | None
		sop_portal_or_vendor_upload: DF.Attach | None
		sponsor_1_docs_pdf_upload: DF.Attach | None
		sponsor_2_docs_pdf_upload: DF.Attach | None
		sponsor_3_docs_pdf_upload: DF.Attach | None
		sponsorship_affidavit_upload: DF.Attach | None
		spouse_dob: DF.Date | None
		spouse_documents: DF.Table[studentdocuments]
		spouse_gap_type: DF.Text | None
		spouse_itr_verified_as_per_work_exp: DF.Check
		spouse_name: DF.Text | None
		spouse_qualification: DF.Literal["10th Pass", "12th Pass", "Bachelors", "Masters", "Diploma", "certificate", "Others"]
		spouse_result_verification_link_if_applicable_copy: DF.Text | None
		spouse_salary_mode: DF.Literal["Cash", "Bank Account"]
		spouse_salary_slips_verified_6_months: DF.Check
		spouse_salary_statements_verified_3_months: DF.Check
		spouse_study_gap: DF.Check
		spouse_university_domain_email_id_optional_copy: DF.Text | None
		spouse_work_experience: DF.Check
		spouse_work_experience_details: DF.LongText | None
		spouse_work_experience_verified: DF.Check
		status: DF.Literal["Pending", "Processing", "Offer Letter Received", "Financial", "GS Processing", "GS Approved", "Acceptance", "COE", "File Lodged", "Visa", "Enrollment", "On Shore College change", "Visa Refused", "Closed"]
		student: DF.Link
		student_affidavit_upload: DF.Attach | None
		student_contact_no: DF.Phone | None
		student_email: DF.Text | None
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
		student_prepare: DF.Check
		student_prepare_no_status: DF.Text | None
		student_prepare_yes_status: DF.Text | None
		student_wants_college_change: DF.Literal["", "No", "Yes"]
		study_gap: DF.Check
		study_gap_ok: DF.Text | None
		study_gap_proof: DF.Table[studentdocuments]
		study_gap_proof_details: DF.Table[studentdocuments]
		submitted_date: DF.Date | None
		supporting_documents: DF.Table[studentdocuments]
		table_ihmq: DF.Table[ApplicationSponsorComplete]
		travel_expenses: DF.Currency
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
		visa_refused_not_able_to_process: DF.Text | None
		visa_refused_ok: DF.Text | None
		visa_refused_status: DF.Text | None
		visa_sop_upload: DF.Attach | None
		visa_status: DF.Literal["File Lodged", "Visa Approved", "Visa Refused"]
	# end: auto-generated types

	def validate(self):
		# Validate that maximum 3 courses are selected
		if len(self.preferred_courses) > 3:
			frappe.throw("You can select a maximum of 3 courses only.")
		
		if len(self.preferred_courses) == 0:
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

	pass

