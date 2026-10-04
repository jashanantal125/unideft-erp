import frappe

VISA_ADMIN = "Visa Admin"
SOURCE_ROLES = ("Agent", "CRO", "CRO Manager", "Application")
PERM_FLAGS = (
	"read", "write", "create", "delete", "submit", "cancel", "amend",
	"report", "export", "import", "share", "print", "email", "select",
)


def execute():
	"""Visa Admin: admin over Agent, CRO, CRO Manager and Application - it gets
	the union of their access wherever that lives in the database (Custom
	DocPerms, workspace / page roles, workflow transitions). Permissions defined
	in DocType JSON are granted in the JSON itself."""
	merge_custom_docperms()
	copy_has_role()
	extend_workflow_transitions()

	if not frappe.db.exists("Role Profile", VISA_ADMIN):
		frappe.get_doc(
			{"doctype": "Role Profile", "role_profile": VISA_ADMIN, "roles": [{"role": VISA_ADMIN}]}
		).insert(ignore_permissions=True)

	frappe.clear_cache()


def merge_custom_docperms():
	columns = set(frappe.db.get_table_columns("Custom DocPerm"))
	flags = [f for f in PERM_FLAGS if f in columns]
	rows = frappe.get_all(
		"Custom DocPerm",
		filters={"role": ["in", SOURCE_ROLES]},
		fields=["parent", "permlevel", *flags],
	)
	merged = {}
	for row in rows:
		target = merged.setdefault((row.parent, row.permlevel or 0), {f: 0 for f in flags})
		for f in flags:
			if row.get(f):
				target[f] = 1

	for (doctype, permlevel), values in merged.items():
		existing = frappe.db.get_value(
			"Custom DocPerm", {"parent": doctype, "role": VISA_ADMIN, "permlevel": permlevel}, "name"
		)
		if existing:
			frappe.db.set_value("Custom DocPerm", existing, {f: 1 for f, v in values.items() if v})
		else:
			frappe.get_doc(
				{
					"doctype": "Custom DocPerm",
					"parent": doctype,
					"parenttype": "DocType",
					"parentfield": "permissions",
					"role": VISA_ADMIN,
					"permlevel": permlevel,
					"if_owner": 0,
					**values,
				}
			).insert(ignore_permissions=True)
		frappe.clear_cache(doctype=doctype)


def copy_has_role():
	"""Workspaces, Pages and Reports the four roles can open."""
	for row in frappe.get_all(
		"Has Role",
		filters={"role": ["in", SOURCE_ROLES], "parenttype": ["in", ["Workspace", "Page", "Report"]]},
		fields=["parent", "parenttype", "parentfield"],
		distinct=True,
	):
		if frappe.db.exists("Has Role", {"parent": row.parent, "parenttype": row.parenttype, "role": VISA_ADMIN}):
			continue
		frappe.get_doc(
			{
				"doctype": "Has Role",
				"name": frappe.generate_hash(length=10),
				"parent": row.parent,
				"parenttype": row.parenttype,
				"parentfield": row.parentfield or "roles",
				"role": VISA_ADMIN,
			}
		).db_insert()


def extend_workflow_transitions():
	"""Every action any of the four roles may take, Visa Admin may take too."""
	for name in frappe.get_all("Workflow", pluck="name"):
		wf = frappe.get_doc("Workflow", name)
		have = {(t.state, t.action, t.next_state) for t in wf.transitions if t.allowed == VISA_ADMIN}
		added = False
		for t in list(wf.transitions):
			key = (t.state, t.action, t.next_state)
			if t.allowed in SOURCE_ROLES and key not in have:
				wf.append(
					"transitions",
					{
						"state": t.state,
						"action": t.action,
						"next_state": t.next_state,
						"allowed": VISA_ADMIN,
						"allow_self_approval": 1,
						"condition": t.condition,
					},
				)
				have.add(key)
				added = True
		if added:
			wf.flags.ignore_permissions = True
			wf.save()
