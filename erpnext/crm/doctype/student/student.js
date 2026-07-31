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
	frm.set_df_property("destination_country", "label", __("Destination Country"));
	frm.set_df_property("destination_country", "reqd", 1);
	frm.set_df_property("agent_request_type", "reqd", 1);

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
		// Rename profile tab for agents
		frm.set_df_property("profile_details_tab", "label", __("Student"));
	}

	frm.refresh_fields();
}

frappe.ui.form.on("Student", {
	onload(frm) {
		apply_agent_student_form(frm);
	},

	refresh(frm) {
		apply_agent_student_form(frm);

			// Agent form is already limited via depends_on + field properties
	},

	validate(frm) {
		if (!is_agent_user()) {
			return;
		}
		if (!frm.doc.destination_country) {
			frappe.throw(__("Please select Destination Country"));
		}
		if (!frm.doc.agent_request_type) {
			frappe.throw(__("Please select Assessment or Expert Advice"));
		}
	},
});
