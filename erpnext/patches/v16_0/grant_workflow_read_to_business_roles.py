import frappe

ROLES = ("Agent", "CRO", "CRO Manager", "Application")


def execute():
	"""The form's workflow Actions button reads the Workflow record (for its
	confirmation setting) before applying an action, so every role that moves an
	Application through its workflow - including an Agent submitting a Draft -
	needs read access to Workflow. Workflow carries Custom DocPerms, which replace
	its standard ones, so the grant is made there."""
	if not frappe.db.exists("Custom DocPerm", {"parent": "Workflow"}):
		return
	for role in ROLES:
		if frappe.db.exists("Custom DocPerm", {"parent": "Workflow", "role": role, "permlevel": 0}):
			frappe.db.set_value(
				"Custom DocPerm", {"parent": "Workflow", "role": role, "permlevel": 0}, "read", 1
			)
			continue
		frappe.get_doc(
			{
				"doctype": "Custom DocPerm",
				"parent": "Workflow",
				"parenttype": "DocType",
				"parentfield": "permissions",
				"role": role,
				"permlevel": 0,
				"read": 1,
			}
		).insert(ignore_permissions=True)
	frappe.clear_cache(doctype="Workflow")
