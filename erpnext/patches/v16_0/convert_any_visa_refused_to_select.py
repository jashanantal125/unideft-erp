import frappe


def execute():
	"""Convert Refused from Aus/NZ Check values to Yes/No Select."""
	frappe.db.sql(
		"""
		UPDATE `tabApplication`
		SET any_visa_refused = 'Yes'
		WHERE CAST(any_visa_refused AS CHAR) IN ('1')
		"""
	)
	frappe.db.sql(
		"""
		UPDATE `tabApplication`
		SET any_visa_refused = 'No'
		WHERE CAST(any_visa_refused AS CHAR) IN ('0', '')
		   OR any_visa_refused IS NULL
		"""
	)
	frappe.db.sql(
		"""
		UPDATE `tabApplication`
		SET any_visa_refused = ''
		WHERE CAST(any_visa_refused AS CHAR) NOT IN ('Yes', 'No', '')
		"""
	)
