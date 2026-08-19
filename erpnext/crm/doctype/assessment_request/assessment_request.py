# Copyright (c) 2026, Unideft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class AssessmentRequest(Document):
	def before_validate(self):
		if not self.requested_by:
			self.requested_by = frappe.session.user
		if not self.request_date:
			self.request_date = frappe.utils.today()

	def before_insert(self):
		if not self.requested_by:
			self.requested_by = frappe.session.user
		if not self.request_date:
			self.request_date = frappe.utils.today()

	def validate(self):
		self.ensure_student()
		self.sync_student_details()
		self.auto_assign_team()
		self.sync_status_from_vendors()

	def ensure_student(self):
		"""Link existing student or create one when agent says student is not registered."""
		if self.student_already_registered == "Yes":
			if not self.student:
				frappe.throw(frappe._("Please select Student ID / Student Name"))
			return

		if self.student_already_registered != "No":
			return

		# Already linked from a previous save
		if self.student and frappe.db.exists("Student", self.student):
			return

		email = (self.email_address or "").strip()
		mobile = (self.mobile_number or "").strip()
		if not email:
			frappe.throw(frappe._("Email Address is required to create a new Student"))
		if not mobile:
			frappe.throw(frappe._("Mobile Number is required to create a new Student"))
		if not (self.first_name or "").strip() or not (self.last_name or "").strip():
			frappe.throw(frappe._("First Name and Last Name are required to create a new Student"))

		existing = frappe.db.get_value("Student", {"email": email}, "name")
		if existing:
			self.student = existing
			return

		destination = None
		if self.preferred_countries:
			for row in self.preferred_countries:
				if row.country:
					destination = row.country
					break
		if not destination:
			frappe.throw(
				frappe._(
					"Add at least one Preferred Country so Destination Country can be set on the Student"
				)
			)

		student = frappe.get_doc(
			{
				"doctype": "Student",
				"first_name": self.first_name.strip(),
				"last_name": self.last_name.strip(),
				"email": email,
				"mobile": mobile,
				"destination_country": destination,
				"agent_request_type": "Assessment",
				"area_of_interest": self.preferred_course_area or "Assessment",
				"state": "N/A",
				"country_code": "N/A",
				"gender": "Other",
			}
		)
		student.insert(ignore_permissions=True)
		self.student = student.name
		self.flags.new_student_created = True

	def sync_student_details(self):
		# Only pull from Student when selecting an existing registration
		if self.student_already_registered != "Yes" or not self.student:
			return
		stu = frappe.get_doc("Student", self.student)
		self.first_name = getattr(stu, "first_name", None) or self.first_name
		self.middle_name = getattr(stu, "middle_name", None) or self.middle_name
		self.last_name = getattr(stu, "last_name", None) or self.last_name
		self.mobile_number = (
			getattr(stu, "mobile", None)
			or getattr(stu, "mobile_no", None)
			or getattr(stu, "phone", None)
			or getattr(stu, "contact_no", None)
			or self.mobile_number
		)
		self.email_address = (
			getattr(stu, "email", None)
			or getattr(stu, "student_email", None)
			or self.email_address
		)

	def auto_assign_team(self):
		"""Assign team from first preferred country territory match."""
		if self.assigned_team or not self.preferred_countries:
			return
		for row in self.preferred_countries:
			if not row.country:
				continue
			team = frappe.db.sql(
				"""
				SELECT parent FROM `tabTeam Territory`
				WHERE country = %s
				LIMIT 1
				""",
				(row.country,),
			)
			if team:
				self.assigned_team = team[0][0]
				return

	def sync_status_from_vendors(self):
		if not self.assessment_vendors:
			return
		statuses = [r.assessment_status for r in self.assessment_vendors if r.assessment_status]
		if any(s == "Converted to Application" for s in statuses):
			self.status = "Converted to Application"
		elif any(s == "Closed" for s in statuses) and all(
			s in ("Closed", "Converted to Application") for s in statuses
		):
			self.status = "Closed"
		elif statuses:
			self.status = "In Progress"

	def after_insert(self):
		self._notify_student_created()

	def on_update(self):
		self._notify_student_created()

	def _notify_student_created(self):
		if getattr(self.flags, "new_student_created", False) and self.student:
			frappe.msgprint(
				frappe._("Student {0} created and linked to this Assessment Request").format(
					frappe.bold(self.student)
				),
				indicator="green",
				alert=True,
			)


@frappe.whitelist()
def get_student_details(student):
	if not student:
		return {}
	stu = frappe.get_doc("Student", student)
	return {
		"first_name": getattr(stu, "first_name", None),
		"middle_name": getattr(stu, "middle_name", None),
		"last_name": getattr(stu, "last_name", None),
		"mobile_number": (
			getattr(stu, "mobile", None)
			or getattr(stu, "mobile_no", None)
			or getattr(stu, "phone", None)
			or getattr(stu, "contact_no", None)
		),
		"email_address": getattr(stu, "email", None) or getattr(stu, "student_email", None),
	}
