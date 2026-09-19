# Copyright (c) 2026, Unideft and contributors
# For license information, please see license.txt

import frappe

# The Assessment Workflow tab used to be a "Need Assessment Vendor" grid on
# Assessment Request; it is now a flat set of fields. Carry the existing rows
# across so submitted assessments keep their answers.
#
# The grid allowed several rows per request but was used as a single workflow in
# practice, so the earliest row wins and anything beyond it is left in place
# (the child table itself is untouched, and Application still uses it).

FIELD_MAP = {
	"assessment_channel": "assessment_channel",
	"vendor": "vendor",
	"assessment_received": "assessment_received",
	"options_provided_to_student": "options_provided_to_student",
	"student_confirmed_to_apply": "student_confirmed_to_apply",
	"denial_reason": "denial_reason",
	"student_application_punched": "student_application_punched",
	"application_when_can_apply": "application_when_can_apply",
	"application_id": "application_id",
	"university": "university",
	"course": "course",
	"assessment_status": "assessment_status",
}


def execute():
	if not frappe.db.table_exists("Need Assessment Vendor"):
		return

	rows = frappe.db.sql(
		"""
		SELECT {columns}, parent
		FROM `tabNeed Assessment Vendor`
		WHERE parenttype = 'Assessment Request'
		ORDER BY parent, idx
		""".format(columns=", ".join(f"`{c}`" for c in FIELD_MAP)),
		as_dict=True,
	)

	seen = set()
	for row in rows:
		if row.parent in seen:
			continue
		seen.add(row.parent)

		if not frappe.db.exists("Assessment Request", row.parent):
			continue

		values = {target: row.get(source) for source, target in FIELD_MAP.items() if row.get(source)}
		if not values:
			continue

		# The CRO copy of "Have You Provided?" is a new, deliberately separate
		# field. Seed it from the single answer the grid used to hold so nothing
		# already agreed with the student is lost.
		if row.get("options_provided_to_student"):
			values["cro_options_provided"] = row.get("options_provided_to_student")

		frappe.db.set_value("Assessment Request", row.parent, values, update_modified=False)
