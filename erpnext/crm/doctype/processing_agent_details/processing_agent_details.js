// Copyright (c) 2026, Unideft
// Keep in sync with application_uk.js Processing Agent Details handlers.

const DEFAULT_DIRECT_COMPANY = "Unideft Education Services Pvt. Ltd.";

function sync_processing_agent_row(cdt, cdn) {
	const row = locals[cdt][cdn];
	if (!row) return;

	if (row.processing_agent_type === "Direct") {
		if (!row.our_company) {
			frappe.model.set_value(cdt, cdn, "our_company", DEFAULT_DIRECT_COMPANY);
		}
		if (row.processing_agent_vendor) {
			frappe.model.set_value(cdt, cdn, "processing_agent_vendor", "");
		}
		frappe.model.set_value(cdt, cdn, "processing_agent_direct", row.our_company || DEFAULT_DIRECT_COMPANY);
	} else if (row.processing_agent_type === "Vendor") {
		if (row.our_company) {
			frappe.model.set_value(cdt, cdn, "our_company", "");
		}
		frappe.model.set_value(cdt, cdn, "processing_agent_direct", row.processing_agent_vendor || "");
	}
}

frappe.ui.form.on("Processing Agent Details", {
	processing_agent_type(frm, cdt, cdn) {
		sync_processing_agent_row(cdt, cdn);
	},
	our_company(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row || row.processing_agent_type !== "Direct") return;
		frappe.model.set_value(cdt, cdn, "processing_agent_direct", row.our_company || "");
	},
	processing_agent_vendor(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row || row.processing_agent_type !== "Vendor") return;
		frappe.model.set_value(cdt, cdn, "processing_agent_direct", row.processing_agent_vendor || "");
	},
});
