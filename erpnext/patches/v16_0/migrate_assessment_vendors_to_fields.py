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
#
# Only part of the old grid was flattened onto Assessment Request - the rest of
# the workflow moved to the Course Shortlisting table - so both sides of the map
# are checked against the actual columns before anything is read or written.

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

# The CRO copy of "Have You Provided?" is a new, deliberately separate field.
# Seed it from the single answer the grid used to hold so nothing already agreed
# with the student is lost.
CRO_SOURCE = "options_provided_to_student"
CRO_TARGET = "cro_options_provided"


def execute():
	if not frappe.db.table_exists("Need Assessment Vendor"):
		return

	if not frappe.db.table_exists("Assessment Request"):
		return

	source_columns = set(frappe.db.get_table_columns("Need Assessment Vendor"))
	target_columns = set(frappe.db.get_table_columns("Assessment Request"))
	target_meta = frappe.get_meta("Assessment Request")

	def can_copy(source, target):
		# The column check keeps the UPDATE valid; the meta check keeps us from
		# filling a column that sync left behind after its field was dropped.
		return (
			source in source_columns and target in target_columns and target_meta.has_field(target)
		)

	field_map = {
		source: target for source, target in FIELD_MAP.items() if can_copy(source, target)
	}

	copy_cro = can_copy(CRO_SOURCE, CRO_TARGET)
	if not field_map and not copy_cro:
		return

	select_columns = set(field_map) | ({CRO_SOURCE} if copy_cro else set())

	rows = frappe.db.sql(
		"""
		SELECT {columns}, parent
		FROM `tabNeed Assessment Vendor`
		WHERE parenttype = 'Assessment Request'
		ORDER BY parent, idx
		""".format(columns=", ".join(f"`{c}`" for c in sorted(select_columns))),
		as_dict=True,
	)

	seen = set()
	for row in rows:
		if row.parent in seen:
			continue
		seen.add(row.parent)

		if not frappe.db.exists("Assessment Request", row.parent):
			continue

		values = {target: row.get(source) for source, target in field_map.items() if row.get(source)}

		if copy_cro and row.get(CRO_SOURCE):
			values[CRO_TARGET] = row.get(CRO_SOURCE)

		if not values:
			continue

		frappe.db.set_value("Assessment Request", row.parent, values, update_modified=False)
