# Copyright (c) 2026, Unideft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ProcessingAgentDetails(Document):
	def validate(self):
		self.sync_agent_name()

	def sync_agent_name(self):
		"""Keep Processing Agent Name populated for grid visibility."""
		if self.processing_agent_type == "Direct":
			self.processing_agent_direct = "Unideft"
			self.processing_agent_vendor = None
		elif self.processing_agent_type == "Vendor":
			self.processing_agent_direct = self.processing_agent_vendor or ""
		else:
			self.processing_agent_direct = self.processing_agent_direct or ""
