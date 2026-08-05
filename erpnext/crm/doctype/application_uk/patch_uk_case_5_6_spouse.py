#!/usr/bin/env python3
"""Patch Application UK Case 5 & 6 (per Case 7&8 PDF): spouse funds, dual sponsors, CAS/Visa splits."""

from __future__ import annotations

import json
from pathlib import Path

JSON_PATH = Path(__file__).with_name("application_uk.json")

# Married and not forced to single-basis (research gate / Cases 1&3 still use single_basis_only)
SPOUSE = "doc.martial_status == 'Married' && !doc.single_basis_only"
OUR = "doc.cas_letter_received == 'Yes' && doc.who_lodges_visa == 'Our Team'"
VISA_OK = "doc.visa_decision == 'Visa Approved'"
OUR_VISA = f"{VISA_OK} && doc.who_lodges_visa == 'Our Team'"
DEFER = (
	"doc.defer_offer_required == 'Yes' && "
	"(doc.defer_offer_received == 'Yes' || doc.applied_for_defer_offer_letter == 'Yes')"
)


def _dep(expr: str) -> str:
	expr = (expr or "").strip()
	return expr if expr.startswith("eval:") else f"eval:{expr}"


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
	bold=None,
	length=None,
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
	if bold is not None:
		out["bold"] = bold
	if length is not None:
		out["length"] = length
	return out


def index_of(fields, fieldname):
	for i, row in enumerate(fields):
		if row.get("fieldname") == fieldname:
			return i
	raise KeyError(fieldname)


def upsert_after(fields, after_fieldname, new_fields):
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


def patch_field(fields, fieldname, **kwargs):
	i = index_of(fields, fieldname)
	for k, v in kwargs.items():
		if v is None:
			fields[i].pop(k, None)
		elif k == "depends_on":
			fields[i][k] = _dep(v)
		else:
			fields[i][k] = v


def rebuild_field_order(doc):
	doc["field_order"] = [r["fieldname"] for r in doc["fields"] if r.get("fieldname")]


def patch():
	doc = json.loads(JSON_PATH.read_text())
	fields = doc["fields"]

	# --- Offer: Funds Required for Spouse = Living Expenses ---
	upsert_after(
		fields,
		"funds_required_amount",
		[
			f(
				"funds_required_for_spouse",
				"Currency",
				"Funds Required for Spouse",
				options="offer_currency",
				depends_on=SPOUSE,
				read_only=1,
				description="Living Expenses (GBP) — Case 5 when married / spouse track",
			),
		],
	)
	upsert_after(
		fields,
		"defer_funds_required_amount",
		[
			f(
				"defer_funds_required_for_spouse",
				"Currency",
				"Funds Required for Spouse",
				options="defer_offer_currency",
				depends_on=f"({DEFER}) && ({SPOUSE})",
				read_only=1,
				description="Living Expenses (GBP)",
			),
		],
	)

	# --- Financial: one sponsors table (Applicant / Spouse via child sponsor_for) ---
	patch_field(
		fields,
		"uk_sponsors",
		label="Who Sponsored (Applicant / Spouse)",
		description=(
			"Add one row per sponsor. Set For = Applicant or Spouse, then Sponsor = Student / Father / Mother."
		),
	)
	# remove legacy split table if present
	fields[:] = [row for row in fields if row.get("fieldname") != "uk_spouse_sponsors"]

	# --- CAS: Marriage Certificate ---
	upsert_after(
		fields,
		"cas_letter_for_visa_upload",
		[
			f(
				"marriage_certificate_upload",
				"Attach",
				"Marriage Certificate",
				depends_on=f"({OUR}) && ({SPOUSE})",
			),
		],
	)

	# --- Embassy: Applicant + Spouse ---
	patch_field(
		fields,
		"embassy_login_section",
		label="Embassy Login — Main Applicant",
		description="Separate embassy login for main applicant (and spouse below when applicable).",
	)
	upsert_after(
		fields,
		"embassy_login_password",
		[
			f(
				"spouse_embassy_login_section",
				"Section Break",
				"Embassy Login — Spouse",
				depends_on=f"({OUR}) && ({SPOUSE})",
			),
			f(
				"spouse_embassy_login_link",
				"Small Text",
				"Link",
				depends_on=f"({OUR}) && ({SPOUSE})",
			),
			f(
				"spouse_embassy_login_id",
				"Small Text",
				"Login Id",
				depends_on=f"({OUR}) && ({SPOUSE})",
			),
			f(
				"spouse_embassy_login_password",
				"Password",
				"Password",
				depends_on=f"({OUR}) && ({SPOUSE})",
			),
		],
	)

	# --- Visa: eVisa track for Spouse ---
	patch_field(fields, "evisa_activated", label="Main Applicant — Have you activated e-Visa?")
	patch_field(fields, "share_code_received", label="Main Applicant — Have you received share code?")
	patch_field(
		fields,
		"share_code_verified",
		label="Main Applicant — Have you verified e-Visa with share code?",
	)
	patch_field(fields, "visa_copy_upload", label="Main Applicant — Upload Visa Copy")

	upsert_after(
		fields,
		"agent_student_upload_visa_note",
		[
			f(
				"spouse_visa_section",
				"Section Break",
				"Visa — Spouse",
				depends_on=f"({VISA_OK}) && ({SPOUSE})",
				bold=1,
			),
			f(
				"spouse_evisa_activated",
				"Select",
				"Spouse — Have you activated e-Visa?",
				options="\nYes\nNo",
				depends_on=f"({OUR_VISA}) && ({SPOUSE})",
				length=64,
			),
			f(
				"spouse_evisa_activated_no_note",
				"Small Text",
				"Note",
				depends_on=f"({OUR_VISA}) && ({SPOUSE}) && doc.spouse_evisa_activated == 'No'",
				default="→ Set reminder to activate spouse e-Visa",
				read_only=1,
				bold=1,
			),
			f(
				"spouse_share_code_received",
				"Select",
				"Spouse — Have you received share code?",
				options="\nYes\nNo",
				depends_on=f"({OUR_VISA}) && ({SPOUSE}) && doc.spouse_evisa_activated == 'Yes'",
				length=64,
			),
			f(
				"spouse_share_code_received_no_note",
				"Small Text",
				"Note",
				depends_on=(
					f"({OUR_VISA}) && ({SPOUSE}) && doc.spouse_evisa_activated == 'Yes' "
					"&& doc.spouse_share_code_received == 'No'"
				),
				default="→ Set reminder to receive spouse share code",
				read_only=1,
				bold=1,
			),
			f(
				"spouse_share_code_verified",
				"Select",
				"Spouse — Have you verified e-Visa with share code?",
				options="\nYes\nNo",
				depends_on=(
					f"({OUR_VISA}) && ({SPOUSE}) && doc.spouse_evisa_activated == 'Yes' "
					"&& doc.spouse_share_code_received == 'Yes'"
				),
				length=64,
			),
			f(
				"spouse_share_code_verified_no_note",
				"Small Text",
				"Note",
				depends_on=(
					f"({OUR_VISA}) && ({SPOUSE}) && doc.spouse_evisa_activated == 'Yes' "
					"&& doc.spouse_share_code_received == 'Yes' && doc.spouse_share_code_verified == 'No'"
				),
				default="→ Set reminder to verify spouse e-Visa",
				read_only=1,
				bold=1,
			),
			f(
				"spouse_visa_copy_upload",
				"Attach",
				"Spouse — Upload Visa Copy",
				depends_on=(
					f"({VISA_OK}) && ({SPOUSE}) && (("
					f"doc.who_lodges_visa == 'Our Team' && doc.spouse_evisa_activated == 'Yes' "
					"&& doc.spouse_share_code_received == 'Yes' && doc.spouse_share_code_verified == 'Yes') "
					"|| doc.who_lodges_visa == 'Agent' || doc.who_lodges_visa == 'Student')"
				),
			),
		],
	)

	# Experience LOR description
	patch_field(
		fields,
		"experience_lor_list",
		description="Add Experience LOR rows (LOR1 / LOR2) — Cases 3–6 (Graduation & Post-graduation)",
	)

	rebuild_field_order(doc)
	JSON_PATH.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n")
	print(f"Patched {JSON_PATH} fields={len(doc['fields'])}")


if __name__ == "__main__":
	patch()
