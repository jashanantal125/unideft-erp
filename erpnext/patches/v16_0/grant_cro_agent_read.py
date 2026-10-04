import frappe


def execute():
	"""CROs pick the Agent on an Assessment Request, so they need to read Agent.

	Agent carries Custom DocPerms, which replace its JSON permissions, so the
	grant has to be made there. Partner agents deliberately get nothing.
	"""
	if not frappe.db.exists("Custom DocPerm", {"parent": "Agent"}):
		return
	for role in ("CRO", "CRO Manager"):
		if frappe.db.exists("Custom DocPerm", {"parent": "Agent", "role": role, "permlevel": 0}):
			continue
		frappe.get_doc(
			{
				"doctype": "Custom DocPerm",
				"parent": "Agent",
				"parenttype": "DocType",
				"parentfield": "permissions",
				"role": role,
				"permlevel": 0,
				"read": 1,
				"select": 1,
				"report": 1,
				"print": 1,
				"email": 1,
			}
		).insert(ignore_permissions=True)
	frappe.clear_cache(doctype="Agent")
