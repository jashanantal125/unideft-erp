// Copyright (c) 2026, Unideft and contributors
// For license information, please see license.txt

// B3 - Student opens on the Card View for every role, with List View one click
// away. Choosing List View is remembered so the list does not bounce back.
const STUDENT_LIST_VIEW_OPT_OUT = "unideft:student_list_view_preferred";

function student_prefers_list_view() {
	try {
		return localStorage.getItem(STUDENT_LIST_VIEW_OPT_OUT) === "1";
	} catch (e) {
		return false;
	}
}

function bind_student_card_view(listview) {
	listview.page.add_inner_button(__("Card View"), function () {
		try {
			localStorage.removeItem(STUDENT_LIST_VIEW_OPT_OUT);
		} catch (e) {
			// storage unavailable - the redirect simply stays default-on
		}
		frappe.set_route("students_view");
	});
}

function maybe_redirect_to_student_card_view() {
	if (student_prefers_list_view()) {
		return;
	}
	// A filter or search in the route means the user navigated here on purpose.
	if (Object.keys(frappe.route_options || {}).length) {
		return;
	}
	frappe.set_route("students_view");
}

frappe.listview_settings["Student"] = {
	add_fields: ["student_id", "destination_country", "email", "mobile"],

	onload(listview) {
		bind_student_card_view(listview);
		maybe_redirect_to_student_card_view();
	},

	refresh(listview) {
		bind_student_card_view(listview);
	},
};
