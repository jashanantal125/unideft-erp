# Copyright (c) 2025, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Agent(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		address: DF.SmallText
		city: DF.Data
		comments: DF.SmallText | None
		company_name: DF.Data
		contact_person: DF.Data
		country: DF.Link
		country_code: DF.Data
		designation: DF.Literal["", "Owner", "Manager", "Director", "Representative", "Other"]
		email: DF.Data
		first_name: DF.Data
		last_name: DF.Data
		mobile: DF.Data
		naming_series: DF.Literal["AGT-.YYYY.-"]
		no_of_employees: DF.Int
		sales_team: DF.Link | None
		state: DF.Data
		status: DF.Literal["Email Sent", "Welcome Call Done", "Signed Up", "CRM Assigned", "Onboarding Completed!"]
		user: DF.Link | None
	# end: auto-generated types

	def after_insert(self):
		"""Automatically create a Customer for this Agent with matching details.

		- Customer Name = Agent company_name
		- Customer Type = Company
		- Basic contact details (email, mobile, address, country, state, city)
		"""

		# Avoid duplicate customers with the same name
		if frappe.db.exists("Customer", {"customer_name": self.company_name}):
			return

		# Get sensible defaults
		customer_group = frappe.db.get_default("Customer Group") or "All Customer Groups"
		territory = frappe.db.get_default("Territory") or "All Territories"

		customer = frappe.new_doc("Customer")
		customer.customer_name = self.company_name
		customer.customer_group = customer_group
		customer.territory = territory
		customer.customer_type = "Company"

		# Set contact details if available
		customer.email_id = self.email
		customer.mobile_no = self.mobile

		# Optional: basic address fields on the customer record
		customer.country = self.country
		customer.state = self.state
		customer.city = self.city
		customer.address_line1 = (self.address or "").split("\n")[0] if self.address else None

		# Insert without requiring extra permissions
		customer.flags.ignore_permissions = True
		customer.insert()