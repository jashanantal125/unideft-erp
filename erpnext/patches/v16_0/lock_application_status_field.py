"""D4 - Status is driven by the stage gates, never hand-edited.

Implemented as a read_only_depends_on Property Setter rather than a permlevel.

A permlevel would have been a stronger lock, but it also blocks *programmatic*
writes from anyone lacking that permlevel - and stage progression runs client
side through complete_stage_and_advance(), which does frm.set_value("status", ...)
followed by frm.save() as the logged-in agent or admissions user. Raising the
permlevel would therefore make every stage gate fail to save for exactly the
roles that need to advance it.

read_only_depends_on greys the field out in the UI for everyone except
Administrator / System Manager while leaving set_value() working, so the
workflow keeps driving it and nobody can type into it.

A true server-enforced lock would mean deriving `status` from the stage-gate
fields inside Application.validate() and dropping the client-side set_value
calls; that is a larger refactor and is tracked separately.
"""

import frappe
from frappe.custom.doctype.property_setter.property_setter import make_property_setter

# Administrator (the user) plus System Manager keep the ability to correct a
# status by hand; every other role sees it greyed out.
ADMIN_ONLY = (
	"eval:!(frappe.session.user=='Administrator' "
	"|| in_list(frappe.user_roles, 'System Manager'))"
)


def execute():
	if not frappe.db.exists("DocType", "Application"):
		return

	make_property_setter(
		"Application",
		"status",
		"read_only_depends_on",
		ADMIN_ONLY,
		"Code",
		validate_fields_for_doctype=False,
	)

	frappe.clear_cache(doctype="Application")
