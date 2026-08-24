"""Shared plumbing for the Accounts Department workflow.

The Accounts flow hangs off three counselor actions on an Application:

* Tuition Fee Payment Processed Through GHA = Yes  -> Accounts Tuition Fee Payment
* OSHC Arranged By = GHA (once a policy amount exists) -> Accounts OSHC Payment
* Visa Decision = Visa Approved                    -> Tuition Fee commission record

Each of those creates exactly one record per application and notifies Accounts.
Everything the Accounts team should not retype is copied in at creation time and
kept read-only on the form.
"""

import frappe

ACCOUNTS_ROLES = ("Accounts Manager", "Accounts User")

COMMISSION_TYPES = ("Forex", "OSHC", "Tuition Fee", "Fee Payment Route")

# Counselor document type -> label on Accounts Fetched Document rows.
ACCOUNTS_IDENTITY_DOC_MAP = {
	"Passport": "Passport Copy",
	"Aadhaar": "Student Aadhaar Card",
	"PAN Card": "Student PAN Card",
}


def accounts_recipients():
	"""Enabled users who should hear about Accounts work.

	Administrator is included when they actually hold an Accounts role —
	this install's only Accounts users are often Administrator.
	"""
	users = frappe.get_all(
		"Has Role",
		filters={"parenttype": "User", "role": ["in", ACCOUNTS_ROLES]},
		pluck="parent",
		distinct=True,
	)
	recipients = [
		user
		for user in users
		if user != "Guest" and frappe.db.get_value("User", user, "enabled")
	]
	if recipients:
		return recipients
	return [
		user
		for user in frappe.get_all(
			"Has Role",
			filters={"parenttype": "User", "role": "System Manager"},
			pluck="parent",
			distinct=True,
		)
		if user != "Guest" and frappe.db.get_value("User", user, "enabled")
	]


def notify_accounts(subject, body, doctype, name):
	for user in accounts_recipients():
		frappe.get_doc(
			{
				"doctype": "Notification Log",
				"for_user": user,
				"type": "Alert",
				"document_type": doctype,
				"document_name": name,
				"subject": subject,
				"email_content": body,
			}
		).insert(ignore_permissions=True)


def identity_documents_from_application(application):
	"""Passport / Aadhaar / PAN rows from Processing -> Accounts document labels."""
	found = {}
	for row in application.get("passport_id_uploads") or []:
		doc_type = (row.get("document_type") or "").strip()
		label = ACCOUNTS_IDENTITY_DOC_MAP.get(doc_type)
		url = row.get("upload_document")
		if label and url:
			found[label] = url
	# One legacy attach field may still exist on older applications.
	if not found.get("Passport Copy") and application.get("passport_upload"):
		found["Passport Copy"] = application.get("passport_upload")
	return found


def application_document_rows(application):
	"""The documents the PDF says Accounts should receive without asking."""
	rows = []
	identity = identity_documents_from_application(application)

	for row in application.get("offer_letter_upload") or []:
		url = row.get("upload_document")
		if url:
			rows.append(
				{
					"document_type": row.get("document_type") or "Offer Letter",
					"source_stage": "Offer Letter",
					"document": url,
				}
			)
	if not rows:
		rows.append({"document_type": "Offer Letter", "source_stage": "Offer Letter", "document": None})

	rows.append(
		{
			"document_type": "Passport Copy",
			"source_stage": "Processing" if identity.get("Passport Copy") else "Accounts",
			"document": identity.get("Passport Copy"),
		}
	)
	rows.append(
		{
			"document_type": "Student Aadhaar Card",
			"source_stage": "Processing" if identity.get("Student Aadhaar Card") else "Accounts",
			"document": identity.get("Student Aadhaar Card"),
		}
	)
	rows.append(
		{
			"document_type": "Student PAN Card",
			"source_stage": "Processing" if identity.get("Student PAN Card") else "Accounts",
			"document": identity.get("Student PAN Card"),
		}
	)
	return rows


def sync_identity_documents_to_accounts(application):
	"""Push newly uploaded Passport / Aadhaar / PAN into existing Accounts records."""
	if application.get("destination_country") != "Australia":
		return

	identity = identity_documents_from_application(application)
	if not identity:
		return

	for doctype in ("Accounts Tuition Fee Payment", "Accounts Commission"):
		name = frappe.db.get_value(doctype, {"application": application.name}, "name")
		if not name:
			continue
		doc = frappe.get_doc(doctype, name)
		if not doc.get("documents"):
			continue
		for row in doc.documents:
			url = identity.get(row.document_type)
			if url and row.document != url:
				frappe.db.set_value(
					"Accounts Fetched Document",
					row.name,
					{"document": url, "source_stage": "Processing"},
					update_modified=False,
				)


def commission_document_rows(application):
	"""Extra attachments the Tuition Fee commission record needs."""
	rows = application_document_rows(application)
	rows.append(
		{"document_type": "eCOE", "source_stage": "eCOE", "document": application.get("coe_uploaded")}
	)
	rows.append(
		{
			"document_type": "Visa Grant Copy",
			"source_stage": "Visa Granted",
			"document": application.get("visa_copy_upload"),
		}
	)
	rows.append(
		{
			"document_type": "Enrolment Proof",
			"source_stage": "Enrolment",
			"document": application.get("enrolment_proof_upload"),
		}
	)
	return rows


def _student_name(application):
	if application.get("student"):
		full = frappe.db.get_value(
			"Student", application.student, ["first_name", "last_name"], as_dict=True
		)
		if full:
			return " ".join(filter(None, [full.first_name, full.last_name])) or application.student
	return application.get("student_name") or application.get("student")


def ensure_tuition_fee_payment(application):
	"""Stage 1 — created when the counselor routes the fee through GHA."""
	existing = frappe.db.get_value(
		"Accounts Tuition Fee Payment", {"application": application.name}, "name"
	)
	if existing:
		return existing

	doc = frappe.new_doc("Accounts Tuition Fee Payment")
	doc.application = application.name
	doc.student = application.get("student")
	doc.student_name = _student_name(application)
	doc.country = application.get("destination_country")
	doc.currency = application.get("offer_currency")
	doc.university_name = application.get("university_name") or application.get("preferred_university")
	doc.course_name = application.get("course_name") or application.get("course")
	doc.intake = frappe.utils.formatdate(application.university_intake) if application.get(
		"university_intake"
	) else application.get("intake")
	doc.payable_tuition_fee = application.get("full_year_tuition_fee")
	for row in application_document_rows(application):
		doc.append("documents", row)
	doc.flags.ignore_permissions = True
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True, ignore_mandatory=True)

	notify_accounts(
		f"Tuition fee payment to process — {application.name}",
		f"<p>The counselor routed the tuition fee through GHA for "
		f"<b>{frappe.utils.escape_html(doc.student_name or '')}</b>.</p>"
		f"<p>Accounts task: <b>{doc.name}</b></p>",
		"Accounts Tuition Fee Payment",
		doc.name,
	)
	return doc.name


def ensure_oshc_payment(application):
	"""Stage 2 — created when OSHC is arranged by GHA."""
	existing = frappe.db.get_value("Accounts OSHC Payment", {"application": application.name}, "name")
	if existing:
		return existing

	doc = frappe.new_doc("Accounts OSHC Payment")
	doc.application = application.name
	doc.student = application.get("student")
	doc.student_name = _student_name(application)
	doc.university_name = application.get("university_name") or application.get("preferred_university")
	doc.course_name = application.get("course_name") or application.get("course")
	doc.oshc_company_name = application.get("gha_oshc_company_name")
	doc.oshc_policy_no = application.get("gha_oshc_policy_no")
	doc.oshc_duration = application.get("gha_oshc_duration")
	doc.oshc_amount = application.get("gha_oshc_amount")
	doc.flags.ignore_permissions = True
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True, ignore_mandatory=True)

	notify_accounts(
		f"OSHC payment to process — {application.name}",
		f"<p>OSHC is arranged by GHA for "
		f"<b>{frappe.utils.escape_html(doc.student_name or '')}</b>.</p>"
		f"<p>Accounts task: <b>{doc.name}</b></p>",
		"Accounts OSHC Payment",
		doc.name,
	)
	return doc.name


def ensure_commission(commission_type, application, **values):
	"""One commission record per (application, type)."""
	if commission_type not in COMMISSION_TYPES:
		frappe.throw(f"{commission_type} is not a commission type.")

	existing = frappe.db.get_value(
		"Accounts Commission",
		{"application": application.name, "commission_type": commission_type},
		"name",
	)
	if existing:
		return existing

	doc = frappe.new_doc("Accounts Commission")
	doc.commission_type = commission_type
	doc.application = application.name
	doc.student = application.get("student")
	doc.student_name = _student_name(application)
	doc.university_name = application.get("university_name") or application.get("preferred_university")
	doc.course_name = application.get("course_name") or application.get("course")
	doc.country = application.get("destination_country")
	doc.status = "Pending"
	documents = values.pop("documents", None)
	for key, value in values.items():
		doc.set(key, value)
	for row in documents or []:
		doc.append("documents", row)
	doc.flags.ignore_permissions = True
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True, ignore_mandatory=True)

	notify_accounts(
		f"{commission_type} commission pending — {application.name}",
		f"<p>A {commission_type} commission record was created for "
		f"<b>{frappe.utils.escape_html(doc.student_name or '')}</b>.</p>"
		f"<p>Record: <b>{doc.name}</b></p>",
		"Accounts Commission",
		doc.name,
	)
	return doc.name


def sync_application_triggers(application):
	"""Called from Application.on_update — idempotent, so a re-save is harmless."""
	if application.get("destination_country") != "Australia":
		return

	if application.get("fee_processed_through_gha") == "Yes":
		ensure_tuition_fee_payment(application)

	if application.get("oshc_required") == "Yes" and application.get("oshc_arranged_by_type") == "GHA":
		ensure_oshc_payment(application)

	if application.get("visa_decision") == "Visa Approved":
		ensure_tuition_fee_commission(application)

	sync_identity_documents_to_accounts(application)


def ensure_tuition_fee_commission(application):
	"""Stage 3 — the Visa Granted commission record, with all its attachments."""
	existing = frappe.db.get_value(
		"Accounts Commission",
		{"application": application.name, "commission_type": "Tuition Fee"},
		"name",
	)
	if existing:
		return existing

	paid = frappe.db.get_value(
		"Accounts Tuition Fee Payment",
		{"application": application.name},
		["actual_payable_fee", "latest_payable_fee", "actual_commission_inr"],
		as_dict=True,
	)

	return ensure_commission(
		"Tuition Fee",
		application,
		visa_approval_date=frappe.utils.nowdate(),
		intake_date=application.get("intake_date") or application.get("university_intake"),
		total_tuition_fee=application.get("full_year_tuition_fee"),
		full_year_tuition_fee=application.get("full_year_tuition_fee"),
		paid_tuition_fee=(paid or {}).get("latest_payable_fee") or (paid or {}).get("actual_payable_fee"),
		expected_commission=(paid or {}).get("actual_commission_inr"),
		enrolment_status="Enrolled" if application.get("student_enrolled") else "Not Enrolled",
		documents=commission_document_rows(application),
	)
