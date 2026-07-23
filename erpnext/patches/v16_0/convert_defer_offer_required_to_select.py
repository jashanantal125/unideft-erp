import frappe


def execute():
	"""Convert old Check values for defer_offer_required to Yes/No Select."""
	frappe.db.sql(
		"""
		UPDATE `tabApplication`
		SET defer_offer_required = 'Yes'
		WHERE defer_offer_required IN ('1', 1)
		"""
	)
	frappe.db.sql(
		"""
		UPDATE `tabApplication`
		SET defer_offer_required = 'No'
		WHERE defer_offer_required IN ('0', 0, '')
		   OR defer_offer_required IS NULL
		"""
	)
