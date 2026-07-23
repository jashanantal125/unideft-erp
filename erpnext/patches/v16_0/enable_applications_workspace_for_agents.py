import frappe

AGENT_ROLES = ("Agent", "B2B Agent", "B2C Agent", "agents")
APPLICATION_PAGES = ("applications-view", "applications_view")


def execute():
	_ensure_applications_workspace()
	_add_agent_roles_to_application_pages()


def _ensure_applications_workspace():
	if frappe.db.exists("Workspace", "Applications"):
		frappe.db.set_value(
			"Workspace",
			"Applications",
			{
				"type": "Link",
				"link_type": "DocType",
				"link_to": "Application",
				"module": "CRM",
				"public": 1,
				"is_hidden": 0,
				"icon": "file-text",
				"sequence_id": 18,
			},
			update_modified=False,
		)
		return

	doc = frappe.get_doc(
		{
			"doctype": "Workspace",
			"name": "Applications",
			"label": "Applications",
			"title": "Applications",
			"module": "CRM",
			"app": "erpnext",
			"public": 1,
			"is_hidden": 0,
			"icon": "file-text",
			"sequence_id": 18,
			"type": "Link",
			"link_type": "DocType",
			"link_to": "Application",
			"content": "[]",
		}
	)
	doc.insert(ignore_permissions=True)


def _add_agent_roles_to_application_pages():
	for page_name in APPLICATION_PAGES:
		if not frappe.db.exists("Page", page_name):
			continue

		page = frappe.get_doc("Page", page_name)
		existing_roles = {row.role for row in page.roles}

		changed = False
		for role in AGENT_ROLES:
			if role not in existing_roles:
				page.append("roles", {"role": role})
				changed = True

		if changed:
			page.save(ignore_permissions=True)
