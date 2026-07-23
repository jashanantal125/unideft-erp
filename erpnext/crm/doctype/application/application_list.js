// Copyright (c) 2025, Unideft and contributors
// For license information, please see license.txt

frappe.listview_settings['Application'] = {
	add_fields: ["application_type"],
	onload: function (listview) {
		listview.page.add_inner_button(__("Card View"), function () {
			frappe.set_route("applications_view");
		});

		listview.page.add_inner_button(__("Documents by Stage"), function () {
			const selected = listview.get_checked_items();
			if (!selected.length) {
				frappe.msgprint(__("Select one Application first."));
				return;
			}
			if (selected.length > 1) {
				frappe.msgprint(__("Select only one Application."));
				return;
			}

			const app_name = selected[0].name;
			frappe.call({
				method: "erpnext.crm.doctype.application.application.get_application_documents_by_stage",
				args: { name: app_name },
				freeze: true,
				callback(r) {
					const groups = r.message || {};
					const stages = Object.keys(groups);
					let html = "";
					if (!stages.length) {
						html = `<p class="text-muted">${__("No documents uploaded yet")}</p>`;
					} else {
						stages.forEach((stage) => {
							html += `<div style="margin-bottom:14px;">
								<div style="font-weight:600;margin-bottom:6px;">${frappe.utils.escape_html(stage)}</div>
								<ul style="margin:0 0 0 18px;padding:0;">`;
							(groups[stage] || []).forEach((file) => {
								const label = file.field_label
									? `${file.field_label}: ${file.file_name}`
									: file.file_name;
								html += `<li style="margin:4px 0;">
									<a href="${frappe.utils.escape_html(file.file_url)}" target="_blank" rel="noopener">
										${frappe.utils.escape_html(label)}
									</a>
								</li>`;
							});
							html += `</ul></div>`;
						});
					}

					const dialog = new frappe.ui.Dialog({
						title: __("Documents by Stage — {0}", [app_name]),
						size: "large",
						fields: [{ fieldtype: "HTML", fieldname: "docs_html" }],
					});
					dialog.fields_dict.docs_html.$wrapper.html(html);
					dialog.show();
				},
			});
		});
	},
};
