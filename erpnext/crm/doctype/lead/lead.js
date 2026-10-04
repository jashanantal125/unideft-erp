// Copyright (c) 2019, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

frappe.provide("erpnext");
if (this.frm) {
	this.frm.email_field = "email_id";
}
erpnext.LeadController = class LeadController extends frappe.ui.form.Controller {
	setup() {
		this.frm.make_methods = {
			Customer: this.make_customer.bind(this),
			Quotation: this.make_quotation.bind(this),
			Opportunity: this.make_opportunity.bind(this),
		};

		// For avoiding integration issues.
		this.frm.set_df_property("first_name", "reqd", true);
	}

	onload() {
		this.frm.set_query("lead_owner", function (doc, cdt, cdn) {
			return { query: "frappe.core.doctype.user.user.user_query" };
		});
		
		// Set lead_owner to current user if role is agents
		if (this.frm.is_new() && frappe.user.has_role("Agent")) {
			this.frm.set_value("lead_owner", frappe.session.user);
			// Make fields read-only for agents
			this.frm.set_df_property("lead_owner", "read_only", 1);
			this.frm.set_df_property("owner", "read_only", 1);
		}
		
		// Make owner field read-only for agents on existing records too
		if (!this.frm.is_new() && frappe.user.has_role("Agent")) {
			this.frm.set_df_property("owner", "read_only", 1);
		}
		
		// Hide Connections tab on load
		this.hide_connections_tab();
	}

	refresh() {
		var me = this;
		let doc = this.frm.doc;
		erpnext.toggle_naming_series();
		
		// Make lead_owner and owner read-only for agents
		if (frappe.user.has_role("Agent")) {
			this.frm.set_df_property("lead_owner", "read_only", 1);
			// Make owner field read-only for agents
			this.frm.set_df_property("owner", "read_only", 1);
			// Ensure lead_owner is set to current user for new records
			if (this.frm.is_new() && !doc.lead_owner) {
				this.frm.set_value("lead_owner", frappe.session.user);
			}
		}

		if (!this.frm.is_new() && doc.__onload && !doc.__onload.is_customer) {
			this.frm.add_custom_button(__("Customer"), this.make_customer.bind(this), __("Create"));
			this.frm.add_custom_button(__("Opportunity"), this.make_opportunity.bind(this), __("Create"));
			this.frm.add_custom_button(__("Quotation"), this.make_quotation.bind(this), __("Create"));
			if (!doc.__onload.linked_prospects.length) {
				this.frm.add_custom_button(__("Prospect"), this.make_prospect.bind(this), __("Create"));
				this.frm.add_custom_button(
					__("Add to Prospect"),
					() => {
						this.add_lead_to_prospect(this.frm);
					},
					__("Action")
				);
			}
		}

		if (!this.frm.is_new()) {
			frappe.contacts.render_address_and_contact(this.frm);
		} else {
			frappe.contacts.clear_address_and_contact(this.frm);
		}

		// Hide Connections tab for non-Administrator users
		this.hide_connections_tab();

		this.show_notes();
		this.show_activities();
	}

	hide_connections_tab() {
		// Hide Connections tab for all users using multiple methods
		
		// Method 1: Using layout tabs API
		if (this.frm.layout && this.frm.layout.tabs) {
			const connections_tab = this.frm.layout.tabs.find(tab => tab.df && tab.df.fieldname === "connections_tab");
			if (connections_tab) {
				connections_tab.toggle(false);
			}
		}
		
		// Method 2: Using DOM selectors with multiple attempts
		const hideConnections = () => {
			if (this.frm.wrapper) {
				// Hide by data-name attribute
				this.frm.wrapper.find('.nav-link[data-name="connections_tab"]').parent().hide();
				this.frm.wrapper.find('.tab-content[data-name="connections_tab"]').hide();
				
				// Hide by text content
				this.frm.wrapper.find('.form-tabs .nav-item a:contains("Connections")').parent().hide();
				this.frm.wrapper.find('.nav-item a:contains("Connections")').parent().hide();
				
				// Hide by class
				this.frm.wrapper.find('.nav-item[data-name="connections_tab"]').hide();
				
				// Hide using CSS
				this.frm.wrapper.find('[data-name="connections_tab"]').hide();
				
				// Additional selectors
				$('.nav-link[data-name="connections_tab"]').parent().hide();
				$('.tab-content[data-name="connections_tab"]').hide();
				$('.form-tabs .nav-item a:contains("Connections")').parent().hide();
			}
		};
		
		// Call immediately
		hideConnections();
		
		// Call after short delay
		setTimeout(hideConnections, 100);
		
		// Call after medium delay
		setTimeout(hideConnections, 300);
		
		// Call after longer delay for late-loading tabs
		setTimeout(hideConnections, 500);
		
		// Call after form is fully rendered
		setTimeout(hideConnections, 1000);
		
		// Use MutationObserver to catch dynamically added tabs
		if (this.frm.wrapper && this.frm.wrapper[0]) {
			const observer = new MutationObserver(() => {
				hideConnections();
			});
			
			observer.observe(this.frm.wrapper[0], {
				childList: true,
				subtree: true
			});
			
			// Store observer for cleanup if needed
			this._connections_observer = observer;
		}
	}

	add_lead_to_prospect(frm) {
		frappe.prompt(
			[
				{
					fieldname: "prospect",
					label: __("Prospect"),
					fieldtype: "Link",
					options: "Prospect",
					reqd: 1,
				},
			],
			function (data) {
				frappe.call({
					method: "erpnext.crm.doctype.lead.lead.add_lead_to_prospect",
					args: {
						lead: frm.doc.name,
						prospect: data.prospect,
					},
					callback: function (r) {
						if (!r.exc) {
							frm.reload_doc();
						}
					},
					freeze: true,
					freeze_message: __("Adding Lead to Prospect..."),
				});
			},
			__("Add Lead to Prospect"),
			__("Add")
		);
	}

	make_customer() {
		frappe.model.open_mapped_doc({
			method: "erpnext.crm.doctype.lead.lead.make_customer",
			frm: this.frm,
		});
	}

	make_quotation() {
		frappe.model.open_mapped_doc({
			method: "erpnext.crm.doctype.lead.lead.make_quotation",
			frm: this.frm,
		});
	}

	async make_opportunity() {
		const frm = this.frm;
		let existing_prospect = (
			await frappe.db.get_value(
				"Prospect Lead",
				{
					lead: frm.doc.name,
				},
				"name",
				null,
				"Prospect"
			)
		).message?.name;

		let fields = [];
		if (!existing_prospect) {
			fields.push(
				{
					label: "Create Prospect",
					fieldname: "create_prospect",
					fieldtype: "Check",
					default: 1,
				},
				{
					label: "Prospect Name",
					fieldname: "prospect_name",
					fieldtype: "Data",
					default: frm.doc.company_name,
					depends_on: "create_prospect",
					mandatory_depends_on: "create_prospect",
				}
			);
		}

		await frm.reload_doc();

		let existing_contact = (
			await frappe.db.get_value(
				"Contact",
				{
					first_name: frm.doc.first_name || frm.doc.lead_name,
					last_name: frm.doc.last_name,
				},
				"name"
			)
		).message?.name;

		if (!existing_contact) {
			fields.push({
				label: "Create Contact",
				fieldname: "create_contact",
				fieldtype: "Check",
				default: "1",
			});
		}

		if (fields.length) {
			const d = new frappe.ui.Dialog({
				title: __("Create Opportunity"),
				fields: fields,
				primary_action: function (data) {
					frappe.call({
						method: "create_prospect_and_contact",
						doc: frm.doc,
						args: {
							data: data,
						},
						freeze: true,
						callback: function (r) {
							if (!r.exc) {
								frappe.model.open_mapped_doc({
									method: "erpnext.crm.doctype.lead.lead.make_opportunity",
									frm: frm,
								});
							}
							d.hide();
						},
					});
				},
				primary_action_label: __("Create"),
			});
			d.show();
		} else {
			frappe.model.open_mapped_doc({
				method: "erpnext.crm.doctype.lead.lead.make_opportunity",
				frm: frm,
			});
		}
	}

	make_prospect() {
		const me = this;
		frappe.model.with_doctype("Prospect", function () {
			let prospect = frappe.model.get_new_doc("Prospect");
			prospect.company_name = me.frm.doc.company_name;
			prospect.no_of_employees = me.frm.doc.no_of_employees;
			prospect.industry = me.frm.doc.industry;
			prospect.market_segment = me.frm.doc.market_segment;
			prospect.territory = me.frm.doc.territory;
			prospect.fax = me.frm.doc.fax;
			prospect.website = me.frm.doc.website;
			prospect.prospect_owner = me.frm.doc.lead_owner;
			prospect.notes = me.frm.doc.notes;

			let leads_row = frappe.model.add_child(prospect, "leads");
			leads_row.lead = me.frm.doc.name;

			frappe.set_route("Form", "Prospect", prospect.name);
		});
	}

	company_name() {
		if (!this.frm.doc.lead_name) {
			this.frm.set_value("lead_name", this.frm.doc.company_name);
		}
	}

	show_notes() {
		if (this.frm.doc.docstatus == 1) return;

		const crm_notes = new erpnext.utils.CRMNotes({
			frm: this.frm,
			notes_wrapper: $(this.frm.fields_dict.notes_html.wrapper),
		});
		crm_notes.refresh();
	}

	show_activities() {
		if (this.frm.doc.docstatus == 1) return;

		const crm_activities = new erpnext.utils.CRMActivities({
			frm: this.frm,
			open_activities_wrapper: $(this.frm.fields_dict.open_activities_html.wrapper),
			all_activities_wrapper: $(this.frm.fields_dict.all_activities_html.wrapper),
			form_wrapper: $(this.frm.wrapper),
		});
		crm_activities.refresh();
	}
};
if (this.frm) {
	extend_cscript(this.frm.cscript, new erpnext.LeadController({ frm: this.frm }));
}
