// Copyright (c) 2026, Unideft and contributors
// For license information, please see license.txt

/**
 * B3 - Student Card View.
 *
 * Mirrors the Application card view: one card per student carrying their basic
 * details, and every Application they hold grouped under the destination
 * country, each linking straight through to that Application.
 */

frappe.pages["students_view"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Students"),
		single_column: true,
	});

	const state = { search: "", start: 0, page_length: 40, loading: false, exhausted: false };

	page.set_primary_action(__("Refresh"), () => load(page, state, true), "fa fa-refresh");

	page.add_inner_button(__("Back to List View"), () => {
		// An explicit choice of list view should stick, or the list would bounce
		// straight back here on the next visit.
		try {
			localStorage.setItem(STUDENT_LIST_VIEW_OPT_OUT, "1");
		} catch (e) {
			// storage unavailable - the list will simply redirect again
		}
		frappe.set_route("List", "Student");
	});

	const $body = $(`
		<div class="students-view">
			<div class="students-toolbar">
				<input type="text" class="form-control students-search"
					placeholder="${__("Search by name, ID, email or mobile…")}" />
			</div>
			<div class="students-grid"></div>
			<div class="students-empty hidden text-muted">${__("No students to show.")}</div>
			<div class="students-loading text-muted">${__("Loading…")}</div>
			<div class="students-more-wrap"><button class="btn btn-default btn-sm students-more hidden">${__("Load more")}</button></div>
		</div>
	`).appendTo(page.main);

	let debounce = null;
	$body.find(".students-search").on("input", function () {
		state.search = $(this).val();
		clearTimeout(debounce);
		debounce = setTimeout(() => load(page, state, true), 300);
	});

	$body.find(".students-more").on("click", () => load(page, state, false));

	page.$students_body = $body;
	load(page, state, true);
};

const STUDENT_LIST_VIEW_OPT_OUT = "unideft:student_list_view_preferred";

function load(page, state, reset) {
	if (state.loading) {
		return;
	}
	if (reset) {
		state.start = 0;
		state.exhausted = false;
		page.$students_body.find(".students-grid").empty();
	}
	if (state.exhausted) {
		return;
	}

	state.loading = true;
	page.$students_body.find(".students-loading").removeClass("hidden");

	frappe.call({
		method: "erpnext.crm.doctype.student.student.get_students_with_applications",
		args: { search: state.search, start: state.start, page_length: state.page_length },
		callback(r) {
			state.loading = false;
			page.$students_body.find(".students-loading").addClass("hidden");

			const students = r.message || [];
			if (students.length < state.page_length) {
				state.exhausted = true;
			}
			state.start += students.length;

			render(page, students);

			const $grid = page.$students_body.find(".students-grid");
			page.$students_body.find(".students-empty").toggleClass("hidden", $grid.children().length > 0);
			page.$students_body
				.find(".students-more")
				.toggleClass("hidden", state.exhausted || !students.length);
		},
		error() {
			state.loading = false;
			page.$students_body.find(".students-loading").addClass("hidden");
		},
	});
}

function esc(value) {
	return frappe.utils.escape_html(value == null ? "" : String(value));
}

function initials(name) {
	const parts = String(name || "?").trim().split(/\s+/);
	return ((parts[0] || "?")[0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

function status_colour(status) {
	const map = {
		Pending: "gray",
		Processing: "orange",
		Submitted: "blue",
		"Offer Letter Received": "blue",
		Financial: "purple",
		"GS Processing": "purple",
		"GS Approved": "green",
		Acceptance: "green",
		COE: "green",
		eCOE: "green",
		"File Lodged": "cyan",
		Visa: "cyan",
		Enrollment: "green",
		Completed: "green",
		"Visa Refused": "red",
		Closed: "gray",
	};
	return map[status] || "gray";
}

function render(page, students) {
	const $grid = page.$students_body.find(".students-grid");

	students.forEach((student) => {
		const display = student.title || [student.first_name, student.last_name].filter(Boolean).join(" ") || student.name;

		let groups = "";
		(student.applications_by_country || []).forEach((group) => {
			const rows = group.applications
				.map((app) => {
					const label = [app.preferred_university, app.course].filter(Boolean).join(" · ");
					return `
						<a class="student-app-row" href="/app/application/${encodeURIComponent(app.name)}">
							<span class="student-app-id">${esc(app.name)}</span>
							<span class="student-app-meta">${esc(label || "—")}</span>
							<span class="indicator-pill ${status_colour(app.status)}">${esc(app.status || "Pending")}</span>
						</a>`;
				})
				.join("");

			groups += `
				<div class="student-country-group">
					<div class="student-country-title">
						${esc(group.country)}
						<span class="text-muted">(${group.applications.length})</span>
					</div>
					${rows}
				</div>`;
		});

		if (!groups) {
			groups = `<div class="student-no-apps text-muted">${__("No applications yet.")}</div>`;
		}

		$grid.append(`
			<div class="student-card">
				<div class="student-card-head">
					<div class="student-avatar">${esc(initials(display))}</div>
					<div class="student-headings">
						<a class="student-name" href="/app/student/${encodeURIComponent(student.name)}">${esc(display)}</a>
						<div class="student-id">${esc(student.student_id || student.name)}</div>
					</div>
					<div class="student-app-count" title="${__("Applications")}">${student.application_count || 0}</div>
				</div>
				<div class="student-card-meta">
					${student.email ? `<div><i class="fa fa-envelope-o"></i> ${esc(student.email)}</div>` : ""}
					${student.mobile ? `<div><i class="fa fa-phone"></i> ${esc(student.mobile)}</div>` : ""}
					${student.destination_country ? `<div><i class="fa fa-globe"></i> ${esc(student.destination_country)}</div>` : ""}
				</div>
				<div class="student-card-apps">${groups}</div>
			</div>
		`);
	});
}
