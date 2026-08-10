"""Migrate legacy Vendor Admission Contact.country → countries text (multi-country)."""

import frappe


def execute():
	if not frappe.db.exists("DocType", "Vendor Admission Contact"):
		return

	columns = frappe.db.get_table_columns("Vendor Admission Contact")
	if "country" not in columns:
		return
	if "countries" not in columns:
		return

	for name in (
		"Canada",
		"Australia",
		"United Kingdom",
		"New Zealand",
		"Ireland",
		"United States",
	):
		if not frappe.db.exists("Country", name):
			try:
				frappe.get_doc({"doctype": "Country", "country_name": name}).insert(ignore_permissions=True)
			except Exception:
				pass

	rows = frappe.db.sql(
		"""
		select name, country, countries
		from `tabVendor Admission Contact`
		where ifnull(country, '') != ''
		""",
		as_dict=True,
	)

	for row in rows:
		existing = (row.countries or "").strip()
		if existing:
			# Merge legacy country into list if missing
			parts = [p.strip() for p in existing.replace("\n", ",").split(",") if p.strip()]
			if row.country not in parts:
				parts.append(row.country)
			frappe.db.set_value(
				"Vendor Admission Contact",
				row.name,
				"countries",
				", ".join(parts),
				update_modified=False,
			)
		else:
			frappe.db.set_value(
				"Vendor Admission Contact",
				row.name,
				"countries",
				row.country,
				update_modified=False,
			)

	frappe.db.commit()
