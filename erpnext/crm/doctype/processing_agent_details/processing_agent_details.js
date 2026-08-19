// Copyright (c) 2026, Unideft
// Keep in sync with application_uk.js Processing Agent Details handlers.

const DEFAULT_DIRECT_COMPANY = "Unideft Education Services Pvt. Ltd.";

function selected_processing_university(frm) {
	return frm.doc.preferred_university || frm.doc.university_name || "";
}

function configure_processing_vendor_query(frm) {
	frm.set_query("processing_agent_vendor", "processing_agent_details", () => ({
		query: "erpnext.crm.doctype.application.application.get_processing_vendor_options",
		filters: {
			university: selected_processing_university(frm),
		},
	}));
}

function set_direct_processing_company(frm, cdt, cdn) {
	const university = selected_processing_university(frm);
	if (!university) {
		frappe.model.set_value(cdt, cdn, "our_company", DEFAULT_DIRECT_COMPANY);
		frappe.model.set_value(cdt, cdn, "processing_agent_direct", DEFAULT_DIRECT_COMPANY);
		return;
	}

	frappe.db
		.get_value("University", university, "direct_processing_company")
		.then((response) => {
			const company =
				response.message?.direct_processing_company || DEFAULT_DIRECT_COMPANY;
			frappe.model.set_value(cdt, cdn, "our_company", company);
			frappe.model.set_value(cdt, cdn, "processing_agent_direct", company);
		});
}

function sync_processing_agent_row(frm, cdt, cdn) {
	const row = locals[cdt][cdn];
	if (!row) return;

	if (row.processing_agent_type === "Direct") {
		if (row.processing_agent_vendor) {
			frappe.model.set_value(cdt, cdn, "processing_agent_vendor", "");
		}
		set_direct_processing_company(frm, cdt, cdn);
	} else if (row.processing_agent_type === "Vendor") {
		if (row.our_company) {
			frappe.model.set_value(cdt, cdn, "our_company", "");
		}
		frappe.model.set_value(cdt, cdn, "processing_agent_direct", row.processing_agent_vendor || "");
		configure_processing_vendor_query(frm);
	}
}

frappe.ui.form.on("Processing Agent Details", {
	form_render(frm, cdt, cdn) {
		configure_processing_vendor_query(frm);
		sync_processing_agent_row(frm, cdt, cdn);
	},
	processing_agent_type(frm, cdt, cdn) {
		sync_processing_agent_row(frm, cdt, cdn);
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
