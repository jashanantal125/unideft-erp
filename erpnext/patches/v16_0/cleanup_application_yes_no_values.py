import frappe


def execute():
	"""Clear legacy Check 0/1 values from Application Yes/No Select fields."""
	fields = frappe.get_all(
		"DocField",
		filters={"parent": "Application", "fieldtype": "Select"},
		fields=["fieldname", "options"],
	)
	yes_no_fields = []
	for field in fields:
		options = {opt.strip() for opt in (field.options or "").split("\n") if opt.strip()}
		if options == {"Yes", "No"} and frappe.db.has_column("Application", field.fieldname):
			yes_no_fields.append(field.fieldname)

	for fieldname in yes_no_fields:
		frappe.db.sql(
			f"UPDATE `tabApplication` SET `{fieldname}`='' WHERE `{fieldname}` = '0'"
		)
		frappe.db.sql(
			f"UPDATE `tabApplication` SET `{fieldname}`='Yes' WHERE `{fieldname}` = '1'"
		)
