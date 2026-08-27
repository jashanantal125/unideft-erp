"""Grant CRO / Admission full Student access via Custom DocPerm.

Student already has Custom DocPerm rows, so DocType JSON permissions alone
are ignored. CRO users reported they could not see or create Students.
"""

import frappe
from frappe.permissions import add_permission, update_permission_property


def execute():
	role_perms = {
		"CRO": ("read", "write", "create", "delete", "print", "email", "export", "report", "share"),
		"CRO Head": ("read", "write", "create", "delete", "print", "email", "export", "report", "share"),
		"Admission 1": ("read", "write", "create", "print", "email", "export", "report"),
		"Admission 2": ("read", "write", "create", "print", "email", "export", "report"),
		"Country Head": ("read", "write", "create", "print", "email", "export", "report"),
	}
	for role, ptypes in role_perms.items():
		exists = frappe.db.exists(
			"Custom DocPerm",
			{"parent": "Student", "role": role, "permlevel": 0, "if_owner": 0},
		)
		if not exists:
			add_permission("Student", role, permlevel=0, ptype="read")
		for ptype in ptypes:
			update_permission_property("Student", role, 0, ptype, 1, validate=False)

	frappe.clear_cache()
