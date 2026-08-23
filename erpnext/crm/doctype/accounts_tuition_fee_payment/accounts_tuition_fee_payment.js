// Copyright (c) 2026, Unideft and contributors
// For license information, please see license.txt

function recalculate(frm) {
	const rate = flt(frm.doc.currency_exchange_rate);
	const total =
		flt(frm.doc.latest_payable_fee) * rate +
		flt(frm.doc.forex_topup_fee) +
		flt(frm.doc.processing_fee) +
		flt(frm.doc.swift_nostro_charges) +
		flt(frm.doc.gst) +
		flt(frm.doc.tcs);
	const commission =
		(flt(frm.doc.actual_payable_fee) * rate * flt(frm.doc.our_commission_percentage)) / 100;
	const paid = (frm.doc.fee_payers || []).reduce((sum, row) => sum + flt(row.amount_paid_inr), 0);

	frm.set_value("total_fee_payable_inr", total);
	frm.set_value("actual_commission_inr", commission);
	frm.set_value("total_paid_by_payers", paid);
}

const CALC_FIELDS = [
	"latest_payable_fee",
	"currency_exchange_rate",
	"forex_topup_fee",
	"processing_fee",
	"swift_nostro_charges",
	"gst",
	"tcs",
	"actual_payable_fee",
	"our_commission_percentage",
];

const handlers = {
	refresh(frm) {
		if (frm.doc.application) {
			frm.add_custom_button(__("Open Application"), () =>
				frappe.set_route("Form", "Application", frm.doc.application)
			);
		}
		frm.set_df_property("mark_completed", "read_only", frm.doc.workflow_status === "Completed");
	},

	tuition_fee_paid(frm) {
		unideft.accounts.follow_up(
			frm,
			frm.doc.tuition_fee_paid,
			"Follow-up for Tuition Fee Payment"
		);
	},

	tt_copy_received(frm) {
		unideft.accounts.follow_up(frm, frm.doc.tt_copy_received, "Follow-up for TT Copy");
	},

	number_of_accounts_used(frm) {
		// Keep one Fee Payer row per bank account so payer KYC and UTR stay together.
		const wanted = { One: 1, Two: 2, Three: 3 }[frm.doc.number_of_accounts_used] || 0;
		const rows = frm.doc.fee_payers || [];
		for (let i = rows.length; i < wanted; i++) {
			frm.add_child("fee_payers");
		}
		while ((frm.doc.fee_payers || []).length > wanted) {
			const last = frm.doc.fee_payers[frm.doc.fee_payers.length - 1];
			frm.get_field("fee_payers").grid.grid_rows_by_docname[last.name].remove();
		}
		frm.refresh_field("fee_payers");
	},
};

CALC_FIELDS.forEach((fieldname) => {
	handlers[fieldname] = recalculate;
});

frappe.ui.form.on("Accounts Tuition Fee Payment", handlers);

frappe.ui.form.on("Accounts Fee Payer", {
	amount_paid_inr(frm) {
		recalculate(frm);
	},
	fee_payers_remove(frm) {
		recalculate(frm);
	},
});
