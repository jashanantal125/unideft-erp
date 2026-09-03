# Copyright (c) 2025, Unideft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.desk.form.assign_to import add as assign_to_user, clear as clear_assignments

AGENT_ROLES = ("Agent", "B2B Agent", "B2C Agent", "agents")


def user_is_agent(user=None):
	roles = set(frappe.get_roles(user or frappe.session.user))
	return bool(roles.intersection(AGENT_ROLES))


# Roles that legitimately see every Student.
UNRESTRICTED_ROLES = {
	"System Manager",
	"Administrator",
	"CRM Admin",
	"CRM Sales Staff",
	"CRO",
	"CRO Head",
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
	)"""


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

	return bool(
		frappe.db.exists(
			"Application",
			{"student": doc.name, "agent": ["in", _agent_keys(user)]},
		)
	)


class Student(Document):
	@staticmethod
	def get_list_query(query):
		"""Scope Student list by role.

		- CRO / CRM Admin / System Manager: all students
		- Admission / Country Head / Team: students whose Home Country is in their Team Territory
		- Agents: own students + linked via applications
		"""
		user_roles = set(frappe.get_roles())
		user = frappe.session.user
		Student = frappe.qb.DocType("Student")

		if user_roles & {
			"System Manager",
			"Administrator",
			"CRM Admin",
			"CRM Sales Staff",
			"CRO",
			"CRO Head",
		}:
			return query

		# Admission / Country Head / Team Lead — filter by assigned countries
		teams = []
		if "Country Head" in user_roles:
			teams = frappe.get_all("Team", filters={"country_head": user}, pluck="name")
		elif "Admission 1" in user_roles:
			teams = frappe.get_all("Team", filters={"admission_1": user}, pluck="name")
		elif "Admission 2" in user_roles:
			teams = frappe.get_all("Team", filters={"admission_2": user}, pluck="name")
		elif "Team Lead" in user_roles:
			teams = frappe.get_all("Team", filters={"team_leader": user}, pluck="name")
		elif "Team Executive" in user_roles:
			# Executives are assigned per application; allow students for teams they appear on
			teams = frappe.db.sql(
				"""
				SELECT DISTINCT parent FROM `tabTeam`
				WHERE admission_1 = %(user)s OR admission_2 = %(user)s OR team_leader = %(user)s
				""",
				{"user": user},
				pluck="parent",
			) or []
			# Also allow students linked to applications assigned to this executive
			pass

		if teams or ("Admission 1" in user_roles or "Admission 2" in user_roles or "Country Head" in user_roles or "Team Lead" in user_roles):
			countries = []
			if teams:
				countries = frappe.get_all(
					"Team Territory",
					filters={"parent": ["in", teams]},
					pluck="country",
				)
			countries = [c for c in countries if c]
			if countries:
				query = query.where(Student.destination_country.isin(countries))
				return query
			# No territory configured — fall through to no-match for admission roles
			if user_roles & {"Admission 1", "Admission 2", "Country Head", "Team Lead"}:
				return query.where(Student.name == "__no_match__")

		if "Team Executive" in user_roles:
			Application = frappe.qb.DocType("Application")
			linked = (
				frappe.qb.from_(Application)
				.select(Application.student)
				.where(Application.assigned_executive == user)
				.where(Application.student.isnotnull())
			)
			return query.where(Student.name.isin(linked))

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

		query = query.where(
			(Student.owner == frappe.session.user) | (Student.name.isin(linked_students))
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

	def validate(self):
		if user_is_agent():
			self._apply_agent_defaults()
			if not self.destination_country:
				frappe.throw(frappe._("Please select Home Country"))

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
