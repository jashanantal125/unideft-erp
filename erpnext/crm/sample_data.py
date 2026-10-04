# Copyright (c) 2026, Unideft and contributors
# For license information, please see license.txt

"""Sample Australia team for trying out assessments and applications.

Run (safe to re-run - it updates rather than duplicates):
    bench --site uni.com execute erpnext.crm.sample_data.create_australia_sample_team

Creates 2 Agents, 1 CRO and 3 Application Team members (and, via
create_visa_admin, a Visa Admin), makes the CRO and
Application users the members of the Australia Team, and links both agents to
that team and to the existing CRO Manager. Logins use the same demo password
as the other seeded users (see patches/v16_0/setup_org_roles_and_users.py).
"""

import frappe

DEMO_PASSWORD = "unideft@123"
COUNTRY = "Australia"
CRO_MANAGER = "cro.head@unideft.com"

AGENTS = [
	{
		"email": "agent1.au@unideft.com",
		"first_name": "Arjun",
		"last_name": "Sharma",
		"company_name": "Sydney Study Links",
		"city": "Pune",
		"state": "Maharashtra",
		"mobile": "9800000001",
	},
	{
		"email": "agent2.au@unideft.com",
		"first_name": "Priya",
		"last_name": "Nair",
		"company_name": "Melbourne Edu Partners",
		"city": "Kochi",
		"state": "Kerala",
		"mobile": "9800000002",
	},
]
CROS = [{"email": "cro1.au@unideft.com", "first_name": "Rohit", "last_name": "Verma"}]
VISA_ADMINS = [{"email": "visa.admin@unideft.com", "first_name": "Visa", "last_name": "Admin"}]
APPLICATION_TEAM = [
	{"email": "app1.au@unideft.com", "first_name": "Kavya", "last_name": "Rao"},
	{"email": "app2.au@unideft.com", "first_name": "Vikram", "last_name": "Singh"},
	{"email": "app3.au@unideft.com", "first_name": "Meera", "last_name": "Iyer"},
]


def _ensure_user(row, role):
	if frappe.db.exists("User", row["email"]):
		user = frappe.get_doc("User", row["email"])
	else:
		user = frappe.get_doc(
			{
				"doctype": "User",
				"email": row["email"],
				"first_name": row["first_name"],
				"last_name": row["last_name"],
				"enabled": 1,
				"send_welcome_email": 0,
				"user_type": "System User",
				"new_password": DEMO_PASSWORD,
			}
		)
	# The role profile is the single source of the user's business role.
	user.role_profile_name = None
	user.set("role_profiles", [{"role_profile": role}])
	user.set("roles", [{"role": role}])
	user.flags.ignore_permissions = True
	user.save() if not user.is_new() else user.insert()
	return user.name


def _ensure_team():
	team_name = frappe.db.get_value("Team", {"country": COUNTRY}, "name")
	team = frappe.get_doc("Team", team_name) if team_name else frappe.new_doc("Team")
	if not team_name:
		team.team_name = f"{COUNTRY} Team"
		team.country = COUNTRY
		team.team_type = "B2B"
	if not any(t.country == COUNTRY for t in team.territories):
		team.append("territories", {"country": COUNTRY})
	return team


def _ensure_agent(row, team):
	values = {
		"company_name": row["company_name"],
		"user": row["email"],
		"sales_team": team,
		"cro_head": CRO_MANAGER if frappe.db.exists("User", CRO_MANAGER) else None,
		"no_of_employees": 5,
		"country": "India",
		"state": row["state"],
		"city": row["city"],
		"address": f"{row['company_name']}, {row['city']}",
		"contact_person": f"{row['first_name']} {row['last_name']}",
		"designation": "Owner",
		"email": row["email"],
		"country_code": "+91",
		"mobile": row["mobile"],
		"first_name": row["first_name"],
		"last_name": row["last_name"],
		"status": "Onboarding Completed!",
	}
	name = frappe.db.get_value("Agent", {"user": row["email"]}, "name")
	agent = frappe.get_doc("Agent", name) if name else frappe.new_doc("Agent")
	agent.update(values)
	agent.flags.ignore_permissions = True
	agent.save() if name else agent.insert()
	return agent.name


def create_australia_sample_team():
	agents = [_ensure_user(r, "Agent") for r in AGENTS]
	cros = [_ensure_user(r, "CRO") for r in CROS]
	members = [_ensure_user(r, "Application") for r in APPLICATION_TEAM]

	team = _ensure_team()
	team.set("cro_members", [{"user": u, "priority": i} for i, u in enumerate(cros)])
	team.set("application_team_members", [{"user": u, "priority": i} for i, u in enumerate(members)])
	team.flags.ignore_permissions = True
	team.save() if not team.is_new() else team.insert()

	agent_records = [_ensure_agent(r, team.name) for r in AGENTS]
	frappe.db.commit()

	return {
		"team": team.name,
		"cros": cros,
		"application_team": members,
		"agents": dict(zip(agents, agent_records)),
	}


def create_visa_admin():
	"""Visa Admin user - approves edit requests on assessments and applications.

	Run: bench --site uni.com execute erpnext.crm.sample_data.create_visa_admin
	"""
	users = [_ensure_user(r, "Visa Admin") for r in VISA_ADMINS]
	frappe.db.commit()
	return users
