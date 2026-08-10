# Copyright (c) 2025, Unideft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import add_days, getdate


class vendor(Document):
	def validate(self):
		self.set_renewal_reminder()
		self.clear_portal_fields_by_availability()
		self.sync_commission_portal_credentials()

	def clear_portal_fields_by_availability(self):
		"""Yes → credentials; No → details only; blank → neither."""
		if self.portal_available != "Yes":
			self.portal_link = None
			self.portal_login_id = None
			self.portal_password = None
		if self.portal_available != "No":
			self.portal_unavailable_details = None

	def set_renewal_reminder(self):
		"""Auto schedule renewal reminder 30 days before contract end."""
		if self.contract_end_date:
			self.renewal_reminder_date = add_days(getdate(self.contract_end_date), -30)
		else:
			self.renewal_reminder_date = None

	def sync_commission_portal_credentials(self):
		"""If Same: reuse Portal Access. If Different: keep separate credentials."""
		if self.commission_info_source != "Portal":
			return
		if self.use_existing_portal_credentials == "Same":
			self.commission_portal_link = self.portal_link
			self.commission_login_id = self.portal_login_id
			pwd = self.portal_password
			if not pwd and self.name and not self.is_new():
				try:
					pwd = self.get_password("portal_password")
				except Exception:
					pwd = None
			if pwd:
				self.commission_password = pwd
		elif self.use_existing_portal_credentials != "Different":
			self.commission_portal_link = None
			self.commission_login_id = None
			self.commission_password = None

	def on_update(self):
		self.ensure_renewal_reminder()

	def after_insert(self):
		self.ensure_renewal_reminder()

	def ensure_renewal_reminder(self):
		if not self.renewal_reminder_date or not self.name:
			return
		desc = f"Vendor contract renewal — {self.name1 or self.name}"
		existing = frappe.db.exists(
			"Reminder",
			{
				"reminder_doctype": "vendor",
				"reminder_docname": self.name,
				"description": desc,
				"notified": 0,
			},
		)
		if existing:
			frappe.db.set_value(
				"Reminder",
				existing,
				"remind_at",
				f"{self.renewal_reminder_date} 09:00:00",
				update_modified=False,
			)
			return
		try:
			frappe.get_doc(
				{
					"doctype": "Reminder",
					"remind_at": f"{self.renewal_reminder_date} 09:00:00",
					"description": desc,
					"reminder_doctype": "vendor",
					"reminder_docname": self.name,
					"user": frappe.session.user,
				}
			).insert(ignore_permissions=True)
		except Exception:
			frappe.log_error(frappe.get_traceback(), "Vendor Renewal Reminder")
