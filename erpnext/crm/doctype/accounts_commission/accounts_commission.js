// Copyright (c) 2026, Unideft and contributors
// For license information, please see license.txt

function reminder_label(frm) {
	return `Follow-up for ${frm.doc.commission_type} Commission Receipt`;
}

frappe.ui.form.on("Accounts Commission", {
	refresh(frm) {
		if (frm.doc.application) {
			frm.add_custom_button(__("Open Application"), () =>
				frappe.set_route("Form", "Application", frm.doc.application)
			);
		}
		frm.set_intro("");
		if (frm.doc.status === "Received") {
			frm.set_intro(__("This commission is fully received and the record is closed."), "green");
		} else if (frm.doc.commission_type === "Tuition Fee" && frm.doc.total_commission_received) {
			frm.set_intro(
				__("Received so far: {0}", [
					format_currency(frm.doc.total_commission_received),
				]),
				"blue"
			);
		}
	},

	commission_received(frm) {
		unideft.accounts.follow_up(frm, frm.doc.commission_received, reminder_label(frm));
	},

	outstanding_commission_received(frm) {
		unideft.accounts.follow_up(
			frm,
			frm.doc.outstanding_commission_received,
			"Follow-up for Outstanding Commission"
		);
	},

	outstanding_commission(frm) {
		if (frm.doc.outstanding_commission === "No") {
			unideft.accounts.clear_reminder(frm, "Follow-up for Outstanding Commission");
			unideft.accounts.clear_reminder(frm, reminder_label(frm));
		}
	},
});
