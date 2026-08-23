// Copyright (c) 2026, Unideft and contributors
// For license information, please see license.txt

frappe.ui.form.on("Accounts OSHC Payment", {
	refresh(frm) {
		if (frm.doc.application) {
			frm.add_custom_button(__("Open Application"), () =>
				frappe.set_route("Form", "Application", frm.doc.application)
			);
		}
	},

	oshc_amount_paid(frm) {
		unideft.accounts.follow_up(frm, frm.doc.oshc_amount_paid, "Follow-up for OSHC Payment");
	},
});
