# Copyright (c) 2025, Unideft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Course(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		application_fee: DF.Currency
		campus: DF.Data | None
		course_code: DF.Data | None
		course_name: DF.Data
		currency: DF.Link | None
		degree_level: DF.Data | None
		description: DF.TextEditor | None
		discipline: DF.Data | None
		duolingo_score: DF.Float
		duration: DF.Int
		duration_type: DF.Literal["Months", "Days"]
		entry_requirements: DF.TextEditor | None
		ielts_score: DF.Float
		intake_2: DF.Data | None
		intake_3: DF.Data | None
		intake_months: DF.Data | None
		is_full_time: DF.Check
		is_shortlisted: DF.Check
		minimum_requirement: DF.Data | None
		naming_series: DF.Literal["COURSE-.YYYY.-"]
		program_link: DF.Data | None
		pte_score: DF.Float
		select_oghe: DF.Literal["On Campus", "Online", "Flexible"]
		toefl_score: DF.Float
		tuition_fee: DF.Currency
		university: DF.Link | None
	# end: auto-generated types

	pass


MONTHS = (
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
)


def _normalise_intake(value):
	"""Map a stored intake string onto a month name.

	The three intake fields are free-text Data, so they hold anything from
	"January" to "Jan 2026" to "Feb/March". Application.intake is a Select of
	month names, so an intake only makes it into the dropdown if a month can be
	recognised in it; anything unrecognisable is dropped rather than offered as
	an option that would fail Select validation on save.
	"""
	if not value:
		return []

	text = str(value).lower()
	return [month for month in MONTHS if month.lower()[:3] in text]


@frappe.whitelist()
def get_course_intakes(course=None, university=None):
	"""Intake months offered, for narrowing the Intake dropdown.

	Falls back to the union across a university's courses when only the
	university is known, so the dropdown is still scoped rather than showing all
	twelve months.
	"""
	rows = []
	if course:
		row = frappe.db.get_value(
			"Course", course, ["intake_months", "intake_2", "intake_3"], as_dict=True
		)
		if row:
			rows = [row]
	elif university:
		rows = frappe.get_all(
			"Course",
			filters={"university": university},
			fields=["intake_months", "intake_2", "intake_3"],
		)

	found = set()
	for row in rows:
		for field in ("intake_months", "intake_2", "intake_3"):
			found.update(_normalise_intake(row.get(field)))

	return [month for month in MONTHS if month in found]
