// Copyright (c) 2026, Unideft and contributors
// For license information, please see license.txt

/**
 * One shared "Apply Now" entry point.
 *
 * Three places start a new Application for an agent: the Student form button,
 * a Course Shortlisting row on an Assessment Request, and the Application list
 * view. They must not drift apart, so they all funnel through here and through
 * the same server method, create_agent_application.
 */

frappe.provide("unideft.apply");

const APPLY_AGENT_ROLES = ["Agent", "B2B Agent", "B2C Agent", "agents"];
const APPLY_STAFF_ROLES = [
	"System Manager",
	"Administrator",
	"CRM Admin",
	"Team Lead",
	"Team Executive",
	"Admission 1",
	"Admission 2",
	"CRO",
	"CRO Head",
	"Country Head",
];

unideft.apply.user_is_agent = function () {
	const roles = frappe.user_roles || [];
	return roles.some((r) => APPLY_AGENT_ROLES.includes(r));
};

unideft.apply.user_is_agent_only = function () {
	const roles = frappe.user_roles || [];
	return (
		unideft.apply.user_is_agent() && !roles.some((r) => APPLY_STAFF_ROLES.includes(r))
	);
};

/**
 * Open the New Application dialog, pre-filled with whatever the caller knows.
 *
 * @param {Object} prefill - any of student, destination_country,
 *   preferred_university, course, intake.
 */
unideft.apply.new_application = function (prefill = {}) {
	const dialog = new frappe.ui.Dialog({
		title: __("New Application"),
		fields: [
			{
				fieldname: "student",
				fieldtype: "Link",
				options: "Student",
				label: __("Student Name"),
				reqd: 1,
				default: prefill.student || "",
				onchange() {
					const student = dialog.get_value("student");
					if (!student) {
						return;
					}
					frappe.db.get_value(
						"Student",
						student,
						["destination_country"],
						(r) => {
							if (r && r.destination_country && !dialog.get_value("destination_country")) {
								dialog.set_value("destination_country", r.destination_country);
							}
						}
					);
				},
			},
			{
				fieldname: "destination_country",
				fieldtype: "Link",
				options: "Country",
				label: __("Destination Country"),
				reqd: 1,
				default: prefill.destination_country || "",
				get_query: () => ({
					filters: { name: ["in", ["Australia", "United Kingdom"]] },
				}),
			},
			{
				fieldname: "preferred_university",
				fieldtype: "Link",
				options: "University",
				label: __("University Name"),
				reqd: 1,
				default: prefill.preferred_university || "",
				onchange() {
					// Only clear the course when the user actively changes university,
					// never when we pre-filled both from a shortlisting row.
					if (dialog.__prefilling) {
						return;
					}
					dialog.set_value("course", "");
				},
			},
			{
				fieldname: "course",
				fieldtype: "Link",
				options: "Course",
				label: __("Course Name"),
				reqd: 1,
				default: prefill.course || "",
				get_query() {
					const uni = dialog.get_value("preferred_university");
					return uni ? { filters: { university: uni } } : {};
				},
			},
			{
				fieldname: "intake",
				fieldtype: "Date",
				label: __("Intake"),
				reqd: 1,
				default: prefill.intake || "",
			},
		],
		primary_action_label: __("Create Application"),
		primary_action(values) {
			dialog.hide();
			frappe.call({
				method: "erpnext.crm.doctype.application.application.create_agent_application",
				args: values,
				freeze: true,
				freeze_message: __("Creating application…"),
				callback(r) {
					if (r.message) {
						frappe.set_route("Form", r.message.doctype, r.message.name);
					}
				},
			});
		},
	});

	dialog.__prefilling = true;
	dialog.show();
	// Let the default values settle before re-enabling the university onchange.
	setTimeout(() => {
		dialog.__prefilling = false;
	}, 300);

	return dialog;
};

/**
 * Open a new Assessment Request pre-filled from a Student form (B2).
 * Values are read off the in-progress form, so an unsaved student still carries
 * across whatever has been typed so far.
 */
unideft.apply.new_assessment_request = function (frm) {
	const doc = frm.doc || {};
	const prefill = {
		student_already_registered: frm.is_new() ? "No" : "Yes",
		first_name: doc.first_name || "",
		last_name: doc.last_name || "",
		mobile_number: doc.mobile || "",
		email_address: doc.email || "",
		preferred_course_area: doc.area_of_interest || "",
	};
	if (!frm.is_new() && doc.name) {
		prefill.student = doc.name;
	}
	frappe.new_doc("Assessment Request", prefill);
};
