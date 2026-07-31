# Copyright (c) 2026, Unideft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class AssessmentRequest(Document):
	def before_insert(self):
		if not self.requested_by:
			self.requested_by = frappe.session.user
		if not self.request_date:
			self.request_date = frappe.utils.today()

	def validate(self):
		self.sync_student_details()
		self.auto_assign_team()
		self.sync_status_from_vendors()

	def sync_student_details(self):
		if self.student_already_registered != "Yes" or not self.student:
			return
		stu = frappe.get_doc("Student", self.student)
		self.first_name = getattr(stu, "first_name", None) or self.first_name
		self.middle_name = getattr(stu, "middle_name", None) or self.middle_name
		self.last_name = getattr(stu, "last_name", None) or self.last_name
		self.mobile_number = (
			getattr(stu, "mobile_no", None)
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
			getattr(stu, "mobile_no", None)
			or getattr(stu, "phone", None)
			or getattr(stu, "contact_no", None)
		),
		"email_address": getattr(stu, "email", None) or getattr(stu, "student_email", None),
	}
