"""Recreate the Application workflow as code, matching production exactly.

Production (crm.unideft.com) has a working Workflow named "app" on Application,
built by hand through the Workflow Builder UI. Nothing in git ever created or
tracked it, so every other environment (including this one, before this patch)
either has no workflow at all or a stale, hand-edited copy that has drifted
from production - wrong state names (e.g. "GTE Processing" instead of
"GS Submitted"), tab ids that no longer exist, junk data.

This patch is the source of truth going forward: the states, transitions and
role ("All") are copied verbatim from production's Workflow Builder view. It
is idempotent - safe to run against production itself, where it will simply
confirm what is already configured rather than duplicating anything.

Update Field / Update Value are deliberately left blank on every state,
matching production's Workflow Builder exactly (confirmed against a full
export of its state table - both columns are empty for all 17 states there).

That blank is not an oversight to fix: `status` is already driven, for
Australia applications, by a separate, pre-existing rank-guarded engine in
application.py (advance_stage / apply_stage_auto_advance / rank-based, only
ever moves forward, never past a terminal state). A live test proved the two
mechanisms fight when both try to own `status` - the Update Field write took
effect in memory, then application.py's own validate() (which runs during the
same save apply_workflow triggers) put it right back based on the rank
engine's own read of the current field answers. Leaving Update Field blank
here removes that conflict entirely and matches what production actually has
configured, rather than a status-sync mechanism this patch would have
introduced on its own.
"""

import frappe

WORKFLOW_NAME = "app"
DOCUMENT_TYPE = "Application"
STATE_FIELD = "workflow_state"

# (state, docstatus) - no update_field/update_value, see module docstring.
STATES = [
	("Details", 0),
	("Processing", 0),
	("Submitted", 0),
	("Offer Letter", 0),
	("Financials", 0),
	("GS Submitted", 0),
	("GS Approved", 0),
	("Acceptance", 0),
	("COE", 0),
	("File Lodged", 0),
	("Visa", 0),
	("Enrolled", 0),
	("On shore college change", 0),
	("Closed", 0),
	("Visa Refused", 0),
	("Refund Processing", 0),
	("Refunded", 0),
]

# (from_state, action, to_state) - action strings match production's Workflow
# Builder exactly, since the same labels appear on the Action button.
TRANSITIONS = [
	("Details", "Processing", "Processing"),
	("Processing", "submitted", "Submitted"),
	("Submitted", "Offer Letter", "Offer Letter"),
	("Offer Letter", "Financials", "Financials"),
	("Financials", "GS Submitted", "GS Submitted"),
	("GS Submitted", "GS Approved", "GS Approved"),
	("GS Approved", "Acceptance", "Acceptance"),
	("Acceptance", "COE", "COE"),
	("COE", "File Lodged", "File Lodged"),
	("File Lodged", "Visa Approved", "Visa"),
	("Visa", "Enrolled", "Enrolled"),
	("Enrolled", "On Shore College Change", "On shore college change"),
	("On shore college change", "Closed", "Closed"),
	("File Lodged", "Visa Refused", "Visa Refused"),
	("Visa Refused", "Refund Processing", "Refund Processing"),
	("Refund Processing", "Refunded", "Refunded"),
	("Refunded", "Closed", "Closed"),
	("Enrolled", "Closed", "Closed"),
]

# Workflow Transition.allowed is a single Role link, not a multi-select, so
# covering several roles means one transition row per (transition, role) pair.
#
# Deliberately excludes agents. Production had every transition set to "All",
# and "All" is a role every Frappe user carries - so agents could push an
# application all the way to Closed themselves. Worse, frappe hides the Save
# button as soon as any workflow action is available (Workflow.setup_btn), so
# agents lost normal Save on the Details tab too. Agents fill in the Details
# tab and save; moving stages is staff work.
TRANSITION_ROLES = [
	"System Manager",
	"CRM Admin",
	"Team Lead",
	"Team Executive",
	"Admission 1",
	"Admission 2",
	"CRO",
	"CRO Head",
	"Country Head",
]


def _ensure_master(doctype, name):
	"""state/next_state/action are Link fields to master doctypes (Workflow
	State, Workflow Action Master). The Workflow Builder UI creates these
	silently whenever a new state/action name is typed in; the Workflow
	controller itself does not, so a document built server-side (as here)
	needs them created explicitly first or saving raises LinkValidationError.
	"""
	if not frappe.db.exists(doctype, name):
		frappe.get_doc({"doctype": doctype, "workflow_state_name" if doctype == "Workflow State" else "workflow_action_name": name}).insert(
			ignore_permissions=True
		)


def execute():
	if not frappe.db.exists("DocType", DOCUMENT_TYPE):
		return

	for state, _docstatus in STATES:
		_ensure_master("Workflow State", state)
	for from_state, action, to_state in TRANSITIONS:
		_ensure_master("Workflow State", from_state)
		_ensure_master("Workflow State", to_state)
		_ensure_master("Workflow Action Master", action)

	if frappe.db.exists("Workflow", WORKFLOW_NAME):
		doc = frappe.get_doc("Workflow", WORKFLOW_NAME)
	else:
		doc = frappe.new_doc("Workflow")
		doc.workflow_name = WORKFLOW_NAME
		doc.document_type = DOCUMENT_TYPE

	doc.is_active = 1
	doc.workflow_state_field = STATE_FIELD

	doc.set("states", [])
	for state, docstatus in STATES:
		doc.append(
			"states",
			{
				"state": state,
				"doc_status": str(docstatus),
				"allow_edit": "All",
			},
		)

	doc.set("transitions", [])
	for from_state, action, to_state in TRANSITIONS:
		for role in TRANSITION_ROLES:
			if not frappe.db.exists("Role", role):
				continue
			doc.append(
				"transitions",
				{
					"state": from_state,
					"action": action,
					"next_state": to_state,
					"allowed": role,
				},
			)

	doc.save(ignore_permissions=True)
	frappe.clear_cache(doctype=DOCUMENT_TYPE)
