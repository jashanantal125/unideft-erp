"""Integration tests: Application -> Accounts workflow. Run via:
bench --site undeft.new execute erpnext.crm.accounts_workflow_integration_test.run
"""

import frappe
from frappe.utils import flt, now_datetime

PASS = FAIL = 0
REPORT = []


def test(name, condition, detail=""):
	global PASS, FAIL
	ok = bool(condition)
	PASS += 1 if ok else 0
	FAIL += 0 if ok else 1
	REPORT.append({"test": name, "status": "PASS" if ok else "FAIL", "detail": detail or ""})


@frappe.whitelist()
def run():
	global PASS, FAIL, REPORT
	PASS = FAIL = 0
	REPORT = []

	frappe.set_user("Administrator")
	student = frappe.db.get_value("Student", {}, "name", order_by="creation desc")
	course = frappe.db.get_value("Course", {}, "name", order_by="creation desc")
	university = frappe.db.get_value("University", {}, "name", order_by="creation desc")
	if not student or not course:
		test("setup", False, "Need at least one Student and Course")
		return _summary(None)

	dummy_file = "/private/files/test-accounts-workflow.pdf"

	app = frappe.new_doc("Application")
	app.student = student
	app.application_type = "B2B"
	app.status = "GS Approved"
	app.destination_country = "Australia"
	app.dob = "2000-01-01"
	app.course = course
	app.preferred_university = university
	app.intake = "July"
	app.full_year_tuition_fee = 25000
	app.offer_currency = "AUD"
	app.fee_processed_through_gha = "Yes"
	app.tuition_fee_paid = "Yes"
	app.append("passport_id_uploads", {"document_type": "Passport", "upload_document": dummy_file})
	app.append(
		"passport_id_uploads",
		{"document_type": "Aadhaar", "upload_document": dummy_file + "-aadhaar"},
	)
	app.append(
		"passport_id_uploads",
		{"document_type": "PAN Card", "upload_document": dummy_file + "-pan"},
	)
	app.flags.ignore_permissions = True
	app.flags.ignore_mandatory = True
	app.insert(ignore_permissions=True, ignore_mandatory=True)

	atfp_name = frappe.db.get_value(
		"Accounts Tuition Fee Payment", {"application": app.name}, "name"
	)
	test("TC1 ATFP created on fee_processed_through_gha=Yes", atfp_name, atfp_name or "missing")

	app.save(ignore_permissions=True)
	atfp_count = frappe.db.count("Accounts Tuition Fee Payment", {"application": app.name})
	test("TC1b ATFP idempotent (exactly one)", atfp_count == 1, f"count={atfp_count}")

	atfp = frappe.get_doc("Accounts Tuition Fee Payment", atfp_name)
	doc_map = {row.document_type: row.document for row in atfp.documents or []}
	test(
		"TC2 Identity docs copied to ATFP",
		doc_map.get("Passport Copy") == dummy_file
		and doc_map.get("Student Aadhaar Card") == dummy_file + "-aadhaar"
		and doc_map.get("Student PAN Card") == dummy_file + "-pan",
		str(doc_map),
	)

	new_passport = dummy_file + "-updated"
	for row in app.passport_id_uploads:
		if row.document_type == "Passport":
			row.upload_document = new_passport
	app.save(ignore_permissions=True)
	atfp.reload()
	doc_map2 = {row.document_type: row.document for row in atfp.documents or []}
	test(
		"TC3 Passport sync to existing ATFP",
		doc_map2.get("Passport Copy") == new_passport,
		doc_map2.get("Passport Copy"),
	)

	atfp.tuition_fee_paid = "Yes"
	atfp.tt_copy_received = "Yes"
	atfp.tt_copy_upload = dummy_file + "-tt"
	atfp.mark_completed = 0
	atfp.save(ignore_permissions=True)
	comment_exists = frappe.db.exists(
		"Comment",
		{
			"reference_doctype": "Application",
			"reference_name": app.name,
			"content": ["like", "%TT Copy%"],
		},
	)
	test("TC4 TT copy comment on Application", comment_exists, "Comment row")

	atfp.reload()
	atfp.previous_tuition_fee_payment = "No"
	atfp.number_of_accounts_used = "One"
	atfp.append("fee_payer_types", {"fee_payer": "Father"})
	atfp.forex_company = "Supreme Securities"
	atfp.actual_payable_fee = 25000
	atfp.fee_payment_route = "Bank Deposit"
	atfp.bank_deposit_amount = 25000
	atfp.latest_payable_fee = 25000
	atfp.currency_exchange_rate = 58
	atfp.forex_topup_fee = 0
	atfp.gst = 0
	atfp.tcs = 0
	atfp.our_commission_percentage = 2
	atfp.append(
		"fee_payers",
		{
			"full_name": "Test Payer",
			"relation": "Father",
			"amount_paid_inr": flt(atfp.total_fee_payable_inr),
		},
	)
	atfp.mark_completed = 0
	atfp.save(ignore_permissions=True)
	atfp.mark_completed = 1
	blocked = False
	try:
		atfp.save(ignore_permissions=True)
	except frappe.ValidationError:
		blocked = True
	test("TC5 Completion blocked without full fee payer KYC", blocked, "validation expected")

	atfp.reload()
	atfp.mark_completed = 0
	payer = atfp.fee_payers[0]
	payer.pan_number = "ABCDE1234F"
	payer.pan_upload = dummy_file
	payer.aadhaar_number = "123456789012"
	payer.aadhaar_upload = dummy_file
	payer.bank_name = "Test Bank"
	payer.amount_paid_inr = flt(atfp.total_fee_payable_inr)
	payer.utr_number = "UTR123456"
	payer.payment_receipt = dummy_file
	atfp.mark_completed = 1
	atfp.save(ignore_permissions=True)
	atfp.reload()
	test(
		"TC6 Mark completed saves with matching totals",
		atfp.workflow_status == "Completed",
		atfp.workflow_status,
	)

	forex = frappe.db.get_value(
		"Accounts Commission", {"application": app.name, "commission_type": "Forex"}, "name"
	)
	route = frappe.db.get_value(
		"Accounts Commission",
		{"application": app.name, "commission_type": "Fee Payment Route"},
		"name",
	)
	test("TC6b Forex + Fee Payment Route commissions", forex and route, f"forex={forex}, route={route}")

	app.oshc_required = "Yes"
	app.oshc_arranged_by_type = "GHA"
	app.gha_oshc_company_name = "Test OSHC Co"
	app.gha_oshc_policy_no = "POL-123"
	app.gha_oshc_duration = "12 months"
	app.gha_oshc_amount = 600
	app.save(ignore_permissions=True)
	oshc = frappe.db.get_value("Accounts OSHC Payment", {"application": app.name}, "name")
	test("TC7 OSHC payment created", oshc, oshc or "missing")

	app.visa_decision = "Visa Approved"
	app.coe_uploaded = dummy_file + "-coe"
	app.visa_copy_upload = dummy_file + "-visa"
	app.save(ignore_permissions=True)
	tuition_comm = frappe.db.get_value(
		"Accounts Commission",
		{"application": app.name, "commission_type": "Tuition Fee"},
		"name",
	)
	test("TC8 Tuition Fee commission on Visa Approved", tuition_comm, tuition_comm or "missing")

	atfp2 = frappe.new_doc("Accounts Tuition Fee Payment")
	atfp2.application = app.name
	atfp2.student = student
	atfp2.latest_payable_fee = 1000
	atfp2.currency_exchange_rate = 50
	atfp2.validate()
	test(
		"TC9 Fee calc defaults (350 + 1100 charges)",
		flt(atfp2.processing_fee) == 350 and flt(atfp2.swift_nostro_charges) == 1100,
		f"total={atfp2.total_fee_payable_inr}",
	)

	notif = frappe.db.exists(
		"Notification Log",
		{
			"document_type": "Accounts Tuition Fee Payment",
			"document_name": atfp_name,
			"subject": ["like", "%Tuition fee payment%"],
		},
	)
	test("TC10 Accounts notification sent", notif, "Notification Log row")

	frappe.db.commit()
	return _summary(app.name)


def _summary(app_name):
	print("=" * 60)
	print(f"ACCOUNTS WORKFLOW TESTS — PASS={PASS} FAIL={FAIL}" + (f" (app={app_name})" if app_name else ""))
	print("=" * 60)
	for row in REPORT:
		mark = "✓" if row["status"] == "PASS" else "✗"
		line = f"{mark} {row['test']}"
		if row["detail"]:
			line += f" — {row['detail']}"
		print(line)
	return {"pass": PASS, "fail": FAIL, "application": app_name, "results": REPORT}
