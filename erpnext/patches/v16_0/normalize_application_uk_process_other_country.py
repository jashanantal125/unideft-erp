import frappe


def execute():
	"""Normalize Application UK process_other_country after Check → Select."""
	if not frappe.db.has_column("Application UK", "process_other_country"):
		return
	frappe.db.sql(
		"""
		UPDATE `tabApplication UK`
		SET process_other_country = CASE
			WHEN process_other_country IN ('1', 1, 'Yes') THEN 'Yes'
			WHEN process_other_country IN ('0', 0, 'No') THEN 'No'
			ELSE ''
		END
		"""
	)
