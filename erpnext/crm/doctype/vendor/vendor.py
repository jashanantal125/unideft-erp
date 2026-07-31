# Copyright (c) 2025, Unideft and contributors
# For license information, please see license.txt

<<<<<<< HEAD
# import frappe
from frappe.model.document import Document


class vendor(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from erpnext.crm.doctype.vendor_contracts.vendor_contracts import VendorContracts
		from frappe.types import DF

		address: DF.Data | None
		city: DF.Data | None
		country: DF.Data
		email: DF.Data | None
		first_name: DF.Data | None
		last_name: DF.Data | None
		name1: DF.Data | None
		phone_number: DF.Phone | None
		short_name: DF.Data | None
		state: DF.Data | None
		table_ocev: DF.Table[VendorContracts]
	# end: auto-generated types

	pass
=======
import frappe
from frappe.model.document import Document
from frappe.utils import add_days, getdate


class vendor(Document):
	def validate(self):
		self.set_renewal_reminder()

	def set_renewal_reminder(self):
		"""Auto schedule renewal reminder 30 days before contract end."""
		if self.contract_end_date:
			self.renewal_reminder_date = add_days(getdate(self.contract_end_date), -30)
		else:
			self.renewal_reminder_date = None

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
>>>>>>> jashans-updates
