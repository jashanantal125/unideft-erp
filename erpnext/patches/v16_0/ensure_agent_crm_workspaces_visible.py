"""Ensure CRM left-nav workspaces are public and allowed for Agent roles."""

import frappe

AGENT_ROLES = (
	"Administrator",
	"System Manager",
	"CRM Admin",
	"CRM Sales Staff",
	"Team Lead",
	"Team Executive",
	"Agent",
	"agents",
	"B2B Agent",
	"B2C Agent",
)

# Keep open (no role restriction) so any desk agent with module access can see them
OPEN_WORKSPACES = ("Applications", "Assessment Requests")

# Role-gated but must include Agent / B2B Agent / B2C Agent / agents
ROLE_WORKSPACES = ("Students", "Commission")


def _set_roles(doc, roles):
	doc.roles = []
	for role in roles:
		if frappe.db.exists("Role", role):
			doc.append("roles", {"role": role})


def execute():
	for name in OPEN_WORKSPACES + ROLE_WORKSPACES:
		if not frappe.db.exists("Workspace", name):
			continue

		doc = frappe.get_doc("Workspace", name)
		doc.public = 1
		doc.is_hidden = 0
		doc.flags.ignore_permissions = True
		doc.flags.ignore_links = True
		doc.flags.ignore_validate = True

		if name in OPEN_WORKSPACES:
			doc.roles = []
		else:
			_set_roles(doc, AGENT_ROLES)

		doc.save()

	# Prefer explicit visibility so Workspace Settings never hide these
	if frappe.db.exists("DocType", "Workspace Settings"):
		import json

		try:
			vis = json.loads(
				frappe.db.get_single_value("Workspace Settings", "workspace_visibility_json") or "{}"
			)
		except Exception:
			vis = {}
		for name in OPEN_WORKSPACES + ROLE_WORKSPACES + ("CRM",):
			vis[name] = 1
		frappe.db.set_single_value(
			"Workspace Settings", "workspace_visibility_json", json.dumps(vis)
		)

	frappe.clear_cache()
