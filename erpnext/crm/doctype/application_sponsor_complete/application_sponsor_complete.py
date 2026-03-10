# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class ApplicationSponsorComplete(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from erpnext.crm.doctype.application_sponsor_form_16.application_sponsor_form_16 import ApplicationSponsorForm16
		from erpnext.crm.doctype.application_sponsor_itr.application_sponsor_itr import ApplicationSponsorITR
		from frappe.types import DF

		account_upload: DF.Attach | None
		business_proof: DF.Literal["", "GST Certificate", "MSME Certificate", "Incorporation Certificate", "Shop Act", "IEC Certificate", "Others"]
		dob_matched_itr_ac_pc: DF.Check
		dob_matched_pc_ac: DF.Check
		family_id_upload: DF.Attach | None
		farmer_family_id_income: DF.Currency
		farmer_family_id_upload: DF.Attach | None
		farmer_family_income_matches_itrs: DF.Check
		farmer_income: DF.Currency
		farmer_income_support_type: DF.Literal["", "Tehsildar Income Proof", "Family ID", "J forms", "Other"]
		farmer_jform_amount: DF.Currency
		farmer_jform_sixty_percent_match_itrs: DF.Check
		farmer_jform_upload: DF.Attach | None
		farmer_jform_year: DF.Data | None
		farmer_other_details: DF.Text | None
		farmer_tehsildar_income: DF.Currency
		farmer_tehsildar_matches_itrs: DF.Check
		farmer_tehsildar_upload: DF.Attach | None
		fd_balance_cert_available: DF.Check
		fd_bank_name: DF.Data | None
		fd_months_old: DF.Literal["", "1 Month", "2 Months", "3 Months", "More than 3 Months"]
		fd_nationalized: DF.Check
		fd_other_details: DF.Text | None
		fd_source_of_funds: DF.Text | None
		fd_upload: DF.Attach | None
		fd_verified: DF.Check
		form_16_table: DF.Table[ApplicationSponsorForm16]
		funds_type: DF.Literal["", "Fixed Deposit", "Bank Statement", "Education Loan"]
		gov_department: DF.Data | None
		gov_id_card: DF.Attach | None
		gov_position: DF.Data | None
		gov_salary_slip: DF.Check
		gov_salary_statement: DF.Check
		gov_slip_current_salary: DF.Currency
		gov_slip_gpf_amount: DF.Currency
		gov_slip_upload: DF.Attach | None
		gov_statement_current_salary: DF.Currency
		gov_statement_upload: DF.Attach | None
		gst_certificate_upload: DF.Attach | None
		gst_number: DF.Data | None
		gst_verified: DF.Check
		iec_cert_upload: DF.Attach | None
		iec_company_name: DF.Data | None
		if_fundtype_gpf: DF.Text | None
		income_support_documents: DF.Literal["", "ITRs", "Form 16", "Family ID"]
		incorporation_business_start_date: DF.Date | None
		incorporation_certificate_upload: DF.Attach | None
		itr_table: DF.Table[ApplicationSponsorITR]
		itr_uploaded: DF.Attach | None
		job_type: DF.Literal["", "Government", "Private", "Retired from Govt. services"]
		loan_amount: DF.Currency
		loan_bank_name: DF.Data | None
		loan_covering_requirements: DF.Check
		loan_education_purpose: DF.Check
		loan_holder_student: DF.Check
		loan_letter_upload: DF.Attach | None
		loan_security_collection: DF.Literal["", "Properties", "Others"]
		loan_security_proof: DF.Attach | None
		msme_cert_verified: DF.Check
		msme_certificate_upload: DF.Attach | None
		msme_company_name: DF.Data | None
		name_matched_ac_pc: DF.Check
		name_matched_itr_ac_pc: DF.Check
		occupation_documents_needed: DF.Check
		occupation_reason: DF.Text | None
		parent: DF.Data
		parentfield: DF.Data
		parenttype: DF.Data
		private_company_name: DF.Data | None
		private_department: DF.Data | None
		private_experience_letter: DF.Attach | None
		private_id_card: DF.Attach | None
		private_position: DF.Data | None
		private_salary_slip: DF.Check
		private_salary_statement: DF.Check
		private_slip_current_salary: DF.Currency
		private_slip_upload: DF.Attach | None
		private_statement_current_salary: DF.Currency
		private_statement_upload: DF.Attach | None
		retired_date: DF.Date | None
		retired_department: DF.Data | None
		retired_id_card: DF.Attach | None
		retired_pension_statement: DF.Currency
		retired_position: DF.Data | None
		retired_salary_statement: DF.Attach | None
		shop_act_company_name: DF.Data | None
		sponsor_itr_verified: DF.Check
		sponsor_name: DF.Data
		sponsor_occupation: DF.Literal["", "Business", "Job", "Farmer", "Other"]
		sponsor_type: DF.Literal["", "Mother", "Father", "Relative", "Self", "Other"]
		statement_balance_cert_available: DF.Check
		statement_balance_cert_same_date: DF.Check
		statement_bank_name: DF.Data | None
		statement_fifty_thousand_times: DF.Literal["", "1 Time", "2 Times", "3 Times", "More than 3 Times"]
		statement_nationalized: DF.Check
		statement_other_details: DF.Text | None
		statement_source_of_funds: DF.Text | None
		statement_upload: DF.Attach | None
		statement_verified: DF.Check
	# end: auto-generated types

	pass
