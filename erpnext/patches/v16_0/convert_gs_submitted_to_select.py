import frappe


def execute():
	"""Convert GS Submitted Check values to Yes/No Select."""
	# Use string-only comparisons to avoid MariaDB casting Select values to DECIMAL
	frappe.db.sql(
		"""
		UPDATE `tabApplication`
		SET gs_submitted = 'Yes'
		WHERE CAST(gs_submitted AS CHAR) IN ('1')
		"""
	)
	frappe.db.sql(
		"""
		UPDATE `tabApplication`
		SET gs_submitted = 'No'
		WHERE CAST(gs_submitted AS CHAR) IN ('0', '')
		   OR gs_submitted IS NULL
		"""
	)
	# Anything still not Yes/No (edge leftovers) → No
	frappe.db.sql(
		"""
		UPDATE `tabApplication`
		SET gs_submitted = 'No'
		WHERE CAST(gs_submitted AS CHAR) NOT IN ('Yes', 'No')
		"""
	)
