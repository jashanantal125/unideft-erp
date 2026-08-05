// Copyright (c) 2026, Unideft
// Application UK Sponsor — reminders for financial / parent document flow.

function uk_sponsor_reminder(frm, options) {
	if (!frm || !frm.doctype || frm.doctype !== "Application UK") return;
	if (typeof prompt_uk_reminder !== "function") {
		frappe.msgprint(options.default_description || options.title || __("Set reminder"));
		return;
	}
	const key = options.trigger_key || options.default_description;
	if (typeof UK_REMINDER_SESSION !== "undefined") {
		UK_REMINDER_SESSION[key] = false;
	}
	prompt_uk_reminder(frm, options);
}

frappe.ui.form.on("Application UK Sponsor", {
	birth_cert_language(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.birth_cert_language === "Hindi" || row.birth_cert_language === "Other") {
			uk_sponsor_reminder(frm, {
				title: __("Translate birth certificate"),
				default_description: "UK — Translate birth certificate to English",
				trigger_key: `uk_bc_tr_${frm.doc.name}_${cdn}`,
			});
		}
	},

	birth_cert_available(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.birth_cert_available === "No") {
			uk_sponsor_reminder(frm, {
				title: __("Parents Support Affidavit"),
				default_description: "UK — Upload Parents Support Affidavit",
				trigger_key: `uk_aff_${frm.doc.name}_${cdn}`,
			});
		}
	},

	nationalized_bank(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.nationalized_bank === "No") {
			frappe.msgprint({
				title: __("Nationalized Bank Required"),
				message: __("Cannot accept — transfer funds to a nationalized bank."),
				indicator: "orange",
			});
		}
	},

	balance_certificate_available(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.balance_certificate_available === "No") {
			uk_sponsor_reminder(frm, {
				title: __("Balance Certificate"),
				default_description: "UK — Need Balance Certificate",
				trigger_key: `uk_bal_${frm.doc.name}_${cdn}`,
			});
		}
	},

	cert_same_date(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.cert_same_date === "No") {
			uk_sponsor_reminder(frm, {
				title: __("Same date documents"),
				default_description: "UK — Bank statement and balance certificate must be same date",
				trigger_key: `uk_same_dt_${frm.doc.name}_${cdn}`,
			});
		}
	},

	funds_28_day_ok(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.funds_28_day_ok === "No") {
			uk_sponsor_reminder(frm, {
				title: __("28-day funds rule"),
				default_description: "UK — Wait for statement / FD to be 28 days old",
				trigger_key: `uk_28_${frm.doc.name}_${cdn}`,
			});
		}
	},

	fd_balance_certificate_available(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.fd_balance_certificate_available === "No") {
			uk_sponsor_reminder(frm, {
				title: __("FD Balance Certificate"),
				default_description: "UK — Receive FD balance certificate",
				trigger_key: `uk_fd_bal_${frm.doc.name}_${cdn}`,
			});
		}
	},

	loan_for_education(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.loan_for_education === "No") {
			uk_sponsor_reminder(frm, {
				title: __("Revised education loan letter"),
				default_description: "UK — Need revised Education Loan Letter (education purpose)",
				trigger_key: `uk_loan_edu_${frm.doc.name}_${cdn}`,
			});
		}
	},

	loan_holder_is_student(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.loan_holder_is_student === "No") {
			uk_sponsor_reminder(frm, {
				title: __("Revised education loan letter"),
				default_description: "UK — Need revised Education Loan Letter (holder must be student)",
				trigger_key: `uk_loan_hold_${frm.doc.name}_${cdn}`,
			});
		}
	},

	loan_covers_funds(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.loan_covers_funds === "No") {
			uk_sponsor_reminder(frm, {
				title: __("Revised education loan letter"),
				default_description: "UK — Need revised Education Loan Letter (amount must cover funds)",
				trigger_key: `uk_loan_cov_${frm.doc.name}_${cdn}`,
			});
		}
	},
});
