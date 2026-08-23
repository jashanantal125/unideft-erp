"""Stage 2 of the Accounts Department workflow — OSHC payment."""

import frappe
from frappe.model.document import Document

from erpnext.crm.accounts_workflow import ensure_commission, notify_accounts


class AccountsOSHCPayment(Document):
	def validate(self):
		if self.oshc_amount_paid != "Yes":
			self.oshc_payment_date = None
			self.oshc_payment_proof = None

		was_completed = self.workflow_status == "Completed"
		self.workflow_status = (
			"Completed" if self.oshc_amount_paid == "Yes" and self.oshc_payment_proof else "Pending"
		)
		self.flags.newly_completed = self.workflow_status == "Completed" and not was_completed

	def on_update(self):
		if self.workflow_status != "Completed":
			return

		application = frappe.get_doc("Application", self.application)
		ensure_commission(
			"OSHC",
			application,
			oshc_payment_date=self.oshc_payment_date,
			oshc_duration=self.oshc_duration,
			oshc_amount_paid=self.oshc_amount,
		)

		if self.flags.get("newly_completed"):
			notify_accounts(
				f"OSHC payment recorded — {self.application}",
				f"<p>OSHC of {self.oshc_amount} paid for "
				f"<b>{frappe.utils.escape_html(self.student_name or '')}</b> on "
				f"{frappe.utils.formatdate(self.oshc_payment_date)}.</p>",
				"Accounts OSHC Payment",
				self.name,
			)
