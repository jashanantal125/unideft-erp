// Copyright (c) 2026, Unideft and contributors
// For license information, please see license.txt

/**
 * Bulk "Actions" menu: hide unavailable workflow actions completely.
 *
 * Frappe's ListView.toggle_workflow_actions() shows/hides the element that
 * page.add_actions_menu_item() returned. When the list re-renders, that call
 * returns the existing item's inner label <span> instead of its <a>, so hiding
 * it left every unavailable action behind as an empty padded row - a block of
 * white space above Export for any user (e.g. an Agent) who has no workflow
 * actions on the selected records. Toggling the whole <li> fixes that.
 */
$(() => {
	const ListView = frappe.views && frappe.views.ListView;
	if (!ListView || ListView.prototype.__unideft_workflow_menu_fix) {
		return;
	}
	ListView.prototype.__unideft_workflow_menu_fix = true;

	ListView.prototype.toggle_workflow_actions = function () {
		if (!frappe.model.has_workflow(this.doctype)) return;

		const items = this.workflow_action_items || {};
		const row = ($item) => $item.closest("li");
		Object.values(items).forEach(($item) => row($item).hide());

		frappe
			.xcall("frappe.model.workflow.get_common_transition_actions", {
				docs: this.get_checked_items(),
				doctype: this.doctype,
			})
			.then((actions) => {
				Object.keys(items).forEach((key) => {
					const show = actions.includes(key);
					items[key].show();
					row(items[key]).find(".menu-item-label").show();
					row(items[key]).toggle(show);
				});
			});
	};
});

/**
 * Apps switcher: don't crash on pages outside the user's apps.
 *
 * set_current_app() falls back to the "frappe" app's data, but users without
 * access to it (Agents, CROs, Application Team) have no such entry in
 * frappe.boot.app_data_map. Opening a Core page such as their own User
 * record then threw "Cannot read properties of undefined (reading
 * 'app_logo_url')" in the form header, which aborted the form before any field
 * rendered - an empty page. Fall back to an app the user does have instead.
 */
$(() => {
	const Switcher = frappe.ui && frappe.ui.AppsSwitcher;
	if (!Switcher || Switcher.prototype.__unideft_safe_app) {
		return;
	}
	Switcher.prototype.__unideft_safe_app = true;

	const original = Switcher.prototype.set_current_app;
	Switcher.prototype.set_current_app = function (app) {
		const map = frappe.boot.app_data_map || {};
		if (app && !map[app] && !map.frappe) {
			app = frappe.current_app && map[frappe.current_app] ? frappe.current_app : Object.keys(map)[0];
			if (!app) {
				return;
			}
		}
		return original.call(this, app);
	};
});
