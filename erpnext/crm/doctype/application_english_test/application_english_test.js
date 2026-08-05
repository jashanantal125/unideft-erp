// Copyright (c) 2026, Unideft

const ENGLISH_VALIDITY_DEFAULTS = {
	IELTS: 24,
	"UKVI IELTS": 24,
	PTE: 24,
	"UKVI PTE": 24,
	TOEFL: 24,
	Duolingo: 24,
};

frappe.ui.form.on("Application English Test", {
	test_type(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		const months = ENGLISH_VALIDITY_DEFAULTS[row.test_type];
		if (months) {
			if (!row.validity_months) {
				frappe.model.set_value(cdt, cdn, "validity_months", months);
			}
		} else {
			frappe.model.set_value(cdt, cdn, "validity_months", "");
			frappe.model.set_value(cdt, cdn, "validity_until", "");
			frappe.model.set_value(cdt, cdn, "validity_status", "");
		}
	},
});
