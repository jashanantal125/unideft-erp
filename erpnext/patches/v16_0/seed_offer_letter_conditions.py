import frappe

# Full set required for Offer Letter Conditions multi-select.
# Includes live leftovers (Academic Transcript) + client Case 1/2 list.
OFFER_LETTER_CONDITIONS = (
	"Interview",
	"English Requirement",
	"Gap Justification",
	"Verification",
	"Other",
	"Academic Transcript",
)


def execute():
	for condition_name in OFFER_LETTER_CONDITIONS:
		if frappe.db.exists("Offer Letter Condition", condition_name):
			continue

		doc = frappe.get_doc(
			{
				"doctype": "Offer Letter Condition",
				"condition_name": condition_name,
			}
		)
		doc.insert(ignore_permissions=True)
		frappe.db.commit()
