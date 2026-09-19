# Copyright (c) 2026, Unideft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

ADMIN_ROLES = ("System Manager", "Administrator", "CRM Admin")


def _is_administrator():
	return frappe.session.user == "Administrator" or bool(
		set(frappe.get_roles()).intersection(ADMIN_ROLES)
	)


class CourseShortlistingEditRequest(Document):
	def before_insert(self):
		self.requested_by = frappe.session.user
		self.requested_on = frappe.utils.now_datetime()
		self.status = "Pending"
		self.consumed = 0


def notify_administrators(doc, subject):
	"""Desk notification to everyone who can action the request."""
	users = set()
	for role in ADMIN_ROLES:
		users.update(
			frappe.get_all(
				"Has Role", filters={"role": role, "parenttype": "User"}, pluck="parent"
			)
		)

	for user in users:
		if not user or user == frappe.session.user:
			continue
		if not frappe.db.get_value("User", user, "enabled"):
			continue
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


@frappe.whitelist()
def request_edit_access(assessment_request, reason):
	"""Ask an Administrator to unlock a submitted Course Shortlisting."""
	if not frappe.db.exists("Assessment Request", assessment_request):
		frappe.throw(frappe._("Assessment Request {0} not found").format(assessment_request))

	if not (reason or "").strip():
		frappe.throw(frappe._("Please say why the shortlisting needs changing"))

	existing = frappe.db.exists(
		"Course Shortlisting Edit Request",
		{
			"assessment_request": assessment_request,
			"requested_by": frappe.session.user,
			"status": "Pending",
		},
	)
	if existing:
		frappe.throw(
			frappe._("You already have a pending edit request ({0}) for this Assessment Request").format(
				existing
			)
		)

	doc = frappe.get_doc(
		{
			"doctype": "Course Shortlisting Edit Request",
			"assessment_request": assessment_request,
			"reason": reason,
		}
	).insert(ignore_permissions=True)

	notify_administrators(
		doc,
		frappe._("{0} is requesting to edit the Course Shortlisting on {1}").format(
			frappe.session.user, assessment_request
		),
	)

	return {"name": doc.name, "status": doc.status}


def _review(name, status, remarks=None):
	if not _is_administrator():
		frappe.throw(frappe._("Only an Administrator can review Course Shortlisting edit requests"))

	doc = frappe.get_doc("Course Shortlisting Edit Request", name)
	if doc.status != "Pending":
		frappe.throw(frappe._("This request has already been {0}").format(doc.status.lower()))

	doc.status = status
	doc.reviewed_by = frappe.session.user
	doc.reviewed_on = frappe.utils.now_datetime()
	doc.review_remarks = remarks
	doc.save(ignore_permissions=True)

	if doc.requested_by and doc.requested_by != frappe.session.user:
		frappe.get_doc(
			{
				"doctype": "Notification Log",
				"for_user": doc.requested_by,
				"type": "Alert",
				"document_type": "Assessment Request",
				"document_name": doc.assessment_request,
				"subject": frappe._("Your Course Shortlisting edit request was {0}").format(
					status.lower()
				),
			}
		).insert(ignore_permissions=True)

	return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def approve_edit_request(name, remarks=None):
	return _review(name, "Approved", remarks)


@frappe.whitelist()
def reject_edit_request(name, remarks=None):
	return _review(name, "Rejected", remarks)


def get_open_approval(assessment_request, user=None):
	"""The approved, not-yet-used request this user can edit under, if any."""
	user = user or frappe.session.user
	return frappe.db.get_value(
		"Course Shortlisting Edit Request",
		{
			"assessment_request": assessment_request,
			"requested_by": user,
			"status": "Approved",
			"consumed": 0,
		},
		"name",
	)


@frappe.whitelist()
def get_edit_state(assessment_request):
	"""What the Assessment Request form needs to draw the Edit button."""
	user = frappe.session.user
	return {
		"is_administrator": _is_administrator(),
		"approved_request": get_open_approval(assessment_request, user),
		"pending_request": frappe.db.get_value(
			"Course Shortlisting Edit Request",
			{
				"assessment_request": assessment_request,
				"requested_by": user,
				"status": "Pending",
			},
			"name",
		),
		"pending_for_review": frappe.get_all(
			"Course Shortlisting Edit Request",
			filters={"assessment_request": assessment_request, "status": "Pending"},
			fields=["name", "requested_by", "reason"],
		),
	}
