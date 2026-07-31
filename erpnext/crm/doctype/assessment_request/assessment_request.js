// Copyright (c) 2026, Unideft and contributors
// For license information, please see license.txt

frappe.ui.form.on("Assessment Request", {
	refresh(frm) {
		if (frm.is_new() && !frm.doc.requested_by) {
			frm.set_value("requested_by", frappe.session.user);
		}
		setup_student_query(frm);
	},

	student_already_registered(frm) {
		if (frm.doc.student_already_registered !== "Yes") {
			frm.set_value("student", "");
		}
		setup_student_query(frm);
	},

	student(frm) {
		if (!frm.doc.student) {
			return;
		}
		frappe.call({
			method: "erpnext.crm.doctype.assessment_request.assessment_request.get_student_details",
			args: { student: frm.doc.student },
			callback(r) {
				if (!r.message) {
					return;
				}
				const d = r.message;
				["first_name", "middle_name", "last_name", "mobile_number", "email_address"].forEach(
					(f) => {
						if (d[f]) {
							frm.set_value(f, d[f]);
						}
					}
				);
			},
		});
	},
});

function setup_student_query(frm) {
	frm.set_query("student", () => {
		const filters = {};
		const roles = frappe.user_roles || [];
		if (
			roles.includes("Agent") ||
			roles.includes("B2B Agent") ||
			roles.includes("B2C Agent")
		) {
			filters.agent = frappe.session.user;
		}
		return { filters };
	});
}

const ASR_REMINDER_SESSION = {};

function prompt_assessment_reminder(frm, options) {
	if (!frm.doc.name || frm.doc.__islocal) {
		frappe.msgprint(__("Please save the Assessment Request first before setting a reminder."));
		return;
	}
	const trigger_key = options.trigger_key || options.default_description;
	if (ASR_REMINDER_SESSION[trigger_key]) {
		return;
	}
	ASR_REMINDER_SESSION[trigger_key] = true;

	const d = new frappe.ui.Dialog({
		title: options.title || __("Set Reminder"),
		fields: [
			{
				fieldname: "remind_date",
				fieldtype: "Date",
				label: __("Reminder Date"),
				reqd: 1,
				default: options.default_date || frappe.datetime.get_today(),
			},
			{
				fieldname: "remind_time",
				fieldtype: "Time",
				label: __("Reminder Time"),
				reqd: 1,
				default: "09:00:00",
			},
			{
				fieldname: "description",
				fieldtype: "Small Text",
				label: __("Short Note / Remarks"),
				reqd: 1,
				default: options.default_description || "",
			},
		],
		primary_action_label: __("Set Reminder"),
		primary_action(values) {
			const remind_at = `${values.remind_date} ${values.remind_time}`;
			frappe.call({
				method: "frappe.automation.doctype.reminder.reminder.create_new_reminder",
				args: {
					remind_at,
					description: values.description,
					reminder_doctype: "Assessment Request",
					reminder_docname: frm.doc.name,
				},
				callback() {
					frappe.show_alert({ message: __("Reminder set"), indicator: "green" });
					d.hide();
				},
			});
		},
	});
	d.show();
}

frappe.ui.form.on("Need Assessment Vendor", {
	assessment_channel(frm, cdt, cdn) {
		if (frm.doctype !== "Assessment Request" && frm.doctype !== "Application") {
			return;
		}
		const row = locals[cdt][cdn];
		if (row.assessment_channel !== "Vendor") {
			frappe.model.set_value(cdt, cdn, "vendor", "");
		}
	},
	assessment_received(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.assessment_received !== "Yes") {
			frappe.model.set_value(cdt, cdn, "options_provided_to_student", "");
			frappe.model.set_value(cdt, cdn, "student_confirmed_to_apply", "");
			frappe.model.set_value(cdt, cdn, "university", "");
			frappe.model.set_value(cdt, cdn, "course", "");
			frappe.model.set_value(cdt, cdn, "denial_reason", "");
			frappe.model.set_value(cdt, cdn, "assessment_status", "Open");
		}
		if (row.assessment_received === "No" && frm.doc.name && !frm.doc.__islocal) {
			const prompt =
				frm.doctype === "Assessment Request"
					? prompt_assessment_reminder
					: null;
			if (prompt) {
				prompt(frm, {
					title: __("Receive Assessment"),
					default_description: "Follow up — when will you receive the assessment?",
					trigger_key: `na_receive_${frm.doc.name}_${cdn}`,
				});
			}
		}
	},
	options_provided_to_student(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.options_provided_to_student !== "Yes") {
			frappe.model.set_value(cdt, cdn, "student_confirmed_to_apply", "");
			frappe.model.set_value(cdt, cdn, "university", "");
			frappe.model.set_value(cdt, cdn, "course", "");
			frappe.model.set_value(cdt, cdn, "denial_reason", "");
		}
		if (row.options_provided_to_student === "No" && frm.doc.name && !frm.doc.__islocal) {
			if (frm.doctype === "Assessment Request") {
				prompt_assessment_reminder(frm, {
					title: __("Send Options to Student"),
					default_description: "Follow up — when will you send options to the student?",
					trigger_key: `na_options_${frm.doc.name}_${cdn}`,
				});
			}
		}
	},
	student_confirmed_to_apply(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.student_confirmed_to_apply === "Yes") {
			frappe.model.set_value(cdt, cdn, "denial_reason", "");
		} else if (row.student_confirmed_to_apply === "No") {
			frappe.model.set_value(cdt, cdn, "university", "");
			frappe.model.set_value(cdt, cdn, "course", "");
			frappe.model.set_value(cdt, cdn, "assessment_status", "Closed");
			if (frm.doctype === "Assessment Request") {
				prompt_assessment_reminder(frm, {
					title: __("Student Confirmation to Apply"),
					default_description: "Follow up — student declined; capture reason if needed",
					trigger_key: `na_confirm_${frm.doc.name}_${cdn}`,
				});
			}
		} else {
			frappe.model.set_value(cdt, cdn, "university", "");
			frappe.model.set_value(cdt, cdn, "course", "");
			frappe.model.set_value(cdt, cdn, "denial_reason", "");
		}
	},
	university(frm, cdt, cdn) {
		maybe_mark_converted(frm, cdt, cdn);
	},
	course(frm, cdt, cdn) {
		maybe_mark_converted(frm, cdt, cdn);
	},
});

function maybe_mark_converted(frm, cdt, cdn) {
	const row = locals[cdt][cdn];
	if (
		row.student_confirmed_to_apply === "Yes" &&
		row.university &&
		row.course
	) {
		frappe.model.set_value(cdt, cdn, "assessment_status", "Converted to Application");
	}
}
