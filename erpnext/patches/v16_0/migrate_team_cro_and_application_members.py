import frappe


def execute():
	"""Move the single CRO / Admission 1 / Admission 2 fields on Team into the
	multi-user CRO and Application Team tables."""
	frappe.reload_doc("crm", "doctype", "team_member")
	frappe.reload_doc("crm", "doctype", "team")

	for name in frappe.get_all("Team", pluck="name"):
		team = frappe.get_doc("Team", name)
		changed = False

		existing_cros = {r.user for r in team.cro_members}
		if team.cro and team.cro not in existing_cros:
			team.append("cro_members", {"user": team.cro})
			changed = True

		existing_members = {r.user for r in team.application_team_members}
		for user in (team.admission_1, team.admission_2):
			if user and user not in existing_members:
				team.append("application_team_members", {"user": user})
				existing_members.add(user)
				changed = True

		if changed:
			team.flags.ignore_mandatory = True
			team.save(ignore_permissions=True)
