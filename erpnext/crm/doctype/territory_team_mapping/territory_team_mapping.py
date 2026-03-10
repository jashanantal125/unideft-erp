# Copyright (c) 2025, Unideft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class TerritoryTeamMapping(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from erpnext.crm.doctype.territory_team_member.territory_team_member import TerritoryTeamMember
		from frappe.types import DF

		territory: DF.Link
		team_members: DF.Table[TerritoryTeamMember]
	# end: auto-generated types

	pass






