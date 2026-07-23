import frappe

# Re-runnable safety net: ensure all required Offer Letter Conditions exist on live.
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
