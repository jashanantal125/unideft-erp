// Copyright (c) 2026, Unideft and contributors
// For license information, please see license.txt

function is_uk_country(country) {
	const c = (country || "").trim().toLowerCase();
	return ["united kingdom", "uk", "great britain", "britain", "england"].includes(c);
}

function show_new_application_country_dialog() {
	const d = new frappe.ui.Dialog({
		title: __("New Application — Select Country"),
		fields: [
			{
				fieldname: "destination_country",
				fieldtype: "Link",
				options: "Country",
				label: __("Destination Country"),
				reqd: 1,
				description: __("Australia opens on Application. United Kingdom opens on Application UK."),
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
					offer_currency: "GBP",
					status: "Pending",
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

function bind_new_application_action(listview) {
	listview.page.set_primary_action(__("New Application"), () => {
		show_new_application_country_dialog();
	});
}

frappe.listview_settings["Application"] = {
	add_fields: ["application_type", "destination_country", "country_flow_case", "uk_data"],
	get_indicator(doc) {
		const case_label = doc.country_flow_case || "";
		if (case_label.startsWith("UK")) {
			return [__(case_label), "blue", "country_flow_case,=," + case_label];
		}
		if (case_label.startsWith("AU")) {
			return [__(case_label), "orange", "country_flow_case,=," + case_label];
		}
		return [__(doc.status || "Pending"), "gray", "status,=," + (doc.status || "Pending")];
	},
	onload: function (listview) {
		bind_new_application_action(listview);
		listview.page.add_inner_button(__("Card View"), function () {
			frappe.set_route("applications_view");
		});
	},
	refresh: function (listview) {
		bind_new_application_action(listview);
	},
};
