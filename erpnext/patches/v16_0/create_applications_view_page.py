import frappe

def execute():
	"""Create applications-view page if it doesn't exist"""
	if not frappe.db.exists("Page", "applications-view"):
		doc = frappe.get_doc({
			"doctype": "Page",
			"page_name": "applications-view",
			"title": "Applications View",
			"module": "CRM",
			"standard": "Yes",
			"roles": [
				{"role": "System Manager"},
				{"role": "Sales User"},
				{"role": "Sales Manager"},
				{"role": "Team Lead"},
				{"role": "Team Executive"},
				{"role": "Agent"},
				{"role": "B2B Agent"},
				{"role": "B2C Agent"},
				{"role": "agents"},
			]
		})
		doc.insert(ignore_permissions=True)
		frappe.db.commit()
		print("Page 'applications-view' created successfully.")
	else:
		print("Page 'applications-view' already exists.")
