import frappe

WRITE_RIGHTS = ("write", "create", "delete", "submit", "cancel", "amend", "import", "share", "set_user_permissions")


def execute():
	"""The Application role inherited edit rights on Workflow from the old
	Admission roles. It only needs to read it (the form's workflow buttons do);
	changing the workflow's rules is for Administrator / System Manager."""
	columns = set(frappe.db.get_table_columns("Custom DocPerm"))
	values = {f: 0 for f in WRITE_RIGHTS if f in columns} | {"read": 1}
	for name in frappe.get_all(
		"Custom DocPerm", filters={"parent": "Workflow", "role": "Application"}, pluck="name"
	):
		frappe.db.set_value("Custom DocPerm", name, values)
	frappe.clear_cache(doctype="Workflow")
