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
 * Mirror the Details tab's conditional logic inside the dialog.
 *
 * A frappe.ui.Dialog does not re-evaluate `depends_on` as the user types the
 * way a Form does, so every conditional field here is toggled explicitly on
 * each relevant change.
 */
function toggle_conditional_fields(dialog) {
	const v = dialog.get_values(true) || {};
	const is_australia = v.destination_country === "Australia";

	// Study Gap → duration, and the Accepted / Not Accepted note (Details tab:
	// Below 1 Year and Below 2 Years are Accepted, Above 2 Years is not).
	const gap_yes = v.study_gap === "Yes";
	dialog.set_df_property("gap_duration", "hidden", gap_yes ? 0 : 1);
	dialog.set_df_property("gap_duration", "reqd", gap_yes ? 1 : 0);
	if (!gap_yes) {
		dialog.set_value("gap_duration", "");
	}

	const status_field = dialog.get_field("gap_duration_status_html");
	if (status_field) {
		let html = "";
		if (gap_yes && ["Below 1 Year", "Below 2 Years"].includes(v.gap_duration)) {
			html = `<div class="text-muted" style="margin-bottom:10px;">
				<b style="color:#2A7D34;">${__("Accepted")}</b></div>`;
		} else if (gap_yes && v.gap_duration === "Above 2 Years") {
			html = `<div class="text-muted" style="margin-bottom:10px;">
				<b style="color:#B33;">${__("Not Accepted")}</b></div>`;
		}
		status_field.$wrapper.html(html);
	}

	// Visa refusal is an Australia-only question, with its own cascade.
	dialog.set_df_property("any_visa_refused", "hidden", is_australia ? 0 : 1);
	dialog.set_df_property("any_visa_refused", "reqd", is_australia ? 1 : 0);
	if (!is_australia) {
		dialog.set_value("any_visa_refused", "");
	}

	const refused = is_australia && v.any_visa_refused === "Yes";
	dialog.set_df_property("visa_refused_country", "hidden", refused ? 0 : 1);
	if (!refused) {
		dialog.set_value("visa_refused_country", "");
	}

	const show_type = refused && !!v.visa_refused_country;
	dialog.set_df_property("visa_refused_type", "hidden", show_type ? 0 : 1);
	if (!show_type) {
		dialog.set_value("visa_refused_type", "");
	}
}

/**
 * Open the New Application dialog, pre-filled with whatever the caller knows.
 *
 * @param {Object} prefill - any of student, dob, destination_country,
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
					// Only the date of birth is worth carrying across. Student's
					// `destination_country` is labelled "Home Country" - copying it
					// here is what made every application default to India. The
					// agent picks the destination themselves.
					frappe.db.get_value("Student", student, ["birthday"], (r) => {
						if (r && r.birthday && !dialog.get_value("dob")) {
							dialog.set_value("dob", r.birthday);
						}
					});
				},
			},
			{
				// Application.dob is mandatory and is NOT reliably derivable from
				// the Student record (many students have no birthday set), which is
				// what produced "Value missing for Application: DOB" on save.
				fieldname: "dob",
				fieldtype: "Date",
				label: __("DOB"),
				reqd: 1,
				default: prefill.dob || "",
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
				onchange() {
					toggle_conditional_fields(dialog);
				},
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
			// The same qualifying questions the Details tab asks, with the same
			// labels, options and cascades - answered once here instead of the
			// agent having to reopen the created record.
			//
			// Visibility is driven by toggle_conditional_fields() below rather
			// than depends_on: a Dialog only re-evaluates depends_on when its
			// own refresh cycle runs, so conditional fields would sit stale
			// (or never appear) as the agent fills the form.
			{ fieldtype: "Section Break", label: __("Qualifying Details") },
			{
				fieldname: "martial_status",
				fieldtype: "Select",
				label: __("Martial Status"),
				options: "\nMarried\nSingle",
			},
			{
				fieldname: "higher_education",
				fieldtype: "Select",
				label: __("Qualification"),
				options: "\n12th pass\nGraduation\nPost-graduation\nOthers",
			},
			{ fieldtype: "Column Break" },
			{
				fieldname: "study_gap",
				fieldtype: "Select",
				label: __("Study Gap?"),
				options: "\nYes\nNo",
				onchange() {
					toggle_conditional_fields(dialog);
				},
			},
			{
				// Details tab: shown only when Study Gap is Yes. Below 1 Year /
				// Below 2 Years are Accepted, Above 2 Years is Not Accepted.
				fieldname: "gap_duration",
				fieldtype: "Select",
				label: __("If study gap is"),
				options: "\nBelow 1 Year\nBelow 2 Years\nAbove 2 Years",
				onchange() {
					toggle_conditional_fields(dialog);
				},
			},
			{
				fieldname: "gap_duration_status_html",
				fieldtype: "HTML",
			},
			{
				// Details tab gates this on Australia (or UK). This dialog only
				// creates a plain Application for Australia - a United Kingdom
				// pick routes to Application UK, which has its own Details tab.
				fieldname: "any_visa_refused",
				fieldtype: "Select",
				label: __("Refused from Aus/NZ"),
				options: "\nYes\nNo",
				onchange() {
					toggle_conditional_fields(dialog);
				},
			},
			{
				fieldname: "visa_refused_country",
				fieldtype: "Select",
				label: __("Which Country?"),
				options: "\nAustralia\nNew Zealand",
				onchange() {
					toggle_conditional_fields(dialog);
				},
			},
			{
				fieldname: "visa_refused_type",
				fieldtype: "Select",
				label: __("Which type of Visa refused?"),
				options: "\nStudy Visa\nTourist Visa\nWork Visa\nOther Visa",
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
	// Start with every conditional field in the right state rather than
	// showing them all until the agent touches something.
	toggle_conditional_fields(dialog);
	// Let the default values settle before re-enabling the university onchange.
	setTimeout(() => {
		dialog.__prefilling = false;
		toggle_conditional_fields(dialog);
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
