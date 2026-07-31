import frappe


def execute():
	if frappe.db.table_exists("tabApplication UK Data") and not frappe.db.table_exists("tabApplication UK"):
		frappe.rename_doc("DocType", "Application UK Data", "Application UK", force=True)

	if frappe.db.table_exists("tabApplication UK"):
		frappe.db.sql(
			"""
			UPDATE `tabApplication UK`
			SET uk_current_stage = 'Details'
			WHERE uk_current_stage = 'Assessment'
			"""
		)

		# Repoint Application index links that still use old doctype name in Dynamic Link metadata
		frappe.db.sql(
			"""
			UPDATE `tabApplication`
			SET uk_data = uk_data
			WHERE destination_country = 'United Kingdom' AND uk_data IS NOT NULL AND uk_data != ''
			"""
		)

	frappe.clear_cache()
