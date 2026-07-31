import frappe

# Rename legacy uk_* columns in place so migrate does not duplicate row storage.
COLUMN_RENAMES = {
	"uk_student_contact": "student_contact_no",
	"uk_student_email": "student_email",
	"uk_dob": "dob",
	"uk_age": "current_age",
	"uk_qualification": "higher_education",
	"uk_marital_status": "martial_status",
	"uk_study_gap": "study_gap",
	"uk_refused_any_country": "any_visa_refused",
	"uk_refusal_letters": "visa_refusal_letters",
	"preferred_intake": "intake",
	"uk_case_display": "country_flow_case",
	"uk_is_package_case": "is_package_case",
	"uk_our_email_id": "data_swym",
	"uk_email_password": "password",
	"uk_recovery_email": "recovery_email_id",
	"uk_login_contact_no": "login_contact_no",
	"uk_12th_admit_card": "twelfth_admit_card_uploaded",
	"uk_school_domain_email": "school_domain_email",
	"uk_digi_locker_id": "school_digi_locker_id",
	"uk_digi_locker_password": "school_digi_locker_password",
	"uk_documents_verified": "documents_verified",
	"uk_documents_pdf": "documents_verified_pdf",
	"uk_documents_not_accepted_reason": "documents_not_accepted_alert",
	"uk_passport_upload": "passport_upload",
	"uk_application_filled_by": "application_filled_by",
	"uk_application_form_1": "application_form_1_upload",
	"uk_application_form_2": "application_form_2_upload",
	"uk_application_form_3": "application_form_3_upload",
	"uk_application_form_4": "application_form_4_upload",
	"uk_sop_upload": "sop_upload",
	"uk_application_submitted": "application_submitted",
	"uk_further_requirement_offer": "any_further_requirement_offer_letter",
	"uk_pending_requirements": "pending_requirement_details",
	"uk_pending_requirements_completed": "pending_requirements_completed",
	"uk_supporting_documents": "supporting_documents",
	"uk_university_name": "university_name",
	"uk_course_name": "course_name",
	"uk_intake": "university_intake",
	"uk_tuition_fee": "full_year_tuition_fee",
	"uk_offer_letter_upload": "offer_letter_upload",
	"uk_scholarship": "scholarship",
	"uk_payable_fee_cas": "payable_fee",
	"uk_living_location": "living_expenses_location",
	"uk_living_expense": "living_expenses",
	"uk_funds_required": "funds_required_amount",
	"uk_deposit_deadline": "deposit_deadline",
	"uk_tuition_paid_before_deadline": "tuition_paid_before_deadline",
	"uk_defer_offer_required": "defer_offer_required",
	"uk_funds_28_day_ok": "funds_28_day_ok",
	"uk_funds_meet_requirement": "funds_meet_requirement",
	"uk_medical_scheduled": "medical_scheduled",
	"uk_financial_docs_submitted": "financial_docs_submitted",
	"uk_financial_notes": "financial_notes",
	"uk_acceptance_submitted": "acceptance_submitted",
	"uk_deposit_paid": "deposit_paid",
	"uk_acceptance_docs": "acceptance_docs",
	"uk_cas_letter_received": "cas_letter_received",
	"uk_cas_any_pendency": "cas_any_pendency",
	"uk_cas_pendency_details": "cas_pendency_details",
	"uk_cas_pendency_completed": "cas_pendency_completed",
	"uk_cas_received": "cas_received",
	"uk_cas_number": "cas_number",
	"uk_cas_upload": "cas_upload",
	"uk_cas_notes": "cas_notes",
	"uk_sponsor_license_number": "sponsor_license_number",
	"uk_cas_extension_required": "cas_extension_required",
	"uk_who_lodges_visa": "who_lodges_visa",
	"uk_ihs_number": "ihs_number",
	"uk_ihs_upload": "ihs_upload",
	"uk_visa_file_lodged": "visa_file_lodged",
	"uk_gwf_number": "gwf_number",
	"uk_biometrics_done": "biometrics_done",
	"uk_visa_lodge_docs": "visa_lodge_docs",
	"uk_biometric_date": "biometric_date",
	"uk_biometric_place": "biometric_place",
	"uk_expected_visa_decision": "expected_visa_decision",
	"uk_visa_decision": "visa_decision",
	"uk_visa_copy": "visa_copy_upload",
	"uk_visa_notes": "visa_notes",
	"uk_evisa_activated": "evisa_activated",
	"uk_share_code_received": "share_code_received",
	"uk_share_code_verified": "share_code_verified",
	"uk_enrolled": "student_enrolled",
	"uk_enrolment_docs": "enrolment_docs",
	"uk_student_id_card": "student_id_card",
	"uk_refusal_reason": "refusal_reason",
	"uk_refusal_letter_upload": "refusal_letter_upload",
	"uk_process_other_country": "process_other_country",
	"uk_other_country_name": "other_country_name",
	"uk_applied_for_refund": "applied_for_refund",
	"uk_refund_status": "refund_status",
	"uk_refund_docs": "refund_docs",
	"uk_tuition_refund_received": "tuition_refund_received",
	"uk_ihs_refund_received": "ihs_refund_received",
}

DROP_COLUMNS = [
	"student_name_display",
	"uk_study_gap_proof",
	"uk_study_gap_category",
	"uk_study_gap_edu_type",
	"uk_study_gap_details",
	"uk_english_test_type",
	"uk_english_exam_date",
	"uk_english_valid",
	"uk_english_listening",
	"uk_english_reading",
	"uk_english_writing",
	"uk_english_speaking",
	"uk_english_login_user",
	"uk_english_login_password",
	"uk_english_overall",
	"uk_english_12th_marks",
	"uk_english_verified",
	"uk_english_scorecard",
	"uk_lor1_authority",
	"uk_lor1_position",
	"uk_lor1_upload",
	"uk_lor2_authority",
	"uk_lor2_position",
	"uk_lor2_upload",
	"uk_processing_agent_type",
	"uk_processing_vendor",
	"uk_offer_conditions",
	"uk_offer_condition_interview",
	"uk_offer_condition_english",
	"uk_offer_condition_verification",
	"uk_offer_condition_gap",
	"uk_offer_condition_other",
	"uk_funds_ready",
	"uk_sponsor_type",
	"uk_funds_documents",
	"uk_funds_type",
	"uk_interview_timing",
	"uk_interview_deadline",
	"uk_student_prepare_interview",
	"uk_interview_scheduled",
	"uk_interview_status",
	"uk_visa_lodged",
]

# Columns stored as text/varchar in legacy UK schema that must be recreated for AU field types.
RESET_COLUMNS = [
	"twelfth_admit_card_uploaded",
	"documents_verified",
]


def _reset_column(col, columns):
	if col not in columns:
		return columns
	frappe.db.sql_ddl(f"ALTER TABLE `tabApplication UK` DROP COLUMN `{col}`")
	columns.discard(col)
	return columns


def _live_columns():
	rows = frappe.db.sql(
		"""
		SELECT column_name
		FROM information_schema.columns
		WHERE table_schema = DATABASE()
		  AND table_name = 'tabApplication UK'
		""",
		as_dict=True,
	)
	return {row.column_name for row in rows}


def _column_definition(column):
	row = frappe.db.sql(
		"""
		SELECT column_type, is_nullable, column_default, extra
		FROM information_schema.columns
		WHERE table_schema = DATABASE()
		  AND table_name = 'tabApplication UK'
		  AND column_name = %s
		""",
		(column,),
		as_dict=True,
	)
	if not row:
		return None
	meta = row[0]
	parts = [meta.column_type]
	parts.append("NULL" if meta.is_nullable == "YES" else "NOT NULL")
	if meta.column_default is not None and str(meta.column_default).upper() != "NULL":
		default = meta.column_default
		if meta.column_type.startswith(("varchar", "char", "text", "date", "datetime")):
			parts.append(f"DEFAULT '{default}'")
		else:
			parts.append(f"DEFAULT {default}")
	if meta.extra:
		parts.append(meta.extra)
	return " ".join(parts)


def _rename_column(old_col, new_col, columns):
	if old_col not in columns:
		return columns
	if new_col in columns:
		frappe.db.sql(
			f"""
			UPDATE `tabApplication UK`
			SET `{new_col}` = `{old_col}`
			WHERE (`{new_col}` IS NULL OR `{new_col}` = '')
			  AND `{old_col}` IS NOT NULL AND `{old_col}` != ''
			"""
		)
		frappe.db.sql_ddl(f"ALTER TABLE `tabApplication UK` DROP COLUMN `{old_col}`")
	else:
		col_def = _column_definition(old_col)
		if not col_def:
			return columns
		frappe.db.sql_ddl(
			f"ALTER TABLE `tabApplication UK` CHANGE `{old_col}` `{new_col}` {col_def}"
		)
	columns.discard(old_col)
	columns.add(new_col)
	return columns


def _drop_column(col, columns):
	if col not in columns:
		return columns
	frappe.db.sql_ddl(f"ALTER TABLE `tabApplication UK` DROP COLUMN `{col}`")
	columns.discard(col)
	return columns


def execute():
	if not frappe.db.table_exists("tabApplication UK"):
		return

	columns = _live_columns()

	for old_col, new_col in COLUMN_RENAMES.items():
		columns = _rename_column(old_col, new_col, columns)

	for col in DROP_COLUMNS:
		columns = _drop_column(col, columns)

	for col in RESET_COLUMNS:
		columns = _reset_column(col, columns)

	if "higher_education" in columns:
		frappe.db.sql(
			"""
			UPDATE `tabApplication UK`
			SET higher_education = CASE higher_education
				WHEN '12th' THEN '12th pass'
				WHEN 'Graduation' THEN 'Graduation'
				WHEN 'Post-graduation' THEN 'Post-graduation'
				ELSE higher_education
			END
			WHERE higher_education IS NOT NULL AND higher_education != ''
			"""
		)

	if "martial_status" in columns:
		frappe.db.sql(
			"""
			UPDATE `tabApplication UK`
			SET martial_status = CASE martial_status
				WHEN 'Not Married' THEN 'Single'
				ELSE martial_status
			END
			WHERE martial_status IS NOT NULL AND martial_status != ''
			"""
		)

	frappe.db.sql(
		"""
		UPDATE `tabApplication UK`
		SET uk_current_stage = 'Details'
		WHERE uk_current_stage = 'Assessment'
		"""
	)

	_clean_empty_strings()
	_reset_incompatible_columns()

	frappe.clear_cache(doctype="Application UK")
	frappe.db.commit()


def _clean_empty_strings():
	cols = frappe.db.sql(
		"""
		SELECT column_name
		FROM information_schema.columns
		WHERE table_schema = DATABASE()
		  AND table_name = 'tabApplication UK'
		  AND data_type IN ('varchar', 'text', 'mediumtext', 'longtext')
		""",
		as_dict=True,
	)
	frappe.db.sql("SET SQL_SAFE_UPDATES = 0")
	skip = {"name", "owner", "modified_by", "naming_series"}
	for row in cols:
		col = row.column_name
		if col in skip:
			continue
		frappe.db.sql(f"UPDATE `tabApplication UK` SET `{col}` = NULL WHERE `{col}` = ''")


def _reset_incompatible_columns():
	import json
	from pathlib import Path

	uk_json = Path(__file__).resolve().parents[2] / "crm" / "doctype" / "application_uk" / "application_uk.json"
	meta = json.loads(uk_json.read_text())
	type_map = {
		"Check": "tinyint",
		"Int": "int",
		"Currency": "decimal",
		"Date": "date",
		"Datetime": "datetime",
	}
	targets = {
		f["fieldname"]: type_map.get(f["fieldtype"])
		for f in meta["fields"]
		if isinstance(f, dict) and f.get("fieldtype") in type_map
	}
	rows = frappe.db.sql(
		"""
		SELECT column_name, data_type
		FROM information_schema.columns
		WHERE table_schema = DATABASE()
		  AND table_name = 'tabApplication UK'
		""",
		as_dict=True,
	)
	existing = {r.column_name: r for r in rows}
	for fieldname, want in targets.items():
		row = existing.get(fieldname)
		if not row:
			continue
		if want and want not in row.data_type and row.data_type in ("varchar", "text", "mediumtext", "longtext"):
			frappe.db.sql_ddl(f"ALTER TABLE `tabApplication UK` DROP COLUMN `{fieldname}`")
