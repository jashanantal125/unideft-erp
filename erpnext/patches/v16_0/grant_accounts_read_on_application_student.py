"""Grant Accounts roles read access to Application and Student.

Accounts Commission list views join the Student link for display. Application
and Student use Custom DocPerm, so DocType JSON permission rows alone are not
enough — Accounts users need matching Custom DocPerm entries.
"""

import frappe
from frappe.permissions import add_permission


def execute():
	for doctype in ("Application", "Student"):
		for role in ("Accounts Manager", "Accounts User"):
			if frappe.db.exists(
				"Custom DocPerm",
				{"parent": doctype, "role": role, "permlevel": 0, "if_owner": 0},
			):
				continue
			add_permission(doctype, role, permlevel=0, ptype="read")
			frappe.db.set_value(
				"Custom DocPerm",
				{"parent": doctype, "role": role, "permlevel": 0, "if_owner": 0},
				{
					"print": 1,
					"email": 1,
					"export": 1,
					"report": 1,
				},
				update_modified=False,
			)

	frappe.clear_cache()
