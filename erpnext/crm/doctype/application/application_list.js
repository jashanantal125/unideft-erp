// Copyright (c) 2026, Unideft and contributors
// For license information, please see license.txt

function is_uk_country(country) {
	const c = (country || "").trim().toLowerCase();
	return ["united kingdom", "uk", "great britain", "britain", "england"].includes(c);
}

function user_is_agent_only() {
	const roles = frappe.user_roles || [];
	const agent = ["Agent", "B2B Agent", "B2C Agent", "agents"].some((r) => roles.includes(r));
	const staff = [
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
	].some((r) => roles.includes(r));
	return agent && !staff;
}

function show_agent_new_application_dialog() {
	const d = new frappe.ui.Dialog({
		title: __("New Application"),
		fields: [
			{
				fieldname: "student",
				fieldtype: "Link",
				options: "Student",
				label: __("Student Name"),
				reqd: 1,
				onchange() {
					const student = d.get_value("student");
					if (!student) {
						d.set_value("student_id", "");
						return;
					}
					d.set_value("student_id", student);
					frappe.db.get_value("Student", student, ["destination_country", "first_name", "last_name"], (r) => {
						if (r && r.destination_country && !d.get_value("destination_country")) {
							d.set_value("destination_country", r.destination_country);
						}
					});
				},
			},
			{
				fieldname: "student_id",
				fieldtype: "Data",
				label: __("Student ID"),
				read_only: 1,
			},
			{
				fieldname: "destination_country",
				fieldtype: "Link",
				options: "Country",
				label: __("Destination Country"),
				reqd: 1,
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
				onchange() {
					d.set_value("course", "");
				},
			},
			{
				fieldname: "course",
				fieldtype: "Link",
				options: "Course",
				label: __("Course Name"),
				reqd: 1,
				get_query() {
					const uni = d.get_value("preferred_university");
					return uni ? { filters: { university: uni } } : {};
				},
			},
			{
				fieldname: "intake",
				fieldtype: "Date",
				label: __("Intake"),
				reqd: 1,
			},
		],
		primary_action_label: __("Create Application"),
		primary_action(values) {
			d.hide();
			frappe.call({
				method: "erpnext.crm.doctype.application.application.create_agent_application",
				args: values,
				freeze: true,
				freeze_message: __("Creating application…"),
				callback(r) {
					if (!r.message) {
						return;
					}
					frappe.set_route("Form", r.message.doctype, r.message.name);
				},
			});
		},
	});
	d.show();
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

// D2.1 - agents land on the Card View. List View stays one click away, and once
// they choose it we stop redirecting so the choice actually sticks.
const AGENT_LIST_VIEW_OPT_OUT = "unideft:application_list_view_preferred";

function maybe_redirect_agent_to_card_view(listview) {
	if (!user_is_agent_only()) {
		return;
	}

	let opted_out = false;
	try {
		opted_out = localStorage.getItem(AGENT_LIST_VIEW_OPT_OUT) === "1";
	} catch (e) {
		opted_out = false;
	}
	if (opted_out) {
		add_back_to_card_view_hint(listview);
		return;
	}

	// A filter or search in the route means they navigated here deliberately.
	const route_options = frappe.route_options || {};
	if (Object.keys(route_options).length) {
		return;
	}

	frappe.set_route("applications_view");
}

function add_back_to_card_view_hint(listview) {
	listview.page.add_inner_button(__("Always Open Card View"), function () {
		try {
			localStorage.removeItem(AGENT_LIST_VIEW_OPT_OUT);
		} catch (e) {
			// nothing to clear
		}
		frappe.set_route("applications_view");
	});
}

// A2 - admissions only ever receive applications, they never open a new one.
function user_is_admissions(roles) {
	return ["Admission 1", "Admission 2"].some((r) => (roles || frappe.user_roles || []).includes(r));
}

function user_can_create_application() {
	const roles = frappe.user_roles || [];
	const privileged = ["System Manager", "Administrator", "CRM Admin"].some((r) =>
		roles.includes(r)
	);
	if (privileged) {
		return true;
	}
	return !user_is_admissions(roles);
}

function bind_new_application_action(listview) {
	if (!user_can_create_application()) {
		// Belt-and-braces with the Custom DocPerm change: clear the primary action
		// so no "New Application" entry point is reachable from the list view.
		listview.page.clear_primary_action();
		return;
	}
	listview.page.set_primary_action(__("New Application"), () => {
		if (user_is_agent_only()) {
			show_agent_new_application_dialog();
		} else {
			show_new_application_country_dialog();
		}
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
			// An explicit click is a deliberate choice, so remember it.
			try {
				localStorage.removeItem(AGENT_LIST_VIEW_OPT_OUT);
			} catch (e) {
				// storage unavailable - the redirect simply stays default-on
			}
			frappe.set_route("applications_view");
		});
		maybe_redirect_agent_to_card_view(listview);
	},
	refresh: function (listview) {
		bind_new_application_action(listview);
	},
};
