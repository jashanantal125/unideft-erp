import frappe

# Old role -> new role (None = dropped without replacement)
ROLE_MAP = {
	"B2B Agent": "Agent",
	"B2C Agent": "Agent",
	"agents": "Agent",
	"CRO Head": "CRO Manager",
	"Admission 1": "Application",
	"Admission 2": "Application",
	"Country Head": None,
	"Team Lead": None,
	"Team Executive": None,
}
NEW_ROLES = ("Agent", "CRO", "CRO Manager", "Application")
PERM_FLAGS = (
	"read", "write", "create", "delete", "submit", "cancel", "amend", "report", "export",
	"import", "share", "print", "email", "select",
)


def execute():
	"""Collapse the business roles to Agent / CRO / CRO Manager / Application.

	Users, Custom DocPerms, Workspace / Page / Report / Role Profile roles and
	Workflow rows move to the new roles, then the old Role records are deleted.
	"""
	for role in NEW_ROLES:
		if not frappe.db.exists("Role", role):
			frappe.get_doc({"doctype": "Role", "role_name": role, "desk_access": 1}).insert(
				ignore_permissions=True
			)

	old = tuple(ROLE_MAP)
	migrate_has_role(old)
	migrate_custom_docperms(old)
	migrate_workflows(old)
	ensure_role_profiles()

	for role in old:
		if frappe.db.exists("Role", role):
			frappe.delete_doc("Role", role, force=True, ignore_permissions=True)

	frappe.clear_cache()


def migrate_has_role(old):
	"""Users, Role Profiles, Workspaces, Pages and Reports all hold roles in Has Role."""
	rows = frappe.db.sql(
		"SELECT name, parent, parenttype, parentfield, role FROM `tabHas Role` WHERE role IN %s",
		(old,),
		as_dict=True,
	)
	for row in rows:
		new = ROLE_MAP[row.role]
		frappe.db.delete("Has Role", {"name": row.name})
		if not new:
			continue
		if frappe.db.exists(
			"Has Role", {"parent": row.parent, "parenttype": row.parenttype, "role": new}
		):
			continue
		frappe.get_doc(
			{
				"doctype": "Has Role",
				"name": frappe.generate_hash(length=10),
				"parent": row.parent,
				"parenttype": row.parenttype,
				"parentfield": row.parentfield or "roles",
				"role": new,
			}
		).db_insert()

	# The legacy "agents" profile becomes the "Agent" profile.
	if frappe.db.exists("Role Profile", "agents"):
		frappe.db.set_value("User", {"role_profile_name": "agents"}, "role_profile_name", None)
		frappe.delete_doc("Role Profile", "agents", force=True, ignore_permissions=True)

	for user in {r.parent for r in rows if r.parenttype == "User"}:
		frappe.clear_cache(user=user)


def migrate_custom_docperms(old):
	rows = frappe.get_all(
		"Custom DocPerm", filters={"role": ["in", old]}, fields=["name", "parent", "role", "permlevel", "if_owner"] + list(PERM_FLAGS)
	)
	for row in rows:
		new = ROLE_MAP[row.role]
		if new:
			existing = frappe.db.get_value(
				"Custom DocPerm",
				{"parent": row.parent, "role": new, "permlevel": row.permlevel, "if_owner": row.if_owner},
				"name",
			)
			if existing:
				# Merge: the new role keeps every right any of the old roles had.
				updates = {f: 1 for f in PERM_FLAGS if row.get(f)}
				if updates:
					frappe.db.set_value("Custom DocPerm", existing, updates)
				frappe.db.delete("Custom DocPerm", {"name": row.name})
			else:
				frappe.db.set_value("Custom DocPerm", row.name, "role", new)
		else:
			frappe.db.delete("Custom DocPerm", {"name": row.name})

	for doctype in {r.parent for r in rows}:
		frappe.clear_cache(doctype=doctype)


def migrate_workflows(old):
	for table, field in (("Workflow Transition", "allowed"), ("Workflow Document State", "allow_edit")):
		for row in frappe.get_all(table, filters={field: ["in", old]}, fields=["name", field]):
			new = ROLE_MAP[row[field]] or "System Manager"
			frappe.db.set_value(table, row.name, field, new)


def ensure_role_profiles():
	for role in NEW_ROLES:
		if frappe.db.exists("Role Profile", role):
			continue
		frappe.get_doc(
			{"doctype": "Role Profile", "role_profile": role, "roles": [{"role": role}]}
		).insert(ignore_permissions=True)
