# Copyright (c) 2026, Unideft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


DEFAULT_DIRECT_COMPANY = "Unideft Education Services Pvt. Ltd."


class ProcessingAgentDetails(Document):
	def validate(self):
		self.sync_processing_agent_name()

	def sync_processing_agent_name(self):
		if self.processing_agent_type == "Direct":
			if not self.our_company and frappe.db.exists("Our Company", DEFAULT_DIRECT_COMPANY):
				self.our_company = DEFAULT_DIRECT_COMPANY
			self.processing_agent_vendor = None
			self.processing_agent_direct = self.our_company or ""
		elif self.processing_agent_type == "Vendor":
			self.our_company = None
			self.processing_agent_direct = self.processing_agent_vendor or ""
		else:
			self.processing_agent_direct = self.processing_agent_direct or ""
