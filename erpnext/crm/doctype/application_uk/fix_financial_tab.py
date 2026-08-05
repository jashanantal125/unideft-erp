#!/usr/bin/env python3
"""Fix Application UK Financial tab depends_on + rebuild Application UK Sponsor."""

from __future__ import annotations

import json
from pathlib import Path

UK_JSON = Path(__file__).with_name("application_uk.json")
SPONSOR_JSON = (
	Path(__file__).resolve().parents[1] / "application_uk_sponsor" / "application_uk_sponsor.json"
)

HAS_I = (
	"doc.conditions_on_offer_letter && Array.isArray(doc.conditions_on_offer_letter) "
	"&& doc.conditions_on_offer_letter.some(function(r){ return (r.condition || '').indexOf('Interview') !== -1; })"
)
PREPARE = (
	f"(({HAS_I} && doc.interview_timing == 'Before Deposit') "
	f"|| ({HAS_I} && doc.interview_timing == 'After Deposit' && doc.initial_amount_paid == 'Yes') "
	f"|| ({HAS_I} && doc.interview_timing == 'Other'))"
)


def fix_uk_interview_depends():
	doc = json.loads(UK_JSON.read_text())
	fixed = 0
	for df in doc["fields"]:
		dep = df.get("depends_on") or ""
		# Broken pattern from earlier patch: "((eval:....) || (eval:....))"
		if "((eval:" in dep or dep.startswith("((eval"):
			# Rebuild from fieldname rules
			name = df["fieldname"]
			base = PREPARE
			extra = ""
			if name in (
				"student_prepare",
				"schedule_interview",
			):
				extra = ""
			elif name == "student_prepare_yes_status":
				extra = " && doc.student_prepare == 'Yes'"
			elif name == "student_prepare_no_status":
				extra = " && doc.student_prepare == 'No'"
			elif name == "interview_scheduled":
				extra = " && doc.student_prepare == 'Yes'"
			elif name == "interview_date":
				extra = " && doc.student_prepare == 'Yes' && doc.interview_scheduled == 'Yes'"
			elif name == "interview_scheduled_no_note":
				extra = " && doc.student_prepare == 'Yes' && doc.interview_scheduled == 'No'"
			elif name == "schedule_interview_yes_status":
				extra = " && doc.schedule_interview == 'Yes'"
			elif name == "schedule_interview_no_status":
				extra = " && doc.schedule_interview == 'No'"
			else:
				# generic: strip nested eval wrappers is too hard — use PREPARE only
				extra = ""
			df["depends_on"] = f"eval:{base}{extra}"
			fixed += 1

	# Verification: Academics only per UK PDF
	for df in doc["fields"]:
		if df.get("fieldname") == "verification_type":
			df["options"] = "\nAcademics"
			df["label"] = "Verification Type"

	# Medical on financials: upload when scheduled Yes + notes
	by = {df["fieldname"]: i for i, df in enumerate(doc["fields"])}
	# Ensure medical_upload_financial exists near medical_scheduled
	if "medical_upload_financial" not in by and "medical_scheduled" in by:
		idx = by["medical_scheduled"] + 1
		doc["fields"][idx:idx] = [
			{
				"fieldname": "medical_scheduled_yes_note",
				"fieldtype": "Small Text",
				"label": "Note",
				"default": "→ Set reminder to receive medical and upload",
				"depends_on": "eval:doc.medical_scheduled == 'Yes'",
				"read_only": 1,
				"bold": 1,
			},
			{
				"fieldname": "medical_upload_financial",
				"fieldtype": "Attach",
				"label": "Upload Medical",
				"depends_on": "eval:doc.medical_scheduled == 'Yes'",
			},
			{
				"fieldname": "medical_scheduled_no_note",
				"fieldtype": "Small Text",
				"label": "Note",
				"default": "→ Set reminder to schedule medical",
				"depends_on": "eval:doc.medical_scheduled == 'No'",
				"read_only": 1,
				"bold": 1,
			},
		]

	# Funds meet / financial docs notes if missing
	by = {df["fieldname"]: i for i, df in enumerate(doc["fields"])}
	inserts = []
	if "funds_meet_requirement" in by:
		if "funds_meet_ok_note" not in by:
			inserts.append(
				(
					"funds_meet_requirement",
					[
						{
							"fieldname": "funds_meet_ok_note",
							"fieldtype": "Small Text",
							"label": "Status",
							"default": "✓ OK",
							"depends_on": "eval:doc.funds_meet_requirement == 'Yes'",
							"read_only": 1,
							"bold": 1,
						},
						{
							"fieldname": "funds_meet_no_note",
							"fieldtype": "Small Text",
							"label": "Note",
							"default": "→ Set reminder to complete showing amount to meet funds requirements",
							"depends_on": "eval:doc.funds_meet_requirement == 'No'",
							"read_only": 1,
							"bold": 1,
						},
					],
				)
			)
	if "financial_docs_submitted" in by:
		if "financial_docs_yes_note" not in by:
			inserts.append(
				(
					"financial_docs_submitted",
					[
						{
							"fieldname": "financial_docs_yes_note",
							"fieldtype": "Small Text",
							"label": "Status",
							"default": "✓ Move to Acceptance stage",
							"depends_on": "eval:doc.financial_docs_submitted == 'Yes'",
							"read_only": 1,
							"bold": 1,
						},
						{
							"fieldname": "financial_docs_no_note",
							"fieldtype": "Small Text",
							"label": "Note",
							"default": "→ Set reminder when financial documents will be submitted",
							"depends_on": "eval:doc.financial_docs_submitted == 'No'",
							"read_only": 1,
							"bold": 1,
						},
					],
				)
			)

	for after_name, rows in reversed(inserts):
		by = {df["fieldname"]: i for i, df in enumerate(doc["fields"])}
		idx = by[after_name] + 1
		doc["fields"][idx:idx] = rows

	# Tuition paid OK note
	by = {df["fieldname"]: i for i, df in enumerate(doc["fields"])}
	if "tuition_fee_paid_interview" in by and "tuition_fee_paid_interview_ok_note" not in by:
		idx = by["tuition_fee_paid_interview"] + 1
		doc["fields"].insert(
			idx,
			{
				"fieldname": "tuition_fee_paid_interview_ok_note",
				"fieldtype": "Small Text",
				"label": "Status",
				"default": "✓ OK",
				"depends_on": "eval:doc.conditions_on_offer_letter && Array.isArray(doc.conditions_on_offer_letter) && doc.conditions_on_offer_letter.some(function(r){ return (r.condition || '').indexOf('Interview') !== -1; }) && doc.interview_timing == 'Before Deposit' && doc.tuition_fee_paid_interview == 'Yes'",
				"read_only": 1,
				"bold": 1,
			},
		)

	# Improve sponsors section label
	for df in doc["fields"]:
		if df.get("fieldname") == "uk_sponsors":
			df["label"] = "Who Sponsored (add one row per sponsor)"
			df["description"] = "Select Student / Father / Mother. Multiple rows allowed — each row shows its own fields."

	doc["field_order"] = [df["fieldname"] for df in doc["fields"]]
	names = doc["field_order"]
	dups = sorted({n for n in names if names.count(n) > 1})
	if dups:
		raise SystemExit(f"UK dups: {dups}")
	UK_JSON.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n")
	print(f"UK fixed interview depends={fixed}, fields={len(doc['fields'])}")


def f(fieldname, fieldtype, label=None, **kw):
	out = {"fieldname": fieldname, "fieldtype": fieldtype}
	if label is not None:
		out["label"] = label
	out.update({k: v for k, v in kw.items() if v is not None})
	return out


def yn(fieldname, label, depends_on=None):
	return f(fieldname, "Select", label, options="\nYes\nNo", depends_on=depends_on)


def note(fieldname, text, depends_on, label="Note"):
	return f(
		fieldname,
		"Small Text",
		label,
		default=text,
		depends_on=depends_on,
		read_only=1,
		bold=1,
	)


def rebuild_sponsor():
	student = "eval:doc.sponsor_who == 'Student'"
	parent = "eval:doc.sponsor_who == 'Father' || doc.sponsor_who == 'Mother'"
	bank = f"{student} && doc.funds_type == 'Bank statement'"
	fd = f"{student} && doc.funds_type == 'FD'"
	loan = f"{student} && doc.funds_type == 'Education loan'"
	bank_or_fd = f"{student} && (doc.funds_type == 'Bank statement' || doc.funds_type == 'FD')"

	# IMPORTANT: Student funds must be in their own Section Break BEFORE Parent Documents.
	# Frappe hides all fields until the next Section Break when a section is hidden —
	# putting funds_type under Parent Documents made Student show nothing.
	parent_yes = f"eval:(doc.sponsor_who == 'Father' || doc.sponsor_who == 'Mother') && doc.birth_cert_available == 'Yes'"
	parent_no = f"eval:(doc.sponsor_who == 'Father' || doc.sponsor_who == 'Mother') && doc.birth_cert_available == 'No'"

	fields = [
		f("sponsor_who", "Select", "Sponsor", options="\nStudent\nFather\nMother", reqd=1, in_list_view=1),
		# Student funds (own section)
		f("section_student_funds", "Section Break", "Student Funds", depends_on=student),
		f(
			"funds_type",
			"Select",
			"Funds Type",
			options="\nBank statement\nFD\nEducation loan",
			depends_on=student,
			in_list_view=1,
			mandatory_depends_on=student,
		),
		f("column_break_student_1", "Column Break"),
		f("bank_name", "Data", "Name of Bank", depends_on=bank_or_fd, in_list_view=1),
		f(
			"amount_gbp",
			"Currency",
			"Amount",
			depends_on=f"{student} && (doc.funds_type == 'Bank statement' || doc.funds_type == 'FD' || doc.funds_type == 'Education loan')",
			in_list_view=1,
			description="Enter amount in GBP",
		),
		yn("nationalized_bank", "Is this a nationalized bank?", bank_or_fd),
		note(
			"nationalized_bank_ok",
			"✓ OK",
			f"{bank_or_fd} && doc.nationalized_bank == 'Yes'",
			"Status",
		),
		note(
			"nationalized_bank_no",
			"⚠ Cannot accept — transfer funds to a nationalized bank",
			f"{bank_or_fd} && doc.nationalized_bank == 'No'",
		),
		# Bank statement details
		f("section_bank", "Section Break", "Bank Statement", depends_on=bank),
		yn("balance_certificate_available", "Is Balance Certificate Available?", bank),
		yn(
			"cert_same_date",
			"Is date of issue of Bank statement and balance certificate the same?",
			f"{bank} && doc.balance_certificate_available == 'Yes'",
		),
		note(
			"cert_same_date_ok",
			"✓ OK",
			f"{bank} && doc.balance_certificate_available == 'Yes' && doc.cert_same_date == 'Yes'",
			"Status",
		),
		note(
			"cert_same_date_no",
			"→ Both documents should be of the same date — set reminder",
			f"{bank} && doc.balance_certificate_available == 'Yes' && doc.cert_same_date == 'No'",
		),
		note(
			"balance_cert_needed_note",
			"→ Need Balance Certificate also — set reminder",
			f"{bank} && doc.balance_certificate_available == 'No'",
		),
		f(
			"balance_certificate",
			"Attach",
			"Balance Certificate Upload",
			depends_on=f"{student} && ((doc.funds_type == 'Bank statement' && doc.balance_certificate_available == 'Yes') || doc.funds_type == 'FD')",
		),
		yn("funds_28_day_ok", "Is statement being 28 days old?", bank_or_fd),
		note(
			"funds_28_day_ok_note",
			"✓ OK — Upload statement / FD",
			f"{bank_or_fd} && doc.funds_28_day_ok == 'Yes'",
			"Status",
		),
		note(
			"funds_28_day_wait_note",
			"→ Wait for 28 days old — set reminder",
			f"{bank_or_fd} && doc.funds_28_day_ok == 'No'",
		),
		f(
			"statement_upload",
			"Attach",
			"Bank Statement Upload",
			depends_on=f"{bank} && doc.funds_28_day_ok == 'Yes'",
		),
		# FD
		f("section_fd", "Section Break", "Fixed Deposit", depends_on=fd),
		yn("fd_balance_certificate_available", "Is Balance Certificate Available?", fd),
		note(
			"fd_balance_cert_ok",
			"✓ OK",
			f"{fd} && doc.fd_balance_certificate_available == 'Yes'",
			"Status",
		),
		note(
			"fd_balance_cert_no",
			"→ Set reminder to receive balance certificate",
			f"{fd} && doc.fd_balance_certificate_available == 'No'",
		),
		f(
			"fd_upload",
			"Attach",
			"FD Document Upload",
			depends_on=f"{fd} && doc.funds_28_day_ok == 'Yes'",
		),
		# Education loan
		f("section_loan", "Section Break", "Education Loan", depends_on=loan),
		yn("loan_for_education", "Loan is only for education purpose?", loan),
		note(
			"loan_for_education_ok",
			"✓ OK",
			f"{loan} && doc.loan_for_education == 'Yes'",
			"Status",
		),
		note(
			"loan_for_education_no",
			"→ Need revised Education Loan Letter — set reminder",
			f"{loan} && doc.loan_for_education == 'No'",
		),
		yn(
			"loan_holder_is_student",
			"Education Loan Holder Name should be student name?",
			loan,
		),
		note(
			"loan_holder_ok",
			"✓ OK",
			f"{loan} && doc.loan_holder_is_student == 'Yes'",
			"Status",
		),
		note(
			"loan_holder_no",
			"→ Need revised Education Loan Letter — set reminder",
			f"{loan} && doc.loan_holder_is_student == 'No'",
		),
		f("loan_amount", "Currency", "Loan Amount", depends_on=loan, description="GBP"),
		f("loan_bank_name", "Data", "Bank Name", depends_on=loan),
		yn("loan_covers_funds", "Is Loan Amount Covering Funds Requirements?", loan),
		note(
			"loan_covers_ok",
			"✓ OK",
			f"{loan} && doc.loan_covers_funds == 'Yes'",
			"Status",
		),
		note(
			"loan_covers_no",
			"→ Need revised Education Loan Letter — set reminder",
			f"{loan} && doc.loan_covers_funds == 'No'",
		),
		yn("has_collateral_security", "Collateral Security?", loan),
		f(
			"collateral_details",
			"Small Text",
			"Collateral Security Details",
			depends_on=f"{loan} && doc.has_collateral_security == 'Yes'",
		),
		note(
			"collateral_no_ok",
			"✓ OK",
			f"{loan} && doc.has_collateral_security == 'No'",
			"Status",
		),
		f("loan_letter", "Attach", "Loan Letter Upload", depends_on=loan),
		# Parent docs AFTER student sections
		f("section_birth", "Section Break", "Parent Documents", depends_on=parent),
		yn("birth_cert_available", "Student Birth Certificate Available?", parent),
		f(
			"birth_cert_language",
			"Select",
			"Birth Certificate Language",
			options="\nHindi\nEnglish\nOther",
			depends_on=parent_yes,
		),
		note(
			"birth_cert_translate_note",
			"→ Translate to English and set reminder",
			f"{parent_yes} && (doc.birth_cert_language == 'Hindi' || doc.birth_cert_language == 'Other')",
		),
		note(
			"birth_cert_english_ok",
			"✓ OK — Upload birth certificate",
			f"{parent_yes} && doc.birth_cert_language == 'English'",
			"Status",
		),
		f("birth_cert_upload", "Attach", "Upload Birth Certificate", depends_on=parent_yes),
		note(
			"parents_affidavit_note",
			"→ Need Parents Support Affidavit — set reminder and upload",
			parent_no,
		),
		f(
			"parents_support_affidavit",
			"Attach",
			"Upload Parents Support Affidavit",
			depends_on=parent_no,
		),
	]

	out = {
		"actions": [],
		"creation": "2026-07-23 20:30:00.000000",
		"doctype": "DocType",
		"editable_grid": 0,
		"engine": "InnoDB",
		"field_order": [df["fieldname"] for df in fields],
		"fields": fields,
		"istable": 1,
		"modified": "2026-08-01 12:00:00.000000",
		"modified_by": "Administrator",
		"module": "CRM",
		"name": "Application UK Sponsor",
		"owner": "Administrator",
		"permissions": [],
		"sort_field": "modified",
		"sort_order": "DESC",
		"track_changes": 1,
	}
	names = [df["fieldname"] for df in fields]
	dups = sorted({n for n in names if names.count(n) > 1})
	if dups:
		raise SystemExit(f"Sponsor dups: {dups}")
	SPONSOR_JSON.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
	print(f"Sponsor rebuilt fields={len(fields)}")


if __name__ == "__main__":
	fix_uk_interview_depends()
	rebuild_sponsor()
