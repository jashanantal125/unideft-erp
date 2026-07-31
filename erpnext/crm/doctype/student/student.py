# Copyright (c) 2025, Unideft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.desk.form.assign_to import add as assign_to_user, clear as clear_assignments

<<<<<<< HEAD
=======
AGENT_ROLES = ("Agent", "B2B Agent", "B2C Agent", "agents")


def user_is_agent(user=None):
	roles = set(frappe.get_roles(user or frappe.session.user))
	return bool(roles.intersection(AGENT_ROLES))

>>>>>>> jashans-updates

class Student(Document):
	@staticmethod
	def get_list_query(query):
<<<<<<< HEAD
		"""Filter students for Agent role - only show students linked to applications where agent matches logged-in user's agent"""
		if "Agent" in frappe.get_roles():
			# Get the agent record linked to the current user
			agent_name = frappe.db.get_value("Agent", {"user": frappe.session.user}, "name")
			if agent_name:
				Student = frappe.qb.DocType("Student")
				Application = frappe.qb.DocType("Application")
				# Join with Application to filter by agent
				query = query.join(Application).on(Application.student == Student.name).where(Application.agent == agent_name)
			else:
				# If user has no agent record, show nothing
				Student = frappe.qb.DocType("Student")
				query = query.where(Student.name == "")
		return query
=======
		"""Agents only see students they created (or linked via their applications)."""
		if not user_is_agent():
			return query

		# Pure agents (no staff roles) get a scoped list
		staff_roles = {"System Manager", "CRM Admin", "CRM Sales Staff", "Team Lead", "Team Executive"}
		if set(frappe.get_roles()).intersection(staff_roles):
			return query

		Student = frappe.qb.DocType("Student")
		Application = frappe.qb.DocType("Application")

		agent_name = frappe.db.get_value("Agent", {"user": frappe.session.user}, "name")
		# Match Application.agent as User email OR Agent doc name (legacy mix)
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

>>>>>>> jashans-updates
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from erpnext.crm.doctype.student_counselling.student_counselling import StudentCounselling
		from erpnext.crm.doctype.student_documents.student_documents import studentdocuments
		from erpnext.crm.doctype.university_course.university_course import UniversityCourse
		from frappe.types import DF

<<<<<<< HEAD
		area_of_interest: DF.Data
=======
		agent_request_type: DF.Literal["", "Assessment", "Expert Advice"]
		area_of_interest: DF.Data | None
>>>>>>> jashans-updates
		assigned_to: DF.Link | None
		birthday: DF.Date | None
		city: DF.Data | None
		comment: DF.SmallText | None
		counsellings: DF.Table[StudentCounselling]
		country: DF.Link | None
<<<<<<< HEAD
		country_code: DF.Data
=======
		country_code: DF.Data | None
		course_name: DF.Data | None
>>>>>>> jashans-updates
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
<<<<<<< HEAD
		state: DF.Data
		table_rnxy: DF.Table[studentdocuments]
		testscore: DF.Data | None
		title: DF.Data | None
	# end: auto-generated types

	def validate(self):
=======
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
				frappe.throw(frappe._("Please select Destination Country"))
			if not self.agent_request_type:
				frappe.throw(frappe._("Please select Assessment or Expert Advice"))

>>>>>>> jashans-updates
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
<<<<<<< HEAD
		
		# Sync assigned_to field with Frappe's assignment system
		if self.has_value_changed("assigned_to"):
			if self.assigned_to:
				# Clear existing assignments and assign to new user
=======

		# Sync assigned_to field with Frappe's assignment system
		if self.has_value_changed("assigned_to"):
			if self.assigned_to:
>>>>>>> jashans-updates
				clear_assignments(self.doctype, self.name)
				assign_to_user({
					"assign_to": [self.assigned_to],
					"doctype": self.doctype,
					"name": self.name,
					"description": f"Student: {self.first_name} {self.last_name or ''}"
				})
			else:
<<<<<<< HEAD
				# Clear assignments if field is cleared
				clear_assignments(self.doctype, self.name)
		
		# Ensure all counselling rows have student_name set
		# For new students, this will be set after save, but we prepare it here
		if self.counsellings:
			for counselling_row in self.counsellings:
				# If student is new (no name yet), we'll set it after save
				# But if name exists, ensure it's set
				if self.name and not counselling_row.student_name:
					counselling_row.student_name = self.name
	
	def on_update(self):
		"""Sync counsellings from child table to main Counsellings doctype"""
		if not self.name:
			# Student not saved yet, skip sync
			return
		
		# First, ensure all counselling rows have student_name set
=======
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
			self.area_of_interest = self.agent_request_type or "Agent Intake"
		if not self.gender:
			self.gender = "Other"
		if not self.country_code:
			self.country_code = "N/A"

	def on_update(self):
		"""Sync counsellings from child table to main Counsellings doctype"""
		if not self.name:
			return

>>>>>>> jashans-updates
		if self.counsellings:
			for counselling_row in self.counsellings:
				if not counselling_row.student_name or counselling_row.student_name != self.name:
					counselling_row.student_name = self.name
<<<<<<< HEAD
		
		# Now sync to main Counsellings doctype
		if self.counsellings:
			for counselling_row in self.counsellings:
				try:
					# Skip if required fields are missing
					if not counselling_row.schedule_at:
						continue
					
					# Ensure student_name is set
					if not counselling_row.student_name:
						counselling_row.student_name = self.name
					
					# Check if a Counsellings record already exists for this child table row
					# Match by student_name and schedule_at (using datetime comparison)
					existing_counselling = None
					if counselling_row.name:
						# If child table row has a name, try to find by matching schedule_at
=======

		if self.counsellings:
			for counselling_row in self.counsellings:
				try:
					if not counselling_row.schedule_at:
						continue

					if not counselling_row.student_name:
						counselling_row.student_name = self.name

					existing_counselling = None
					if counselling_row.name:
>>>>>>> jashans-updates
						all_counsellings = frappe.get_all(
							"Counsellings",
							filters={"student_name": self.name},
							fields=["name", "schedule_at"]
						)
						for c in all_counsellings:
							if c.schedule_at and counselling_row.schedule_at:
<<<<<<< HEAD
								# Compare datetimes
								if str(c.schedule_at) == str(counselling_row.schedule_at):
									existing_counselling = c.name
									break
					
					if existing_counselling:
						# Update existing record
						counselling_doc = frappe.get_doc("Counsellings", existing_counselling)
					else:
						# Create new record
=======
								if str(c.schedule_at) == str(counselling_row.schedule_at):
									existing_counselling = c.name
									break

					if existing_counselling:
						counselling_doc = frappe.get_doc("Counsellings", existing_counselling)
					else:
>>>>>>> jashans-updates
						counselling_doc = frappe.get_doc({
							"doctype": "Counsellings",
							"student_name": self.name
						})
<<<<<<< HEAD
					
					# Update all fields from child table
=======

>>>>>>> jashans-updates
					counselling_doc.schedule_at = counselling_row.schedule_at
					counselling_doc.meeting_type = counselling_row.meeting_type
					counselling_doc.meeting_link = counselling_row.meeting_link or None
					counselling_doc.assign_to = counselling_row.assign_to
					counselling_doc.destination_manager = counselling_row.destination_manager or None
					counselling_doc.destination_country = counselling_row.destination_country
					counselling_doc.remarks = counselling_row.remarks
<<<<<<< HEAD
					
=======

>>>>>>> jashans-updates
					counselling_doc.save(ignore_permissions=True)
					frappe.db.commit()
				except Exception as e:
					frappe.log_error(f"Error syncing counselling: {str(e)}", "Counselling Sync Error")
					frappe.log_error(frappe.get_traceback(), "Counselling Sync Error Traceback")
<<<<<<< HEAD
		
		# Also delete Counsellings records that were removed from child table
		# Get all current counselling schedule_at values (as strings for comparison)
=======

>>>>>>> jashans-updates
		current_schedule_times = []
		if self.counsellings:
			for row in self.counsellings:
				if row.schedule_at:
<<<<<<< HEAD
					# Convert to string for comparison
					current_schedule_times.append(str(row.schedule_at))
		
		# Find and delete orphaned Counsellings records
=======
					current_schedule_times.append(str(row.schedule_at))

>>>>>>> jashans-updates
		all_counsellings = frappe.get_all(
			"Counsellings",
			filters={"student_name": self.name},
			fields=["name", "schedule_at"]
		)
<<<<<<< HEAD
		
=======

>>>>>>> jashans-updates
		for counselling in all_counsellings:
			counselling_schedule = str(counselling.schedule_at) if counselling.schedule_at else None
			if counselling_schedule and counselling_schedule not in current_schedule_times:
				try:
					frappe.delete_doc("Counsellings", counselling.name, ignore_permissions=True, force=True)
					frappe.db.commit()
				except Exception as e:
					frappe.log_error(f"Error deleting counselling: {str(e)}", "Counselling Delete Error")
<<<<<<< HEAD

	pass

=======
>>>>>>> jashans-updates
