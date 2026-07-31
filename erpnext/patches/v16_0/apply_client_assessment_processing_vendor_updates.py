"""Seed GHA vendor companies, Offer Letter Conditions, and University read perms."""

import frappe
from frappe.permissions import add_permission, update_permission_property


GHA_VENDORS = [
	{
		"name1": "Ganpati House of Achievers",
		"short_name": "GHA",
		"country": "India",
	},
	{
		"name1": "GHA Education Private Limited",
		"short_name": "GHA Edu",
		"country": "India",
	},
	{
		"name1": "Ganpati Flights & Stay",
		"short_name": "GFS",
		"country": "India",
	},
	{
		"name1": "Ganpati Corporate Solution",
		"short_name": "GCS",
		"country": "India",
	},
	{
		"name1": "Unideft Education Services Pvt. Ltd.",
		"short_name": "Unideft",
		"country": "India",
	},
]

OFFER_CONDITIONS = [
	"Interview",
	"English Requirement",
	"Verification",
	"Gap Justification",
	"Other",
]

READ_ROLES = [
	"System Manager",
	"CRM Admin",
	"Agent",
	"B2B Agent",
	"B2C Agent",
	"CRO",
	"CRO Head",
	"Country Head",
	"Admission 1",
	"Admission 2",
	"Team Lead",
	"Team Executive",
	"Marketing Head",
	"Marketing Member",
	"Telecalling Head",
	"Telecalling Member",
]


def execute():
	_ensure_country("India")
	_seed_vendors()
	_seed_offer_conditions()
	_grant_link_read_permissions()
	frappe.db.commit()


def _ensure_country(name):
	if not frappe.db.exists("Country", name):
		frappe.get_doc({"doctype": "Country", "country_name": name}).insert(ignore_permissions=True)


def _seed_vendors():
	for v in GHA_VENDORS:
		if frappe.db.exists("vendor", v["name1"]):
			continue
		doc = frappe.get_doc(
			{
				"doctype": "vendor",
				"name1": v["name1"],
				"short_name": v["short_name"],
				"country": v["country"],
			}
		)
		doc.insert(ignore_permissions=True)


def _seed_offer_conditions():
	for name in OFFER_CONDITIONS:
		if frappe.db.exists("Offer Letter Condition", name):
			continue
		frappe.get_doc(
			{"doctype": "Offer Letter Condition", "condition_name": name}
		).insert(ignore_permissions=True)


def _grant_link_read_permissions():
	"""Ensure roles can select University / Student / Course in Link fields."""
	for dt in ("University", "Student", "Course", "vendor"):
		for role in READ_ROLES:
			try:
				add_permission(dt, role, 0)
				update_permission_property(dt, role, 0, "read", 1)
				update_permission_property(dt, role, 0, "select", 1)
			except Exception:
				pass
