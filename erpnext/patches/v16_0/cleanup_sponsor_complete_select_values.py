import frappe


def execute():
	"""Normalize sponsor funds Select values after Check → Yes/No conversions."""
	if not frappe.db.table_exists("Application Sponsor Complete"):
		return

	yes_no_fields = (
		"fd_nationalized",
		"fd_balance_cert_available",
		"statement_nationalized",
		"statement_balance_cert_available",
		"statement_balance_cert_same_date",
		"loan_education_purpose",
		"loan_holder_student",
		"loan_covering_requirements",
		"other_nationalized",
	)
	for fieldname in yes_no_fields:
		if not frappe.db.has_column("Application Sponsor Complete", fieldname):
			continue
		frappe.db.sql(
			f"UPDATE `tabApplication Sponsor Complete` SET `{fieldname}`='' WHERE `{fieldname}` IN ('0', '0.0')"
		)
		frappe.db.sql(
			f"UPDATE `tabApplication Sponsor Complete` SET `{fieldname}`='Yes' WHERE `{fieldname}` IN ('1', '1.0')"
		)

	if frappe.db.has_column("Application Sponsor Complete", "sponsor_type"):
		frappe.db.sql(
			"""
			UPDATE `tabApplication Sponsor Complete`
			SET sponsor_type=''
			WHERE sponsor_type IN ('Relative', 'Other')
			"""
		)

	if frappe.db.has_column("Application Sponsor Complete", "statement_fifty_thousand_times"):
		frappe.db.sql(
			"""
			UPDATE `tabApplication Sponsor Complete`
			SET statement_fifty_thousand_times=''
			WHERE statement_fifty_thousand_times IN ('1 Time', '2 Times', '3 Times', 'More than 3 Times')
			"""
		)
