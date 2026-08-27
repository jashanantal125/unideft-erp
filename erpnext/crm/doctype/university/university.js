// Copyright (c) 2025, Unideft and contributors
// For license information, please see license.txt

frappe.ui.form.on("University", {
	group_name_applicable(frm) {
		if (frm.doc.group_name_applicable !== "Yes") {
			frm.set_value("university_group", "");
		}
	},

	contract_type(frm) {
		if (frm.doc.contract_type !== "Conditional") {
			frm.set_value("expected_unconditional_date", "");
		}
	},

	contract_end_date(frm) {
		if (frm.doc.contract_end_date) {
			frm.set_value(
				"renewal_reminder_date",
				frappe.datetime.add_days(frm.doc.contract_end_date, -30)
			);
		} else {
			frm.set_value("renewal_reminder_date", "");
		}
	},

	portal_available(frm) {
		if (frm.doc.portal_available !== "Yes") {
			frm.set_value("portal_link", "");
			frm.set_value("portal_login_id", "");
			frm.set_value("portal_password", "");
		}
	},

	country_wise_commission(frm) {
		if (frm.doc.country_wise_commission !== "Yes") {
			frm.clear_table("country_commissions");
			frm.refresh_field("country_commissions");
		}
	},

	extra_bonus_available(frm) {
		if (frm.doc.extra_bonus_available !== "Yes") {
			frm.set_value("country_wise_bonus", "");
			frm.set_value("university_wise_bonus", "");
			frm.clear_table("country_bonuses");
			frm.clear_table("university_bonuses");
			frm.refresh_field("country_bonuses");
			frm.refresh_field("university_bonuses");
		}
	},

	country_wise_bonus(frm) {
		if (frm.doc.country_wise_bonus !== "Yes") {
			frm.clear_table("country_bonuses");
			frm.refresh_field("country_bonuses");
		}
	},

	university_wise_bonus(frm) {
		if (frm.doc.university_wise_bonus !== "Yes") {
			frm.clear_table("university_bonuses");
			frm.refresh_field("university_bonuses");
		}
	},

	commission_info_source(frm) {
		if (frm.doc.commission_info_source !== "Portal") {
			frm.set_value("use_existing_portal_credentials", "");
			frm.set_value("commission_portal_link", "");
			frm.set_value("commission_login_id", "");
			frm.set_value("commission_password", "");
		}
		if (frm.doc.commission_info_source !== "Email") {
			frm.set_value("commission_email_attachment", "");
		}
	},

	use_existing_portal_credentials(frm) {
		if (frm.doc.use_existing_portal_credentials === "Same") {
			frm.set_value("commission_portal_link", frm.doc.portal_link || "");
			frm.set_value("commission_login_id", frm.doc.portal_login_id || "");
		} else if (frm.doc.use_existing_portal_credentials !== "Different") {
			frm.set_value("commission_portal_link", "");
			frm.set_value("commission_login_id", "");
			frm.set_value("commission_password", "");
		}
	},
});

frappe.ui.form.on("University Admission Contact", {
	countries(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row) return;
		const parts = String(row.countries || "")
			.split(/[\n,;]+/)
			.map((p) => p.trim())
			.filter(Boolean);
		const unique = [...new Set(parts)];
		if (unique.join(", ") !== row.countries) {
			frappe.model.set_value(cdt, cdn, "countries", unique.join(", "));
		}
	},
});
