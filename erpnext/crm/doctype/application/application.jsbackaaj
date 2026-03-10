// Copyright (c) 2025, Unideft and contributors
// For license information, please see license.txt

frappe.ui.form.on("Application", {
	onload: function(frm) {
		// Wait for form to be fully rendered
		$(frm.wrapper).one('render_complete', function() {
			setTimeout(() => {
				setup_wizard_mode(frm);
			}, 300);
		});
	},

	refresh(frm) {
<<<<<<< HEAD
		// Initialize wizard if not done yet - wait for render complete
		$(frm.wrapper).one('render_complete', function() {
			setTimeout(() => {
				if (!frm.wizard_setup_done) {
					setup_wizard_mode(frm);
				}
				// Update wizard controls
				if (frm.wizard_setup_done && frm.wizard) {
					update_wizard_controls(frm);
				}
			}, 300);
		});
=======
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
>>>>>>> jashanlatest

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
		if (frm.doc.defer_offer_required && !frm.doc.defer_offer_currency) {
			frm.set_value("defer_offer_currency", frm.doc.offer_currency || "AUD");
		}

		// Update all currency fields to use selected currency
		updateCurrencyFields(frm, false);
		updateFundsRequiredLabel(frm, false);
		if (frm.doc.defer_offer_required) {
			updateCurrencyFields(frm, true);
			updateFundsRequiredLabel(frm, true);
		}

		// Check and deactivate intake reminders if tuition fee is paid
		checkAndDeactivateIntakeReminder(frm);
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

	any_further_requirement_offer_letter(frm) {
		// Clear pending requirement fields when switching to No
		if (!frm.doc.any_further_requirement_offer_letter) {
			frm.set_value("pending_requirement_details", "");
			frm.set_value("pending_requirements_completed", "");
		}
	},

	pending_requirements_completed(frm) {
		// Clear supporting documents when switching to No
		if (!frm.doc.pending_requirements_completed) {
			frm.clear_table("supporting_documents");
			frm.refresh_field("supporting_documents");
		}
	},

	on_submit(frm) {
		// Create reminders when document is submitted/saved
		if (frm.doc.any_further_requirement_offer_letter) {
			createSubmittedTabReminders(frm);
		}
	},

	after_save(frm) {
		// Create reminders after document is saved
		if (frm.doc.any_further_requirement_offer_letter) {
			// Small delay to ensure document is fully saved
			setTimeout(function () {
				createSubmittedTabReminders(frm);
			}, 500);
		}

		// Create intake reminder if intake date is set
		if (frm.doc.university_intake) {
			createIntakeReminder(frm, frm.doc.university_intake, "Main Offer");
		}

		// Create defer intake reminder if defer intake date is set
		if (frm.doc.defer_offer_required && frm.doc.defer_university_intake) {
			createIntakeReminder(frm, frm.doc.defer_university_intake, "Defer Offer");
		}
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
			createIntakeReminder(frm, frm.doc.university_intake, "Main Offer");
		}
		calculateFundsRequired(frm, false);
	},

	defer_university_intake(frm) {
		if (frm.doc.defer_university_intake && frm.doc.defer_offer_required && frm.doc.name && !frm.doc.__islocal) {
			createIntakeReminder(frm, frm.doc.defer_university_intake, "Defer Offer");
		}
		calculateFundsRequired(frm, true);
	},

	defer_offer_required(frm) {
		// Auto-populate defer offer fields from main offer when defer is selected
		if (frm.doc.defer_offer_required) {
			// First populate from Details tab
			populateDeferOfferUniversityAndCourse(frm);

			// Set default currency if not set
			if (!frm.doc.defer_offer_currency) {
				frm.set_value("defer_offer_currency", frm.doc.offer_currency || "AUD");
			}

			// Then populate from main offer fields
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
			if (frm.doc.funds_required_type && !frm.doc.defer_funds_required_type) {
				frm.set_value("defer_funds_required_type", frm.doc.funds_required_type);
			}
			// Copy conditions from offer letter to defer offer letter (Table MultiSelect)
			if (frm.doc.conditions_on_offer_letter && frm.doc.conditions_on_offer_letter.length > 0 &&
				(!frm.doc.defer_conditions_on_offer_letter || frm.doc.defer_conditions_on_offer_letter.length === 0)) {
				// Extract condition values from source field
				const conditions = frm.doc.conditions_on_offer_letter.map(row => ({
					condition: row.condition
				}));
				frm.set_value("defer_conditions_on_offer_letter", conditions);
			}

			// Update currency fields
			updateCurrencyFields(frm, true);
		}
	},

	on_tab_change(frm) {
		// When Offer Letter tab is accessed, ensure currency is set
		const activeTab = frm.get_active_tab();
		if (activeTab && activeTab.df && activeTab.df.fieldname === "offer_tab") {
			// Ensure currency is set
			if (!frm.doc.offer_currency) {
				frm.set_value("offer_currency", "AUD");
			}
			// Update currency fields
			setTimeout(function () {
				updateCurrencyFields(frm, false);
				if (frm.doc.defer_offer_required) {
					updateCurrencyFields(frm, true);
				}
			}, 100);
		}
	},

	// Financials Tab handlers
	gs_submitted(frm) {
		if (!frm.doc.gs_submitted && frm.doc.gs_submitted_reminder_date) {
			// Set reminder when financials will be completed
			createGSReminder(frm, frm.doc.gs_submitted_reminder_date);
		}
	},

	gs_submitted_reminder_date(frm) {
		if (!frm.doc.gs_submitted && frm.doc.gs_submitted_reminder_date) {
			createGSReminder(frm, frm.doc.gs_submitted_reminder_date);
		}
	},

	interview_deadline_date(frm) {
		if (frm.doc.interview_deadline_date && frm.doc.interview_timing === "Before GS Approval") {
			createInterviewDeadlineReminder(frm, frm.doc.interview_deadline_date);
		}
	},

	interview_timing(frm) {
		// Clear interview fields when timing changes
		if (frm.doc.interview_timing !== "Before GS Approval") {
			frm.set_value("interview_deadline_date", "");
			frm.set_value("student_prepare", "");
			frm.set_value("schedule_interview", "");
		}
	},

	student_prepare(frm) {
		if (!frm.doc.student_prepare) {
			// Set reminder to prepare student
			createOfferLetterReminder(frm, "Prepare student");
		}
	},

	schedule_interview(frm) {
		if (frm.doc.schedule_interview) {
			// Set reminder for interview date (you may want to add an interview date field)
			createOfferLetterReminder(frm, "Prepare student strongly - Interview scheduled");
		} else if (!frm.doc.schedule_interview) {
			createOfferLetterReminder(frm, "Prepare student - Follow up interview schedule");
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

<<<<<<< HEAD
// ==================== Multi-Step Wizard Functions ====================

function setup_wizard_mode(frm) {
	// Debug logging
	console.log("Wizard: setup_wizard_mode called");
	
	// Method 1: Try to get tabs from layout
	let tabs_from_layout = [];
	if (frm.layout && frm.layout.tabs && frm.layout.tabs.length > 0) {
		tabs_from_layout = frm.layout.tabs;
		console.log("Wizard: Found tabs from layout:", tabs_from_layout.length);
	}
	
	// Method 2: Get tabs from DOM (more reliable)
	const tab_links = frm.wrapper.find('.form-tabs .nav-link');
	const tab_panes = frm.wrapper.find('.tab-content .tab-pane');
	
	console.log("Wizard: Tab links in DOM:", tab_links.length);
	console.log("Wizard: Tab panes in DOM:", tab_panes.length);
	
	// If no tabs found, wait a bit more
	if (tab_links.length === 0 && tabs_from_layout.length === 0) {
		console.log("Wizard: No tabs found, retrying...");
		setTimeout(() => setup_wizard_mode(frm), 500);
		return;
	}
	
	// Use layout tabs if available, otherwise build from DOM
	let all_tabs = [];
	
	if (tabs_from_layout.length > 0) {
		// Use layout tabs
		all_tabs = tabs_from_layout.filter(tab => {
			const is_hidden = tab.hidden || (typeof tab.is_hidden === 'function' && tab.is_hidden());
			return !is_hidden;
		});
	} else {
		// Build tabs from DOM
		tab_links.each(function(index) {
			const $link = $(this);
			const tab_id = $link.attr('href') || $link.attr('data-fieldname') || '';
			const $pane = tab_panes.eq(index);
			
			if ($link.is(':visible') && $pane.length) {
				all_tabs.push({
					tab_link: $link.parent(),
					wrapper: $pane,
					df: {
						fieldname: $link.attr('data-fieldname') || tab_id.replace('#', ''),
						label: $link.text().trim()
					},
					label: $link.text().trim(),
					set_active: function() {
						$link.tab('show');
=======
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

// Helper function to create reminders for Submitted tab
function createSubmittedTabReminders(frm) {
	// Check if reminder already exists to avoid duplicates
	// We'll create reminder only if conditions are met

	if (!frm.doc.any_further_requirement_offer_letter) {
		// Set reminder: Follow up on Offer Letter
		createOfferLetterReminder(frm, "Follow up on Offer Letter");
	} else if (frm.doc.any_further_requirement_offer_letter) {
		if (frm.doc.pending_requirements_completed) {
			// Set reminder: Follow up on Offer Letter
			createOfferLetterReminder(frm, "Follow up on Offer Letter");
		} else if (!frm.doc.pending_requirements_completed) {
			// Set reminder: To Complete Pending requirements
			createOfferLetterReminder(frm, "To Complete Pending requirements");
		}
	}
}

// Helper function to create offer letter reminder
function createOfferLetterReminder(frm, description) {
	// Set reminder for 3 days from now (you can adjust this)
	const remindDate = new Date();
	remindDate.setDate(remindDate.getDate() + 3);

	// Format: YYYY-MM-DD HH:mm:ss (Frappe datetime format)
	const remindAt = frappe.datetime.obj_to_str(remindDate).replace('T', ' ') + ':00';

	// Check if reminder already exists for this description (only if document is saved)
	if (frm.doc.name && !frm.doc.__islocal) {
		frappe.db.get_list("Reminder", {
			filters: {
				reminder_doctype: "Application",
				reminder_docname: frm.doc.name,
				description: description
			},
			limit: 1
		}).then(function (existingReminders) {
			// Only create if it doesn't exist
			if (existingReminders.length === 0) {
				frappe.call({
					method: 'frappe.automation.doctype.reminder.reminder.create_new_reminder',
					args: {
						remind_at: remindAt,
						description: description,
						reminder_doctype: 'Application',
						reminder_docname: frm.doc.name
					},
					callback: function (response) {
						if (response.message) {
							frappe.show_alert({
								message: 'Reminder set: ' + description,
								indicator: 'green'
							}, 3);
						}
					},
					error: function (err) {
						console.error('Error creating reminder:', err);
>>>>>>> jashanlatest
					}
				});
			}
		});
<<<<<<< HEAD
	}
	
	console.log("Wizard: Total visible tabs:", all_tabs.length);
	
	if (all_tabs.length <= 1) {
		console.log("Wizard: Only one or no visible tabs found, wizard not needed");
		return;
	}

	frm.wizard_setup_done = true;
	console.log("Wizard: Setting up wizard with", all_tabs.length, "tabs");

	// Initialize wizard state
	frm.wizard = {
		tabs: all_tabs,
		current_step: 0,
		total_steps: all_tabs.length
	};

	// Hide all tabs initially
	frm.wizard.tabs.forEach((tab, index) => {
		console.log(`Wizard: Hiding tab ${index + 1}:`, tab.df?.fieldname || tab.label);
		if (tab.tab_link) {
			tab.tab_link.hide();
		}
		if (tab.wrapper) {
			tab.wrapper.hide();
		}
		// Also hide using jQuery selectors as backup
		if (tab.df && tab.df.fieldname) {
			$(`.nav-link[data-fieldname="${tab.df.fieldname}"]`).parent().hide();
			$(`.tab-pane[data-name="${tab.df.fieldname}"], .tab-pane[id*="${tab.df.fieldname}"]`).hide();
		}
	});

	// Show first tab
	console.log("Wizard: Showing first tab");
	show_wizard_step(frm, 0);

	// Disable tab clicking
	setTimeout(() => {
		disable_direct_tab_navigation(frm);
	}, 100);

	// Add navigation buttons
	add_wizard_navigation(frm);

	// Add progress bar
	add_wizard_progress(frm);
	
	// Add manual trigger button for testing (remove in production)
	if (frappe.boot.developer_mode) {
		frm.add_custom_button(__('Debug: Reinit Wizard'), function() {
			console.log("Wizard: Manual reinit triggered");
			frm.wizard_setup_done = false;
			setup_wizard_mode(frm);
		});
	}
	
	console.log("Wizard: Setup complete!");
}

// Global function for manual testing (can be called from browser console)
window.test_wizard = function() {
	const frm = cur_frm;
	if (!frm) {
		console.error("No form found. Please open an Application form first.");
		return;
	}
	console.log("Wizard: Manual test triggered");
	frm.wizard_setup_done = false;
	setup_wizard_mode(frm);
};

function show_wizard_step(frm, step_index) {
	if (!frm.wizard || step_index < 0 || step_index >= frm.wizard.tabs.length) {
		console.log("Wizard: Invalid step index:", step_index);
		return;
	}

	// Hide current tab
	const current_tab = frm.wizard.tabs[frm.wizard.current_step];
	if (current_tab) {
		if (current_tab.wrapper && current_tab.wrapper.length) {
			current_tab.wrapper.hide().removeClass('show active');
		}
		if (current_tab.tab_link && current_tab.tab_link.length) {
			current_tab.tab_link.find('.nav-link').removeClass('active');
		}
		// Also hide using jQuery selectors
		if (current_tab.df && current_tab.df.fieldname) {
			frm.wrapper.find(`.tab-pane[data-name="${current_tab.df.fieldname}"], .tab-pane[id*="${current_tab.df.fieldname}"]`).hide().removeClass('show active');
		}
	}

	// Show new tab
	frm.wizard.current_step = step_index;
	const tab = frm.wizard.tabs[step_index];
	
	console.log("Wizard: Showing step", step_index + 1, "Tab:", tab.df?.fieldname || tab.label);
	
	if (tab.wrapper && tab.wrapper.length) {
		tab.wrapper.show().addClass('show active');
	}
	// Also show using jQuery selectors
	if (tab.df && tab.df.fieldname) {
		frm.wrapper.find(`.tab-pane[data-name="${tab.df.fieldname}"], .tab-pane[id*="${tab.df.fieldname}"]`).show().addClass('show active');
	}
	
	// Activate tab link
	if (tab.tab_link && tab.tab_link.length) {
		tab.tab_link.find('.nav-link').addClass('active').tab('show');
	}
	
	// Use set_active if available
	if (typeof tab.set_active === 'function') {
		tab.set_active();
	}
	
	update_wizard_controls(frm);
	
	// Scroll to top
	setTimeout(() => {
		$('.form-page, .form-layout').scrollTop(0);
		window.scrollTo(0, 0);
	}, 100);
}

function disable_direct_tab_navigation(frm) {
	// Use a more specific selector and ensure it runs after tabs are rendered
	setTimeout(() => {
		// Disable all tab links
		$('.form-tabs-list .nav-link, .nav-tabs .nav-link').off('click.wizard').on('click.wizard', function(e) {
			e.preventDefault();
			e.stopImmediatePropagation();
			e.stopPropagation();
			frappe.show_alert({
				message: __('Please use Next/Previous buttons to navigate through steps'),
				indicator: 'orange'
			}, 3);
			return false;
		});
		
		// Also prevent tab switching via Bootstrap tab events
		$('.form-tabs-list, .nav-tabs').off('shown.bs.tab.wizard').on('shown.bs.tab.wizard', function(e) {
			if (!frm.wizard || !frm.wizard_setup_done) return;
			// Find which tab was clicked
			const clicked_tab = $(e.target).closest('.nav-link');
			const tab_fieldname = clicked_tab.attr('data-fieldname') || clicked_tab.attr('href')?.replace('#', '');
			
			// Check if this is the current wizard step
			const current_tab = frm.wizard.tabs[frm.wizard.current_step];
			if (current_tab && current_tab.df && current_tab.df.fieldname !== tab_fieldname) {
				e.preventDefault();
				e.stopImmediatePropagation();
				// Restore to current wizard step
				show_wizard_step(frm, frm.wizard.current_step);
			}
		});
		
		console.log("Wizard: Tab navigation disabled");
	}, 500);
}

function add_wizard_navigation(frm) {
	// Remove existing navigation if any
	$('.wizard-nav-container').remove();

	if (!frm.wizard) return;

	const nav_html = $(`
		<div class="wizard-nav-container" style="
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 15px 20px;
			background: var(--bg-color);
			border-top: 1px solid var(--border-color);
			margin-top: 20px;
		">
			<button class="btn btn-secondary wizard-prev-btn" type="button">
				<i class="fa fa-arrow-left"></i> ${__('Previous')}
			</button>
			<div class="wizard-step-info" style="font-weight: 500; color: var(--text-color);">
				Step <span class="current-step">1</span> of <span class="total-steps">${frm.wizard.total_steps}</span>
			</div>
			<div>
				<button class="btn btn-primary wizard-next-btn" type="button">
					${__('Next')} <i class="fa fa-arrow-right"></i>
				</button>
				<button class="btn btn-primary wizard-save-btn" type="button" style="display: none;">
					<i class="fa fa-save"></i> ${__('Save')}
				</button>
			</div>
		</div>
	`);

	// Insert before form footer
	const form_footer = frm.page.wrapper.find('.form-footer');
	if (form_footer.length) {
		form_footer.before(nav_html);
	} else {
		frm.page.wrapper.append(nav_html);
	}

	// Bind events
	nav_html.find('.wizard-prev-btn').on('click', () => {
		if (frm.wizard && frm.wizard.current_step > 0) {
			show_wizard_step(frm, frm.wizard.current_step - 1);
		}
	});

	nav_html.find('.wizard-next-btn').on('click', () => {
		if (validate_current_step(frm)) {
			if (frm.wizard && frm.wizard.current_step < frm.wizard.total_steps - 1) {
				show_wizard_step(frm, frm.wizard.current_step + 1);
			}
		}
	});

	nav_html.find('.wizard-save-btn').on('click', () => {
		frm.save().then(() => {
			frappe.show_alert({
				message: __('Document saved successfully'),
				indicator: 'green'
			}, 3);
		});
	});
}

function add_wizard_progress(frm) {
	$('.wizard-progress-container').remove();

	if (!frm.wizard) return;

	const progress_html = $(`
		<div class="wizard-progress-container" style="
			padding: 15px 20px;
			background: var(--bg-color);
			border-bottom: 1px solid var(--border-color);
			position: relative;
			z-index: 10;
		">
			<div class="wizard-progress-bar" style="
				height: 8px;
				background: var(--border-color);
				border-radius: 4px;
				overflow: hidden;
				position: relative;
			">
				<div class="wizard-progress-fill" style="
					height: 100%;
					background: linear-gradient(90deg, var(--primary), var(--primary-dark, var(--primary)));
					transition: width 0.4s ease;
					width: ${((frm.wizard.current_step + 1) / frm.wizard.total_steps) * 100}%;
					border-radius: 4px;
				"></div>
			</div>
		</div>
	`);

	// Try multiple insertion points
	const form_header = frm.page.wrapper.find('.form-header');
	const page_head = frm.page.wrapper.find('.page-head');
	const form_layout = frm.page.wrapper.find('.form-layout');
	
	if (form_header.length) {
		form_header.after(progress_html);
	} else if (page_head.length) {
		page_head.after(progress_html);
	} else if (form_layout.length) {
		form_layout.prepend(progress_html);
	} else {
		frm.page.wrapper.prepend(progress_html);
	}
	
	console.log("Wizard: Progress bar added");
}

function update_wizard_controls(frm) {
	if (!frm.wizard) return;

	const current = frm.wizard.current_step;
	const total = frm.wizard.total_steps;

	// Update step info
	$('.current-step').text(current + 1);
	$('.total-steps').text(total);

	// Update progress bar
	const percentage = ((current + 1) / total) * 100;
	$('.wizard-progress-fill').css('width', percentage + '%');

	// Update buttons
	const prev_btn = $('.wizard-prev-btn');
	const next_btn = $('.wizard-next-btn');
	const save_btn = $('.wizard-save-btn');

	if (current === 0) {
		prev_btn.prop('disabled', true).addClass('disabled');
	} else {
		prev_btn.prop('disabled', false).removeClass('disabled');
	}

	if (current === total - 1) {
		next_btn.hide();
		save_btn.show();
	} else {
		next_btn.show();
		save_btn.hide();
	}
}

function validate_current_step(frm) {
	if (!frm.wizard) return true;

	const current_tab = frm.wizard.tabs[frm.wizard.current_step];
	if (!current_tab) return true;

	// Get all fields in current tab
	const tab_fieldname = current_tab.df.fieldname;
	let fields_in_tab = [];
	let current_tab_found = false;

	// Find fields belonging to current tab
	frm.layout.fields.forEach(field => {
		if (field.fieldtype === 'Tab Break') {
			if (field.fieldname === tab_fieldname) {
				current_tab_found = true;
			} else {
				current_tab_found = false;
			}
		} else if (current_tab_found && field.fieldtype !== 'Section Break' && field.fieldtype !== 'Column Break') {
			fields_in_tab.push(field);
		}
	});

	// Validate required fields
	let missing_fields = [];
	fields_in_tab.forEach(field => {
		if (field.reqd && !frm.doc[field.fieldname]) {
			missing_fields.push(field.label || field.fieldname);
		}
	});

	if (missing_fields.length > 0) {
		frappe.msgprint({
			title: __('Required Fields Missing'),
			message: __('Please fill the following required fields:') + '<br><br>' + 
				missing_fields.map(f => `• ${f}`).join('<br>'),
			indicator: 'orange'
		});
		return false;
	}

	return true;
=======
	} else {
		// For new documents, create reminder after save
		// Store in a flag to create after document is saved
		frm.reminder_to_create = {
			remind_at: remindAt,
			description: description
		};
	}
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

	let fundsRequired = 0;

	// Start with base expenses
	fundsRequired = fullYearTuitionFee + oshc + livingExpenses + travelExpenses;

	if (fundsType) {
		// Add Spouse expenses if selected AND applicable
		const spouseApplicable = frm.doc.martial_status === 'Married' &&
			frm.doc.case_4_proceed_above_1_year === 'with Spouse';

		if (fundsType.includes("With spouse") && spouseApplicable) {
			fundsRequired += livingExpSpouse + travelExpSpouse;
		}

		// Add Kid expenses if selected AND applicable
		const kidApplicable = isDefer ? frm.doc.defer_process_with_kids : frm.doc.process_with_kids;

		if (fundsType.includes("Kid") && kidApplicable) {
			fundsRequired += (livingExpKidUnit * noOfKids) + (travelExpKidUnit * noOfKids);
		}

		// Deduct Payable Fee if "Without Full Year fee" is selected
		if (fundsType.includes("Without Full Year fee")) {
			fundsRequired -= payableFee;
		}
	}

	const amountField = prefix + "funds_required_amount";
	if (fundsRequired > 0) {
		frm.set_value(amountField, fundsRequired);
	} else {
		frm.set_value(amountField, 0);
	}

	// Ensure the funds_required_amount field uses the correct currency
	const currencyField = prefix + "offer_currency";
	if (frm.fields_dict[amountField] && frm.doc[currencyField]) {
		frm.set_df_property(amountField, "options", currencyField);
		// Update label with currency code
		updateFundsRequiredLabel(frm, isDefer);
		frm.refresh_field(amountField);
	}
}

// Helper function to create intake reminder
function createIntakeReminder(frm, intakeDate, offerType) {
	if (!intakeDate || !frm.doc.name || frm.doc.__islocal) {
		return;
	}

	// Set reminder for intake date (same day as intake)
	const remindDate = new Date(intakeDate);
	remindDate.setHours(9, 0, 0, 0); // Set to 9 AM on intake date

	// Format: YYYY-MM-DD HH:mm:ss
	const remindAt = frappe.datetime.obj_to_str(remindDate).replace('T', ' ') + ':00';

	const description = "Decide deadline for deposit - " + offerType;

	// Check if reminder already exists
	frappe.db.get_list("Reminder", {
		filters: {
			reminder_doctype: "Application",
			reminder_docname: frm.doc.name,
			description: description
		},
		limit: 1
	}).then(function (existingReminders) {
		// Only create if it doesn't exist
		if (existingReminders.length === 0) {
			frappe.call({
				method: 'frappe.automation.doctype.reminder.reminder.create_new_reminder',
				args: {
					remind_at: remindAt,
					description: description,
					reminder_doctype: 'Application',
					reminder_docname: frm.doc.name
				},
				callback: function (response) {
					if (response.message) {
						frappe.show_alert({
							message: 'Intake reminder set: ' + description,
							indicator: 'green'
						}, 3);
					}
				},
				error: function (err) {
					console.error('Error creating intake reminder:', err);
				}
			});
		}
	});
}

// Function to check and deactivate intake reminder when tuition fee is paid
function checkAndDeactivateIntakeReminder(frm) {
	// This should be called when tuition fee payment is recorded
	// For now, we'll check on form refresh if there's a tuition fee payment field
	// You may need to add a field to track tuition fee payment status

	if (frm.doc.name && !frm.doc.__islocal) {
		// Check if tuition fee is paid (you'll need to add this field or logic)
		// For now, this is a placeholder - you may need to add a field like "tuition_fee_paid" or check payment status

		// Find and cancel pending intake reminders
		frappe.db.get_list("Reminder", {
			filters: {
				reminder_doctype: "Application",
				reminder_docname: frm.doc.name,
				description: ["like", "Decide deadline for deposit%"],
				notified: 0
			}
		}).then(function (reminders) {
			// If tuition fee is paid, cancel the reminders
			// You'll need to implement the logic to check if tuition fee is paid
			// For example: if (frm.doc.tuition_fee_paid === 1) { ... }
		});
	}
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

// Helper function to create GS reminder
function createGSReminder(frm, reminderDate) {
	if (!reminderDate || !frm.doc.name || frm.doc.__islocal) {
		return;
	}

	const remindDate = new Date(reminderDate);
	remindDate.setHours(9, 0, 0, 0);

	const remindAt = frappe.datetime.obj_to_str(remindDate).replace('T', ' ') + ':00';
	const description = "When financials will be completed";

	frappe.db.get_list("Reminder", {
		filters: {
			reminder_doctype: "Application",
			reminder_docname: frm.doc.name,
			description: description
		},
		limit: 1
	}).then(function (existingReminders) {
		if (existingReminders.length === 0) {
			frappe.call({
				method: 'frappe.automation.doctype.reminder.reminder.create_new_reminder',
				args: {
					remind_at: remindAt,
					description: description,
					reminder_doctype: 'Application',
					reminder_docname: frm.doc.name
				},
				callback: function (response) {
					if (response.message) {
						frappe.show_alert({
							message: 'Reminder set: ' + description,
							indicator: 'green'
						}, 3);
					}
				}
			});
		}
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
		if (!frm.doc.tuition_fee_paid) {
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
		if (frm.doc.interview_deadline && frm.doc.interview_stage_available) {
			createGSReminder(frm, frm.doc.interview_deadline, "Interview Deadline - " + frappe.datetime.str_to_user(frm.doc.interview_deadline));
		}
		frm.refresh();
	},

	student_prepare(frm) {
		if (!frm.doc.student_prepare && frm.doc.interview_stage_available) {
			createGSReminder(frm, null, "Prepare Student for Interview");
		}
		frm.refresh();
	},

	schedule_interview(frm) {
		if (!frm.doc.schedule_interview && frm.doc.interview_stage_available) {
			createGSReminder(frm, null, "Follow Up Interview Schedule");
		}
		if (frm.doc.schedule_interview && frm.doc.interview_deadline) {
			createGSReminder(frm, frm.doc.interview_deadline, "Interview Date - " + frappe.datetime.str_to_user(frm.doc.interview_deadline));
		}
		frm.refresh();
	},

	gs_any_requirement(frm) {
		if (!frm.doc.gs_any_requirement && !frm.doc.gs_approved_check) {
			createGSReminder(frm, null, "Waiting for GS Approved");
		}
		frm.refresh();
	},

	requirements_completed(frm) {
		if (!frm.doc.requirements_completed && frm.doc.gs_any_requirement && !frm.doc.gs_approved_check) {
			createGSReminder(frm, null, "Requirement Completion Pending");
		}
		if (frm.doc.requirements_completed && frm.doc.gs_any_requirement && !frm.doc.gs_approved_check) {
			createGSReminder(frm, null, "Waiting for GS Approved After Requirements Completion");
		}
		frm.refresh();
	}
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
	if (!frm.doc.name || frm.doc.__islocal) {
		return;
	}

	let remindDate;
	if (specificDate) {
		remindDate = new Date(specificDate);
		remindDate.setHours(9, 0, 0, 0);
	} else {
		remindDate = new Date();
		remindDate.setDate(remindDate.getDate() + 3);
		remindDate.setHours(9, 0, 0, 0);
	}

	const remindAt = frappe.datetime.obj_to_str(remindDate).replace('T', ' ') + ':00';

	frappe.db.get_list("Reminder", {
		filters: {
			reminder_doctype: "Application",
			reminder_docname: frm.doc.name,
			description: description
		},
		limit: 1
	}).then(function (existingReminders) {
		if (existingReminders.length === 0) {
			frappe.call({
				method: 'frappe.automation.doctype.reminder.reminder.create_new_reminder',
				args: {
					remind_at: remindAt,
					description: description,
					reminder_doctype: 'Application',
					reminder_docname: frm.doc.name
				},
				callback: function (response) {
					if (response.message) {
						frappe.show_alert({
							message: 'Reminder set: ' + description,
							indicator: 'green'
						}, 3);
					}
				}
			});
		}
	});
}

// Helper function to create College Change reminder
function createCollegeChangeReminder(frm, specificDate, description) {
	if (!frm.doc.name || frm.doc.__islocal) {
		return;
	}

	let remindDate;
	if (specificDate) {
		remindDate = new Date(specificDate);
		remindDate.setHours(9, 0, 0, 0);
	} else {
		remindDate = new Date();
		remindDate.setDate(remindDate.getDate() + 1);
		remindDate.setHours(9, 0, 0, 0);
	}

	const remindAt = frappe.datetime.obj_to_str(remindDate).replace('T', ' ') + ':00';

	frappe.db.get_list("Reminder", {
		filters: {
			reminder_doctype: "Application",
			reminder_docname: frm.doc.name,
			description: description
		},
		limit: 1
	}).then(function (existingReminders) {
		if (existingReminders.length === 0) {
			frappe.call({
				method: 'frappe.automation.doctype.reminder.reminder.create_new_reminder',
				args: {
					remind_at: remindAt,
					description: description,
					reminder_doctype: 'Application',
					reminder_docname: frm.doc.name
				},
				callback: function (response) {
					if (response.message) {
						frappe.show_alert({
							message: 'Reminder set: ' + description,
							indicator: 'blue'
						}, 3);
					}
				}
			});
		}
	});
}

// Helper function to create Visa reminder
function createVisaReminder(frm, specificDate, description) {
	if (!frm.doc.name || frm.doc.__islocal) {
		return;
	}

	let remindDate;
	if (specificDate) {
		remindDate = new Date(specificDate);
		remindDate.setHours(9, 0, 0, 0);
	} else {
		remindDate = new Date();
		remindDate.setDate(remindDate.getDate() + 1);
		remindDate.setHours(9, 0, 0, 0);
	}

	const remindAt = frappe.datetime.obj_to_str(remindDate).replace('T', ' ') + ':00';

	frappe.db.get_list("Reminder", {
		filters: {
			reminder_doctype: "Application",
			reminder_docname: frm.doc.name,
			description: description
		},
		limit: 1
	}).then(function (existingReminders) {
		if (existingReminders.length === 0) {
			frappe.call({
				method: 'frappe.automation.doctype.reminder.reminder.create_new_reminder',
				args: {
					remind_at: remindAt,
					description: description,
					reminder_doctype: 'Application',
					reminder_docname: frm.doc.name
				},
				callback: function (response) {
					if (response.message) {
						frappe.show_alert({
							message: 'Reminder set: ' + description,
							indicator: 'blue'
						}, 3);
					}
				}
			});
		}
	});
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
	if (!frm.doc.name || frm.doc.__islocal) {
		return;
	}

	let remindDate;
	if (specificDate) {
		remindDate = new Date(specificDate);
		remindDate.setHours(9, 0, 0, 0);
	} else {
		remindDate = new Date();
		remindDate.setDate(remindDate.getDate() + 1);
		remindDate.setHours(9, 0, 0, 0);
	}

	const remindAt = frappe.datetime.obj_to_str(remindDate).replace('T', ' ') + ':00';

	frappe.db.get_list("Reminder", {
		filters: {
			reminder_doctype: "Application",
			reminder_docname: frm.doc.name,
			description: description
		},
		limit: 1
	}).then(function (existingReminders) {
		if (existingReminders.length === 0) {
			frappe.call({
				method: 'frappe.automation.doctype.reminder.reminder.create_new_reminder',
				args: {
					remind_at: remindAt,
					description: description,
					reminder_doctype: 'Application',
					reminder_docname: frm.doc.name
				},
				callback: function (response) {
					if (response.message) {
						frappe.show_alert({
							message: 'Reminder set: ' + description,
							indicator: 'green'
						}, 3);
					}
				}
			});
		}
	});
}

// Helper function to create Acceptance reminder
function createAcceptanceReminder(frm, specificDate, description) {
	if (!frm.doc.name || frm.doc.__islocal) {
		return;
	}

	let remindDate;
	if (specificDate) {
		remindDate = new Date(specificDate);
		remindDate.setHours(9, 0, 0, 0);
	} else {
		remindDate = new Date();
		remindDate.setDate(remindDate.getDate() + 1);
		remindDate.setHours(9, 0, 0, 0);
	}

	const remindAt = frappe.datetime.obj_to_str(remindDate).replace('T', ' ') + ':00';

	frappe.db.get_list("Reminder", {
		filters: {
			reminder_doctype: "Application",
			reminder_docname: frm.doc.name,
			description: description
		},
		limit: 1
	}).then(function (existingReminders) {
		if (existingReminders.length === 0) {
			frappe.call({
				method: 'frappe.automation.doctype.reminder.reminder.create_new_reminder',
				args: {
					remind_at: remindAt,
					description: description,
					reminder_doctype: 'Application',
					reminder_docname: frm.doc.name
				},
				callback: function (response) {
					if (response.message) {
						frappe.show_alert({
							message: 'Reminder set: ' + description,
							indicator: 'purple'
						}, 3);
					}
				}
			});
		}
	});
}

// Helper function to create GS Processing reminder
function createGSReminder(frm, specificDate, description) {
	if (!frm.doc.name || frm.doc.__islocal) {
		return;
	}

	let remindDate;
	if (specificDate) {
		remindDate = new Date(specificDate);
		remindDate.setHours(9, 0, 0, 0);
	} else {
		remindDate = new Date();
		remindDate.setDate(remindDate.getDate() + 1);
		remindDate.setHours(9, 0, 0, 0);
	}

	const remindAt = frappe.datetime.obj_to_str(remindDate).replace('T', ' ') + ':00';

	frappe.db.get_list("Reminder", {
		filters: {
			reminder_doctype: "Application",
			reminder_docname: frm.doc.name,
			description: description
		},
		limit: 1
	}).then(function (existingReminders) {
		if (existingReminders.length === 0) {
			frappe.call({
				method: 'frappe.automation.doctype.reminder.reminder.create_new_reminder',
				args: {
					remind_at: remindAt,
					description: description,
					reminder_doctype: 'Application',
					reminder_docname: frm.doc.name
				},
				callback: function (response) {
					if (response.message) {
						frappe.show_alert({
							message: 'Reminder set: ' + description,
							indicator: 'orange'
						}, 3);
					}
				}
			});
		}
	});
}

// Helper function to create Types of Funds reminder
function createTypesOfFundsReminder(frm, description) {
	if (!frm.doc.name || frm.doc.__islocal) {
		return;
	}

	const remindDate = new Date();
	remindDate.setDate(remindDate.getDate() + 1);
	remindDate.setHours(9, 0, 0, 0);

	const remindAt = frappe.datetime.obj_to_str(remindDate).replace('T', ' ') + ':00';

	frappe.db.get_list("Reminder", {
		filters: {
			reminder_doctype: "Application",
			reminder_docname: frm.doc.name,
			description: description
		},
		limit: 1
	}).then(function (existingReminders) {
		if (existingReminders.length === 0) {
			frappe.call({
				method: 'frappe.automation.doctype.reminder.reminder.create_new_reminder',
				args: {
					remind_at: remindAt,
					description: description,
					reminder_doctype: 'Application',
					reminder_docname: frm.doc.name
				},
				callback: function (response) {
					if (response.message) {
						frappe.show_alert({
							message: 'Reminder set: ' + description,
							indicator: 'blue'
						}, 3);
					}
				}
			});
		}
	});
}

// Helper function to create interview deadline reminder
function createInterviewDeadlineReminder(frm, deadlineDate) {
	if (!deadlineDate || !frm.doc.name || frm.doc.__islocal) {
		return;
	}

	const remindDate = new Date(deadlineDate);
	remindDate.setHours(9, 0, 0, 0);

	const remindAt = frappe.datetime.obj_to_str(remindDate).replace('T', ' ') + ':00';
	const description = "Interview deadline - " + frappe.datetime.str_to_user(deadlineDate);

	frappe.db.get_list("Reminder", {
		filters: {
			reminder_doctype: "Application",
			reminder_docname: frm.doc.name,
			description: description
		},
		limit: 1
	}).then(function (existingReminders) {
		if (existingReminders.length === 0) {
			frappe.call({
				method: 'frappe.automation.doctype.reminder.reminder.create_new_reminder',
				args: {
					remind_at: remindAt,
					description: description,
					reminder_doctype: 'Application',
					reminder_docname: frm.doc.name
				},
				callback: function (response) {
					if (response.message) {
						frappe.show_alert({
							message: 'Interview deadline reminder set',
							indicator: 'green'
						}, 3);
					}
				}
			});
		}
	});
>>>>>>> jashanlatest
}
