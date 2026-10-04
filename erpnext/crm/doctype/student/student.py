# Copyright (c) 2025, Unideft and contributors
# For license information, please see license.txt

import frappe
from erpnext.crm.team_utils import get_teams_for_user
from frappe.model.document import Document
from frappe.desk.form.assign_to import add as assign_to_user, clear as clear_assignments

AGENT_ROLES = ("Agent",)


def user_is_agent(user=None):
	roles = set(frappe.get_roles(user or frappe.session.user))
	return bool(roles.intersection(AGENT_ROLES))


# Roles that legitimately see every Student.
UNRESTRICTED_ROLES = {
	"System Manager",
	"Administrator",
	"CRM Admin", "Visa Admin",
	"CRM Sales Staff",
	"CRO",
	"CRO Manager",
}


def _agent_keys(user):
	"""An agent may be identified by their User id or by their Agent record."""
	keys = [user]
	agent_name = frappe.db.get_value("Agent", {"user": user}, "name")
	if agent_name:
		keys.append(agent_name)
	return keys


def get_permission_query_conditions(user=None):
	"""Restrict Student lists for agents (A1).

	Student.get_list_query already scopes the desk list view, but that hook does
	not cover report view, link-field lookups or the get_list API - an agent
	could still reach another agent's student through those. This closes the
	gap everywhere by mirroring the same rule.

	Student has no dedicated `agent` link field, so the creator is identified by
	`owner`, plus any student reachable through an Application carrying this
	agent - which is what keeps students created *for* an agent by a CRO
	visible to them.
	"""
	user = user or frappe.session.user
	if user == "Administrator":
		return ""

	roles = set(frappe.get_roles(user))
	if roles & UNRESTRICTED_ROLES:
		return ""

	if not user_is_agent(user):
		return ""

	keys = ", ".join(frappe.db.escape(key) for key in _agent_keys(user))
	escaped_user = frappe.db.escape(user)

	return f"""(
		`tabStudent`.`owner` = {escaped_user}
		or `tabStudent`.`name` in (
			select `tabApplication`.`student` from `tabApplication`
			where `tabApplication`.`agent` in ({keys})
			and `tabApplication`.`student` is not null
		)
		or `tabStudent`.`name` in (
			select `tabAssessment Request`.`student` from `tabAssessment Request`
			where (`tabAssessment Request`.`owner` = {escaped_user}
				or `tabAssessment Request`.`requested_by` = {escaped_user}
				or `tabAssessment Request`.`cro_agent_name` in ({keys}))
			and `tabAssessment Request`.`student` is not null
		)
	)"""


@frappe.whitelist()
def get_students_with_applications(search=None, start=0, page_length=40):
	"""B3 - students plus their applications, grouped by destination country.

	Goes through frappe.get_list so the A1 scoping applies here too: an agent
	sees only their own students on the card view, same as the list view.
	"""
	filters = {}
	or_filters = {}
	if search:
		like = f"%{search}%"
		or_filters = {
			"name": ["like", like],
			"first_name": ["like", like],
			"last_name": ["like", like],
			"email": ["like", like],
			"mobile": ["like", like],
		}

	students = frappe.get_list(
		"Student",
		fields=[
			"name",
			"student_id",
			"title",
			"first_name",
			"last_name",
			"email",
			"mobile",
			"destination_country",
			"country_code",
			"creation",
		],
		filters=filters,
		or_filters=or_filters,
		start=int(start or 0),
		page_length=int(page_length or 40),
		order_by="creation desc",
	)
	if not students:
		return []

	names = [s.name for s in students]
	applications = frappe.get_list(
		"Application",
		fields=[
			"name",
			"student",
			"destination_country",
			"status",
			"preferred_university",
			"course",
			"intake",
			"application_type",
			"modified",
		],
		filters={"student": ["in", names]},
		limit_page_length=0,
		order_by="creation desc",
	)

	by_student = {}
	for app in applications:
		by_student.setdefault(app.student, []).append(app)

	for student in students:
		# Group by destination country so each card reads country-by-country.
		grouped = {}
		for app in by_student.get(student.name, []):
			grouped.setdefault(app.destination_country or "Unspecified", []).append(app)
		student["applications_by_country"] = [
			{"country": country, "applications": apps}
			for country, apps in sorted(grouped.items())
		]
		student["application_count"] = len(by_student.get(student.name, []))

	return students


def has_permission(doc, ptype=None, user=None):
	"""Block an agent from opening another agent's Student by direct URL."""
	user = user or frappe.session.user
	if user == "Administrator":
		return True

	roles = set(frappe.get_roles(user))
	if roles & UNRESTRICTED_ROLES:
		return True

	if not user_is_agent(user):
		return True

	if doc.owner == user:
		return True

	keys = _agent_keys(user)
	if frappe.db.exists("Application", {"student": doc.name, "agent": ["in", keys]}):
		return True

	# Students an agent raised an Assessment Request for - including ones a CRO
	# created on the agent's behalf.
	return bool(
		frappe.db.sql(
			"""
			SELECT name FROM `tabAssessment Request`
			WHERE student = %(student)s
			AND (owner = %(user)s OR requested_by = %(user)s OR cro_agent_name IN %(keys)s)
			LIMIT 1
			""",
			{"student": doc.name, "user": user, "keys": tuple(keys)},
		)
	)


class Student(Document):
	@staticmethod
	def get_list_query(query):
		"""Scope Student list by role.

		- CRO / CRO Manager / CRM Admin / System Manager: all students
		- Application: students on their country team's assessments and
		  applications (or whose country is in the team's territory)
		- Agents: own students + linked via applications / assessments
		"""
		user_roles = set(frappe.get_roles())
		user = frappe.session.user
		Student = frappe.qb.DocType("Student")

		if user_roles & UNRESTRICTED_ROLES:
			return query

		if "Application" in user_roles:
			teams = get_teams_for_user(user, "application")
			if not teams:
				return query.where(Student.name == "__no_match__")

			AssessmentRequest = frappe.qb.DocType("Assessment Request")
			Application = frappe.qb.DocType("Application")
			assessed = (
				frappe.qb.from_(AssessmentRequest)
				.select(AssessmentRequest.student)
				.where(AssessmentRequest.assigned_team.isin(teams))
				.where(AssessmentRequest.student.isnotnull())
			)
			applied = (
				frappe.qb.from_(Application)
				.select(Application.student)
				.where(Application.assigned_team.isin(teams))
				.where(Application.student.isnotnull())
			)
			condition = Student.name.isin(assessed) | Student.name.isin(applied)
			countries = [
				c
				for c in frappe.get_all("Team Territory", filters={"parent": ["in", teams]}, pluck="country")
				if c
			]
			if countries:
				condition = condition | Student.destination_country.isin(countries)
			return query.where(condition)

		if not user_is_agent():
			return query

		Application = frappe.qb.DocType("Application")
		agent_name = frappe.db.get_value("Agent", {"user": frappe.session.user}, "name")
		agent_keys = [frappe.session.user]
		if agent_name:
			agent_keys.append(agent_name)

		linked_students = (
			frappe.qb.from_(Application)
			.select(Application.student)
			.where(Application.agent.isin(agent_keys))
			.where(Application.student.isnotnull())
		)

		AssessmentRequest = frappe.qb.DocType("Assessment Request")
		assessed_students = (
			frappe.qb.from_(AssessmentRequest)
			.select(AssessmentRequest.student)
			.where(
				(AssessmentRequest.owner == frappe.session.user)
				| (AssessmentRequest.requested_by == frappe.session.user)
				| (AssessmentRequest.cro_agent_name.isin(agent_keys))
			)
			.where(AssessmentRequest.student.isnotnull())
		)

		query = query.where(
			(Student.owner == frappe.session.user)
			| (Student.name.isin(linked_students))
			| (Student.name.isin(assessed_students))
		)
		return query

	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from erpnext.crm.doctype.student_counselling.student_counselling import StudentCounselling
		from erpnext.crm.doctype.student_documents.student_documents import studentdocuments
		from erpnext.crm.doctype.university_course.university_course import UniversityCourse
		from frappe.types import DF

		agent_request_type: DF.Literal["", "Assessment", "Expert Advice"]
		area_of_interest: DF.Data | None
		assigned_to: DF.Link | None
		birthday: DF.Date | None
		city: DF.Data | None
		comment: DF.SmallText | None
		counsellings: DF.Table[StudentCounselling]
		country: DF.Link | None
		country_code: DF.Data | None
		course_name: DF.Data | None
		destination_country: DF.Link | None
		email: DF.Data
		first_name: DF.Data
		gender: DF.Literal["", "Male", "Female", "Other"]
		highest_education: DF.Data | None
		last_name: DF.Data | None
		lead_link: DF.Link | None
		mobile: DF.Data
		naming_series: DF.Literal["STU-.YYYY.-"]
		preferred_study_level: DF.Data | None
		shortlisted_programs: DF.Table[UniversityCourse]
		state: DF.Data | None
		table_rnxy: DF.Table[studentdocuments]
		testscore: DF.Data | None
		title: DF.Data | None
		university_name: DF.Data | None
	# end: auto-generated types

	def before_insert(self):
		if user_is_agent():
			self._apply_agent_defaults()

	def after_insert(self):
		# `name` is only assigned once the row is written, so validate() cannot
		# fill student_id on the very first save.
		self.db_set("student_id", self.name, update_modified=False)

	def validate(self):
		if user_is_agent():
			self._apply_agent_defaults()
			if not self.destination_country:
				frappe.throw(frappe._("Please select Home Country"))

		# B1 - agents need the Student ID as a list column. The list view shows
		# `title`, so the STU- id was never visible; mirroring it into a real
		# field makes it a sortable, filterable column in list and report view.
		if not self.is_new():
			self.student_id = self.name

		# Set title field for display in Link dropdowns
		if self.first_name:
			if self.last_name:
				self.title = f"{self.first_name} {self.last_name}"
			else:
				self.title = self.first_name
		elif self.email:
			self.title = self.email
		else:
			self.title = self.name

		# Sync assigned_to field with Frappe's assignment system
		if self.has_value_changed("assigned_to"):
			if self.assigned_to:
				clear_assignments(self.doctype, self.name)
				assign_to_user({
					"assign_to": [self.assigned_to],
					"doctype": self.doctype,
					"name": self.name,
					"description": f"Student: {self.first_name} {self.last_name or ''}"
				})
			else:
				clear_assignments(self.doctype, self.name)

		if self.counsellings:
			for counselling_row in self.counsellings:
				if self.name and not counselling_row.student_name:
					counselling_row.student_name = self.name

	def _apply_agent_defaults(self):
		"""Fill staff-required placeholders so agents can save the short form."""
		if not self.state:
			self.state = "N/A"
		if not self.area_of_interest:
			self.area_of_interest = "Agent Intake"
		if not self.gender:
			self.gender = "Other"
		if not self.country_code:
			self.country_code = "N/A"

	def on_update(self):
		"""Sync counsellings from child table to main Counsellings doctype"""
		if not self.name:
			return

		if self.counsellings:
			for counselling_row in self.counsellings:
				if not counselling_row.student_name or counselling_row.student_name != self.name:
					counselling_row.student_name = self.name

		if self.counsellings:
			for counselling_row in self.counsellings:
				try:
					if not counselling_row.schedule_at:
						continue

					if not counselling_row.student_name:
						counselling_row.student_name = self.name

					existing_counselling = None
					if counselling_row.name:
						all_counsellings = frappe.get_all(
							"Counsellings",
							filters={"student_name": self.name},
							fields=["name", "schedule_at"]
						)
						for c in all_counsellings:
							if c.schedule_at and counselling_row.schedule_at:
								if str(c.schedule_at) == str(counselling_row.schedule_at):
									existing_counselling = c.name
									break

					if existing_counselling:
						counselling_doc = frappe.get_doc("Counsellings", existing_counselling)
					else:
						counselling_doc = frappe.get_doc({
							"doctype": "Counsellings",
							"student_name": self.name
						})
					counselling_doc.schedule_at = counselling_row.schedule_at
					counselling_doc.meeting_type = counselling_row.meeting_type
					counselling_doc.meeting_link = counselling_row.meeting_link or None
					counselling_doc.assign_to = counselling_row.assign_to
					counselling_doc.destination_manager = counselling_row.destination_manager or None
					counselling_doc.destination_country = counselling_row.destination_country
					counselling_doc.remarks = counselling_row.remarks
					counselling_doc.save(ignore_permissions=True)
					frappe.db.commit()
				except Exception as e:
					frappe.log_error(f"Error syncing counselling: {str(e)}", "Counselling Sync Error")
					frappe.log_error(frappe.get_traceback(), "Counselling Sync Error Traceback")
		current_schedule_times = []
		if self.counsellings:
			for row in self.counsellings:
				if row.schedule_at:
					current_schedule_times.append(str(row.schedule_at))

		all_counsellings = frappe.get_all(
			"Counsellings",
			filters={"student_name": self.name},
			fields=["name", "schedule_at"]
		)
		for counselling in all_counsellings:
			counselling_schedule = str(counselling.schedule_at) if counselling.schedule_at else None
			if counselling_schedule and counselling_schedule not in current_schedule_times:
				try:
					frappe.delete_doc("Counsellings", counselling.name, ignore_permissions=True, force=True)
					frappe.db.commit()
				except Exception as e:
					frappe.log_error(f"Error deleting counselling: {str(e)}", "Counselling Delete Error")
