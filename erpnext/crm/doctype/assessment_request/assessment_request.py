# Copyright (c) 2026, Unideft and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.desk.form.assign_to import add as assign_to_users
from frappe.desk.form.assign_to import close_all_assignments
from frappe.model.document import Document

from erpnext.crm.team_utils import (
	get_all_teams_for_user,
	get_team_for_country,
	get_team_users,
)

from erpnext.crm.roles import ADMIN_ROLES, AGENT, APPLICATION, CRO_MANAGER, CRO_ROLES

AGENT_ROLES = (AGENT,)
ADMISSION_ROLES = (APPLICATION,)

# The Application Team's response: only they (and admins) may change these.
RESPONSE_FIELDS = ("need_assessment", "assessment_channel", "vendor")

# Who can still touch a Shortlisted request that Admissions are locked out of.
ADMISSION_EDIT_EXEMPT_ROLES = ("CRM Admin", "Visa Admin", "Administrator")

STATUS_DRAFT = "Draft"
STATUS_SUBMITTED = "Submitted"
STATUS_IN_REVIEW = "In Review"
STATUS_SHORTLISTED = "Shortlisted"
STATUS_ACCEPTED = "Accepted"
STATUS_CONVERTED = "Converted to Application"

# Statuses an agent can raise an Application from.
APPLICABLE_STATUSES = (STATUS_SHORTLISTED, STATUS_ACCEPTED, STATUS_CONVERTED)


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


def _agent_keys(user):
	"""An agent may be identified by their User id or by their Agent record."""
	keys = [user]
	agent_name = frappe.db.get_value("Agent", {"user": user}, "name")
	if agent_name:
		keys.append(agent_name)
	return keys


def _is_agent(user=None):
	return bool(set(frappe.get_roles(user or frappe.session.user)).intersection(AGENT_ROLES))


def _is_unrestricted(user):
	return user == "Administrator" or bool(set(frappe.get_roles(user)).intersection(ADMIN_ROLES))


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
		application: DF.DynamicLink | None
		application_doctype: DF.Link | None
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
		other_university_course: DF.Check
		preferred_countries: DF.TableMultiSelect[AssessmentRequestCountry]
		preferred_course_area: DF.Data
		remarks: DF.SmallText | None
		request_date: DF.Date | None
		requested_by: DF.Link | None
		response_submitted: DF.Check
		response_submitted_by: DF.Link | None
		response_submitted_on: DF.Datetime | None
		split_from: DF.Link | None
		status: DF.Literal["Draft", "Submitted", "In Review", "Shortlisted", "Accepted", "Converted to Application"]
		student: DF.Link | None
		student_already_registered: DF.Literal["", "Yes", "No"]
		student_confirmed_to_apply: DF.Literal["", "Yes", "No"]
		university: DF.Link | None
		vendor: DF.Link | None
	# end: auto-generated types

	def before_validate(self):
		if not self.requested_by:
			self.requested_by = frappe.session.user
		if not self.request_date:
			self.request_date = frappe.utils.today()

	def validate(self):
		self.set_agent_from_creator()
		self.ensure_student()
		self.sync_student_details()
		self.auto_assign_team()
		self.guard_admission_edits_after_shortlisting()
		self.guard_response_owned_by_application_team()
		self.autofill_application_target_from_shortlisting()
		self.validate_course_shortlisting_required()
		self.validate_vendor_required()
		self.validate_application_target_required()
		self.guard_course_shortlisting_edits()
		self.sync_status()

	def before_submit(self):
		self.guard_application_team_cannot_submit()
		self.split_preferred_countries()
		# The country list may just have been trimmed to one - route on that.
		self.assigned_team = None
		self.auto_assign_team()
		self.sync_status()

	def before_update_after_submit(self):
		# Frappe skips validate() entirely once the doc is submitted, and
		# Course Shortlisting is filled in precisely then - so the status sync
		# and its guards have to be re-run on this path too.
		self.auto_assign_team()
		self.guard_admission_edits_after_shortlisting()
		self.guard_response_owned_by_application_team()
		self.autofill_application_target_from_shortlisting()
		self.validate_course_shortlisting_required()
		self.validate_vendor_required()
		self.validate_application_target_required()
		self.guard_course_shortlisting_edits()
		self.mark_picked_up_by_team()
		self.sync_status()

	# ------------------------------------------------------------------
	# Status
	# ------------------------------------------------------------------

	def sync_status(self):
		"""Draft -> Submitted -> In Review -> Shortlisted -> Accepted -> Converted.

		Derived entirely from the record, so it can never drift from what the
		form actually shows.
		"""
		if self.application:
			self.status = STATUS_CONVERTED
		elif self.docstatus == 0:
			self.status = STATUS_DRAFT
		elif self.student_confirmed_to_apply == "Yes" and self.university and self.course:
			self.status = STATUS_ACCEPTED
		elif self.response_submitted and self.course_shortlisting:
			self.status = STATUS_SHORTLISTED
		elif (
			self.flags.picked_up
			or self.status == STATUS_IN_REVIEW
			or self.need_assessment
			or self.assessment_channel
			or self.course_shortlisting
			or self.response_submitted
		):
			self.status = STATUS_IN_REVIEW
		else:
			self.status = STATUS_SUBMITTED

	def mark_picked_up_by_team(self):
		"""The first save by anyone on the CRO / Application Team side moves a
		Submitted request into review."""
		if self.status != STATUS_SUBMITTED:
			return
		user = frappe.session.user
		if user in get_team_users(self.assigned_team) or (
			not _is_agent(user) and set(frappe.get_roles(user)) & set(ADMISSION_ROLES + CRO_ROLES)
		):
			self.flags.picked_up = True

	# ------------------------------------------------------------------
	# Routing: one request per country, assigned to that country's team
	# ------------------------------------------------------------------

	def split_preferred_countries(self):
		"""Keep the first preferred country here; the rest become their own
		requests in on_submit, each routed to its own country team."""
		countries = []
		for row in self.preferred_countries or []:
			if row.country and row.country not in countries:
				countries.append(row.country)
		if not countries:
			frappe.throw(_("Add at least one Preferred Country"))

		self.flags.split_countries = countries[1:]
		if len(self.preferred_countries) != 1:
			first = countries[0]
			self.set("preferred_countries", [])
			self.append("preferred_countries", {"country": first})

	def auto_assign_team(self):
		"""Assign the team handling this request's (first) preferred country."""
		if self.assigned_team or not self.preferred_countries:
			return
		for row in self.preferred_countries:
			team = get_team_for_country(row.country)
			if team:
				self.assigned_team = team
				self.flags.team_changed = True
				return

	def create_country_splits(self):
		created = []
		for country in self.flags.get("split_countries") or []:
			new = frappe.copy_doc(self, ignore_no_copy=False)
			new.docstatus = 0
			new.owner = self.owner
			new.requested_by = self.requested_by
			new.request_date = self.request_date
			new.student = self.student
			new.student_already_registered = "Yes" if self.student else self.student_already_registered
			new.split_from = self.name
			new.set("preferred_countries", [{"country": country}])
			new.flags.ignore_permissions = True
			new.insert()
			new.submit()
			created.append(new.name)

		self.flags.split_countries = []
		if created:
			frappe.msgprint(
				_("One request per country: {0} created for the other preferred countries.").format(
					", ".join(frappe.bold(n) for n in created)
				),
				indicator="blue",
				alert=True,
			)
		return created

	def assign_team_users(self):
		"""Assign the whole country team - every CRO and Application Team member."""
		if not self.assigned_team:
			admins = []
			for role in ("CRM Admin", "Visa Admin", "System Manager"):
				admins.extend(_users_with_role(role))
			_notify(
				admins,
				_("Assessment Request {0} has no team for {1} - set up a Team for that country").format(
					self.name, ", ".join(r.country for r in self.preferred_countries if r.country)
				),
				self,
			)
			return

		users = get_team_users(self.assigned_team)
		if not users:
			return
		assign_to_users(
			{
				"assign_to": users,
				"doctype": self.doctype,
				"name": self.name,
				"description": _("Assessment Request {0} for {1} ({2})").format(
					self.name,
					" ".join(filter(None, [self.first_name, self.last_name])),
					", ".join(r.country for r in self.preferred_countries if r.country),
				),
			},
			ignore_permissions=True,
		)

	# ------------------------------------------------------------------
	# Lifecycle hooks
	# ------------------------------------------------------------------

	def after_insert(self):
		self._notify_student_created()

	def on_submit(self):
		self.create_country_splits()
		self.assign_team_users()

	def on_update(self):
		self._notify_student_created()
		self._consume_shortlisting_approval()

	def on_update_after_submit(self):
		self._consume_shortlisting_approval()
		if self.flags.get("team_changed"):
			self.assign_team_users()
		self.notify_status_change()

	def on_cancel(self):
		self.db_set("status", STATUS_DRAFT)
		close_all_assignments(self.doctype, self.name, ignore_permissions=True)

	def notify_status_change(self):
		before = self.get_doc_before_save()
		if not before or before.status == self.status:
			return

		if self.status == STATUS_SHORTLISTED:
			_notify(
				self.get_agent_users(),
				_("Shortlist ready on Assessment Request {0}").format(self.name),
				self,
			)
		elif self.status == STATUS_ACCEPTED:
			_notify(
				get_team_users(self.assigned_team) + self.get_agent_users(),
				_("Assessment Request {0} accepted - {1} at {2}").format(
					self.name, self.course, self.university
				),
				self,
			)
		elif self.status == STATUS_CONVERTED:
			_notify(
				get_team_users(self.assigned_team),
				_("Assessment Request {0} converted to Application {1}").format(
					self.name, self.application
				),
				self,
			)

		# Nothing left for the team once the student has decided.
		if self.status == STATUS_CONVERTED or self.student_confirmed_to_apply == "No":
			close_all_assignments(self.doctype, self.name, ignore_permissions=True)

	def get_agent_users(self):
		"""The agent side of the request: whoever raised it plus the linked Agent."""
		users = [self.requested_by, self.owner]
		if self.cro_agent_name:
			users.append(frappe.db.get_value("Agent", self.cro_agent_name, "user"))
		return [u for u in dict.fromkeys(users) if u and _is_agent(u)]

	# ------------------------------------------------------------------
	# Guards and validations
	# ------------------------------------------------------------------

	def guard_response_owned_by_application_team(self):
		"""Course Shortlisting and the assessment fields are the Application
		Team's response - nobody else fills them in."""
		if self.flags.get("converting") or _can_respond(frappe.session.user, self):
			return

		before = self.get_doc_before_save()
		changed = [
			f for f in RESPONSE_FIELDS if ((before.get(f) if before else None) or "") != (self.get(f) or "")
		]
		before_rows = self._shortlisting_rows(before) if before else []
		if before_rows != self._shortlisting_rows(self):
			changed.append("course_shortlisting")
		if changed:
			frappe.throw(
				_("Only the Application Team can fill in {0}.").format(
					", ".join(frappe.bold(_(self.meta.get_label(f))) for f in changed)
				),
				title=_("Not Allowed"),
			)

	def guard_application_team_cannot_submit(self):
		"""Submitting is the agent's (or CRO's) hand-off; the Application Team
		responds to it rather than raising it."""
		roles = set(frappe.get_roles())
		if roles & set(ADMIN_ROLES) or roles & set(AGENT_ROLES) or roles & set(CRO_ROLES):
			return
		if APPLICATION in roles:
			frappe.throw(
				_("The agent submits the Assessment Request. Prepare the shortlist and publish it once it has been submitted."),
				title=_("Not Allowed"),
			)

	def guard_admission_edits_after_shortlisting(self):
		"""Admissions' response is final once the shortlist has been published.

		Checked against the previously saved status, not the in-memory one, so
		the very save that publishes the shortlist still goes through - it's
		every later edit that is barred.
		"""
		if self.flags.get("converting"):
			return
		before = self.get_doc_before_save()
		if not before or before.status not in (STATUS_SHORTLISTED, STATUS_ACCEPTED, STATUS_CONVERTED):
			return

		roles = set(frappe.get_roles())
		if not roles.intersection(ADMISSION_ROLES):
			return
		if roles.intersection(ADMISSION_EDIT_EXEMPT_ROLES) or roles.intersection(CRO_ROLES):
			return

		frappe.throw(
			_(
				"This Assessment Request is already Shortlisted and the Application Team "
				"response is final. Ask a CRM Admin to make any further changes."
			),
			title=_("Not Allowed"),
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
		is enforced here as well - sync_status() moves the request to Accepted
		on the strength of these two being set.
		"""
		if self.student_confirmed_to_apply != "Yes":
			return

		missing = [
			_(self.meta.get_label(fieldname))
			for fieldname in ("university", "course")
			if not self.get(fieldname)
		]
		if missing:
			frappe.throw(
				_("Please set {0} - required once Student Confirmation is Yes.").format(
					frappe.bold(", ".join(missing))
				),
				frappe.MandatoryError,
				title=_("Missing Mandatory Fields"),
			)

	def validate_vendor_required(self):
		# Same story as validate_application_target_required: the field carries a
		# mandatory_depends_on, but that is only evaluated in the browser.
		if self.need_assessment == "Yes" and self.assessment_channel == "Vendor" and not self.vendor:
			frappe.throw(
				_("Please set {0} - required when Vendor / Channel is Vendor.").format(
					frappe.bold(_("Vendor"))
				),
				frappe.MandatoryError,
				title=_("Missing Mandatory Fields"),
			)

	def validate_course_shortlisting_required(self):
		# Direct means there's no vendor to wait on - the Application Team must
		# shortlist at least one course themselves before this can be saved.
		if (
			self.need_assessment == "Yes"
			and self.assessment_channel == "Direct"
			and not self.course_shortlisting
		):
			frappe.throw(
				_(
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
		"""A published shortlist is locked - for the Application Team and CRO alike.

		Changing it needs a Visa Admin-approved edit request, and one
		approval buys exactly one edit (consumed in on_update once the save has
		actually gone through). A response published while still waiting on a
		vendor has no shortlist yet, so the first courses can still be added.
		"""
		if not self.response_submitted:
			return

		before = self.get_doc_before_save()
		if not before or not before.course_shortlisting:
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
				_(
					"The Course Shortlisting response has been submitted and is locked. "
					"Request edit access from a Visa Admin before changing it."
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
				frappe.throw(_("Please select Student ID / Student Name"))
			return

		if self.student_already_registered != "No":
			return

		# Already linked from a previous save
		if self.student and frappe.db.exists("Student", self.student):
			return

		email = (self.email_address or "").strip()
		mobile = (self.mobile_number or "").strip()
		if not email:
			frappe.throw(_("Email Address is required to create a new Student"))
		if not mobile:
			frappe.throw(_("Mobile Number is required to create a new Student"))
		if not (self.first_name or "").strip():
			frappe.throw(_("First Name is required to create a new Student"))

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
				_("Add at least one Preferred Country so Home Country can be set on the Student")
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
				_("Student {0} created and linked to this Assessment Request").format(
					frappe.bold(self.student)
				),
				indicator="green",
				alert=True,
			)


# ----------------------------------------------------------------------
# Permissions: agents see their own requests, staff see their country team's
# ----------------------------------------------------------------------


def _can_respond(user, doc):
	"""The Application Team handling the request (or an admin) owns the response."""
	if _is_unrestricted(user):
		return True
	if APPLICATION not in frappe.get_roles(user):
		return False
	from erpnext.crm.team_utils import get_team_application_members

	# Unrouted requests can be picked up by any Application user.
	return not doc.assigned_team or user in get_team_application_members(doc.assigned_team)


def _staff_team_scope(user):
	teams = get_all_teams_for_user(user)
	agents = []
	if CRO_MANAGER in frappe.get_roles(user):
		agents = frappe.get_all("Agent", filters={"cro_head": user}, pluck="name")
	return teams, agents


def get_permission_query_conditions(user=None):
	user = user or frappe.session.user
	if _is_unrestricted(user):
		return ""

	table = "`tabAssessment Request`"
	esc_user = frappe.db.escape(user)
	conditions = [
		f"{table}.`owner` = {esc_user}",
		f"{table}.`_assign` like {frappe.db.escape('%' + frappe.as_json(user) + '%')}",
	]

	if _is_agent(user):
		keys = ", ".join(frappe.db.escape(k) for k in _agent_keys(user))
		conditions.append(f"{table}.`requested_by` = {esc_user}")
		conditions.append(f"{table}.`cro_agent_name` in ({keys})")

	teams, agents = _staff_team_scope(user)
	if teams:
		conditions.append(
			f"{table}.`assigned_team` in ({', '.join(frappe.db.escape(t) for t in teams)})"
		)
	if agents:
		conditions.append(
			f"{table}.`cro_agent_name` in ({', '.join(frappe.db.escape(a) for a in agents)})"
		)

	return "(" + " or ".join(conditions) + ")"


def _assignees(doc):
	try:
		return frappe.parse_json(doc.get("_assign") or "[]") or []
	except Exception:
		return []


def has_permission(doc, ptype=None, user=None):
	user = user or frappe.session.user
	if _is_unrestricted(user):
		return True
	if not doc.get("name") or doc.get("__islocal"):
		return True

	if doc.owner == user or user in _assignees(doc):
		return True

	if _is_agent(user):
		if doc.requested_by == user or doc.cro_agent_name in _agent_keys(user):
			return True

	teams, agents = _staff_team_scope(user)
	if doc.assigned_team and doc.assigned_team in teams:
		return True
	if doc.cro_agent_name and doc.cro_agent_name in agents:
		return True

	return False


# ----------------------------------------------------------------------
# Agent <-> CRO / Application Team conversation
# ----------------------------------------------------------------------


def notify_on_comment(comment, method=None):
	"""A comment from the agent goes to the country team, and vice versa."""
	if comment.reference_doctype != "Assessment Request" or comment.comment_type != "Comment":
		return
	if not frappe.db.exists("Assessment Request", comment.reference_name):
		return

	doc = frappe.get_doc("Assessment Request", comment.reference_name)
	author = comment.owner or frappe.session.user
	agent_users = doc.get_agent_users()
	team_users = get_team_users(doc.assigned_team)

	if author in agent_users or _is_agent(author):
		recipients = team_users
	else:
		recipients = agent_users + [u for u in team_users if u != author]

	snippet = frappe.utils.strip_html(comment.content or "")[:120]
	_notify(
		recipients,
		_("{0} commented on Assessment Request {1}: {2}").format(
			frappe.utils.get_fullname(author), doc.name, snippet
		),
		doc,
	)


# ----------------------------------------------------------------------
# Shortlist -> Application
# ----------------------------------------------------------------------

MONTHS = (
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
)


def _intake_month(value):
	if not value:
		return ""
	return MONTHS[frappe.utils.getdate(value).month - 1]


@frappe.whitelist()
def get_shortlisted_options(student):
	"""Shortlisted university / course rows for a student, across every
	Assessment Request the current user can see - what the New Application
	dialog offers the agent to pick from."""
	if not student:
		return []

	requests = frappe.get_list(
		"Assessment Request",
		filters={
			"student": student,
			"docstatus": 1,
			"response_submitted": 1,
			"status": ["in", APPLICABLE_STATUSES],
		},
		pluck="name",
		order_by="modified desc",
	)
	if not requests:
		return []

	rows = frappe.get_all(
		"Assessment Course Shortlisting",
		filters={"parenttype": "Assessment Request", "parent": ["in", requests]},
		fields=["parent", "course", "university", "country", "intake", "tuition_fee", "currency"],
		order_by="parent desc, idx asc",
	)
	options = []
	for row in rows:
		if not row.course:
			continue
		course_name = frappe.db.get_value("Course", row.course, "course_name") or row.course
		options.append(
			{
				"assessment_request": row.parent,
				"course": row.course,
				"course_name": course_name,
				"university": row.university,
				"country": row.country,
				"intake": _intake_month(row.intake),
				"tuition_fee": row.tuition_fee,
				"currency": row.currency,
				"label": f"{course_name} - {row.university or ''} ({row.country or ''}) [{row.parent}]",
			}
		)
	return options


def validate_application_from_assessment(assessment_request, student, university, course):
	"""Make sure an Application raised against an assessment really uses one of
	its shortlisted options (or the CRO-accepted pick)."""
	doc = frappe.get_doc("Assessment Request", assessment_request)
	doc.check_permission("read")

	if doc.docstatus != 1 or doc.status not in APPLICABLE_STATUSES:
		frappe.throw(
			_("Assessment Request {0} has no published shortlist to apply from yet").format(doc.name)
		)
	if doc.student != student:
		frappe.throw(_("Assessment Request {0} belongs to a different student").format(doc.name))

	picks = {(row.course, row.university) for row in doc.course_shortlisting if row.course}
	if doc.course and doc.university:
		picks.add((doc.course, doc.university))
	if (course, university) not in picks:
		frappe.throw(
			_("{0} at {1} is not on the shortlist of Assessment Request {2}").format(
				frappe.bold(course), frappe.bold(university), doc.name
			)
		)
	return doc


def mark_converted(assessment_request, application_doctype, application, university, course):
	doc = frappe.get_doc("Assessment Request", assessment_request)
	doc.application_doctype = application_doctype
	doc.application = application
	if not doc.student_confirmed_to_apply:
		doc.student_confirmed_to_apply = "Yes"
	if not (doc.university and doc.course):
		doc.university = university
		doc.course = course
	doc.flags.ignore_permissions = True
	doc.flags.converting = True
	doc.save()
	doc.add_comment(
		"Comment",
		_("Converted to {0} {1} by {2}").format(
			_(application_doctype), application, frappe.utils.get_fullname(frappe.session.user)
		),
	)


@frappe.whitelist()
def submit_assessment_response(name):
	"""Publish the Application Team's response back to the agent.

	With a course shortlist in place the request moves to Shortlisted and the
	agent can apply from any row. With only a Vendor / Channel recorded and no
	courses yet it stays In Review - the first courses added later publish it.
	"""
	doc = frappe.get_doc("Assessment Request", name)
	doc.check_permission("write")

	if not _can_respond(frappe.session.user, doc):
		frappe.throw(_("Only the Application Team can publish the shortlist"))

	if doc.docstatus != 1:
		frappe.throw(
			_("The agent has not submitted this Assessment Request yet - publish once it is submitted")
		)

	if not doc.course_shortlisting and not doc.assessment_channel:
		frappe.throw(
			_(
				"Add at least one course to the Course Shortlisting table, "
				"or record a Vendor / Channel, before submitting"
			)
		)

	if doc.response_submitted:
		frappe.throw(_("The response for this Assessment Request has already been submitted"))

	doc.response_submitted = 1
	doc.response_submitted_on = frappe.utils.now_datetime()
	doc.response_submitted_by = frappe.session.user
	doc.save(ignore_permissions=True)

	shortlisted = doc.status == STATUS_SHORTLISTED
	doc.add_comment(
		"Comment",
		_("Shortlist published - the agent can now apply from any shortlisted course.")
		if shortlisted
		else _("Response recorded - awaiting the vendor's assessment before courses are shortlisted."),
	)
	if not shortlisted:
		_notify(
			doc.get_agent_users(),
			_("Assessment Request {0} is in review - awaiting vendor assessment").format(doc.name),
			doc,
		)

	return {"response_submitted": 1, "status": doc.status}


@frappe.whitelist()
def get_user_team_country(user=None):
	"""Country of the Team the given user belongs to.

	Drives the Application Team view of Preferred Countries: a team member is
	scoped to their own team's country.
	"""
	user = user or frappe.session.user
	teams = get_all_teams_for_user(user)
	if not teams:
		return None
	return frappe.db.get_value("Team", teams[0], "country")


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
