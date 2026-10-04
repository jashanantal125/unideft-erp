# Copyright (c) 2026, Unideft and contributors
# For license information, please see license.txt

"""The four business roles of the assessment / application platform.

- Agent: B2B partner agents who add students and raise requests.
- CRO: monitors assessments and applications between agents and the
  country's Application Team.
- CRO Manager: manages CROs; sees the work of the agents assigned to them
  (Agent.cro_head).
- Application: Application Team members who shortlist courses and universities.
- Visa Admin: admin over all of the above; approves edit requests on
  Assessment Requests and Applications.
"""

AGENT = "Agent"
CRO = "CRO"
CRO_MANAGER = "CRO Manager"
APPLICATION = "Application"

VISA_ADMIN = "Visa Admin"

ADMIN_ROLES = ("System Manager", "Administrator", "CRM Admin", VISA_ADMIN)
CRO_ROLES = (CRO, CRO_MANAGER)

# Who approves edit requests on Assessment Requests and Applications.
EDIT_APPROVER_ROLES = (VISA_ADMIN, "System Manager", "Administrator")


def is_edit_approver(user=None):
	import frappe

	user = user or frappe.session.user
	return user == "Administrator" or bool(set(frappe.get_roles(user)) & set(EDIT_APPROVER_ROLES))


def edit_approver_users():
	"""Visa Admins get the requests; System Managers only if there is no Visa Admin."""
	import frappe

	def with_role(role):
		users = frappe.get_all("Has Role", filters={"role": role, "parenttype": "User"}, pluck="parent")
		return [u for u in users if u not in ("Administrator", "Guest") and frappe.db.get_value("User", u, "enabled")]

	return with_role(VISA_ADMIN) or with_role("System Manager")
