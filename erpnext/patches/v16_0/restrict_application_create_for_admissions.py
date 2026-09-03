"""A2 - Admissions must never create an Application.

Admissions only ever receive applications submitted by agents or assigned to
them, so "Create" is removed while Read/Write are left intact.

Application permissions are managed through Custom DocPerm rows in this site,
so editing the permissions array in application.json would have no effect -
see grant_student_access_for_cro_admission.py for the same constraint.

The spec called this role "Admissions Team", which does not exist here; the
real roles are "Admission 1" and "Admission 2".
"""

import frappe
from frappe.permissions import add_permission, update_permission_property

ADMISSION_ROLES = ("Admission 1", "Admission 2")

# Everything an admissions user needs to work an application that reaches them -
# deliberately excluding "create" and "delete".
GRANT = ("read", "write", "print", "email", "export", "report", "share")


def execute():
	for role in ADMISSION_ROLES:
		if not frappe.db.exists("Role", role):
			continue

		exists = frappe.db.exists(
			"Custom DocPerm",
			{"parent": "Application", "role": role, "permlevel": 0, "if_owner": 0},
		)
		if not exists:
			# Application is governed entirely by Custom DocPerm rows, and neither
			# admission role had one - so admissions could not open an Application
			# at all, despite the Processing tab in application.json being gated to
			# show for exactly these roles. A2's acceptance criteria require them to
			# still open and edit applications assigned to them, so the row is
			# created here rather than only tightened.
			add_permission("Application", role, permlevel=0, ptype="read")

		for ptype in GRANT:
			update_permission_property("Application", role, 0, ptype, 1, validate=False)

		for ptype in ("create", "delete"):
			update_permission_property("Application", role, 0, ptype, 0, validate=False)

	frappe.clear_cache(doctype="Application")
