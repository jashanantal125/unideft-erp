# Copyright (c) 2026, Unideft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

ADMISSION_ROLES = ("Admission 1", "Admission 2")
CRO_ROLES = ("CRO", "CRO Head")
ADMIN_ROLES = ("System Manager", "Administrator", "CRM Admin")


def _users_with_role(role):
	return frappe.get_all(
		"Has Role",
		filters={"role": role, "parenttype": "User"},
		pluck="parent",
	)


def _notify(users, subject, doc):
	"""Raise a desk notification against this Assessment Request."""
	seen = set()
	for user in users:
		if not user or user in seen or user == frappe.session.user:
			continue
		if not frappe.db.get_value("User", user, "enabled"):
			continue
		seen.add(user)
		frappe.get_doc(
			{
				"doctype": "Notification Log",
				"for_user": user,
				"type": "Alert",
				"document_type": doc.doctype,
				"document_name": doc.name,
				"subject": subject,
			}
		).insert(ignore_permissions=True)


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
		if not (self.first_name or "").strip():
			frappe.throw(frappe._("First Name is required to create a new Student"))

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
					"Add at least one Preferred Country so Home Country can be set on the Student"
				)
			)

		student = frappe.get_doc(
			{
				"doctype": "Student",
				"first_name": self.first_name.strip(),
				"last_name": (self.last_name or "").strip() or None,
				"email": email,
				"mobile": mobile,
				"destination_country": destination,
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
		# Closed is terminal. Without this the CRO Close button would be undone on
		# the very same save, because a vendor row still sitting on "Open" pushes
		# the request back to "In Progress".
		if self.status == "Closed":
			return

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
		self._notify_cro_on_options_provided()

	def _notify_cro_on_options_provided(self):
		"""C4 handoff - Admissions answering "Have You Provided?" hands over to CRO.

		The rest of the vendor row (Student Confirmation, Application Punch,
		Application ID) is CRO's to fill, so CRO is told the moment the handoff
		point is reached rather than having to poll the request.
		"""
		before = self.get_doc_before_save()
		if not before:
			return

		previous = {row.name: row.options_provided_to_student for row in before.assessment_vendors}
		handed_over = [
			row
			for row in self.assessment_vendors
			if row.options_provided_to_student
			and previous.get(row.name) != row.options_provided_to_student
		]
		if not handed_over:
			return

		recipients = []
		for role in CRO_ROLES:
			recipients.extend(_users_with_role(role))

		_notify(
			recipients,
			frappe._("Assessment {0} is ready for CRO - options provided to student").format(
				self.name
			),
			self,
		)

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
@frappe.validate_and_sanitize_search_inputs
def course_query_for_countries(doctype, txt, searchfield, start, page_len, filters):
	"""Courses whose university sits in one of the student's preferred countries.

	University.country is a plain Data field, so the match is on the stored
	string rather than a Country link.
	"""
	countries = (filters or {}).get("countries") or []
	if isinstance(countries, str):
		countries = [countries]
	countries = [c for c in countries if c]
	if not countries:
		return []

	return frappe.db.sql(
		"""
		SELECT c.name, c.course_name, u.country
		FROM `tabCourse` c
		INNER JOIN `tabUniversity` u ON u.name = c.university
		WHERE u.country IN %(countries)s
		AND (c.name LIKE %(txt)s OR c.course_name LIKE %(txt)s)
		ORDER BY c.course_name
		LIMIT %(start)s, %(page_len)s
		""",
		{
			"countries": tuple(countries),
			"txt": f"%{txt or ''}%",
			"start": start or 0,
			"page_len": page_len or 20,
		},
	)


@frappe.whitelist()
def submit_assessment_response(name):
	"""C3 - publish the shortlisted courses back to the agent.

	Flips the request into "response submitted", which is what makes the
	Course Shortlisting table (and its per-row Apply Now) visible to the agent,
	then notifies and comments so the agent has a trail on the document.
	"""
	doc = frappe.get_doc("Assessment Request", name)
	doc.check_permission("write")

	roles = set(frappe.get_roles())
	if not roles.intersection(CRO_ROLES + ADMISSION_ROLES + ADMIN_ROLES):
		frappe.throw(frappe._("Only Admissions or CRO can submit an assessment response"))

	if not doc.course_shortlisting:
		frappe.throw(frappe._("Add at least one course to the Course Shortlisting table first"))

	if doc.response_submitted:
		frappe.throw(frappe._("The response for this Assessment Request has already been submitted"))

	doc.response_submitted = 1
	doc.response_submitted_on = frappe.utils.now_datetime()
	doc.response_submitted_by = frappe.session.user
	if doc.status == "Open":
		doc.status = "In Progress"
	doc.save(ignore_permissions=True)

	doc.add_comment(
		"Comment",
		frappe._(
			"Assessment Request response is available - see the Course Shortlisting table below."
		),
	)

	# The agent who raised it, plus whoever the request is recorded against.
	recipients = [doc.requested_by, doc.owner]
	if doc.cro_agent_name:
		agent_user = frappe.db.get_value("Agent", doc.cro_agent_name, "user")
		if agent_user:
			recipients.append(agent_user)

	_notify(recipients, frappe._("Response on Assessment Request received"), doc)

	return {"response_submitted": 1}


@frappe.whitelist()
def close_assessment_request(name):
	"""C4 - the Close button at the end of the CRO section."""
	doc = frappe.get_doc("Assessment Request", name)
	doc.check_permission("write")

	roles = set(frappe.get_roles())
	if not roles.intersection(CRO_ROLES + ADMIN_ROLES):
		frappe.throw(frappe._("Only CRO can close an Assessment Request"))

	doc.status = "Closed"
	doc.save(ignore_permissions=True)
	doc.add_comment("Comment", frappe._("Assessment Request closed by {0}").format(frappe.session.user))
	return {"status": doc.status}


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
