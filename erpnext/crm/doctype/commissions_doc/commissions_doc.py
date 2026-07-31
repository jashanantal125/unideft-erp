# Copyright (c) 2026, Unideft and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class commissionsdoc(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		commision: DF.AttachImage | None
		doc: DF.AttachImage | None
	# end: auto-generated types

	pass
