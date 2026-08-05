// Copyright (c) 2026, Unideft
// Handlers also live in application_uk.js — keep this file minimal to avoid double grid resets.

frappe.ui.form.on("Processing Agent Details", {
	processing_agent_type(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row) return;
		if (row.processing_agent_type === "Direct") {
			frappe.model.set_value(cdt, cdn, "processing_agent_direct", "Unideft");
			frappe.model.set_value(cdt, cdn, "processing_agent_vendor", "");
		}
	},
	processing_agent_vendor(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row || row.processing_agent_type !== "Vendor") return;
		frappe.model.set_value(cdt, cdn, "processing_agent_direct", row.processing_agent_vendor || "");
	},
});
