"""Move Unideft/GHA own companies out of Vendor into Our Company DocType."""

import frappe

OWN_COMPANIES = [
	{
		"company_name": "Ganpati House of Achievers",
		"short_name": "GHA",
		"country": "India",
	},
	{
		"company_name": "GHA Education Private Limited",
		"short_name": "GHA Edu",
		"country": "India",
	},
	{
		"company_name": "Ganpati Flights & Stay",
		"short_name": "GFS",
		"country": "India",
	},
	{
		"company_name": "Ganpati Corporate Solution",
		"short_name": "GCS",
		"country": "India",
	},
	{
		"company_name": "Unideft Education Services Pvt. Ltd.",
		"short_name": "Unideft",
		"country": "India",
	},
]


def execute():
	if not frappe.db.exists("DocType", "Our Company"):
		return

	if not frappe.db.exists("Country", "India"):
		frappe.get_doc({"doctype": "Country", "country_name": "India"}).insert(ignore_permissions=True)

	for row in OWN_COMPANIES:
		_upsert_our_company(row)
		_remove_from_vendors(row["company_name"])

	frappe.db.commit()


def _upsert_our_company(row):
	name = row["company_name"]
	if frappe.db.exists("Our Company", name):
		return

	# Copy contact / address from Vendor if it exists
	vendor = frappe.db.get_value(
		"vendor",
		{"name1": name},
		["address", "city", "state", "country", "first_name", "last_name", "email", "phone_number"],
		as_dict=True,
	) or {}

	doc = frappe.get_doc(
		{
			"doctype": "Our Company",
			"company_name": name,
			"short_name": row.get("short_name"),
			"country": vendor.get("country") or row.get("country") or "India",
			"address": vendor.get("address"),
			"city": vendor.get("city"),
			"state": vendor.get("state"),
			"first_name": vendor.get("first_name"),
			"last_name": vendor.get("last_name"),
			"email": vendor.get("email"),
			"phone_number": vendor.get("phone_number"),
		}
	)
	doc.insert(ignore_permissions=True)


def _remove_from_vendors(company_name):
	vendor_name = frappe.db.get_value("vendor", {"name1": company_name}, "name")
	if not vendor_name:
		return

	# Clear Processing Agent / Need Assessment links pointing at this vendor
	if frappe.db.has_table("tabProcessing Agent Details"):
		frappe.db.sql(
			"update `tabProcessing Agent Details` set processing_agent_vendor=null where processing_agent_vendor=%s",
			vendor_name,
		)
	if frappe.db.has_table("tabNeed Assessment Vendor"):
		frappe.db.sql(
			"update `tabNeed Assessment Vendor` set vendor=null where vendor=%s",
			vendor_name,
		)

	frappe.delete_doc("vendor", vendor_name, ignore_permissions=True, force=True)
