"""Stage 1 of the Accounts Department workflow — tuition fee payment."""

import frappe
from frappe.model.document import Document
from frappe.utils import flt, nowdate

from erpnext.crm.accounts_workflow import ensure_commission

ACCOUNTS_PER_OPTION = {"One": 1, "Two": 2, "Three": 3}


class AccountsTuitionFeePayment(Document):
	def validate(self):
		self.clear_unused_branches()
		self.calculate_fees()
		self.validate_payer_count()
		self.validate_completion()
		self.set_workflow_status()

	def on_update(self):
		try:
			self.share_tt_copy_on_application()
		except Exception:
			frappe.log_error(
				frappe.get_traceback(),
				f"TT copy share failed for {self.name}",
			)
		try:
			self.create_commission_records()
		except Exception:
			frappe.log_error(
				frappe.get_traceback(),
				f"Commission sync failed for {self.name}",
			)

	# ------------------------------------------------------------------ helpers
	def clear_unused_branches(self):
		"""Answers below a 'No' should not linger once the answer changes."""
		if self.tuition_fee_paid != "Yes":
			self.tt_copy_received = None
		if self.tt_copy_received != "Yes":
			self.tt_copy_upload = None

		if self.previous_tuition_fee_payment != "Yes":
			self.previous_country = None
			self.previous_amount_foreign = None
			self.previous_amount_inr = None

		for route, fields in (
			("Flywire", ("flywire_amount", "flywire_instruction_sheet")),
			("Convera", ("convera_amount", "convera_instruction_sheet")),
			("Bank Deposit", ("bank_deposit_amount",)),
		):
			if self.fee_payment_route != route:
				for fieldname in fields:
					self.set(fieldname, None)

	def calculate_fees(self):
		"""Total payable and our commission, both in INR."""
		if self.processing_fee in (None, ""):
			self.processing_fee = 350
		if self.swift_nostro_charges in (None, ""):
			self.swift_nostro_charges = 1100
		rate = flt(self.currency_exchange_rate)
		self.total_fee_payable_inr = (
			flt(self.latest_payable_fee) * rate
			+ flt(self.forex_topup_fee)
			+ flt(self.processing_fee)
			+ flt(self.swift_nostro_charges)
			+ flt(self.gst)
			+ flt(self.tcs)
		)
		self.actual_commission_inr = (
			flt(self.actual_payable_fee) * rate * flt(self.our_commission_percentage) / 100
		)
		self.total_paid_by_payers = sum(flt(row.amount_paid_inr) for row in self.fee_payers or [])

	def validate_payer_count(self):
		"""One Fee Payer row per bank account used, as the PDF specifies."""
		expected = ACCOUNTS_PER_OPTION.get(self.number_of_accounts_used)
		if not expected:
			return

		rows = self.fee_payers or []
		if len(rows) > expected:
			frappe.throw(
				f"You selected {self.number_of_accounts_used} account(s) but entered "
				f"{len(rows)} fee payers. Remove the extra rows or change Number of Accounts Used."
			)
		self.payer_count_note = (
			f"ℹ {len(rows)} of {expected} fee payer row(s) entered."
			if len(rows) < expected
			else f"✓ {expected} fee payer row(s) entered."
		)

	def validate_completion(self):
		"""The reconciliation gate: totals must match before completion."""
		expected = ACCOUNTS_PER_OPTION.get(self.number_of_accounts_used) or 0
		total = flt(self.total_fee_payable_inr)
		paid = flt(self.total_paid_by_payers)
		difference = round(paid - total, 2)

		if not self.mark_completed:
			if total:
				self.reconcile_note = (
					f"✓ Fee payers' total matches the Total Fee Payable (INR)."
					if difference == 0
					else f"⚠ Fee payers have paid {paid:,.2f} against a Total Fee Payable of "
					f"{total:,.2f} (difference {difference:,.2f}). Match them before completing."
				)
			else:
				self.reconcile_note = "Enter the fee calculation to see the reconciliation."
			return

		missing = []
		if self.tuition_fee_paid != "Yes":
			missing.append("Tuition Fee Paid must be Yes")
		if self.tt_copy_received != "Yes" or not self.tt_copy_upload:
			missing.append("the TT copy must be received and uploaded")
		if not self.fee_payer_types:
			missing.append("at least one fee payer type")
		if len(self.fee_payers or []) != expected:
			missing.append(f"exactly {expected} fee payer row(s)")

		for idx, row in enumerate(self.fee_payers or [], start=1):
			for fieldname, label in (
				("pan_number", "PAN Number"),
				("pan_upload", "PAN Card"),
				("aadhaar_number", "Aadhaar Number"),
				("aadhaar_upload", "Aadhaar Card"),
				("bank_name", "Bank Name"),
				("amount_paid_inr", "Amount Paid (INR)"),
				("utr_number", "UTR Number"),
				("payment_receipt", "Cheque / Payment Receipt"),
			):
				if not row.get(fieldname):
					missing.append(f"{label} for fee payer {idx}")

		if missing:
			frappe.throw(
				"This payment cannot be completed yet. Missing: " + "; ".join(missing) + "."
			)

		if difference != 0:
			frappe.throw(
				f"The fee payers' total ({paid:,.2f}) does not match the Total Fee Payable "
				f"({total:,.2f}). Difference: {difference:,.2f}."
			)

		self.reconcile_note = "✓ Payment completed and reconciled."

	def set_workflow_status(self):
		if self.mark_completed:
			self.workflow_status = "Completed"
			self.completed_on = self.completed_on or nowdate()
		else:
			self.workflow_status = "In Progress" if self.tuition_fee_paid else "Pending"
			self.completed_on = None

	def create_commission_records(self):
		"""A completed payment opens the Forex and Fee Payment Route commissions."""
		if self.workflow_status != "Completed":
			return

		application = frappe.get_doc("Application", self.application)
		shared = {
			"fee_payment_date": self.completed_on,
			"paid_tuition_fee": self.latest_payable_fee or self.actual_payable_fee,
			"expected_commission": self.actual_commission_inr,
		}
		ensure_commission("Forex", application, forex_company=self.forex_company, **shared)
		ensure_commission(
			"Fee Payment Route",
			application,
			fee_payment_route=self.fee_payment_route,
			reference_number=self.reference_number,
			fee_payment_date=self.completed_on,
			paid_tuition_fee=shared["paid_tuition_fee"],
		)

	def share_tt_copy_on_application(self):
		"""PDF: once uploaded, the TT copy is visible to Admission, Counselor, Student and Agent.

		There is no student/agent portal channel, so the file is posted onto the
		Application timeline — that is the thread those roles already use.
		"""
		if not (self.tt_copy_upload and self.application):
			return

		content = (
			"<p><b>TT Copy</b> uploaded by Accounts. Please share with the student / agent.</p>"
			f'<p><a href="{frappe.utils.escape_html(self.tt_copy_upload)}" target="_blank">'
			f"{frappe.utils.escape_html(self.tt_copy_upload)}</a></p>"
		)
		if frappe.db.exists(
			{
				"doctype": "Comment",
				"comment_type": "Comment",
				"reference_doctype": "Application",
				"reference_name": self.application,
				"content": content,
			}
		):
			return
		frappe.get_doc(
			{
				"doctype": "Comment",
				"comment_type": "Comment",
				"reference_doctype": "Application",
				"reference_name": self.application,
				"content": content,
			}
		).insert(ignore_permissions=True)
