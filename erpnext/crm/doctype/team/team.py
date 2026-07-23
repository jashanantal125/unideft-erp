# Copyright (c) 2025, Unideft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Team(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from erpnext.crm.doctype.team_member.team_member import TeamMember
		from erpnext.crm.doctype.team_territory.team_territory import TeamTerritory
		from frappe.types import DF

		team_leader: DF.Link | None
		team_members: DF.Table[TeamMember]
		team_name: DF.Data
		territories: DF.Table[TeamTerritory]
	# end: auto-generated types

	pass






