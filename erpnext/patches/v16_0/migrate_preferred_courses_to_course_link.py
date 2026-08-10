"""Copy first Preferred Courses child row into Application / Application UK.course."""

import frappe


def execute():
	if frappe.db.exists("DocType", "Application Course"):
		_copy_from_child("Application")
		_copy_from_child("Application UK")


def _copy_from_child(parenttype: str):
	if not frappe.db.has_column(parenttype, "course"):
		return

	rows = frappe.db.sql(
		"""
		SELECT parent, course
		FROM `tabApplication Course`
		WHERE parenttype = %s
			AND parentfield = 'preferred_courses'
			AND IFNULL(course, '') != ''
		ORDER BY idx ASC
		""",
		(parenttype,),
		as_dict=True,
	)
	seen = set()
	for row in rows:
		if row.parent in seen:
			continue
		seen.add(row.parent)
		if not frappe.db.exists(parenttype, row.parent):
			continue
		current = frappe.db.get_value(parenttype, row.parent, "course")
		if not current:
			frappe.db.set_value(
				parenttype, row.parent, "course", row.course, update_modified=False
			)
