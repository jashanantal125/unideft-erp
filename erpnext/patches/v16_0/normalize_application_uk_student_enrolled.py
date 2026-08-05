import frappe


def execute():
	"""Normalize Application UK student_enrolled after Check → Select."""
	if not frappe.db.has_column("Application UK", "student_enrolled"):
		return
	# Old Check values may remain as 0/1
	frappe.db.sql(
		"""
		UPDATE `tabApplication UK`
		SET student_enrolled = CASE
			WHEN student_enrolled IN ('1', 1) THEN 'Yes'
			WHEN student_enrolled IN ('0', 0, '') OR student_enrolled IS NULL THEN ''
			ELSE student_enrolled
		END
		"""
	)
