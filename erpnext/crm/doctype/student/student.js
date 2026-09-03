// Copyright (c) 2025, Unideft and contributors
// For license information, please see license.txt

function is_agent_user() {
	const roles = frappe.user_roles || [];
	return (
		roles.includes("Agent") ||
		roles.includes("B2B Agent") ||
		roles.includes("B2C Agent") ||
		roles.includes("agents")
	);
}

function apply_agent_student_form(frm) {
	if (!is_agent_user()) {
		return;
	}

	// Agents only fill a short intake form
	frm.set_df_property("first_name", "label", __("Name"));
	frm.set_df_property("mobile", "label", __("Contact Number"));
	frm.set_df_property("destination_country", "label", __("Home Country"));
	frm.set_df_property("destination_country", "reqd", 1);

	// Hide tabs / staff fields (belt-and-suspenders with depends_on)
	[
		"last_name",
		"state",
		"city",
		"country",
		"country_code",
		"birthday",
		"area_of_interest",
		"highest_education",
		"gender",
		"testscore",
		"preferred_study_level",
		"assigned_to",
		"lead_link",
		"comment",
		"naming_series",
		"documents_tab",
		"shortlisted_program_tab",
		"counsellings_tab",
	].forEach((fieldname) => {
		frm.set_df_property(fieldname, "hidden", 1);
	});

	if (frm.meta && frm.meta["__unsaved"] === undefined) {
		frm.set_df_property("profile_details_tab", "label", __("Student"));
	}

	frm.refresh_fields();
}

/**
 * B2 - "Need Assessment" and "Apply Now" on the Student form.
 *
 * Both are agent entry points, and both delegate to the shared helpers in
 * unideft_apply_now.js rather than re-implementing the flow, so the Student
 * form, the Course Shortlisting rows and the Application list stay identical.
 */
function add_student_action_buttons(frm) {
	if (!is_agent_user()) {
		return;
	}

	frm.page.add_button(__("Need Assessment"), () => {
		unideft.apply.new_assessment_request(frm);
	});

	frm.page.add_button(
		__("Apply Now"),
		() => {
			if (frm.is_new()) {
				frappe.msgprint(__("Please save the student first, then click Apply Now."));
				return;
			}
			unideft.apply.new_application({
				student: frm.doc.name,
				destination_country: frm.doc.destination_country || "",
			});
		},
		"primary"
	);
}

frappe.ui.form.on("Student", {
	onload(frm) {
		apply_agent_student_form(frm);
	},

	refresh(frm) {
		apply_agent_student_form(frm);
		frm.set_df_property("destination_country", "label", __("Home Country"));
		add_student_action_buttons(frm);
	},

	validate(frm) {
		if (!is_agent_user()) {
			return;
		}
		if (!frm.doc.destination_country) {
			frappe.throw(__("Please select Home Country"));
		}
	},
});
