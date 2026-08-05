# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from frappe.model.document import Document
from frappe.utils import add_months, cint, getdate, today

# Default validity (months) by test type. Waiver / MOI have no score validity period.
VALIDITY_DEFAULT_MONTHS = {
	"IELTS": 24,
	"UKVI IELTS": 24,
	"PTE": 24,
	"UKVI PTE": 24,
	"TOEFL": 24,
	"Duolingo": 24,
}


class ApplicationEnglishTest(Document):
	def validate(self):
		self.update_validity_from_result_date()

	def update_validity_from_result_date(self):
		"""Score tests: validity months (editable, default by type) from result date."""
		if self.test_type not in VALIDITY_DEFAULT_MONTHS:
			self.validity_months = None
			self.validity_until = None
			self.validity_status = ""
			self.validity = 0
			return

		if not self.validity_months:
			self.validity_months = VALIDITY_DEFAULT_MONTHS[self.test_type]

		months = cint(self.validity_months) or VALIDITY_DEFAULT_MONTHS[self.test_type]

		if not self.exam_date:
			self.validity_until = None
			self.validity_status = ""
			self.validity = 0
			return

		expiry = add_months(getdate(self.exam_date), months)
		self.validity_until = expiry

		if getdate(today()) <= getdate(expiry):
			self.validity_status = "Valid"
			self.validity = 1
		else:
			self.validity_status = "Not Valid"
			self.validity = 0
