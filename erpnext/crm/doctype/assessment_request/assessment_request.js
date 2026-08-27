// Copyright (c) 2026, Unideft and contributors
// For license information, please see license.txt

frappe.ui.form.on("Assessment Request", {
	refresh(frm) {
		if (frm.is_new() && !frm.doc.requested_by) {
			frm.set_value("requested_by", frappe.session.user);
		}
		setup_student_query(frm);
		toggle_assessment_workflow_for_agents(frm);
		apply_assessment_role_visibility(frm);
	},

	student_already_registered(frm) {
		if (frm.doc.student_already_registered !== "Yes") {
			frm.set_value("student", "");
		}
		if (frm.doc.student_already_registered !== "No") {
			frm.set_value("cro_agent_name", "");
			frm.set_value("cro_agency_name", "");
		}
		setup_student_query(frm);
		apply_assessment_role_visibility(frm);
	},

	need_assessment(frm) {
		if (frm.doc.need_assessment !== "Yes") {
			frm.clear_table("assessment_vendors");
			frm.refresh_field("assessment_vendors");
		}
		apply_assessment_role_visibility(frm);
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

const AGENT_ROLES = ["Agent", "B2B Agent", "B2C Agent", "agents"];
const STAFF_ROLES = [
	"System Manager",
	"Administrator",
	"CRM Admin",
	"CRM Sales Staff",
	"Team Lead",
	"Team Executive",
];
const CRO_ROLES = ["CRO", "CRO Head", "System Manager", "Administrator", "CRM Admin"];
const COUNTRY_HEAD_ROLES = ["Country Head", "System Manager", "Administrator", "CRM Admin"];
const ADMISSION_ROLES = ["Admission 1", "Admission 2", "Team Lead", "Team Executive"];

function has_any_role(roles) {
	return (frappe.user_roles || []).some((r) => roles.includes(r));
}

function user_is_agent_only() {
	const roles = frappe.user_roles || [];
	const is_agent = roles.some((r) => AGENT_ROLES.includes(r));
	const is_staff = roles.some((r) => STAFF_ROLES.includes(r) || CRO_ROLES.includes(r) || ADMISSION_ROLES.includes(r) || COUNTRY_HEAD_ROLES.includes(r));
	return is_agent && !is_staff;
}

function user_is_cro() {
	return has_any_role(CRO_ROLES);
}

function user_is_country_head() {
	return has_any_role(COUNTRY_HEAD_ROLES);
}

function user_is_admission() {
	return has_any_role(ADMISSION_ROLES) && !user_is_country_head() && !user_is_cro();
}

/** Assessment Grid / Workflow is backend-only — hide from agent roles. */
function toggle_assessment_workflow_for_agents(frm) {
	const hide = user_is_agent_only();
	["assessment_workflow_tab", "need_assessment", "assessment_vendors_section", "assessment_vendors"].forEach(
		(field) => {
			frm.set_df_property(field, "hidden", hide ? 1 : 0);
		}
	);
}

function apply_assessment_role_visibility(frm) {
	const is_cro = user_is_cro();
	const is_ch = user_is_country_head();
	const is_adm = user_is_admission();

	// Need Assessment? — CRO editable; others read-only (can still see Yes/No)
	frm.set_df_property("need_assessment", "read_only", is_cro || is_ch ? 0 : 1);

	// CRO-only unregistered agent fields
	const show_cro_unreg =
		frm.doc.student_already_registered === "No" && (is_cro || is_ch);
	["cro_unregistered_section", "cro_agent_name", "cro_agency_name"].forEach((f) => {
		frm.set_df_property(f, "hidden", show_cro_unreg ? 0 : 1);
	});

	const show_grid = frm.doc.need_assessment === "Yes" && !user_is_agent_only();
	frm.set_df_property("assessment_vendors_section", "hidden", show_grid ? 0 : 1);
	frm.set_df_property("assessment_vendors", "hidden", show_grid ? 0 : 1);

	// Child-table column visibility by role:
	// Admissions: through Have You Provided?
	// CRO (+ Country Head): Student Confirmation onward too
	const grid = frm.fields_dict.assessment_vendors?.grid;
	if (!grid) {
		return;
	}

	const cro_or_ch_fields = [
		"student_confirmed_to_apply",
		"denial_reason",
		"student_application_punched",
		"application_when_can_apply",
		"application_id",
		"university",
		"course",
	];
	const admission_hidden = cro_or_ch_fields;

	if (is_ch) {
		admission_hidden.forEach((f) => {
			grid.update_docfield_property(f, "hidden", 0);
			grid.update_docfield_property(f, "read_only", 0);
		});
	} else if (is_cro) {
		// CRO: Student Confirmation editable; post-Yes fields visible
		["student_confirmed_to_apply", "denial_reason"].forEach((f) => {
			grid.update_docfield_property(f, "hidden", 0);
			grid.update_docfield_property(f, "read_only", 0);
		});
		[
			"student_application_punched",
			"application_when_can_apply",
			"application_id",
			"university",
			"course",
		].forEach((f) => {
			grid.update_docfield_property(f, "hidden", 0);
			grid.update_docfield_property(f, "read_only", 0);
		});
	} else if (is_adm) {
		// Admissions: through Have You Provided? only; after CRO Yes see punch fields
		["student_confirmed_to_apply", "denial_reason"].forEach((f) => {
			grid.update_docfield_property(f, "hidden", 1);
		});
		const any_confirmed = (frm.doc.assessment_vendors || []).some(
			(r) => r.student_confirmed_to_apply === "Yes"
		);
		[
			"student_application_punched",
			"application_when_can_apply",
			"application_id",
			"university",
			"course",
		].forEach((f) => {
			grid.update_docfield_property(f, "hidden", any_confirmed ? 0 : 1);
			grid.update_docfield_property(f, "read_only", 0);
		});
	} else {
		admission_hidden.forEach((f) => {
			grid.update_docfield_property(f, "hidden", 0);
		});
	}

	frm.refresh_field("assessment_vendors");
}

function setup_student_query(frm) {
	frm.set_query("student", () => ({ filters: {} }));
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
	form_render(frm, cdt, cdn) {
		apply_assessment_role_visibility(frm);
	},
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
			[
				"options_provided_to_student",
				"student_confirmed_to_apply",
				"denial_reason",
				"student_application_punched",
				"application_when_can_apply",
				"application_id",
				"university",
				"course",
			].forEach((f) => frappe.model.set_value(cdt, cdn, f, ""));
			frappe.model.set_value(cdt, cdn, "assessment_status", "Open");
		}
		if (row.assessment_received === "No" && frm.doc.name && !frm.doc.__islocal) {
			if (frm.doctype === "Assessment Request") {
				prompt_assessment_reminder(frm, {
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
			[
				"student_confirmed_to_apply",
				"denial_reason",
				"student_application_punched",
				"application_when_can_apply",
				"application_id",
				"university",
				"course",
			].forEach((f) => frappe.model.set_value(cdt, cdn, f, ""));
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
			[
				"student_application_punched",
				"application_when_can_apply",
				"application_id",
				"university",
				"course",
			].forEach((f) => frappe.model.set_value(cdt, cdn, f, ""));
			frappe.model.set_value(cdt, cdn, "assessment_status", "Closed");
			if (frm.doctype === "Assessment Request") {
				prompt_assessment_reminder(frm, {
					title: __("Student Confirmation to Apply"),
					default_description: "Follow up — student declined; capture reason if needed",
					trigger_key: `na_confirm_${frm.doc.name}_${cdn}`,
				});
			}
		} else {
			[
				"denial_reason",
				"student_application_punched",
				"application_when_can_apply",
				"application_id",
				"university",
				"course",
			].forEach((f) => frappe.model.set_value(cdt, cdn, f, ""));
		}
	},
	student_application_punched(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.student_application_punched === "Yes") {
			frappe.model.set_value(cdt, cdn, "application_when_can_apply", "");
		} else if (row.student_application_punched === "No") {
			["application_id", "university", "course"].forEach((f) =>
				frappe.model.set_value(cdt, cdn, f, "")
			);
			frappe.model.set_value(cdt, cdn, "assessment_status", "Open");
		} else {
			[
				"application_when_can_apply",
				"application_id",
				"university",
				"course",
			].forEach((f) => frappe.model.set_value(cdt, cdn, f, ""));
		}
	},
	university(frm, cdt, cdn) {
		maybe_mark_converted(frm, cdt, cdn);
	},
	course(frm, cdt, cdn) {
		maybe_mark_converted(frm, cdt, cdn);
	},
	application_id(frm, cdt, cdn) {
		maybe_mark_converted(frm, cdt, cdn);
		const row = locals[cdt][cdn];
		if (!row.application_id) {
			return;
		}
		frappe.db.get_value("Application", row.application_id, ["preferred_university", "course", "university_name"], (r) => {
			if (!r) return;
			if (r.preferred_university || r.university_name) {
				frappe.model.set_value(cdt, cdn, "university", r.preferred_university || r.university_name);
			}
			if (r.course) {
				frappe.model.set_value(cdt, cdn, "course", r.course);
			}
		});
	},
});

function maybe_mark_converted(frm, cdt, cdn) {
	const row = locals[cdt][cdn];
	if (
		row.student_confirmed_to_apply === "Yes" &&
		row.student_application_punched === "Yes" &&
		row.university &&
		row.course
	) {
		frappe.model.set_value(cdt, cdn, "assessment_status", "Converted to Application");
	}
}
