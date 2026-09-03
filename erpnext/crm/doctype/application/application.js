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
		"financials_student_prepare",
		"financials_schedule_interview",
		"financials_interview_completed",
		"english_requirement_section",
		"english_requirement_details",
		"english_requirement_documents",
		"gap_justification_section",
		"gap_justification_details",
		"gap_justification_documents",
		"verification_section",
		"verification_verified",
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
		Interview: [
			"interview_condition_section",
			"interview_timing",
			"interview_deadline_date",
			"financials_student_prepare",
			"financials_student_prepare_yes_status",
			"financials_student_prepare_no_status",
			"financials_schedule_interview",
			"financials_schedule_interview_yes_status",
			"financials_schedule_interview_no_status",
			"financials_interview_completed",
		],
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
		Verification: ["verification_section", "verification_verified", "verification_type"],
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

	// Verification condition → default Verified = No; hide type until Not verified
	const has_verification = has_offer_letter_condition(frm, "Verification");
	if (has_verification) {
		if (!frm.doc.verification_verified) {
			frm.set_value("verification_verified", "No");
		}
		const show_type = frm.doc.verification_verified === "No";
		if (frm.fields_dict.verification_type) {
			frm.set_df_property("verification_type", "hidden", show_type ? 0 : 1);
		}
		if (frm.doc.verification_verified === "Yes" && frm.doc.verification_type) {
			frm.set_value("verification_type", "");
		}
	} else {
		if (frm.doc.verification_verified) {
			frm.set_value("verification_verified", "");
		}
		if (frm.doc.verification_type) {
			frm.set_value("verification_type", "");
		}
	}

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

	const labels = [tab_label];
	if (tab_fieldname === "coe_tab") {
		labels.push("eCOE", "COE");
	}

	const $link = frm.$wrapper
		.find(".form-tabs .nav-link")
		.filter(function () {
			const text = ($(this).text() || "").trim();
			const df = $(this).attr("data-fieldname") || "";
			return (
				df === tab_fieldname ||
				labels.includes(text) ||
				labels.some((label) => text === __(label))
			);
		})
		.first();

	if ($link.length) {
		$link.trigger("click");
	} else {
		frm.scroll_to_field(tab_fieldname);
	}
}

function get_status_rank(status) {
	const ranks = {
		Pending: 0,
		Processing: 1,
		Submitted: 2,
		"Offer Letter Received": 3,
		Financial: 4,
		"GS Processing": 5,
		"GS Approved": 6,
		Acceptance: 7,
		COE: 8,
		eCOE: 8,
		"File Lodged": 9,
		Visa: 10,
		"Visa Refused": 10,
		"On Shore College change": 10,
		Enrollment: 11,
		Refund: 11,
		Completed: 12,
		Refunded: 12,
	};
	return ranks[status];
}

function resolve_coe_status_option(frm) {
	const options = String(frm?.fields_dict?.status?.df?.options || "")
		.split("\n")
		.map((x) => x.trim())
		.filter(Boolean);
	if (options.includes("eCOE")) {
		return "eCOE";
	}
	return "COE";
}

function advance_status_if_forward(frm, next_status) {
	if (!next_status || !frm || frm.doc.__islocal) {
		return Promise.resolve();
	}
	if (["Closed", "Completed"].includes(frm.doc.status)) {
		return Promise.resolve();
	}
	const current_rank = get_status_rank(frm.doc.status);
	const next_rank = get_status_rank(next_status);
	if (next_rank === undefined) {
		return Promise.resolve();
	}
	if (current_rank === undefined || next_rank > current_rank) {
		return frm.set_value("status", next_status);
	}
	return Promise.resolve();
}

function save_application_if_needed(frm) {
	if (!frm || frm.doc.__islocal || !frm.is_dirty()) {
		return Promise.resolve();
	}
	return frm.save();
}

// Shared stage-gate transition. Every "Yes" stage gate does the same three things
// in a strict order: advance status forward, persist, and only then move tabs.
// Previously each gate switched tabs on a 250ms timer without ever saving, so the
// stage was lost on reload and the incoming tab could render before the save
// settled — which is what made the next tab's fields appear inside the current one.
function complete_stage_and_advance(frm, { next_status, tab_fieldname, tab_label, message }) {
	return advance_status_if_forward(frm, next_status)
		.then(() => save_application_if_needed(frm))
		.then(() => {
			activate_application_tab(frm, tab_fieldname, tab_label);
			if (message) {
				frappe.show_alert({ message: __(message), indicator: "green" }, 4);
			}
		})
		.catch((error) => {
			frappe.show_alert(
				{ message: __("Could not save — stage not advanced"), indicator: "red" },
				5
			);
			throw error;
		});
}

function setup_processing_agent_query(frm) {
	frm.set_query("processing_agent_vendor", "processing_agent_details", () => ({
		query: "erpnext.crm.doctype.application.application.get_processing_vendor_options",
		filters: {
			university: frm.doc.preferred_university || frm.doc.university_name || "",
		},
	}));
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
	} else if (
		frm.doc.any_further_requirement_offer_letter === "Yes" &&
		frm.doc.submitted_requirement_type === "Other"
	) {
		if (frm.doc.pending_requirements_completed === "No") {
			prompt_application_reminder(frm, {
				title: __("Complete Pending Requirements"),
				default_description: "To Complete Pending requirements",
				trigger_key: `submitted_pending_${frm.doc.name}`,
			});
		} else if (
			frm.doc.pending_requirements_completed === "Yes" &&
			(frm.doc.supporting_documents || []).some((row) => row.upload_document)
		) {
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

function clear_gs_submitted_no_branch(frm) {
	[
		"gs_submitted_reminder_date",
		"student_will_process_gs",
		"will_process_gs_another_university",
		"gs_another_university_application_id",
		"will_process_another_country",
		"gs_another_country_name",
		"gs_another_country_application_id",
		"gs_not_process_reason",
		"gs_close_this_application",
	].forEach((field) => {
		if (frm.doc[field]) {
			frm.set_value(field, "");
		}
	});
}

function apply_academic_gap_docs_visibility(frm) {
	const show = frm.doc.study_gap === "Yes";
	["student_academic_verification", "spouse_academic_verification"].forEach((fieldname) => {
		const grid = frm.fields_dict[fieldname] && frm.fields_dict[fieldname].grid;
		if (!grid) {
			return;
		}
		grid.update_docfield_property("gap_docs_notarized_upload", "hidden", show ? 0 : 1);
		grid.update_docfield_property("gap_docs_notarized_upload", "reqd", show ? 1 : 0);
	});
}

function setup_gs_application_link_query(frm) {
	if (!frm.fields_dict.gs_another_country_application_id) {
		return;
	}
	frm.set_query("gs_another_country_application_id", () => ({
		filters: frm.doc.name ? { name: ["!=", frm.doc.name] } : {},
	}));
}

function prompt_sponsor_funds_reminder(frm, cdt, cdn, options) {
	if (!frm.doc.name || frm.doc.__islocal) {
		return;
	}
	const trigger_key = `${options.trigger_key}_${frm.doc.name}_${cdn}`;
	AU_REMINDER_SESSION[trigger_key] = false;
	prompt_application_reminder(frm, {
		title: options.title,
		default_description: options.default_description,
		trigger_key: trigger_key,
	});
}

function set_nationalized_status(cdt, cdn, source_field, status_field) {
	const row = locals[cdt][cdn];
	if (!row) {
		return;
	}
	const value = row[source_field];
	let status = "";
	if (value === "Yes") {
		status = "✓ Accepted";
	} else if (value === "No") {
		status = "Not accepted — funds must be in a nationalized bank.";
	}
	if (row[status_field] !== status) {
		frappe.model.set_value(cdt, cdn, status_field, status);
	}
}

function close_application_from_financials(frm, message) {
	if (frm.doc.status !== "Closed") {
		frm.set_value("status", "Closed");
	}
	frappe.show_alert({ message: message, indicator: "orange" }, 6);
}

function maybe_close_for_another_country(frm) {
	if (
		frm.doc.gs_submitted === "No" &&
		frm.doc.student_will_process_gs === "No" &&
		frm.doc.will_process_gs_another_university === "No" &&
		frm.doc.will_process_another_country === "Yes" &&
		(frm.doc.gs_another_country_name || "").trim() &&
		(frm.doc.gs_another_country_application_id || "").trim()
	) {
		close_application_from_financials(
			frm,
			__("Closed — processing in {0} (Application: {1})", [
				frm.doc.gs_another_country_name,
				frm.doc.gs_another_country_application_id,
			])
		);
	}
}

// Interview Timing decides which stage runs the interview workflow:
//   Before GS Submitted   -> Financials tab (gated directly on interview_timing)
//   Before GS Approval -> GS Submitted tab
//   Before Acceptance  -> GS Approved tab
//   Before COE         -> Acceptance tab
// The GS Approval yes/no decision on the GS Submitted tab is independent of all
// of this and always shows.
function sync_gs_interview_stage_from_financials(frm) {
	const has_interview = has_offer_letter_condition(frm, "Interview");
	const timing = has_interview ? frm.doc.interview_timing : "";

	const flags = {
		interview_stage_available: timing === "Before GS Approval" ? 1 : 0,
		gsa_interview_available: timing === "Before Acceptance" ? 1 : 0,
		acceptance_before_coe_available: timing === "Before COE" ? 1 : 0,
	};

	Object.keys(flags).forEach((fieldname) => {
		if (!!frm.doc[fieldname] !== !!flags[fieldname]) {
			frm.set_value(fieldname, flags[fieldname]);
		}
	});
}

function deactivate_reminders_matching(frm, patterns, options = {}) {
	if (!frm.doc.name || frm.doc.__islocal) {
		return;
	}
	const needles = (Array.isArray(patterns) ? patterns : [patterns])
		.filter(Boolean)
		.map((pattern) => pattern.toLowerCase());
	if (!needles.length) {
		return;
	}
	// Stage descriptions overlap by substring (e.g. "Submitted Interview Deadline"
	// contains "Interview Deadline"), so callers can exclude other stages.
	const excludes = (options.exclude || []).map((pattern) => pattern.toLowerCase());

	frappe.db
		.get_list("Reminder", {
			filters: {
				reminder_doctype: "Application",
				reminder_docname: frm.doc.name,
				notified: 0,
			},
			fields: ["name", "description"],
			limit: 100,
		})
		.then((rows) => {
			const matched = (rows || []).filter((row) => {
				const description = String(row.description || "").toLowerCase();
				if (excludes.some((pattern) => description.includes(pattern))) {
					return false;
				}
				return needles.some((needle) => description.includes(needle));
			});

			matched.forEach((row) => frappe.db.set_value("Reminder", row.name, "notified", 1));

			if (matched.length) {
				frappe.show_alert(
					{
						message: options.message || __("Reminder deactivated"),
						indicator: "blue",
					},
					3
				);
			}
		});
}

// Submitted-stage interview reminders are separate from the Offer Letter
// condition interview used by Financials / GS Processing / Acceptance.
const SUBMITTED_INTERVIEW_REMINDERS = [
	"Submitted Interview Deadline",
	"Submitted Interview Date",
	"Submitted Interview - Student Preparation",
	"Submitted Interview - Scheduling Follow-up",
];

const CONDITION_INTERVIEW_REMINDERS = ["Interview Deadline", "Interview Date"];

// Every reminder description used while the application waits on the COE.
const COE_RECEIPT_REMINDERS = [
	"Follow-up for COE Receipt",
	"Set Reminder to receive COE & proceed to next stage",
	"Waiting for COE After Requirements Completion",
	"Acceptance Requirement Completion Pending",
];

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

function render_tuition_deposit_reminder_section(frm) {
	const field = frm.fields_dict.tuition_deposit_intake_html;
	if (!field || !field.$wrapper) {
		return;
	}

	const intake = frm.doc.university_intake;
	const display_date = intake
		? frappe.datetime.str_to_user(intake)
		: __("No Intake Date selected");
	const hint = intake
		? __("Use Set Reminder below to schedule the tuition fee deposit deadline.")
		: __("Select the Intake Date in Offer Letter Details first.");

	field.$wrapper.html(
		`<div class="text-muted">${__("Selected Intake Date")}</div>
		<div style="font-size: 1.05rem; font-weight: 600; margin-top: 4px;">
			${frappe.utils.escape_html(display_date)}
		</div>
		<div class="text-muted" style="margin-top: 6px;">${hint}</div>`
	);
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

function is_uk_destination(country) {
	const c = (country || "").trim().toLowerCase();
	return ["united kingdom", "uk", "great britain", "britain", "england"].includes(c);
}

function is_au_destination(country) {
	return (country || "").toLowerCase().includes("australia");
}

/** Details: Below 1 / Below 2 Years → Accepted; Above 2 Years → Not Accepted.
 *  Processing proof table shows only when Accepted (no duration re-entry). */
function apply_gap_duration_rule(frm) {
	const d = frm.doc.gap_duration;
	const accepted = d === "Below 1 Year" || d === "Below 2 Years" || d === "Up to 1 Year";
	const not_accepted = d === "Above 2 Years" || d === "More than 1 Year";

	const set_if = (field, value) => {
		if ((frm.doc[field] || "") !== (value || "")) {
			frm.set_value(field, value || "");
		}
	};

	if (frm.doc.study_gap !== "Yes") {
		set_if("gap_duration_status", "");
		set_if("gap_duration_not_accepted", "");
		return;
	}

	if (accepted) {
		set_if("gap_duration_status", "Accepted");
		set_if("gap_duration_not_accepted", "");
		set_if("study_gap_status", "Accepted");
		set_if("study_gap_not_accepted_status", "");
		set_if("study_gap_upto_1_year", "Yes");
	} else if (not_accepted) {
		set_if("gap_duration_status", "");
		set_if("gap_duration_not_accepted", "Not Accepted");
		set_if("study_gap_status", "");
		set_if("study_gap_not_accepted_status", "Not Accepted");
		set_if("study_gap_upto_1_year", "No");
		if ((frm.doc.study_gap_proof_list || []).length) {
			frm.clear_table("study_gap_proof_list");
			frm.refresh_field("study_gap_proof_list");
		}
	} else {
		set_if("gap_duration_status", "");
		set_if("gap_duration_not_accepted", "");
		set_if("study_gap_status", "");
		set_if("study_gap_not_accepted_status", "");
	}
}

function student_contact_from(stu) {
	return normalize_phone_for_save(stu.mobile || stu.mobile_no || stu.phone || stu.contact_no || "");
}

function normalize_phone_for_save(value) {
	if (!value) return "";
	const raw = String(value).trim();
	const digits = raw.replace(/\D/g, "");
	if (raw.startsWith("+") && digits.length >= 8) return raw;
	if (digits.length === 10) return `+91-${digits}`;
	if (digits.length === 12 && digits.startsWith("91")) return `+91-${digits.slice(2)}`;
	if (digits.length === 11 && digits.startsWith("0")) return `+91-${digits.slice(1)}`;
	return "";
}

function calculate_age_from_dob(dob_str) {
	if (!dob_str) return "";
	const dob = frappe.datetime.str_to_obj(dob_str);
	if (!dob) return "";
	const today = new Date();
	let age = today.getFullYear() - dob.getFullYear();
	const monthDiff = today.getMonth() - dob.getMonth();
	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
		age--;
	}
	return age >= 0 ? age : "";
}

function apply_age_from_dob(frm) {
	if (!frm.fields_dict.current_age) return;
	frm.set_df_property("current_age", "hidden", 0);
	const age = calculate_age_from_dob(frm.doc.dob);
	if (frm.doc.current_age !== age) {
		frm.set_value("current_age", age === "" ? "" : age);
	}
}

function apply_student_defaults_to_form(frm) {
	if (!frm.doc.student) return;
	frappe.db.get_doc("Student", frm.doc.student).then((stu) => {
		const email = stu.email || stu.student_email;
		if (email && !frm.doc.student_email) frm.set_value("student_email", email);
		const contact = student_contact_from(stu);
		if (contact && !frm.doc.student_contact_no) frm.set_value("student_contact_no", contact);
		const dob = stu.dob || stu.date_of_birth;
		if (dob && !frm.doc.dob) {
			frm.set_value("dob", dob).then(() => apply_age_from_dob(frm));
		} else {
			apply_age_from_dob(frm);
		}
	});
}

/** Force child tables to open the row form when Add Row is clicked.
 *  Uses capture-phase click so it still works after frm.refresh_fields() remakes grids
 *  (that was wiping per-button handlers — Sponsors under Financials was affected).
 */
function patch_form_view_tables(frm) {
	// Keep child metas in form-view mode (not inline editable grid)
	(frm.meta.fields || [])
		.filter((df) => df.fieldtype === "Table" && df.options)
		.forEach((df) => {
			frappe.model.with_doctype(df.options, () => {
				const meta = frappe.get_meta(df.options);
				if (meta) meta.editable_grid = 0;
				const grid = frm.fields_dict[df.fieldname]?.grid;
				if (grid) {
					grid.meta = meta;
					if (typeof grid.setup_fields === "function") {
						try {
							grid.setup_fields();
						} catch (e) {
							/* ignore until doctype fully ready */
						}
					}
					if (grid.meta) grid.meta.editable_grid = 0;
					grid.allow_on_grid_editing = function () {
						return false;
					};
					grid.set_focus_on_row = function () {};
					patch_grid_row_toggle(grid, df.options);
				}
			});
			const grid = frm.fields_dict[df.fieldname]?.grid;
			if (grid) {
				if (grid.meta) grid.meta.editable_grid = 0;
				grid.allow_on_grid_editing = function () {
					return false;
				};
				grid.set_focus_on_row = function () {};
			}
		});

	if (frm._unideft_capture_add || !frm.wrapper) return;
	frm._unideft_capture_add = true;

	frm.wrapper.addEventListener(
		"click",
		(e) => {
			const btn = e.target && e.target.closest && e.target.closest(".grid-add-row");
			if (!btn || !frm.wrapper.contains(btn)) return;

			const control_el = btn.closest("[data-fieldname]");
			const fieldname = control_el && control_el.getAttribute("data-fieldname");
			if (!fieldname || !frm.fields_dict[fieldname] || !frm.fields_dict[fieldname].grid) {
				return;
			}

			const grid = frm.fields_dict[fieldname].grid;
			if (!grid.wrapper || !grid.wrapper.get(0).contains(btn)) return;

			// Stop Frappe's stock Add Row (which also calls set_focus_on_row and undoes form view)
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();

			if (!grid.is_editable()) return;

			const child_dt = grid.doctype || grid.df?.options;
			if (!child_dt) return;

			try {
				const child = frappe.model.add_child(frm.doc, child_dt, fieldname);
				child.__unedited = true;
				frm.script_manager.trigger(fieldname + "_add", child.doctype, child.name);
				grid.refresh();
				open_child_row_form(frm, grid, child, child_dt);
			} catch (err) {
				console.error("add child row", fieldname, err);
				frappe.msgprint({
					title: __("Add Row failed"),
					message: err.message || String(err),
					indicator: "red",
				});
			}
		},
		true
	);
}

/** Load full child (+ nested table) meta, then open row for editing. */
function open_child_row_form(frm, grid, child, child_dt) {
	// Application Sponsor Complete breaks Frappe's in-grid form (permlevel / nested tables).
	// Use a Dialog editor instead — reliable for client use.
	if (child_dt === "Application Sponsor Complete") {
		open_child_row_dialog(frm, grid, child, child_dt);
		return;
	}

	const nested_from_meta = (meta) =>
		(meta?.fields || [])
			.filter((f) => f.fieldtype === "Table" && f.options)
			.map((f) => f.options);

	const open_row = () => {
		const orig_status = frappe.perm.get_field_display_status;
		frappe.perm.get_field_display_status = function (df, doc, perm, explain) {
			if (!df) return "None";
			return orig_status.call(this, df, doc, perm, explain);
		};
		try {
			const row =
				grid.grid_rows_by_docname?.[child.name] ||
				(grid.grid_rows && grid.grid_rows[grid.grid_rows.length - 1]);
			if (!row) return;

			if (frappe.meta.docfield_copy?.[child_dt]) {
				delete frappe.meta.docfield_copy[child_dt][child.name];
			}
			frappe.meta.make_docfield_copy_for(child_dt, child.name);
			row.docfields = (frappe.meta.get_docfields(child_dt, child.name) || []).filter(
				(df) => df && df.fieldname
			);
			if (grid.meta) grid.meta.editable_grid = 0;
			grid.allow_on_grid_editing = function () {
				return false;
			};
			patch_grid_row_toggle(grid, child_dt);
			row.toggle_view(true);
		} catch (err) {
			console.error("open child form", child_dt, err);
			frappe.show_alert({
				message: __("Could not open {0} row form: {1}", [child_dt, err.message || err]),
				indicator: "red",
			});
		} finally {
			setTimeout(() => {
				frappe.perm.get_field_display_status = orig_status;
			}, 1500);
		}
	};

	const load_nested_then_open = (meta) => {
		const nested = nested_from_meta(meta);
		if (!nested.length) {
			open_row();
			return;
		}
		let left = nested.length;
		nested.forEach((dt) => {
			frappe.model.with_doctype(dt, () => {
				left -= 1;
				if (left <= 0) open_row();
			});
		});
	};

	frappe.model.with_doctype(child_dt, () => {
		const meta = frappe.get_meta(child_dt);
		if (meta) {
			meta.editable_grid = 0;
			grid.meta = meta;
			try {
				grid.setup_fields && grid.setup_fields();
			} catch (e) {
				/* continue */
			}
		}
		load_nested_then_open(meta);
	});
}

const CHILD_ROW_SKIP_KEYS = new Set([
	"name",
	"owner",
	"creation",
	"modified",
	"modified_by",
	"parent",
	"parentfield",
	"parenttype",
	"docstatus",
	"doctype",
	"idx",
]);

/** Reliable popup editor for heavy child tables (Sponsors). */
function open_child_row_dialog(frm, grid, child, child_dt) {
	if (!child || !child_dt) return;

	if (child_dt === "Application Sponsor Complete") {
		open_unified_sponsor_dialog(frm, grid, child);
		return;
	}

	const ensure_nested = (meta, cb) => {
		const nested = (meta.fields || [])
			.filter((f) => f && f.fieldtype === "Table" && f.options)
			.map((f) => f.options);
		if (!nested.length) {
			cb();
			return;
		}
		let left = nested.length;
		nested.forEach((dt) => {
			frappe.model.with_doctype(dt, () => {
				left -= 1;
				if (left <= 0) cb();
			});
		});
	};

	frappe.model.with_doctype(child_dt, () => {
		const meta = frappe.get_meta(child_dt);
		if (!meta) {
			frappe.msgprint(__("Could not load {0}", [child_dt]));
			return;
		}
		ensure_nested(meta, () => {
			const fields = (meta.fields || [])
				.filter((df) => df && df.fieldname)
				.map((df) => {
					const f = Object.assign({}, df);
					if (f.fieldtype === "Table" && f.options) {
						const child_meta = frappe.get_meta(f.options);
						f.fields = ((child_meta && child_meta.fields) || [])
							.filter((cf) => cf && cf.fieldname)
							.map((cf) => Object.assign({}, cf));
						f.data = (child[f.fieldname] || []).map((r) => Object.assign({}, r));
					}
					return f;
				});

			const d = new frappe.ui.Dialog({
				title: __(child_dt),
				fields: fields,
				size: "extra-large",
				primary_action_label: __("Done"),
				primary_action() {
					const values = d.get_values() || {};
					(meta.fields || []).forEach((df) => {
						if (!df || !df.fieldname) return;
						if ((frappe.model.layout_fields || []).includes(df.fieldtype)) return;
						if (df.fieldtype === "Table") {
							const ctrl = d.fields_dict[df.fieldname];
							const rows =
								(ctrl && ctrl.grid && typeof ctrl.grid.get_data === "function"
									? ctrl.grid.get_data()
									: null) || [];
							child[df.fieldname] = [];
							(rows || []).forEach((r, i) => {
								if (!df.options) return;
								const nr = frappe.model.add_child(child, df.options, df.fieldname);
								Object.keys(r || {}).forEach((k) => {
									if (k.startsWith("__") || CHILD_ROW_SKIP_KEYS.has(k)) return;
									nr[k] = r[k];
								});
								nr.idx = i + 1;
							});
						} else if (Object.prototype.hasOwnProperty.call(values, df.fieldname)) {
							child[df.fieldname] = values[df.fieldname];
						}
					});
					frm.dirty();
					frm.refresh_field(grid.df.fieldname);
					d.hide();
				},
			});
			d.show();
			setTimeout(() => {
				(meta.fields || []).forEach((df) => {
					if (!df || !df.fieldname) return;
					if (df.fieldtype === "Table") return;
					if ((frappe.model.layout_fields || []).includes(df.fieldtype)) return;
					const val = child[df.fieldname];
					if (val !== undefined && val !== null && val !== "") {
						try {
							d.set_value(df.fieldname, val);
						} catch (e) {
							/* ignore */
						}
					}
				});
			}, 100);
		});
	});
}

/**
 * One Sponsors dialog: identity + income + occupations + funds.
 * ITR / Form 16 / Occupation rows still live in the existing Application child
 * tables (logic unchanged) — they are managed from here and those tables are hidden.
 */
function open_unified_sponsor_dialog(frm, grid, child) {
	const prev_sponsor_type = child.sponsor_type;

	frappe.model.with_doctype("Application Sponsor Complete", () => {
		frappe.model.with_doctype("Application Sponsor ITR", () => {
			frappe.model.with_doctype("Application Sponsor Form 16", () => {
				frappe.model.with_doctype("Application Sponsor Occupation", () => {
					const meta = frappe.get_meta("Application Sponsor Complete");
					const fields = (meta.fields || [])
						.filter((df) => df && df.fieldname && !df.hidden)
						.map((df) => Object.assign({}, df));

					const d = new frappe.ui.Dialog({
						title: __("Sponsor — all documents in one place"),
						fields: fields,
						size: "extra-large",
						primary_action_label: __("Done"),
						primary_action() {
							const values = d.get_values() || {};
							(meta.fields || []).forEach((df) => {
								if (!df || !df.fieldname) return;
								if ((frappe.model.layout_fields || []).includes(df.fieldtype)) return;
								if (df.fieldtype === "HTML") return;
								if (Object.prototype.hasOwnProperty.call(values, df.fieldname)) {
									child[df.fieldname] = values[df.fieldname];
								}
							});

							// Retag related subdocs if sponsor type changed
							const new_type = child.sponsor_type;
							if (prev_sponsor_type && new_type && prev_sponsor_type !== new_type) {
								["sponsor_itrs", "sponsor_form_16", "sponsor_occupations"].forEach((table) => {
									(frm.doc[table] || []).forEach((r) => {
										if (r.sponsor_type === prev_sponsor_type) {
											r.sponsor_type = new_type;
										}
									});
								});
							}

							frm.dirty();
							frm.refresh_field(grid.df.fieldname);
							sync_sponsor_docs_pdf_rows(frm);
							d.hide();
						},
					});

					d.show();

					setTimeout(() => {
						(meta.fields || []).forEach((df) => {
							if (!df || !df.fieldname || df.fieldtype === "HTML") return;
							if ((frappe.model.layout_fields || []).includes(df.fieldtype)) return;
							const val = child[df.fieldname];
							if (val !== undefined && val !== null && val !== "") {
								try {
									d.set_value(df.fieldname, val);
								} catch (e) {
									/* ignore */
								}
							}
						});
						bind_sponsor_subdoc_managers(frm, d, child);
					}, 120);

					["income_support_documents", "occupation_documents_needed", "sponsor_type"].forEach(
						(fname) => {
							const f = d.fields_dict[fname];
							if (!f || !f.df) return;
							const prev = f.df.onchange;
							f.df.onchange = () => {
								if (typeof prev === "function") prev();
								setTimeout(() => bind_sponsor_subdoc_managers(frm, d, child), 30);
							};
						}
					);
				});
			});
		});
	});
}

function current_sponsor_type_from_dialog(d, child) {
	return (d.get_value("sponsor_type") || child.sponsor_type || "").trim();
}

function bind_sponsor_subdoc_managers(frm, d, child) {
	const stype = current_sponsor_type_from_dialog(d, child);
	const income = d.get_value("income_support_documents") || child.income_support_documents;
	const need_occ = d.get_value("occupation_documents_needed");
	const occ_needed = need_occ === 1 || need_occ === "1" || child.occupation_documents_needed == 1;

	render_sponsor_subdoc_manager(frm, d, {
		html_field: "itr_manager_html",
		table_field: "sponsor_itrs",
		child_dt: "Application Sponsor ITR",
		sponsor_type: stype,
		title: __("ITRs"),
		summary: (r) =>
			`${r.assessment_year || "—"} · ${format_currency_safe(r.itr_value)} · ${r.itr_verified || "—"}`,
		visible: income === "ITRs",
	});

	render_sponsor_subdoc_manager(frm, d, {
		html_field: "form16_manager_html",
		table_field: "sponsor_form_16",
		child_dt: "Application Sponsor Form 16",
		sponsor_type: stype,
		title: __("Form 16"),
		summary: (r) =>
			`${r.assessment_year || "—"} · ${format_currency_safe(r.income_value)}`,
		visible: income === "Form 16",
	});

	render_sponsor_subdoc_manager(frm, d, {
		html_field: "occupation_manager_html",
		table_field: "sponsor_occupations",
		child_dt: "Application Sponsor Occupation",
		sponsor_type: stype,
		title: __("Occupations"),
		summary: (r) => `${r.sponsor_occupation || "—"}`,
		visible: occ_needed,
	});
}

function format_currency_safe(v) {
	if (v === undefined || v === null || v === "") return "—";
	try {
		return format_currency(v, "INR");
	} catch (e) {
		return String(v);
	}
}

function render_sponsor_subdoc_manager(frm, d, opts) {
	const ctrl = d.fields_dict[opts.html_field];
	if (!ctrl || !ctrl.$wrapper) return;

	if (!opts.visible) {
		ctrl.$wrapper.html("").closest(".frappe-control").hide();
		return;
	}
	ctrl.$wrapper.closest(".frappe-control").show();

	if (!opts.sponsor_type) {
		ctrl.$wrapper.html(
			`<div class="text-muted" style="padding:8px 0;">${__(
				"Select Sponsor Type above first, then add {0}.",
				[opts.title]
			)}</div>`
		);
		return;
	}

	const rows = (frm.doc[opts.table_field] || []).filter(
		(r) => (r.sponsor_type || "") === opts.sponsor_type
	);

	let html = `<div class="sponsor-subdoc-mgr" style="border:1px solid var(--border-color);border-radius:8px;padding:10px 12px;margin:4px 0 12px;">
		<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
			<strong>${frappe.utils.escape_html(opts.title)}</strong>
			<button type="button" class="btn btn-xs btn-primary btn-add-subdoc">${__("Add")} ${frappe.utils.escape_html(opts.title)}</button>
		</div>`;

	if (!rows.length) {
		html += `<div class="text-muted">${__("None yet — click Add.")}</div>`;
	} else {
		html += `<table class="table table-bordered table-condensed" style="margin:0;">
			<thead><tr><th>#</th><th>${__("Summary")}</th><th style="width:120px;"></th></tr></thead><tbody>`;
		rows.forEach((r, i) => {
			html += `<tr data-name="${frappe.utils.escape_html(r.name)}">
				<td>${i + 1}</td>
				<td>${frappe.utils.escape_html(opts.summary(r))}</td>
				<td class="text-right">
					<button type="button" class="btn btn-xs btn-default btn-edit-subdoc">${__("Edit")}</button>
					<button type="button" class="btn btn-xs btn-danger btn-del-subdoc">${__("Delete")}</button>
				</td>
			</tr>`;
		});
		html += `</tbody></table>`;
	}
	html += `</div>`;
	ctrl.$wrapper.html(html);

	ctrl.$wrapper.find(".btn-add-subdoc").on("click", () => {
		open_sponsor_subdoc_editor(frm, d, null, opts);
	});
	ctrl.$wrapper.find(".btn-edit-subdoc").on("click", function () {
		const name = $(this).closest("tr").attr("data-name");
		const row = (frm.doc[opts.table_field] || []).find((r) => r.name === name);
		open_sponsor_subdoc_editor(frm, d, row, opts);
	});
	ctrl.$wrapper.find(".btn-del-subdoc").on("click", function () {
		const name = $(this).closest("tr").attr("data-name");
		frappe.confirm(__("Remove this row?"), () => {
			frm.doc[opts.table_field] = (frm.doc[opts.table_field] || []).filter((r) => r.name !== name);
			(frm.doc[opts.table_field] || []).forEach((r, i) => {
				r.idx = i + 1;
			});
			frm.dirty();
			frm.refresh_field(opts.table_field);
			bind_sponsor_subdoc_managers(frm, d, {
				sponsor_type: opts.sponsor_type,
				income_support_documents: d.get_value("income_support_documents"),
				occupation_documents_needed: d.get_value("occupation_documents_needed"),
			});
		});
	});
}

function open_sponsor_subdoc_editor(frm, parent_dialog, row, opts) {
	const meta = frappe.get_meta(opts.child_dt);
	if (!meta) {
		frappe.msgprint(__("Could not load {0}", [opts.child_dt]));
		return;
	}

	const fields = (meta.fields || [])
		.filter((df) => df && df.fieldname && df.fieldname !== "sponsor_type")
		.map((df) => Object.assign({}, df));

	// Show which sponsor this belongs to
	fields.unshift({
		fieldname: "_sponsor_type_display",
		fieldtype: "Data",
		label: __("Sponsor"),
		read_only: 1,
		default: opts.sponsor_type,
	});

	const is_new = !row;
	const d = new frappe.ui.Dialog({
		title: is_new ? __("Add {0}", [opts.title]) : __("Edit {0}", [opts.title]),
		fields: fields,
		size: opts.child_dt === "Application Sponsor Occupation" ? "extra-large" : "large",
		primary_action_label: __("Save"),
		primary_action() {
			const values = d.get_values() || {};
			delete values._sponsor_type_display;

			let target = row;
			if (is_new) {
				target = frappe.model.add_child(frm.doc, opts.child_dt, opts.table_field);
			}
			target.sponsor_type = opts.sponsor_type;
			(meta.fields || []).forEach((df) => {
				if (!df || !df.fieldname || df.fieldname === "sponsor_type") return;
				if ((frappe.model.layout_fields || []).includes(df.fieldtype)) return;
				if (Object.prototype.hasOwnProperty.call(values, df.fieldname)) {
					target[df.fieldname] = values[df.fieldname];
				}
			});

			frm.dirty();
			frm.refresh_field(opts.table_field);
			d.hide();
			bind_sponsor_subdoc_managers(frm, parent_dialog, {
				sponsor_type: opts.sponsor_type,
				income_support_documents: parent_dialog.get_value("income_support_documents"),
				occupation_documents_needed: parent_dialog.get_value("occupation_documents_needed"),
			});
		},
	});

	d.show();
	if (row) {
		setTimeout(() => {
			(meta.fields || []).forEach((df) => {
				if (!df || !df.fieldname || df.fieldname === "sponsor_type") return;
				if ((frappe.model.layout_fields || []).includes(df.fieldtype)) return;
				const val = row[df.fieldname];
				if (val !== undefined && val !== null && val !== "") {
					try {
						d.set_value(df.fieldname, val);
					} catch (e) {
						/* ignore */
					}
				}
			});
		}, 80);
	}
}

function hide_legacy_sponsor_subtables(frm) {
	[
		"sponsor_occupations_section",
		"sponsor_occupations",
		"sponsor_itrs_section",
		"sponsor_itrs",
		"sponsor_form_16_section",
		"sponsor_form_16",
	].forEach((f) => {
		if (frm.fields_dict[f]) {
			frm.set_df_property(f, "hidden", 1);
		}
	});
}


/** Ensure clicking an existing row opens the dialog/form correctly. */
function patch_grid_row_toggle(grid, child_dt) {
	const frm = grid.frm;
	(grid.grid_rows || []).forEach((row) => {
		if (row._unideft_toggle_patched) return;
		const original = row.toggle_view.bind(row);
		row.toggle_view = function (show, callback) {
			if (show !== false && show !== 0) {
				if (child_dt === "Application Sponsor Complete" && row.doc) {
					open_child_row_dialog(frm, grid, row.doc, child_dt);
					return row;
				}
				try {
					const name = row.doc?.name;
					if (name && child_dt) {
						if (frappe.meta.docfield_copy?.[child_dt]) {
							delete frappe.meta.docfield_copy[child_dt][name];
						}
						frappe.meta.make_docfield_copy_for(child_dt, name);
						row.docfields = (
							frappe.meta.get_docfields(child_dt, name) || []
						).filter((df) => df && df.fieldname);
					}
				} catch (e) {
					console.error("rebuild row docfields", e);
				}
			}
			return original(show, callback);
		};
		row._unideft_toggle_patched = true;
	});
}

const AU_STAGE_TABS = [
	"information_tab",
	"submitted_tab",
	"offer_tab",
	"financials_tab",
	"gs_tab",
	"gs_approved_tab",
	"acceptance_tab",
	"coe_tab",
	"file_lodged_tab",
	"visa_tab",
	"enrollment_tab",
	"on_shore_college_change_tab",
	"visa_refused_tab",
	"refund_processing_tab",
	"refunded_tab",
	"closed_tab",
];

function redirect_uk_index_to_native(frm) {
	if (!is_uk_destination(frm.doc.destination_country)) {
		return false;
	}
	if (frm.is_new()) {
		frappe.new_doc("Application UK", {
			application_type: frm.doc.application_type || "B2B",
			uk_current_stage: "Details",
			country_flow_case: "UK Case 2",
			student: frm.doc.student,
			agent: frm.doc.agent,
		});
		return true;
	}
	if (frm.doc.uk_data) {
		frappe.set_route("Form", "Application UK", frm.doc.uk_data);
		return true;
	}
	return false;
}

// AU-only blocks on Details (Aus/NZ refusal cascade, Case 4 spouse)
// Need Assessment + legacy study-gap Yes/No stay permanently hidden (Assessment Request / gap_duration cover them)
const AU_DETAILS_ONLY = [
	"visa_refused_ok",
	"visa_refused_country",
	"visa_refused_type",
	"visa_refused_not_able_to_process",
	"visa_refused_can_process",
	"visa_refused_go_ahead_status",
	"visa_refused_other_country",
	"visa_refused_other_country_name",
	"visa_refused_create_new_application",
	"visa_refused_new_application",
	"visa_refused_close_reason",
	"visa_refused_closed_status",
	"section_case_4_spouse",
	"case_4_spouse_qualification",
	"case_4_marriage_duration",
	"case_4_proceed_below_graduate",
	"case_4_proceed_below_1_year",
	"case_4_proceed_above_1_year",
	"case_4_note_wait",
	"case_4_note_convince",
	"case_4_close_reason",
];

const DETAILS_ALWAYS_HIDDEN = [
	"details_need_assessment_section",
	"need_assessment",
	"need_assessment_university",
	"need_assessment_course",
	"details_vendors_section",
	"need_assessment_vendors",
	"study_gap_upto_1_year",
	"study_gap_status",
	"study_gap_not_accepted_status",
	"study_gap_proof",
];

function apply_country_flow_ui(frm) {
	if (redirect_uk_index_to_native(frm)) {
		return;
	}

	const country = frm.doc.destination_country;
	const au = is_au_destination(country);

	AU_STAGE_TABS.forEach((tab) => {
		if (frm.fields_dict[tab]) {
			frm.set_df_property(tab, "hidden", au ? 0 : 1);
		}
	});
	AU_DETAILS_ONLY.forEach((fieldname) => {
		if (frm.fields_dict[fieldname]) {
			frm.set_df_property(fieldname, "hidden", au ? 0 : 1);
		}
	});
	DETAILS_ALWAYS_HIDDEN.forEach((fieldname) => {
		if (frm.fields_dict[fieldname]) {
			frm.set_df_property(fieldname, "hidden", 1);
		}
	});
	if (frm.fields_dict.is_onshore_change) {
		frm.set_df_property("is_onshore_change", "hidden", frm.doc.is_onshore_change ? 0 : 1);
	}

	// Age must always show next to DOB on AU (and all) applications
	if (frm.fields_dict.current_age) {
		frm.set_df_property("current_age", "hidden", 0);
	}

	if (frm.fields_dict.details_tab) {
		frm.set_df_property("details_tab", "hidden", 0);
	}

	if (frm.fields_dict.country_flow_case) {
		frm.set_df_property("country_flow_case", "hidden", 1);
	}

	if (frm.fields_dict.uk_data) {
		frm.set_df_property("uk_data", "hidden", 1);
		frm.set_df_property("uk_data", "read_only", 1);
	}

	// Do not call frm.refresh_fields() here — it remakes every child grid and
	// restores stock Add Row handlers (Sponsors then stops opening).
	frm.dashboard.clear_headline();
	setTimeout(() => patch_form_view_tables(frm), 0);

	if (frm.is_new() && !frm._country_confirmed) {
		if (!frm._country_cleared_default && !frm._country_from_dialog) {
			frm._country_cleared_default = true;
			if (frm.doc.destination_country) {
				frm.doc.destination_country = "";
				frm.refresh_field("destination_country");
			}
			if (frm.doc.country_flow_case) {
				frm.doc.country_flow_case = "";
				frm.refresh_field("country_flow_case");
			}
		}
		if (!frm._country_dialog_shown) {
			frm._country_dialog_shown = true;
			show_application_country_dialog(frm);
		}
	}
}

function show_application_country_dialog(frm) {
	const d = new frappe.ui.Dialog({
		title: __("New Application — Select Country"),
		fields: [
			{
				fieldname: "destination_country",
				fieldtype: "Link",
				options: "Country",
				label: __("Destination Country"),
				reqd: 1,
				description: __("Australia opens here. United Kingdom opens on Application UK."),
				get_query: () => ({
					filters: {
						name: ["in", ["Australia", "United Kingdom"]],
					},
				}),
			},
		],
		primary_action_label: __("Continue"),
		primary_action(values) {
			d.hide();
			if (is_uk_destination(values.destination_country)) {
				frappe.new_doc("Application UK", {
					application_type: frm.doc.application_type || "B2B",
					uk_current_stage: "Details",
					country_flow_case: "UK Case 2",
					student: frm.doc.student,
					agent: frm.doc.agent,
				});
				return;
			}
			frm._country_from_dialog = true;
			frm._country_confirmed = true;
			frm.set_value("destination_country", values.destination_country).then(() => {
				frm.set_value("country_flow_case", "AU Default");
				if (!frm.doc.offer_currency) {
					frm.set_value("offer_currency", "AUD");
				}
				apply_country_flow_ui(frm);
				refresh_application_country_flag(frm);
			});
		},
	});
	d.$wrapper.find(".btn-modal-close, .modal-header .close").hide();
	d.show();
}

frappe.ui.form.on("Application", {
	onload(frm) {
		patch_form_view_tables(frm);

		// Country was chosen via list dialog → trust it; otherwise force country picker
		if (frm.is_new()) {
			if (frm.doc.destination_country && is_au_destination(frm.doc.destination_country)) {
				frm._country_from_dialog = true;
				frm._country_confirmed = true;
			} else if (frm.doc.destination_country && is_uk_destination(frm.doc.destination_country)) {
				redirect_uk_index_to_native(frm);
			} else {
				frm._country_confirmed = false;
			}
		} else {
			frm._country_confirmed = true;
		}
	},

	validate(frm) {
		if (!frm.doc.application_type) {
			frm.doc.application_type = "B2B";
		}
		const contact = normalize_phone_for_save(frm.doc.student_contact_no);
		if (contact !== (frm.doc.student_contact_no || "")) {
			frm.doc.student_contact_no = contact;
		}
		const login = normalize_phone_for_save(frm.doc.login_contact_no);
		if (login !== (frm.doc.login_contact_no || "")) {
			frm.doc.login_contact_no = login;
		}
		if (frm.doc.agent && String(frm.doc.agent).startsWith("AGT-")) {
			frm.doc.agent = frappe.session.user;
		}
	},

	refresh(frm) {
		hide_accounts_connections_on_application(frm);
		add_accounts_workflow_buttons(frm);
		apply_agent_application_tabs(frm);
		apply_admission_stage_tabs(frm);
		apply_cro_only_fields(frm);
		hide_legacy_sponsor_subtables(frm);
		patch_form_view_tables(frm);
		// Grids on later tabs may initialize after first paint
		setTimeout(() => patch_form_view_tables(frm), 300);
		apply_age_from_dob(frm);
		apply_gap_duration_rule(frm);
		if (frm.doc.student && (!frm.doc.student_contact_no || !frm.doc.dob || !frm.doc.student_email)) {
			apply_student_defaults_to_form(frm);
		}

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
		if (!frm.doc.application_type) {
			frm.set_value("application_type", "B2B");
		}
		if (frm.doc.application_type === "B2B" || frm.doc.application_type === "B2C") {
			frm.set_df_property("agent", "hidden", 0);
			if (frm.doc.application_type === "B2C") {
				set_unideft_agent_user(frm);
			} else {
				frm.set_df_property("agent", "read_only", 0);
				frm.set_query("agent", function () {
					return {};
				});
			}
		} else {
			frm.set_df_property("agent", "hidden", 1);
			frm.set_value("agent", "");
		}

		// Filter Course by selected Preferred University
		setup_course_query(frm);
		setup_processing_agent_query(frm);

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

		// Calculate funds required on form load
		if (frm.doc.funds_required_type) {
			calculateFundsRequired(frm, false);
		}
		if (frm.doc.defer_funds_required_type) {
			calculateFundsRequired(frm, true);
		}

		// Auto-populate university and course from Details tab
		populateOfferUniversityAndCourse(frm);
		render_tuition_deposit_reminder_section(frm);
		apply_academic_gap_docs_visibility(frm);
		setup_gs_application_link_query(frm);
		(frm.doc.table_ihmq || []).forEach((row) => {
			set_nationalized_status(
				row.doctype,
				row.name,
				"fd_nationalized",
				"fd_nationalized_status"
			);
			set_nationalized_status(
				row.doctype,
				row.name,
				"statement_nationalized",
				"statement_nationalized_status"
			);
			set_nationalized_status(
				row.doctype,
				row.name,
				"other_nationalized",
				"other_nationalized_status"
			);
		});

		// Default currency by destination (do not force AUD on UK / unset country)
		if (!frm.doc.offer_currency && is_au_destination(frm.doc.destination_country)) {
			frm.set_value("offer_currency", "AUD");
		} else if (!frm.doc.offer_currency && is_uk_destination(frm.doc.destination_country)) {
			frm.set_value("offer_currency", "GBP");
		}
		if (is_defer_offer_required(frm.doc) && !frm.doc.defer_offer_currency) {
			frm.set_value(
				"defer_offer_currency",
				frm.doc.offer_currency || (is_uk_destination(frm.doc.destination_country) ? "GBP" : "AUD")
			);
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
		apply_country_flow_ui(frm);
	},

	destination_country(frm) {
		refresh_application_country_flag(frm);
		if (is_uk_destination(frm.doc.destination_country)) {
			redirect_uk_index_to_native(frm);
			return;
		}
		if (is_au_destination(frm.doc.destination_country)) {
			if (!frm.doc.country_flow_case || !String(frm.doc.country_flow_case).startsWith("AU")) {
				frm.set_value("country_flow_case", "AU Default");
			}
		}
		apply_country_flow_ui(frm);
	},

	higher_education(frm) {
		// AU-only case routing handled in Python validate
	},
	martial_status(frm) {
		// AU-only case routing handled in Python validate
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
		// Clear course when university changes (unless still valid)
		if (frm.doc.course) {
			frm.set_value("course", "");
		}
		setup_course_query(frm);
		setup_processing_agent_query(frm);
		populateOfferUniversityAndCourse(frm);
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

	course(frm) {
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
		if (frm.doc.application_type === "B2B" || frm.doc.application_type === "B2C") {
			frm.set_df_property("agent", "hidden", 0);
			if (frm.doc.application_type === "B2C") {
				set_unideft_agent_user(frm);
			} else {
				frm.set_df_property("agent", "read_only", 0);
				frm.set_query("agent", function () {
					return {};
				});
			}
		} else {
			frm.set_df_property("agent", "hidden", 1);
			frm.set_value("agent", "");
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

	student(frm) {
		apply_student_defaults_to_form(frm);
	},

	dob(frm) {
		apply_age_from_dob(frm);
	},

	study_gap(frm) {
		if (frm.doc.study_gap === "No") {
			frm.set_value("study_gap_ok", "✓ OK");
		} else {
			frm.set_value("study_gap_ok", "");
		}
		if (frm.doc.study_gap !== "Yes") {
			frm.set_value("gap_duration", "");
			frm.set_value("gap_duration_status", "");
			frm.set_value("gap_duration_not_accepted", "");
			frm.set_value("study_gap_upto_1_year", "");
			frm.set_value("study_gap_status", "");
			frm.set_value("study_gap_not_accepted_status", "");
			frm.clear_table("study_gap_proof_list");
			frm.refresh_field("study_gap_proof_list");
		} else {
			apply_gap_duration_rule(frm);
		}
		apply_academic_gap_docs_visibility(frm);
	},

	gap_duration(frm) {
		apply_gap_duration_rule(frm);
	},

	application_submitted(frm) {
		if (frm.doc.application_submitted === "Yes") {
			if (!frm.doc.submitted_date) {
				frm.set_value("submitted_date", frappe.datetime.get_today());
			}
			frm.set_value("expected_application_submission_date", "");
			deactivate_reminders_matching(frm, "Application Submission", {
				message: __("Application submission reminder deactivated"),
			});
			complete_stage_and_advance(frm, {
				next_status: "Submitted",
				tab_fieldname: "submitted_tab",
				tab_label: "Submitted",
				message: "Application moved to Submitted stage",
			});
		} else if (frm.doc.application_submitted === "No") {
			if (["Pending", "Submitted"].includes(frm.doc.status)) {
				frm.set_value("status", "Processing");
			}
		}
	},

	processing_agent_details_add(frm, cdt, cdn) {
		setup_processing_agent_query(frm);
		frappe.model.set_value(cdt, cdn, "processing_agent_type", "Direct");
	},

	expected_application_submission_date(frm) {
		if (
			frm.doc.application_submitted === "No" &&
			frm.doc.expected_application_submission_date &&
			frm.doc.name &&
			!frm.doc.__islocal
		) {
			AU_REMINDER_SESSION[`app_submitted_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Application Submission Reminder"),
				default_description: "Application Submission Follow-up",
				default_date: frm.doc.expected_application_submission_date,
				trigger_key: `app_submitted_${frm.doc.name}`,
			});
		}
	},

	study_gap_upto_1_year(frm) {
		// Legacy Yes/No field — kept hidden; prefer gap_duration
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
		if (frm.doc.submitted_another_application !== "Yes") {
			frm.set_value("another_application_id", "");
		}
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
			frm.set_value("submitted_requirement_type", "");
			frm.set_value("pending_requirement_details", "");
			frm.set_value("pending_requirements_completed", "");
			frm.clear_table("supporting_documents");
			frm.refresh_field("supporting_documents");
			[
				"submitted_interview_deadline",
				"submitted_student_prepared",
				"submitted_schedule_interview",
				"submitted_interview_date",
				"submitted_interview_completed",
			].forEach((field) => frm.set_value(field, ""));
			frm.__clearing_submitted_pending = false;
		}
		maybe_prompt_submitted_reminders(frm);
	},

	submitted_requirement_type(frm) {
		frm.__clearing_submitted_pending = true;
		if (frm.doc.submitted_requirement_type !== "Other") {
			frm.set_value("pending_requirement_details", "");
			frm.set_value("pending_requirements_completed", "");
			frm.clear_table("supporting_documents");
			frm.refresh_field("supporting_documents");
		}
		if (frm.doc.submitted_requirement_type !== "Interview") {
			[
				"submitted_interview_deadline",
				"submitted_student_prepared",
				"submitted_schedule_interview",
				"submitted_interview_date",
				"submitted_interview_completed",
			].forEach((field) => frm.set_value(field, ""));
		}
		frm.__clearing_submitted_pending = false;
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

	submitted_interview_deadline(frm) {
		if (
			frm.doc.submitted_requirement_type === "Interview" &&
			frm.doc.submitted_interview_deadline &&
			frm.doc.name &&
			!frm.doc.__islocal
		) {
			AU_REMINDER_SESSION[`submitted_interview_deadline_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Set Interview Deadline Reminder"),
				default_description: "Submitted Interview Deadline",
				default_date: frm.doc.submitted_interview_deadline,
				trigger_key: `submitted_interview_deadline_${frm.doc.name}`,
			});
		}
	},

	submitted_student_prepared(frm) {
		if (frm.doc.submitted_student_prepared !== "Yes") {
			frm.set_value("submitted_schedule_interview", "");
			frm.set_value("submitted_interview_date", "");
		}
		if (
			frm.doc.submitted_student_prepared === "No" &&
			frm.doc.name &&
			!frm.doc.__islocal
		) {
			prompt_application_reminder(frm, {
				title: __("Prepare Student for Interview"),
				default_description: "Submitted Interview - Student Preparation",
				default_date: frm.doc.submitted_interview_deadline,
				trigger_key: `submitted_student_preparation_${frm.doc.name}`,
			});
		}
	},

	submitted_schedule_interview(frm) {
		if (frm.doc.submitted_schedule_interview !== "Yes") {
			frm.set_value("submitted_interview_date", "");
		}
		if (
			frm.doc.submitted_schedule_interview === "No" &&
			frm.doc.name &&
			!frm.doc.__islocal
		) {
			prompt_application_reminder(frm, {
				title: __("Follow up for Interview Scheduling"),
				default_description: "Submitted Interview - Scheduling Follow-up",
				default_date: frm.doc.submitted_interview_deadline,
				trigger_key: `submitted_interview_schedule_${frm.doc.name}`,
			});
		}
	},

	submitted_interview_date(frm) {
		if (
			frm.doc.submitted_schedule_interview === "Yes" &&
			frm.doc.submitted_interview_date &&
			frm.doc.name &&
			!frm.doc.__islocal
		) {
			AU_REMINDER_SESSION[`submitted_interview_date_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Interview Date Reminder"),
				default_description: "Submitted Interview Date",
				default_date: frm.doc.submitted_interview_date,
				trigger_key: `submitted_interview_date_${frm.doc.name}`,
			});
		}
	},

	submitted_interview_completed(frm) {
		if (frm.doc.submitted_interview_completed === "Yes") {
			deactivate_reminders_matching(frm, SUBMITTED_INTERVIEW_REMINDERS, {
				message: __("Submitted-stage interview reminders deactivated"),
			});
		}
	},

	conditions_on_offer_letter(frm) {
		sync_financial_condition_visibility(frm);
		refresh_financial_condition_sections(frm);
		sync_gs_interview_stage_from_financials(frm);
	},

	verification_verified(frm) {
		if (frm.doc.verification_verified === "Yes") {
			frm.set_value("verification_type", "");
		}
		if (frm.fields_dict.verification_type) {
			const show_type =
				has_offer_letter_condition(frm, "Verification") &&
				frm.doc.verification_verified === "No";
			frm.set_df_property("verification_type", "hidden", show_type ? 0 : 1);
			frm.refresh_field("verification_type");
		}
	},

	on_submit(frm) {
		// Submitted reminders are set interactively via field change handlers
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
		if (frm.doc.case_4_proceed_above_1_year === "with Spouse") {
			frm.set_value("country_flow_case", "AU Case 4 Spouse");
		} else if (
			frm.doc.case_4_proceed_above_1_year === "On single basis" &&
			(!frm.doc.country_flow_case || frm.doc.country_flow_case === "AU Case 4 Spouse")
		) {
			frm.set_value("country_flow_case", "AU Default");
		}
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

	// Selecting the intake date only updates the display; the deposit deadline
	// reminder is created explicitly via the Set Reminder button below it.
	university_intake(frm) {
		render_tuition_deposit_reminder_section(frm);
		calculateFundsRequired(frm, false);
	},

	set_tuition_deposit_reminder(frm) {
		if (!frm.doc.university_intake) {
			frappe.msgprint(__("Please select the Intake Date first."));
			return;
		}
		if (!frm.doc.name || frm.doc.__islocal) {
			frappe.msgprint(__("Please save the Application before setting a reminder."));
			return;
		}
		const trigger_key = `tuition_deposit_${frm.doc.name}`;
		AU_REMINDER_SESSION[trigger_key] = false;
		prompt_application_reminder(frm, {
			title: __("Set Tuition Fee Deposit Deadline Reminder"),
			default_description:
				"Tuition Fee Deposit Deadline - Intake " +
				frappe.datetime.str_to_user(frm.doc.university_intake),
			default_date: frm.doc.university_intake,
			trigger_key: trigger_key,
		});
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

	financial_started(frm) {
		if (frm.doc.financial_started === "Yes") {
			frm.set_value("offer_letter_stage_completed", 1);
			complete_stage_and_advance(frm, {
				next_status: "Financial",
				tab_fieldname: "financials_tab",
				tab_label: "Financials",
				message: "Offer Letter stage completed — moved to Financials",
			});
		} else if (frm.doc.financial_started === "No") {
			frm.set_value("offer_letter_stage_completed", 0);
			if (frm.doc.name && !frm.doc.__islocal) {
				prompt_application_reminder(frm, {
					title: __("Follow up — Financial Started"),
					default_description: "Follow up to start Financials",
					trigger_key: `financial_started_${frm.doc.name}`,
				});
			}
		} else {
			frm.set_value("offer_letter_stage_completed", 0);
		}
	},

	// Financials Tab handlers
	gs_submitted(frm) {
		if (frm.doc.gs_submitted === "Yes") {
			clear_gs_submitted_no_branch(frm);
			frm.set_value("financial_stage_completed", "✓ Financial stage completed → Moved to GS Processing");
			complete_stage_and_advance(frm, {
				next_status: "GS Processing",
				tab_fieldname: "gs_tab",
				tab_label: "GS Submitted",
				message: "Financial stage completed — moved to GS Submitted",
			});
		} else if (frm.doc.gs_submitted === "No") {
			frm.set_value("financial_stage_completed", "");
			// Reminder popup (date / time / remarks) — also keep "When will financials be completed?"
			maybe_prompt_financial_completion_reminder(frm);
		} else {
			clear_gs_submitted_no_branch(frm);
			frm.set_value("financial_stage_completed", "");
		}
	},

	gs_submitted_reminder_date(frm) {
		if (frm.doc.gs_submitted === "No" && frm.doc.gs_submitted_reminder_date) {
			// Allow reminder popup again when date is changed
			AU_REMINDER_SESSION[`financial_completion_${frm.doc.name}`] = false;
			maybe_prompt_financial_completion_reminder(frm);
		}
	},

	student_will_process_gs(frm) {
		if (frm.doc.student_will_process_gs !== "No") {
			frm.set_value("will_process_gs_another_university", "");
			frm.set_value("gs_another_university_application_id", "");
			frm.set_value("will_process_another_country", "");
			frm.set_value("gs_another_country_name", "");
			frm.set_value("gs_another_country_application_id", "");
			frm.set_value("gs_not_process_reason", "");
			frm.set_value("gs_close_this_application", "");
		}
		if (
			frm.doc.gs_submitted === "No" &&
			frm.doc.student_will_process_gs === "Yes" &&
			frm.doc.name &&
			!frm.doc.__islocal
		) {
			AU_REMINDER_SESSION[`gs_followup_process_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Follow up on GS"),
				default_description: "Follow up — student will proceed with GS for this application",
				trigger_key: `gs_followup_process_${frm.doc.name}`,
			});
		}
	},

	will_process_gs_another_university(frm) {
		if (frm.doc.will_process_gs_another_university !== "Yes") {
			frm.set_value("gs_another_university_application_id", "");
		}
		if (frm.doc.will_process_gs_another_university !== "No") {
			frm.set_value("will_process_another_country", "");
			frm.set_value("gs_another_country_name", "");
			frm.set_value("gs_another_country_application_id", "");
			frm.set_value("gs_not_process_reason", "");
			frm.set_value("gs_close_this_application", "");
		}
	},

	gs_another_university_application_id(frm) {
		if (
			frm.doc.gs_submitted === "No" &&
			frm.doc.student_will_process_gs === "No" &&
			frm.doc.will_process_gs_another_university === "Yes" &&
			(frm.doc.gs_another_university_application_id || "").trim()
		) {
			close_application_from_financials(
				frm,
				__("Process closed — GS in another university (ID: {0})", [
					frm.doc.gs_another_university_application_id,
				])
			);
		}
	},

	will_process_another_country(frm) {
		if (frm.doc.will_process_another_country !== "Yes") {
			frm.set_value("gs_another_country_name", "");
			frm.set_value("gs_another_country_application_id", "");
		}
		if (frm.doc.will_process_another_country !== "No") {
			frm.set_value("gs_not_process_reason", "");
			frm.set_value("gs_close_this_application", "");
		}
	},

	gs_another_country_name(frm) {
		maybe_close_for_another_country(frm);
	},

	gs_another_country_application_id(frm) {
		maybe_close_for_another_country(frm);
	},

	gs_not_process_reason(frm) {
		// Closing is explicit via "Close this application?" / the Close Application button.
	},

	gs_close_this_application(frm) {
		if (
			frm.doc.gs_submitted === "No" &&
			frm.doc.student_will_process_gs === "No" &&
			frm.doc.will_process_gs_another_university === "No" &&
			frm.doc.will_process_another_country === "No" &&
			frm.doc.gs_close_this_application === "Yes" &&
			(frm.doc.gs_not_process_reason || "").trim()
		) {
			close_application_from_financials(
				frm,
				__("Case closed — student does not want to process")
			);
		}
	},

	close_gs_application(frm) {
		if (!(frm.doc.gs_not_process_reason || "").trim()) {
			frappe.msgprint(__("Please enter the reason why the student does not want to process."));
			return;
		}
		frm.set_value("gs_close_this_application", "Yes");
	},

	interview_deadline_date(frm) {
		if (
			frm.doc.interview_deadline_date &&
			frm.doc.interview_timing === "Before GS Submitted" &&
			frm.doc.name &&
			!frm.doc.__islocal
		) {
			AU_REMINDER_SESSION[`interview_deadline_financial_${frm.doc.name}`] = false;
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
		if (frm.doc.interview_timing !== "Before GS Submitted") {
			[
				"interview_deadline_date",
				"financials_student_prepare",
				"financials_schedule_interview",
				"financials_interview_completed",
			].forEach((f) => frm.set_value(f, ""));
		}
		sync_gs_interview_stage_from_financials(frm);
		refresh_financial_condition_sections(frm);
	},

	financials_student_prepare(frm) {
		if (frm.doc.financials_student_prepare !== "Yes") {
			frm.set_value("financials_schedule_interview", "");
		}
		if (
			frm.doc.interview_timing === "Before GS Submitted" &&
			frm.doc.financials_student_prepare === "No" &&
			frm.doc.name &&
			!frm.doc.__islocal
		) {
			AU_REMINDER_SESSION[`fin_prepare_student_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Prepare Student for Interview"),
				default_description: "Prepare Student for Interview",
				trigger_key: `fin_prepare_student_${frm.doc.name}`,
			});
		}
	},

	financials_schedule_interview(frm) {
		if (frm.doc.interview_timing !== "Before GS Submitted" || !frm.doc.name || frm.doc.__islocal) {
			return;
		}
		if (frm.doc.financials_schedule_interview === "No") {
			AU_REMINDER_SESSION[`fin_followup_interview_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Follow Up Interview Schedule"),
				default_description: "Follow Up Interview Schedule",
				trigger_key: `fin_followup_interview_${frm.doc.name}`,
			});
		}
		if (frm.doc.financials_schedule_interview === "Yes" && frm.doc.interview_deadline_date) {
			AU_REMINDER_SESSION[`fin_interview_date_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Interview Date Reminder"),
				default_description:
					"Interview Date - " + frappe.datetime.str_to_user(frm.doc.interview_deadline_date),
				default_date: frm.doc.interview_deadline_date,
				trigger_key: `fin_interview_date_${frm.doc.name}`,
			});
		}
	},

	financials_interview_completed(frm) {
		if (frm.doc.financials_interview_completed === "Yes") {
			deactivate_reminders_matching(frm, CONDITION_INTERVIEW_REMINDERS, {
				exclude: SUBMITTED_INTERVIEW_REMINDERS,
				message: __("Interview reminders deactivated"),
			});
		}
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
	if (!frm.doc.name || frm.doc.__islocal || frm.doc.tuition_fee_paid !== "Yes") {
		return;
	}

	frappe.db
		.get_list("Reminder", {
			filters: {
				reminder_doctype: "Application",
				reminder_docname: frm.doc.name,
				notified: 0,
			},
			fields: ["name", "description"],
			limit: 100,
		})
		.then(function (reminders) {
			const deposit_reminders = (reminders || []).filter((row) => {
				const description = String(row.description || "").toLowerCase();
				return (
					description.includes("decide deadline for deposit") ||
					description.includes("tuition fee deposit deadline")
				);
			});
			deposit_reminders.forEach(function (row) {
				frappe.db.set_value("Reminder", row.name, "notified", 1);
			});
			if (deposit_reminders.length) {
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

	// Auto-populate course_name from Details Course
	if (frm.doc.course && !frm.doc.course_name) {
		frm.set_value("course_name", frm.doc.course);
	}
}

// Helper function to populate defer offer university and course from Details tab
function populateDeferOfferUniversityAndCourse(frm) {
	// Auto-populate defer_university_name from preferred_university
	if (frm.doc.preferred_university && !frm.doc.defer_university_name) {
		frm.set_value("defer_university_name", frm.doc.preferred_university);
	}

	// Auto-populate defer_course_name from Details Course
	if (frm.doc.course && !frm.doc.defer_course_name) {
		frm.set_value("defer_course_name", frm.doc.course);
	}
}

function setup_course_query(frm) {
	frm.set_query("course", function () {
		if (!frm.doc.preferred_university) {
			return { filters: { name: ["in", []] } };
		}
		return {
			filters: {
				university: frm.doc.preferred_university,
			},
		};
	});
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
		if (frm.doc.student_enrolled) {
			deactivate_reminders_matching(frm, ["Enroll Student"], {
				message: __("Student enrolment reminder deactivated"),
			});
		} else {
			createVisaReminder(frm, null, "Enroll Student");
		}
		frm.refresh();
	},
});

// Enrolment - Event Handlers
frappe.ui.form.on("Application", {
	enrolment_proof_upload(frm) {
		if (!frm.doc.enrolment_proof_upload) {
			return;
		}
		deactivate_reminders_matching(frm, ["Enroll Student"], {
			message: __("Student enrolment reminder deactivated"),
		});
		frappe.show_alert(
			{
				message: __("Enrolment proof uploaded — application will be marked Completed on save."),
				indicator: "green",
			},
			5
		);
	},
});

// File Lodged - Event Handlers
frappe.ui.form.on("Application", {
	decision_received(frm) {
		if (frm.doc.decision_received === "No") {
			frm.set_value("visa_decision", "");
		} else if (frm.doc.decision_received === "Yes") {
			frm.set_value("visa_status_checked", "");
			frm.set_value("visa_status_screenshot_upload", "");
			frm.set_value("visa_status_not_checked_reason", "");
		}
	},

	visa_status_checked(frm) {
		if (frm.doc.decision_received !== "No" || !frm.doc.name || frm.doc.__islocal) {
			return;
		}
		if (frm.doc.visa_status_checked === "Yes") {
			frm.set_value("visa_status_not_checked_reason", "");
			AU_REMINDER_SESSION[`visa_decision_followup_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Visa Decision Follow-up Reminder"),
				default_description: "Follow-up for Visa Decision",
				trigger_key: `visa_decision_followup_${frm.doc.name}`,
			});
		} else if (frm.doc.visa_status_checked === "No") {
			frm.set_value("visa_status_screenshot_upload", "");
		}
	},

	// The manager escalation fires on the reason, not on the Yes/No, so the
	// notification carries the counselor's explanation with it.
	visa_status_not_checked_reason(frm) {
		if (
			frm.doc.visa_status_checked !== "No" ||
			!(frm.doc.visa_status_not_checked_reason || "").trim() ||
			!frm.doc.name ||
			frm.doc.__islocal
		) {
			return;
		}
		frappe.call({
			method: "erpnext.crm.doctype.application.application.notify_visa_status_not_checked",
			args: {
				application: frm.doc.name,
				reason: frm.doc.visa_status_not_checked_reason,
			},
			callback(r) {
				const notified = (r.message && r.message.notified) || [];
				if (notified.length) {
					frappe.show_alert(
						{
							message: __("Concerned Manager notified ({0})", [notified.length]),
							indicator: "orange",
						},
						4
					);
				}
			},
		});
	},

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
		if (
			frm.doc.acceptance_interview_deadline &&
			frm.doc.acceptance_before_coe_available &&
			frm.doc.name &&
			!frm.doc.__islocal
		) {
			AU_REMINDER_SESSION[`acceptance_interview_deadline_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Set Interview Deadline Reminder"),
				default_description:
					"Interview Deadline - " +
					frappe.datetime.str_to_user(frm.doc.acceptance_interview_deadline),
				default_date: frm.doc.acceptance_interview_deadline,
				trigger_key: `acceptance_interview_deadline_${frm.doc.name}`,
			});
		}
	},

	acceptance_student_prepare(frm) {
		if (frm.doc.acceptance_student_prepare !== "Yes") {
			frm.set_value("acceptance_schedule_interview", "");
		}
		if (
			frm.doc.acceptance_student_prepare === "No" &&
			frm.doc.acceptance_before_coe_available &&
			frm.doc.name &&
			!frm.doc.__islocal
		) {
			AU_REMINDER_SESSION[`acceptance_prepare_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Prepare Student for Interview"),
				default_description: "Prepare Student for Acceptance Interview",
				trigger_key: `acceptance_prepare_${frm.doc.name}`,
			});
		}
	},

	acceptance_schedule_interview(frm) {
		if (!frm.doc.acceptance_before_coe_available || !frm.doc.name || frm.doc.__islocal) {
			return;
		}
		if (frm.doc.acceptance_schedule_interview === "No") {
			AU_REMINDER_SESSION[`acceptance_followup_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Follow Up Interview Schedule"),
				default_description: "Follow Up Acceptance Interview Schedule",
				trigger_key: `acceptance_followup_${frm.doc.name}`,
			});
		}
		if (frm.doc.acceptance_schedule_interview === "Yes" && frm.doc.acceptance_interview_deadline) {
			AU_REMINDER_SESSION[`acceptance_interview_date_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Interview Date Reminder"),
				default_description:
					"Interview Date - " +
					frappe.datetime.str_to_user(frm.doc.acceptance_interview_deadline),
				default_date: frm.doc.acceptance_interview_deadline,
				trigger_key: `acceptance_interview_date_${frm.doc.name}`,
			});
		}
	},

	acceptance_interview_completed(frm) {
		if (frm.doc.acceptance_interview_completed === "Yes") {
			deactivate_reminders_matching(frm, CONDITION_INTERVIEW_REMINDERS, {
				exclude: SUBMITTED_INTERVIEW_REMINDERS,
				message: __("Interview reminders deactivated"),
			});
		}
	},

	acceptance_any_requirement(frm) {
		if (frm.doc.acceptance_any_requirement !== "Yes") {
			frm.set_value("acceptance_requirement_details", "");
			frm.set_value("acceptance_requirements_completed", "");
			frm.set_value("acceptance_requirement_upload", "");
		}
		if (frm.doc.acceptance_any_requirement === "No" && frm.doc.name && !frm.doc.__islocal) {
			AU_REMINDER_SESSION[`acceptance_waiting_coe_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Receive COE Reminder"),
				default_description: "Set Reminder to receive COE & proceed to next stage",
				trigger_key: `acceptance_waiting_coe_${frm.doc.name}`,
			});
		}
	},

	acceptance_requirements_completed(frm) {
		if (frm.doc.acceptance_any_requirement !== "Yes" || !frm.doc.name || frm.doc.__islocal) {
			return;
		}
		if (frm.doc.acceptance_requirements_completed === "No") {
			AU_REMINDER_SESSION[`acceptance_req_pending_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Requirement Completion Pending"),
				default_description: "Acceptance Requirement Completion Pending",
				trigger_key: `acceptance_req_pending_${frm.doc.name}`,
			});
		} else if (frm.doc.acceptance_requirements_completed === "Yes") {
			AU_REMINDER_SESSION[`acceptance_coe_after_req_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Receive COE Reminder"),
				default_description: "Waiting for COE After Requirements Completion",
				trigger_key: `acceptance_coe_after_req_${frm.doc.name}`,
			});
		}
	},

	coe_received(frm) {
		if (frm.doc.coe_received === "Yes") {
			deactivate_reminders_matching(frm, COE_RECEIPT_REMINDERS, {
				message: __("COE receipt reminders deactivated"),
			});
			complete_stage_and_advance(frm, {
				next_status: resolve_coe_status_option(frm),
				tab_fieldname: "coe_tab",
				tab_label: "eCOE",
				message: "Moved to eCOE stage",
			});
			return;
		}
		if (frm.doc.coe_received === "No" && frm.doc.name && !frm.doc.__islocal) {
			AU_REMINDER_SESSION[`coe_receipt_followup_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("COE Receipt Reminder"),
				default_description: "Follow-up for COE Receipt",
				trigger_key: `coe_receipt_followup_${frm.doc.name}`,
			});
		}
	},
});

// GS Approved - Event Handlers
frappe.ui.form.on("Application", {
	tuition_fee_paid(frm) {
		if (frm.doc.tuition_fee_paid === "Yes") {
			checkAndDeactivateIntakeReminder(frm);
		} else if (frm.doc.tuition_fee_paid === "No") {
			createGSReminder(frm, null, "Follow Up Tuition Fee Payment");
		}
	},

	oshc_required(frm) {
		if (frm.doc.oshc_required !== "Yes") {
			frm.set_value("oshc_arranged_by_type", "");
			frm.set_value("gha_policy_received", 0);
			frm.set_value("agent_policy_received", 0);
			frm.set_value("student_policy_received", 0);
		}
	},

	gha_policy_received(frm) {
		if (
			!frm.doc.gha_policy_received &&
			frm.doc.oshc_arranged_by_type === "GHA" &&
			frm.doc.oshc_required === "Yes"
		) {
			createGSReminder(frm, null, "OSHC Policy Received from GHA");
		}
	},

	agent_policy_received(frm) {
		if (
			!frm.doc.agent_policy_received &&
			frm.doc.oshc_arranged_by_type === "Agent" &&
			frm.doc.oshc_required === "Yes"
		) {
			createGSReminder(frm, null, "OSHC Policy Received from Agent");
		}
	},

	student_policy_received(frm) {
		if (
			!frm.doc.student_policy_received &&
			frm.doc.oshc_arranged_by_type === "Student" &&
			frm.doc.oshc_required === "Yes"
		) {
			createGSReminder(frm, null, "OSHC Policy Received from Student");
		}
	},

	acceptance_submitted(frm) {
		if (frm.doc.acceptance_submitted === "No") {
			createGSReminder(frm, null, "Acceptance Submission Pending");
		}
	},
});

// GS Submitted - Event Handlers
frappe.ui.form.on("Application", {
	interview_deadline(frm) {
		if (frm.doc.interview_deadline && frm.doc.interview_stage_available && frm.doc.name && !frm.doc.__islocal) {
			AU_REMINDER_SESSION[`gs_interview_deadline_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Set Interview Deadline Reminder"),
				default_description:
					"Interview Deadline - " + frappe.datetime.str_to_user(frm.doc.interview_deadline),
				default_date: frm.doc.interview_deadline,
				trigger_key: `gs_interview_deadline_${frm.doc.name}`,
			});
		}
	},

	student_prepare(frm) {
		if (frm.doc.student_prepare !== "Yes") {
			frm.set_value("schedule_interview", "");
		}
		if (frm.doc.student_prepare === "No" && frm.doc.interview_stage_available) {
			AU_REMINDER_SESSION[`gs_prepare_student_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Prepare Student for Interview"),
				default_description: "Prepare Student for Interview",
				trigger_key: `gs_prepare_student_${frm.doc.name}`,
			});
		}
	},

	schedule_interview(frm) {
		if (frm.doc.schedule_interview === "No" && frm.doc.interview_stage_available) {
			AU_REMINDER_SESSION[`gs_followup_interview_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Follow Up Interview Schedule"),
				default_description: "Follow Up Interview Schedule",
				trigger_key: `gs_followup_interview_${frm.doc.name}`,
			});
		}
		if (frm.doc.schedule_interview === "Yes" && frm.doc.interview_deadline && frm.doc.name && !frm.doc.__islocal) {
			AU_REMINDER_SESSION[`gs_interview_date_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Interview Date Reminder"),
				default_description:
					"Interview Date - " + frappe.datetime.str_to_user(frm.doc.interview_deadline),
				default_date: frm.doc.interview_deadline,
				trigger_key: `gs_interview_date_${frm.doc.name}`,
			});
		}
	},

	interview_completed(frm) {
		if (frm.doc.interview_completed === "Yes") {
			deactivate_reminders_matching(frm, CONDITION_INTERVIEW_REMINDERS, {
				exclude: SUBMITTED_INTERVIEW_REMINDERS,
				message: __("Interview reminders deactivated"),
			});
		}
	},

	gs_approved_check(frm) {
		if (frm.doc.gs_approved_check === "Yes") {
			frm.set_value("gs_any_requirement", "");
			frm.set_value("requirement_details", "");
			frm.set_value("requirements_completed", "");
			complete_stage_and_advance(frm, {
				next_status: "GS Approved",
				tab_fieldname: "gs_approved_tab",
				tab_label: "GS Approved",
				message: "Moved to GS Approved stage",
			});
		} else if (frm.doc.gs_approved_check === "No") {
			// keep requirement cascade available regardless of interview
		}
	},

	gs_any_requirement(frm) {
		if (frm.doc.gs_approved_check === "Yes") {
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
			frm.set_value("requirements_completed", "");
		} else {
			frm.set_value("requirement_details", "");
			frm.set_value("requirements_completed", "");
		}
	},

	requirements_completed(frm) {
		if (frm.doc.gs_approved_check === "Yes" || frm.doc.gs_any_requirement !== "Yes") {
			return;
		}
		if (frm.doc.requirements_completed === "No") {
			AU_REMINDER_SESSION[`gs_requirement_pending_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Requirement Completion Pending"),
				default_description: "Requirement Completion Pending",
				trigger_key: `gs_requirement_pending_${frm.doc.name}`,
			});
		} else if (frm.doc.requirements_completed === "Yes") {
			AU_REMINDER_SESSION[`gs_waiting_after_req_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Waiting for GS Approved"),
				default_description: "Waiting for GS Approved After Requirements Completion",
				trigger_key: `gs_waiting_after_req_${frm.doc.name}`,
			});
		}
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
		if (row.student_confirmed_to_apply === "Yes") {
			frappe.model.set_value(cdt, cdn, "denial_reason", "");
		} else if (row.student_confirmed_to_apply === "No") {
			frappe.model.set_value(cdt, cdn, "university", "");
			frappe.model.set_value(cdt, cdn, "course", "");
			frappe.model.set_value(cdt, cdn, "assessment_status", "Closed");
			if (frm.doc.name && !frm.doc.__islocal) {
				prompt_application_reminder(frm, {
					title: __("Student Confirmation to Apply"),
					default_description: "Student declined — capture denial reason",
					trigger_key: `na_confirm_${frm.doc.name}_${cdn}`,
				});
			}
		} else {
			frappe.model.set_value(cdt, cdn, "university", "");
			frappe.model.set_value(cdt, cdn, "course", "");
			frappe.model.set_value(cdt, cdn, "denial_reason", "");
		}
	},
	university(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.student_confirmed_to_apply === "Yes" && row.university && row.course) {
			frappe.model.set_value(cdt, cdn, "assessment_status", "Converted to Application");
		}
	},
	course(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.student_confirmed_to_apply === "Yes" && row.university && row.course) {
			frappe.model.set_value(cdt, cdn, "assessment_status", "Converted to Application");
		}
	},
});

frappe.ui.form.on("Application Passport ID Upload", {
	document_type(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.document_type !== "Others") {
			frappe.model.set_value(cdt, cdn, "other_document_type", "");
		}
	},
});

frappe.ui.form.on("student documents", {
	upload_document(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (
			row?.parentfield === "supporting_documents" &&
			row.upload_document &&
			frm.doc.submitted_requirement_type === "Other" &&
			frm.doc.pending_requirements_completed === "Yes"
		) {
			AU_REMINDER_SESSION[`submitted_followup_after_pending_${frm.doc.name}`] = false;
			maybe_prompt_submitted_reminders(frm);
		}
	},
});

frappe.ui.form.on("Application Sponsor Complete", {
	sponsor_type(frm) {
		sync_sponsor_docs_pdf_rows(frm);
	},
	sponsor_name(frm) {
		sync_sponsor_docs_pdf_rows(frm);
	},
	fd_nationalized(frm, cdt, cdn) {
		set_nationalized_status(cdt, cdn, "fd_nationalized", "fd_nationalized_status");
	},
	statement_nationalized(frm, cdt, cdn) {
		set_nationalized_status(cdt, cdn, "statement_nationalized", "statement_nationalized_status");
	},
	other_nationalized(frm, cdt, cdn) {
		set_nationalized_status(cdt, cdn, "other_nationalized", "other_nationalized_status");
	},
	fd_balance_cert_available(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.funds_type === "Fixed Deposit" && row.fd_balance_cert_available === "No") {
			prompt_sponsor_funds_reminder(frm, cdt, cdn, {
				title: __("Balance Certificate Reminder"),
				default_description: "Follow up for FD Balance Certificate",
				trigger_key: "fd_balance_cert",
			});
		}
	},
	statement_balance_cert_available(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.funds_type === "Bank Statement" && row.statement_balance_cert_available === "No") {
			prompt_sponsor_funds_reminder(frm, cdt, cdn, {
				title: __("Balance Certificate Reminder"),
				default_description: "Request Balance Certificate for Bank Statement",
				trigger_key: "bs_balance_cert",
			});
		}
	},
	statement_balance_cert_same_date(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (
			row.funds_type === "Bank Statement" &&
			row.statement_balance_cert_available === "Yes" &&
			row.statement_balance_cert_same_date === "No"
		) {
			prompt_sponsor_funds_reminder(frm, cdt, cdn, {
				title: __("Updated Documents Required"),
				default_description:
					"Balance certificate date and bank statement date do not match — request updated documents",
				trigger_key: "bs_dates_mismatch",
			});
		}
	},
	loan_education_purpose(frm, cdt, cdn) {
		maybe_prompt_revised_loan_letter(frm, cdt, cdn);
	},
	loan_holder_student(frm, cdt, cdn) {
		maybe_prompt_revised_loan_letter(frm, cdt, cdn);
	},
	loan_covering_requirements(frm, cdt, cdn) {
		maybe_prompt_revised_loan_letter(frm, cdt, cdn);
	},
});

// Sponsor occupations live in their own Application-level table (Frappe does not
// support a child table inside a child table), each row tagged with its sponsor.
frappe.ui.form.on("Application Sponsor Occupation", {
	sponsor_occupation(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.sponsor_occupation !== "Business") {
			clear_occupation_fields(cdt, cdn, OCCUPATION_BUSINESS_FIELDS);
		}
		if (row.sponsor_occupation !== "Job") {
			clear_occupation_fields(cdt, cdn, OCCUPATION_JOB_FIELDS);
		}
		if (row.sponsor_occupation !== "Farmer") {
			clear_occupation_fields(cdt, cdn, OCCUPATION_FARMER_FIELDS);
		}
		if (row.sponsor_occupation !== "Other") {
			clear_occupation_fields(cdt, cdn, ["occupation_other_details", "occupation_other_upload"]);
		}
		frm.refresh_field("sponsor_occupations");
	},

	business_proof(frm, cdt, cdn) {
		// Only the selected proof's fields should survive a change of proof type.
		const row = locals[cdt][cdn];
		const keep = OCCUPATION_PROOF_FIELDS[row.business_proof] || [];
		const all = Object.values(OCCUPATION_PROOF_FIELDS).flat();
		clear_occupation_fields(
			cdt,
			cdn,
			all.filter((field) => !keep.includes(field))
		);
		frm.refresh_field("sponsor_occupations");
	},

	job_type(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		const keep = OCCUPATION_JOB_TYPE_FIELDS[row.job_type] || [];
		const all = Object.values(OCCUPATION_JOB_TYPE_FIELDS).flat();
		clear_occupation_fields(
			cdt,
			cdn,
			all.filter((field) => !keep.includes(field))
		);
		frm.refresh_field("sponsor_occupations");
	},

	farmer_income_support_type(frm, cdt, cdn) {
		clear_occupation_fields(cdt, cdn, [
			"farmer_tehsildar_income",
			"farmer_tehsildar_matches_itrs",
			"farmer_tehsildar_upload",
			"farmer_family_id_income",
			"farmer_family_income_matches_itrs",
			"farmer_family_id_upload",
			"farmer_jform_year",
			"farmer_jform_amount",
			"farmer_jform_sixty_percent_match_itrs",
			"farmer_jform_upload",
			"farmer_other_details",
			"farmer_other_upload",
		]);
		frm.refresh_field("sponsor_occupations");
	},

	farmer_tehsildar_matches_itrs(frm, cdt, cdn) {
		maybe_prompt_farmer_correction(frm, cdt, cdn, "farmer_tehsildar_matches_itrs", {
			title: __("Correct Tehsildar Income Certificate"),
			default_description: "Income on Tehsildar certificate does not match the ITRs — request correction",
			trigger_key: "farmer_tehsildar",
		});
	},

	farmer_family_income_matches_itrs(frm, cdt, cdn) {
		maybe_prompt_farmer_correction(frm, cdt, cdn, "farmer_family_income_matches_itrs", {
			title: __("Correct Family ID Income"),
			default_description: "Income on Family ID does not match the ITRs — request correction",
			trigger_key: "farmer_family_id",
		});
	},

	farmer_jform_sixty_percent_match_itrs(frm, cdt, cdn) {
		maybe_prompt_farmer_correction(frm, cdt, cdn, "farmer_jform_sixty_percent_match_itrs", {
			title: __("Correct J Form Amount"),
			default_description: "60% of the J Form amount does not match the ITRs — request correction",
			trigger_key: "farmer_jform",
		});
	},
});

frappe.ui.form.on("Application Sponsor ITR", {
	itr_verified(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.itr_verified === "No") {
			prompt_sponsor_funds_reminder(frm, cdt, cdn, {
				title: __("ITR Verification Pending"),
				default_description: `Verify ITR ${row.assessment_year || ""} for ${row.sponsor_type || "sponsor"}`.trim(),
				trigger_key: "itr_verify",
			});
		}
	},
	itr_dob_matches(frm, cdt, cdn) {
		maybe_prompt_itr_correction(frm, cdt, cdn);
	},
	itr_name_matches(frm, cdt, cdn) {
		maybe_prompt_itr_correction(frm, cdt, cdn);
	},
});

const OCCUPATION_PROOF_FIELDS = {
	"GST Certificate": ["gst_number", "gst_verified", "gst_certificate_upload"],
	"MSME Certificate": [
		"msme_company_name",
		"msme_business_start_date",
		"msme_registration_date",
		"msme_registration_duration",
		"msme_certificate_upload",
	],
	"Incorporation Certificate": [
		"incorporation_business_start_date",
		"incorporation_registration_date",
		"incorporation_certificate_upload",
		"incorporation_current_account_statement",
	],
	"Shop Act": [
		"shop_act_company_name",
		"shop_act_business_start_date",
		"shop_act_registration_date",
		"shop_act_registration_duration",
		"shop_act_certificate_upload",
	],
	"IEC Certificate": [
		"iec_company_name",
		"iec_business_start_date",
		"iec_registration_date",
		"iec_registration_duration",
		"iec_certificate_upload",
	],
	Others: ["business_other_details", "business_other_upload"],
};

const OCCUPATION_JOB_TYPE_FIELDS = {
	Government: [
		"gov_department",
		"gov_position",
		"gov_id_card",
		"gov_salary_slip",
		"gov_salary_statement",
		"gov_slip_current_salary",
		"gov_slip_gpf_amount",
		"gov_slip_upload",
		"gov_statement_current_salary",
		"gov_statement_upload",
	],
	Private: [
		"private_company_name",
		"private_department",
		"private_position",
		"private_experience_letter",
		"private_id_card",
		"private_salary_slip",
		"private_salary_statement",
		"private_slip_current_salary",
		"private_slip_upload",
		"private_statement_current_salary",
		"private_statement_upload",
	],
	"Retired from Govt. services": [
		"retired_department",
		"retired_position",
		"retired_date",
		"retired_id_card",
		"retired_pension_statement",
		"retired_pension_proof",
		"retired_salary_statement",
	],
};

const OCCUPATION_BUSINESS_FIELDS = ["business_proof"].concat(
	Object.values(OCCUPATION_PROOF_FIELDS).flat(),
	["additional_current_account_statement", "additional_gst_certificate"]
);

const OCCUPATION_JOB_FIELDS = ["job_type"].concat(Object.values(OCCUPATION_JOB_TYPE_FIELDS).flat());

const OCCUPATION_FARMER_FIELDS = [
	"farmer_income",
	"farmer_income_support_type",
	"farmer_tehsildar_income",
	"farmer_tehsildar_matches_itrs",
	"farmer_tehsildar_upload",
	"farmer_family_id_income",
	"farmer_family_income_matches_itrs",
	"farmer_family_id_upload",
	"farmer_jform_year",
	"farmer_jform_amount",
	"farmer_jform_sixty_percent_match_itrs",
	"farmer_jform_upload",
	"farmer_other_details",
	"farmer_other_upload",
];

function clear_occupation_fields(cdt, cdn, fieldnames) {
	const row = locals[cdt][cdn];
	if (!row) {
		return;
	}
	(fieldnames || []).forEach((fieldname) => {
		if (row[fieldname]) {
			frappe.model.set_value(cdt, cdn, fieldname, null);
		}
	});
}

function maybe_prompt_farmer_correction(frm, cdt, cdn, fieldname, options) {
	const row = locals[cdt][cdn];
	if (row.sponsor_occupation !== "Farmer" || row[fieldname]) {
		return;
	}
	prompt_sponsor_funds_reminder(frm, cdt, cdn, options);
}

function maybe_prompt_itr_correction(frm, cdt, cdn) {
	const row = locals[cdt][cdn];
	if (row.itr_dob_matches !== "No" && row.itr_name_matches !== "No") {
		return;
	}
	prompt_sponsor_funds_reminder(frm, cdt, cdn, {
		title: __("ITR Correction Required"),
		default_description: `Correct DOB / name mismatch on ITR ${row.assessment_year || ""}`.trim(),
		trigger_key: "itr_correction",
	});
}

function maybe_prompt_revised_loan_letter(frm, cdt, cdn) {
	const row = locals[cdt][cdn];
	if (row.funds_type !== "Education Loan") {
		return;
	}
	if (
		row.loan_education_purpose === "No" ||
		row.loan_holder_student === "No" ||
		row.loan_covering_requirements === "No"
	) {
		prompt_sponsor_funds_reminder(frm, cdt, cdn, {
			title: __("Revised Education Loan Letter Required"),
			default_description: "Request a revised education loan letter",
			trigger_key: "revised_education_loan",
		});
	}
}


// Reminder descriptions raised by the GS Approved stage. Kept distinct from the
// other interview stages so deactivating one stage never clears another.
const GSA_INTERVIEW_REMINDERS = [
	"GS Approved Interview Deadline",
	"GS Approved Interview Date",
	"Prepare Student for GS Approved Interview",
	"Follow Up GS Approved Interview Schedule",
];

const ACCEPTANCE_SUBMISSION_REMINDERS = [
	"Follow-up for Acceptance Submission",
	"Complete the pending acceptance conditions",
];

// GS Approved - Tuition Fee, OSHC, Acceptance Submission, Interview
frappe.ui.form.on("Application", {
	tuition_fee_paid(frm) {
		if (frm.doc.tuition_fee_paid === "Yes") {
			deactivate_reminders_matching(frm, ["Follow-up for Tuition Fee Payment"], {
				message: __("Tuition fee reminder deactivated"),
			});
			return;
		}
		if (frm.doc.tuition_fee_paid === "No") {
			["fee_processed_through_gha", "convinced_fee_through_gha", "tuition_fee_upload"].forEach(
				(fieldname) => frm.set_value(fieldname, "")
			);
			if (frm.doc.name && !frm.doc.__islocal) {
				AU_REMINDER_SESSION[`tuition_fee_followup_${frm.doc.name}`] = false;
				prompt_application_reminder(frm, {
					title: __("Tuition Fee Payment Reminder"),
					default_description: "Follow-up for Tuition Fee Payment",
					trigger_key: `tuition_fee_followup_${frm.doc.name}`,
				});
			}
		}
	},

	fee_processed_through_gha(frm) {
		if (frm.doc.fee_processed_through_gha !== "Yes") {
			if (frm.doc.tuition_fee_paid) {
				frm.set_value("tuition_fee_paid", "");
			}
			if (frm.doc.tuition_fee_upload) {
				frm.set_value("tuition_fee_upload", "");
			}
		}
		if (frm.doc.fee_processed_through_gha !== "No") {
			["convinced_fee_through_gha", "reason_fee_not_through_gha", "reason_no_efforts_gha"].forEach(
				(fieldname) => frm.set_value(fieldname, "")
			);
		}
	},

	convinced_fee_through_gha(frm) {
		if (frm.doc.convinced_fee_through_gha === "Yes") {
			frm.set_value("reason_no_efforts_gha", "");
		} else if (frm.doc.convinced_fee_through_gha === "No") {
			frm.set_value("reason_fee_not_through_gha", "");
		}
	},

	oshc_arranged_by_type(frm) {
		// Only the chosen arranger's fields should stay populated.
		const keep = frm.doc.oshc_arranged_by_type;
		["GHA", "Agent", "Student"].forEach((who) => {
			if (who === keep) {
				return;
			}
			const p = who.toLowerCase();
			[
				`${p}_policy_received`,
				`${p}_oshc_company_name`,
				`${p}_oshc_policy_no`,
				`${p}_oshc_upload`,
				`${p}_oshc_amount`,
			].forEach((fieldname) => {
				if (frm.fields_dict[fieldname]) {
					frm.set_value(fieldname, "");
				}
			});
		});
		if (keep !== "GHA") {
			frm.set_value("gha_oshc_duration", "");
		}
	},

	gha_policy_received(frm) {
		handle_oshc_policy_received(frm, "gha");
	},

	agent_policy_received(frm) {
		handle_oshc_policy_received(frm, "agent");
	},

	student_policy_received(frm) {
		handle_oshc_policy_received(frm, "student");
	},

	acceptance_submitted(frm) {
		if (frm.doc.acceptance_submitted === "Yes") {
			[
				"acceptance_pending_conditions",
				"acceptance_condition_details",
				"acceptance_condition_completed",
			].forEach((fieldname) => frm.set_value(fieldname, ""));
			deactivate_reminders_matching(frm, ACCEPTANCE_SUBMISSION_REMINDERS, {
				message: __("Acceptance submission reminders deactivated"),
			});
			complete_stage_and_advance(frm, {
				next_status: "Acceptance",
				tab_fieldname: "acceptance_tab",
				tab_label: "Acceptance",
				message: "Moved to Acceptance stage",
			});
		}
	},

	acceptance_pending_conditions(frm) {
		if (frm.doc.acceptance_pending_conditions !== "Yes") {
			frm.set_value("acceptance_condition_details", "");
			frm.set_value("acceptance_condition_completed", "");
		}
		if (
			frm.doc.acceptance_pending_conditions === "No" &&
			frm.doc.name &&
			!frm.doc.__islocal
		) {
			AU_REMINDER_SESSION[`acceptance_submission_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Acceptance Submission Reminder"),
				default_description: "Follow-up for Acceptance Submission",
				trigger_key: `acceptance_submission_${frm.doc.name}`,
			});
		}
	},

	acceptance_condition_completed(frm) {
		if (!frm.doc.name || frm.doc.__islocal) {
			return;
		}
		if (frm.doc.acceptance_condition_completed === "Yes") {
			deactivate_reminders_matching(frm, ["Complete the pending acceptance conditions"], {
				message: __("Pending condition reminders deactivated"),
			});
			AU_REMINDER_SESSION[`acceptance_submission_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Acceptance Submission Reminder"),
				default_description: "Follow-up for Acceptance Submission",
				trigger_key: `acceptance_submission_${frm.doc.name}`,
			});
		} else if (frm.doc.acceptance_condition_completed === "No") {
			AU_REMINDER_SESSION[`acceptance_conditions_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Pending Conditions Reminder"),
				default_description: "Complete the pending acceptance conditions",
				trigger_key: `acceptance_conditions_${frm.doc.name}`,
			});
		}
	},

	gsa_interview_deadline(frm) {
		if (
			!frm.doc.gsa_interview_deadline ||
			!frm.doc.gsa_interview_available ||
			!frm.doc.name ||
			frm.doc.__islocal
		) {
			return;
		}
		AU_REMINDER_SESSION[`gsa_interview_deadline_${frm.doc.name}`] = false;
		prompt_application_reminder(frm, {
			title: __("Set Interview Deadline Reminder"),
			default_description:
				"GS Approved Interview Deadline - " +
				frappe.datetime.str_to_user(frm.doc.gsa_interview_deadline),
			default_date: frm.doc.gsa_interview_deadline,
			trigger_key: `gsa_interview_deadline_${frm.doc.name}`,
		});
	},

	gsa_student_prepare(frm) {
		if (frm.doc.gsa_student_prepare !== "Yes") {
			frm.set_value("gsa_schedule_interview", "");
		}
		if (
			frm.doc.gsa_student_prepare === "No" &&
			frm.doc.gsa_interview_available &&
			frm.doc.name &&
			!frm.doc.__islocal
		) {
			AU_REMINDER_SESSION[`gsa_prepare_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Prepare Student for Interview"),
				default_description: "Prepare Student for GS Approved Interview",
				trigger_key: `gsa_prepare_${frm.doc.name}`,
			});
		}
	},

	gsa_schedule_interview(frm) {
		if (!frm.doc.gsa_interview_available || !frm.doc.name || frm.doc.__islocal) {
			return;
		}
		if (frm.doc.gsa_schedule_interview === "No") {
			AU_REMINDER_SESSION[`gsa_followup_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Follow Up Interview Schedule"),
				default_description: "Follow Up GS Approved Interview Schedule",
				trigger_key: `gsa_followup_${frm.doc.name}`,
			});
		}
		if (frm.doc.gsa_schedule_interview === "Yes" && frm.doc.gsa_interview_deadline) {
			AU_REMINDER_SESSION[`gsa_interview_date_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("Interview Date Reminder"),
				default_description:
					"GS Approved Interview Date - " +
					frappe.datetime.str_to_user(frm.doc.gsa_interview_deadline),
				default_date: frm.doc.gsa_interview_deadline,
				trigger_key: `gsa_interview_date_${frm.doc.name}`,
			});
		}
	},

	gsa_interview_completed(frm) {
		if (frm.doc.gsa_interview_completed === "Yes") {
			deactivate_reminders_matching(frm, GSA_INTERVIEW_REMINDERS, {
				message: __("GS Approved interview reminders deactivated"),
			});
		}
	},
});

function handle_oshc_policy_received(frm, prefix) {
	const value = frm.doc[`${prefix}_policy_received`];
	if (value === "Yes") {
		deactivate_reminders_matching(frm, ["Follow-up for OSHC Policy"], {
			message: __("OSHC policy reminder deactivated"),
		});
		return;
	}
	if (value === "No") {
		[
			`${prefix}_oshc_company_name`,
			`${prefix}_oshc_policy_no`,
			`${prefix}_oshc_upload`,
			`${prefix}_oshc_amount`,
			"gha_oshc_duration",
		].forEach((fieldname) => {
			if (frm.fields_dict[fieldname]) {
				frm.set_value(fieldname, "");
			}
		});
		if (frm.doc.name && !frm.doc.__islocal) {
			AU_REMINDER_SESSION[`oshc_policy_${frm.doc.name}`] = false;
			prompt_application_reminder(frm, {
				title: __("OSHC Policy Reminder"),
				default_description: "Follow-up for OSHC Policy",
				trigger_key: `oshc_policy_${frm.doc.name}`,
			});
		}
	}
}

// "Send … to Student Chat" — for offer letter, also post attachments to Comments.
function remind_to_share_in_chat(frm, fieldname, label) {
	if (frm.doc[fieldname] !== "Yes") {
		return;
	}
	frappe.show_alert(
		{ message: __("Please share the {0} with the student in the chat.", [label]), indicator: "blue" },
		6
	);
}

function post_offer_letter_to_comments(frm) {
	if (frm.doc.send_offer_to_chat !== "Yes" || !frm.doc.name || frm.doc.__islocal) {
		return;
	}
	const rows = frm.doc.offer_letter_upload || [];
	const files = rows.map((r) => r.upload).filter(Boolean);
	let content = __("Offer letter shared with student (Send Offer Letter to Student Chat = Yes).");
	if (files.length) {
		content +=
			"<br>" +
			files
				.map((f) => `<a href="${frappe.urllib.get_full_url(f)}" target="_blank">${frappe.utils.escape_html(f.split("/").pop())}</a>`)
				.join("<br>");
	}
	frappe.call({
		method: "frappe.desk.form.utils.add_comment",
		args: {
			reference_doctype: frm.doctype,
			reference_name: frm.doc.name,
			content: content,
			comment_email: frappe.session.user,
			comment_by: frappe.session.user_fullname,
		},
		callback() {
			frappe.show_alert({ message: __("Posted to Comments"), indicator: "green" });
			frm.reload_doc();
		},
	});
}

function sync_sponsor_docs_pdf_rows(frm) {
	const sponsors = frm.doc.table_ihmq || [];
	const existing = frm.doc.sponsor_docs_pdf || [];
	const by_key = {};
	existing.forEach((r) => {
		const key = `${r.sponsor_type || ""}||${r.sponsor_name || ""}`;
		by_key[key] = r;
	});
	frm.clear_table("sponsor_docs_pdf");
	sponsors.forEach((s) => {
		const key = `${s.sponsor_type || ""}||${s.sponsor_name || ""}`;
		const prev = by_key[key];
		const row = frm.add_child("sponsor_docs_pdf");
		row.sponsor_type = s.sponsor_type;
		row.sponsor_name = s.sponsor_name;
		if (prev && prev.combined_docs_pdf) {
			row.combined_docs_pdf = prev.combined_docs_pdf;
		}
	});
	frm.refresh_field("sponsor_docs_pdf");
}

function user_is_agent_only_app() {
	const roles = frappe.user_roles || [];
	const agent = ["Agent", "B2B Agent", "B2C Agent", "agents"].some((r) => roles.includes(r));
	const staff = [
		"System Manager",
		"Administrator",
		"CRM Admin",
		"Team Lead",
		"Team Executive",
		"Admission 1",
		"Admission 2",
		"CRO",
		"CRO Head",
		"Country Head",
	].some((r) => roles.includes(r));
	return agent && !staff;
}

function user_is_cro_app() {
	return (frappe.user_roles || []).some((r) =>
		["CRO", "CRO Head", "System Manager", "Administrator", "CRM Admin"].includes(r)
	);
}

function staff_can_see_stage_tabs() {
	return (frappe.user_roles || []).some((r) =>
		[
			"System Manager",
			"Administrator",
			"CRM Admin",
			"Team Lead",
			"Team Executive",
			"Admission 1",
			"Admission 2",
			"Country Head",
			"CRO",
			"CRO Head",
		].includes(r)
	);
}

/**
 * Processing / later AU tabs were historically gated to Team Lead / Executive only.
 * Admission 1 / Admission 2 must see them. Override depends_on so Custom Field cache
 * cannot keep the old restriction.
 */
function apply_admission_stage_tabs(frm) {
	if (user_is_agent_only_app() || !staff_can_see_stage_tabs()) {
		return;
	}
	if (!is_au_destination(frm.doc.destination_country)) {
		return;
	}

	// Drop the old Team Lead/Executive-only role gate; keep country / visa rules.
	const tab_depends = {
		information_tab: "eval:!doc.is_onshore_change && doc.destination_country=='Australia'",
		submitted_tab: "eval:!doc.is_onshore_change && doc.destination_country=='Australia'",
		offer_tab: "eval:doc.destination_country=='Australia'",
		financials_tab: "eval:doc.destination_country=='Australia'",
		gs_tab: "eval:doc.destination_country=='Australia'",
		gs_approved_tab: "eval:doc.destination_country=='Australia'",
		acceptance_tab: "eval:doc.destination_country=='Australia'",
		coe_tab: "eval:doc.destination_country=='Australia'",
		file_lodged_tab: "eval:doc.destination_country=='Australia'",
		visa_tab: "eval:doc.destination_country=='Australia' && doc.visa_status == 'Visa Approved'",
		enrollment_tab: "eval:doc.destination_country=='Australia' && doc.visa_status == 'Visa Approved'",
		on_shore_college_change_tab:
			"eval:doc.destination_country=='Australia' && doc.visa_status == 'Visa Approved'",
		visa_refused_tab: "eval:doc.destination_country=='Australia' && doc.visa_status == 'Visa Refused'",
		refund_processing_tab:
			"eval:doc.destination_country=='Australia' && doc.visa_status == 'Visa Refused'",
		refunded_tab: "eval:doc.destination_country=='Australia' && doc.visa_status == 'Visa Refused'",
		closed_tab:
			"eval:doc.destination_country=='Australia' && (doc.visa_status == 'Visa Refused' || doc.visa_status == 'Visa Approved')",
	};

	Object.keys(tab_depends).forEach((tab) => {
		if (!frm.fields_dict[tab]) {
			return;
		}
		frm.set_df_property(tab, "depends_on", tab_depends[tab]);
		frm.set_df_property(tab, "hidden", 0);
	});
}

/** Agents only see the Details tab after create. */
function apply_agent_application_tabs(frm) {
	if (!user_is_agent_only_app()) {
		return;
	}
	(frm.meta.fields || [])
		.filter((df) => df.fieldtype === "Tab Break")
		.forEach((df) => {
			const is_details =
				df.fieldname === "details_tab" ||
				(df.label || "").toLowerCase() === "details";
			frm.set_df_property(df.fieldname, "hidden", is_details ? 0 : 1);
		});
}

/** CRO-only editable: fee GHA, OSHC arranged by, medical arranged by. */
function apply_cro_only_fields(frm) {
	const cro = user_is_cro_app();
	["fee_processed_through_gha", "oshc_arranged_by_type", "medical_arranged_by"].forEach((f) => {
		if (frm.fields_dict[f]) {
			frm.set_df_property(f, "read_only", cro ? 0 : 1);
		}
	});
	// Medical follow-ups visible to admission when Our Side
	const show_medical_followup = frm.doc.medical_arranged_by === "Our Side";
	[
		"our_side_medical_scheduled",
		"our_side_medical_scheduled_yes_status",
		"our_side_medical_scheduled_no_status",
	].forEach((f) => {
		if (frm.fields_dict[f]) {
			frm.set_df_property(f, "hidden", show_medical_followup ? 0 : 1);
		}
	});
}


// Refund follow-ups: prompt while the money is outstanding, stand down once it lands.
function refund_followup(frm, value, label) {
	if (!frm.doc.name || frm.doc.__islocal) {
		return;
	}
	const trigger_key = `${label.replace(/\s+/g, "_")}_${frm.doc.name}`;
	if (value === "No") {
		AU_REMINDER_SESSION[trigger_key] = false;
		prompt_application_reminder(frm, {
			title: __("Set Reminder"),
			default_description: label,
			trigger_key: trigger_key,
		});
	} else if (value === "Yes") {
		deactivate_reminders_matching(frm, label);
	}
}

frappe.ui.form.on("Application", {
	tuition_fee_refund_received(frm) {
		refund_followup(frm, frm.doc.tuition_fee_refund_received, "Follow-up for Tuition Fee Refund");
	},

	oshc_refund_received(frm) {
		refund_followup(frm, frm.doc.oshc_refund_received, "Follow-up for OSHC Refund");
	},

	refund_issue_resolved(frm) {
		refund_followup(frm, frm.doc.refund_issue_resolved, "Follow-up for Refund Issue Resolution");
	},

	refunded_oshc_received(frm) {
		refund_followup(frm, frm.doc.refunded_oshc_received, "Follow-up for OSHC Refund");
	},

	tuition_fee_refund_issue(frm) {
		if (frm.doc.tuition_fee_refund_issue !== "Yes") {
			frm.set_value("refund_issue_details", "");
			frm.set_value("refund_issue_resolved", "");
		}
	},

	send_coe_to_student_chat(frm) {
		remind_to_share_in_chat(frm, "send_coe_to_student_chat", __("COE"));
	},

	send_refusal_letter_to_chat(frm) {
		remind_to_share_in_chat(frm, "send_refusal_letter_to_chat", __("refusal letter"));
	},

	send_offer_to_chat(frm) {
		remind_to_share_in_chat(frm, "send_offer_to_chat", __("offer letter"));
		post_offer_letter_to_comments(frm);
	},

	offer_letter_received(frm) {
		if (frm.doc.offer_letter_received === "Yes") {
			deactivate_reminders_matching(frm, ["Offer Letter Received", "Follow up for Offer Letter"]);
			complete_stage_and_advance(frm, {
				next_status: "Offer Letter Received",
				tab_fieldname: "offer_tab",
				tab_label: "Offer Letter",
				message: "Moved to Offer Letter stage",
			});
		} else if (frm.doc.offer_letter_received === "No" && frm.doc.name && !frm.doc.__islocal) {
			prompt_application_reminder(frm, {
				title: __("Offer Letter Reminder"),
				default_description: "Follow up for Offer Letter Received",
				trigger_key: `offer_letter_received_${frm.doc.name}`,
			});
		}
	},

	defer_offer_received(frm) {
		if (frm.doc.defer_offer_received === "No" && frm.doc.name && !frm.doc.__islocal) {
			prompt_application_reminder(frm, {
				title: __("Defer Offer Letter Reminder"),
				default_description: "Follow up when Defer Offer letter will be received",
				trigger_key: `defer_offer_received_${frm.doc.name}`,
			});
		}
	},

	oshc_cert_received(frm) {
		if (frm.doc.oshc_cert_received !== "Yes") {
			frm.set_value("oshc_arranged_by_type", "");
		}
		if (frm.doc.oshc_cert_received !== "No") {
			frm.set_value("oshc_cert_not_received_notes", "");
		}
	},

	table_ihmq_add(frm) {
		sync_sponsor_docs_pdf_rows(frm);
	},

	table_ihmq_remove(frm) {
		sync_sponsor_docs_pdf_rows(frm);
	},

	// GS Submitted: uploading the supporting documents re-opens the GS Approval follow-up
	gs_supporting_documents_upload(frm) {
		if (!frm.doc.gs_supporting_documents_upload || !frm.doc.name || frm.doc.__islocal) {
			return;
		}
		AU_REMINDER_SESSION[`gs_approval_followup_${frm.doc.name}`] = false;
		prompt_application_reminder(frm, {
			title: __("GS Approval Reminder"),
			default_description: "Follow up for GS Approval",
			trigger_key: `gs_approval_followup_${frm.doc.name}`,
		});
	},

	onshore_college_change_allowed(frm) {
		if (frm.doc.onshore_college_change_allowed === "No") {
			[
				"student_wants_college_change",
				"from_where_change",
				"others_reason",
				"oscg_status",
				"onshore_new_app_stage",
			].forEach((fieldname) => frm.set_value(fieldname, ""));
			frm.set_value("convince_times", 0);
			frappe.show_alert(
				{
					message: __("Onshore College Change case closed — no further action required."),
					indicator: "blue",
				},
				5
			);
		}
	},

	create_onshore_application(frm) {
		if (!frm.doc.name || frm.doc.__islocal) {
			frappe.show_alert(
				{ message: __("Please save the application first."), indicator: "orange" },
				4
			);
			return;
		}
		if (!frm.doc.onshore_new_app_stage) {
			frappe.msgprint(__("Please select the stage the new application should start from."));
			return;
		}
		frappe.confirm(
			__("Create a new Onshore College Change application starting at stage {0}?", [
				frm.doc.onshore_new_app_stage,
			]),
			() => {
				// The server reads the saved document, so flush the form first —
				// otherwise a freshly picked stage is still unsaved and the call fails.
				const run = () =>
					frappe.call({
						method: "erpnext.crm.doctype.application.application.create_onshore_application",
						args: { application: frm.doc.name, stage: frm.doc.onshore_new_app_stage },
						freeze: true,
						freeze_message: __("Creating the linked application..."),
						callback(r) {
							const res = r.message || {};
							if (!res.application) {
								return;
							}
							frm.reload_doc();
							frappe.msgprint({
								title: __("Onshore Application Created"),
								indicator: "green",
								message: __(
									"Created {0} with {1} document row(s) carried forward. The Accounts Department has been notified.",
									[
										`<a href="/app/application/${res.application}">${res.application}</a>`,
										res.documents_copied || 0,
									]
								),
							});
						},
					});

				if (frm.is_dirty()) {
					frm.save().then(run);
				} else {
					run();
				}
			}
		);
	},
});

function set_unideft_agent_user(frm) {
	frappe.db.get_value("Agent", { company_name: "Unideft" }, "user", (r) => {
		if (r && r.user && frm.doc.agent !== r.user) {
			frm.set_value("agent", r.user);
		}
		frm.set_df_property("agent", "read_only", 1);
	});
}

function is_accounts_user() {
	return (
		frappe.user.has_role("Accounts User") || frappe.user.has_role("Accounts Manager")
	);
}

function hide_accounts_connections_on_application(frm) {
	// Accounts work belongs on the Accounts workspace, not the counselor Details tab.
	if (is_accounts_user()) {
		return;
	}
	if (frm.dashboard && frm.dashboard.data && Array.isArray(frm.dashboard.data.transactions)) {
		frm.dashboard.data.transactions = frm.dashboard.data.transactions.filter(
			(group) => (group.label || "") !== "Accounts"
		);
	}
	const $wrap = frm.dashboard && (frm.dashboard.parent || frm.$wrapper);
	if ($wrap) {
		["Accounts Tuition Fee Payment", "Accounts OSHC Payment", "Accounts Commission"].forEach(
			(dt) => {
				$wrap.find(`.document-link[data-doctype="${dt}"]`).closest(".document-link-parent, .form-documents").hide();
				$wrap.find(`.document-link[data-doctype="${dt}"]`).hide();
			}
		);
		$wrap.find(".form-dashboard-section.form-links").each(function () {
			const text = ($(this).text() || "").toLowerCase();
			if (text.indexOf("accounts tuition") !== -1 || text.indexOf("accounts oshc") !== -1) {
				$(this).hide();
			}
		});
	}
	if (
		frm.dashboard &&
		frm.dashboard.data &&
		(!frm.dashboard.data.transactions || !frm.dashboard.data.transactions.length)
	) {
		frm.dashboard.links_area && frm.dashboard.links_area.hide();
	}
}

function add_accounts_workflow_buttons(frm) {
	if (!frm.doc.name || frm.doc.__islocal || frm.doc.destination_country !== "Australia") {
		return;
	}
	if (!is_accounts_user()) {
		return;
	}
	if (!frappe.model.can_read("Accounts Tuition Fee Payment")) {
		return;
	}
	const openers = [
		["Accounts Tuition Fee Payment", __("Tuition Fee Payment")],
		["Accounts OSHC Payment", __("OSHC Payment")],
		["Accounts Commission", __("Commissions")],
	];
	openers.forEach(([doctype, label]) => {
		if (!frappe.model.can_read(doctype)) {
			return;
		}
		frappe.db
			.get_list(doctype, {
				filters: { application: frm.doc.name },
				fields: ["name"],
				limit: 1,
			})
			.then((rows) => {
				if (!rows || !rows.length) {
					return;
				}
				frm.add_custom_button(label, () => {
					if (doctype === "Accounts Commission") {
						frappe.set_route("List", doctype, { application: frm.doc.name });
					} else {
						frappe.set_route("Form", doctype, rows[0].name);
					}
				}, __("Accounts"));
			})
			.catch(() => {});
	});
}
