// Copyright (c) 2026, Unideft and contributors
// For license information, please see license.txt

// Set Reminder pop-up shared by every Accounts Department form.
frappe.provide("unideft.accounts");

// Reminders are the Frappe core Reminder doctype, matched by description so they
// can be stood down automatically once the task they chase is done.
unideft.accounts.set_reminder = function (frm, description) {
	if (!frm.doc.name || frm.doc.__islocal) {
		frappe.msgprint(__("Please save this record before setting a reminder."));
		return;
	}

	const dialog = new frappe.ui.Dialog({
		title: __("Set Reminder"),
		fields: [
			{
				fieldname: "reminder_date",
				fieldtype: "Date",
				label: __("Reminder Date"),
				reqd: 1,
				default: frappe.datetime.add_days(frappe.datetime.get_today(), 1),
			},
			{
				fieldname: "reminder_time",
				fieldtype: "Time",
				label: __("Reminder Time"),
				reqd: 1,
				default: "10:00:00",
			},
			{
				fieldname: "remarks",
				fieldtype: "Small Text",
				label: __("Short Note / Remarks"),
				default: description,
			},
		],
		primary_action_label: __("Set Reminder"),
		primary_action(values) {
			dialog.hide();
			frappe.call({
				method: "frappe.automation.doctype.reminder.reminder.create_new_reminder",
				args: {
					remind_at: `${values.reminder_date} ${values.reminder_time}`,
					description: values.remarks
						? `${description} — ${values.remarks}`
						: description,
					reminder_doctype: frm.doctype,
					reminder_docname: frm.doc.name,
				},
				callback() {
					frappe.show_alert({ message: __("Reminder set"), indicator: "green" }, 4);
				},
				error() {
					frappe.show_alert(
						{ message: __("Could not set reminder — save the form and try again"), indicator: "orange" },
						5
					);
				},
			});
		},
	});
	dialog.show();
};

unideft.accounts.clear_reminder = function (frm, description) {
	if (!frm.doc.name || frm.doc.__islocal) {
		return;
	}
	frappe.db
		.get_list("Reminder", {
			filters: {
				reminder_doctype: frm.doctype,
				reminder_docname: frm.doc.name,
				notified: 0,
			},
			fields: ["name", "description"],
			limit: 100,
		})
		.then((rows) => {
			const needle = description.toLowerCase();
			const matched = (rows || []).filter((row) =>
				String(row.description || "")
					.toLowerCase()
					.includes(needle)
			);
			matched.forEach((row) => frappe.db.set_value("Reminder", row.name, "notified", 1));
			if (matched.length) {
				frappe.show_alert(
					{ message: __("{0} reminder(s) closed", [matched.length]), indicator: "blue" },
					4
				);
			}
		});
};

// Yes closes the chase, No opens it.
unideft.accounts.follow_up = function (frm, value, description) {
	if (value === "No") {
		unideft.accounts.set_reminder(frm, description);
	} else if (value === "Yes") {
		unideft.accounts.clear_reminder(frm, description);
	}
};
