# Copyright (c) 2026, Unideft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ApplicationSponsor(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from erpnext.crm.doctype.application_sponsor_form_16.application_sponsor_form_16 import ApplicationSponsorForm16
		from erpnext.crm.doctype.application_sponsor_itr.application_sponsor_itr import ApplicationSponsorITR
		from frappe.types import DF

		account_upload: DF.Attach | None
		dob_matched_itr_ac_pc: DF.Literal["", "Yes", "No"]
		dob_matched_itr_status: DF.SmallText | None
		dob_matched_pc_ac: DF.Literal["", "Yes", "No"]
		dob_matched_status: DF.SmallText | None
		form_16_table: DF.Table[ApplicationSponsorForm16]
		income_support_documents: DF.Literal["ITRs", "Form 16", "Family ID"]
		itr_table: DF.Table[ApplicationSponsorITR]
		itr_upload: DF.Attach | None
		itr_verification_reminder: DF.SmallText | None
		itr_verified: DF.Literal["", "Yes", "No"]
		name_matched_ac_pc: DF.Literal["", "Yes", "No"]
		name_matched_itr_ac_pc: DF.Literal["", "Yes", "No"]
		name_matched_itr_status: DF.SmallText | None
		name_matched_status: DF.SmallText | None
		sponsor_name: DF.Data
		sponsor_type: DF.Literal["Mother", "Father", "Relative", "Self", "Other"]
	# end: auto-generated types

	pass
