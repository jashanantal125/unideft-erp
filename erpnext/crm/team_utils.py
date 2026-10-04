# Copyright (c) 2026, Unideft and contributors
# For license information, please see license.txt

"""Who belongs to which country Team.

A Team is one per destination country and carries any number of CROs
(`cro_members`) and Application Team members (`application_team_members`).
The single legacy fields (`cro`, `admission_1`, `admission_2`) are kept in
sync from those tables by Team.validate, but every lookup goes through here so
nothing depends on a team having at most one CRO or two admission users.
"""

import frappe

CRO_TABLE = "cro_members"
APPLICATION_TEAM_TABLE = "application_team_members"


def _members(team, parentfield):
	return frappe.get_all(
		"Team Member",
		filters={"parenttype": "Team", "parent": team, "parentfield": parentfield},
		order_by="priority asc, idx asc",
		pluck="user",
	)


def get_team_cros(team):
	return [u for u in _members(team, CRO_TABLE) if u]


def get_team_application_members(team):
	return [u for u in _members(team, APPLICATION_TEAM_TABLE) if u]


def get_team_users(team):
	"""Everyone who works requests routed to this team: CROs + Application Team."""
	if not team:
		return []
	users = get_team_cros(team) + get_team_application_members(team)
	return list(dict.fromkeys(u for u in users if frappe.db.get_value("User", u, "enabled")))


def get_teams_for_user(user, kind):
	"""Teams the user belongs to as `kind` - "cro" or "application"."""
	parentfield = CRO_TABLE if kind == "cro" else APPLICATION_TEAM_TABLE
	return frappe.get_all(
		"Team Member",
		filters={"parenttype": "Team", "parentfield": parentfield, "user": user},
		pluck="parent",
		distinct=True,
	)


def get_all_teams_for_user(user):
	"""Every team the user works in, in any capacity."""
	return sorted(set(get_teams_for_user(user, "cro")) | set(get_teams_for_user(user, "application")))


def get_team_for_country(country):
	"""The Team handling `country` - one team per destination country."""
	if not country:
		return None
	team = frappe.db.get_value("Team", {"country": country}, "name", order_by="creation asc")
	if team:
		return team
	rows = frappe.db.sql(
		"""
		SELECT t.name FROM `tabTeam` t
		INNER JOIN `tabTeam Territory` tt ON tt.parent = t.name AND tt.parenttype = 'Team'
		WHERE tt.country = %s
		ORDER BY t.creation ASC
		LIMIT 1
		""",
		(country,),
	)
	return rows[0][0] if rows else None
