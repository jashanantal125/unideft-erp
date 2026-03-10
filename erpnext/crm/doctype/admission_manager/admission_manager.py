# Copyright (c) 2026, Unideft and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class AdmissionManager(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		address: DF.Data | None
		email: DF.Data | None
		name1: DF.Data | None
		number: DF.Phone | None
		parent: DF.Data
		parentfield: DF.Data
		parenttype: DF.Data
	# end: auto-generated types

	pass
