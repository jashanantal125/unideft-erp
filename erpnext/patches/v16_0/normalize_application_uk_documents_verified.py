import frappe


def execute():
	"""Normalize Application UK documents_verified after Check → Select."""
	if not frappe.db.has_column("Application UK", "documents_verified"):
		return
	frappe.db.sql(
		"""
		UPDATE `tabApplication UK`
		SET documents_verified = CASE
			WHEN documents_verified IN ('1', 1, 'Yes') THEN 'Yes'
			WHEN documents_verified IN ('0', 0) THEN ''
			WHEN documents_verified IN ('Still Processing', 'Not Accepted', 'Yes', 'No') THEN documents_verified
			ELSE ''
		END
		"""
	)
