import frappe


def execute():
	"""Create the four business roles before DocType JSON referencing them syncs."""
	for role in ("Agent", "CRO", "CRO Manager", "Application"):
		if not frappe.db.exists("Role", role):
			frappe.get_doc({"doctype": "Role", "role_name": role, "desk_access": 1}).insert(
				ignore_permissions=True
			)
