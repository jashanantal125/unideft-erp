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

    // Load applications immediately
    loadApplications();
};

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

    // Fetch applications from REST API
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Application',
            fields: [
                'name',
                'student',
                'student_contact_no',
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
            limit_page_length: 100,
            order_by: 'creation desc'
        },
        callback: function (response) {
            loadingState.style.display = 'none';

            if (response.message) {
                const applications = response.message;

                if (applications.length === 0) {
                    emptyState.style.display = 'flex';
                    return;
                }

                // Fetch student details for each application
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
        renderApplications(applications);
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

            renderApplications(applications);
        },
        error: function () {
            // If student fetch fails, render without student details
            renderApplications(applications);
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
							${app.student_contact_no ? `<span class="contact-item"><i class="fa fa-phone"></i> ${escapeHtml(app.student_contact_no)}</span>` : ''}
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
			<button class="tab-btn" data-tab="payments" onclick="switchTab(this, 'payments', '${app.name}')">
				<i class="fa fa-credit-card"></i> Payments
			</button>
			<button class="tab-btn" data-tab="documents" onclick="switchTab(this, 'documents', '${app.name}')">
				<i class="fa fa-file"></i> Documents
			</button>
			<button class="tab-btn" data-tab="checklist" onclick="switchTab(this, 'checklist', '${app.name}')">
				<i class="fa fa-check-square-o"></i> Document Checklist
			</button>
			<button class="tab-btn" data-tab="calls" onclick="switchTab(this, 'calls', '${app.name}')">
				<i class="fa fa-phone"></i> Call Logs
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
    // Timeline stages: AR → CF → AF → SI → OL → TF → VP → VA → EC
    // Map application status progression to an ordered scale
    const statusOrder = [
        '',
        'Application Fee Paid',
        'Started & Submitted',
        'Review & Course Finalizations',
        'Submitted',
        'LOA/OL',
        'Tuition Fee Paid',
        'Visa Applied',
        'Visa Approved',
        'Enrolled and Closed'
    ];

    const currentStatusIndex = statusOrder.indexOf(app.status || '');

    const timelineStages = [
        { code: 'AR', label: 'Application Received', estDate: '01-01-24', minStatusIndex: 0 },
        { code: 'CF', label: 'Course Finalized', estDate: '08-01-24', minStatusIndex: statusOrder.indexOf('Review & Course Finalizations') },
        { code: 'AF', label: 'Application Fee', estDate: '12-01-24', minStatusIndex: statusOrder.indexOf('Application Fee Paid') },
        { code: 'SI', label: 'Started & Submitted', estDate: '16-01-24', minStatusIndex: statusOrder.indexOf('Started & Submitted') },
        { code: 'OL', label: 'Offer Letter', estDate: '22-01-24', minStatusIndex: statusOrder.indexOf('LOA/OL') },
        { code: 'TF', label: 'Tuition Fee', estDate: '28-01-24', minStatusIndex: statusOrder.indexOf('Tuition Fee Paid') },
        { code: 'VP', label: 'Visa Processing', estDate: '05-02-24', minStatusIndex: statusOrder.indexOf('Visa Applied') },
        { code: 'VA', label: 'Visa Approved', estDate: '15-02-24', minStatusIndex: statusOrder.indexOf('Visa Approved') },
        { code: 'EC', label: 'Enrolled & Closed', estDate: '01-03-24', minStatusIndex: statusOrder.indexOf('Enrolled and Closed') }
    ].map(stage => {
        const completed = currentStatusIndex >= stage.minStatusIndex && stage.minStatusIndex !== -1;
        // In absence of per-stage dates, approximate actual date by creation date for AR and
        // by \"today\" for later completed stages
        let actualDate = null;
        if (completed) {
            if (stage.code === 'AR' && app.creation) {
                actualDate = frappe.datetime.str_to_user(app.creation.split(' ')[0]);
            } else {
                const today = new Date().toISOString().split('T')[0];
                actualDate = frappe.datetime.str_to_user(today);
            }
        }
        return {
            ...stage,
            completed,
            actualDate
        };
    });

    let timelineHTML = '<div class="timeline-container">';

    timelineStages.forEach((stage, index) => {
        const isCompleted = stage.actualDate !== null;
        const isLast = index === timelineStages.length - 1;

        timelineHTML += `
			<div class="timeline-node-wrapper">
				<div class="timeline-est-date">${stage.estDate}</div>
				<div class="timeline-node ${isCompleted ? 'completed' : 'pending'}">
					<span class="node-code">${stage.code}</span>
				</div>
				<div class="timeline-actual-date">${stage.actualDate || 'XX-XX-XX'}</div>
				${!isLast ? `<div class="timeline-connector ${isCompleted ? 'completed' : 'pending'}"></div>` : ''}
			</div>
		`;
    });

    timelineHTML += '</div>';
    return timelineHTML;
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
    return `
		<div class="programs-content">
			<div class="program-item">
				<h4>${escapeHtml(app.course_name || app.higher_education || 'N/A')}</h4>
				<p><i class="fa fa-university"></i> ${escapeHtml(app.preferred_university || app.university_name || 'N/A')}</p>
				<p><i class="fa fa-calendar"></i> Intake: ${escapeHtml(app.intake || 'N/A')}</p>
				${app.university_intake ? `<p><i class="fa fa-calendar-check-o"></i> University Intake: ${frappe.datetime.str_to_user(app.university_intake)}</p>` : ''}
			</div>
		</div>
	`;
}

function createDocumentsContent(app) {
    return `
		<div class="documents-content">
			<p class="text-muted">Documents will be displayed here</p>
		</div>
	`;
}

function createNotesContent(app) {
    return `
		<div class="notes-content">
			<p class="text-muted">Notes will be displayed here</p>
		</div>
	`;
}

function createRemindersContent(app) {
    return `
		<div class="reminders-content">
			<p class="text-muted">Reminders will be displayed here</p>
		</div>
	`;
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
            break;
        case 'notes':
            content = createNotesContent(appData);
            break;
        case 'reminders':
            content = createRemindersContent(appData);
            break;
        case 'payments':
            content = createPaymentsContent(appData);
            break;
        case 'checklist':
            content = createChecklistContent(appData);
            break;
        case 'calls':
            content = createCallsContent(appData);
            break;
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
window.viewApplication = viewApplication;
window.editStatus = editStatus;
window.openChat = openChat;
