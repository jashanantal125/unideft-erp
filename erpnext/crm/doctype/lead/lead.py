# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt

import frappe
from frappe import _
from frappe.contacts.address_and_contact import (
	delete_contact_and_address,
	load_address_and_contact,
)
from frappe.contacts.doctype.address.address import get_default_address
from frappe.contacts.doctype.contact.contact import get_default_contact
from frappe.desk.form.assign_to import add as assign_to_user
from frappe.email.inbox import link_communication_to_document
from frappe.model.mapper import get_mapped_doc
from frappe.utils import comma_and, get_link_to_form, has_gravatar, validate_email_address

from erpnext.accounts.party import set_taxes
from erpnext.controllers.selling_controller import SellingController
from erpnext.crm.utils import CRMNote, copy_comments, link_communications, link_open_events
from erpnext.selling.doctype.customer.customer import parse_full_name


class Lead(SellingController, CRMNote):
	@staticmethod
	def get_list_query(query):
		"""Filter leads based on user role:
		- Agents: Only leads they created
		- Sales Manager/Sales User: Only leads shared with them or where they are owner/lead_owner
		"""
		user_roles = frappe.get_roles()
		Lead = frappe.qb.DocType("Lead")
		
		if "agents" in user_roles or "Agent" in user_roles:
			# Agents can only see leads they created
			query = query.where(Lead.owner == frappe.session.user)
		elif "Sales Manager" in user_roles or "Sales User" in user_roles:
			# Check if user is a team leader
			# Team leaders can see ALL leads from their team's sales partners
			teams_led_by_user = frappe.get_all(
				"Team",
				filters={"team_leader": frappe.session.user},
				pluck="name"
			)
			
			if teams_led_by_user:
				# User is a team leader - get all sales partners for their teams
				sales_partners_for_teams = frappe.get_all(
					"Sales Partner",
					filters={"sales_team": ("in", teams_led_by_user)},
					pluck="name"
				)
				
				if sales_partners_for_teams:
					# Team leader can see all leads from their team's sales partners
					# Also include leads they own, are lead_owner of, or are assigned to
					assigned_leads = frappe.get_all(
						"ToDo",
						filters={
							"reference_type": "Lead",
							"allocated_to": frappe.session.user,
							"status": ("!=", "Cancelled")
						},
						pluck="reference_name"
					)
					
					# Build query: owner = user OR lead_owner = user OR assigned to user OR sales_partner in team's partners
					base_condition = (
						(Lead.owner == frappe.session.user) |
						(Lead.lead_owner == frappe.session.user) |
						(Lead.sales_partner.isin(sales_partners_for_teams))
					)
					if assigned_leads:
						query = query.where(
							base_condition | (Lead.name.isin(assigned_leads))
						)
					else:
						query = query.where(base_condition)
				else:
					# Team leader but no sales partners assigned - show only owned/assigned leads
					assigned_leads = frappe.get_all(
						"ToDo",
						filters={
							"reference_type": "Lead",
							"allocated_to": frappe.session.user,
							"status": ("!=", "Cancelled")
						},
						pluck="reference_name"
					)
					
					if assigned_leads:
						query = query.where(
							(Lead.owner == frappe.session.user) |
							(Lead.lead_owner == frappe.session.user) |
							(Lead.name.isin(assigned_leads))
						)
					else:
						query = query.where(
							(Lead.owner == frappe.session.user) |
							(Lead.lead_owner == frappe.session.user)
						)
			else:
				# User is NOT a team leader - only see assigned leads
				# 1. Leads where they are the owner
				# 2. Leads where they are the lead_owner
				# 3. Leads assigned to them (via ToDo)
				
				# Get leads assigned to this user (via ToDo)
				assigned_leads = frappe.get_all(
					"ToDo",
					filters={
						"reference_type": "Lead",
						"allocated_to": frappe.session.user,
						"status": ("!=", "Cancelled")
					},
					pluck="reference_name"
				)
				
				# Build query: owner = user OR lead_owner = user OR assigned to user
				if assigned_leads:
					query = query.where(
						(Lead.owner == frappe.session.user) |
						(Lead.lead_owner == frappe.session.user) |
						(Lead.name.isin(assigned_leads))
					)
				else:
					# If no assigned leads, only show leads where user is owner or lead_owner
					query = query.where(
						(Lead.owner == frappe.session.user) |
						(Lead.lead_owner == frappe.session.user)
					)
		
		return query
	
	def has_permission(self, ptype="read", user=None):
		"""Check if user can access this lead:
		- Agents: Only if they created it
		- Sales Manager/Sales User: Allow read access (role-based permissions apply)
		  List view filtering in get_list_query handles team-based visibility
		- Other roles: Use default permissions
		"""
		if not user:
			user = frappe.session.user
		
		user_roles = frappe.get_roles(user)
		
		# For agents, only allow access if they created the lead
		if "agents" in user_roles or "Agent" in user_roles:
			if self.get("owner") == user:
				return True
			return False
		
		# For Sales Manager/Sales User, allow read access based on team role
		if "Sales Manager" in user_roles or "Sales User" in user_roles:
			# Allow if user is owner
			if self.get("owner") == user:
				return True
			
			# Allow if user is lead_owner
			if self.get("lead_owner") == user:
				return True
			
			# Check if user is a team leader
			sales_partner = self.get("sales_partner")
			if sales_partner:
				# Get the sales partner's team
				sales_team = frappe.db.get_value("Sales Partner", sales_partner, "sales_team")
				if sales_team:
					team_leader = frappe.db.get_value("Team", sales_team, "team_leader")
					if team_leader == user:
						# User is team leader - allow access to all team leads
						return True
			
			# Check if user is assigned to this lead (via ToDo)
			# Team members can only see leads assigned to them
			if frappe.db.exists(
				"ToDo",
				{
					"reference_type": self.doctype,
					"reference_name": self.name,
					"allocated_to": user,
					"status": ("!=", "Cancelled")
				}
			):
				# If assigned but not shared, share it now
				try:
					frappe.share.add(
						self.doctype,
						self.name,
						user=user,
						read=1,
						write=0,
						share=0,
						notify=0,
						flags={"ignore_share_permission": True}
					)
				except Exception:
					# If sharing fails, still allow access since they're assigned
					pass
				return True
			
			# Check if lead is shared with this user (for team leader)
			if frappe.db.exists(
				"DocShare",
				{
					"share_doctype": self.doctype,
					"share_name": self.name,
					"user": user,
					"read": 1
				}
			):
				return True
			
			# For other leads, deny access (team-based restriction)
			# Team members can only see assigned leads, team leaders see all team leads
			return False
		
		# For other roles, use default permissions (System Manager, CRM Admin, etc.)
		return True
	
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		area_of_interest: DF.Data
		birthday: DF.Date | None
		city: DF.Data | None
		comment: DF.SmallText | None
		company: DF.Link | None
		country: DF.Link | None
		country_code: DF.Data
		customer: DF.Link | None
		destination_country: DF.Link | None
		email_id: DF.Data
		first_name: DF.Data | None
		gender: DF.Literal["", "Male", "Female", "Other"]
		highest_education: DF.Data | None
		image: DF.AttachImage | None
		last_name: DF.Data | None
		lead_name: DF.Data | None
		lead_owner: DF.Link | None
		lead_source: DF.Literal["", "Website", "Referral", "Social Media", "Advertisement", "Agent", "Other"]
		mobile_no: DF.Data
		naming_series: DF.Literal["CRM-LEAD-.YYYY.-"]
		sales_partner: DF.Link | None
		state: DF.Data | None
		status: DF.Literal["Lead", "Open", "Replied", "Opportunity", "Quotation", "Lost Quotation", "Interested", "Converted", "Do Not Contact"]
		testscore: DF.Data | None
		title: DF.Data | None
	# end: auto-generated types

	def onload(self):
		customer = frappe.db.get_value("Customer", {"lead_name": self.name})
		self.get("__onload").is_customer = customer
		load_address_and_contact(self)
		self.set_onload("linked_prospects", self.get_linked_prospects())

	def validate(self):
		self.set_full_name()
		self.set_lead_name()
		self.set_title()
		self.set_status()
		self.check_email_id_is_unique()
		self.validate_email_id()
		
		# Auto-set sales_partner if current user is an agent and sales_partner is not set
		if "agents" in frappe.get_roles() or "Agent" in frappe.get_roles():
			if not self.get("sales_partner") and self.is_new():
				# Find Sales Partner linked to current user
				sales_partner = frappe.db.get_value("Sales Partner", {"user": frappe.session.user}, "name")
				if sales_partner:
					self.set("sales_partner", sales_partner)
		
		# Assign lead to team based on Sales Partner
		if self.get("sales_partner"):
			self.assign_to_sales_partner_team()
		
		# Set lead_owner to current user if role is agents (only if no team assignment)
		if "agents" in frappe.get_roles() or "Agent" in frappe.get_roles():
			if not hasattr(self, '_sales_partner_team_assigned') or not self._sales_partner_team_assigned:
				if not self.lead_owner or self.is_new():
					self.lead_owner = frappe.session.user

	def set_territory_from_country(self):
		"""Auto-set territory based on country field"""
		country = self.get("country")
		if not country:
			return
		
		# Try to find territory with same name as country
		territory = frappe.db.get_value("Territory", {"territory_name": country})
		
		if not territory:
			# Try to find territory from country name in territory_name (case-insensitive)
			territory = frappe.db.get_value(
				"Territory",
				{"territory_name": ("like", f"%{country}%")},
				order_by="creation desc"
			)
		
		if territory:
			self.set("territory", territory)
		else:
			# If no territory found, use default territory
			default_territory = frappe.db.get_default("Territory") or "All Territories"
			if frappe.db.exists("Territory", default_territory):
				self.set("territory", default_territory)
	
	def assign_to_sales_partner_team(self):
		"""Assign lead to team based on Sales Partner.
		Returns True if assignment was successful, False otherwise."""
		sales_partner = self.get("sales_partner")
		if not sales_partner:
			return False
		
		# Get sales team from Sales Partner
		sales_team = frappe.db.get_value("Sales Partner", sales_partner, "sales_team")
		if not sales_team:
			frappe.log_error(
				f"Sales Partner '{sales_partner}' has no Sales Team assigned. "
				f"Lead: {self.name if not self.is_new() else 'New'}.",
				"Lead Sales Partner Team Assignment - No Team"
			)
			self._sales_partner_team_assigned = False
			return False
		
		# Check if Team exists
		if not frappe.db.exists("Team", sales_team):
			frappe.log_error(
				f"Sales Team '{sales_team}' not found for Sales Partner '{sales_partner}'. "
				f"Lead: {self.name if not self.is_new() else 'New'}.",
				"Lead Sales Partner Team Assignment - Team Not Found"
			)
			self._sales_partner_team_assigned = False
			return False
		
		try:
			team = frappe.get_doc("Team", sales_team)
			
			# Get team leader
			team_leader = team.team_leader if team.team_leader else None
			
			# Collect team members (excluding leader - they'll be handled separately)
			team_members = []
			if team.team_members:
				for member in team.team_members:
					if member.user and member.user != team_leader and member.user not in team_members:
						team_members.append(member.user)
			
			if not team_leader and not team_members:
				frappe.log_error(
					f"Sales Team '{sales_team}' has no team leader or members. "
					f"Lead: {self.name if not self.is_new() else 'New'}.",
					"Lead Sales Partner Team Assignment - No Team Members"
				)
				self._sales_partner_team_assigned = False
				return False
			
			# Store team info for after_insert (to share and assign)
			if not hasattr(self, '_sales_partner_team_info'):
				self._sales_partner_team_info = {}
			self._sales_partner_team_info = {
				'sales_team': sales_team,
				'sales_partner': sales_partner,
				'team_leader': team_leader,
				'team_members': team_members  # Only regular members (not leader)
			}
			
			# Mark as assigned
			self._sales_partner_team_assigned = True
			
			# Show success message for new leads
			if self.is_new():
				frappe.msgprint(
					_("Lead will be assigned to Sales Team '{0}' for Sales Partner '{1}'").format(
						frappe.bold(sales_team), frappe.bold(sales_partner)
					),
					indicator="green",
					alert=True
				)
			
			return True
			
		except Exception as e:
			frappe.log_error(
				f"Error assigning lead to sales partner team: {str(e)}\n"
				f"Sales Partner: {sales_partner}\n"
				f"Sales Team: {sales_team}\n"
				f"Lead: {self.name if not self.is_new() else 'New'}\n"
				f"Traceback: {frappe.get_traceback()}",
				"Lead Sales Partner Team Assignment Error"
			)
			self._sales_partner_team_assigned = False
			return False
	
	def _share_and_assign_to_sales_partner_team(self):
		"""Share lead with team leader (so they see all leads) and assign to team members (so they see assigned leads)"""
		if not hasattr(self, '_sales_partner_team_info') or not self._sales_partner_team_info:
			return
		
		sales_team = self._sales_partner_team_info.get('sales_team')
		sales_partner = self._sales_partner_team_info.get('sales_partner')
		team_leader = self._sales_partner_team_info.get('team_leader')
		team_members = self._sales_partner_team_info.get('team_members', [])
		
		if not team_leader and not team_members:
			return
		
		try:
			# Remove ALL existing shares (except owner) to ensure clean state
			existing_shares = frappe.get_all(
				"DocShare",
				filters={
					"share_doctype": self.doctype,
					"share_name": self.name
				},
				fields=["name", "user"]
			)
			
			# Allowed users: owner, team leader, and assigned team members
			allowed_users = {self.owner}
			if team_leader:
				allowed_users.add(team_leader)
			
			# Remove shares for users not in allowed list
			for share in existing_shares:
				shared_user = share.get("user")
				if shared_user not in allowed_users:
					try:
						frappe.db.delete("DocShare", {"name": share.get("name")})
						frappe.logger().info(
							f"Removed share for user {shared_user} from lead {self.name} "
							f"(not team leader or assigned member)"
						)
					except Exception as e:
						frappe.log_error(
							f"Error removing share for user {shared_user} from lead {self.name}: {str(e)}",
							"Lead Sales Partner Team Share Removal Error"
						)
			
			# Share lead with team leader (so they can see ALL team leads)
			if team_leader and frappe.db.exists("User", team_leader):
				existing_share = frappe.db.get_value(
					"DocShare",
					{
						"share_doctype": self.doctype,
						"share_name": self.name,
						"user": team_leader
					}
				)
				
				if not existing_share:
					try:
						frappe.share.add(
							self.doctype,
							self.name,
							user=team_leader,
							read=1,
							write=0,
							share=0,
							notify=0,
							flags={"ignore_share_permission": True}
						)
						frappe.logger().info(
							f"Shared lead {self.name} with team leader {team_leader} "
							f"for Sales Team {sales_team}"
						)
					except Exception as e:
						frappe.log_error(
							f"Error sharing lead {self.name} with team leader {team_leader}: {str(e)}",
							"Lead Sales Partner Team Share Error"
						)
			
			# Assign lead to team members (creates ToDo - they'll see only assigned leads)
			valid_members = [user for user in team_members if frappe.db.exists("User", user)]
			
			frappe.logger().info(
				f"Lead {self.name}: Team members to assign: {team_members}, Valid members: {valid_members}"
			)
			
			if valid_members:
				try:
					# Share with assigned members (so they can see their assigned leads)
					for assign_user in valid_members:
						existing_share = frappe.db.get_value(
							"DocShare",
							{
								"share_doctype": self.doctype,
								"share_name": self.name,
								"user": assign_user
							}
						)
						
						if not existing_share:
							try:
								frappe.share.add(
									self.doctype,
									self.name,
									user=assign_user,
									read=1,
									write=0,
									share=0,
									notify=0,
									flags={"ignore_share_permission": True}
								)
							except Exception as e:
								frappe.log_error(
									f"Error sharing lead {self.name} with team member {assign_user}: {str(e)}",
									"Lead Sales Partner Team Share Error"
								)
					
					# Assign to team members (creates ToDo)
					# Note: assign_to needs to be a list, the function will handle JSON parsing
					assign_to_user(
						{
							"assign_to": valid_members,
							"doctype": self.doctype,
							"name": self.name,
							"description": _("Lead assigned from Sales Partner '{0}' to Sales Team '{1}'").format(
								sales_partner, sales_team
							),
							"priority": "Medium"
						},
						ignore_permissions=True
					)
					frappe.db.commit()  # Ensure assignment is saved
					frappe.logger().info(
						f"Successfully assigned lead {self.name} to {len(valid_members)} team members "
						f"({', '.join(valid_members)}) for Sales Team {sales_team}"
					)
				except Exception as e:
					frappe.log_error(
						f"Error assigning lead {self.name} to team members: {str(e)}\n"
						f"Team members: {valid_members}\n"
						f"Traceback: {frappe.get_traceback()}",
						"Lead Sales Partner Team Assignment Error"
					)
		
		except Exception as e:
			frappe.log_error(
				f"Error in _share_and_assign_to_sales_partner_team for lead {self.name}: {str(e)}\n"
				f"Traceback: {frappe.get_traceback()}",
				"Lead Sales Partner Team Share and Assign Error"
			)
	
	def before_insert(self):
		self.contact_doc = None
		if frappe.db.get_single_value("CRM Settings", "auto_creation_of_contact"):
			# Check if lead is from existing customer (using get() to safely check removed fields)
			if self.get("customer") and self.customer:
				contact = frappe.db.get_value(
					"Dynamic Link",
					{"link_doctype": "Customer", "parenttype": "Contact", "link_name": self.customer},
					"parent",
				)
				if contact:
					self.contact_doc = frappe.get_doc("Contact", contact)
					return
			self.contact_doc = self.create_contact()

		# leads created by email inbox only have the full name set
		if self.lead_name and not any([self.first_name, self.get("middle_name"), self.last_name]):
			parsed_name = parse_full_name(self.lead_name)
			self.first_name = parsed_name[0]
			if len(parsed_name) > 2:
				self.last_name = parsed_name[2]
			else:
				self.last_name = parsed_name[1] if len(parsed_name) > 1 else ""

	def after_insert(self):
		self.link_to_contact()
		
		# Share and assign lead to sales partner team members
		if hasattr(self, '_sales_partner_team_info') and self._sales_partner_team_info:
			self._share_and_assign_to_sales_partner_team()

	def on_update(self):
		self.update_prospect()

	def on_trash(self):
		frappe.db.set_value("Issue", {"lead": self.name}, "lead", None)
		delete_contact_and_address(self.doctype, self.name)
		self.remove_link_from_prospect()

	def set_full_name(self):
		if self.first_name:
			self.lead_name = " ".join(
				filter(None, [self.get("salutation"), self.first_name, self.get("middle_name"), self.last_name])
			)

	def set_lead_name(self):
		if not self.lead_name:
			# Check for leads being created through data import
			company_name = self.get("company_name")
			if not company_name and not self.email_id and not self.flags.ignore_mandatory:
				frappe.throw(_("A Lead requires either a person's name or an organization's name"))
			elif company_name:
				self.lead_name = company_name
			else:
				self.lead_name = self.email_id.split("@")[0]

	def set_title(self):
		self.title = self.get("company_name") or self.lead_name

	def check_email_id_is_unique(self):
		if self.email_id:
			# validate email is unique
			if not frappe.db.get_single_value("CRM Settings", "allow_lead_duplication_based_on_emails"):
				duplicate_leads = frappe.get_all(
					"Lead", filters={"email_id": self.email_id, "name": ["!=", self.name]}
				)
				duplicate_leads = [
					frappe.bold(get_link_to_form("Lead", lead.name)) for lead in duplicate_leads
				]

				if duplicate_leads:
					frappe.throw(
						_("Email Address must be unique, it is already used in {0}").format(
							comma_and(duplicate_leads)
						),
						frappe.DuplicateEntryError,
					)

	def validate_email_id(self):
		if self.email_id:
			if not self.flags.ignore_email_validation:
				validate_email_address(self.email_id, throw=True)

			if self.email_id == self.lead_owner:
				frappe.throw(_("Lead Owner cannot be same as the Lead Email Address"))

			if self.is_new() or not self.image:
				self.image = has_gravatar(self.email_id)

	def link_to_contact(self):
		# update contact links
		if self.contact_doc:
			self.contact_doc.append(
				"links", {"link_doctype": "Lead", "link_name": self.name, "link_title": self.lead_name}
			)
			self.contact_doc.save()

	def update_prospect(self):
		lead_row_name = frappe.db.get_value("Prospect Lead", filters={"lead": self.name}, fieldname="name")
		if lead_row_name:
			lead_row = frappe.get_doc("Prospect Lead", lead_row_name)
			lead_row.update(
				{
					"lead_name": self.lead_name,
					"email": self.email_id,
					"mobile_no": self.mobile_no,
					"lead_owner": self.lead_owner,
					"status": self.status,
				}
			)
			lead_row.db_update()

	def remove_link_from_prospect(self):
		prospects = self.get_linked_prospects()

		for d in prospects:
			prospect = frappe.get_doc("Prospect", d.parent)
			if len(prospect.get("leads")) == 1:
				prospect.delete(ignore_permissions=True)
			else:
				to_remove = None
				for d in prospect.get("leads"):
					if d.lead == self.name:
						to_remove = d

				if to_remove:
					prospect.remove(to_remove)
					prospect.save(ignore_permissions=True)

	def get_linked_prospects(self):
		return frappe.get_all(
			"Prospect Lead",
			filters={"lead": self.name},
			fields=["parent"],
		)

	def has_customer(self):
		return frappe.db.get_value("Customer", {"lead_name": self.name})

	def has_opportunity(self):
		return frappe.db.get_value("Opportunity", {"party_name": self.name, "status": ["!=", "Lost"]})

	def has_quotation(self):
		return frappe.db.get_value(
			"Quotation", {"party_name": self.name, "docstatus": 1, "status": ["!=", "Lost"]}
		)

	def has_lost_quotation(self):
		return frappe.db.get_value("Quotation", {"party_name": self.name, "docstatus": 1, "status": "Lost"})

	@frappe.whitelist()
	def create_prospect_and_contact(self, data):
		data = frappe._dict(data)
		if data.create_contact:
			self.create_contact()

		if data.create_prospect:
			self.create_prospect(data.prospect_name)

	def create_contact(self):
		if not self.lead_name:
			self.set_full_name()
			self.set_lead_name()

		contact = frappe.new_doc("Contact")
		contact.update(
			{
				"first_name": self.first_name or self.lead_name,
				"last_name": self.last_name,
				"salutation": self.get("salutation"),
				"gender": self.gender,
				"designation": self.get("job_title"),
				"company_name": self.get("company_name"),
			}
		)

		if self.email_id:
			contact.append("email_ids", {"email_id": self.email_id, "is_primary": 1})

		if self.get("phone"):
			contact.append("phone_nos", {"phone": self.get("phone"), "is_primary_phone": 1})

		if self.mobile_no:
			contact.append("phone_nos", {"phone": self.mobile_no, "is_primary_mobile_no": 1})

		contact.insert(ignore_permissions=True)
		contact.reload()  # load changes by hooks on contact

		return contact

	def create_prospect(self, company_name):
		try:
			prospect = frappe.new_doc("Prospect")

			prospect.company_name = company_name or self.get("company_name")
			prospect.no_of_employees = self.get("no_of_employees")
			prospect.industry = self.get("industry")
			prospect.market_segment = self.get("market_segment")
			prospect.annual_revenue = self.get("annual_revenue")
			prospect.territory = self.get("territory")
			prospect.fax = self.get("fax")
			prospect.website = self.get("website")
			prospect.prospect_owner = self.lead_owner
			prospect.company = self.company
			prospect.notes = self.notes

			prospect.append(
				"leads",
				{
					"lead": self.name,
					"lead_name": self.lead_name,
					"email": self.email_id,
					"mobile_no": self.mobile_no,
					"lead_owner": self.lead_owner,
					"status": self.status,
				},
			)
			prospect.flags.ignore_permissions = True
			prospect.flags.ignore_mandatory = True
			prospect.save()
		except frappe.DuplicateEntryError:
			frappe.throw(_("Prospect {0} already exists").format(company_name or self.get("company_name")))


@frappe.whitelist()
def make_customer(source_name, target_doc=None):
	return _make_customer(source_name, target_doc)


def _make_customer(source_name, target_doc=None, ignore_permissions=False):
	def set_missing_values(source, target):
		if source.get("company_name"):
			target.customer_type = "Company"
			target.customer_name = source.get("company_name")
		else:
			target.customer_type = "Individual"
			target.customer_name = source.lead_name

		if not target.customer_group:
			target.customer_group = frappe.db.get_default("Customer Group")

		address = get_default_address("Lead", source.name)
		contact = get_default_contact("Lead", source.name)
		if address:
			target.customer_primary_address = address
		if contact:
			target.customer_primary_contact = contact

	doclist = get_mapped_doc(
		"Lead",
		source_name,
		{
			"Lead": {
				"doctype": "Customer",
				"field_map": {
					"name": "lead_name",
					"company_name": "customer_name",
					"contact_no": "phone_1",
					"fax": "fax_1",
				},
				"field_no_map": ["disabled"],
			}
		},
		target_doc,
		set_missing_values,
		ignore_permissions=ignore_permissions,
	)

	return doclist


@frappe.whitelist()
def make_opportunity(source_name, target_doc=None):
	def set_missing_values(source, target):
		_set_missing_values(source, target)

	target_doc = get_mapped_doc(
		"Lead",
		source_name,
		{
			"Lead": {
				"doctype": "Opportunity",
				"field_map": {
					"doctype": "opportunity_from",
					"name": "party_name",
					"lead_name": "contact_display",
					"company_name": "customer_name",
					"email_id": "contact_email",
					"mobile_no": "contact_mobile",
					"lead_owner": "opportunity_owner",
					"notes": "notes",
				},
			}
		},
		target_doc,
		set_missing_values,
	)

	return target_doc


@frappe.whitelist()
def make_quotation(source_name, target_doc=None):
	def set_missing_values(source, target):
		_set_missing_values(source, target)

	target_doc = get_mapped_doc(
		"Lead",
		source_name,
		{"Lead": {"doctype": "Quotation", "field_map": {"name": "party_name"}}},
		target_doc,
		set_missing_values,
	)

	target_doc.quotation_to = "Lead"
	target_doc.run_method("set_missing_values")
	target_doc.run_method("set_other_charges")
	target_doc.run_method("calculate_taxes_and_totals")

	return target_doc


def _set_missing_values(source, target):
	address = frappe.get_all(
		"Dynamic Link",
		{
			"link_doctype": source.doctype,
			"link_name": source.name,
			"parenttype": "Address",
		},
		["parent"],
		limit=1,
	)

	contact = frappe.get_all(
		"Dynamic Link",
		{
			"link_doctype": source.doctype,
			"link_name": source.name,
			"parenttype": "Contact",
		},
		["parent"],
		limit=1,
	)

	if address:
		target.customer_address = address[0].parent

	if contact:
		target.contact_person = contact[0].parent


@frappe.whitelist()
def get_lead_details(lead, posting_date=None, company=None):
	if not lead:
		return {}

	from erpnext.accounts.party import set_address_details

	out = frappe._dict()

	lead_doc = frappe.get_doc("Lead", lead)
	lead = lead_doc

	out.update(
		{
			"territory": lead.get("territory"),
			"customer_name": lead.get("company_name") or lead.lead_name,
			"contact_display": " ".join(filter(None, [lead.lead_name])),
			"contact_email": lead.email_id,
			"contact_mobile": lead.mobile_no,
			"contact_phone": lead.get("phone"),
		}
	)

	set_address_details(out, lead, "Lead", company=company)

	taxes_and_charges = set_taxes(
		None,
		"Lead",
		posting_date,
		company,
		billing_address=out.get("customer_address"),
		shipping_address=out.get("shipping_address_name"),
	)
	if taxes_and_charges:
		out["taxes_and_charges"] = taxes_and_charges

	return out


@frappe.whitelist()
def make_lead_from_communication(communication, ignore_communication_links=False):
	"""raise a issue from email"""

	doc = frappe.get_doc("Communication", communication)
	lead_name = None
	if doc.sender:
		lead_name = frappe.db.get_value("Lead", {"email_id": doc.sender})
	if not lead_name and doc.phone_no:
		lead_name = frappe.db.get_value("Lead", {"mobile_no": doc.phone_no})
	if not lead_name:
		lead = frappe.get_doc(
			{
				"doctype": "Lead",
				"lead_name": doc.sender_full_name,
				"email_id": doc.sender,
				"mobile_no": doc.phone_no,
			}
		)
		lead.flags.ignore_mandatory = True
		lead.flags.ignore_permissions = True
		lead.insert()

		lead_name = lead.name

	link_communication_to_document(doc, "Lead", lead_name, ignore_communication_links)
	return lead_name


def get_lead_with_phone_number(number):
	if not number:
		return

	# Build filters dynamically to avoid errors if fields don't exist
	filters = {"mobile_no": ["like", f"%{number}"]}
	
	# Only add phone and whatsapp_no filters if columns exist
	meta = frappe.get_meta("Lead")
	if meta.has_field("phone"):
		filters["phone"] = ["like", f"%{number}"]
	if meta.has_field("whatsapp_no"):
		filters["whatsapp_no"] = ["like", f"%{number}"]
	
	leads = frappe.get_all(
		"Lead",
		or_filters=filters,
		limit=1,
		order_by="creation DESC",
	)

	lead = leads[0].name if leads else None

	return lead


@frappe.whitelist()
def add_lead_to_prospect(lead, prospect):
	prospect = frappe.get_doc("Prospect", prospect)
	prospect.append("leads", {"lead": lead})
	prospect.save(ignore_permissions=True)

	carry_forward_communication_and_comments = frappe.db.get_single_value(
		"CRM Settings", "carry_forward_communication_and_comments"
	)

	if carry_forward_communication_and_comments:
		copy_comments("Lead", lead, prospect)
		link_communications("Lead", lead, prospect)
	link_open_events("Lead", lead, prospect)

	frappe.msgprint(
		_("Lead {0} has been added to prospect {1}.").format(frappe.bold(lead), frappe.bold(prospect.name)),
		title=_("Lead -> Prospect"),
		indicator="green",
	)
