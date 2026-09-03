// Copyright (c) 2026, Unideft and contributors
// UK Application — field names aligned with Application (Australia) where shared.

const UK_REMINDER_SESSION = {};
const UK_LIVING = { "Inner London": 13347, "Outer London": 10224 };
// UKVI-style dependent maintenance (approx. 9 months) when Funds Required includes spouse/kid
const UK_DEPENDENT_LIVING = { "Inner London": 7605, "Outer London": 6120 };
const UK_LEGACY_GAP_HIDDEN = [
	"study_gap_upto_1_year",
	"study_gap_status",
	"study_gap_not_accepted_status",
];

/** Details duration → Accepted / Not Accepted. Processing shows proof only when Accepted. */
function apply_uk_gap_duration_rule(frm) {
	const d = frm.doc.gap_duration;
	const accepted = d === "Below 1 Year" || d === "Below 2 Years";
	const not_accepted = d === "Above 2 Years";
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

const UK_ENGLISH_BASE_TYPES =
	"\nIELTS Waiver\nIELTS\nUKVI IELTS\nPTE\nUKVI PTE\nDuolingo\nTOEFL";
const UK_ENGLISH_GRAD_TYPES = UK_ENGLISH_BASE_TYPES + "\nMOI";

function student_contact_from(stu) {
	return stu.mobile || stu.mobile_no || stu.phone || stu.contact_no || "";
}

function calculate_age_from_dob(dob_str) {
	if (!dob_str) return "";
	const dob = frappe.datetime.str_to_obj(dob_str);
	if (!dob) return "";
	const today = new Date();
	let age = today.getFullYear() - dob.getFullYear();
	const month_diff = today.getMonth() - dob.getMonth();
	if (month_diff < 0 || (month_diff === 0 && today.getDate() < dob.getDate())) {
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

function apply_uk_english_test_options(frm) {
	const allow_moi =
		frm.doc.higher_education === "Graduation" || frm.doc.higher_education === "Post-graduation";
	const opts = allow_moi ? UK_ENGLISH_GRAD_TYPES : UK_ENGLISH_BASE_TYPES;
	if (frm.fields_dict.english_test_details) {
		frm.set_df_property(
			"english_test_details",
			"description",
			allow_moi
				? __("Cases 3–6: includes MOI (Medium of Instruction)")
				: __("Click Add Row for IELTS / PTE / TOEFL / etc.")
		);
	}
	// Restrict MOI on child rows when not Graduation / Post-graduation
	frappe.model.with_doctype("Application English Test", () => {
		const meta = frappe.get_meta("Application English Test");
		const df = meta && meta.fields.find((f) => f.fieldname === "test_type");
		if (df) df.options = opts;
	});
}
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
	// Case 5 allows spouse track (Case 7&8 PDF). Cases 1 & 3 stay single-basis only.
	// Research gate can still force single_basis_only via wants_process_single_basis.
	const force_single = ["UK Case 1", "UK Case 3"].includes(case_label);
	if (force_single) {
		frm.set_value("single_basis_only", 1);
	} else if (frm.doc.wants_process_single_basis !== "Yes") {
		frm.set_value("single_basis_only", 0);
	}
	apply_uk_sponsor_for_options(frm);
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

function uk_funds_from_type(frm, is_defer) {
	const prefix = is_defer ? "defer_" : "";
	const loc_field = prefix + "living_expenses_location";
	const living_field = prefix + "living_expenses";
	const funds_type = frm.doc[prefix + "funds_required_type"] || "";
	const location = frm.doc[loc_field];
	const living = UK_LIVING[location] || flt(frm.doc[living_field]) || 0;
	if (location && frm.doc[living_field] !== living) {
		frm.set_value(living_field, living);
	}

	const tuition = flt(frm.doc[prefix + "full_year_tuition_fee"]);
	const scholarship = flt(frm.doc[prefix + "scholarship"]);
	const payable = flt(frm.doc[prefix + "payable_fee"]);
	const without_full_year = funds_type.includes("Without Full Year fee");

	// With Full Year: net tuition + living − payable CAS
	// Without Full Year: payable CAS + living (tuition already represented by payable)
	let amount = without_full_year
		? payable + living
		: Math.max(tuition - scholarship, 0) + living - payable;

	const type_l = funds_type.toLowerCase();
	const dependent = UK_DEPENDENT_LIVING[location] || 0;
	const allow_dependents = !frm.doc.single_basis_only;

	// Kid add-on stays on main funds amount. Spouse living is a separate field.
	if (allow_dependents && type_l.includes("kid")) {
		amount += dependent;
	}

	return amount > 0 ? amount : 0;
}

function uk_spouse_track(frm) {
	return frm.doc.martial_status === "Married" && !frm.doc.single_basis_only;
}

function recalculate_uk_spouse_funds(frm) {
	const living = flt(frm.doc.living_expenses) || UK_LIVING[frm.doc.living_expenses_location] || 0;
	if (uk_spouse_track(frm)) {
		if (frm.doc.funds_required_for_spouse !== living) {
			frm.set_value("funds_required_for_spouse", living);
		}
	} else if (frm.doc.funds_required_for_spouse) {
		frm.set_value("funds_required_for_spouse", 0);
	}

	if (frm.doc.defer_offer_required === "Yes") {
		const d_living =
			flt(frm.doc.defer_living_expenses) || UK_LIVING[frm.doc.defer_living_expenses_location] || 0;
		if (uk_spouse_track(frm)) {
			if (frm.doc.defer_funds_required_for_spouse !== d_living) {
				frm.set_value("defer_funds_required_for_spouse", d_living);
			}
		} else if (frm.doc.defer_funds_required_for_spouse) {
			frm.set_value("defer_funds_required_for_spouse", 0);
		}
	}
}

function recalculate_uk_funds(frm) {
	frm.set_value("funds_required_amount", uk_funds_from_type(frm, false));
	recalculate_uk_spouse_funds(frm);
}

function recalculate_uk_defer_funds(frm) {
	if (frm.doc.defer_offer_required !== "Yes") return;
	frm.set_value("defer_funds_required_amount", uk_funds_from_type(frm, true));
	recalculate_uk_spouse_funds(frm);
}

function apply_uk_sponsor_for_options(frm) {
	if (!frm.fields_dict.uk_sponsors || !frm.fields_dict.uk_sponsors.grid) return;
	const allow_spouse = frm.doc.martial_status === "Married" && !cint(frm.doc.single_basis_only);
	const opts = allow_spouse ? "\nApplicant\nSpouse" : "\nApplicant";
	frm.fields_dict.uk_sponsors.grid.update_docfield_property("sponsor_for", "options", opts);
	(frm.doc.uk_sponsors || []).forEach((row) => {
		if (!allow_spouse && row.sponsor_for === "Spouse") {
			frappe.model.set_value(row.doctype, row.name, "sponsor_for", "Applicant");
		}
		if (!row.sponsor_for) {
			frappe.model.set_value(row.doctype, row.name, "sponsor_for", "Applicant");
		}
	});
}

function apply_uk_package_mandatory(frm) {
	const reqd = !!frm.doc.is_package_case;
	["data_swym", "password", "recovery_email_id", "login_contact_no"].forEach((fieldname) => {
		if (frm.fields_dict[fieldname]) {
			frm.set_df_property(fieldname, "reqd", reqd ? 1 : 0);
		}
	});
}

function populate_uk_offer_defaults(frm) {
	if (frm.doc.preferred_university && !frm.doc.university_name) {
		frm.set_value("university_name", frm.doc.preferred_university);
	}
	if (frm.doc.course && !frm.doc.course_name) {
		frm.set_value("course_name", frm.doc.course);
	}
	if (frm.doc.defer_offer_required === "Yes") {
		if (frm.doc.preferred_university && !frm.doc.defer_university_name) {
			frm.set_value("defer_university_name", frm.doc.preferred_university);
		}
		if (frm.doc.course && !frm.doc.defer_course_name) {
			frm.set_value("defer_course_name", frm.doc.course);
		}
	}
}

function setup_uk_course_query(frm) {
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

const UK_OFFER_CURRENCY_FIELDS = [
	"full_year_tuition_fee",
	"scholarship",
	"payable_fee",
	"living_expenses",
	"funds_required_amount",
	"initial_deposit_amount_payable",
];
const UK_DEFER_CURRENCY_FIELDS = [
	"defer_full_year_tuition_fee",
	"defer_scholarship",
	"defer_payable_fee",
	"defer_living_expenses",
	"defer_funds_required_amount",
];

function update_uk_currency_fields(frm, is_defer) {
	const currency_field = is_defer ? "defer_offer_currency" : "offer_currency";
	const fields = is_defer ? UK_DEFER_CURRENCY_FIELDS : UK_OFFER_CURRENCY_FIELDS;
	fields.forEach((fieldname) => {
		if (frm.fields_dict[fieldname]) {
			frm.set_df_property(fieldname, "options", currency_field);
			frm.refresh_field(fieldname);
		}
	});
	const amount_field = is_defer ? "defer_funds_required_amount" : "funds_required_amount";
	const code = frm.doc[currency_field] || "GBP";
	if (frm.fields_dict[amount_field]) {
		frm.set_df_property(amount_field, "label", __("Funds Required ({0})", [code]));
		frm.refresh_field(amount_field);
	}
}

function deactivate_uk_reminders(frm, description_like) {
	const app = frm.doc.application;
	if (!app) return;
	frappe.db
		.get_list("Reminder", {
			filters: {
				reminder_doctype: "Application",
				reminder_docname: app,
				description: ["like", description_like],
				notified: 0,
			},
			fields: ["name"],
			limit: 20,
		})
		.then((rows) => {
			(rows || []).forEach((row) => frappe.db.set_value("Reminder", row.name, "notified", 1));
			if (rows && rows.length) {
				frappe.show_alert(
					{ message: __("Reminder deactivated"), indicator: "blue" },
					3
				);
			}
		});
}

function set_uk_stage(frm, stage) {
	frm.set_value("uk_current_stage", stage);
}

function maybe_uk_reminder(frm, field_value, expect, options) {
	if (field_value !== expect) return;
	const key = options.trigger_key || options.default_description;
	UK_REMINDER_SESSION[key] = false;
	prompt_uk_reminder(frm, options);
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
	(frm.meta.fields || [])
		.filter((df) => df.fieldtype === "Table" && df.options)
		.forEach((df) => {
			frappe.model.with_doctype(df.options, () => {
				const meta = frappe.get_meta(df.options);
				if (meta) meta.editable_grid = 0;
				const grid = frm.fields_dict[df.fieldname]?.grid;
				if (grid) {
					grid.meta = meta;
					try {
						grid.setup_fields && grid.setup_fields();
					} catch (e) {
						/* ignore */
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

function open_child_row_form(frm, grid, child, child_dt) {
	const nested_from_meta = (meta) =>
		(meta?.fields || [])
			.filter((f) => f.fieldtype === "Table" && f.options)
			.map((f) => f.options);

	const open_row = () => {
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
			if (!row.docfields.length) {
				frappe.throw(__("No fields loaded for {0}. Hard-refresh and try again.", [child_dt]));
			}
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

function patch_grid_row_toggle(grid, child_dt) {
	(grid.grid_rows || []).forEach((row) => {
		if (row._unideft_toggle_patched) return;
		const original = row.toggle_view.bind(row);
		row.toggle_view = function (show, callback) {
			if (show !== false && show !== 0) {
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

function sync_processing_agent_row(cdt, cdn) {
	const row = locals[cdt][cdn];
	if (!row) return;
	const DEFAULT_DIRECT = "Unideft Education Services Pvt. Ltd.";
	// Avoid grid.reset / refresh_field here — that was wiping the child table mid-edit.
	if (row.processing_agent_type === "Direct") {
		if (!row.our_company) {
			frappe.model.set_value(cdt, cdn, "our_company", DEFAULT_DIRECT);
		}
		if (row.processing_agent_vendor) {
			frappe.model.set_value(cdt, cdn, "processing_agent_vendor", "");
		}
		frappe.model.set_value(cdt, cdn, "processing_agent_direct", row.our_company || DEFAULT_DIRECT);
	} else if (row.processing_agent_type === "Vendor") {
		if (row.our_company) {
			frappe.model.set_value(cdt, cdn, "our_company", "");
		}
		frappe.model.set_value(
			cdt,
			cdn,
			"processing_agent_direct",
			row.processing_agent_vendor || ""
		);
	}
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
		setTimeout(() => patch_form_view_tables(frm), 300);
		apply_age_from_dob(frm);
		apply_uk_gap_duration_rule(frm);
		setup_uk_course_query(frm);
		UK_LEGACY_GAP_HIDDEN.forEach((fieldname) => {
			if (frm.fields_dict[fieldname]) {
				frm.set_df_property(fieldname, "hidden", 1);
			}
		});
		["application", "naming_series", "country_flow_case", "single_basis_only"].forEach((fieldname) => {
			if (frm.fields_dict[fieldname]) {
				frm.set_df_property(fieldname, "hidden", 1);
			}
		});

		if (!frm.is_new() && frm.doc.application) {
			frm.add_custom_button(__("Applications List"), () => frappe.set_route("List", "Application"));
		}

		apply_b2c_agent(frm);
		if (!frm.doc.offer_currency) frm.set_value("offer_currency", "GBP");
		update_uk_currency_fields(frm, false);
		if (frm.doc.defer_offer_required === "Yes") {
			if (!frm.doc.defer_offer_currency) frm.set_value("defer_offer_currency", "GBP");
			update_uk_currency_fields(frm, true);
		}
		recalculate_uk_funds(frm);
		recalculate_uk_defer_funds(frm);
		apply_uk_package_mandatory(frm);
		apply_uk_sponsor_for_options(frm);
		populate_uk_offer_defaults(frm);
		apply_uk_english_test_options(frm);

		if (frm.is_new() && !frm._landed_details_tab) {
			frm._landed_details_tab = true;
			setTimeout(() => {
				const tab_field = frm.get_field("details_tab");
				const tab = tab_field && tab_field.tab;
				// Tab.set_active() is what actually switches the tab.
				// frm.set_active_tab() only records which tab is active
				// (active_tab_map / URL hash), so on its own it left the form
				// showing one tab while reporting another as active.
				if (tab && typeof tab.set_active === "function") {
					if (typeof tab.is_hidden === "function" && tab.is_hidden()) {
						return;
					}
					tab.set_active();
				}
			}, 200);
		}
	},

	is_package_case(frm) {
		apply_uk_package_mandatory(frm);
	},

	dob(frm) {
		apply_age_from_dob(frm);
	},

	preferred_university(frm) {
		if (frm.doc.course) {
			frm.set_value("course", "");
		}
		setup_uk_course_query(frm);
		populate_uk_offer_defaults(frm);
	},

	course(frm) {
		populate_uk_offer_defaults(frm);
	},

	offer_currency(frm) {
		update_uk_currency_fields(frm, false);
		recalculate_uk_funds(frm);
	},

	defer_offer_currency(frm) {
		update_uk_currency_fields(frm, true);
		recalculate_uk_defer_funds(frm);
	},

	student(frm) {
		if (!frm.doc.student) return;
		frappe.db.get_doc("Student", frm.doc.student).then((stu) => {
			if (stu.email && !frm.doc.student_email) frm.set_value("student_email", stu.email);
			const contact = student_contact_from(stu);
			if (contact && !frm.doc.student_contact_no) frm.set_value("student_contact_no", contact);
			const dob = stu.dob || stu.date_of_birth;
			if (dob && !frm.doc.dob) {
				frm.set_value("dob", dob).then(() => apply_age_from_dob(frm));
			} else {
				apply_age_from_dob(frm);
			}
		});
	},

	application_type(frm) {
		apply_b2c_agent(frm);
	},

	higher_education(frm) {
		sync_uk_case(frm);
		apply_uk_english_test_options(frm);
	},

	martial_status(frm) {
		sync_uk_case(frm);
	},

	bachelor_university_accepted(frm) {
		if (frm.doc.bachelor_university_accepted === "No") {
			frappe.show_alert(
				{
					message: __("If not accepted by any other UK university, capture reason and close the case."),
					indicator: "orange",
				},
				6
			);
		}
	},

	bachelor_other_uk_uni_accepted(frm) {
		if (frm.doc.bachelor_other_uk_uni_accepted === "Yes") {
			frappe.msgprint({
				title: __("Separate Application"),
				message: __("Process a separate application for the other UK university that accepts these documents."),
				indicator: "blue",
			});
		} else if (frm.doc.bachelor_other_uk_uni_accepted === "No") {
			frappe.msgprint({
				title: __("Close Case"),
				message: __("Capture the reason below, then mark Application Closed."),
				indicator: "orange",
			});
			if (frm.fields_dict.application_closed) {
				// nudge — user confirms close after reason
			}
		}
	},

	bachelor_close_reason(frm) {
		if (
			frm.doc.bachelor_close_reason &&
			frm.doc.bachelor_university_accepted === "No" &&
			frm.doc.bachelor_other_uk_uni_accepted === "No"
		) {
			frm.set_value("application_closed", 1);
			set_uk_stage(frm, "Closed");
			if (frm.doc.status !== "Closed") frm.set_value("status", "Closed");
		}
	},

	eligible_for_research_program(frm) {
		if (frm.doc.eligible_for_research_program === "Yes") {
			frappe.show_alert({ message: __("Research eligible — continue Processing."), indicator: "green" }, 4);
		}
		frm.refresh_fields();
	},

	wants_process_single_basis(frm) {
		if (frm.doc.wants_process_single_basis === "Yes") {
			frm.set_value("single_basis_only", 1);
			frappe.show_alert(
				{ message: __("Single-basis processing — continue below."), indicator: "green" },
				4
			);
		}
		frm.refresh_fields();
	},

	wants_process_another_country(frm) {
		if (frm.doc.wants_process_another_country === "Yes") {
			frappe.msgprint({
				title: __("Another Country"),
				message: __("Enter the country below and process that country separately. UK Processing stays hidden on this form."),
				indicator: "blue",
			});
		} else if (frm.doc.wants_process_another_country === "No") {
			frappe.msgprint({
				title: __("Close Case"),
				message: __("Capture the reason below, then the case will be marked Closed."),
				indicator: "orange",
			});
		}
		frm.refresh_fields();
	},

	research_close_reason(frm) {
		if (
			frm.doc.research_close_reason &&
			frm.doc.higher_education === "Post-graduation" &&
			frm.doc.eligible_for_research_program === "No" &&
			frm.doc.wants_process_single_basis === "No" &&
			frm.doc.wants_process_another_country === "No"
		) {
			frm.set_value("application_closed", 1);
			set_uk_stage(frm, "Closed");
			if (frm.doc.status !== "Closed") frm.set_value("status", "Closed");
		}
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
			frm.set_value("gap_duration", "");
			frm.set_value("gap_duration_status", "");
			frm.set_value("gap_duration_not_accepted", "");
			frm.set_value("study_gap_upto_1_year", "");
			frm.set_value("study_gap_status", "");
			frm.set_value("study_gap_not_accepted_status", "");
			frm.clear_table("study_gap_proof_list");
			frm.refresh_field("study_gap_proof_list");
		} else if (frm.doc.study_gap === "Yes") {
			frm.set_value("study_gap_ok", "");
			apply_uk_gap_duration_rule(frm);
		} else {
			frm.set_value("study_gap_ok", "");
		}
	},

	gap_duration(frm) {
		apply_uk_gap_duration_rule(frm);
	},

	study_gap_upto_1_year(frm) {
		// Legacy — use gap_duration
	},

	living_expenses_location(frm) {
		recalculate_uk_funds(frm);
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
	funds_required_type(frm) {
		recalculate_uk_funds(frm);
	},

	deposit_deadline(frm) {
		if (frm.doc.deposit_deadline) {
			const key = `uk_deposit_${frm.doc.name}`;
			UK_REMINDER_SESSION[key] = false;
			prompt_uk_reminder(frm, {
				title: __("Deposit / tuition deadline"),
				default_description: "UK — Decide deadline for deposit / tuition fee payment",
				default_date: frm.doc.deposit_deadline,
				trigger_key: key,
			});
		}
	},

	tuition_paid_before_deadline(frm) {
		if (frm.doc.tuition_paid_before_deadline === "Yes") {
			deactivate_uk_reminders(frm, "UK — Decide deadline for deposit%");
			deactivate_uk_reminders(frm, "UK — Deposit / tuition%");
			deactivate_uk_reminders(frm, "UK — Intake deposit%");
		}
	},

	university_intake(frm) {
		if (frm.doc.university_intake) {
			// Deposit / tuition reminder lives on deposit_deadline only (not intake)
			set_uk_stage(frm, "Offer Letter");
			populate_uk_offer_defaults(frm);
		}
	},

	offer_letter_upload(frm) {
		if (frm.doc.offer_letter_upload && frm.doc.offer_letter_upload.length) {
			set_uk_stage(frm, "Offer Letter");
		}
	},

	applied_for_defer_offer_letter(frm) {
		if (frm.doc.applied_for_defer_offer_letter === "Yes") {
			maybe_uk_reminder(frm, "Yes", "Yes", {
				title: __("Defer offer letter received"),
				default_description: "UK — Follow up: Defer offer letter received",
				trigger_key: `uk_defer_recv_wait_${frm.doc.name}`,
			});
		} else if (frm.doc.applied_for_defer_offer_letter === "No") {
			maybe_uk_reminder(frm, "No", "No", {
				title: __("Apply for defer offer letter"),
				default_description: "UK — Apply for defer offer letter",
				trigger_key: `uk_defer_apply_${frm.doc.name}`,
			});
		}
	},

	defer_offer_received(frm) {
		if (frm.doc.defer_offer_received === "No") {
			maybe_uk_reminder(frm, "No", "No", {
				title: __("Expect defer offer letter"),
				default_description: "UK — When expect defer offer letter will be received",
				trigger_key: `uk_defer_expect_${frm.doc.name}`,
			});
		} else if (frm.doc.defer_offer_received === "Yes") {
			populate_uk_offer_defaults(frm);
			recalculate_uk_defer_funds(frm);
		}
	},

	defer_living_expenses_location(frm) {
		recalculate_uk_defer_funds(frm);
	},
	defer_full_year_tuition_fee(frm) {
		recalculate_uk_defer_funds(frm);
	},
	defer_scholarship(frm) {
		recalculate_uk_defer_funds(frm);
	},
	defer_payable_fee(frm) {
		recalculate_uk_defer_funds(frm);
	},
	defer_funds_required_type(frm) {
		recalculate_uk_defer_funds(frm);
	},
	defer_deposit_deadline(frm) {
		if (frm.doc.defer_deposit_deadline) {
			prompt_uk_reminder(frm, {
				title: __("Defer deposit deadline"),
				default_description: "UK — Decide deadline for deposit (defer offer)",
				default_date: frm.doc.defer_deposit_deadline,
				trigger_key: `uk_defer_dep_${frm.doc.name}`,
			});
		}
	},

	defer_university_intake(frm) {
		// Deposit reminder for defer is on defer_deposit_deadline only
	},

	processing_agent_details_add(frm, cdt, cdn) {
		frappe.model.set_value(cdt, cdn, "processing_agent_type", "Direct");
		frappe.model.set_value(cdt, cdn, "our_company", "Unideft Education Services Pvt. Ltd.");
		frappe.model.set_value(cdt, cdn, "processing_agent_direct", "Unideft Education Services Pvt. Ltd.");
		frappe.model.set_value(cdt, cdn, "processing_agent_vendor", "");
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

	initial_amount_paid(frm) {
		maybe_uk_reminder(frm, frm.doc.initial_amount_paid, "No", {
			title: __("Pay initial deposit"),
			default_description: "UK — Pay initial deposit amount",
			trigger_key: `uk_init_dep_${frm.doc.name}`,
		});
	},

	student_prepare(frm) {
		maybe_uk_reminder(frm, frm.doc.student_prepare, "No", {
			title: __("Prepare student for interview"),
			default_description: "UK — Prepare student for interview",
			trigger_key: `uk_prep_${frm.doc.name}`,
		});
	},

	interview_scheduled(frm) {
		if (frm.doc.interview_scheduled === "Yes") {
			deactivate_uk_reminders(frm, "UK — Interview deadline%");
			deactivate_uk_reminders(frm, "UK — Schedule interview%");
			if (frm.doc.interview_date) {
				maybe_uk_reminder(frm, "Yes", "Yes", {
					title: __("Interview reminder"),
					default_description: "UK — Interview scheduled",
					default_date: frm.doc.interview_date,
					trigger_key: `uk_int_sched_${frm.doc.name}`,
				});
			}
		} else if (frm.doc.interview_scheduled === "No") {
			maybe_uk_reminder(frm, "No", "No", {
				title: __("Schedule interview"),
				default_description: "UK — Schedule interview",
				trigger_key: `uk_sched_int_${frm.doc.name}`,
			});
		}
	},

	interview_date(frm) {
		if (frm.doc.interview_date && frm.doc.interview_scheduled === "Yes") {
			deactivate_uk_reminders(frm, "UK — Interview deadline%");
			maybe_uk_reminder(frm, "Yes", "Yes", {
				title: __("Interview date"),
				default_description: "UK — Interview scheduled",
				default_date: frm.doc.interview_date,
				trigger_key: `uk_int_date_${frm.doc.name}`,
			});
		}
	},

	schedule_interview(frm) {
		if (frm.doc.schedule_interview === "Yes") {
			maybe_uk_reminder(frm, "Yes", "Yes", {
				title: __("Interview date reminder"),
				default_description: "UK — Prepare strongly / interview date",
				default_date: frm.doc.interview_date || frm.doc.interview_deadline_date || frappe.datetime.get_today(),
				trigger_key: `uk_sched_yes_${frm.doc.name}`,
			});
		} else if (frm.doc.schedule_interview === "No") {
			maybe_uk_reminder(frm, "No", "No", {
				title: __("Follow up interview schedule"),
				default_description: "UK — Follow up interview schedule",
				trigger_key: `uk_sched_no_${frm.doc.name}`,
			});
		}
	},

	tuition_fee_paid_interview(frm) {
		maybe_uk_reminder(frm, frm.doc.tuition_fee_paid_interview, "No", {
			title: __("Pay tuition fee"),
			default_description: "UK — Pay tuition fee (interview / before deposit)",
			trigger_key: `uk_tui_int_${frm.doc.name}`,
		});
	},

	interview_second_chance(frm) {
		if (frm.doc.interview_second_chance === "No" && frm.doc.interview_status === "Rejected") {
			frappe.msgprint({
				title: __("Close Case"),
				message: __("Close case for this university (2nd interview chance declined)."),
				indicator: "orange",
			});
		}
	},

	second_chance_student_prepare(frm) {
		maybe_uk_reminder(frm, frm.doc.second_chance_student_prepare, "No", {
			title: __("Prepare student (2nd chance)"),
			default_description: "UK — Prepare student for 2nd chance interview",
			trigger_key: `uk_prep2_${frm.doc.name}`,
		});
	},

	second_chance_interview_scheduled(frm) {
		if (frm.doc.second_chance_interview_scheduled === "Yes") {
			deactivate_uk_reminders(frm, "UK — Interview deadline%");
			maybe_uk_reminder(frm, "Yes", "Yes", {
				title: __("2nd chance interview"),
				default_description: "UK — 2nd chance interview scheduled",
				default_date: frm.doc.second_chance_interview_date || frappe.datetime.get_today(),
				trigger_key: `uk_int2_${frm.doc.name}`,
			});
		} else if (frm.doc.second_chance_interview_scheduled === "No") {
			maybe_uk_reminder(frm, "No", "No", {
				title: __("Schedule 2nd chance interview"),
				default_description: "UK — Schedule 2nd chance interview",
				trigger_key: `uk_sched2_${frm.doc.name}`,
			});
		}
	},

	second_chance_schedule_interview(frm) {
		if (frm.doc.second_chance_schedule_interview === "Yes") {
			maybe_uk_reminder(frm, "Yes", "Yes", {
				title: __("2nd chance interview date"),
				default_description: "UK — Prepare strongly / 2nd chance interview date",
				default_date: frm.doc.second_chance_interview_date || frappe.datetime.get_today(),
				trigger_key: `uk_sched2_yes_${frm.doc.name}`,
			});
		} else if (frm.doc.second_chance_schedule_interview === "No") {
			maybe_uk_reminder(frm, "No", "No", {
				title: __("Follow up 2nd chance schedule"),
				default_description: "UK — Follow up 2nd chance interview schedule",
				trigger_key: `uk_sched2_no_${frm.doc.name}`,
			});
		}
	},

	pending_amount_for_cas(frm) {
		maybe_uk_reminder(frm, frm.doc.pending_amount_for_cas, "Yes", {
			title: __("Pending tuition for CAS"),
			default_description: "UK — Pay pending tuition fee for CAS",
			trigger_key: `uk_pend_cas_${frm.doc.name}`,
		});
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
		} else if (frm.doc.medical_scheduled === "Yes") {
			prompt_uk_reminder(frm, {
				title: __("Receive medical"),
				default_description: "UK — Receive medical and upload",
				trigger_key: `uk_medical_recv_${frm.doc.name}`,
			});
		}
	},

	medical_done(frm) {
		maybe_uk_reminder(frm, frm.doc.medical_done, "No", {
			title: __("Medical"),
			default_description: "UK — When will medical be done",
			trigger_key: `uk_med_done_${frm.doc.name}`,
		});
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
			if (frm.doc.cas_received !== undefined) frm.set_value("cas_received", "Yes");
		} else if (frm.doc.cas_letter_received === "No") {
			if (frm.doc.cas_any_pendency === "No") {
				maybe_uk_reminder(frm, "No", "No", {
					title: __("Waiting for CAS letter"),
					default_description: "UK — Follow up for CAS letter",
					trigger_key: `uk_cas_wait_${frm.doc.name}`,
				});
			}
		}
	},

	cas_any_pendency(frm) {
		if (frm.doc.cas_letter_received === "No" && frm.doc.cas_any_pendency === "No") {
			maybe_uk_reminder(frm, "No", "No", {
				title: __("Waiting for CAS letter"),
				default_description: "UK — Follow up for CAS letter",
				trigger_key: `uk_cas_wait_${frm.doc.name}`,
			});
		}
	},

	cas_pendency_completed(frm) {
		if (frm.doc.cas_pendency_completed === "Yes") {
			maybe_uk_reminder(frm, "Yes", "Yes", {
				title: __("CAS letter follow-up"),
				default_description: "UK — Follow up for CAS letter after pendency",
				trigger_key: `uk_cas_after_pend_${frm.doc.name}`,
			});
		} else if (frm.doc.cas_pendency_completed === "No") {
			maybe_uk_reminder(frm, "No", "No", {
				title: __("Complete CAS pendency"),
				default_description: "UK — Complete CAS pendency",
				trigger_key: `uk_cas_pend_${frm.doc.name}`,
			});
		}
	},

	cas_extension_required(frm) {
		maybe_uk_reminder(frm, frm.doc.cas_extension_required, "Yes", {
			title: __("CAS extension"),
			default_description: "UK — Complete CAS extension",
			trigger_key: `uk_cas_ext_${frm.doc.name}`,
		});
	},

	national_id_name_match(frm) {
		maybe_uk_reminder(frm, frm.doc.national_id_name_match, "No", {
			title: __("Student name affidavit"),
			default_description: "UK — Upload same name affidavit (student / Aadhar)",
			trigger_key: `uk_aff_stu_${frm.doc.name}`,
		});
	},

	mother_aadhar_name_match(frm) {
		maybe_uk_reminder(frm, frm.doc.mother_aadhar_name_match, "No", {
			title: __("Mother name affidavit"),
			default_description: "UK — Upload same name affidavit (mother)",
			trigger_key: `uk_aff_mom_${frm.doc.name}`,
		});
	},

	father_aadhar_name_match(frm) {
		maybe_uk_reminder(frm, frm.doc.father_aadhar_name_match, "No", {
			title: __("Father name affidavit"),
			default_description: "UK — Upload same name affidavit (father)",
			trigger_key: `uk_aff_dad_${frm.doc.name}`,
		});
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

	visa_application_uploaded(frm) {
		maybe_uk_reminder(frm, frm.doc.visa_application_uploaded, "No", {
			title: __("Upload visa application"),
			default_description: "UK — Upload visa application",
			trigger_key: `uk_visa_app_${frm.doc.name}`,
		});
	},

	biometrics_done(frm) {
		if (frm.doc.biometrics_done === "No") {
			prompt_uk_reminder(frm, {
				title: __("Complete biometrics"),
				default_description: "UK — Biometrics completion follow-up",
				default_date: frm.doc.biometric_date || frappe.datetime.get_today(),
				trigger_key: `uk_bio_${frm.doc.name}`,
			});
		} else if (frm.doc.biometrics_done === "Yes") {
			maybe_uk_reminder(frm, "Yes", "Yes", {
				title: __("Expected visa decision"),
				default_description: "UK — Expected visa decision follow-up",
				default_date: frm.doc.expected_visa_decision || frappe.datetime.get_today(),
				trigger_key: `uk_visa_dec_bio_${frm.doc.name}`,
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
			frappe.show_alert(
				{
					message: __("Visa approved — Accounts should be notified with documents."),
					indicator: "green",
				},
				6
			);
		} else if (frm.doc.visa_decision === "Visa Refused" || frm.doc.visa_decision === "Refused") {
			set_uk_stage(frm, "Visa Refused");
		}
	},

	evisa_activated(frm) {
		maybe_uk_reminder(frm, frm.doc.evisa_activated, "No", {
			title: __("Activate e-Visa"),
			default_description: "UK — Activate e-Visa (main applicant)",
			trigger_key: `uk_evisa_${frm.doc.name}`,
		});
	},

	share_code_received(frm) {
		maybe_uk_reminder(frm, frm.doc.share_code_received, "No", {
			title: __("Receive share code"),
			default_description: "UK — Receive share code (main applicant)",
			trigger_key: `uk_share_${frm.doc.name}`,
		});
	},

	share_code_verified(frm) {
		maybe_uk_reminder(frm, frm.doc.share_code_verified, "No", {
			title: __("Verify e-Visa"),
			default_description: "UK — Verify e-Visa with share code (main applicant)",
			trigger_key: `uk_share_ver_${frm.doc.name}`,
		});
	},

	spouse_evisa_activated(frm) {
		maybe_uk_reminder(frm, frm.doc.spouse_evisa_activated, "No", {
			title: __("Activate spouse e-Visa"),
			default_description: "UK — Activate e-Visa (spouse)",
			trigger_key: `uk_spouse_evisa_${frm.doc.name}`,
		});
	},

	spouse_share_code_received(frm) {
		maybe_uk_reminder(frm, frm.doc.spouse_share_code_received, "No", {
			title: __("Receive spouse share code"),
			default_description: "UK — Receive share code (spouse)",
			trigger_key: `uk_spouse_share_${frm.doc.name}`,
		});
	},

	spouse_share_code_verified(frm) {
		maybe_uk_reminder(frm, frm.doc.spouse_share_code_verified, "No", {
			title: __("Verify spouse e-Visa"),
			default_description: "UK — Verify e-Visa with share code (spouse)",
			trigger_key: `uk_spouse_share_ver_${frm.doc.name}`,
		});
	},

	student_enrolled(frm) {
		if (frm.doc.student_enrolled === "Yes" || frm.doc.student_enrolled === 1) {
			set_uk_stage(frm, "Enrolment");
		} else if (frm.doc.student_enrolled === "No" || frm.doc.student_enrolled === 0) {
			prompt_uk_reminder(frm, {
				title: __("Enrolment follow-up"),
				default_description: "UK — Student enrolment follow-up",
				trigger_key: `uk_enrol_${frm.doc.name}`,
			});
		}
	},

	applied_for_refund(frm) {
		if (frm.doc.applied_for_refund === "Yes") {
			set_uk_stage(frm, "Refund Processing");
		} else if (frm.doc.applied_for_refund === "No") {
			prompt_uk_reminder(frm, {
				title: __("Apply for refund"),
				default_description: "UK — Apply for refund follow-up",
				trigger_key: `uk_refund_app_${frm.doc.name}`,
			});
		}
	},

	tuition_refund_received(frm) {
		if (frm.doc.tuition_refund_received === "Yes") {
			set_uk_stage(frm, "Refunded");
		} else if (frm.doc.tuition_refund_received === "No") {
			prompt_uk_reminder(frm, {
				title: __("Expected tuition refund"),
				default_description: "UK — Expected tuition fee refund follow-up",
				trigger_key: `uk_tui_ref_${frm.doc.name}`,
			});
		}
	},

	ihs_refund_received(frm) {
		if (frm.doc.ihs_refund_received === "No") {
			prompt_uk_reminder(frm, {
				title: __("Expected IHS refund"),
				default_description: "UK — Expected IHS refund follow-up",
				trigger_key: `uk_ihs_ref_${frm.doc.name}`,
			});
		}
	},

	ihs_refund_received_no_issue(frm) {
		if (frm.doc.ihs_refund_received_no_issue === "No") {
			prompt_uk_reminder(frm, {
				title: __("Expected IHS refund"),
				default_description: "UK — Expected IHS refund received (Refunded / no tuition issue)",
				trigger_key: `uk_ihs_no_iss_${frm.doc.name}`,
			});
		} else if (frm.doc.ihs_refund_received_no_issue === "Yes") {
			frappe.show_alert(
				{ message: __("Upload tuition fee refund invoice and close this case."), indicator: "blue" },
				5
			);
		}
	},

	tuition_fee_issue_resolved(frm) {
		if (frm.doc.tuition_fee_issue_resolved === "No") {
			prompt_uk_reminder(frm, {
				title: __("Refund issue resolution"),
				default_description: "UK — Expect refund issue resolved",
				trigger_key: `uk_ref_iss_${frm.doc.name}`,
			});
		}
	},

	ihs_refund_received_after_issue(frm) {
		if (frm.doc.ihs_refund_received_after_issue === "No") {
			prompt_uk_reminder(frm, {
				title: __("Expected IHS refund"),
				default_description: "UK — Expected IHS refund received (after issue resolved)",
				trigger_key: `uk_ihs_aft_iss_${frm.doc.name}`,
			});
		} else if (frm.doc.ihs_refund_received_after_issue === "Yes") {
			frappe.show_alert(
				{ message: __("Upload tuition fee refund invoice and close this case."), indicator: "blue" },
				5
			);
		}
	},

	application_closed(frm) {
		if (frm.doc.application_closed) {
			set_uk_stage(frm, "Closed");
			if (frm.doc.status !== "Closed") {
				frm.set_value("status", "Closed");
			}
		}
	},
});

// Child table handlers — keep in parent JS so they always load with Application UK
frappe.ui.form.on("Processing Agent Details", {
	processing_agent_type(frm, cdt, cdn) {
		sync_processing_agent_row(cdt, cdn);
	},
	our_company(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row || row.processing_agent_type !== "Direct") return;
		frappe.model.set_value(cdt, cdn, "processing_agent_direct", row.our_company || "");
	},
	processing_agent_vendor(frm, cdt, cdn) {
		sync_processing_agent_row(cdt, cdn);
	},
});
