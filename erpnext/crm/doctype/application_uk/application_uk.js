// Copyright (c) 2026, Unideft and contributors
// UK Application — field names aligned with Application (Australia) where shared.

const UK_REMINDER_SESSION = {};
const UK_LIVING = { "Inner London": 13347, "Outer London": 10224 };
const UK_FORM_VIEW_TABLES = [
	"english_test_details",
	"study_gap_proof_list",
	"uk_sponsors",
	"academic_lor_list",
	"processing_agent_details",
	"conditions_on_offer_letter",
	"supporting_documents",
];

function uk_format_reminder_datetime(date_str, time_str) {
	const time = (time_str || "09:00:00").length === 5 ? `${time_str}:00` : time_str;
	return `${date_str} ${time}`;
}

function uk_save_reminder(frm, { remind_at, description }) {
	const app = frm.doc.application;
	if (!app) {
		frappe.msgprint(__("Save the application first before setting reminders."));
		return Promise.resolve(false);
	}
	return frappe.db
		.get_list("Reminder", {
			filters: {
				reminder_doctype: "Application",
				reminder_docname: app,
				description,
				notified: 0,
			},
			limit: 1,
		})
		.then((existing) => {
			if (existing.length > 0) {
				frappe.show_alert({ message: __("Reminder already exists"), indicator: "orange" }, 3);
				return false;
			}
			return frappe
				.call({
					method: "frappe.automation.doctype.reminder.reminder.create_new_reminder",
					args: {
						remind_at,
						description,
						reminder_doctype: "Application",
						reminder_docname: app,
					},
				})
				.then((response) => !!response.message);
		});
}

function prompt_uk_reminder(frm, options) {
	const app = frm.doc.application;
	if (!app || frm.is_new()) {
		frappe.msgprint(__("Save first before setting a reminder."));
		return Promise.resolve(null);
	}
	const trigger_key = options.trigger_key || options.default_description;
	if (UK_REMINDER_SESSION[trigger_key] || UK_REMINDER_SESSION.__dialog_open) {
		return Promise.resolve(null);
	}
	UK_REMINDER_SESSION[trigger_key] = true;
	UK_REMINDER_SESSION.__dialog_open = true;

	return new Promise((resolve) => {
		let reminder_saved = false;
		const dialog = new frappe.ui.Dialog({
			title: options.title || __("Set Reminder"),
			fields: [
				{
					fieldname: "remind_date",
					fieldtype: "Date",
					label: __("Date"),
					reqd: 1,
					default: options.default_date || frappe.datetime.get_today(),
				},
				{
					fieldname: "remind_time",
					fieldtype: "Time",
					label: __("Time"),
					reqd: 1,
					default: options.default_time || "09:00:00",
				},
				{
					fieldname: "description",
					fieldtype: "Small Text",
					label: __("Remarks"),
					reqd: 1,
					default: options.default_description || "",
				},
			],
			primary_action_label: __("Set Reminder"),
			primary_action(values) {
				const remind_at = uk_format_reminder_datetime(values.remind_date, values.remind_time);
				uk_save_reminder(frm, { remind_at, description: values.description }).then((created) => {
					UK_REMINDER_SESSION.__dialog_open = false;
					if (created) {
						reminder_saved = true;
						frappe.show_alert(
							{ message: __("Reminder set: {0}", [values.description]), indicator: "green" },
							4
						);
					} else {
						UK_REMINDER_SESSION[trigger_key] = false;
					}
					dialog.hide();
					resolve(created);
				});
			},
		});
		dialog.$wrapper.on("hidden.bs.modal", function () {
			UK_REMINDER_SESSION.__dialog_open = false;
			if (!reminder_saved) UK_REMINDER_SESSION[trigger_key] = false;
			resolve(null);
		});
		dialog.show();
	});
}

function resolve_uk_case_local(higher_education, martial_status) {
	const he = (higher_education || "").trim();
	const ms = (martial_status || "").trim();
	const married = ms === "Married";
	let qual = "";
	if (he === "12th pass" || he === "12th") qual = "12th";
	else if (he === "Graduation") qual = "Graduation";
	else if (he === "Post-graduation" || he === "Masters") qual = "Post-graduation";
	if (!qual) return "UK Case 2";
	if (qual === "12th") return married ? "UK Case 1" : "UK Case 2";
	if (qual === "Graduation") return married ? "UK Case 3" : "UK Case 4";
	if (qual === "Post-graduation") return married ? "UK Case 5" : "UK Case 6";
	return "UK Case 2";
}

function sync_uk_case(frm) {
	if (!frm.doc.higher_education && !frm.doc.martial_status) return;
	const case_label = resolve_uk_case_local(frm.doc.higher_education, frm.doc.martial_status);
	frm.set_value("country_flow_case", case_label);
	frm.set_value("single_basis_only", ["UK Case 1", "UK Case 3", "UK Case 5"].includes(case_label) ? 1 : 0);
	if (!frm.is_new() && frm.doc.name) {
		frappe.call({
			method: "erpnext.crm.doctype.application_uk.application_uk.recompute_uk_case",
			args: {
				uk_application: frm.doc.name,
				higher_education: frm.doc.higher_education,
				martial_status: frm.doc.martial_status,
			},
		});
	}
}

function recalculate_uk_funds(frm) {
	const living = UK_LIVING[frm.doc.living_expenses_location] || 0;
	if (frm.doc.living_expenses_location) {
		frm.set_value("living_expenses", living);
	}
	const tuition = flt(frm.doc.full_year_tuition_fee);
	const scholarship = flt(frm.doc.scholarship);
	const payable = flt(frm.doc.payable_fee);
	frm.set_value("funds_required_amount", Math.max(tuition - scholarship, 0) + living - payable);
}

function set_uk_stage(frm, stage) {
	frm.set_value("uk_current_stage", stage);
}

function apply_b2c_agent(frm) {
	if (frm.doc.application_type !== "B2C") return;
	frappe.db.get_value("Agent", { company_name: "Unideft" }, "name").then((r) => {
		if (r.message && r.message.name && frm.doc.agent !== r.message.name) {
			frm.set_value("agent", r.message.name);
		}
	});
}

function patch_form_view_tables(frm) {
	UK_FORM_VIEW_TABLES.forEach((fieldname) => {
		const doctype = frm.meta.fields.find((df) => df.fieldname === fieldname && df.fieldtype === "Table")?.options;
		if (doctype) {
			frappe.model.with_doctype(doctype, () => {
				const meta = frappe.get_meta(doctype);
				if (meta) meta.editable_grid = 0;
			});
		}
		const control = frm.fields_dict[fieldname];
		if (control && control.grid && !control.grid._form_view_patched) {
			control.grid.allow_on_grid_editing = function () {
				return false;
			};
			control.grid._form_view_patched = true;
		}
	});
}

frappe.ui.form.on("Application UK", {
	onload(frm) {
		patch_form_view_tables(frm);
		if (frm.is_new()) {
			if (!frm.doc.uk_current_stage) frm.set_value("uk_current_stage", "Details");
			if (!frm.doc.offer_currency) frm.set_value("offer_currency", "GBP");
			if (!frm.doc.status) frm.set_value("status", "Pending");
		}
	},

	refresh(frm) {
		patch_form_view_tables(frm);
		["application", "naming_series", "country_flow_case", "single_basis_only"].forEach((fieldname) => {
			if (frm.fields_dict[fieldname]) {
				frm.set_df_property(fieldname, "hidden", 1);
			}
		});

		if (!frm.is_new() && frm.doc.application) {
			frm.add_custom_button(__("Applications List"), () => frappe.set_route("List", "Application"));
		}

		apply_b2c_agent(frm);
		recalculate_uk_funds(frm);

		if (frm.is_new() && !frm._landed_details_tab) {
			frm._landed_details_tab = true;
			setTimeout(() => {
				const tab_field = frm.get_field("details_tab");
				if (tab_field && tab_field.tab && typeof frm.set_active_tab === "function") {
					frm.set_active_tab(tab_field.tab);
				}
			}, 200);
		}
	},

	student(frm) {
		if (!frm.doc.student) return;
		frappe.db.get_doc("Student", frm.doc.student).then((stu) => {
			if (stu.email && !frm.doc.student_email) frm.set_value("student_email", stu.email);
			const contact = stu.mobile_no || stu.phone || stu.contact_no;
			if (contact && !frm.doc.student_contact_no) frm.set_value("student_contact_no", contact);
			const dob = stu.dob || stu.date_of_birth;
			if (dob && !frm.doc.dob) frm.set_value("dob", dob);
		});
	},

	application_type(frm) {
		apply_b2c_agent(frm);
	},

	higher_education(frm) {
		sync_uk_case(frm);
	},

	martial_status(frm) {
		sync_uk_case(frm);
	},

	any_visa_refused(frm) {
		if (frm.doc.any_visa_refused === "No") {
			frm.set_value("visa_refused_ok", "✓ OK");
			frm.set_value("visa_refusal_letters", "");
		}
	},

	study_gap(frm) {
		if (frm.doc.study_gap === "No") {
			frm.set_value("study_gap_ok", "✓ OK");
		}
	},

	full_year_tuition_fee(frm) {
		recalculate_uk_funds(frm);
	},
	scholarship(frm) {
		recalculate_uk_funds(frm);
	},
	payable_fee(frm) {
		recalculate_uk_funds(frm);
	},
	living_expenses_location(frm) {
		recalculate_uk_funds(frm);
	},

	application_submitted(frm) {
		if (frm.doc.application_submitted === "Yes") {
			set_uk_stage(frm, "Submitted");
			if (!frm.doc.submitted_date) frm.set_value("submitted_date", frappe.datetime.get_today());
		} else if (frm.doc.application_submitted === "No") {
			const key = `uk_submit_app_${frm.doc.name}`;
			UK_REMINDER_SESSION[key] = false;
			prompt_uk_reminder(frm, {
				title: __("When will application be submitted?"),
				default_description: "UK — Application submission follow-up",
				trigger_key: key,
			});
		}
	},

	any_further_requirement_offer_letter(frm) {
		if (frm.doc.any_further_requirement_offer_letter === "No") {
			const key = `uk_offer_followup_${frm.doc.name}`;
			UK_REMINDER_SESSION[key] = false;
			prompt_uk_reminder(frm, {
				title: __("Follow up on Offer Letter"),
				default_description: "UK — Follow up on Offer Letter",
				trigger_key: key,
			});
		}
	},

	pending_requirements_completed(frm) {
		if (frm.doc.pending_requirements_completed === "No") {
			const key = `uk_pending_req_${frm.doc.name}`;
			UK_REMINDER_SESSION[key] = false;
			prompt_uk_reminder(frm, {
				title: __("Complete Pending Requirements"),
				default_description: "UK — Complete pending offer requirements",
				trigger_key: key,
			});
		} else if (frm.doc.pending_requirements_completed === "Yes") {
			const key = `uk_offer_after_pending_${frm.doc.name}`;
			UK_REMINDER_SESSION[key] = false;
			prompt_uk_reminder(frm, {
				title: __("Follow up on Offer Letter"),
				default_description: "UK — Follow up on Offer Letter after requirements",
				trigger_key: key,
			});
		}
	},

	deposit_deadline(frm) {
		if (frm.doc.deposit_deadline) {
			const key = `uk_deposit_${frm.doc.name}`;
			UK_REMINDER_SESSION[key] = false;
			prompt_uk_reminder(frm, {
				title: __("Deposit / tuition deadline"),
				default_description: "UK — Deposit / tuition fee payment follow-up",
				default_date: frm.doc.deposit_deadline,
				trigger_key: key,
			});
		}
	},

	university_intake(frm) {
		if (frm.doc.university_intake) {
			const key = `uk_intake_${frm.doc.name}`;
			UK_REMINDER_SESSION[key] = false;
			prompt_uk_reminder(frm, {
				title: __("Intake / deposit follow-up"),
				default_description: "UK — Intake deposit deadline follow-up",
				default_date: frm.doc.university_intake,
				trigger_key: key,
			});
		}
	},

	interview_deadline_date(frm) {
		if (frm.doc.interview_deadline_date) {
			const key = `uk_interview_dl_${frm.doc.name}`;
			UK_REMINDER_SESSION[key] = false;
			prompt_uk_reminder(frm, {
				title: __("Interview deadline"),
				default_description: "UK — Interview deadline",
				default_date: frm.doc.interview_deadline_date,
				trigger_key: key,
			});
		}
	},

	funds_28_day_ok(frm) {
		if (frm.doc.funds_28_day_ok === "No") {
			prompt_uk_reminder(frm, {
				title: __("28-day funds rule"),
				default_description: "UK — Meet 28-day funds rule",
				trigger_key: `uk_28day_${frm.doc.name}`,
			});
		}
	},

	funds_meet_requirement(frm) {
		if (frm.doc.funds_meet_requirement === "No") {
			prompt_uk_reminder(frm, {
				title: __("Funds amount shortfall"),
				default_description: "UK — Funds amount does not meet requirements",
				trigger_key: `uk_funds_amt_${frm.doc.name}`,
			});
		}
	},

	medical_scheduled(frm) {
		if (frm.doc.medical_scheduled === "No") {
			prompt_uk_reminder(frm, {
				title: __("Medical schedule"),
				default_description: "UK — Schedule medical",
				trigger_key: `uk_medical_${frm.doc.name}`,
			});
		}
	},

	financial_docs_submitted(frm) {
		if (frm.doc.financial_docs_submitted === "Yes") {
			set_uk_stage(frm, "Acceptance");
		} else if (frm.doc.financial_docs_submitted === "No") {
			prompt_uk_reminder(frm, {
				title: __("Financial documents"),
				default_description: "UK — Submit financial documents",
				trigger_key: `uk_fin_docs_${frm.doc.name}`,
			});
		}
	},

	cas_letter_received(frm) {
		if (frm.doc.cas_letter_received === "Yes") {
			set_uk_stage(frm, "CAS");
			frm.set_value("cas_received", "Yes");
		} else if (frm.doc.cas_letter_received === "No") {
			prompt_uk_reminder(frm, {
				title: __("Waiting for CAS letter"),
				default_description: "UK — Follow up for CAS letter",
				trigger_key: `uk_cas_wait_${frm.doc.name}`,
			});
		}
	},

	visa_file_lodged(frm) {
		if (frm.doc.visa_file_lodged === "Yes") {
			set_uk_stage(frm, "Visa Lodged");
		} else if (frm.doc.visa_file_lodged === "No") {
			prompt_uk_reminder(frm, {
				title: __("Lodge visa file"),
				default_description: "UK — Visa file lodge follow-up",
				trigger_key: `uk_lodge_${frm.doc.name}`,
			});
		}
	},

	biometrics_done(frm) {
		if (frm.doc.biometrics_done === "No") {
			prompt_uk_reminder(frm, {
				title: __("Complete biometrics"),
				default_description: "UK — Biometrics completion follow-up",
				default_date: frm.doc.biometric_date || frappe.datetime.get_today(),
				trigger_key: `uk_bio_${frm.doc.name}`,
			});
		}
	},

	expected_visa_decision(frm) {
		if (frm.doc.expected_visa_decision) {
			prompt_uk_reminder(frm, {
				title: __("Expected visa decision"),
				default_description: "UK — Expected visa decision follow-up",
				default_date: frm.doc.expected_visa_decision,
				trigger_key: `uk_visa_dec_${frm.doc.name}`,
			});
		}
	},

	visa_decision(frm) {
		if (frm.doc.visa_decision === "Visa Approved" || frm.doc.visa_decision === "Granted") {
			set_uk_stage(frm, "Visa");
		} else if (frm.doc.visa_decision === "Visa Refused" || frm.doc.visa_decision === "Refused") {
			set_uk_stage(frm, "Visa Refused");
		}
	},

	student_enrolled(frm) {
		if (frm.doc.student_enrolled) {
			set_uk_stage(frm, "Enrolment");
		} else {
			prompt_uk_reminder(frm, {
				title: __("Enrolment follow-up"),
				default_description: "UK — Student enrolment follow-up",
				trigger_key: `uk_enrol_${frm.doc.name}`,
			});
		}
	},

	applied_for_refund(frm) {
		if (frm.doc.applied_for_refund === "Yes") {
			set_uk_stage(frm, "Refund");
		} else if (frm.doc.applied_for_refund === "No") {
			prompt_uk_reminder(frm, {
				title: __("Apply for refund"),
				default_description: "UK — Apply for refund follow-up",
				trigger_key: `uk_refund_app_${frm.doc.name}`,
			});
		}
	},
});
