frappe.pages['applications-view'].on_page_load = function (wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Applications View',
        single_column: true
    });

    // Add breadcrumbs
    frappe.breadcrumbs.add('CRM');

    // Add primary action
    page.set_primary_action('Refresh', () => refreshApplications(), 'fa fa-refresh');

    // Add "Back to List View" button
    page.add_inner_button('Back to List View', () => {
        frappe.set_route('List', 'Application');
    });

    // Inject HTML structure into the page body
    $(wrapper).find('.layout-main-section').append(`
		<div class="applications-container">
			<!-- Search Section -->
			<div class="search-section">
				<div class="search-container">
					<div class="search-icon-wrapper">
						<i class="fa fa-search"></i>
					</div>
					<input type="text" id="search-input" class="search-input" placeholder="Search by student name..." onkeyup="applyFilters()">
					<button class="search-clear-btn" id="search-clear-btn" onclick="clearSearch()" style="display: none;">
						<i class="fa fa-times"></i>
					</button>
				</div>
			</div>

			<div class="loading-state" id="loading-state">
				<div class="spinner"></div>
				<p>Loading applications...</p>
			</div>
			
			<div class="error-state" id="error-state" style="display: none;">
				<div class="error-icon">
					<i class="fa fa-exclamation-triangle"></i>
				</div>
				<p id="error-message"></p>
				<button class="btn btn-primary" onclick="loadApplications()">Try Again</button>
			</div>
			
			<div class="applications-grid" id="applications-grid">
				<!-- Applications will be loaded here -->
			</div>

			<!-- Pagination -->
			<div class="pagination-container" id="pagination-container">
				<!-- Pagination buttons will be rendered here -->
			</div>
			
			<div class="empty-state" id="empty-state" style="display: none;">
				<div class="empty-icon">
					<i class="fa fa-inbox"></i>
				</div>
				<p>No applications found</p>
			</div>
		</div>
	`);

    // Global storage for app data (scoped to window to match previous logic, or attach to wrapper)
    window.applicationsData = {};
    window.allApplications = [];
	// Pagination
	window.currentApplicationsPage = 1;

    // Load applications
    loadApplications();

    // Setup search input clear button visibility
    setTimeout(() => {
        const searchInput = document.getElementById('search-input');
        const clearBtn = document.getElementById('search-clear-btn');
        if (searchInput && clearBtn) {
            searchInput.addEventListener('input', function () {
                if (this.value.length > 0) {
                    clearBtn.style.display = 'flex';
                } else {
                    clearBtn.style.display = 'none';
                }
            });
        }
    }, 100);
};

const APPLICATIONS_PAGE_SIZE = 10;
window.currentApplications = [];

function applyFilters() {
    const searchTerm = document.getElementById('search-input') ? (document.getElementById('search-input').value || '').toLowerCase().trim() : '';

	// Reset to page 1 when search changes
	if (window.lastApplicationsSearchTerm !== searchTerm) {
		window.lastApplicationsSearchTerm = searchTerm;
		window.currentApplicationsPage = 1;
	}

    // Use the cached allApplications array if available
    if (window.allApplications && window.allApplications.length > 0) {
        const filteredApps = window.allApplications.filter(app => {
            const studentName = app.student_data
                ? `${app.student_data.first_name || ''} ${app.student_data.last_name || ''}`.toLowerCase()
                : (app.student || '').toLowerCase();

            // Also search by Application ID, Student email, or specific status if needed
            const appId = (app.name || '').toLowerCase();
            const email = (app.student_email || (app.student_data && app.student_data.email) || '').toLowerCase();

            if (!searchTerm) return true;
            return studentName.includes(searchTerm) || appId.includes(searchTerm) || email.includes(searchTerm);
        });

		// Pagination calculations
		const totalItems = filteredApps.length;
		const pageSize = APPLICATIONS_PAGE_SIZE;
		const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

		// Clamp current page
		if (!window.currentApplicationsPage || window.currentApplicationsPage < 1) {
			window.currentApplicationsPage = 1;
		} else if (window.currentApplicationsPage > totalPages) {
			window.currentApplicationsPage = totalPages;
		}

		const startIndex = (window.currentApplicationsPage - 1) * pageSize;
		const paginatedApps = filteredApps.slice(startIndex, startIndex + pageSize);

		// Keep latest filtered list (for paging)
		window.currentApplications = filteredApps;

        renderApplications(paginatedApps);

        // Update empty state visibility
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.style.display = totalItems === 0 ? 'flex' : 'none';
        }

		// Render pagination controls
		renderApplicationsPagination(window.currentApplicationsPage, totalPages, totalItems);
    } else {
        // Fallback if no data loaded yet (unlikely if user is typing)
        // loadApplications(); // Don't reload, just wait
    }
}

function renderApplicationsPagination(currentPage, totalPages, totalItems) {
	const container = document.getElementById('pagination-container');
	if (!container) return;

	if (totalPages <= 1) {
		container.innerHTML = '';
		return;
	}

	let html = '<div class="pagination">';

	html += `<button class="page-btn prev" ${currentPage === 1 ? 'disabled' : ''} onclick="goToApplicationsPage(${currentPage - 1})">Prev</button>`;

	const maxButtons = 5;
	let start = Math.max(1, currentPage - 2);
	let end = Math.min(totalPages, start + maxButtons - 1);
	if (end - start < maxButtons - 1) {
		start = Math.max(1, end - maxButtons + 1);
	}

	for (let p = start; p <= end; p++) {
		html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="goToApplicationsPage(${p})">${p}</button>`;
	}

	html += `<button class="page-btn next" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToApplicationsPage(${currentPage + 1})">Next</button>`;
	html += `<span class="page-info">Page ${currentPage} of ${totalPages} • ${totalItems} items</span>`;
	html += '</div>';

	container.innerHTML = html;
}

function goToApplicationsPage(page) {
	if (!window.currentApplications) return;

	const totalItems = window.currentApplications.length;
	const pageSize = APPLICATIONS_PAGE_SIZE;
	const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

	const targetPage = Math.min(Math.max(1, page), totalPages);
	window.currentApplicationsPage = targetPage;

	const startIndex = (targetPage - 1) * pageSize;
	const paginatedApps = window.currentApplications.slice(startIndex, startIndex + pageSize);

	renderApplications(paginatedApps);
	renderApplicationsPagination(window.currentApplicationsPage, totalPages, totalItems);
}

function clearSearch() {
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear-btn');
    if (searchInput) {
        searchInput.value = '';
        if (clearBtn) clearBtn.style.display = 'none';
        // When cleared, show all applications
		window.currentApplicationsPage = 1;
        applyFilters();
    }
}

function loadApplications() {
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const applicationsGrid = document.getElementById('applications-grid');
    const emptyState = document.getElementById('empty-state');

    if (!loadingState || !applicationsGrid) return;

    // Show loading state
    loadingState.style.display = 'flex';
    errorState.style.display = 'none';
    applicationsGrid.innerHTML = '';
    emptyState.style.display = 'none';

    // Get search term
    const searchTerm = document.getElementById('search-input') ? document.getElementById('search-input').value.toLowerCase() : '';

    // Fetch applications from REST API
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Application',
            fields: [
                'name',
                'student',
                'contact_number',
                'student_email',
                'agent',
                'destination_country',
                'application_type',
                'status',
                'preferred_university',
                'university_name',
                'course_name',
                'intake',
                'university_intake',
                'dob',
                'martial_status',
                'creation',
                'modified',
                'owner',
                'higher_education'
            ],
            limit_page_length: 1000,
            order_by: 'creation desc'
        },
        callback: function (response) {
            loadingState.style.display = 'none';

            if (response.message) {
                let applications = response.message;

                // Store all applications for filtering (cache full list)
                window.allApplications = applications;

                // Render immediately with basic data (prevents blank screen)
                applyFilters();

                if (applications.length === 0) {
                    emptyState.style.display = 'flex';
                    return;
                }

                // Fetch details in background - this will trigger re-renders
                fetchStudentDetails(applications);
            } else {
                showError('Failed to load applications');
            }
        },
        error: function (err) {
            loadingState.style.display = 'none';
            showError(err.message || 'An error occurred while loading applications');
        }
    });
}

function fetchStudentDetails(applications) {
    const studentNames = applications.map(app => app.student).filter(Boolean);
    if (studentNames.length === 0) {
        applyFilters();
        return;
    }

    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Student',
            filters: { name: ['in', studentNames] },
            fields: ['name', 'first_name', 'last_name', 'email', 'mobile'],
            limit_page_length: 1000
        },
        callback: function (response) {
            const students = {};
            if (response.message) {
                response.message.forEach(student => {
                    students[student.name] = student;
                });
            }

            // Merge student data with applications
            applications.forEach(app => {
                if (app.student && students[app.student]) {
                    app.student_data = students[app.student];
                }
            });

            // Fetch preferred courses for applications
            fetchPreferredCourses(applications);
        },
        error: function () {
            // If student fetch fails, render without student details
            applyFilters();
        }
    });
}

function fetchPreferredCourses(applications) {
    const applicationNames = applications.map(app => app.name).filter(Boolean);
    if (applicationNames.length === 0) {
        applyFilters();
        return;
    }

    // Fetch full Application documents to get child table data
    // Batch fetch applications to get preferred_courses
    let completed = 0;
    const total = applicationNames.length;
    const coursesByApp = {};

    if (total === 0) {
        applyFilters();
        return;
    }

    applicationNames.forEach(appName => {
        frappe.call({
            method: 'frappe.client.get',
            args: {
                doctype: 'Application',
                name: appName
            },
            callback: function (response) {
                if (response.message && response.message.preferred_courses) {
                    coursesByApp[appName] = response.message.preferred_courses.map(c => c.course).filter(Boolean);
                } else {
                    coursesByApp[appName] = [];
                }

                completed++;
                if (completed === total) {
                    // Now fetch course names for all course IDs
                    fetchCourseNames(applications, coursesByApp);
                }
            },
            error: function () {
                coursesByApp[appName] = [];
                completed++;
                if (completed === total) {
                    // Now fetch course names for all course IDs
                    fetchCourseNames(applications, coursesByApp);
                }
            }
        });
    });
}

function fetchCourseNames(applications, coursesByApp) {
    // Collect all unique course IDs
    const allCourseIds = [];
    Object.values(coursesByApp).forEach(courses => {
        courses.forEach(courseId => {
            if (courseId && !allCourseIds.includes(courseId)) {
                allCourseIds.push(courseId);
            }
        });
    });

    if (allCourseIds.length === 0) {
        // No courses to fetch, just render
        applications.forEach(app => {
            app.preferred_courses = coursesByApp[app.name] || [];
        });
        applyFilters();
        return;
    }

    // Fetch all Course documents to get course names
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Course',
            filters: { name: ['in', allCourseIds] },
            fields: ['name', 'course_name'],
            limit_page_length: 1000
        },
        callback: function (response) {
            // Create a map of course ID to course name
            const courseNameMap = {};
            if (response.message) {
                response.message.forEach(course => {
                    courseNameMap[course.name] = course.course_name || course.name;
                });
            }

            // Replace course IDs with course names
            applications.forEach(app => {
                const courseIds = coursesByApp[app.name] || [];
                app.preferred_courses = courseIds.map(courseId => courseNameMap[courseId] || courseId);
            });

            applyFilters();
        },
        error: function () {
            // If course name fetch fails, use IDs as fallback
            applications.forEach(app => {
                app.preferred_courses = coursesByApp[app.name] || [];
            });
            applyFilters();
        }
    });
}

function renderApplications(applications) {
    const applicationsGrid = document.getElementById('applications-grid');
    if (!applicationsGrid) return;
    applicationsGrid.innerHTML = '';

    applications.forEach(function (app) {
        const card = createApplicationCard(app);
        applicationsGrid.appendChild(card);
    });
}

function createApplicationCard(app) {
    const card = document.createElement('div');
    card.className = 'application-card';
    card.setAttribute('data-status', app.status || '');

    // Get student name (from linked Student if available)
    const studentName = app.student_data
        ?
        `${app.student_data.first_name || ''} ${app.student_data.last_name || ''}`.trim() :
        app.student || 'N/A';
    // Avatar should show only first letter of applicant name
    const initials = getInitials(studentName).substring(0, 1);

    // Format dates
    const createdDate = app.creation ? frappe.datetime.str_to_user(app.creation.split(' ')[0]) : 'N/A';
    const intakeDate = app.university_intake ? frappe.datetime.str_to_user(app.university_intake) : 'N/A';
    const dobDate = app.dob ? frappe.datetime.str_to_user(app.dob) : '--';

    // Get degree / program name
    const degreeName = app.course_name || app.higher_education || 'N/A';

    // Get owner name
    const ownerName = app.owner || 'System';

    card.innerHTML = `
		<!-- Header Section -->
		<div class="card-header-section">
			<div class="header-top-row">
				<div class="profile-area">
					<div class="avatar-circle">${initials}</div>
					<div class="profile-info">
						<h3 class="student-name">${escapeHtml(studentName)}</h3>
						<div class="contact-details">
							${app.contact_number ? `<span class="contact-item"><i class="fa fa-phone"></i> ${escapeHtml(app.contact_number)}</span>` : ''}
							${app.student_email || (app.student_data && app.student_data.email) ? `<span class="contact-item"><i class="fa fa-envelope"></i> ${escapeHtml(app.student_email || app.student_data.email)}</span>` : ''}
							<span class="contact-item"><i class="fa fa-calendar"></i> ${dobDate}</span>
						</div>
					</div>
				</div>
				<div class="header-meta-right">
					<div class="badges-section">
						<span class="badge badge-app-id">App ID: ${escapeHtml(app.name)}</span>
						${app.student ? `<span class="badge badge-student-id">Student ID: ${escapeHtml(app.student)}</span>` : ''}
						<span class="badge badge-b2b">${escapeHtml(app.application_type || 'B2B')}</span>
					</div>
					<div class="header-actions-row">
						<span class="status-pill" data-status="${escapeHtml(app.status || 'Pending')}">
							APP. STATUS: ${escapeHtml(app.status || 'Pending').toUpperCase()}
							<i class="fa fa-pencil status-edit-icon" onclick="editStatus('${app.name}')"></i>
						</span>
						<button class="btn-chat" onclick="openChat('${app.name}')">
							<i class="fa fa-comment-o"></i> CHAT
						</button>
					</div>
				</div>
			</div>
		</div>
		
		<!-- Program Details Section -->
		<div class="program-info-section">
			<div class="program-details">
				<h3 class="degree-name">
					${escapeHtml(degreeName)}
					<i class="fa fa-external-link program-external-link" aria-hidden="true" onclick="viewApplication('${app.name}')"></i>
				</h3>
				<div class="program-meta">
					${(app.preferred_university || app.university_name) || app.destination_country ? `
						<span class="program-university">
							${escapeHtml(app.preferred_university || app.university_name || 'N/A')}
							${app.destination_country ? `In ${escapeHtml(app.destination_country)}` : ''}
						</span>
					` : ''}
					${app.intake ? `<span class="intake-date"><strong>Intake:</strong> ${escapeHtml(app.intake)}</span>` : ''}
				</div>
			</div>
		</div>
		
		<!-- Tab Navigation -->
		<div class="tab-navigation">
			<button class="tab-btn active" data-tab="timeline" onclick="switchTab(this, 'timeline', '${app.name}')">
				<i class="fa fa-clock-o"></i> Timeline
			</button>
			<button class="tab-btn" data-tab="staff" onclick="switchTab(this, 'staff', '${app.name}')">
				<i class="fa fa-users"></i> Assigned Staff
			</button>
			<button class="tab-btn" data-tab="programs" onclick="switchTab(this, 'programs', '${app.name}')">
				<i class="fa fa-graduation-cap"></i> Programs
			</button>
			<button class="tab-btn" data-tab="notes" onclick="switchTab(this, 'notes', '${app.name}')">
				<i class="fa fa-sticky-note"></i> Notes
			</button>
			<button class="tab-btn" data-tab="reminders" onclick="switchTab(this, 'reminders', '${app.name}')">
				<i class="fa fa-bell"></i> Reminders
			</button>
			<button class="tab-btn" data-tab="documents" onclick="switchTab(this, 'documents', '${app.name}')">
				<i class="fa fa-file"></i> Documents
			</button>
		</div>
		
		<!-- Dynamic Content Area -->
		<div class="tab-content-area" id="content-${app.name}">
			${createTimelineContent(app)}
		</div>
		
		<!-- Footer -->
		<div class="card-footer">
			<div class="footer-meta">
				<span class="meta-item"><i class="fa fa-calendar"></i> Created on: ${createdDate}</span>
				<span class="meta-item"><i class="fa fa-user"></i> Created by: ${escapeHtml(ownerName)}</span>
				<span class="meta-item"><i class="fa fa-tag"></i> Lead Medium: ${escapeHtml(app.application_type || 'N/A')}</span>
				<span class="meta-item"><i class="fa fa-user-circle"></i> Agent: ${escapeHtml(app.agent || 'N/A')}</span>
			</div>
		</div>
	`;

    // Store app data for tab switching
    card.setAttribute('data-app-name', app.name);
    window.applicationsData[app.name] = app;

    return card;
}

function createTimelineContent(app) {
    // All statuses from Application doctype status field in order
    const allStatuses = [
        'Pending',
        'Processing',
        'Offer Letter Received',
        'Financial',
        'GTE Processing',
        'GTE Approved',
        'Acceptance',
        'COE',
        'File Lodged',
        'Visa',
        'Enrollment',
        'On Shore College change',
        'Visa Refused',
        'Closed'
    ];

    const currentStatus = app.status || 'Pending';
    const currentStatusIndex = allStatuses.indexOf(currentStatus);

    // Generate timeline stages from all statuses
    const timelineStages = allStatuses.map((status, index) => {
        const isCompleted = index <= currentStatusIndex;

        // Generate short code from status (first letters or abbreviation)
        const code = getStatusCode(status);

        // For completed stages, use creation date for first status, modified date for current, or today
        let actualDate = null;
        if (isCompleted) {
            if (index === 0 && app.creation) {
                actualDate = frappe.datetime.str_to_user(app.creation.split(' ')[0]);
            } else if (index === currentStatusIndex && app.modified) {
                actualDate = frappe.datetime.str_to_user(app.modified.split(' ')[0]);
            } else if (index < currentStatusIndex) {
                // For past completed stages, use modified date or today
                actualDate = app.modified ? frappe.datetime.str_to_user(app.modified.split(' ')[0]) : frappe.datetime.str_to_user(new Date().toISOString().split('T')[0]);
            }
        }

        return {
            code: code,
            label: status,
            status: status,
            index: index,
            completed: isCompleted,
            actualDate: actualDate
        };
    });

    // Generate HTML
    let timelineHTML = '<div class="timeline-container">';

    timelineStages.forEach((stage, index) => {
        const isCompleted = stage.completed;
        const isLast = index === timelineStages.length - 1;
        // Force abbreviation - use code only, never label
        const abbreviation = stage.code ? String(stage.code) : getStatusCode(stage.label);

        timelineHTML += `
			<div class="timeline-node-wrapper">
				<div class="timeline-node ${isCompleted ? 'completed' : 'pending'}">
					<span class="node-code">${escapeHtml(abbreviation)}</span>
				</div>
				<div class="timeline-actual-date">${stage.actualDate || '--'}</div>
				${!isLast ? `<div class="timeline-connector ${isCompleted ? 'completed' : 'pending'}"></div>` : ''}
			</div>
		`;
    });

    timelineHTML += '</div>';
    return timelineHTML;
}

function getStatusCode(status) {
    // Generate short codes for statuses
    const codeMap = {
        'Pending': 'P',
        'Processing': 'PR',
        'Offer Letter Received': 'OLR',
        'Financial': 'F',
        'GTE Processing': 'GTE',
        'GTE Approved': 'GTEA',
        'Acceptance': 'A',
        'COE': 'COE',
        'File Lodged': 'FL',
        'Visa': 'V',
        'Enrollment': 'E',
        'On Shore College change': 'OSC',
        'Visa Refused': 'VR',
        'Closed': 'C'
    };

    return codeMap[status] || status.substring(0, 3).toUpperCase();
}

function createStaffContent(app) {
    return `
		<div class="staff-content">
			<div class="staff-item">
				<div class="staff-avatar">
					<i class="fa fa-user"></i>
				</div>
				<div class="staff-info">
					<h4>${escapeHtml(app.agent || 'Not Assigned')}</h4>
					<p>Agent</p>
				</div>
			</div>
		</div>
	`;
}

function createProgramsContent(app) {
    let coursesHTML = '';
    if (app.preferred_courses && app.preferred_courses.length > 0) {
        coursesHTML = '<div class="courses-list">';
        app.preferred_courses.forEach((course, index) => {
            coursesHTML += `<p><i class="fa fa-graduation-cap"></i> <strong>Course ${index + 1}:</strong> ${escapeHtml(course)}</p>`;
        });
        coursesHTML += '</div>';
    } else {
        coursesHTML = '<p><i class="fa fa-graduation-cap"></i> <strong>Courses:</strong> No courses selected</p>';
    }

    return `
		<div class="programs-content">
			<div class="program-item">
				${coursesHTML}
				<p><i class="fa fa-university"></i> <strong>University:</strong> ${escapeHtml(app.preferred_university || app.university_name || 'N/A')}</p>
				<p><i class="fa fa-calendar"></i> <strong>Intake:</strong> ${escapeHtml(app.intake || 'N/A')}</p>
				${app.university_intake ? `<p><i class="fa fa-calendar-check-o"></i> <strong>University Intake:</strong> ${frappe.datetime.str_to_user(app.university_intake)}</p>` : ''}
			</div>
		</div>
	`;
}

function createDocumentsContent(app) {
    // Show loading state initially
    return `
		<div class="documents-content">
			<div class="documents-loading">
				<div class="spinner-small"></div>
				<p>Loading documents...</p>
			</div>
		</div>
	`;
}

function fetchApplicationDocuments(appName, container) {
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'File',
            filters: {
                attached_to_doctype: 'Application',
                attached_to_name: appName
            },
            fields: ['name', 'file_name', 'file_url', 'file_size', 'is_private', 'creation'],
            order_by: 'creation desc'
        },
        callback: function (response) {
            if (response.message && response.message.length > 0) {
                const files = response.message;
                let filesHTML = '<div class="documents-list">';

                files.forEach((file, index) => {
                    const serialNumber = index + 1;
                    const fileSize = file.file_size ? formatFileSize(file.file_size) : '';
                    const fileDate = file.creation ? frappe.datetime.str_to_user(file.creation.split(' ')[0]) : '';
                    const fileIcon = getFileIcon(file.file_name);
                    // For private files, use the download API endpoint
                    const fileUrl = file.is_private
                        ? `/api/method/frappe.core.doctype.file.file.download_file?file_url=${encodeURIComponent(file.file_url)}`
                        : file.file_url;

                    filesHTML += `
                        <div class="document-item">
                            <div class="document-serial">${serialNumber}.</div>
                            <div class="document-icon">${fileIcon}</div>
                            <div class="document-info">
                                <a href="${fileUrl}" target="_blank" class="document-name" title="${escapeHtml(file.file_name)}">
                                    ${escapeHtml(file.file_name)}
                                </a>
                                <div class="document-meta">
                                    ${fileSize ? `<span class="document-size"><i class="fa fa-hdd-o"></i> ${fileSize}</span>` : ''}
                                    ${fileDate ? `<span class="document-date"><i class="fa fa-calendar"></i> ${fileDate}</span>` : ''}
                                </div>
                            </div>
                            <a href="${fileUrl}" target="_blank" class="document-download" title="Download">
                                <i class="fa fa-download"></i>
                            </a>
                        </div>
                    `;
                });

                filesHTML += '</div>';
                container.innerHTML = filesHTML;
            } else {
                container.innerHTML = `
                    <div class="documents-empty">
                        <i class="fa fa-file-o"></i>
                        <p>No documents uploaded yet</p>
                    </div>
                `;
            }
        },
        error: function () {
            container.innerHTML = `
                <div class="documents-error">
                    <i class="fa fa-exclamation-triangle"></i>
                    <p>Failed to load documents</p>
                </div>
            `;
        }
    });
}

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(fileName) {
    if (!fileName) return '<i class="fa fa-file-o"></i>';
    const ext = fileName.split('.').pop().toLowerCase();
    const iconMap = {
        'pdf': 'fa-file-pdf-o',
        'doc': 'fa-file-word-o',
        'docx': 'fa-file-word-o',
        'xls': 'fa-file-excel-o',
        'xlsx': 'fa-file-excel-o',
        'ppt': 'fa-file-powerpoint-o',
        'pptx': 'fa-file-powerpoint-o',
        'jpg': 'fa-file-image-o',
        'jpeg': 'fa-file-image-o',
        'png': 'fa-file-image-o',
        'gif': 'fa-file-image-o',
        'zip': 'fa-file-archive-o',
        'rar': 'fa-file-archive-o',
        'txt': 'fa-file-text-o'
    };
    const icon = iconMap[ext] || 'fa-file-o';
    return `<i class="fa ${icon}"></i>`;
}

function createNotesContent(app) {
    // Notes tab: inline add note + simple comments list
    return `
		<div class="notes-content">
			<div class="add-comment-inline">
				<input
					type="text"
					id="add-comment-input-${app.name}"
					class="add-comment-input"
					placeholder="Add a note..."
					onkeydown="if (event.key === 'Enter') { event.preventDefault(); addApplicationComment('${app.name}'); }"
				/>
				<button class="add-comment-button" onclick="addApplicationComment('${app.name}')">
					<i class="fa fa-paper-plane"></i>
					Comment
				</button>
			</div>
			<div class="notes-list-container" id="notes-list-${app.name}">
				<div class="notes-loading">
					<div class="spinner-small"></div>
					<p>Loading comments...</p>
				</div>
			</div>
		</div>
	`;
}

function fetchApplicationComments(appName, container) {
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Comment',
            filters: {
                reference_doctype: 'Application',
                reference_name: appName,
                comment_type: 'Comment'
            },
            fields: ['name', 'content', 'owner', 'creation', 'comment_by'],
            order_by: 'creation desc'
        },
        callback: function (response) {
            if (response.message && response.message.length > 0) {
                const comments = response.message;
                let commentsHTML = '<div class="comments-list">';

                comments.forEach((comment) => {
                    const commentDate = comment.creation ? frappe.datetime.str_to_user(comment.creation) : '';
                    const commentBy = comment.comment_by || comment.owner || 'Unknown';
                    // Clean comment content: strip inline styles that might set white color
                    let commentContent = comment.content || 'No content';
                    // Remove style attributes that might contain color: white
                    commentContent = commentContent.replace(/style\s*=\s*["'][^"']*["']/gi, '');
                    // Remove color-related inline styles specifically
                    commentContent = commentContent.replace(/style\s*=\s*["'][^"']*color[^"']*["']/gi, '');

                    commentsHTML += `
                        <div class="comment-item">
                            <div class="comment-header">
                                <div class="comment-author">
                                    <i class="fa fa-user-circle"></i>
                                    <span class="author-name">${escapeHtml(commentBy)}</span>
                                </div>
                                <span class="comment-date">
                                    <i class="fa fa-clock-o"></i> ${commentDate}
                                </span>
                            </div>
                            <div class="comment-body">
                                ${commentContent}
                            </div>
                        </div>
                    `;
                });

                commentsHTML += '</div>';
                container.innerHTML = commentsHTML;
            } else {
                container.innerHTML = `
                    <div class="notes-empty">
                        <i class="fa fa-comment-o"></i>
                        <p>No comments yet</p>
                    </div>
                `;
            }
        },
        error: function () {
            container.innerHTML = `
                <div class="notes-error">
                    <i class="fa fa-exclamation-triangle"></i>
                    <p>Failed to load comments</p>
                </div>
            `;
        }
    });
}

function addApplicationComment(appName) {
    const input = document.getElementById(`add-comment-input-${appName}`);
    if (!input) return;

    const content = input.value.trim();
    if (!content) {
        frappe.show_alert('Please enter a comment before submitting.', 3);
        return;
    }

    frappe.call({
        method: 'frappe.client.insert',
        args: {
            doc: {
                doctype: 'Comment',
                comment_type: 'Comment',
                reference_doctype: 'Application',
                reference_name: appName,
                content: content
            }
        },
        callback: function () {
            frappe.show_alert('Comment added.', 3);
            input.value = '';
            const container = document.getElementById(`notes-list-${appName}`);
            if (container) {
                fetchApplicationComments(appName, container);
            }
        },
        error: function (err) {
            frappe.show_alert('Failed to add comment: ' + (err.message || 'Unknown error'), 5);
        }
    });
}

function fetchApplicationReminders(appName, container) {
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Reminder',
            filters: {
                reminder_doctype: 'Application',
                reminder_docname: appName
            },
            fields: ['name', 'remind_at', 'description', 'notified', 'creation'],
            order_by: 'remind_at asc'
        },
        callback: function (response) {
            if (response.message && response.message.length > 0) {
                const reminders = response.message;
                let remindersHTML = '<div class="reminders-list">';

                reminders.forEach((reminder, index) => {
                    const remindDate = reminder.remind_at ? frappe.datetime.str_to_user(reminder.remind_at) : '';
                    const isPast = reminder.remind_at ? new Date(reminder.remind_at) < new Date() : false;
                    const isNotified = reminder.notified ? true : false;

                    remindersHTML += `
                        <div class="reminder-item ${isPast ? 'past' : ''} ${isNotified ? 'notified' : ''}">
                            <div class="reminder-number">${index + 1}.</div>
                            <div class="reminder-content">
                                <div class="reminder-description">${escapeHtml(reminder.description || 'No description')}</div>
                                <div class="reminder-meta">
                                    <span class="reminder-date"><i class="fa fa-calendar"></i> ${remindDate || 'No date'}</span>
                                    ${isNotified ? '<span class="reminder-status notified-badge"><i class="fa fa-check-circle"></i> Notified</span>' : ''}
                                    ${isPast && !isNotified ? '<span class="reminder-status overdue-badge"><i class="fa fa-exclamation-circle"></i> Overdue</span>' : ''}
                                </div>
                            </div>
                            <button class="reminder-delete" onclick="deleteReminder('${reminder.name}', '${appName}')" title="Delete">
                                <i class="fa fa-trash"></i>
                            </button>
                        </div>
                    `;
                });

                remindersHTML += '</div>';
                container.innerHTML = remindersHTML;
            } else {
                container.innerHTML = `
                    <div class="reminders-empty">
                        <i class="fa fa-bell-o"></i>
                        <p>No reminders set yet</p>
                    </div>
                `;
            }
        },
        error: function () {
            container.innerHTML = `
                <div class="reminders-error">
                    <i class="fa fa-exclamation-triangle"></i>
                    <p>Failed to load reminders</p>
                </div>
            `;
        }
    });
}

function addReminder(appName) {
    const dateInput = document.getElementById(`reminder-date-${appName}`);
    const purposeInput = document.getElementById(`reminder-purpose-${appName}`);

    if (!dateInput || !purposeInput) return;

    const remindAt = dateInput.value;
    const description = purposeInput.value.trim();

    if (!remindAt || !description) {
        frappe.show_alert('Please fill in both date and purpose', 3);
        return;
    }

    // Convert datetime-local to datetime format for Frappe
    // datetime-local format: YYYY-MM-DDTHH:mm
    // Frappe expects: YYYY-MM-DD HH:mm:ss
    const remindAtDatetime = remindAt.replace('T', ' ') + ':00';

    frappe.call({
        method: 'frappe.automation.doctype.reminder.reminder.create_new_reminder',
        args: {
            remind_at: remindAtDatetime,
            description: description,
            reminder_doctype: 'Application',
            reminder_docname: appName
        },
        callback: function (response) {
            if (response.message) {
                frappe.show_alert('Reminder added successfully!', 3);
                // Clear form
                dateInput.value = '';
                purposeInput.value = '';
                // Close modal
                closeReminderModal(appName);
                // Refresh reminders list
                const remindersContainer = document.getElementById(`reminders-list-${appName}`);
                if (remindersContainer) {
                    fetchApplicationReminders(appName, remindersContainer);
                }
            }
        },
        error: function (err) {
            frappe.show_alert('Failed to add reminder: ' + (err.message || 'Unknown error'), 5);
        }
    });
}

function deleteReminder(reminderName, appName) {
    if (!confirm('Are you sure you want to delete this reminder?')) {
        return;
    }

    frappe.call({
        method: 'frappe.client.delete',
        args: {
            doctype: 'Reminder',
            name: reminderName
        },
        callback: function () {
            frappe.show_alert('Reminder deleted successfully!', 3);
            // Refresh reminders list
            const remindersContainer = document.getElementById(`reminders-list-${appName}`);
            if (remindersContainer) {
                fetchApplicationReminders(appName, remindersContainer);
            }
        },
        error: function (err) {
            frappe.show_alert('Failed to delete reminder: ' + (err.message || 'Unknown error'), 5);
        }
    });
}

function createRemindersContent(app) {
    return `
		<div class="reminders-content">
			<div class="reminders-header">
				<div class="reminders-header-left">
					<h4>Reminders</h4>
					<p class="reminders-subtitle">Keep track of follow-ups for this application.</p>
				</div>
				<button type="button" class="btn-add-reminder-trigger" onclick="openReminderModal('${app.name}')">
					<i class="fa fa-plus"></i>
					Add a Reminder
				</button>
			</div>
			<div class="reminders-list-container" id="reminders-list-${app.name}">
				<div class="reminders-loading">
					<div class="spinner-small"></div>
					<p>Loading reminders...</p>
				</div>
			</div>

			<!-- Reminder Modal -->
			<div class="reminder-modal-overlay" id="reminder-modal-${app.name}" style="display: none;">
				<div class="reminder-modal">
					<div class="reminder-modal-header">
						<h4>New Reminder</h4>
						<button type="button" class="reminder-modal-close" onclick="closeReminderModal('${app.name}')">
							<i class="fa fa-times"></i>
						</button>
					</div>
					<form class="reminder-form" id="reminder-form-${app.name}" onsubmit="event.preventDefault(); addReminder('${app.name}');">
						<div class="form-group">
							<label for="reminder-date-${app.name}">Date & Time</label>
							<input type="datetime-local" id="reminder-date-${app.name}" class="form-control" required>
						</div>
						<div class="form-group">
							<label for="reminder-purpose-${app.name}">Purpose</label>
							<textarea id="reminder-purpose-${app.name}" class="form-control" rows="3" placeholder="Enter reminder purpose..." required></textarea>
						</div>
						<div class="reminder-modal-actions">
							<button type="button" class="reminder-cancel-button" onclick="closeReminderModal('${app.name}')">
								Cancel
							</button>
							<button type="submit" class="btn-add-reminder">
								<i class="fa fa-check"></i>
								Save Reminder
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	`;
}

function openReminderModal(appName) {
    const modal = document.getElementById(`reminder-modal-${appName}`);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeReminderModal(appName) {
    const modal = document.getElementById(`reminder-modal-${appName}`);
    if (modal) {
        modal.style.display = 'none';
    }
}

function createPaymentsContent(app) {
    return `
		<div class="payments-content">
			<p class="text-muted">Payments will be displayed here</p>
		</div>
	`;
}

function createChecklistContent(app) {
    return `
		<div class="checklist-content">
			<p class="text-muted">Document Checklist will be displayed here</p>
		</div>
	`;
}

function createCallsContent(app) {
    return `
		<div class="calls-content">
			<p class="text-muted">Call Logs will be displayed here</p>
		</div>
	`;
}

function switchTab(button, tabName, appName) {
    // Remove active class from all tabs in this card
    const card = button.closest('.application-card');
    const allTabs = card.querySelectorAll('.tab-btn');
    allTabs.forEach(tab => tab.classList.remove('active'));

    // Add active class to clicked tab
    button.classList.add('active');

    // Update content area
    const contentArea = card.querySelector('.tab-content-area');

    // Get app data from global storage
    let appData = window.applicationsData[appName];

    if (!appData) {
        // Fallback: fetch the application data
        frappe.call({
            method: 'frappe.client.get',
            args: {
                doctype: 'Application',
                name: appName
            },
            callback: function (response) {
                if (response.message) {
                    window.applicationsData[appName] = response.message;
                    updateTabContent(contentArea, tabName, response.message);
                }
            }
        });
        return;
    }

    updateTabContent(contentArea, tabName, appData);
}

function updateTabContent(contentArea, tabName, appData) {
    let content = '';
    switch (tabName) {
        case 'timeline':
            content = createTimelineContent(appData);
            break;
        case 'staff':
            content = createStaffContent(appData);
            break;
        case 'programs':
            content = createProgramsContent(appData);
            break;
        case 'documents':
            content = createDocumentsContent(appData);
            contentArea.innerHTML = content;
            // Fetch documents asynchronously after rendering the loading state
            setTimeout(() => {
                const documentsContainer = contentArea.querySelector('.documents-content');
                if (documentsContainer) {
                    fetchApplicationDocuments(appData.name, documentsContainer);
                }
            }, 0);
            return;
        case 'notes':
            content = createNotesContent(appData);
            contentArea.innerHTML = content;
            // Fetch comments asynchronously after rendering
            setTimeout(() => {
                const notesContainer = contentArea.querySelector('.notes-list-container');
                if (notesContainer) {
                    fetchApplicationComments(appData.name, notesContainer);
                }
            }, 0);
            return;
        case 'reminders':
            content = createRemindersContent(appData);
            contentArea.innerHTML = content;
            // Fetch reminders asynchronously after rendering
            setTimeout(() => {
                const remindersContainer = contentArea.querySelector('.reminders-list-container');
                if (remindersContainer) {
                    fetchApplicationReminders(appData.name, remindersContainer);
                }
            }, 0);
            return;
        default:
            content = createTimelineContent(appData);
    }

    contentArea.innerHTML = content;
}

function getInitials(name) {
    if (!name || name === 'N/A') return 'NA';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function viewApplication(name) {
    frappe.set_route('Form', 'Application', name);
}

function viewUniversity(name) {
    frappe.set_route('Form', 'University', name);
}

function editStatus(name) {
    viewApplication(name);
}

function openChat(name) {
    frappe.show_alert('Chat functionality coming soon!', 3);
}

function refreshApplications() {
    loadApplications();
}

function showError(message) {
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    if (errorState && errorMessage) {
        errorState.style.display = 'flex';
        errorMessage.textContent = message;
    } else {
        frappe.msgprint(message);
    }
}

function escapeHtml(text) {
    if (!text) return 'N/A';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally available if needed for inline event handlers
window.refreshApplications = refreshApplications;
window.loadApplications = loadApplications;
window.switchTab = switchTab;
window.addReminder = addReminder;
window.deleteReminder = deleteReminder;
window.openReminderModal = openReminderModal;
window.closeReminderModal = closeReminderModal;
window.viewApplication = viewApplication;
window.editStatus = editStatus;
window.openChat = openChat;
window.applyFilters = applyFilters;
window.clearSearch = clearSearch;