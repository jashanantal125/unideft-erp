// Copyright (c) 2026, Unideft and contributors
// For license information, please see license.txt

/**
 * B3 - Student Card View.
 *
 * Deliberately reuses applications_view.css and its exact class names
 * (.applications-container, .application-card, .card-header-section,
 * .program-info-section, .tab-content-area, .program-item, .card-footer,
 * .applications-grid, .search-section, pagination, loading/empty/error
 * states) rather than a parallel stylesheet, so the two card views are
 * pixel-identical in color and structure instead of two similar-looking
 * designs that drift apart over time.
 */

frappe.pages['students_view'].on_page_load = function (wrapper) {
	// Styles come from students_view.css, which @imports applications_view.css.
	// Do not frappe.require applications_view.css directly here - that was
	// tried on the Application page and it restyled the whole Desk, because
	// frappe.require loads a stylesheet globally and persistently rather than
	// scoped to this page's lifecycle the way a page's own bundled CSS is.

	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Students',
		single_column: true,
	});

	// Same Desk-chrome removal trick as the Application card view, scoped to
	// this page's ids/classes so the two do not fight each other.
	if (!document.getElementById('students-view-no-border')) {
		const style = document.createElement('style');
		style.id = 'students-view-no-border';
		style.textContent = `
			#page-students_view .page-head,
			body.students-card-view-open .page-head,
			#page-students_view .page-head.drop-shadow,
			#page-students_view .page-head .page-head-content,
			#page-students_view .layout-main-section,
			#page-students_view .layout-main-section-wrapper,
			body.students-card-view-open .layout-main-section,
			body.students-card-view-open .layout-main-section-wrapper {
				border: none !important;
				border-bottom: none !important;
				border-top: none !important;
				box-shadow: none !important;
			}
			#page-students_view .applications-container,
			body.students-card-view-open .applications-container,
			body.students-card-view-open .applications-container .page-content-wrapper {
				border: none !important;
				border-image: none !important;
				box-shadow: none !important;
				border-radius: 0 !important;
			}
		`;
		document.head.appendChild(style);
	}

	const killBorders = () => {
		const els = [
			wrapper.querySelector('.page-head'),
			wrapper.querySelector('.page-head-content'),
			document.querySelector('#page-students_view .page-head'),
			wrapper.querySelector('.layout-main-section'),
			wrapper.querySelector('.layout-main-section-wrapper'),
			wrapper.querySelector('.applications-container'),
		].filter(Boolean);
		els.forEach((el) => {
			el.classList.remove('drop-shadow');
			el.style.setProperty('border', 'none', 'important');
			el.style.setProperty('border-bottom', 'none', 'important');
			el.style.setProperty('border-top', 'none', 'important');
			el.style.setProperty('box-shadow', 'none', 'important');
		});
		document.body.classList.add('students-card-view-open');
	};
	killBorders();
	setTimeout(killBorders, 50);
	setTimeout(killBorders, 300);
	setTimeout(killBorders, 1000);

	frappe.pages['students_view'].on_page_show = function () {
		killBorders();
	};

	frappe.breadcrumbs.add('CRM');

	// New Student as the primary action, same as the Student list view - the
	// card view previously had no way to create one.
	page.set_primary_action('New Student', () => frappe.new_doc('Student'), 'fa fa-plus');
	page.add_inner_button('Refresh', () => loadStudents());

	page.add_inner_button('Back to List View', () => {
		try {
			localStorage.setItem(STUDENT_LIST_VIEW_OPT_OUT, '1');
		} catch (e) {
			// storage unavailable - the list will simply redirect again
		}
		frappe.set_route('List', 'Student');
	});

	const clear_card_view_chrome = () => {
		$('body').removeClass('students-card-view-open');
	};
	$(document).off('page-change.students_card_view');
	$(document).on('page-change.students_card_view', () => {
		const route = frappe.get_route_str() || '';
		if (route !== 'students_view') {
			clear_card_view_chrome();
			$(document).off('page-change.students_card_view');
		}
	});

	// Same DOM skeleton as applications_view.js: search-section, loading/error
	// states, a grid, pagination, empty state - identical class names so the
	// shared stylesheet applies without a single extra rule.
	$(wrapper).find('.layout-main-section').append(`
		<div class="applications-container">
			<div class="search-section">
				<div class="search-container">
					<div class="search-icon-wrapper">
						<i class="fa fa-search"></i>
					</div>
					<input type="text" id="student-search-input" class="search-input" placeholder="Search by name, ID, email or mobile…" onkeyup="applyStudentFilters()">
					<button class="search-clear-btn" id="student-search-clear-btn" onclick="clearStudentSearch()" style="display: none;">
						<i class="fa fa-times"></i>
					</button>
				</div>
			</div>

			<div class="loading-state" id="students-loading-state">
				<div class="spinner"></div>
				<p>Loading students...</p>
			</div>

			<div class="error-state" id="students-error-state" style="display: none;">
				<div class="error-icon">
					<i class="fa fa-exclamation-triangle"></i>
				</div>
				<p id="students-error-message"></p>
				<button class="btn btn-primary" onclick="loadStudents()">Try Again</button>
			</div>

			<div class="applications-grid" id="students-grid"></div>

			<div class="pagination-container" id="students-pagination-container"></div>

			<div class="empty-state" id="students-empty-state" style="display: none;">
				<div class="empty-icon">
					<i class="fa fa-inbox"></i>
				</div>
				<p>No students found</p>
			</div>
		</div>
	`);

	window.allStudents = [];
	window.currentStudents = [];
	window.currentStudentsPage = 1;

	loadStudents();

	setTimeout(() => {
		const searchInput = document.getElementById('student-search-input');
		const clearBtn = document.getElementById('student-search-clear-btn');
		if (searchInput && clearBtn) {
			searchInput.addEventListener('input', function () {
				clearBtn.style.display = this.value.length > 0 ? 'flex' : 'none';
			});
		}
	}, 100);
};

const STUDENT_LIST_VIEW_OPT_OUT = 'unideft:student_list_view_preferred';
const STUDENTS_PAGE_SIZE = 10;

function loadStudents() {
	const loadingState = document.getElementById('students-loading-state');
	const errorState = document.getElementById('students-error-state');
	const grid = document.getElementById('students-grid');
	const emptyState = document.getElementById('students-empty-state');

	if (!loadingState || !grid) return;

	loadingState.style.display = 'flex';
	errorState.style.display = 'none';
	grid.innerHTML = '';
	emptyState.style.display = 'none';

	frappe.call({
		method: 'erpnext.crm.doctype.student.student.get_students_with_applications',
		args: { page_length: 0 },
		callback(r) {
			loadingState.style.display = 'none';
			window.allStudents = r.message || [];
			window.currentStudentsPage = 1;
			applyStudentFilters();
		},
		error(err) {
			loadingState.style.display = 'none';
			showStudentsError((err && err.message) || 'An error occurred while loading students');
		},
	});
}

function showStudentsError(message) {
	const errorState = document.getElementById('students-error-state');
	const errorMessage = document.getElementById('students-error-message');
	if (errorMessage) errorMessage.textContent = message;
	if (errorState) errorState.style.display = 'flex';
}

function applyStudentFilters() {
	const searchTerm = (document.getElementById('student-search-input')?.value || '').toLowerCase().trim();

	if (window.lastStudentSearchTerm !== searchTerm) {
		window.lastStudentSearchTerm = searchTerm;
		window.currentStudentsPage = 1;
	}

	const filtered = (window.allStudents || []).filter((student) => {
		if (!searchTerm) return true;
		const display = (student.title || `${student.first_name || ''} ${student.last_name || ''}`).toLowerCase();
		const haystack = [display, student.name, student.student_id, student.email, student.mobile]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();
		return haystack.includes(searchTerm);
	});

	const totalItems = filtered.length;
	const totalPages = Math.max(1, Math.ceil(totalItems / STUDENTS_PAGE_SIZE));
	if (window.currentStudentsPage > totalPages) window.currentStudentsPage = totalPages;
	if (window.currentStudentsPage < 1) window.currentStudentsPage = 1;

	const start = (window.currentStudentsPage - 1) * STUDENTS_PAGE_SIZE;
	const page = filtered.slice(start, start + STUDENTS_PAGE_SIZE);

	window.currentStudents = filtered;
	renderStudents(page);

	const emptyState = document.getElementById('students-empty-state');
	if (emptyState) emptyState.style.display = totalItems === 0 ? 'flex' : 'none';

	renderStudentsPagination(window.currentStudentsPage, totalPages, totalItems);
}

function clearStudentSearch() {
	const searchInput = document.getElementById('student-search-input');
	const clearBtn = document.getElementById('student-search-clear-btn');
	if (searchInput) {
		searchInput.value = '';
		if (clearBtn) clearBtn.style.display = 'none';
		window.currentStudentsPage = 1;
		applyStudentFilters();
	}
}

function renderStudentsPagination(currentPage, totalPages, totalItems) {
	const container = document.getElementById('students-pagination-container');
	if (!container) return;

	if (totalPages <= 1) {
		container.innerHTML = '';
		return;
	}

	let html = '<div class="pagination">';
	html += `<button class="page-btn prev" ${currentPage === 1 ? 'disabled' : ''} onclick="goToStudentsPage(${currentPage - 1})">Prev</button>`;

	const maxButtons = 5;
	let start = Math.max(1, currentPage - 2);
	let end = Math.min(totalPages, start + maxButtons - 1);
	if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);

	for (let p = start; p <= end; p++) {
		html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="goToStudentsPage(${p})">${p}</button>`;
	}

	html += `<button class="page-btn next" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToStudentsPage(${currentPage + 1})">Next</button>`;
	html += `<span class="page-info">Page ${currentPage} of ${totalPages} • ${totalItems} items</span>`;
	html += '</div>';
	container.innerHTML = html;
}

function goToStudentsPage(page) {
	const totalItems = (window.currentStudents || []).length;
	const totalPages = Math.max(1, Math.ceil(totalItems / STUDENTS_PAGE_SIZE));
	window.currentStudentsPage = Math.min(Math.max(1, page), totalPages);

	const start = (window.currentStudentsPage - 1) * STUDENTS_PAGE_SIZE;
	renderStudents((window.currentStudents || []).slice(start, start + STUDENTS_PAGE_SIZE));
	renderStudentsPagination(window.currentStudentsPage, totalPages, totalItems);
}

function escapeHtmlStudent(text) {
	if (text == null) return '';
	const div = document.createElement('div');
	div.textContent = String(text);
	return div.innerHTML;
}

function getStudentInitial(name) {
	const trimmed = (name || '?').trim();
	return trimmed ? trimmed[0].toUpperCase() : '?';
}

function renderStudents(students) {
	const grid = document.getElementById('students-grid');
	if (!grid) return;
	grid.innerHTML = '';
	students.forEach((student) => grid.appendChild(createStudentCard(student)));
}

function createStudentCard(student) {
	const card = document.createElement('div');
	// application-card carries all shared visual styling (header gradient,
	// border, footer, program-item rows). student-card is a JS-only hook.
	card.className = 'application-card student-card';

	const displayName = student.title || [student.first_name, student.last_name].filter(Boolean).join(' ') || student.name;
	const initial = getStudentInitial(displayName);
	const createdDate = student.creation ? frappe.datetime.str_to_user(student.creation.split(' ')[0]) : 'N/A';
	const countryCount = (student.applications_by_country || []).length;
	const appCount = student.application_count || 0;

	let bodyHtml = '';
	if (countryCount) {
		bodyHtml = (student.applications_by_country || [])
			.map((group) => {
				const rows = group.applications
					.map(
						(app) => `
							<p onclick="frappe.set_route('Form', 'Application', '${app.name}')" style="cursor:pointer;">
								<i class="fa fa-graduation-cap"></i>
								<span>${escapeHtmlStudent(app.name)} — ${escapeHtmlStudent([app.preferred_university, app.course].filter(Boolean).join(' · ') || 'No course selected')}</span>
								<span class="badge badge-app-id" style="margin-left:auto;">${escapeHtmlStudent(app.status || 'Pending')}</span>
							</p>`
					)
					.join('');
				return `
					<div class="program-item" style="margin-bottom: 12px;">
						<h4>${escapeHtmlStudent(group.country)} <span style="font-weight:400;">(${group.applications.length})</span></h4>
						${rows}
					</div>`;
			})
			.join('');
	} else {
		bodyHtml = `<div class="documents-empty"><i class="fa fa-inbox"></i> No applications yet.</div>`;
	}

	card.innerHTML = `
		<div class="card-header-section">
			<div class="header-top-row">
				<div class="profile-area">
					<div class="avatar-circle">${escapeHtmlStudent(initial)}</div>
					<div class="profile-info">
						<h3 class="student-name">${escapeHtmlStudent(displayName)}</h3>
						<div class="contact-details">
							${student.mobile ? `<span class="contact-item"><i class="fa fa-phone"></i> ${escapeHtmlStudent(student.mobile)}</span>` : ''}
							${student.email ? `<span class="contact-item"><i class="fa fa-envelope"></i> ${escapeHtmlStudent(student.email)}</span>` : ''}
						</div>
					</div>
				</div>
				<div class="header-meta-right">
					<div class="badges-section">
						<span class="badge badge-student-id">Student ID: ${escapeHtmlStudent(student.student_id || student.name)}</span>
					</div>
				</div>
			</div>
		</div>

		<div class="program-info-section">
			<div class="program-details">
				<h3 class="degree-name">
					${appCount} Application${appCount === 1 ? '' : 's'}
					<i class="fa fa-external-link program-external-link" aria-hidden="true" onclick="frappe.set_route('Form', 'Student', '${student.name}')"></i>
				</h3>
				<div class="program-meta">
					${student.destination_country ? `<span class="program-university">${getStudentCountryFlagHtml(student.destination_country)} Home Country: ${escapeHtmlStudent(student.destination_country)}</span>` : ''}
					${countryCount ? `<span class="intake-date"><strong>Applying to:</strong> ${countryCount} ${countryCount === 1 ? 'country' : 'countries'}</span>` : ''}
				</div>
			</div>
		</div>

		<div class="tab-content-area">
			${bodyHtml}
		</div>

		<div class="card-footer">
			<div class="footer-meta">
				<span class="meta-item"><i class="fa fa-calendar"></i> Created on: ${createdDate}</span>
				<span class="meta-item"><i class="fa fa-id-card"></i> ${escapeHtmlStudent(student.student_id || student.name)}</span>
			</div>
		</div>
	`;

	return card;
}

function getStudentCountryFlagHtml(country) {
	if (!country) return '';
	const codeMap = {
		australia: 'au', 'united kingdom': 'gb', uk: 'gb', 'great britain': 'gb', britain: 'gb', england: 'gb',
		canada: 'ca', 'united states': 'us', 'united states of america': 'us', usa: 'us', 'new zealand': 'nz',
		ireland: 'ie', germany: 'de', france: 'fr', italy: 'it', spain: 'es', netherlands: 'nl',
		singapore: 'sg', malaysia: 'my', dubai: 'ae', uae: 'ae', india: 'in',
	};
	const code = codeMap[String(country).trim().toLowerCase()];
	if (!code) return '';
	const safe = escapeHtmlStudent(country);
	return `<img class="country-flag" src="https://flagcdn.com/w40/${code}.png" alt="${safe}" title="${safe}" width="20" height="15" loading="lazy" />`;
}
