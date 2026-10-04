# Copyright (c) 2026, Unideft and contributors
# For license information, please see license.txt

"""An agent's request to change an Application they have already submitted.

A submitted Application is read-only for the agent. They ask for edit access
with a reason, a Visa Admin approves or rejects it, and one approval unlocks
exactly one save (consumed in Application.on_update once the save has gone
through) - the same pattern as Course Shortlisting Edit Request.
"""

import frappe
from frappe import _
from frappe.model.document import Document

from erpnext.crm.roles import edit_approver_users, is_edit_approver


class ApplicationEditRequest(Document):
	def before_insert(self):
		self.requested_by = frappe.session.user
		self.requested_on = frappe.utils.now_datetime()
		self.status = "Pending"
		self.consumed = 0


def _notify(users, subject, application):
	for user in users:
		if not user or user == frappe.session.user:
			continue
		frappe.get_doc(
			{
				"doctype": "Notification Log",
				"for_user": user,
				"type": "Alert",
				"document_type": "Application",
				"document_name": application,
				"subject": subject,
			}
		).insert(ignore_permissions=True)


@frappe.whitelist()
def request_edit_access(application, reason):
	doc = frappe.get_doc("Application", application)
	doc.check_permission("read")

	if not (reason or "").strip():
		frappe.throw(_("Please say what needs changing"))
	if doc.status == "Draft":
		frappe.throw(_("A Draft can be edited directly - no request needed"))

	pending = frappe.db.exists(
		"Application Edit Request",
		{"application": application, "requested_by": frappe.session.user, "status": "Pending"},
	)
	if pending:
		frappe.throw(_("You already have a pending edit request ({0}) for this Application").format(pending))

	req = frappe.get_doc(
		{"doctype": "Application Edit Request", "application": application, "reason": reason}
	).insert(ignore_permissions=True)

	_notify(
		edit_approver_users(),
		_("{0} is requesting to edit Application {1}: {2}").format(
			frappe.utils.get_fullname(frappe.session.user), application, reason[:80]
		),
		application,
	)
	return {"name": req.name, "status": req.status}


def _review(name, status, remarks=None):
	if not is_edit_approver():
		frappe.throw(_("Only a Visa Admin can review Application edit requests"))

	req = frappe.get_doc("Application Edit Request", name)
	if req.status != "Pending":
		frappe.throw(_("This request has already been {0}").format(req.status.lower()))

	req.status = status
	req.reviewed_by = frappe.session.user
	req.reviewed_on = frappe.utils.now_datetime()
	req.review_remarks = remarks
	req.save(ignore_permissions=True)

	_notify(
		[req.requested_by],
		_("Your edit request on Application {0} was {1}").format(req.application, status.lower()),
		req.application,
	)
	return {"name": req.name, "status": req.status}


@frappe.whitelist()
def approve_edit_request(name, remarks=None):
	return _review(name, "Approved", remarks)


@frappe.whitelist()
def reject_edit_request(name, remarks=None):
	return _review(name, "Rejected", remarks)


def get_open_approval(application, user=None):
	"""The approved, not-yet-used request this user may edit under, if any."""
	return frappe.db.get_value(
		"Application Edit Request",
		{
			"application": application,
			"requested_by": user or frappe.session.user,
			"status": "Approved",
			"consumed": 0,
		},
		"name",
	)


@frappe.whitelist()
def get_edit_state(application):
	"""What the Application form needs to draw the edit-request buttons."""
	user = frappe.session.user
	approver = is_edit_approver()
	return {
		"is_approver": approver,
		"approved_request": get_open_approval(application, user),
		"pending_request": frappe.db.get_value(
			"Application Edit Request",
			{"application": application, "requested_by": user, "status": "Pending"},
			"name",
		),
		"pending_for_review": frappe.get_all(
			"Application Edit Request",
			filters={"application": application, "status": "Pending"},
			fields=["name", "requested_by", "reason", "requested_on"],
		)
		if approver
		else [],
	}
