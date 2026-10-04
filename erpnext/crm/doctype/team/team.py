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

		admission_1: DF.Link | None
		admission_2: DF.Link | None
		application_team_members: DF.Table[TeamMember]
		country: DF.Link
		country_head: DF.Link | None
		cro: DF.Link | None
		cro_members: DF.Table[TeamMember]
		team_leader: DF.Link | None
		team_members: DF.Table[TeamMember]
		team_name: DF.Data
		team_type: DF.Literal["", "B2B", "B2C"]
		territories: DF.Table[TeamTerritory]
	# end: auto-generated types

	def validate(self):
		self.dedupe_members("cro_members")
		self.dedupe_members("application_team_members")
		self.sync_legacy_fields()

	def dedupe_members(self, parentfield):
		seen = set()
		for row in list(self.get(parentfield)):
			if not row.user or row.user in seen:
				self.remove(row)
				continue
			seen.add(row.user)

	def sync_legacy_fields(self):
		"""Older code and reports still read the single CRO / Admission fields."""
		cros = [r.user for r in sorted(self.cro_members, key=lambda r: (r.priority or 0, r.idx))]
		members = [
			r.user for r in sorted(self.application_team_members, key=lambda r: (r.priority or 0, r.idx))
		]
		self.cro = cros[0] if cros else None
		self.admission_1 = members[0] if members else None
		self.admission_2 = members[1] if len(members) > 1 else None
