import frappe


def execute():
	"""Convert Study Gap Check values to Yes/No Select."""
	frappe.db.sql(
		"""
		UPDATE `tabApplication`
		SET study_gap = 'Yes'
		WHERE CAST(study_gap AS CHAR) IN ('1')
		"""
	)
	frappe.db.sql(
		"""
		UPDATE `tabApplication`
		SET study_gap = 'No'
		WHERE CAST(study_gap AS CHAR) IN ('0', '')
		   OR study_gap IS NULL
		"""
	)
	frappe.db.sql(
		"""
		UPDATE `tabApplication`
		SET study_gap = ''
		WHERE CAST(study_gap AS CHAR) NOT IN ('Yes', 'No', '')
		"""
	)
