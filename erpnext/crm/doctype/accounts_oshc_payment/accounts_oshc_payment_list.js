frappe.listview_settings["Accounts OSHC Payment"] = {
	add_fields: ["workflow_status"],
	hide_name_column: true,
	get_indicator(doc) {
		const colors = { Pending: "orange", Completed: "green" };
		return [__(doc.workflow_status), colors[doc.workflow_status] || "gray", "workflow_status,=," + doc.workflow_status];
	},
};