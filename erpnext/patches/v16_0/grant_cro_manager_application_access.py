import frappe

PERM_FLAGS = ("read", "write", "create", "report", "export", "print", "email", "share")


def execute():
	"""Application carries Custom DocPerms, which replace its JSON permissions -
	so CRO Manager has to be granted there too to see their CROs' applications."""
	for doctype in ("Application", "Application UK"):
		if not frappe.db.exists("Custom DocPerm", {"parent": doctype}):
			continue  # JSON permissions apply as-is
		if frappe.db.exists("Custom DocPerm", {"parent": doctype, "role": "CRO Manager", "permlevel": 0}):
			continue
		row = {"read": 1, "write": 1, "report": 1, "export": 1, "print": 1, "email": 1, "share": 1}
		frappe.get_doc(
			{
				"doctype": "Custom DocPerm",
				"parent": doctype,
				"parenttype": "DocType",
				"parentfield": "permissions",
				"role": "CRO Manager",
				"permlevel": 0,
				**{f: row.get(f, 0) for f in PERM_FLAGS},
			}
		).insert(ignore_permissions=True)
		frappe.clear_cache(doctype=doctype)
