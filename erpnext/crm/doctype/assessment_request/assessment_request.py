# Copyright (c) 2026, Unideft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

ADMISSION_ROLES = ("Admission 1", "Admission 2")
CRO_ROLES = ("CRO", "CRO Head")
ADMIN_ROLES = ("System Manager", "Administrator", "CRM Admin")

# Who can still touch a Processed request that Admissions are locked out of.
ADMISSION_EDIT_EXEMPT_ROLES = ("CRM Admin", "Administrator")


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
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from erpnext.crm.doctype.assessment_course_shortlisting.assessment_course_shortlisting import AssessmentCourseShortlisting
		from erpnext.crm.doctype.assessment_request_country.assessment_request_country import AssessmentRequestCountry
		from erpnext.crm.doctype.assessment_request_document.assessment_request_document import AssessmentRequestDocument
		from frappe.types import DF

		amended_from: DF.Link | None
		application_id: DF.Link | None
		application_when_can_apply: DF.SmallText | None
		assessment_channel: DF.Literal["", "Direct", "Vendor"]
		assigned_team: DF.Link | None
		attachments: DF.Table[AssessmentRequestDocument]
		course: DF.Link | None
		course_shortlisting: DF.Table[AssessmentCourseShortlisting]
		cro_agency_name: DF.Data | None
		cro_agent_name: DF.Link | None
		denial_reason: DF.SmallText | None
		email_address: DF.Data | None
		first_name: DF.Data
		last_name: DF.Data | None
		middle_name: DF.Data | None
		mobile_number: DF.Data | None
		naming_series: DF.Literal["ASR-.YYYY.-"]
		need_assessment: DF.Literal["", "Yes", "No"]
		preferred_countries: DF.TableMultiSelect[AssessmentRequestCountry]
		preferred_course_area: DF.Data
		remarks: DF.SmallText | None
		request_date: DF.Date | None
		requested_by: DF.Link | None
		response_submitted: DF.Check
		response_submitted_by: DF.Link | None
		response_submitted_on: DF.Datetime | None
		status: DF.Literal["Open", "In Progress", "Pending", "Processed", "Closed", "Converted to Application"]
		student: DF.Link | None
		student_already_registered: DF.Literal["", "Yes", "No"]
		student_application_punched: DF.Literal["", "Yes", "No"]
		student_confirmed_to_apply: DF.Literal["", "Yes", "No"]
		university: DF.Link | None
		vendor: DF.Link | None
	# end: auto-generated types

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
		self.set_agent_from_creator()
		self.ensure_student()
		self.sync_student_details()
		self.auto_assign_team()
		self.guard_admission_edits_after_processing()
		self.autofill_application_target_from_shortlisting()
		self.sync_status_from_workflow()
		self.validate_course_shortlisting_required()
		self.validate_vendor_required()
		self.validate_application_target_required()
		self.guard_course_shortlisting_edits()

	def before_update_after_submit(self):
		# Frappe skips validate() entirely once the doc is submitted, and
		# Course Shortlisting is filled in precisely then - so the status sync
		# and its guards have to be re-run on this path too.
		self.guard_admission_edits_after_processing()
		self.autofill_application_target_from_shortlisting()
		self.sync_status_from_workflow()
		self.validate_course_shortlisting_required()
		self.validate_vendor_required()
		self.validate_application_target_required()
		self.guard_course_shortlisting_edits()

	def guard_admission_edits_after_processing(self):
		"""Admissions' response is final once it has been saved as Processed.

		Checked against the previously saved status, not the in-memory one, so
		the very save that adds the course shortlisting (and moves the request
		to Processed) still goes through - it's every later edit that is barred.
		"""
		before = self.get_doc_before_save()
		if not before or before.status != "Processed":
			return

		roles = set(frappe.get_roles())
		if not roles.intersection(ADMISSION_ROLES):
			return
		if roles.intersection(ADMISSION_EDIT_EXEMPT_ROLES):
			return

		frappe.throw(
			frappe._(
				"This Assessment Request is already Processed and the Admissions "
				"response is final. Ask a CRM Admin to make any further changes."
			),
			title=frappe._("Not Allowed"),
		)

	def autofill_application_target_from_shortlisting(self):
		"""University / Course the student applies to come off the shortlist.

		When the shortlist points at a single course there is nothing to choose,
		so it is filled in here - duplicate rows naming the same course count as
		one. Where it genuinely offers a choice, the CRO picks on the form and
		the client script copies that row's university across.
		"""
		if self.student_confirmed_to_apply != "Yes":
			return
		# "Other" means the CRO is deliberately going outside the shortlist.
		if self.other_university_course:
			return
		if self.university and self.course:
			return

		targets = {
			(row.course, row.university) for row in (self.course_shortlisting or []) if row.course
		}
		if len(targets) != 1:
			return

		course, university = targets.pop()
		self.course = self.course or course
		self.university = self.university or university

	def validate_application_target_required(self):
		"""University and Course are required once the student has confirmed.

		mandatory_depends_on is only ever evaluated in the browser, so the rule
		is enforced here as well - sync_status_from_workflow() hands the request
		over to "Ready for Application" on the strength of these two being set.
		"""
		if self.student_confirmed_to_apply != "Yes":
			return

		missing = [
			frappe._(self.meta.get_label(fieldname))
			for fieldname in ("university", "course")
			if not self.get(fieldname)
		]
		if missing:
			frappe.throw(
				frappe._("Please set {0} - required once Student Confirmation is Yes.").format(
					frappe.bold(", ".join(missing))
				),
				frappe.MandatoryError,
				title=frappe._("Missing Mandatory Fields"),
			)

	def validate_vendor_required(self):
		# Same story as validate_application_target_required: the field carries a
		# mandatory_depends_on, but that is only evaluated in the browser.
		if self.need_assessment == "Yes" and self.assessment_channel == "Vendor" and not self.vendor:
			frappe.throw(
				frappe._("Please set {0} - required when Vendor / Channel is Vendor.").format(
					frappe.bold(frappe._("Vendor"))
				),
				frappe.MandatoryError,
				title=frappe._("Missing Mandatory Fields"),
			)

	def validate_course_shortlisting_required(self):
		# Direct means there's no vendor to wait on - Admissions must shortlist
		# at least one course themselves before this can be saved.
		if (
			self.need_assessment == "Yes"
			and self.assessment_channel == "Direct"
			and not self.course_shortlisting
		):
			frappe.throw(
				frappe._(
					"Add at least one course to the Course Shortlisting table - "
					"it's required when Need Assessment is Yes and Vendor / Channel is Direct."
				)
			)

	SHORTLISTING_COMPARE_FIELDS = (
		"course",
		"university",
		"country",
		"intake",
		"tuition_fee",
		"currency",
		"remarks",
	)

	def _shortlisting_rows(self, doc):
		return [
			tuple(row.get(f) for f in self.SHORTLISTING_COMPARE_FIELDS)
			for row in (doc.course_shortlisting or [])
		]

	def guard_course_shortlisting_edits(self):
		"""A submitted shortlisting is locked - for Admissions and CRO alike.

		Changing it needs an Administrator-approved edit request, and one
		approval buys exactly one edit (consumed in on_update once the save has
		actually gone through).
		"""
		if not self.response_submitted:
			return

		before = self.get_doc_before_save()
		if not before:
			return

		if self._shortlisting_rows(before) == self._shortlisting_rows(self):
			return

		from erpnext.crm.doctype.course_shortlisting_edit_request.course_shortlisting_edit_request import (
			_is_administrator,
			get_open_approval,
		)

		if _is_administrator():
			return

		approval = get_open_approval(self.name)
		if not approval:
			frappe.throw(
				frappe._(
					"The Course Shortlisting response has been submitted and is locked. "
					"Request edit access from an Administrator before changing it."
				)
			)

		self.flags.consume_shortlisting_approval = approval

	def set_agent_from_creator(self):
		"""Stamp the Agent / Agency the request came in through.

		The fields are CRO-facing, but nothing was ever filling them when an agent
		raised the request themselves, so CRO had no record of the source.
		"""
		if self.cro_agent_name:
			return

		user = frappe.session.user if self.is_new() else (self.owner or frappe.session.user)
		agent = frappe.db.get_value(
			"Agent", {"user": user}, ["name", "company_name"], as_dict=True
		)
		if not agent:
			return

		self.cro_agent_name = agent.name
		if not self.cro_agency_name:
			self.cro_agency_name = agent.company_name

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
		# Only pull from Student when selecting an existing registration, and
		# only pre-submission - Student Information is locked once the agent
		# submits, so this must not try to touch it on a later save (e.g. if
		# the linked Student's own details changed since) and trip the
		# "not allowed to change after submission" check.
		if self.docstatus != 0:
			return
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

	def sync_status_from_workflow(self):
		# Both are terminal: the CRO Close button and a hand-off to a real
		# Application are not undone by the very next save.
		if self.status in ("Closed", "Converted to Application"):
			return

		if self.need_assessment == "Yes":
			if self.student_confirmed_to_apply == "Yes":
				# University and Course are mandatory once the student has
				# confirmed, so the record already carries everything needed to
				# raise the application.
				self.status = "Ready for Application"
				return
			elif self.student_confirmed_to_apply == "No":
				self.status = "Closed"
				return

		# A hand-set "Ready for Application" is not rolled back to Processed by
		# the next save either.
		if self.status == "Ready for Application":
			return

		# Course Shortlisting drives Open/Processed on its own, independent of
		# Need Assessment - Admissions can shortlist courses without ever
		# answering "Need Assessment?".
		if self.course_shortlisting:
			# A course shortlist has been added - Processed as soon as it's
			# saved, independent of whether it's been published to the agent
			# yet via "Submit Assessment Request Response".
			self.status = "Processed"
			return

		self.status = "Open"

		if self.need_assessment == "Yes":
			if self.response_submitted and self.assessment_channel:
				# Admissions submitted a response with only a Vendor / Channel
				# recorded - still waiting on that vendor for courses to shortlist.
				self.status = "Pending"
			elif self.assessment_channel:
				self.status = "In Progress"

	def after_insert(self):
		self._notify_student_created()

	def on_submit(self):
		"""The agent has finished and submitted the request - tell Admissions
		and CRO it's ready for them; the Assessment Workflow tab only becomes
		usable to them once docstatus flips to Submitted.
		"""
		recipients = []
		for role in ADMISSION_ROLES + CRO_ROLES:
			recipients.extend(_users_with_role(role))
		_notify(
			recipients,
			frappe._("New Assessment Request {0} submitted by the agent").format(self.name),
			self,
		)

	def on_update(self):
		self._notify_student_created()
		self._consume_shortlisting_approval()

	def _consume_shortlisting_approval(self):
		"""Burn the approval only once the edit has actually been saved."""
		approval = getattr(self.flags, "consume_shortlisting_approval", None)
		if not approval:
			return
		frappe.db.set_value("Course Shortlisting Edit Request", approval, "consumed", 1)
		self.flags.consume_shortlisting_approval = None

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
	"""C3 - publish the assessment response back to the agent.

	Flips the request into "response submitted". With a course shortlist in
	place, sync_status_from_workflow (run from validate() on the save below)
	moves the request to "Processed" and the Course Shortlisting table (with
	its per-row Apply Now) becomes visible to the agent. With only a Vendor /
	Channel recorded and no courses yet, it moves to "Pending" instead - the
	agent then knows Admissions has started but is still waiting on the
	vendor. Either way it notifies and comments so the agent has a trail.
	"""
	doc = frappe.get_doc("Assessment Request", name)
	doc.check_permission("write")

	roles = set(frappe.get_roles())
	if not roles.intersection(CRO_ROLES + ADMISSION_ROLES + ADMIN_ROLES):
		frappe.throw(frappe._("Only Admissions or CRO can submit an assessment response"))

	if doc.docstatus != 1:
		frappe.throw(frappe._("The agent has not submitted this Assessment Request yet"))

	if not doc.course_shortlisting and not doc.assessment_channel:
		frappe.throw(
			frappe._(
				"Add at least one course to the Course Shortlisting table, "
				"or record a Vendor / Channel, before submitting"
			)
		)

	if doc.response_submitted:
		frappe.throw(frappe._("The response for this Assessment Request has already been submitted"))

	doc.response_submitted = 1
	doc.response_submitted_on = frappe.utils.now_datetime()
	doc.response_submitted_by = frappe.session.user
	doc.save(ignore_permissions=True)

	processed = doc.status == "Processed"

	doc.add_comment(
		"Comment",
		frappe._("Assessment Request response is available - see the Course Shortlisting table below.")
		if processed
		else frappe._("Assessment Request marked Pending - awaiting the course shortlist from Admissions."),
	)

	# The agent who raised it, plus whoever the request is recorded against.
	recipients = [doc.requested_by, doc.owner]
	if doc.cro_agent_name:
		agent_user = frappe.db.get_value("Agent", doc.cro_agent_name, "user")
		if agent_user:
			recipients.append(agent_user)

	_notify(
		recipients,
		frappe._("Response on Assessment Request received")
		if processed
		else frappe._("Assessment Request is Pending - Admissions is awaiting vendor assessment"),
		doc,
	)

	return {"response_submitted": 1, "status": doc.status}


@frappe.whitelist()
def close_assessment_request(name):
	"""C4 - the Close button at the end of the CRO section."""
	doc = frappe.get_doc("Assessment Request", name)
	doc.check_permission("write")

	roles = set(frappe.get_roles())
	if not roles.intersection(CRO_ROLES + ADMIN_ROLES):
		frappe.throw(frappe._("Only CRO can close an Assessment Request"))

	if doc.docstatus != 1:
		frappe.throw(frappe._("The agent has not submitted this Assessment Request yet"))

	doc.status = "Closed"
	doc.save(ignore_permissions=True)
	doc.add_comment("Comment", frappe._("Assessment Request closed by {0}").format(frappe.session.user))
	return {"status": doc.status}


@frappe.whitelist()
def get_user_team_country(user=None):
	"""Country of the Team the given user belongs to.

	Drives the Admissions-only view of Preferred Countries: an Admissions user is
	scoped to their own team's country and should not see the other countries a
	student picked. Team.country is the team's own country; the territories child
	table is the wider list the team covers, so the direct field wins.
	"""
	user = user or frappe.session.user

	country = frappe.db.get_value("Team", {"admission_1": user}, "country") or frappe.db.get_value(
		"Team", {"admission_2": user}, "country"
	)
	if country:
		return country

	team = frappe.db.get_value("Team Member", {"user": user, "parenttype": "Team"}, "parent")
	if team:
		return frappe.db.get_value("Team", team, "country")

	return None


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
