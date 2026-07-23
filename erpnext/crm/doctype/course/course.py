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
