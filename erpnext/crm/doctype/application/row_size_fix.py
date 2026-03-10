"""
Utilities to deal with MariaDB/MySQL row-size limits on tabApplication.

We intentionally keep this as a simple, callable function so it can be run via:
bench --site <site> execute erpnext.crm.doctype.application.row_size_fix.shrink_application_row_size
"""

from __future__ import annotations


def shrink_application_row_size() -> None:
	"""Convert some columns to TEXT/INT to free row size."""
	import frappe

	# Convert selected VARCHAR columns to TEXT (stored off-page, reduces in-row size)
	ddl_statements = [
		"ALTER TABLE `tabApplication` MODIFY COLUMN `toefl_user_id` TEXT",
		"ALTER TABLE `tabApplication` MODIFY COLUMN `spouse_gap_type` TEXT",
		"ALTER TABLE `tabApplication` MODIFY COLUMN `spouse_university_domain_email_id_optional_copy` TEXT",
		"ALTER TABLE `tabApplication` MODIFY COLUMN `gst_number` TEXT",
		# Make current_age numeric and compact
		"ALTER TABLE `tabApplication` MODIFY COLUMN `current_age` INT",
	]

	for ddl in ddl_statements:
		frappe.db.sql_ddl(ddl)

	frappe.db.commit()


def estimate_tabapplication_row_bytes() -> dict:
	"""
	Return an estimate of maximum in-row bytes for tabApplication.

	This is an estimate (MariaDB stores TEXT/BLOB off-row with a pointer and row overhead varies),
	but it's very useful for comparing "before vs after" changes.
	"""
	import frappe

	cols = frappe.db.sql(
		"""
		SELECT
			column_name,
			data_type,
			character_maximum_length,
			numeric_precision,
			numeric_scale
		FROM information_schema.columns
		WHERE table_schema = DATABASE()
		  AND table_name = 'tabApplication'
		""",
		as_dict=True,
	)

	# Very rough maximum bytes-by-type. We focus on common offenders (VARCHAR).
	def _max_bytes(c: dict) -> int:
		dt = (c.get("data_type") or "").lower()
		cml = c.get("character_maximum_length") or 0

		if dt in ("varchar", "char"):
			# utf8mb4 can be up to 4 bytes/char; row-size limit is in bytes
			return int(cml) * 4
		if dt in ("tinyint",):
			return 1
		if dt in ("smallint",):
			return 2
		if dt in ("int", "integer"):
			return 4
		if dt in ("bigint",):
			return 8
		if dt in ("date",):
			return 3
		if dt in ("datetime",):
			return 8
		if dt in ("time",):
			return 3
		if dt in ("float",):
			return 4
		if dt in ("double",):
			return 8
		if dt in ("decimal",):
			# approximate; depends on precision/scale
			return 16
		if dt in ("text", "longtext", "mediumtext", "blob", "longblob", "mediumblob"):
			# in-row pointer/length; depends on type, but small compared to varchar(140)
			return 20
		return 0

	total = 0
	by_type: dict[str, int] = {}
	for c in cols:
		b = _max_bytes(c)
		total += b
		by_type[c["data_type"]] = by_type.get(c["data_type"], 0) + b

	return {"total_estimated_max_bytes": total, "by_type_estimated_bytes": by_type, "column_count": len(cols)}


def normalize_yes_no_columns_to_int() -> None:
	"""
	Convert existing 'Yes'/'No' string values to 1/0 for selected columns.

	Run this BEFORE changing the DocType fields from Select -> Check, so the schema
	change (varchar -> tinyint) succeeds without conversion errors.
	"""
	import frappe

	columns = [
		"any_visa_refused",
		"documents_verified",
		"study_gap",
		"ielts_validity",
		"ielts_verified",
		"pte_validity",
		"pte_verified",
		"toefl_validity",
		"toefl_verified",
		"spouse_study_gap",
		"spouse_work_experience",
		"defer_offer_required",
		"gs_submitted",
		"student_prepare",
		"schedule_interview",
		"offer_accepted",
		"oshc",
		"medical",
		"application_closed",
		"pending_requirements_completed",
		"any_further_requirement_offer_letter",
		"is_this_nationalised_bank",
	]

	# Any non-Yes value becomes 0 (including NULL/empty/No)
	for col in columns:
		frappe.db.sql(
			f"""
			UPDATE `tabApplication`
			SET `{col}` = CASE
				WHEN COALESCE(CAST(`{col}` AS CHAR), '') IN ('Yes', '1') THEN 1
				ELSE 0
			END
			"""
		)

	frappe.db.commit()

