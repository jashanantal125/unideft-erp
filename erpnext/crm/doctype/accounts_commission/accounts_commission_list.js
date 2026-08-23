frappe.listview_settings["Accounts Commission"] = {
	add_fields: ["commission_type", "status"],
	hide_name_column: true,
	get_indicator(doc) {
		const colors = { Pending: "orange", Processing: "blue", Received: "green" };
		return [__(doc.status), colors[doc.status] || "gray", "status,=," + doc.status];
	},
};
