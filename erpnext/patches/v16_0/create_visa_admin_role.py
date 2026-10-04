import frappe


def execute():
	"""Visa Admin must exist before DocType JSON that grants it permissions syncs."""
	if not frappe.db.exists("Role", "Visa Admin"):
		frappe.get_doc({"doctype": "Role", "role_name": "Visa Admin", "desk_access": 1}).insert(
			ignore_permissions=True
		)
