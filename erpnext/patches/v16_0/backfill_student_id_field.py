"""B1 - backfill the new Student.student_id mirror column.

Student's list view renders `title`, so the STU- document id was never shown as
a column. student_id mirrors `name` into a real field so it can be a sortable,
filterable list/report column for agents. New records are filled by
Student.after_insert; existing rows are filled here.
"""

import frappe


def execute():
	if not frappe.db.has_column("Student", "student_id"):
		return

	Student = frappe.qb.DocType("Student")
	frappe.qb.update(Student).set(Student.student_id, Student.name).where(
		(Student.student_id.isnull()) | (Student.student_id == "")
	).run()
