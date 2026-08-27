# Copyright (c) 2025, Unideft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import add_days, getdate


class University(Document):
	def validate(self):
		self.clear_group_if_not_applicable()
		self.clear_contract_type_fields()
		self.clear_portal_fields_by_availability()
		self.clear_commission_branches()
		self.set_renewal_reminder()
		self.sync_commission_portal_credentials()

	def on_update(self):
		self.ensure_renewal_reminder()
		self.ensure_unconditional_followup_reminder()

	def after_insert(self):
		self.ensure_renewal_reminder()
		self.ensure_unconditional_followup_reminder()

	def clear_group_if_not_applicable(self):
		if self.group_name_applicable != "Yes":
			self.university_group = None

	def clear_contract_type_fields(self):
		if self.contract_type != "Conditional":
			self.expected_unconditional_date = None

	def clear_portal_fields_by_availability(self):
		if self.portal_available != "Yes":
			self.portal_link = None
			self.portal_login_id = None
			self.portal_password = None

	def clear_commission_branches(self):
		if self.country_wise_commission != "Yes":
			self.country_commissions = []
		if self.extra_bonus_available != "Yes":
			self.country_wise_bonus = None
			self.university_wise_bonus = None
			self.country_bonuses = []
			self.university_bonuses = []
		else:
			if self.country_wise_bonus != "Yes":
				self.country_bonuses = []
			if self.university_wise_bonus != "Yes":
				self.university_bonuses = []
		if self.commission_info_source != "Portal":
			self.use_existing_portal_credentials = None
			if self.commission_info_source != "Email":
				self.commission_email_attachment = None
		if self.commission_info_source != "Email":
			self.commission_email_attachment = None

	def set_renewal_reminder(self):
		"""Auto schedule renewal reminder 30 days before contract end."""
		if self.contract_end_date:
			self.renewal_reminder_date = add_days(getdate(self.contract_end_date), -30)
		else:
			self.renewal_reminder_date = None

	def sync_commission_portal_credentials(self):
		"""If Same: reuse Portal Access. If Different: keep separate credentials."""
		if self.commission_info_source != "Portal":
			self.commission_portal_link = None
			self.commission_login_id = None
			self.commission_password = None
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

	def ensure_renewal_reminder(self):
		if not self.renewal_reminder_date or not self.name:
			return
		self._upsert_reminder(
			description=f"University contract renewal — {self.university_name or self.name}",
			remind_date=self.renewal_reminder_date,
		)

	def ensure_unconditional_followup_reminder(self):
		if self.contract_type != "Conditional" or not self.expected_unconditional_date or not self.name:
			return
		self._upsert_reminder(
			description=f"Follow up: contract expected to become unconditional — {self.university_name or self.name}",
			remind_date=self.expected_unconditional_date,
		)

	def _upsert_reminder(self, description, remind_date):
		existing = frappe.db.exists(
			"Reminder",
			{
				"reminder_doctype": "University",
				"reminder_docname": self.name,
				"description": description,
				"notified": 0,
			},
		)
		remind_at = f"{getdate(remind_date)} 09:00:00"
		if existing:
			frappe.db.set_value("Reminder", existing, "remind_at", remind_at, update_modified=False)
			return
		try:
			frappe.get_doc(
				{
					"doctype": "Reminder",
					"remind_at": remind_at,
					"description": description,
					"reminder_doctype": "University",
					"reminder_docname": self.name,
					"user": frappe.session.user,
				}
			).insert(ignore_permissions=True)
		except Exception:
			frappe.log_error(frappe.get_traceback(), "University Reminder")
