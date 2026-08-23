"""Forex / OSHC / Tuition Fee / Fee Payment Route commission records."""

import frappe
from frappe.model.document import Document
from frappe.utils import flt, nowdate


class AccountsCommission(Document):
	def validate(self):
		self.total_commission_received = sum(flt(row.amount) for row in self.commission_receipts or [])

		if self.commission_received == "No":
			self.clear_received_branch()
			if self.status == "Received":
				self.status = "Processing"
			return

		if self.commission_received != "Yes":
			return

		if self.commission_type == "Tuition Fee":
			self.validate_outstanding_loop()
		else:
			self.close_record()

	# ------------------------------------------------------------------ helpers
	def clear_received_branch(self):
		for fieldname in (
			"commission_invoice",
			"commission_receipt_upload",
			"outstanding_commission",
			"no_outstanding_reason",
			"outstanding_commission_received",
			"outstanding_notes",
		):
			self.set(fieldname, None)
		self.commission_received_date = None

	def close_record(self):
		"""Straight-line types close as soon as invoice and receipt are in."""
		if not (self.commission_invoice and self.commission_receipt_upload):
			frappe.throw(
				"Upload both the commission invoice and the receipt / payment proof "
				"before marking the commission as received."
			)
		self.status = "Received"
		self.commission_received_date = self.commission_received_date or nowdate()

	def validate_outstanding_loop(self):
		"""Tuition Fee commissions can arrive in several tranches.

		Each time an outstanding amount is received it is logged in Commission
		Receipts and the outstanding question is asked again, until the answer is
		No. Only then is the record closed.
		"""
		if self.outstanding_commission == "No":
			if not (self.no_outstanding_reason or "").strip():
				frappe.throw("Please enter the reason / remarks for closing the commission.")
			self.outstanding_commission_received = None
			self.outstanding_notes = None
			self.status = "Received"
			self.commission_received_date = self.commission_received_date or nowdate()
			return

		# Still chasing money, so the record cannot be closed.
		self.no_outstanding_reason = None
		if self.status == "Received":
			self.status = "Processing"

		if self.outstanding_commission != "Yes":
			return

		if self.outstanding_commission_received == "No":
			if not (self.outstanding_notes or "").strip():
				frappe.throw("Please enter the notes / comments for the outstanding commission.")
			return

		if self.outstanding_commission_received == "Yes":
			logged = len(self.commission_receipts or [])
			if logged <= (self.receipts_logged or 0):
				frappe.throw(
					"Add the amount you just received to Commission Receipts (date, amount, "
					"invoice, receipt) before confirming the outstanding commission was received."
				)

			# Loop: bank the tranche and re-ask, per the PDF's "continue in a loop".
			self.receipts_logged = logged
			self.outstanding_commission = None
			self.outstanding_commission_received = None
			self.outstanding_notes = None
			self.status = "Processing"
			frappe.msgprint(
				"Receipt logged. Confirm whether any commission is still outstanding.",
				alert=True,
			)
