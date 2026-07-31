// Copyright (c) 2026, Unideft and contributors
// For license information, please see license.txt

function is_uk_country(country) {
	const c = (country || "").trim().toLowerCase();
	return ["united kingdom", "uk", "great britain", "britain", "england"].includes(c);
}

function show_new_uk_application_dialog() {
	const d = new frappe.ui.Dialog({
		title: __("New Application — Select Country"),
		fields: [
			{
				fieldname: "destination_country",
				fieldtype: "Link",
				options: "Country",
				label: __("Destination Country"),
				reqd: 1,
				description: __("Australia opens on Application. United Kingdom opens here."),
				get_query: () => ({
					filters: {
						name: ["in", ["Australia", "United Kingdom"]],
					},
				}),
			},
		],
		primary_action_label: __("Continue"),
		primary_action(values) {
			d.hide();
			const country = values.destination_country;
			if (is_uk_country(country)) {
				frappe.new_doc("Application UK", {
					application_type: "B2B",
					uk_current_stage: "Details",
					country_flow_case: "UK Case 2",
				});
				return;
			}
			frappe.new_doc("Application", {
				destination_country: country,
				country_flow_case: "AU Default",
				application_type: "B2B",
				status: "Pending",
			});
		},
	});
	d.$wrapper.find(".btn-modal-close, .modal-header .close").hide();
	d.show();
}

frappe.listview_settings["Application UK"] = {
	add_fields: ["application_type", "uk_current_stage", "country_flow_case", "student", "application"],
	get_indicator(doc) {
		const case_label = doc.country_flow_case || "";
		if (case_label.startsWith("UK")) {
			return [__(case_label), "blue", "country_flow_case,=," + case_label];
		}
		return [__(doc.uk_current_stage || "Details"), "green", "uk_current_stage,=," + (doc.uk_current_stage || "Details")];
	},
	onload(listview) {
		listview.page.set_primary_action(__("New Application"), () => {
			show_new_uk_application_dialog();
		});
		listview.page.add_inner_button(__("All Applications (List)"), () => {
			frappe.set_route("List", "Application");
		});
		listview.page.add_inner_button(__("Card View"), () => {
			frappe.set_route("applications_view");
		});
	},
	refresh(listview) {
		listview.page.set_primary_action(__("New Application"), () => {
			show_new_uk_application_dialog();
		});
	},
};
