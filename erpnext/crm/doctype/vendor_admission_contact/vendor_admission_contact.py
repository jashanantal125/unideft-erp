# Copyright (c) 2026, Unideft and contributors
from frappe.model.document import Document
import frappe


class VendorAdmissionContact(Document):
	def validate(self):
		self.normalize_countries()

	def normalize_countries(self):
		"""Store countries as comma-separated unique names."""
		raw = (self.countries or "").replace("\n", ",").replace(";", ",")
		parts = [p.strip() for p in raw.split(",") if p.strip()]
		# Prefer legacy country if countries empty
		if not parts and self.country:
			parts = [self.country]
		# Deduplicate preserve order
		seen = set()
		unique = []
		for p in parts:
			key = p.lower()
			if key in seen:
				continue
			seen.add(key)
			unique.append(p)
		self.countries = ", ".join(unique)
