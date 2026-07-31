# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from frappe.model.document import Document
from frappe.utils import add_months, getdate, today


class ApplicationEnglishTest(Document):
	def validate(self):
		self.update_validity_from_result_date()

	def update_validity_from_result_date(self):
<<<<<<< HEAD
		"""IELTS / PTE / TOEFL: Valid for 24 months from result date."""
		if self.test_type not in ("IELTS", "PTE", "TOEFL"):
=======
		"""Standard / UKVI tests: valid for 24 months from result date."""
		if self.test_type not in ("IELTS", "UKVI IELTS", "PTE", "UKVI PTE", "TOEFL", "Duolingo"):
			self.validity_months = None
>>>>>>> jashans-updates
			return

		self.validity_months = 24

		if not self.exam_date:
			self.validity_until = None
			self.validity_status = ""
			self.validity = 0
			return

		expiry = add_months(getdate(self.exam_date), 24)
		self.validity_until = expiry

		if getdate(today()) <= getdate(expiry):
			self.validity_status = "Valid"
			self.validity = 1
		else:
			self.validity_status = "Not Valid"
			self.validity = 0
