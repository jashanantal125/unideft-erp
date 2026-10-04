// Copyright (c) 2026, Unideft and contributors
// For license information, please see license.txt

// Only Administrator sees the full User form. Everyone else gets User
// Details, More Information, and the Settings tab cut down to Change Password.
const UNIDEFT_ADMIN_ONLY_USER_TABS = ["roles_permissions_tab", "connections_tab", "sessions_tab"];
const UNIDEFT_PASSWORD_TAB = "settings_tab";
const UNIDEFT_PASSWORD_SECTION = "change_password";

function unideft_settings_sections(frm) {
	// Section Breaks that sit inside the Settings tab, in display order.
	const sections = [];
	let inside = false;
	(frm.meta.fields || []).forEach((df) => {
		if (df.fieldtype === "Tab Break") {
			inside = df.fieldname === UNIDEFT_PASSWORD_TAB;
		} else if (inside && df.fieldtype === "Section Break") {
			sections.push(df.fieldname);
		}
	});
	return sections;
}

function unideft_limit_user_tabs(frm) {
	if (frappe.session.user === "Administrator") {
		return;
	}
	// Tab Breaks are not in fields_dict. Hide them on the per-document docfield
	// (which the layout re-reads on every refresh) and on the live tab objects.
	UNIDEFT_ADMIN_ONLY_USER_TABS.forEach((fieldname) => {
		const df = frappe.meta.get_docfield("User", fieldname, frm.doc.name);
		if (df) {
			df.hidden = 1;
		}
	});

	const tabs = (frm.layout && frm.layout.tabs) || [];
	tabs.forEach((tab) => {
		if (UNIDEFT_ADMIN_ONLY_USER_TABS.includes(tab.df.fieldname)) {
			tab.df.hidden = 1;
			tab.hide();
		}
		if (tab.df.fieldname === UNIDEFT_PASSWORD_TAB && tab.tab_link) {
			tab.tab_link.find(".nav-link").text(__("Change Password"));
		}
	});

	// Inside Settings, keep only the Change Password section - opened.
	unideft_settings_sections(frm).forEach((section) => {
		if (section !== UNIDEFT_PASSWORD_SECTION) {
			frm.toggle_display(section, false);
		}
	});
	const password_section = frm.fields_dict[UNIDEFT_PASSWORD_SECTION];
	if (password_section && password_section.collapse) {
		password_section.collapse(false);
	}

	// Land on User Details rather than a now-hidden tab.
	const active = tabs.find((tab) => tab.is_active && tab.is_active());
	if (!active || UNIDEFT_ADMIN_ONLY_USER_TABS.includes(active.df.fieldname)) {
		const details = tabs.find((tab) => tab.df.fieldname === "user_details_tab");
		details && details.set_active();
	}
}

frappe.ui.form.on("User", {
	onload(frm) {
		// Frappe's own User refresh does `frm.module_editor.disable = ...`
		// unguarded, but only builds the editor (in its onload, which runs
		// before this one) for users who can edit roles. For everyone else that
		// line threw, the refresh chain stopped, and the form half-rendered. A
		// no-op stand-in keeps it running; the real editor is never replaced.
		if (!frm.module_editor) {
			frm.module_editor = { disable: 0, show() {} };
		}
	},
	refresh(frm) {
		unideft_limit_user_tabs(frm);
		// The form re-evaluates tab visibility after refresh handlers run.
		setTimeout(() => unideft_limit_user_tabs(frm), 0);
	},
	onload_post_render(frm) {
		unideft_limit_user_tabs(frm);
	},
});
