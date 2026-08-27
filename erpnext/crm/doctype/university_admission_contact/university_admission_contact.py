# Copyright (c) 2026, Unideft and contributors
from frappe.model.document import Document


class UniversityAdmissionContact(Document):
	def validate(self):
		self.normalize_countries()

	def normalize_countries(self):
		raw = (self.countries or "").replace("\n", ",").replace(";", ",")
		parts = [p.strip() for p in raw.split(",") if p.strip()]
		seen = set()
		unique = []
		for part in parts:
			key = part.lower()
			if key in seen:
				continue
			seen.add(key)
			unique.append(part)
		self.countries = ", ".join(unique)
