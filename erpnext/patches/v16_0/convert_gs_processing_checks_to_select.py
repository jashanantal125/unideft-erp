import frappe


def execute():
	"""Convert GS Approved / Any Requirement Check values to Yes/No Select."""
	for fieldname in ("gs_approved_check", "gs_any_requirement"):
		frappe.db.sql(
			f"""
			UPDATE `tabApplication`
			SET `{fieldname}` = 'Yes'
			WHERE CAST(`{fieldname}` AS CHAR) IN ('1')
			"""
		)
		frappe.db.sql(
			f"""
			UPDATE `tabApplication`
			SET `{fieldname}` = 'No'
			WHERE CAST(`{fieldname}` AS CHAR) IN ('0', '')
			   OR `{fieldname}` IS NULL
			"""
		)
		frappe.db.sql(
			f"""
			UPDATE `tabApplication`
			SET `{fieldname}` = ''
			WHERE CAST(`{fieldname}` AS CHAR) NOT IN ('Yes', 'No', '')
			"""
		)
