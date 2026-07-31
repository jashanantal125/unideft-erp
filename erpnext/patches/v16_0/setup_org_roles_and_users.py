"""Create org-hierarchy roles, sample users, sample Team (Admission Group) and test applications."""

import frappe


NEW_ROLES = [
    "CRO Head",
    "CRO",
    "Country Head",
    "Admission 1",
    "Admission 2",
    "Marketing Head",
    "Marketing Member",
    "Telecalling Head",
    "Telecalling Member",
]

SAMPLE_USERS = [
    {"email": "cro.head@unideft.com", "first_name": "Ravi", "last_name": "CRO Head", "roles": ["CRO Head"]},
    {"email": "country.head.au@unideft.com", "first_name": "Priya", "last_name": "Country Head", "roles": ["Country Head"]},
    {"email": "cro.mumbai@unideft.com", "first_name": "Amit", "last_name": "CRO Mumbai", "roles": ["CRO"]},
    {"email": "admission1.au@unideft.com", "first_name": "Neha", "last_name": "Admission 1", "roles": ["Admission 1"]},
    {"email": "admission2.au@unideft.com", "first_name": "Sanjay", "last_name": "Admission 2", "roles": ["Admission 2"]},
    {"email": "marketing.head@unideft.com", "first_name": "Kavita", "last_name": "Marketing Head", "roles": ["Marketing Head"]},
    {"email": "marketing.member@unideft.com", "first_name": "Rohit", "last_name": "Marketing", "roles": ["Marketing Member"]},
    {"email": "telecalling.head@unideft.com", "first_name": "Anita", "last_name": "Telecalling Head", "roles": ["Telecalling Head"]},
    {"email": "telecalling.member@unideft.com", "first_name": "Vikram", "last_name": "Telecaller", "roles": ["Telecalling Member"]},
    {"email": "agent.b2b@unideft.com", "first_name": "Suresh", "last_name": "B2B Agent", "roles": ["Agent", "B2B Agent"]},
]


def execute():
    _create_roles()
    _create_users()
    _create_agent()
    _create_team()
    frappe.db.commit()


def _create_roles():
    for role_name in NEW_ROLES:
        if not frappe.db.exists("Role", role_name):
            frappe.get_doc({"doctype": "Role", "role_name": role_name, "desk_access": 1}).insert(ignore_permissions=True)


def _create_users():
    for u in SAMPLE_USERS:
        if frappe.db.exists("User", u["email"]):
            continue
        user = frappe.get_doc({
            "doctype": "User",
            "email": u["email"],
            "first_name": u["first_name"],
            "last_name": u["last_name"],
            "enabled": 1,
            "new_password": "unideft@123",
            "send_welcome_email": 0,
            "user_type": "System User",
        })
        for role_name in u["roles"]:
            user.append("roles", {"role": role_name})
        user.insert(ignore_permissions=True)


def _create_agent():
    """Create Agent record for the B2B sample user, linked to CRO Head."""
    if frappe.db.exists("Agent", {"email": "agent.b2b@unideft.com"}):
        return
    agent = frappe.get_doc({
        "doctype": "Agent",
        "company_name": "Demo B2B Agency",
        "user": "agent.b2b@unideft.com",
        "cro_head": "cro.head@unideft.com",
        "no_of_employees": 5,
        "country": "India",
        "state": "Maharashtra",
        "city": "Mumbai",
        "address": "Demo Address, Mumbai",
        "contact_person": "Suresh B2B Agent",
        "designation": "Owner",
        "email": "agent.b2b@unideft.com",
        "country_code": "+91",
        "mobile": "9876543210",
        "first_name": "Suresh",
        "last_name": "B2B Agent",
        "status": "Onboarding Completed!",
    })
    agent.insert(ignore_permissions=True)


def _create_team():
    """Create 'Australia Group 1' admission group with all role links."""
    team_name = "Australia Group 1"
    if frappe.db.exists("Team", team_name):
        return

    agent_name = frappe.db.get_value("Agent", {"email": "agent.b2b@unideft.com"}, "name")

    team = frappe.get_doc({
        "doctype": "Team",
        "team_name": team_name,
        "team_type": "B2B",
        "team_leader": "cro.mumbai@unideft.com",
        "country": "Australia",
        "admission_1": "admission1.au@unideft.com",
        "admission_2": "admission2.au@unideft.com",
        "country_head": "country.head.au@unideft.com",
        "cro": "cro.mumbai@unideft.com",
        "territories": [{"country": "Australia"}],
    })
    team.insert(ignore_permissions=True)

    if agent_name:
        frappe.db.set_value("Agent", agent_name, "sales_team", team_name)
