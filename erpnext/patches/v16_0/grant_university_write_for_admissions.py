"""Give CRM Admin and Admission 1 write on University.

University uses Custom DocPerm, so DocType JSON permission rows are ignored.
Admission staff need to fill the University Details PDF fields.
"""

import frappe
from frappe.permissions import add_permission, update_permission_property


def execute():
	roles = ("CRM Admin", "Admission 1")
	for role in roles:
		exists = frappe.db.exists(
			"Custom DocPerm",
			{"parent": "University", "role": role, "permlevel": 0, "if_owner": 0},
		)
		if not exists:
			add_permission("University", role, permlevel=0, ptype="read")
		for ptype in ("read", "write", "create", "print", "email", "export", "report"):
			update_permission_property("University", role, 0, ptype, 1, validate=False)

	frappe.clear_cache()
