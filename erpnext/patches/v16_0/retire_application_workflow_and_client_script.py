"""Retire the duplicate Application status system.

Application carried two competing status fields:

  * `status`          - the real one. Referenced ~23x across application.py,
                        application.js and the depends_on conditions in
                        application.json, and holding meaningful live data
                        (Acceptance / COE / Completed / Visa Refused / ...).
  * `workflow_state`  - a Custom Field driven by the Workflow "app". Referenced
                        nowhere in any code, and holding only junk: every record
                        sat on "Pending" or "Assessment".

The two never agreed, because the Workflow's state names did not match the
`status` options ("GTE Processing" vs "GS Processing", "Assessment" vs
"Processing", "Financial stage" vs "Financial"). That is why the status field
appeared not to update when a stage gate was set to Yes.

The Client Script "app" made it worse: on every refresh it ran a raw jQuery
tab click driven by `workflow_state`. Since `workflow_state` was "Pending" for
almost every record, it dragged the user back to the Details tab immediately
after the form's own set_active_tab() had moved them on - which is what made
the next tab's fields look like they were rendering inside the current tab.
It also targeted "#application-gte_tab-tab" and "#application-gte_approved_tab-tab",
which never existed (the real fieldnames are gs_tab / gs_approved_tab), and
branched on a state "Processing Stage" that was not in the workflow at all.

Stage progression now lives in one place: complete_stage_and_advance() in
application.js, which advances `status`, saves, and only then switches tab.
"""

import frappe


def execute():
	# The Client Script is pure interference - every branch was either dead
	# (unknown state / unknown tab id) or actively fought set_active_tab().
	if frappe.db.exists("Client Script", "app"):
		frappe.delete_doc("Client Script", "app", force=True, ignore_permissions=True)

	if frappe.db.exists("Workflow", "app"):
		frappe.delete_doc("Workflow", "app", force=True, ignore_permissions=True)

	# Drop the orphaned state field only once nothing drives it any more.
	for name in frappe.get_all(
		"Custom Field",
		filters={"dt": "Application", "fieldname": "workflow_state"},
		pluck="name",
	):
		frappe.delete_doc("Custom Field", name, force=True, ignore_permissions=True)

	# Workflow Action / Workflow Document State rows referencing the deleted
	# workflow would otherwise linger and re-render stale action buttons.
	if frappe.db.has_table("Workflow Action"):
		frappe.db.delete("Workflow Action", {"reference_doctype": "Application"})

	# The `workflow_state` column itself is deliberately left in place. Dropping
	# it here would need DDL inside the patch transaction, and an orphaned column
	# is harmless - nothing reads it once the Custom Field is gone, and keeping it
	# means the old values are still recoverable if this ever needs reverting.

	frappe.clear_cache(doctype="Application")
