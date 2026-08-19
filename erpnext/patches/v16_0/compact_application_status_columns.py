import frappe


def execute():
	"""Free inline row space before new Australia workflow fields are synced."""
	columns = (
		"gap_duration_status",
		"gap_duration_not_accepted",
		"case_4_note_wait",
		"case_4_note_convince",
		"school_docs_status",
		"study_gap_status",
		"study_gap_not_accepted_status",
	)
	existing = [
		column for column in columns if frappe.db.has_column("Application", column)
	]
	if not existing:
		return

	alter_columns = ", ".join(
		f"MODIFY COLUMN `{column}` text" for column in existing
	)
	frappe.db.sql_ddl(f"ALTER TABLE `tabApplication` {alter_columns}")
