import frappe

DOCTYPES = ("University", "Course")
EDITORS = ("Visa Admin", "Application")
# Admin roles keep whatever they already have.
UNTOUCHED = ("System Manager", "Administrator", "CRM Admin")
EDIT_RIGHTS = ("write", "create", "delete", "import", "amend", "submit", "cancel")


def execute():
	"""Only admins and the Application Team add or edit Universities and Courses;
	everyone else (Agents, CROs, CRO Managers, ...) keeps read access only."""
	columns = set(frappe.db.get_table_columns("Custom DocPerm"))
	edit_rights = [f for f in EDIT_RIGHTS if f in columns]

	for doctype in DOCTYPES:
		if not frappe.db.exists("Custom DocPerm", {"parent": doctype}):
			continue

		for role in EDITORS:
			values = {"read": 1, "write": 1, "create": 1, "report": 1, "export": 1, "print": 1, "email": 1}
			values = {k: v for k, v in values.items() if k in columns}
			name = frappe.db.get_value("Custom DocPerm", {"parent": doctype, "role": role, "permlevel": 0}, "name")
			if name:
				frappe.db.set_value("Custom DocPerm", name, values)
			else:
				frappe.get_doc(
					{
						"doctype": "Custom DocPerm",
						"parent": doctype,
						"parenttype": "DocType",
						"parentfield": "permissions",
						"role": role,
						"permlevel": 0,
						**values,
					}
				).insert(ignore_permissions=True)

		for row in frappe.get_all("Custom DocPerm", filters={"parent": doctype}, fields=["name", "role"]):
			if row.role in EDITORS or row.role in UNTOUCHED:
				continue
			frappe.db.set_value("Custom DocPerm", row.name, {f: 0 for f in edit_rights})

		frappe.clear_cache(doctype=doctype)
