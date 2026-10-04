// Copyright (c) 2026, Unideft and contributors
// For license information, please see license.txt

frappe.listview_settings["Assessment Request"] = {
	add_fields: ["status", "assigned_team", "docstatus"],
	has_indicator_for_draft: true,
	get_indicator(doc) {
		const colors = {
			Draft: "red",
			Submitted: "orange",
			"In Review": "yellow",
			Shortlisted: "blue",
			Accepted: "purple",
			"Converted to Application": "green",
		};
		const status = doc.docstatus === 0 ? "Draft" : doc.status;
		return [__(status), colors[status] || "gray", `status,=,${status}`];
	},
};
