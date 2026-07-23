// Copyright (c) 2025, Unideft and contributors
// For license information, please see license.txt

const AU_REMINDER_SESSION = {};

function format_reminder_datetime(date_str, time_str) {
	const time = (time_str || "09:00:00").length === 5 ? `${time_str}:00` : time_str;
	return `${date_str} ${time}`;
}

function has_offer_letter_condition(frm, keyword) {
	const rows = frm.doc.conditions_on_offer_letter || [];
	if (!Array.isArray(rows) || !keyword) {
		return false;
	}
	const needle = keyword.toLowerCase();
	return rows.some((row) => String(row.condition || "").toLowerCase().includes(needle));
}

function refresh_financial_condition_sections(frm) {
	if (!frm.layout) {
		return;
	}
	[
		"conditions_note",
		"interview_condition_section",
		"interview_timing",
		"interview_deadline_date",
		"english_requirement_section",
		"english_requirement_details",
		"english_requirement_documents",
		"gap_justification_section",
		"gap_justification_details",
		"gap_justification_documents",
		"verification_section",
		"verification_type",
		"academic_transcript_section",
		"academic_transcript_details",
		"academic_transcript_documents",
		"other_condition_section",
		"other_condition_details",
		"other_condition_documents",
	].forEach((fieldname) => {
		const field = frm.fields_dict[fieldname];
		if (field) {
			field.refresh();
		}
	});
}

function sync_financial_condition_visibility(frm) {
	const condition_field_map = {
		Interview: ["interview_condition_section", "interview_timing", "interview_deadline_date"],
		"English Requirement": [
			"english_requirement_section",
			"english_requirement_details",
			"english_requirement_documents",
		],
		"Gap Justification": [
			"gap_justification_section",
			"gap_justification_details",
			"gap_justification_documents",
		],
		Verification: ["verification_section", "verification_type"],
		"Academic Transcript": [
			"academic_transcript_section",
			"academic_transcript_details",
			"academic_transcript_documents",
		],
		Other: ["other_condition_section", "other_condition_details", "other_condition_documents"],
	};

	Object.entries(condition_field_map).forEach(([keyword, fieldnames]) => {
		const show = has_offer_letter_condition(frm, keyword);
		fieldnames.forEach((fieldname) => {
			if (frm.fields_dict[fieldname]) {
				frm.set_df_property(fieldname, "hidden", show ? 0 : 1);
			}
		});
	});

	const has_conditions = (frm.doc.conditions_on_offer_letter || []).length > 0;
	if (frm.fields_dict.conditions_note) {
		frm.set_df_property("conditions_note", "hidden", has_conditions ? 1 : 0);
	}
}

function save_application_reminder(frm, { remind_at, description }) {
	return frappe.db
		.get_list("Reminder", {
			filters: {
				reminder_doctype: "Application",
				reminder_docname: frm.doc.name,
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
						reminder_docname: frm.doc.name,
					},
				})
				.then((response) => !!response.message);
		});
}

function activate_application_tab(frm, tab_fieldname, tab_label) {
	try {
		const tab_field = frm.get_field(tab_fieldname);
		if (tab_field && tab_field.tab && typeof frm.set_active_tab === "function") {
			frm.set_active_tab(tab_field.tab);
			return;
		}
	} catch (e) {
		// fall through
	}

	const $link = frm.$wrapper
		.find(".form-tabs .nav-link")
		.filter(function () {
			const text = ($(this).text() || "").trim();
			const df = $(this).attr("data-fieldname") || "";
			return df === tab_fieldname || text === tab_label || text === __(tab_label);
		})
		.first();

	if ($link.length) {
		$link.trigger("click");
	} else {
		frm.scroll_to_field(tab_fieldname);
	}
}

function prompt_legacy_reminder(frm, specificDate, description, trigger_prefix) {
	let default_date = frappe.datetime.get_today();
	if (specificDate) {
		if (typeof specificDate === "string") {
			default_date = specificDate.split(" ")[0];
		} else {
			try {
				default_date = frappe.datetime.obj_to_str(specificDate).split(" ")[0];
			} catch (e) {
				default_date = frappe.datetime.get_today();
			}
		}
	}

	return prompt_application_reminder(frm, {
		title: __("Set Reminder"),
		default_description: description || __("Follow up"),
		default_date: default_date,
		trigger_key: `${trigger_prefix || "legacy"}_${frappe.scrub(description || "reminder")}_${frm.doc.name}`,
	});
}

const APPLICATION_ATTACH_STAGE_MAP = {
	school_docs_pdf: "Processing — Academics",
	passport_upload: "Processing — Passport",
	application_form_1_upload: "Processing — Applications",
	application_form_2_upload: "Processing — Applications",
	application_form_3_upload: "Processing — Applications",
	application_form_4_upload: "Processing — Applications",
	sop_upload: "Processing — Applications",
	sop_portal_or_vendor_upload: "Processing — Applications",
	sponsor_1_docs_pdf_upload: "Submitted — Funds & Documents",
	sponsor_2_docs_pdf_upload: "Submitted — Funds & Documents",
	sponsor_3_docs_pdf_upload: "Submitted — Funds & Documents",
	gs_sop_upload: "Submitted — GS & Affidavits",
	gs_form_1_upload: "Submitted — GS & Affidavits",
	gs_form_2_upload: "Submitted — GS & Affidavits",
	sponsorship_affidavit_upload: "Submitted — GS & Affidavits",
	student_affidavit_upload: "Submitted — GS & Affidavits",
	requirement_document_upload: "GS Processing",
	shop_act_additional_document: "Financial / Sponsors",
	tuition_fee_upload: "GS Approved",
	gha_oshc_upload: "GS Approved",
	agent_oshc_upload: "GS Approved",
	student_oshc_upload: "GS Approved",
	acceptance_requirement_upload: "Acceptance",
	coe_uploaded: "COE",
	agent_medical_upload: "COE",
	student_medical_upload: "COE",
	form_956a_upload: "COE",
	visa_sop_upload: "COE",
	original_funds_upload: "COE",
	financial_matrix_upload: "COE",
	visa_application_upload: "COE",
	immi_acknowledgement_upload: "File Lodged",
	hap_id_upload: "File Lodged",
	visa_copy_upload: "Visa",
	spouse_visa_upload: "Visa",
	refused_letter_upload: "Visa Refused",
	refund_form_upload: "Visa Refused",
	oshc_refund_form_upload: "Visa Refused",
	oshc_refund_invoice_upload: "Refund Processing",
	close_case_upload_issue_resolved: "Refunded",
	close_case_upload_no_issue: "Refunded",
};

function refresh_documents_by_stage(frm) {
	if (!frm.doc.name || frm.doc.__islocal || !frm.fields_dict.documents_by_stage) {
		return;
	}

	frm.fields_dict.documents_by_stage.$wrapper.html(
		`<div class="text-muted" style="padding:8px;">${__("Loading documents…")}</div>`
	);

	frappe.call({
		method: "erpnext.crm.doctype.application.application.get_application_documents_by_stage",
		args: { name: frm.doc.name },
		callback(r) {
			const groups = (r && r.message) || {};
			frm.fields_dict.documents_by_stage.$wrapper.html(render_documents_by_stage_html(groups));
		},
		error() {
			frm.fields_dict.documents_by_stage.$wrapper.html(
				`<div class="text-danger" style="padding:8px;">${__("Could not load documents")}</div>`
			);
		},
	});
}

function render_documents_by_stage_html(groups) {
	const stage_names = Object.keys(groups || {});
	if (!stage_names.length) {
		return `<div class="text-muted" style="padding:10px;">${__("No documents uploaded yet")}</div>`;
	}

	let html = `<div class="documents-by-stage" style="padding:4px 0;">`;
	stage_names.forEach((stage) => {
		const files = groups[stage] || [];
		html += `
			<div style="margin:0 0 14px 0; border:1px solid var(--border-color); border-radius:8px; overflow:hidden;">
				<div style="background:var(--bg-light-gray); padding:8px 12px; font-weight:600;">
					${frappe.utils.escape_html(stage)}
					<span class="text-muted" style="font-weight:400;">(${files.length})</span>
				</div>
				<div style="padding:8px 12px;">`;
		files.forEach((file) => {
			const label = file.field_label
				? `${file.field_label}: ${file.file_name}`
				: file.file_name;
			html += `
				<div style="display:flex; justify-content:space-between; gap:12px; padding:4px 0; border-bottom:1px dashed var(--border-color);">
					<a href="${frappe.utils.escape_html(file.file_url)}" target="_blank" rel="noopener">
						${frappe.utils.escape_html(label)}
					</a>
					<span class="text-muted" style="white-space:nowrap;">${frappe.utils.escape_html(file.creation || "")}</span>
				</div>`;
		});
		html += `</div></div>`;
	});
	html += `</div>`;
	return html;
}

function prompt_application_reminder(frm, options) {
	if (!frm.doc.name || frm.doc.__islocal) {
		frappe.msgprint(__("Please save the Application first before setting a reminder."));
		return Promise.resolve(null);
	}

	const trigger_key = options.trigger_key || options.default_description;

	// Lock immediately so duplicate field-change events can't open a second dialog
	if (AU_REMINDER_SESSION[trigger_key] || AU_REMINDER_SESSION.__dialog_open) {
		return Promise.resolve(null);
	}
	AU_REMINDER_SESSION[trigger_key] = true;
	AU_REMINDER_SESSION.__dialog_open = true;

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
				const remind_at = format_reminder_datetime(values.remind_date, values.remind_time);
				save_application_reminder(frm, {
					remind_at,
					description: values.description,
				}).then((created) => {
					AU_REMINDER_SESSION.__dialog_open = false;
					if (created) {
						reminder_saved = true;
						frappe.show_alert(
							{ message: __("Reminder set: {0}", [values.description]), indicator: "green" },
							4
						);
						if (options.on_success) {
							options.on_success(values);
						}
					} else {
						// Allow retry if save failed / already existed
						AU_REMINDER_SESSION[trigger_key] = false;
					}
					dialog.hide();
					resolve(created);
				});
			},
		});

		dialog.$wrapper.on("hidden.bs.modal", function () {
			AU_REMINDER_SESSION.__dialog_open = false;
			// If user closed without saving, allow opening again (e.g. date field change)
			if (!reminder_saved) {
				AU_REMINDER_SESSION[trigger_key] = false;
			}
			resolve(null);
		});

		dialog.show();
	});
}

function maybe_prompt_submitted_reminders(frm) {
	if (!frm.doc.name || frm.doc.__islocal) {
		return;
	}

	// Offer letter further requirement branch
	if (frm.doc.any_further_requirement_offer_letter === "No") {
		prompt_application_reminder(frm, {
			title: __("Follow up on Offer Letter"),
			default_description: "Follow up on Offer Letter",
			trigger_key: `submitted_followup_${frm.doc.name}`,
		});
	} else if (frm.doc.any_further_requirement_offer_letter === "Yes") {
		if (frm.doc.pending_requirements_completed === "No") {
			prompt_application_reminder(frm, {
				title: __("Complete Pending Requirements"),
				default_description: "To Complete Pending requirements",
				trigger_key: `submitted_pending_${frm.doc.name}`,
			});
		} else if (frm.doc.pending_requirements_completed === "Yes") {
			prompt_application_reminder(frm, {
				title: __("Follow up on Offer Letter"),
				default_description: "Follow up on Offer Letter",
				trigger_key: `submitted_followup_after_pending_${frm.doc.name}`,
			});
		}
	}
}

function maybe_prompt_financial_completion_reminder(frm) {
	if (frm.doc.gs_submitted !== "No") {
		return;
	}
	prompt_application_reminder(frm, {
		title: __("Set Financial Completion Reminder"),
		default_description: "When financials will be completed",
		default_date: frm.doc.gs_submitted_reminder_date || frappe.datetime.get_today(),
		trigger_key: `financial_completion_${frm.doc.name}`,
		on_success(values) {
			if (values && values.remind_date) {
				frm.set_value("gs_submitted_reminder_date", values.remind_date);
			}
		},
	});
}

function sync_gs_interview_stage_from_financials(frm) {
	// Client rule: GS Processing interview block comes directly when
	// Financials Interview condition timing = Before Acceptance
	const has_interview = has_offer_letter_condition(frm, "Interview");
	const before_acceptance = frm.doc.interview_timing === "Before Acceptance";
	const should_enable = has_interview && before_acceptance;

	if (should_enable && !frm.doc.interview_stage_available) {
		frm.set_value("interview_stage_available", 1);
	}
}

function is_defer_offer_required(doc) {
	return doc.defer_offer_required === "Yes" || doc.defer_offer_required === 1 || doc.defer_offer_required === "1";
}

function maybe_prompt_defer_offer_reminders(frm) {
	if (!frm.doc.name || frm.doc.__islocal || !is_defer_offer_required(frm.doc)) {
		return;
	}

	if (frm.doc.applied_for_defer_offer_letter === "No") {
		prompt_application_reminder(frm, {
			title: __("Follow up on Defer Offer Letter"),
			default_description: "Follow up on Defer Offer Letter",
			trigger_key: `defer_followup_not_applied_${frm.doc.name}`,
		});
		return;
	}

	if (frm.doc.applied_for_defer_offer_letter !== "Yes") {
		return;
	}

	if (frm.doc.defer_any_further_requirement === "No") {
		prompt_application_reminder(frm, {
			title: __("Follow up on Defer Offer Letter"),
			default_description: "Follow up on Defer Offer Letter",
			trigger_key: `defer_followup_no_req_${frm.doc.name}`,
		});
	} else if (frm.doc.defer_any_further_requirement === "Yes") {
		if (frm.doc.defer_pending_requirements_completed === "No") {
			prompt_application_reminder(frm, {
				title: __("Complete Pending Defer Requirements"),
				default_description: "To Complete Pending requirements",
				trigger_key: `defer_pending_${frm.doc.name}`,
			});
		} else if (frm.doc.defer_pending_requirements_completed === "Yes") {
			prompt_application_reminder(frm, {
				title: __("Follow up on Offer Letter"),
				default_description: "Follow up on Offer Letter",
				trigger_key: `defer_followup_after_pending_${frm.doc.name}`,
			});
		}
	}
}

function maybe_prompt_intake_reminder(frm, intake_date, offer_type) {
	if (!intake_date || !frm.doc.name || frm.doc.__islocal) {
		return;
	}
	const description = `Decide deadline for deposit - ${offer_type}`;
	prompt_application_reminder(frm, {
		title: __("Set Deposit Deadline Reminder"),
		default_description: description,
		default_date: intake_date,
		trigger_key: `intake_${offer_type}_${frm.doc.name}`,
	});
}

function country_code_to_flag_emoji(code) {
	if (!code || typeof code !== "string") {
		return "";
	}
	const cc = code.trim().toUpperCase();
	if (!/^[A-Z]{2}$/.test(cc)) {
		return "";
	}
	// Regional Indicator Symbols: A → 🇦
	return String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0)));
}

const _application_country_flag_cache = {};

function refresh_application_country_flag(frm) {
	if (!frm || !frm.page) {
		return;
	}

	const base_title = frm.doc.name || __("New Application");
	const country = frm.doc.destination_country;

	const apply_title = (flag) => {
		// Flag sits in front of the application code in the form header
		frm.page.set_title(flag ? `${flag}  ${base_title}` : base_title);
	};

	if (!country) {
		apply_title("");
		return;
	}

	if (Object.prototype.hasOwnProperty.call(_application_country_flag_cache, country)) {
		apply_title(_application_country_flag_cache[country]);
		return;
	}

	frappe.db.get_value("Country", country, "code").then((r) => {
		const code = r && r.message && r.message.code;
		const flag = country_code_to_flag_emoji(code) || "";
		_application_country_flag_cache[country] = flag;
		apply_title(flag);
	});
}

frappe.ui.form.on("Application", {
	onload(frm) {
		// Force form view (modal) for child tables that should open in dialog on Add Row
		const form_view_tables = ["spouse_details_list", "table_ihmq"];
		form_view_tables.forEach((fieldname) => {
			const doctype = frm.meta.fields.find((df) => df.fieldname === fieldname && df.fieldtype === "Table")?.options;
			if (doctype) {
				frappe.model.with_doctype(doctype, () => {
					const meta = frappe.get_meta(doctype);
					if (meta) meta.editable_grid = 0;
				});
			}
		});
	},

	refresh(frm) {
		// Force Spouse Details and C. Sponsors tables to open in form/modal on Add Row
		["spouse_details_list", "table_ihmq"].forEach((fieldname) => {
			const control = frm.fields_dict[fieldname];
			if (control && control.grid && !control.grid._form_view_patched) {
				control.grid.allow_on_grid_editing = function () {
					return false;
				};
				control.grid._form_view_patched = true;
			}
		});

		// Hide assigned fields for Agents (keep visible for System Manager, Team Lead, Executive)
		if (frappe.user.has_role("Agent") || frappe.user.has_role("B2B Agent") || frappe.user.has_role("B2C Agent")) {
			// Only hide if NOT a Team Lead or Executive (in case of multiple roles)
			if (!frappe.user.has_role("Team Lead") && !frappe.user.has_role("Team Executive") && !frappe.user.has_role("System Manager")) {
				frm.set_df_property("assigned_team", "hidden", 1);
				frm.set_df_property("assigned_executive", "hidden", 1);
				// Hide standard Assign To sidebar
				if (frm.page.sidebar) {
					frm.page.sidebar.find('.form-assignments').parent().hide();
				}
			}
		}

		// Filter email suggestions to exclude other agents
		// Hook into the standard email compose dialog if possible, or standard email field
		// Note: Standard email dialog filtering is global, but we can try to restrict visibility via permissions
		// For now, we ensure the agent can only see their own application data.

		// Show/hide agent field based on application type
		if (frm.doc.application_type === "B2B" || frm.doc.application_type === "B2C") {
			frm.set_df_property("agent", "hidden", 0);

			// For B2C: Auto-set to Unideft and make read-only
			if (frm.doc.application_type === "B2C") {
				// Find Unideft agent
				frappe.db.get_value("Agent", { "company_name": "Unideft" }, "name", (r) => {
					if (r && r.name) {
						if (!frm.doc.agent || frm.doc.agent !== r.name) {
							frm.set_value("agent", r.name);
						}
						frm.set_df_property("agent", "read_only", 1);
					} else {
						frappe.msgprint("Unideft agent not found. Please create it first.");
					}
				});
			} else if (frm.doc.application_type === "B2B") {
				// For B2B: Allow selection from ALL agents (no filter)
				frm.set_df_property("agent", "read_only", 0);
				// Remove any query filter to show all agents
				frm.set_query("agent", function () {
					return {}; // No filters - show all agents
				});
			}
		} else {
			frm.set_df_property("agent", "hidden", 1);
			frm.set_value("agent", "");
		}

		// Filter courses based on selected university
		if (frm.doc.preferred_university) {
			frm.set_query("course", "preferred_courses", function () {
				return {
					filters: {
						university: frm.doc.preferred_university
					}
				};
			});
		}

		// Filter course_name in Offer Letter tab based on university_name
		if (frm.doc.university_name) {
			frm.set_query("course_name", function () {
				return {
					filters: {
						university: frm.doc.university_name
					}
				};
			});
		}

		// Filter defer_course_name based on defer_university_name
		if (frm.doc.defer_university_name) {
			frm.set_query("defer_course_name", function () {
				return {
					filters: {
						university: frm.doc.defer_university_name
					}
				};
			});
		}

		// Set up package case requirement for email fields
		// Fields are always visible but only mandatory when package case is checked
		if (frm.doc.is_package_case) {
			frm.set_df_property("data_swym", "reqd", 1);
			frm.set_df_property("password", "reqd", 1);
			frm.set_df_property("recovery_email_id", "reqd", 1);
			frm.set_df_property("login_contact_no", "reqd", 1);
		} else {
			frm.set_df_property("data_swym", "reqd", 0);
			frm.set_df_property("password", "reqd", 0);
			frm.set_df_property("recovery_email_id", "reqd", 0);
			frm.set_df_property("login_contact_no", "reqd", 0);
		}

		// Calculate age from DOB on form load
		if (frm.doc.dob) {
			const dob = new Date(frm.doc.dob);
			const today = new Date();

			let age = today.getFullYear() - dob.getFullYear();
			const monthDiff = today.getMonth() - dob.getMonth();

			// Adjust age if birthday hasn't occurred this year
			if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
				age--;
			}

			if (age > 0) {
				frm.set_value("current_age", age);
			}
		}

		// Calculate funds required on form load
		if (frm.doc.funds_required_type) {
			calculateFundsRequired(frm, false);
		}
		if (frm.doc.defer_funds_required_type) {
			calculateFundsRequired(frm, true);
		}

		// Auto-populate university and course from Details tab
		populateOfferUniversityAndCourse(frm);

		// Set default currency if not set
		if (!frm.doc.offer_currency) {
			frm.set_value("offer_currency", "AUD");
		}
		if (is_defer_offer_required(frm.doc) && !frm.doc.defer_offer_currency) {
			frm.set_value("defer_offer_currency", frm.doc.offer_currency || "AUD");
		}

		// Update all currency fields to use selected currency
		updateCurrencyFields(frm, false);
		updateFundsRequiredLabel(frm, false);
		if (is_defer_offer_required(frm.doc)) {
			updateCurrencyFields(frm, true);
			updateFundsRequiredLabel(frm, true);
			calculateFundsRequired(frm, true);
		}

		// Check and deactivate intake reminders if tuition fee is paid
		checkAndDeactivateIntakeReminder(frm);
		sync_financial_condition_visibility(frm);
		refresh_financial_condition_sections(frm);
		sync_gs_interview_stage_from_financials(frm);
		// Documents-by-stage UI lives on Card/List views; Details tab no longer shows it.
		refresh_application_country_flag(frm);
	},

	destination_country(frm) {
		refresh_application_country_flag(frm);
	},

	// Currency selector handler - update all currency fields when currency changes
	offer_currency(frm) {
		updateCurrencyFields(frm, false);
		// Update funds required label with currency code
		updateFundsRequiredLabel(frm, false);
		// Recalculate funds required with new currency
		if (frm.doc.funds_required_type) {
			calculateFundsRequired(frm, false);
		}
	},

	defer_offer_currency(frm) {
		updateCurrencyFields(frm, true);
		// Update funds required label with currency code
		updateFundsRequiredLabel(frm, true);
		// Recalculate funds required with new currency
		if (frm.doc.defer_funds_required_type) {
			calculateFundsRequired(frm, true);
		}
	},

	// Auto-populate university and course when preferred university or courses change
	preferred_university(frm) {
		populateOfferUniversityAndCourse(frm);
		// Update course filter when university changes
		if (frm.doc.university_name) {
			frm.set_query("course_name", function () {
				return {
					filters: {
						university: frm.doc.university_name
					}
				};
			});
		}
	},

	preferred_courses(frm) {
		populateOfferUniversityAndCourse(frm);
	},

	// Update course filter when university_name changes in Offer Letter tab
	university_name(frm) {
		if (frm.doc.university_name) {
			frm.set_query("course_name", function () {
				return {
					filters: {
						university: frm.doc.university_name
					}
				};
			});
		}
		// Auto-populate from preferred_university if not set
		if (!frm.doc.university_name && frm.doc.preferred_university) {
			frm.set_value("university_name", frm.doc.preferred_university);
		}
	},

	// Update course filter when defer_university_name changes
	defer_university_name(frm) {
		if (frm.doc.defer_university_name) {
			frm.set_query("defer_course_name", function () {
				return {
					filters: {
						university: frm.doc.defer_university_name
					}
				};
			});
		}
	},

	application_type(frm) {
		// Show/hide agent field when application type changes
		if (frm.doc.application_type === "B2B" || frm.doc.application_type === "B2C") {
			frm.set_df_property("agent", "hidden", 0);

			// For B2C: Auto-set to Unideft and make read-only
			if (frm.doc.application_type === "B2C") {
				// Find Unideft agent and set it
				frappe.db.get_value("Agent", { "company_name": "Unideft" }, "name", (r) => {
					if (r && r.name) {
						frm.set_value("agent", r.name);
						frm.set_df_property("agent", "read_only", 1);
					} else {
						frappe.msgprint("Unideft agent not found. Please create it first.");
					}
				});
			} else if (frm.doc.application_type === "B2B") {
				// For B2B: Allow selection from ALL agents, clear if was Unideft
				frm.set_df_property("agent", "read_only", 0);
				if (frm.doc.agent) {
					frappe.db.get_value("Agent", frm.doc.agent, "company_name", (r) => {
						if (r && r.company_name === "Unideft") {
							frm.set_value("agent", "");
						}
					});
				}
				// Remove any query filter to show all agents
				frm.set_query("agent", function () {
					return {}; // No filters - show all agents
				});
			}
		} else {
			frm.set_df_property("agent", "hidden", 1);
			frm.set_value("agent", "");
		}
	},

	preferred_university(frm) {
		// Clear courses when university changes
		if (frm.doc.preferred_courses) {
			frm.clear_table("preferred_courses");
			frm.refresh_field("preferred_courses");
		}

		// Set filter for courses based on selected university
		if (frm.doc.preferred_university) {
			frm.set_query("course", "preferred_courses", function () {
				return {
					filters: {
						university: frm.doc.preferred_university
					}
				};
			});

		}
	},

	preferred_courses(frm) {
		// Validate maximum 3 courses on client side
		if (frm.doc.preferred_courses && frm.doc.preferred_courses.length > 3) {
			frappe.msgprint("You can select a maximum of 3 courses only.");
			// Remove the extra course
			frm.doc.preferred_courses.pop();
			frm.refresh_field("preferred_courses");
		}
	},

	is_package_case(frm) {
		// Make email fields mandatory when package case is checked
		if (frm.doc.is_package_case) {
			frm.set_df_property("data_swym", "reqd", 1);
			frm.set_df_property("password", "reqd", 1);
			frm.set_df_property("recovery_email_id", "reqd", 1);
			frm.set_df_property("login_contact_no", "reqd", 1);
		} else {
			frm.set_df_property("data_swym", "reqd", 0);
			frm.set_df_property("password", "reqd", 0);
			frm.set_df_property("recovery_email_id", "reqd", 0);
			frm.set_df_property("login_contact_no", "reqd", 0);
		}
	},

	dob(frm) {
		// Calculate age from DOB
		if (frm.doc.dob) {
			const dob = new Date(frm.doc.dob);
			const today = new Date();

			let age = today.getFullYear() - dob.getFullYear();
			const monthDiff = today.getMonth() - dob.getMonth();

			// Adjust age if birthday hasn't occurred this year
			if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
				age--;
			}

			if (age > 0) {
				frm.set_value("current_age", age);
			} else {
				frm.set_value("current_age", "");
			}
		} else {
			frm.set_value("current_age", "");
		}
	},

	study_gap(frm) {
		if (frm.doc.study_gap !== "Yes") {
			frm.set_value("study_gap_upto_1_year", "");
			frm.set_value("study_gap_status", "");
			frm.set_value("study_gap_not_accepted_status", "");
			frm.clear_table("study_gap_proof");
			frm.refresh_field("study_gap_proof");
		}
	},

	study_gap_upto_1_year(frm) {
		if (frm.doc.study_gap_upto_1_year === "Yes") {
			frm.set_value("study_gap_status", "Accepted");
			frm.set_value("study_gap_not_accepted_status", "");
		} else if (frm.doc.study_gap_upto_1_year === "No") {
			frm.set_value("study_gap_status", "");
			frm.set_value("study_gap_not_accepted_status", "Not Accepted");
			frm.clear_table("study_gap_proof");
			frm.refresh_field("study_gap_proof");
		} else {
			frm.set_value("study_gap_status", "");
			frm.set_value("study_gap_not_accepted_status", "");
			frm.clear_table("study_gap_proof");
			frm.refresh_field("study_gap_proof");
		}
	},

	any_visa_refused(frm) {
		if (frm.doc.any_visa_refused !== "Yes") {
			[
				"visa_refused_country",
				"visa_refused_type",
				"visa_refused_can_process",
				"visa_refused_go_ahead_status",
				"visa_refused_other_country",
				"visa_refused_other_country_name",
				"visa_refused_new_application",
				"visa_refused_close_reason",
				"visa_refused_closed_status",
			].forEach((field) => frm.set_value(field, ""));
		}
		if (frm.doc.any_visa_refused === "No") {
			frm.set_value("visa_refused_ok", "✓ OK");
		}
	},

	visa_refused_country(frm) {
		frm.set_value("visa_refused_type", "");
		clear_visa_refusal_downstream(frm);
	},

	visa_refused_type(frm) {
		clear_visa_refusal_downstream(frm);
		if (
			frm.doc.any_visa_refused === "Yes" &&
			frm.doc.visa_refused_country === "Australia" &&
			frm.doc.visa_refused_type === "Study Visa"
		) {
			frm.set_value(
				"visa_refused_not_able_to_process",
				"We cannot process this case for Australia"
			);
		}
	},

	visa_refused_can_process(frm) {
		frm.set_value("visa_refused_other_country", "");
		frm.set_value("visa_refused_other_country_name", "");
		frm.set_value("visa_refused_close_reason", "");
		frm.set_value("visa_refused_closed_status", "");
		if (frm.doc.visa_refused_can_process === "Yes") {
			frm.set_value("visa_refused_go_ahead_status", "✓ Go Ahead");
		} else {
			frm.set_value("visa_refused_go_ahead_status", "");
		}
	},

	visa_refused_other_country(frm) {
		if (frm.doc.visa_refused_other_country !== "Yes") {
			frm.set_value("visa_refused_other_country_name", "");
			frm.set_value("visa_refused_new_application", "");
		}
		if (frm.doc.visa_refused_other_country !== "No") {
			frm.set_value("visa_refused_close_reason", "");
			frm.set_value("visa_refused_closed_status", "");
		}
	},

	visa_refused_close_reason(frm) {
		if (
			frm.doc.visa_refused_other_country === "No" &&
			frm.doc.visa_refused_close_reason &&
			frm.doc.status !== "Closed"
		) {
			frm.set_value("status", "Closed");
			frm.set_value("visa_refused_closed_status", "Case Closed from Australia");
			frappe.show_alert({ message: __("Case closed from Australia"), indicator: "orange" }, 5);
		}
	},

	visa_refused_create_new_application(frm) {
		if (!frm.doc.name || frm.doc.__islocal) {
			frappe.msgprint(__("Please save the Application first."));
			return;
		}
		if (!frm.doc.visa_refused_other_country_name) {
			frappe.msgprint(__("Please select the Name of Country first."));
			return;
		}
		frappe.confirm(
			__(
				"Create a new Application for {0} and close this Australia case?",
				[frm.doc.visa_refused_other_country_name]
			),
			() => {
				frappe.call({
					method:
						"erpnext.crm.doctype.application.application.create_application_for_other_country",
					args: {
						source_name: frm.doc.name,
						destination_country: frm.doc.visa_refused_other_country_name,
					},
					freeze: true,
					freeze_message: __("Creating new application..."),
					callback(r) {
						if (!r.message) {
							return;
						}
						frappe.show_alert(
							{
								message: __("New application {0} created. This case is closed.", [
									r.message,
								]),
								indicator: "green",
							},
							6
						);
						frm.reload_doc();
					},
				});
			}
		);
	},

	need_assessment(frm) {
		if (frm.doc.need_assessment !== "Yes") {
			frm.clear_table("need_assessment_vendors");
			frm.refresh_field("need_assessment_vendors");
		}
		if (frm.doc.need_assessment !== "No") {
			frm.set_value("need_assessment_university", "");
			frm.set_value("need_assessment_course", "");
		}
	},

	submitted_another_application(frm) {
		if (frm.doc.submitted_another_application !== "No") {
			frm.set_value("need_another_application", "");
			frm.set_value("not_processing_another_application_reason", "");
		}
	},

	need_another_application(frm) {
		if (frm.doc.need_another_application !== "No") {
			frm.set_value("not_processing_another_application_reason", "");
		}
		if (
			frm.doc.submitted_another_application === "No" &&
			frm.doc.need_another_application === "Yes" &&
			frm.doc.name &&
			!frm.doc.__islocal
		) {
			prompt_application_reminder(frm, {
				title: __("Process Another Application"),
				default_description: "Process another application",
				trigger_key: `submitted_another_app_${frm.doc.name}`,
			});
		}
	},

	any_further_requirement_offer_letter(frm) {
		// Clear pending requirement fields when switching away from Yes
		// Skip child-field reminder prompts while clearing (prevents double popup)
		if (frm.doc.any_further_requirement_offer_letter !== "Yes") {
			frm.__clearing_submitted_pending = true;
			frm.set_value("pending_requirement_details", "");
			frm.set_value("pending_requirements_completed", "");
			frm.clear_table("supporting_documents");
			frm.refresh_field("supporting_documents");
			frm.__clearing_submitted_pending = false;
		}
		maybe_prompt_submitted_reminders(frm);
	},

	pending_requirements_completed(frm) {
		if (frm.__clearing_submitted_pending) {
			return;
		}
		// Clear supporting documents when switching to No / empty
		if (frm.doc.pending_requirements_completed !== "Yes") {
			frm.clear_table("supporting_documents");
			frm.refresh_field("supporting_documents");
		}
		maybe_prompt_submitted_reminders(frm);
	},

	conditions_on_offer_letter(frm) {
		sync_financial_condition_visibility(frm);
		refresh_financial_condition_sections(frm);
		sync_gs_interview_stage_from_financials(frm);
	},

	on_submit(frm) {
		// Submitted reminders are set interactively via field change handlers
	},

	after_save(frm) {
		// Intake reminders are prompted when intake date fields change
	},

	// Funds Required calculation for main offer
	funds_required_type(frm) {
		calculateFundsRequired(frm, false);
	},

	full_year_tuition_fee(frm) {
		calculateFundsRequired(frm, false);
	},

	oshc_offer(frm) {
		calculateFundsRequired(frm, false);
	},

	payable_fee(frm) {
		calculateFundsRequired(frm, false);
	},

	living_expenses(frm) {
		calculateFundsRequired(frm, false);
	},

	travel_expenses(frm) {
		calculateFundsRequired(frm, false);
	},

	living_expenses_spouse(frm) {
		calculateFundsRequired(frm, false);
	},

	travel_expenses_spouse(frm) {
		calculateFundsRequired(frm, false);
	},

	no_of_kids(frm) {
		calculateFundsRequired(frm, false);
	},

	process_with_kids(frm) {
		if (!frm.doc.process_with_kids) {
			frm.set_value("no_of_kids", 0);
		}
		calculateFundsRequired(frm, false);
	},

	case_4_proceed_above_1_year(frm) {
		calculateFundsRequired(frm, false);
		calculateFundsRequired(frm, true);
	},

	martial_status(frm) {
		calculateFundsRequired(frm, false);
		calculateFundsRequired(frm, true);
	},

	// Funds Required calculation for defer offer
	defer_funds_required_type(frm) {
		calculateFundsRequired(frm, true);
	},

	defer_full_year_tuition_fee(frm) {
		calculateFundsRequired(frm, true);
	},

	defer_oshc(frm) {
		calculateFundsRequired(frm, true);
	},

	defer_payable_fee(frm) {
		calculateFundsRequired(frm, true);
	},

	defer_living_expenses(frm) {
		calculateFundsRequired(frm, true);
	},

	defer_travel_expenses(frm) {
		calculateFundsRequired(frm, true);
	},

	defer_living_expenses_spouse(frm) {
		calculateFundsRequired(frm, true);
	},

	defer_travel_expenses_spouse(frm) {
		calculateFundsRequired(frm, true);
	},

	defer_no_of_kids(frm) {
		calculateFundsRequired(frm, true);
	},

	defer_process_with_kids(frm) {
		if (!frm.doc.defer_process_with_kids) {
			frm.set_value("defer_no_of_kids", 0);
		}
		calculateFundsRequired(frm, true);
	},

	// Intake date handlers for reminder creation
	university_intake(frm) {
		if (frm.doc.university_intake && frm.doc.name && !frm.doc.__islocal) {
			maybe_prompt_intake_reminder(frm, frm.doc.university_intake, "Main Offer");
		}
		calculateFundsRequired(frm, false);
	},

	defer_university_intake(frm) {
		if (frm.doc.defer_university_intake && is_defer_offer_required(frm.doc) && frm.doc.name && !frm.doc.__islocal) {
			maybe_prompt_intake_reminder(frm, frm.doc.defer_university_intake, "Defer Offer");
		}
		calculateFundsRequired(frm, true);
	},

	defer_offer_required(frm) {
		if (!is_defer_offer_required(frm.doc)) {
			frm.__clearing_defer_pending = true;
			frm.set_value("applied_for_defer_offer_letter", "");
			frm.set_value("defer_any_further_requirement", "");
			frm.set_value("defer_pending_requirement_details", "");
			frm.set_value("defer_pending_requirements_completed", "");
			frm.clear_table("defer_supporting_documents");
			frm.refresh_field("defer_supporting_documents");
			frm.__clearing_defer_pending = false;
			return;
		}

		// Auto-populate defer offer fields from main offer when defer is selected
		populateDeferOfferUniversityAndCourse(frm);

		if (!frm.doc.defer_offer_currency) {
			frm.set_value("defer_offer_currency", frm.doc.offer_currency || "AUD");
		}

		if (frm.doc.university_name && !frm.doc.defer_university_name) {
			frm.set_value("defer_university_name", frm.doc.university_name);
		}
		if (frm.doc.course_name && !frm.doc.defer_course_name) {
			frm.set_value("defer_course_name", frm.doc.course_name);
		}
		if (frm.doc.full_year_tuition_fee && !frm.doc.defer_full_year_tuition_fee) {
			frm.set_value("defer_full_year_tuition_fee", frm.doc.full_year_tuition_fee);
		}
		if (frm.doc.scholarship && !frm.doc.defer_scholarship) {
			frm.set_value("defer_scholarship", frm.doc.scholarship);
		}
		if (frm.doc.payable_fee && !frm.doc.defer_payable_fee) {
			frm.set_value("defer_payable_fee", frm.doc.payable_fee);
		}
		if (frm.doc.oshc_offer && !frm.doc.defer_oshc) {
			frm.set_value("defer_oshc", frm.doc.oshc_offer);
		}
		if (frm.doc.living_expenses && !frm.doc.defer_living_expenses) {
			frm.set_value("defer_living_expenses", frm.doc.living_expenses);
		}
		if (frm.doc.travel_expenses && !frm.doc.defer_travel_expenses) {
			frm.set_value("defer_travel_expenses", frm.doc.travel_expenses);
		}
		if (frm.doc.living_expenses_spouse && !frm.doc.defer_living_expenses_spouse) {
			frm.set_value("defer_living_expenses_spouse", frm.doc.living_expenses_spouse);
		}
		if (frm.doc.travel_expenses_spouse && !frm.doc.defer_travel_expenses_spouse) {
			frm.set_value("defer_travel_expenses_spouse", frm.doc.travel_expenses_spouse);
		}
		if (frm.doc.process_with_kids && !frm.doc.defer_process_with_kids) {
			frm.set_value("defer_process_with_kids", frm.doc.process_with_kids);
		}
		if (frm.doc.no_of_kids && !frm.doc.defer_no_of_kids) {
			frm.set_value("defer_no_of_kids", frm.doc.no_of_kids);
		}
		if (frm.doc.funds_required_type && !frm.doc.defer_funds_required_type) {
			frm.set_value("defer_funds_required_type", frm.doc.funds_required_type);
		}
		if (
			frm.doc.conditions_on_offer_letter &&
			frm.doc.conditions_on_offer_letter.length > 0 &&
			(!frm.doc.defer_conditions_on_offer_letter || frm.doc.defer_conditions_on_offer_letter.length === 0)
		) {
			const conditions = frm.doc.conditions_on_offer_letter.map((row) => ({
				condition: row.condition,
			}));
			frm.set_value("defer_conditions_on_offer_letter", conditions);
		}

		updateCurrencyFields(frm, true);
		calculateFundsRequired(frm, true);
	},

	applied_for_defer_offer_letter(frm) {
		if (frm.doc.applied_for_defer_offer_letter !== "Yes") {
			frm.__clearing_defer_pending = true;
			frm.set_value("defer_any_further_requirement", "");
			frm.set_value("defer_pending_requirement_details", "");
			frm.set_value("defer_pending_requirements_completed", "");
			frm.clear_table("defer_supporting_documents");
			frm.refresh_field("defer_supporting_documents");
			frm.__clearing_defer_pending = false;
		}
		maybe_prompt_defer_offer_reminders(frm);
	},

	defer_any_further_requirement(frm) {
		if (frm.__clearing_defer_pending) {
			return;
		}
		if (frm.doc.defer_any_further_requirement !== "Yes") {
			frm.__clearing_defer_pending = true;
			frm.set_value("defer_pending_requirement_details", "");
			frm.set_value("defer_pending_requirements_completed", "");
			frm.clear_table("defer_supporting_documents");
			frm.refresh_field("defer_supporting_documents");
			frm.__clearing_defer_pending = false;
		}
		maybe_prompt_defer_offer_reminders(frm);
	},

	defer_pending_requirements_completed(frm) {
		if (frm.__clearing_defer_pending) {
			return;
		}
		if (frm.doc.defer_pending_requirements_completed !== "Yes") {
			frm.clear_table("defer_supporting_documents");
			frm.refresh_field("defer_supporting_documents");
		}
		maybe_prompt_defer_offer_reminders(frm);
	},

	on_tab_change(frm) {
		// When Offer Letter tab is accessed, ensure currency is set
		const activeTab = frm.get_active_tab();
		if (activeTab && activeTab.df && activeTab.df.fieldname === "offer_tab") {
			if (!frm.doc.offer_currency) {
				frm.set_value("offer_currency", "AUD");
			}
			setTimeout(function () {
				updateCurrencyFields(frm, false);
				if (is_defer_offer_required(frm.doc)) {
					updateCurrencyFields(frm, true);
					calculateFundsRequired(frm, true);
				}
			}, 100);
		}
	},

	// Financials Tab handlers
	gs_submitted(frm) {
		if (frm.doc.gs_submitted === "Yes") {
			frm.set_value("gs_submitted_reminder_date", "");
			const move_to_gs_tab = () => {
				setTimeout(() => {
					activate_application_tab(frm, "gs_tab", "GS Processing");
				}, 250);
			};
			if (["Financial", "Offer Letter Received", "Pending", "Processing"].includes(frm.doc.status)) {
				frm.set_value("status", "GS Processing").then(move_to_gs_tab);
			} else {
				move_to_gs_tab();
			}
			frappe.show_alert(
				{
					message: __("Financial stage completed — moved to GS Processing"),
					indicator: "green",
				},
				4
			);
		} else if (frm.doc.gs_submitted === "No") {
			// Open calendar popup immediately (date + time + remarks)
			maybe_prompt_financial_completion_reminder(frm);
		}
	},

	gs_submitted_reminder_date(frm) {
		if (frm.doc.gs_submitted === "No" && frm.doc.gs_submitted_reminder_date) {
			// Allow reminder popup again when date is changed
			AU_REMINDER_SESSION[`financial_completion_${frm.doc.name}`] = false;
			maybe_prompt_financial_completion_reminder(frm);
		}
	},

	interview_deadline_date(frm) {
		if (
			frm.doc.interview_deadline_date &&
			frm.doc.interview_timing === "Before GS Approval" &&
			frm.doc.name &&
			!frm.doc.__islocal
		) {
			prompt_application_reminder(frm, {
				title: __("Set Interview Deadline Reminder"),
				default_description:
					"Interview Deadline - " + frappe.datetime.str_to_user(frm.doc.interview_deadline_date),
				default_date: frm.doc.interview_deadline_date,
				trigger_key: `interview_deadline_financial_${frm.doc.name}`,
			});
		}
	},

	interview_timing(frm) {
		// Clear interview fields when timing changes away from Before GS Approval
		if (frm.doc.interview_timing !== "Before GS Approval") {
			frm.set_value("interview_deadline_date", "");
		}
		refresh_financial_condition_sections(frm);
		sync_gs_interview_stage_from_financials(frm);
	},

	// Section C (Sponsors - Part 1) fields (no child "Sponsors" table)
	who_sponsored(frm) {
		// Table MultiSelect field - no special handling needed
		updateSectionCSponsorStatuses(frm);
	},

	dob_matched_pc_ac(frm) {
		updateSectionCSponsorStatuses(frm);
	},

	name_matched_ac_pc(frm) {
		updateSectionCSponsorStatuses(frm);
	},

	income_support_documents(frm) {
		// When switching document type, keep statuses in sync
		updateSectionCSponsorStatuses(frm);
	},

	dob_matched_itr_ac_pc(frm) {
		updateSectionCSponsorStatuses(frm);
	},

	name_matched_itr_ac_pc(frm) {
		updateSectionCSponsorStatuses(frm);
	},

	sponsor_itr_verified(frm) {
		updateSectionCSponsorStatuses(frm);
		if (frm.doc.income_support_documents === "ITRs" && !frm.doc.sponsor_itr_verified) {
			// Set reminder for verification
			createOfferLetterReminder(frm, "ITR needs verification");
		}
	},

	// Section C (Sponsors - Occupation Documents)
	occupation_documents_needed(frm) {
		// Clear dependent fields when switching
		if (!frm.doc.occupation_documents_needed) {
			frm.set_value("sponsor_occupation", "");
			frm.set_value("business_proof", "");
			frm.set_value("job_type", "");
			clearJobFields(frm);
			clearFarmerFields(frm);
		}
	},

	sponsor_occupation(frm) {
		// Clear business_proof when sponsor_occupation changes
		if (frm.doc.sponsor_occupation !== "Business") {
			frm.set_value("business_proof", "");
		}
		if (frm.doc.sponsor_occupation !== "Job") {
			frm.set_value("job_type", "");
			clearJobFields(frm);
		}
		if (frm.doc.sponsor_occupation !== "Farmer") {
			frm.set_value("farmer_supporting_documents", "");
			clearFarmerFields(frm);
		}
	},

	job_type(frm) {
		// Clear job dependent fields when job type changes
		clearJobFields(frm);
	},

	farmer_supporting_documents(frm) {
		// Clear dependent farmer fields when doc type changes
		clearFarmerFields(frm);
		updateFarmerIncomeStatuses(frm);
	},

	tehsildar_income_matches_itrs(frm) {
		updateFarmerIncomeStatuses(frm);
		if (frm.doc.occupation_documents_needed &&
			frm.doc.sponsor_occupation === "Farmer" &&
			frm.doc.farmer_supporting_documents === "Tehsildar Income Proof" &&
			!frm.doc.tehsildar_income_matches_itrs) {
			createOfferLetterReminder(frm, "Correct Tehsildar income proof");
		}
	},

	farmer_family_income_matches_itrs(frm) {
		updateFarmerIncomeStatuses(frm);
		if (frm.doc.occupation_documents_needed &&
			frm.doc.sponsor_occupation === "Farmer" &&
			frm.doc.farmer_supporting_documents === "Family ID" &&
			!frm.doc.farmer_family_income_matches_itrs) {
			createOfferLetterReminder(frm, "Correct Family ID income proof");
		}
	},

	jform_sixty_percent_match_itrs(frm) {
		updateFarmerIncomeStatuses(frm);
		if (frm.doc.occupation_documents_needed &&
			frm.doc.sponsor_occupation === "Farmer" &&
			frm.doc.farmer_supporting_documents === "J forms" &&
			!frm.doc.jform_sixty_percent_match_itrs) {
			createOfferLetterReminder(frm, "Correct J form amount mismatch");
		}
	},

	business_proof(frm) {
		// Clear dependent fields when business_proof changes
		if (frm.doc.business_proof !== "GST Certificate") {
			frm.set_value("gst_number", "");
			frm.set_value("gst_verified", 0);
			frm.set_value("gst_certificate_upload", "");
		}
		if (frm.doc.business_proof !== "MSME Certificate") {
			frm.set_value("msme_company_name", "");
			frm.set_value("msme_company_start_duration", "");
			frm.set_value("msme_certificate_upload", "");
			frm.set_value("msme_registration_duration", "");
			frm.set_value("msme_additional_document", "");
			frm.set_value("msme_cert_verified", 0);
		}
		if (frm.doc.business_proof !== "Incorporation Certificate") {
			frm.set_value("incorporation_business_start_date", "");
			frm.set_value("incorporation_date_of_registration", "");
			frm.set_value("incorporation_certificate_upload", "");
			frm.set_value("incorporation_current_account_statement", "");
		}
		if (frm.doc.business_proof !== "Shop Act") {
			frm.set_value("shop_act_company_name", "");
			frm.set_value("shop_act_company_start_duration", "");
			frm.set_value("shop_act_registration_date", "");
			frm.set_value("shop_act_upload", "");
			frm.set_value("shop_act_registration_duration", "");
			frm.set_value("shop_act_additional_document", "");
			frm.set_value("shop_act_uploaded", 0);
		}
		if (frm.doc.business_proof !== "IEC Certificate") {
			frm.set_value("iec_company_name", "");
			frm.set_value("iec_company_start_duration", "");
			frm.set_value("iec_registration_date", "");
			frm.set_value("iec_cert_upload", "");
			frm.set_value("iec_registration_duration", "");
			frm.set_value("iec_additional_document", "");
			frm.set_value("iec_cert_uploaded", 0);
		}
		frm.refresh();
	},

	msme_registration_duration(frm) {
		// Clear additional document if duration changes to "Above 2 Years"
		if (frm.doc.msme_registration_duration === "Above 2 Years") {
			frm.set_value("msme_additional_document", "");
		}
		frm.refresh();
	},

	shop_act_registration_duration(frm) {
		// Clear additional document if duration changes to "Above 2 Years"
		if (frm.doc.shop_act_registration_duration === "Above 2 Years") {
			frm.set_value("shop_act_additional_document", "");
		}
		frm.refresh();
	},

	iec_registration_duration(frm) {
		// Clear additional document if duration changes to "Above 2 Years"
		if (frm.doc.iec_registration_duration === "Above 2 Years") {
			frm.set_value("iec_additional_document", "");
		}
		frm.refresh();
	}
});

// Section C (Sponsors - Part 1): status helper (Application doctype fields)
function updateSectionCSponsorStatuses(frm) {
	// PC & AC DOB match status
	if (frm.doc.dob_matched_pc_ac) {
		frm.set_value("dob_pc_ac_status", "✓ Okay");
	} else if (!frm.doc.dob_matched_pc_ac) {
		frm.set_value("dob_pc_ac_status", "⚠ Needs Correction");
	} else {
		frm.set_value("dob_pc_ac_status", "");
	}

	// PC & AC Name match status
	if (frm.doc.name_matched_ac_pc) {
		frm.set_value("name_ac_pc_status", "✓ Okay");
	} else if (!frm.doc.name_matched_ac_pc) {
		frm.set_value("name_ac_pc_status", "⚠ Needs Correction");
	} else {
		frm.set_value("name_ac_pc_status", "");
	}

	// ITR-level checks (only when Income Support Documents = ITRs)
	if (frm.doc.income_support_documents === "ITRs") {
		if (frm.doc.dob_matched_itr_ac_pc) {
			frm.set_value("dob_itr_status", "✓ Okay");
		} else if (!frm.doc.dob_matched_itr_ac_pc) {
			frm.set_value("dob_itr_status", "⚠ Needs Correction");
		} else {
			frm.set_value("dob_itr_status", "");
		}

		if (frm.doc.name_matched_itr_ac_pc) {
			frm.set_value("name_itr_status", "✓ Okay");
		} else if (!frm.doc.name_matched_itr_ac_pc) {
			frm.set_value("name_itr_status", "⚠ Needs Correction");
		} else {
			frm.set_value("name_itr_status", "");
		}

		if (!frm.doc.sponsor_itr_verified) {
			frm.set_value("itr_verification_reminder", "⚠ Set Reminder for Verification");
		} else {
			frm.set_value("itr_verification_reminder", "");
		}
	} else {
		// Clear ITR status fields when not in ITR flow
		frm.set_value("dob_itr_status", "");
		frm.set_value("name_itr_status", "");
		frm.set_value("itr_verification_reminder", "");
	}
}

// Farmer: status helper
function updateFarmerIncomeStatuses(frm) {
	// Tehsildar
	if (frm.doc.farmer_supporting_documents === "Tehsildar Income Proof") {
		if (!frm.doc.tehsildar_income_matches_itrs) {
			frm.set_value("tehsildar_income_mismatch_status", "⚠ Needs Correction - Reminder will be set");
		} else {
			frm.set_value("tehsildar_income_mismatch_status", "");
		}
	} else {
		frm.set_value("tehsildar_income_mismatch_status", "");
	}

	// Family ID
	if (frm.doc.farmer_supporting_documents === "Family ID") {
		if (!frm.doc.farmer_family_income_matches_itrs) {
			frm.set_value("farmer_family_income_mismatch_status", "⚠ Needs Correction - Reminder will be set");
		} else {
			frm.set_value("farmer_family_income_mismatch_status", "");
		}
	} else {
		frm.set_value("farmer_family_income_mismatch_status", "");
	}

	// J forms
	if (frm.doc.farmer_supporting_documents === "J forms") {
		if (!frm.doc.jform_sixty_percent_match_itrs) {
			frm.set_value("jform_mismatch_status", "⚠ Needs Correction - Reminder will be set");
		} else {
			frm.set_value("jform_mismatch_status", "");
		}
	} else {
		frm.set_value("jform_mismatch_status", "");
	}
}

function clearFarmerFields(frm) {
	// Common
	frm.set_value("farmer_income", "");
	frm.set_value("farmer_supporting_documents", "");

	// Tehsildar
	frm.set_value("tehsildar_income_matches_itrs", 0);
	frm.set_value("tehsildar_income_proof_upload", "");
	frm.set_value("tehsildar_income_mismatch_status", "");

	// Family ID
	frm.set_value("farmer_family_income_matches_itrs", 0);
	frm.set_value("farmer_family_id_upload", "");
	frm.set_value("farmer_family_income_mismatch_status", "");

	// J forms
	frm.set_value("jform_assessment_year", "");
	frm.set_value("jform_amount", "");
	frm.set_value("jform_sixty_percent_match_itrs", 0);
	frm.set_value("jform_upload", "");
	frm.set_value("jform_mismatch_status", "");

	// Other
	frm.set_value("farmer_other_details", "");
}

function clearJobFields(frm) {
	// Government
	frm.set_value("gov_department", "");
	frm.set_value("gov_position", "");
	frm.set_value("gov_id_card", "");
	frm.set_value("gov_salary_slip", 0);
	frm.set_value("gov_salary_statement", 0);
	frm.set_value("gov_slip_current_salary", "");
	frm.set_value("gov_slip_gpf_amount", "");
	frm.set_value("gov_slip_upload", "");
	frm.set_value("gov_stmt_current_salary", "");
	frm.set_value("gov_stmt_upload", "");

	// Private
	frm.set_value("priv_company_name", "");
	frm.set_value("priv_department", "");
	frm.set_value("priv_position", "");
	frm.set_value("priv_experience_letter", "");
	frm.set_value("priv_id_card", "");
	frm.set_value("priv_salary_slip", 0);
	frm.set_value("priv_salary_statement", 0);
	frm.set_value("priv_slip_current_salary", "");
	frm.set_value("priv_slip_upload", "");
	frm.set_value("priv_stmt_current_salary", "");
	frm.set_value("priv_stmt_upload", "");

	// Retired
	frm.set_value("ret_department", "");
	frm.set_value("ret_position", "");
	frm.set_value("ret_retired_date", "");
	frm.set_value("ret_id_card", "");
	frm.set_value("ret_pension_proof", "");
	frm.set_value("ret_current_salary", "");
	frm.set_value("ret_stmt_upload", "");
}

// Helper function to create reminders for Submitted tab (legacy auto-create — use maybe_prompt_submitted_reminders)
function createSubmittedTabReminders(frm) {
	maybe_prompt_submitted_reminders(frm);
}

// Helper function to create offer letter reminder (uses interactive modal)
function createOfferLetterReminder(frm, description) {
	const default_date = frappe.datetime.add_days(frappe.datetime.get_today(), 3);
	prompt_application_reminder(frm, {
		title: __("Set Reminder"),
		default_description: description,
		default_date,
		trigger_key: `offer_${description}_${frm.doc.name}`,
	});
}

// Helper function to calculate Funds Required
function calculateFundsRequired(frm, isDefer) {
	const prefix = isDefer ? "defer_" : "";

	const fundsType = frm.doc[prefix + "funds_required_type"];
	const fullYearTuitionFee = parseFloat(frm.doc[prefix + "full_year_tuition_fee"]) || 0;
	const oshc = parseFloat(frm.doc[prefix + "oshc_offer"] || frm.doc[prefix + "oshc"]) || 0;
	const livingExpenses = parseFloat(frm.doc[prefix + "living_expenses"]) || 0;
	const travelExpenses = parseFloat(frm.doc[prefix + "travel_expenses"]) || 0;
	const payableFee = parseFloat(frm.doc[prefix + "payable_fee"]) || 0;

	const livingExpSpouse = parseFloat(frm.doc[prefix + "living_expenses_spouse"]) || 0;
	const travelExpSpouse = parseFloat(frm.doc[prefix + "travel_expenses_spouse"]) || 0;
	const noOfKids = parseInt(frm.doc[prefix + "no_of_kids"]) || 0;
	const livingExpKidUnit = parseFloat(frm.doc[prefix + "living_expenses_kid_unit"]) || 0;
	const travelExpKidUnit = parseFloat(frm.doc[prefix + "travel_expenses_kid_unit"]) || 0;

	// Tuition basis: Full Year fee OR Payable fee
	const withoutFullYear = fundsType && fundsType.includes("Without Full Year fee");
	const tuitionPart = withoutFullYear ? payableFee : fullYearTuitionFee;

	let fundsRequired = tuitionPart + oshc + livingExpenses + travelExpenses;

	if (fundsType) {
		const spouseApplicable =
			frm.doc.martial_status === "Married" && frm.doc.case_4_proceed_above_1_year === "with Spouse";

		if (fundsType.toLowerCase().includes("spouse") && spouseApplicable) {
			fundsRequired += livingExpSpouse + travelExpSpouse;
		}

		const kidApplicable = isDefer ? frm.doc.defer_process_with_kids : frm.doc.process_with_kids;
		if (fundsType.toLowerCase().includes("kid") && kidApplicable) {
			fundsRequired += livingExpKidUnit * noOfKids + travelExpKidUnit * noOfKids;
		}
	}

	const amountField = prefix + "funds_required_amount";
	frm.set_value(amountField, fundsRequired > 0 ? fundsRequired : 0);

	const currencyField = prefix + "offer_currency";
	if (frm.fields_dict[amountField] && frm.doc[currencyField]) {
		frm.set_df_property(amountField, "options", currencyField);
		updateFundsRequiredLabel(frm, isDefer);
		frm.refresh_field(amountField);
	}
}

// Helper function to create intake reminder (legacy — use maybe_prompt_intake_reminder)
function createIntakeReminder(frm, intakeDate, offerType) {
	maybe_prompt_intake_reminder(frm, intakeDate, offerType);
}

// Function to check and deactivate intake reminder when tuition fee is paid
function checkAndDeactivateIntakeReminder(frm) {
	if (!frm.doc.name || frm.doc.__islocal || !frm.doc.tuition_fee_paid) {
		return;
	}

	frappe.db
		.get_list("Reminder", {
			filters: {
				reminder_doctype: "Application",
				reminder_docname: frm.doc.name,
				description: ["like", "Decide deadline for deposit%"],
				notified: 0,
			},
			fields: ["name"],
		})
		.then(function (reminders) {
			(reminders || []).forEach(function (row) {
				frappe.db.set_value("Reminder", row.name, "notified", 1);
			});
			if (reminders && reminders.length) {
				frappe.show_alert(
					{
						message: __("Deposit deadline reminder deactivated (tuition fee paid)"),
						indicator: "blue",
					},
					4
				);
			}
		});
}

// Helper function to populate university and course in Offer Letter tab from Details tab
function populateOfferUniversityAndCourse(frm) {
	// Auto-populate university_name from preferred_university
	if (frm.doc.preferred_university && !frm.doc.university_name) {
		frm.set_value("university_name", frm.doc.preferred_university);
	}

	// Auto-populate course_name from first course in preferred_courses table
	if (frm.doc.preferred_courses && frm.doc.preferred_courses.length > 0 && !frm.doc.course_name) {
		const firstCourse = frm.doc.preferred_courses[0];
		if (firstCourse.course) {
			frm.set_value("course_name", firstCourse.course);
		}
	}
}

// Helper function to populate defer offer university and course from Details tab
function populateDeferOfferUniversityAndCourse(frm) {
	// Auto-populate defer_university_name from preferred_university
	if (frm.doc.preferred_university && !frm.doc.defer_university_name) {
		frm.set_value("defer_university_name", frm.doc.preferred_university);
	}

	// Auto-populate defer_course_name from first course in preferred_courses table
	if (frm.doc.preferred_courses && frm.doc.preferred_courses.length > 0 && !frm.doc.defer_course_name) {
		const firstCourse = frm.doc.preferred_courses[0];
		if (firstCourse.course) {
			frm.set_value("defer_course_name", firstCourse.course);
		}
	}
}

// Helper function to update all currency fields based on selected currency
function updateCurrencyFields(frm, isDefer) {
	const currencyField = isDefer ? "defer_offer_currency" : "offer_currency";
	const selectedCurrency = frm.doc[currencyField] || "AUD";

	// List of all currency fields for main or defer offer
	const currencyFields = isDefer ? [
		"defer_full_year_tuition_fee",
		"defer_scholarship",
		"defer_payable_fee",
		"defer_oshc",
		"defer_living_expenses",
		"defer_travel_expenses",
		"defer_living_expenses_spouse",
		"defer_travel_expenses_spouse",
		"defer_living_expenses_kid_unit",
		"defer_travel_expenses_kid_unit",
		"defer_funds_required_amount"
	] : [
		"full_year_tuition_fee",
		"scholarship",
		"payable_fee",
		"oshc_offer",
		"living_expenses",
		"travel_expenses",
		"living_expenses_spouse",
		"travel_expenses_spouse",
		"living_expenses_kid_unit",
		"travel_expenses_kid_unit",
		"funds_required_amount"
	];

	// Update currency for each field
	currencyFields.forEach(function (fieldname) {
		if (frm.fields_dict[fieldname]) {
			// Set the currency property to reference the currency selector
			frm.set_df_property(fieldname, "options", currencyField);

			// Force refresh the field to apply currency change
			frm.refresh_field(fieldname);
		}
	});
}

// Helper function to update Funds Required Amount label with currency code
function updateFundsRequiredLabel(frm, isDefer) {
	const currencyField = isDefer ? "defer_offer_currency" : "offer_currency";
	const amountField = isDefer ? "defer_funds_required_amount" : "funds_required_amount";
	const selectedCurrency = frm.doc[currencyField] || "AUD";

	if (frm.fields_dict[amountField]) {
		// Update the label to include currency code
		frm.set_df_property(amountField, "label", "Funds Required Amount (" + selectedCurrency + ")");
		frm.refresh_field(amountField);
	}
}

// Helper function to create financial completion reminder (GS Submitted = No path)
function createFinancialCompletionReminder(frm, reminderDate) {
	if (!reminderDate || !frm.doc.name || frm.doc.__islocal) {
		return;
	}
	prompt_application_reminder(frm, {
		title: __("Set Financial Completion Reminder"),
		default_description: "When financials will be completed",
		default_date: reminderDate,
		trigger_key: `financial_completion_${frm.doc.name}`,
	});
}

// Refund Processing - Event Handlers
frappe.ui.form.on("Application", {
	tuition_fee_refund_received(frm) {
		if (!frm.doc.tuition_fee_refund_received) {
			createRefundReminder(frm, null, "Tuition Fee Refund Expected");
		}
		frm.refresh();
	},

	oshc_refund_received(frm) {
		if (!frm.doc.oshc_refund_received) {
			createRefundReminder(frm, null, "OSHC Refund Expected");
		}
		frm.refresh();
	},

	tuition_fee_issue_resolved(frm) {
		if (!frm.doc.tuition_fee_issue_resolved && frm.doc.tuition_fee_issue) {
			createRefundReminder(frm, null, "Refund Issue Expected to Resolve");
		}
		frm.refresh();
	}
});

// On Shore College Change - Event Handlers
frappe.ui.form.on("Application", {
	college_change_close_case(frm) {
		if (frm.doc.college_change_close_case && frm.doc.student_wants_to_change_college === 'Others') {
			createCollegeChangeReminder(frm, null, "Case Closed - On Shore College Change");
		}
		frm.refresh();
	},

	student_got_refusal(frm) {
		if (frm.doc.student_got_refusal) {
			// Update visa_status to trigger Visa Refused tab
			frm.set_value('visa_status', 'Visa Refused');
			createCollegeChangeReminder(frm, null, "Student Refusal - Move to Visa Refused Stage");
		}
		frm.refresh();
	}
});

// Visa - Event Handlers
frappe.ui.form.on("Application", {
	student_enrolled(frm) {
		if (!frm.doc.student_enrolled) {
			createVisaReminder(frm, null, "Enroll Student");
		}
		frm.refresh();
	}
});

// File Lodged - Event Handlers
frappe.ui.form.on("Application", {
	visa_decision(frm) {
		if (frm.doc.visa_decision === 'Visa Approved') {
			// Update visa_status field (read-only field updated via JS)
			frm.set_value('visa_status', 'Visa Approved');

			// Send notification to Account Department
			createVisaApprovedNotification(frm);

			createCOEReminder(frm, null, "Visa Approved - Account Department Notified");
		} else if (frm.doc.visa_decision === 'Visa Refused') {
			// Update visa_status field (read-only field updated via JS)
			frm.set_value('visa_status', 'Visa Refused');

			createCOEReminder(frm, null, "Visa Refused - Move to Visa Refused Stage");
		} else {
			// Reset to File Lodged
			frm.set_value('visa_status', 'File Lodged');
		}
		frm.refresh();
	}
});

// COE - Event Handlers
frappe.ui.form.on("Application", {
	our_side_medical_scheduled(frm) {
		if (frm.doc.medical_arranged_by === 'Our Side') {
			if (frm.doc.our_side_medical_scheduled) {
				createCOEReminder(frm, null, "Medical to Receive");
			} else {
				createCOEReminder(frm, null, "Schedule Medical");
			}
		}
		frm.refresh();
	},

	form_956a_filled(frm) {
		if (!frm.doc.form_956a_filled) {
			createCOEReminder(frm, null, "Complete 956A Form");
		}
		frm.refresh();
	},

	file_lodged_status(frm) {
		if (!frm.doc.file_lodged_status && frm.doc.file_lodged_by === 'Our Side') {
			createCOEReminder(frm, null, "Submit Visa File Lodgement");
		}
		frm.refresh();
	},

	agent_file_lodged_status(frm) {
		if (!frm.doc.agent_file_lodged_status && frm.doc.file_lodged_by === 'Agent') {
			createCOEReminder(frm, null, "Submit Visa File Lodgement - Agent");
		}
		frm.refresh();
	},

	student_file_lodged_status(frm) {
		if (!frm.doc.student_file_lodged_status && frm.doc.file_lodged_by === 'Student') {
			createCOEReminder(frm, null, "Submit Visa File Lodgement - Student");
		}
		frm.refresh();
	},

	vendor_file_lodged_status(frm) {
		if (!frm.doc.vendor_file_lodged_status && frm.doc.file_lodged_by === 'Vendor') {
			createCOEReminder(frm, null, "Submit Visa File Lodgement - Vendor");
		}
		frm.refresh();
	}
});

// Acceptance - Event Handlers
frappe.ui.form.on("Application", {
	acceptance_interview_deadline(frm) {
		if (frm.doc.acceptance_interview_deadline && frm.doc.acceptance_before_coe_available) {
			createAcceptanceReminder(frm, frm.doc.acceptance_interview_deadline, "Acceptance Interview Deadline - " + frappe.datetime.str_to_user(frm.doc.acceptance_interview_deadline));
		}
		frm.refresh();
	},

	acceptance_student_prepare(frm) {
		if (!frm.doc.acceptance_student_prepare && frm.doc.acceptance_before_coe_available) {
			createAcceptanceReminder(frm, null, "Prepare Student for Acceptance Interview");
		}
		frm.refresh();
	},

	acceptance_schedule_interview(frm) {
		if (!frm.doc.acceptance_schedule_interview && frm.doc.acceptance_before_coe_available) {
			createAcceptanceReminder(frm, null, "Follow Up Acceptance Interview Schedule");
		}
		if (frm.doc.acceptance_schedule_interview && frm.doc.acceptance_interview_deadline) {
			createAcceptanceReminder(frm, frm.doc.acceptance_interview_deadline, "Acceptance Interview Date - " + frappe.datetime.str_to_user(frm.doc.acceptance_interview_deadline));
		}
		frm.refresh();
	},

	acceptance_any_requirement(frm) {
		if (!frm.doc.acceptance_any_requirement) {
			createAcceptanceReminder(frm, null, "Waiting for COE");
		}
		frm.refresh();
	},

	acceptance_requirements_completed(frm) {
		if (!frm.doc.acceptance_requirements_completed && frm.doc.acceptance_any_requirement) {
			createAcceptanceReminder(frm, null, "Acceptance Requirement Completion Pending");
		}
		if (frm.doc.acceptance_requirements_completed && frm.doc.acceptance_any_requirement) {
			createAcceptanceReminder(frm, null, "Waiting for COE After Requirements Completion");
		}
		frm.refresh();
	}
});

// GS Approved - Event Handlers
frappe.ui.form.on("Application", {
	tuition_fee_paid(frm) {
		if (frm.doc.tuition_fee_paid) {
			checkAndDeactivateIntakeReminder(frm);
		} else {
			createGSReminder(frm, null, "Follow Up Tuition Fee Payment");
		}
		frm.refresh();
	},

	gha_policy_received(frm) {
		if (!frm.doc.gha_policy_received && frm.doc.oshc_arranged_by_type === 'GHA' && frm.doc.oshc_required) {
			createGSReminder(frm, null, "OSHC Policy Received from GHA");
		}
		frm.refresh();
	},

	agent_policy_received(frm) {
		if (!frm.doc.agent_policy_received && frm.doc.oshc_arranged_by_type === 'Agent' && frm.doc.oshc_required) {
			createGSReminder(frm, null, "OSHC Policy Received from Agent");
		}
		frm.refresh();
	},

	student_policy_received(frm) {
		if (!frm.doc.student_policy_received && frm.doc.oshc_arranged_by_type === 'Student' && frm.doc.oshc_required) {
			createGSReminder(frm, null, "OSHC Policy Received from Student");
		}
		frm.refresh();
	},

	acceptance_submitted(frm) {
		if (!frm.doc.acceptance_submitted) {
			createGSReminder(frm, null, "Acceptance Submission Pending");
		}
		frm.refresh();
	}
});

// GS Processing - Event Handlers
frappe.ui.form.on("Application", {
	interview_deadline(frm) {
		if (frm.doc.interview_deadline && frm.doc.interview_stage_available && frm.doc.name && !frm.doc.__islocal) {
			prompt_application_reminder(frm, {
				title: __("Set Interview Deadline Reminder"),
				default_description:
					"Interview Deadline - " + frappe.datetime.str_to_user(frm.doc.interview_deadline),
				default_date: frm.doc.interview_deadline,
				trigger_key: `gs_interview_deadline_${frm.doc.name}`,
			});
		}
		frm.refresh();
	},

	student_prepare(frm) {
		if (frm.doc.student_prepare !== "Yes") {
			frm.set_value("schedule_interview", "");
		}
		if (frm.doc.student_prepare === "No" && frm.doc.interview_stage_available) {
			prompt_application_reminder(frm, {
				title: __("Prepare Student for Interview"),
				default_description: "Prepare Student for Interview",
				trigger_key: `gs_prepare_student_${frm.doc.name}`,
			});
		}
		frm.refresh();
	},

	schedule_interview(frm) {
		if (frm.doc.schedule_interview === "No" && frm.doc.interview_stage_available) {
			prompt_application_reminder(frm, {
				title: __("Follow Up Interview Schedule"),
				default_description: "Follow Up Interview Schedule",
				trigger_key: `gs_followup_interview_${frm.doc.name}`,
			});
		}
		if (frm.doc.schedule_interview === "Yes" && frm.doc.interview_deadline && frm.doc.name && !frm.doc.__islocal) {
			prompt_application_reminder(frm, {
				title: __("Interview Date Reminder"),
				default_description:
					"Interview Date - " + frappe.datetime.str_to_user(frm.doc.interview_deadline),
				default_date: frm.doc.interview_deadline,
				trigger_key: `gs_interview_date_${frm.doc.name}`,
			});
		}
		frm.refresh();
	},

	gs_approved_check(frm) {
		if (frm.doc.gs_approved_check === "Yes") {
			frm.set_value("gs_any_requirement", "");
			frm.set_value("requirement_details", "");
			frm.set_value("requirements_completed", 0);
			if (["GS Processing", "Financial"].includes(frm.doc.status)) {
				frm.set_value("status", "GS Approved");
			}
			frappe.show_alert(
				{ message: __("Moved to GS Approved stage"), indicator: "green" },
				4
			);
		}
		frm.refresh();
	},

	gs_any_requirement(frm) {
		if (frm.doc.gs_approved_check === "Yes" || !frm.doc.interview_stage_available) {
			frm.refresh();
			return;
		}

		if (frm.doc.gs_any_requirement === "No") {
			AU_REMINDER_SESSION[`gs_waiting_approved_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Expecting GS Approved"),
				default_description: "Waiting for GS Approved",
				trigger_key: `gs_waiting_approved_${frm.doc.name}`,
			});
		} else if (frm.doc.gs_any_requirement === "Yes") {
			frm.set_value("requirements_completed", 0);
		} else {
			frm.set_value("requirement_details", "");
			frm.set_value("requirements_completed", 0);
		}
		frm.refresh();
	},

	requirements_completed(frm) {
		if (frm.doc.gs_approved_check === "Yes" || frm.doc.gs_any_requirement !== "Yes") {
			frm.refresh();
			return;
		}
		if (!frm.doc.requirements_completed) {
			AU_REMINDER_SESSION[`gs_requirement_pending_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Requirement Completion Pending"),
				default_description: "Requirement Completion Pending",
				trigger_key: `gs_requirement_pending_${frm.doc.name}`,
			});
		} else {
			AU_REMINDER_SESSION[`gs_waiting_after_req_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Waiting for GS Approved"),
				default_description: "Waiting for GS Approved After Requirements Completion",
				trigger_key: `gs_waiting_after_req_${frm.doc.name}`,
			});
		}
		frm.refresh();
	},
});

// Type of Funds - Event Handlers
frappe.ui.form.on("Application", {
	fd_is_balance_cert_available(frm) {
		if (!frm.doc.fd_is_balance_cert_available && frm.doc.funds_type === 'Fix deposit') {
			createTypesOfFundsReminder(frm, "Balance Certificate Required for FD");
		}
		frm.refresh();
	},

	bs_is_balance_cert_available(frm) {
		if (!frm.doc.bs_is_balance_cert_available && frm.doc.funds_type === 'Bank statement') {
			createTypesOfFundsReminder(frm, "Balance Certificate Required for Bank Statement");
		}
		frm.refresh();
	},

	bs_cert_date_matches(frm) {
		if (!frm.doc.bs_cert_date_matches && frm.doc.bs_is_balance_cert_available && frm.doc.funds_type === 'Bank statement') {
			createTypesOfFundsReminder(frm, "Bank Statement and Balance Certificate Dates Mismatch");
		}
		frm.refresh();
	},

	el_is_for_education(frm) {
		if (!frm.doc.el_is_for_education && frm.doc.funds_type === 'Education loan') {
			createTypesOfFundsReminder(frm, "Revised Education Loan Letter Required");
		}
		frm.refresh();
	},

	el_holder_name_matches_student(frm) {
		if (!frm.doc.el_holder_name_matches_student && frm.doc.funds_type === 'Education loan') {
			createTypesOfFundsReminder(frm, "Revised Education Loan Letter Required - Holder Name Mismatch");
		}
		frm.refresh();
	},

	el_covers_funds_requirement(frm) {
		if (!frm.doc.el_covers_funds_requirement && frm.doc.funds_type === 'Education loan') {
			createTypesOfFundsReminder(frm, "Revised Education Loan Letter Required - Amount Not Covering");
		}
		frm.refresh();
	}
});

// Helper function to create Refund reminder
function createRefundReminder(frm, specificDate, description) {
	prompt_legacy_reminder(frm, specificDate, description, "refund");
}

// Helper function to create College Change reminder
function createCollegeChangeReminder(frm, specificDate, description) {
	prompt_legacy_reminder(frm, specificDate, description, "college_change");
}

// Helper function to create Visa reminder
function createVisaReminder(frm, specificDate, description) {
	prompt_legacy_reminder(frm, specificDate, description, "visa");
}

// Helper function to send Visa Approved notification to Account Department
function createVisaApprovedNotification(frm) {
	if (!frm.doc.name || frm.doc.__islocal) {
		return;
	}

	// Get all Account Department users
	frappe.db.get_list("User", {
		filters: {
			"User User Role.role": "Account Department"
		},
		fields: ["name", "email"]
	}).then(function (users) {
		if (users.length > 0) {
			// Get application details
			const appDetails = `
Application ID: ${frm.doc.name}
Student Name: ${frm.doc.student || 'N/A'}
Destination Country: ${frm.doc.destination_country || 'N/A'}
Visa Status: APPROVED
COE Uploaded: ${frm.doc.coe_uploaded ? 'Yes' : 'No'}
TRN Number: ${frm.doc.trn_number || 'N/A'}
`;

			// Create notification for each Account Department user
			users.forEach(function (user) {
				frappe.call({
					method: 'frappe.client.set_value',
					args: {
						doctype: 'User',
						name: user.name,
						fieldname: '_assign',
						value: JSON.stringify([{ 'user': user.name, 'user_email': user.email }])
					}
				});
			});

			frappe.show_alert({
				message: 'Visa Approved notification sent to Account Department',
				indicator: 'green'
			}, 3);
		}
	});
}

// Helper function to create COE reminder
function createCOEReminder(frm, specificDate, description) {
	prompt_legacy_reminder(frm, specificDate, description, "coe");
}

// Helper function to create Acceptance reminder
function createAcceptanceReminder(frm, specificDate, description) {
	prompt_legacy_reminder(frm, specificDate, description, "acceptance");
}

// Helper function to create GS Processing reminder
function createGSReminder(frm, specificDate, description) {
	prompt_legacy_reminder(frm, specificDate, description, "gs");
}

// Helper function to create Types of Funds reminder
function createTypesOfFundsReminder(frm, description) {
	prompt_legacy_reminder(frm, null, description, "funds");
}

// Helper function to create interview deadline reminder (legacy — use prompt_application_reminder)
function createInterviewDeadlineReminder(frm, deadlineDate) {
	if (!deadlineDate || !frm.doc.name || frm.doc.__islocal) {
		return;
	}
	prompt_application_reminder(frm, {
		title: __("Set Interview Deadline Reminder"),
		default_description: "Interview deadline - " + frappe.datetime.str_to_user(deadlineDate),
		default_date: deadlineDate,
		trigger_key: `interview_deadline_${frm.doc.name}`,
	});
}

// Keep Financials condition sections in sync when Offer Letter conditions change
frappe.ui.form.on("Application Offer Letter Condition", {
	condition(frm) {
		sync_financial_condition_visibility(frm);
		refresh_financial_condition_sections(frm);
	},
	conditions_on_offer_letter_remove(frm) {
		sync_financial_condition_visibility(frm);
		refresh_financial_condition_sections(frm);
	},
	conditions_on_offer_letter_add(frm) {
		sync_financial_condition_visibility(frm);
		refresh_financial_condition_sections(frm);
	},
});

function update_english_test_validity(frm, cdt, cdn) {
	const row = locals[cdt][cdn];
	if (!row) {
		return;
	}

	if (!["IELTS", "PTE", "TOEFL"].includes(row.test_type)) {
		return;
	}

	frappe.model.set_value(cdt, cdn, "validity_months", 24);

	if (!row.exam_date) {
		frappe.model.set_value(cdt, cdn, "validity_until", "");
		frappe.model.set_value(cdt, cdn, "validity_status", "");
		frappe.model.set_value(cdt, cdn, "validity", 0);
		return;
	}

	const valid_until = frappe.datetime.add_months(row.exam_date, 24);
	const is_valid = frappe.datetime.get_diff(valid_until, frappe.datetime.get_today()) >= 0;

	frappe.model.set_value(cdt, cdn, "validity_until", valid_until);
	frappe.model.set_value(cdt, cdn, "validity_status", is_valid ? "Valid" : "Not Valid");
	frappe.model.set_value(cdt, cdn, "validity", is_valid ? 1 : 0);
}

function clear_visa_refusal_downstream(frm) {
	[
		"visa_refused_can_process",
		"visa_refused_go_ahead_status",
		"visa_refused_other_country",
		"visa_refused_other_country_name",
		"visa_refused_new_application",
		"visa_refused_close_reason",
		"visa_refused_closed_status",
	].forEach((field) => frm.set_value(field, ""));
}

// IELTS / PTE / TOEFL — auto validity = 24 months from result date
frappe.ui.form.on("Application English Test", {
	test_type(frm, cdt, cdn) {
		update_english_test_validity(frm, cdt, cdn);
	},
	exam_date(frm, cdt, cdn) {
		update_english_test_validity(frm, cdt, cdn);
	},
});

// Need Assessment — per-vendor reminders
frappe.ui.form.on("Need Assessment Vendor", {
	assessment_channel(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.assessment_channel !== "Vendor") {
			frappe.model.set_value(cdt, cdn, "vendor", "");
		}
	},
	assessment_received(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.assessment_received !== "Yes") {
			frappe.model.set_value(cdt, cdn, "options_provided_to_student", "");
			frappe.model.set_value(cdt, cdn, "student_confirmed_to_apply", "");
			frappe.model.set_value(cdt, cdn, "university", "");
			frappe.model.set_value(cdt, cdn, "course", "");
		}
		if (row.assessment_received === "No" && frm.doc.name && !frm.doc.__islocal) {
			prompt_application_reminder(frm, {
				title: __("Receive Assessment"),
				default_description: "Follow up — when will you receive the assessment?",
				trigger_key: `na_receive_${frm.doc.name}_${cdn}`,
			});
		}
	},
	options_provided_to_student(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.options_provided_to_student !== "Yes") {
			frappe.model.set_value(cdt, cdn, "student_confirmed_to_apply", "");
			frappe.model.set_value(cdt, cdn, "university", "");
			frappe.model.set_value(cdt, cdn, "course", "");
		}
		if (row.options_provided_to_student === "No" && frm.doc.name && !frm.doc.__islocal) {
			prompt_application_reminder(frm, {
				title: __("Send Options to Student"),
				default_description: "Follow up — when will you send options to the student?",
				trigger_key: `na_options_${frm.doc.name}_${cdn}`,
			});
		}
	},
	student_confirmed_to_apply(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.student_confirmed_to_apply !== "Yes") {
			frappe.model.set_value(cdt, cdn, "university", "");
			frappe.model.set_value(cdt, cdn, "course", "");
		}
		if (row.student_confirmed_to_apply === "No" && frm.doc.name && !frm.doc.__islocal) {
			prompt_application_reminder(frm, {
				title: __("Student Confirmation to Apply"),
				default_description: "Follow up — when will the student confirm to apply?",
				trigger_key: `na_confirm_${frm.doc.name}_${cdn}`,
			});
		}
	},
});

