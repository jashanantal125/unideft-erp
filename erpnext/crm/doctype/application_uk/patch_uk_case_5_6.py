#!/usr/bin/env python3
"""Patch Application UK for Case 5 & 6 (Post-graduation): research gate + PG docs."""

from __future__ import annotations

import json
from pathlib import Path

JSON_PATH = Path(__file__).with_name("application_uk.json")

# Allow Processing (email → applications) once research path says go-ahead on single/UK track.
PG_PROC = (
	"doc.higher_education != 'Post-graduation' "
	"|| doc.eligible_for_research_program == 'Yes' "
	"|| (doc.eligible_for_research_program == 'No' && doc.wants_process_single_basis == 'Yes')"
)
HE_GRAD_OR_PG = "doc.higher_education == 'Graduation' || doc.higher_education == 'Post-graduation'"
HE_PG = "doc.higher_education == 'Post-graduation'"
HE_ANY_SCHOOL = (
	"doc.higher_education == '12th pass' "
	"|| doc.higher_education == 'Graduation' "
	"|| doc.higher_education == 'Post-graduation'"
)


def _dep(expr: str) -> str:
	expr = (expr or "").strip()
	if expr.startswith("eval:"):
		return expr
	return f"eval:{expr}"


def f(
	fieldname,
	fieldtype,
	label=None,
	*,
	options=None,
	depends_on=None,
	default=None,
	read_only=None,
	description=None,
	hidden=None,
	bold=None,
	collapsible=None,
):
	out = {"fieldname": fieldname, "fieldtype": fieldtype}
	if label is not None:
		out["label"] = label
	if options is not None:
		out["options"] = options
	if depends_on is not None:
		out["depends_on"] = _dep(depends_on)
	if default is not None:
		out["default"] = default
	if read_only is not None:
		out["read_only"] = read_only
	if description is not None:
		out["description"] = description
	if hidden is not None:
		out["hidden"] = hidden
	if bold is not None:
		out["bold"] = bold
	if collapsible is not None:
		out["collapsible"] = collapsible
	return out


def index_of(fields, fieldname):
	for i, row in enumerate(fields):
		if row.get("fieldname") == fieldname:
			return i
	raise KeyError(fieldname)


def upsert_fields(fields, after_fieldname, new_fields):
	"""Insert new fields after anchor; replace if fieldname already exists (preserve position)."""
	by_name = {row.get("fieldname"): i for i, row in enumerate(fields) if row.get("fieldname")}
	to_insert = []
	for nf in new_fields:
		fn = nf["fieldname"]
		if fn in by_name:
			fields[by_name[fn]] = nf
		else:
			to_insert.append(nf)
	if not to_insert:
		return
	idx = index_of(fields, after_fieldname) + 1
	for offset, nf in enumerate(to_insert):
		fields.insert(idx + offset, nf)


def set_depends(fields, fieldname, depends_on, **extra):
	i = index_of(fields, fieldname)
	fields[i]["depends_on"] = _dep(depends_on)
	for k, v in extra.items():
		if v is None:
			fields[i].pop(k, None)
		else:
			fields[i][k] = v


def rebuild_field_order(doc):
	order = []
	for row in doc["fields"]:
		fn = row.get("fieldname")
		if fn:
			order.append(fn)
	doc["field_order"] = order


def research_fields():
	return [
		f(
			"section_research_eligibility",
			"Section Break",
			"Research Program Eligibility (Case 5 & 6)",
			depends_on=HE_PG,
			description="Post-graduation only. Continue UK Processing only if eligible for research, or student agrees single-basis processing.",
		),
		f(
			"eligible_for_research_program",
			"Select",
			"Eligible for Research Program?",
			options="\nYes\nNo",
			depends_on=HE_PG,
		),
		f(
			"research_eligible_go_ahead_note",
			"HTML",
			"Status",
			depends_on=f"{HE_PG} && doc.eligible_for_research_program == 'Yes'",
			options='<p class="text-muted"><b>→ Go Ahead</b> — continue Processing below.</p>',
		),
		f(
			"wants_process_single_basis",
			"Select",
			"Student wants to Process on Single Basis?",
			options="\nYes\nNo",
			depends_on=f"{HE_PG} && doc.eligible_for_research_program == 'No'",
		),
		f(
			"single_basis_go_ahead_note",
			"HTML",
			"Status",
			depends_on=(
				f"{HE_PG} && doc.eligible_for_research_program == 'No' "
				"&& doc.wants_process_single_basis == 'Yes'"
			),
			options='<p class="text-muted"><b>→ Go Ahead</b> — process on single basis (not spouse basis).</p>',
		),
		f(
			"wants_process_another_country",
			"Select",
			"Student wants to process another Country?",
			options="\nYes\nNo",
			depends_on=(
				f"{HE_PG} && doc.eligible_for_research_program == 'No' "
				"&& doc.wants_process_single_basis == 'No'"
			),
		),
		f(
			"alternate_process_country",
			"Small Text",
			"Country to Process",
			depends_on=(
				f"{HE_PG} && doc.eligible_for_research_program == 'No' "
				"&& doc.wants_process_single_basis == 'No' "
				"&& doc.wants_process_another_country == 'Yes'"
			),
		),
		f(
			"another_country_go_ahead_note",
			"HTML",
			"Status",
			depends_on=(
				f"{HE_PG} && doc.eligible_for_research_program == 'No' "
				"&& doc.wants_process_single_basis == 'No' "
				"&& doc.wants_process_another_country == 'Yes'"
			),
			options=(
				'<p class="text-muted"><b>→ Go Ahead</b> — process that country separately '
				"(UK Processing steps stay hidden on this form).</p>"
			),
		),
		f(
			"research_close_reason",
			"Text",
			"Reason (close case)",
			depends_on=(
				f"{HE_PG} && doc.eligible_for_research_program == 'No' "
				"&& doc.wants_process_single_basis == 'No' "
				"&& doc.wants_process_another_country == 'No'"
			),
		),
		f(
			"research_close_case_note",
			"HTML",
			"Status",
			depends_on=(
				f"{HE_PG} && doc.eligible_for_research_program == 'No' "
				"&& doc.wants_process_single_basis == 'No' "
				"&& doc.wants_process_another_country == 'No'"
			),
			options='<p class="text-muted"><b>⚠ Close this case</b> — capture reason above.</p>',
		),
	]


def pg_document_fields():
	return [
		f(
			"section_b_pg_documents",
			"Section Break",
			"Documents 10th to Post Graduation",
			depends_on=f"{HE_PG} && ({PG_PROC})",
			description="Upload academic docs (10th through Post Graduation). DigiLocker / school domain are in the section below.",
		),
		f(
			"documents_10th_to_pg",
			"Table",
			"Documents (10th to Post Graduation)",
			options="Application Documents 10th To 12th",
			depends_on=f"{HE_PG} && ({PG_PROC})",
		),
		f(
			"pg_documents_verified",
			"Select",
			"Document Verified",
			options="\nYes\nStill Processing\nNot Accepted",
			depends_on=f"{HE_PG} && ({PG_PROC})",
		),
		f(
			"pg_documents_verified_pdf",
			"Attach",
			"Upload in One PDF",
			depends_on=f"{HE_PG} && ({PG_PROC}) && doc.pg_documents_verified == 'Yes'",
		),
		f(
			"pg_documents_not_accepted_alert",
			"Text",
			"Status",
			default="⚠ NOT ACCEPTED — Documents need to be verified / accepted",
			depends_on=f"{HE_PG} && ({PG_PROC}) && doc.pg_documents_verified == 'Not Accepted'",
			read_only=1,
			bold=1,
		),
		f(
			"pg_documents_still_processing_reason",
			"Small Text",
			"Still Processing — Reason / Details",
			depends_on=f"{HE_PG} && ({PG_PROC}) && doc.pg_documents_verified == 'Still Processing'",
		),
	]


def patch():
	doc = json.loads(JSON_PATH.read_text())
	fields = doc["fields"]

	upsert_fields(fields, "information_tab", research_fields())
	upsert_fields(fields, "documents_still_processing_reason", pg_document_fields())

	# Gate shared Processing sections for PG until research / single-basis go-ahead
	for section in (
		"section_a_email",
		"section_c_english_test",
		"section_d_passport",
		"section_e_lor",
		"section_e_processing_agent",
		"section_f_applications",
	):
		set_depends(fields, section, PG_PROC)

	# Bachelor university flow — Graduation + Post-graduation (after research clear for PG)
	bach_base = f"({HE_GRAD_OR_PG}) && ({PG_PROC})"
	set_depends(fields, "section_b_bachelor_documents", bach_base, label="Bachelor")
	set_depends(fields, "bachelor_university_name", bach_base)
	set_depends(fields, "bachelor_university_accepted", bach_base)
	set_depends(
		fields,
		"bachelor_documents_verified",
		f"{bach_base} && doc.bachelor_university_accepted == 'Yes'",
	)
	set_depends(
		fields,
		"bachelor_documents_pdf",
		f"{bach_base} && doc.bachelor_university_accepted == 'Yes' && doc.bachelor_documents_verified == 'Yes'",
		label="Upload Documents (One PDF)",
	)
	set_depends(
		fields,
		"bachelor_documents_not_verified_note",
		f"{bach_base} && doc.bachelor_university_accepted == 'Yes' && doc.bachelor_documents_verified == 'No'",
	)
	set_depends(
		fields,
		"bachelor_other_uk_uni_accepted",
		f"{bach_base} && doc.bachelor_university_accepted == 'No'",
	)
	set_depends(
		fields,
		"bachelor_other_uk_uni_yes_note",
		f"{bach_base} && doc.bachelor_university_accepted == 'No' && doc.bachelor_other_uk_uni_accepted == 'Yes'",
	)
	set_depends(
		fields,
		"bachelor_close_reason",
		f"{bach_base} && doc.bachelor_university_accepted == 'No' && doc.bachelor_other_uk_uni_accepted == 'No'",
	)
	set_depends(
		fields,
		"bachelor_close_case_note",
		f"{bach_base} && doc.bachelor_university_accepted == 'No' && doc.bachelor_other_uk_uni_accepted == 'No'",
	)

	# DigiLocker / school domain for 12th, Graduation, Post-graduation
	school_dep = f"({HE_ANY_SCHOOL}) && ({PG_PROC})"
	set_depends(
		fields,
		"section_b_school_alt",
		school_dep,
		description="Optional credentials for school domain / DigiLocker verification (Cases 1–6).",
	)
	for fn in (
		"school_domain_email",
		"school_digi_locker_id",
		"school_digi_locker_password",
	):
		set_depends(fields, fn, school_dep)

	# Experience LOR for Graduation + Post-graduation
	exp_dep = f"({HE_GRAD_OR_PG}) && ({PG_PROC})"
	set_depends(fields, "section_e_experience_lor", exp_dep)
	set_depends(
		fields,
		"experience_lor_list",
		exp_dep,
		description="Add Experience LOR rows (LOR1 / LOR2) — Cases 3–6",
	)

	# Study gap proof already depends on study_gap; also respect PG research gate
	set_depends(
		fields,
		"section_d_study_gap_proof",
		f"doc.study_gap == 'Yes' && ({PG_PROC})",
	)
	set_depends(
		fields,
		"study_gap_proof_list",
		f"doc.study_gap == 'Yes' && ({PG_PROC})",
	)

	rebuild_field_order(doc)
	JSON_PATH.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n")
	print(f"Patched {JSON_PATH}")
	print(f"  fields={len(doc['fields'])} field_order={len(doc['field_order'])}")


if __name__ == "__main__":
	patch()
