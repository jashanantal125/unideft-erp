import frappe


def execute():
	"""Old Open / In Progress / Pending / Processed / Ready for Application /
	Closed statuses -> Draft / Submitted / In Review / Shortlisted / Accepted /
	Converted to Application."""
	frappe.reload_doc("crm", "doctype", "assessment_request")

	for row in frappe.get_all(
		"Assessment Request",
		fields=[
			"name",
			"docstatus",
			"status",
			"response_submitted",
			"student_confirmed_to_apply",
			"university",
			"course",
			"application",
			"need_assessment",
			"assessment_channel",
		],
	):
		has_shortlist = frappe.db.exists(
			"Assessment Course Shortlisting", {"parenttype": "Assessment Request", "parent": row.name}
		)
		if row.application or row.status == "Converted to Application":
			status = "Converted to Application"
		elif row.docstatus == 0:
			status = "Draft"
		elif row.student_confirmed_to_apply == "Yes" and row.university and row.course:
			status = "Accepted"
		elif row.response_submitted and has_shortlist:
			status = "Shortlisted"
		elif (
			row.need_assessment
			or row.assessment_channel
			or has_shortlist
			or row.response_submitted
			or row.status in ("In Progress", "Pending", "Processed", "Closed")
		):
			status = "In Review"
		else:
			status = "Submitted"

		if status != row.status:
			frappe.db.set_value("Assessment Request", row.name, "status", status, update_modified=False)
