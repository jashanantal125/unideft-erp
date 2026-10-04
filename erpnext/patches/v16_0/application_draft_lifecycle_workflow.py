import frappe

WORKFLOW = "app"
DRAFT, DETAILS, CANCELLED = "Draft", "Details", "Cancelled"

# Agents only submit their Draft; every later move belongs to these roles.
STAFF_ROLES = ("Application", "CRO", "CRM Admin", "System Manager")
SUBMIT_ROLES = ("Agent", "CRO", "CRM Admin", "System Manager")
# A finished application is closed, not cancelled.
NOT_CANCELLABLE = (DRAFT, CANCELLED, "Closed", "Refunded", "Enrolled")


def execute():
	"""Application lifecycle: Draft -> (agent Submit) -> Details -> ... ,
	Cancel from any open stage by the Application Team / CRO."""
	if not frappe.db.exists("Workflow", WORKFLOW):
		return

	for state in (DRAFT, CANCELLED):
		if not frappe.db.exists("Workflow State", state):
			frappe.get_doc({"doctype": "Workflow State", "workflow_state_name": state}).insert(
				ignore_permissions=True
			)
	for action in ("Submit", "Cancel"):
		if not frappe.db.exists("Workflow Action Master", action):
			frappe.get_doc({"doctype": "Workflow Action Master", "workflow_action_name": action}).insert(
				ignore_permissions=True
			)

	wf = frappe.get_doc("Workflow", WORKFLOW)
	states = [s.as_dict() for s in wf.states if s.state not in (DRAFT, CANCELLED)]
	for s in states:
		if s.state == DETAILS:
			s.update_field, s.update_value = "status", "Pending"

	wf.set("states", [])
	wf.append("states", {"state": DRAFT, "doc_status": "0", "allow_edit": "All", "update_field": "status", "update_value": DRAFT})
	for s in states:
		wf.append("states", {k: s.get(k) for k in ("state", "doc_status", "allow_edit", "update_field", "update_value", "is_optional_state", "next_action_email_template", "message")})
	wf.append("states", {"state": CANCELLED, "doc_status": "0", "allow_edit": "System Manager", "update_field": "status", "update_value": CANCELLED})

	stage_moves = {
		(t.state, t.action, t.next_state)
		for t in wf.transitions
		if t.state not in (DRAFT, CANCELLED) and t.next_state not in (DRAFT, CANCELLED)
	}
	wf.set("transitions", [])
	for role in SUBMIT_ROLES:
		wf.append("transitions", {"state": DRAFT, "action": "Submit", "next_state": DETAILS, "allowed": role, "allow_self_approval": 1})
	for state, action, next_state in sorted(stage_moves):
		for role in STAFF_ROLES:
			wf.append("transitions", {"state": state, "action": action, "next_state": next_state, "allowed": role, "allow_self_approval": 1})
	for s in states:
		if s.state in NOT_CANCELLABLE:
			continue
		for role in STAFF_ROLES:
			wf.append("transitions", {"state": s.state, "action": "Cancel", "next_state": CANCELLED, "allowed": role, "allow_self_approval": 1})

	wf.flags.ignore_permissions = True
	wf.save()

	# Drafts are not the team's work yet.
	for rule in frappe.get_all("Assignment Rule", filters={"document_type": "Application"}, fields=["name", "assign_condition"]):
		cond = rule.assign_condition or ""
		if "Draft" in cond:
			continue
		new = f"({cond}) and status not in ('Draft', 'Cancelled')" if cond else "status not in ('Draft', 'Cancelled')"
		frappe.db.set_value("Assignment Rule", rule.name, "assign_condition", new)

	frappe.clear_cache(doctype="Application")
