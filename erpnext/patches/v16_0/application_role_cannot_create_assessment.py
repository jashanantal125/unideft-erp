import frappe


def execute():
	"""Agents raise Assessment Requests; the Application Team only responds."""
	for name in frappe.get_all(
		"Custom DocPerm", filters={"parent": "Assessment Request", "role": "Application"}, pluck="name"
	):
		frappe.db.set_value("Custom DocPerm", name, "create", 0)
	frappe.clear_cache(doctype="Assessment Request")
