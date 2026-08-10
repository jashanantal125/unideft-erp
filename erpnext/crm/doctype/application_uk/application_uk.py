# Copyright (c) 2026, Unideft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

# Case 5 (Post-grad married) allows spouse track per Case 7&8 PDF.
# Single-basis only for Case 1 & 3, or when research gate forces it.
SINGLE_BASIS_CASES = {"UK Case 1", "UK Case 3"}

STAGE_TO_STATUS = {
	"Details": "Pending",
	"Assessment": "Pending",
	"Processing": "Processing",
	"Submitted": "Processing",
	"Offer Letter": "Offer Letter Received",
	"Financial": "Financial",
	"Acceptance": "Acceptance",
	"CAS": "Acceptance",
	"Visa Lodged": "File Lodged",
	"Visa": "Visa",
	"Enrolment": "Enrollment",
	"Visa Refused": "Visa Refused",
	"Refund": "Visa Refused",
}

UK_LIVING = {
	"Inner London": 13347,
	"Outer London": 10224,
}


def _qual_for_case(higher_education):
	he = (higher_education or "").strip()
	if he in ("12th pass", "12th"):
		return "12th"
	if he == "Graduation":
		return "Graduation"
	if he in ("Post-graduation", "Masters"):
		return "Post-graduation"
	return ""


def _marital_for_case(martial_status):
	ms = (martial_status or "").strip()
	if ms == "Married":
		return "Married"
	if ms in ("Single", "Not Married", "Unmarried"):
		return "Not Married"
	return ""


def resolve_uk_case(higher_education=None, martial_status=None, uk_qualification=None, uk_marital_status=None):
	qual = _qual_for_case(higher_education) or (uk_qualification or "").strip()
	marital = _marital_for_case(martial_status) or (uk_marital_status or "").strip()
	married = marital == "Married"

	if qual == "12th":
		return "UK Case 1" if married else "UK Case 2"
	if qual == "Graduation":
		return "UK Case 3" if married else "UK Case 4"
	if qual == "Post-graduation":
		return "UK Case 5" if married else "UK Case 6"
	return "UK Case 2"


class ApplicationUK(Document):
	@staticmethod
	def get_list_query(query):
		"""Mirror Application permission hierarchy for UK applications."""
		user_roles = set(frappe.get_roles())
		user = frappe.session.user
		UK = frappe.qb.DocType("Application UK")

		if user_roles & {"System Manager", "Administrator", "CRM Admin"}:
			return query

		if "CRO Head" in user_roles:
			agents = frappe.get_all("Agent", filters={"cro_head": user}, pluck="name")
			if agents:
				return query.where(UK.agent.isin(agents))
			return query.where(UK.name == "__no_match__")

		if "Country Head" in user_roles:
			teams = frappe.get_all("Team", filters={"country_head": user}, pluck="name")
			if teams:
				return query.where(UK.assigned_team.isin(teams))
			return query.where(UK.name == "__no_match__")

		if "CRO" in user_roles:
			teams = frappe.get_all("Team", filters={"cro": user}, pluck="name")
			if not teams:
				return query.where(UK.name == "__no_match__")
			agents = frappe.get_all("Agent", filters={"sales_team": ["in", teams]}, pluck="name")
			if agents:
				return query.where(UK.agent.isin(agents))
			return query.where(UK.name == "__no_match__")

		if "Admission 1" in user_roles:
			teams = frappe.get_all("Team", filters={"admission_1": user}, pluck="name")
			if teams:
				return query.where(UK.assigned_team.isin(teams))
			return query.where(UK.name == "__no_match__")

		if "Admission 2" in user_roles:
			teams = frappe.get_all("Team", filters={"admission_2": user}, pluck="name")
			if teams:
				return query.where(UK.assigned_team.isin(teams))
			return query.where(UK.name == "__no_match__")

		if "Team Lead" in user_roles:
			teams = frappe.get_all("Team", filters={"team_leader": user}, pluck="name")
			if teams:
				return query.where(UK.assigned_team.isin(teams))
			return query.where(UK.name == "__no_match__")

		if "Team Executive" in user_roles:
			return query.where(UK.assigned_executive == user)

		if user_roles & {"Agent", "B2B Agent", "B2C Agent"}:
			return query.where(UK.agent == user)

		if user_roles & {"Marketing Head", "Marketing Member", "Telecalling Head", "Telecalling Member"}:
			cro_teams = frappe.get_all("Team", filters={"cro": user}, pluck="name")
			if cro_teams:
				agents = frappe.get_all("Agent", filters={"sales_team": ["in", cro_teams]}, pluck="name")
				if agents:
					return query.where(UK.agent.isin(agents))
			return query.where(UK.name == "__no_match__")

		return query.where(UK.name == "__no_match__")

	def validate(self):
		self.apply_student_defaults()
		self.compute_current_age()
		self.recompute_case()
		self.sync_case_flags()
		self.sync_funds_required()
		self.sync_processing_agents()
		self.apply_study_gap_duration_rule()
		if not self.uk_current_stage:
			self.uk_current_stage = "Details"
		stage_status = STAGE_TO_STATUS.get(self.uk_current_stage)
		if stage_status and self.status in ("", None) and self.is_new():
			self.status = stage_status

	def apply_study_gap_duration_rule(self):
		"""Details picks duration; Accepted opens Processing proof table (no duration there)."""
		if self.study_gap != "Yes":
			self.gap_duration = None
			self.gap_duration_status = None
			self.gap_duration_not_accepted = None
			self.study_gap_upto_1_year = None
			self.study_gap_status = None
			self.study_gap_not_accepted_status = None
			if self.study_gap == "No":
				self.study_gap_ok = "✓ OK"
			self.study_gap_proof_list = []
			return

		self.study_gap_ok = None
		d = self.gap_duration
		if d in ("Below 1 Year", "Below 2 Years"):
			self.gap_duration_status = "Accepted"
			self.gap_duration_not_accepted = None
			self.study_gap_status = "Accepted"
			self.study_gap_not_accepted_status = None
			self.study_gap_upto_1_year = "Yes"
		elif d == "Above 2 Years":
			self.gap_duration_status = None
			self.gap_duration_not_accepted = "Not Accepted"
			self.study_gap_status = None
			self.study_gap_not_accepted_status = "Not Accepted"
			self.study_gap_upto_1_year = "No"
			self.study_gap_proof_list = []
		else:
			self.gap_duration_status = None
			self.gap_duration_not_accepted = None

	def compute_current_age(self):
		if not self.dob:
			self.current_age = None
			return
		from frappe.utils import getdate, nowdate

		dob = getdate(self.dob)
		today = getdate(nowdate())
		age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
		self.current_age = age if age >= 0 else None

	def sync_processing_agents(self):
		"""Ensure Direct/Vendor name columns stay filled when parent is saved."""
		default_direct = "Unideft Education Services Pvt. Ltd."
		for row in self.get("processing_agent_details") or []:
			if row.processing_agent_type == "Direct":
				if not row.our_company and frappe.db.exists("Our Company", default_direct):
					row.our_company = default_direct
				row.processing_agent_vendor = None
				row.processing_agent_direct = row.our_company or ""
			elif row.processing_agent_type == "Vendor":
				row.our_company = None
				row.processing_agent_direct = row.processing_agent_vendor or ""

	def after_insert(self):
		self.ensure_application_index()

	def on_update(self):
		self.sync_application_index()

	def on_trash(self):
		"""Delete paired Application index row when UK application is removed."""
		if self.flags.get("skip_paired_delete"):
			return
		app_name = self.application or frappe.db.get_value("Application", {"uk_data": self.name}, "name")
		if not app_name:
			return
		# Unlink both sides before deleting the pair (link check runs after on_trash)
		frappe.db.set_value("Application", app_name, "uk_data", None, update_modified=False)
		frappe.db.set_value("Application UK", self.name, "application", None, update_modified=False)
		self.application = None
		if frappe.db.exists("Application", app_name):
			app = frappe.get_doc("Application", app_name)
			app.flags.skip_paired_delete = True
			app.flags.ignore_permissions = True
			app.delete()

	def apply_student_defaults(self):
		if not self.student:
			return
		stu = frappe.get_cached_doc("Student", self.student)
		if not self.student_email:
			self.student_email = getattr(stu, "email", None) or getattr(stu, "student_email", None) or ""
		if not self.student_contact_no:
			self.student_contact_no = (
				getattr(stu, "mobile", None)
				or getattr(stu, "mobile_no", None)
				or getattr(stu, "phone", None)
				or getattr(stu, "contact_no", None)
				or ""
			)
		if not self.dob:
			self.dob = getattr(stu, "dob", None) or getattr(stu, "date_of_birth", None)

	def recompute_case(self):
		if not self.higher_education and not self.martial_status:
			return
		case = resolve_uk_case(self.higher_education, self.martial_status)
		self.country_flow_case = case
		self._apply_single_basis_flag(case)

	def sync_case_flags(self):
		case = self.country_flow_case or resolve_uk_case(self.higher_education, self.martial_status)
		self.country_flow_case = case
		self._apply_single_basis_flag(case)

	def _apply_single_basis_flag(self, case):
		# Cases 1 & 3 always single-basis; Case 5/PG can force via research gate.
		if case in SINGLE_BASIS_CASES or self.wants_process_single_basis == "Yes":
			self.single_basis_only = 1
		else:
			self.single_basis_only = 0

	def sync_funds_required(self):
		living = UK_LIVING.get(self.living_expenses_location) or 0
		if self.living_expenses_location:
			self.living_expenses = living
		tuition = frappe.utils.flt(self.full_year_tuition_fee)
		scholarship = frappe.utils.flt(self.scholarship)
		payable = frappe.utils.flt(self.payable_fee)
		self.funds_required_amount = max(tuition - scholarship, 0) + living - payable

	def ensure_application_index(self):
		if self.application:
			self.sync_application_index()
			return

		app = frappe.new_doc("Application")
		app.destination_country = "United Kingdom"
		app.country_flow_case = self.country_flow_case or "UK Case 2"
		app.application_type = self.application_type or "B2B"
		app.status = STAGE_TO_STATUS.get(self.uk_current_stage, "Pending")
		app.student = self.student
		app.agent = self.agent
		app.preferred_university = self.preferred_university
		app.course = getattr(self, "course", None)
		app.dob = self.dob
		app.martial_status = self.martial_status
		app.higher_education = self.higher_education
		app.student_email = self.student_email
		app.student_contact_no = self.student_contact_no
		app.study_gap = self.study_gap
		app.gap_duration = getattr(self, "gap_duration", None)
		app.gap_duration_status = getattr(self, "gap_duration_status", None)
		app.gap_duration_not_accepted = getattr(self, "gap_duration_not_accepted", None)
		app.study_gap_upto_1_year = getattr(self, "study_gap_upto_1_year", None)
		app.study_gap_status = getattr(self, "study_gap_status", None)
		app.study_gap_not_accepted_status = getattr(self, "study_gap_not_accepted_status", None)
		app.any_visa_refused = self.any_visa_refused
		app.intake = self.intake
		app.flags.skip_country_pack = True
		app.flags.ignore_permissions = True
		app.insert(ignore_mandatory=True)

		self.db_set("application", app.name, update_modified=False)
		app.db_set("uk_data", self.name, update_modified=False)

	def sync_application_index(self):
		if not self.application:
			return

		status = STAGE_TO_STATUS.get(self.uk_current_stage) or self.status
		values = {
			"student": self.student,
			"agent": self.agent,
			"application_type": self.application_type or "B2B",
			"country_flow_case": self.country_flow_case,
			"preferred_university": self.preferred_university,
			"course": getattr(self, "course", None),
			"dob": self.dob,
			"student_email": self.student_email,
			"student_contact_no": self.student_contact_no,
			"study_gap": self.study_gap,
			"gap_duration": getattr(self, "gap_duration", None),
			"gap_duration_status": getattr(self, "gap_duration_status", None),
			"gap_duration_not_accepted": getattr(self, "gap_duration_not_accepted", None),
			"study_gap_upto_1_year": getattr(self, "study_gap_upto_1_year", None),
			"study_gap_status": getattr(self, "study_gap_status", None),
			"study_gap_not_accepted_status": getattr(self, "study_gap_not_accepted_status", None),
			"any_visa_refused": self.any_visa_refused,
			"martial_status": self.martial_status,
			"higher_education": self.higher_education,
			"intake": self.intake,
			"uk_data": self.name,
		}
		if status:
			parent_status = frappe.db.get_value("Application", self.application, "status")
			if parent_status not in ("Closed",):
				values["status"] = status

		frappe.db.set_value("Application", self.application, values, update_modified=False)

		if self.preferred_university and not self.university_name:
			frappe.db.set_value(
				"Application UK",
				self.name,
				"university_name",
				self.preferred_university,
				update_modified=False,
			)


@frappe.whitelist()
def recompute_uk_case(uk_application, uk_qualification=None, uk_marital_status=None, higher_education=None, martial_status=None):
	if not uk_application:
		frappe.throw("Application UK is required")

	he = higher_education or uk_qualification
	ms = martial_status or uk_marital_status
	case = resolve_uk_case(he, ms)
	frappe.db.set_value(
		"Application UK",
		uk_application,
		{
			"country_flow_case": case,
			"single_basis_only": 1 if case in SINGLE_BASIS_CASES else 0,
			"higher_education": he,
			"martial_status": ms,
		},
		update_modified=False,
	)

	app = frappe.db.get_value("Application UK", uk_application, "application")
	if app:
		frappe.db.set_value("Application", app, "country_flow_case", case, update_modified=False)

	return case
