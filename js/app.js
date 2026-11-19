/**
 * app.js
 * Advanix - Main application orchestrator (frontend prototype).
 *
 * This file ties everything together:
 *   - Updates the navigation bar based on login state
 *   - Initializes each page (landing, jobs, job details, dashboards, profile, auth)
 *   - Renders job cards, dashboards, and forms
 *   - Handles save/unsave, apply, filter, sort, and logout actions
 *   - Shows toast notifications for success/errors
 *
 * All pages use ES modules. Each page's <script type="module"> imports from here.
 */

import {
  getCurrentUser,
  isLoggedIn,
  logout as authLogout,
  login as authLogin,
  register as authRegister,
  updateCurrentUser,
} from './auth.js';

import {
  getAllJobs,
  getJobById,
  filterJobs,
  getFilterOptions,
  applyForJob,
  hasApplied,
  toggleSaveJob,
  isJobSaved,
  getSavedJobIds,
  createJob,
  updateJob,
  deleteJob,
  getJobsByRecruiter,
  getAllApplications,
  updateApplicationStatus,
  getApplicationsForStudent,
} from './jobs.js';
import { seedDemoData } from './storage.js';

import { calculateMatch } from './matching.js';

import {
  getStudentDashboardData,
  getRecruiterDashboardData,
} from './dashboard.js';

/* ------------------------------------------------------------------ */
/*  DOM helpers                                                       */
/* ------------------------------------------------------------------ */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

/**
 * Create an element with optional classes, text, and attributes.
 */
function el(tag, { className, html, text, ...attrs } = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  if (text !== undefined) node.textContent = text;
  Object.entries(attrs).forEach(([key, value]) => {
    if (value !== undefined && value !== null) node.setAttribute(key, value);
  });
  return node;
}

/**
 * Escape HTML to prevent XSS when inserting user-provided text.
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ------------------------------------------------------------------ */
/*  Toast notifications                                               */
/* ------------------------------------------------------------------ */

let toastContainer = null;

function ensureToastContainer() {
  if (!toastContainer) {
    toastContainer = el('div', {
      className:
        'fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none',
    });
    document.body.appendChild(toastContainer);
  }
}

/**
 * Show a toast message.
 * @param {string} message
 * @param {string} type - 'success' | 'error' | 'info'
 */
export function showToast(message, type = 'info') {
  ensureToastContainer();
  const colors = {
    success: 'bg-green-600',
    error: 'bg-rose-600',
    info: 'bg-slate-800',
  };
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-circle-exclamation',
    info: 'fa-info-circle',
  };

  const toast = el('div', {
    className:
      'flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white min-w-[300px] animate-slide-in pointer-events-auto',
    style: `background:${colors[type] || colors.info}`,
  });
  toast.innerHTML = `
    <i class="fas ${icons[type]}"></i>
    <span>${escapeHtml(message)}</span>
    <button onclick="this.parentElement.remove()" class="ml-3 opacity-70 hover:opacity-100">&times;</button>
  `;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ------------------------------------------------------------------ */
/*  Navigation & auth state                                           */
/* ------------------------------------------------------------------ */

/**
 * Update the navigation bar to reflect login state and role.
 */
export function updateNavbar() {
  const navLinks = $('#nav-links');
  const authBtns = $('#auth-btns');
  const userAvatar = $('#user-avatar');
  const userName = $('#user-name');
  const mobileMenu = $('#mobile-menu');
  const mobileAuth = $('#mobile-auth');

  const user = getCurrentUser();

  // Desktop nav links
  if (navLinks) {
    const isAuthPage = document.body.classList.contains('auth-page');
    if (isLoggedIn()) {
      navLinks.innerHTML = `
        <a href="index.html" class="nav-link ${isActivePage('index.html') ? 'active' : ''}">Home</a>
        <a href="jobs.html" class="nav-link ${isActivePage('jobs.html') ? 'active' : ''}">Find Jobs</a>
        <a href="companies.html" class="nav-link">Companies</a>
        <a href="about.html" class="nav-link">About</a>
      `;
      if (user.role === 'student') {
        navLinks.innerHTML += `
          <a href="student-dashboard.html" class="nav-link ${isActivePage('student-dashboard.html') ? 'active' : ''}">Dashboard</a>
          <a href="profile.html" class="nav-link ${isActivePage('profile.html') ? 'active' : ''}">Profile</a>
        `;
      } else {
        navLinks.innerHTML += `
          <a href="recruiter-dashboard.html" class="nav-link ${isActivePage('recruiter-dashboard.html') ? 'active' : ''}">Dashboard</a>
        `;
      }
    } else {
      navLinks.innerHTML = `
        <a href="index.html" class="nav-link ${isActivePage('index.html') ? 'active' : ''}">Home</a>
        <a href="jobs.html" class="nav-link ${isActivePage('jobs.html') ? 'active' : ''}">Find Jobs</a>
        <a href="companies.html" class="nav-link">Companies</a>
        <a href="about.html" class="nav-link">About</a>
      `;
    }
  }

  // Desktop auth buttons
  if (authBtns) {
    if (isLoggedIn()) {
      authBtns.innerHTML = `
        <div class="flex items-center gap-3 ml-4">
          <div class="flex items-center gap-2 text-sm text-slate-600">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
              ${user.fullName.charAt(0).toUpperCase()}
            </div>
            <span class="hidden sm:block">${escapeHtml(user.fullName)}</span>
          </div>
          <button onclick="handleLogout()" class="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition text-sm font-medium">Logout</button>
        </div>
      `;
    } else {
      authBtns.innerHTML = `
        <a href="login.html" class="px-4 py-2 text-slate-600 hover:text-indigo-600 transition text-sm font-medium">Log in</a>
        <a href="register.html" class="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition shadow-lg hover:shadow-xl text-sm font-medium">Sign up</a>
      `;
    }
  }

  // Mobile menu
  if (mobileMenu) {
    if (isLoggedIn()) {
      const dashboardLink =
        user.role === 'student'
          ? '<a href="student-dashboard.html" class="block px-4 py-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition">Dashboard</a>'
          : '<a href="recruiter-dashboard.html" class="block px-4 py-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition">Dashboard</a>';
      mobileMenu.innerHTML = `
        <a href="index.html" class="block px-4 py-3 ${isActivePage('index.html') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'} rounded-lg transition">Home</a>
        <a href="jobs.html" class="block px-4 py-3 ${isActivePage('jobs.html') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'} rounded-lg transition">Find Jobs</a>
        <a href="about.html" class="block px-4 py-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition">About</a>
        ${dashboardLink}
        <a href="profile.html" class="block px-4 py-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition">Profile</a>
        <button onclick="handleLogout()" class="block w-full text-left px-4 py-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition">Logout</button>
      `;
    } else {
      mobileMenu.innerHTML = `
        <a href="index.html" class="block px-4 py-3 ${isActivePage('index.html') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'} rounded-lg transition">Home</a>
        <a href="jobs.html" class="block px-4 py-3 ${isActivePage('jobs.html') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'} rounded-lg transition">Find Jobs</a>
        <a href="about.html" class="block px-4 py-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition">About</a>
        <a href="login.html" class="block px-4 py-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition">Log in</a>
        <a href="register.html" class="block px-4 py-3 bg-indigo-600 text-white rounded-lg transition">Sign up</a>
      `;
    }
  }

  // Mobile auth (small screens - show in header if needed)
  if (mobileAuth && !isLoggedIn()) {
    mobileAuth.innerHTML = `
      <a href="login.html" class="text-sm text-slate-600 hover:text-indigo-600">Log in</a>
      <a href="register.html" class="ml-3 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition">Sign up</a>
    `;
  }
}

/**
 * Check if the current page matches a filename.
 */
function isActivePage(filename) {
  return location.pathname.split('/').pop() === filename;
}

/**
 * Global logout handler.
 */
window.handleLogout = function () {
  authLogout();
  showToast('Logged out successfully.', 'success');
  setTimeout(() => {
    location.href = 'index.html';
  }, 600);
};

/* ------------------------------------------------------------------ */
/*  Job card rendering                                                */
/* ------------------------------------------------------------------ */

/**
 * Render a single job card element.
 * @param {Object} job
 * @param {Object} options { userId, showSave, showApply, onSaveToggle, onApply }
 * @returns {HTMLElement}
 */
export function renderJobCard(job, options = {}) {
  const {
    userId = null,
    showSave = true,
    showApply = true,
    onSaveToggle,
    onApply,
    compact = false,
  } = options;

  const isSaved = userId ? isJobSaved(userId, job.id) : false;
  const applied = userId ? hasApplied(userId, job.id) : false;
  const demoBadge = job.isDemo
    ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200"><i class="fas fa-flask"></i> Demo</span>'
    : '';

  const saveIcon = isSaved ? 'fa-heart' : 'fa-heart';
  const saveText = isSaved ? 'Saved' : 'Save';
  const saveClasses = isSaved
    ? 'text-rose-500 bg-rose-50 border-rose-200'
    : 'text-slate-400 hover:text-indigo-600 border-slate-200';

  const card = el('article', {
    className:
      'job-card bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 group',
  });

  card.innerHTML = `
    <div class="h-48 bg-gradient-to-br from-indigo-50 to-purple-50 relative overflow-hidden">
      <img src="${escapeHtml(job.companyLogo)}" alt="${escapeHtml(job.company)} logo" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(job.company)}&background=4F46E5&color=fff'">
      <div class="absolute top-3 right-3">
        ${demoBadge}
      </div>
      <div class="absolute top-3 left-3 ${showSave ? 'pl-10' : ''}">
        <button onclick="event.stopPropagation(); window.handleJobSave('${job.id}')" class="w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:bg-white transition border border-slate-200 ${saveClasses}">
          <i class="fas ${saveIcon} ${isSaved ? 'text-rose-500' : 'text-slate-500'}"></i>
        </button>
      </div>
    </div>
    <div class="p-5">
      <div class="flex justify-between items-start mb-2">
        <div>
          <h3 class="text-lg font-bold text-slate-800 leading-tight">${escapeHtml(job.title)}</h3>
          <p class="text-sm font-medium text-indigo-600 mt-1">${escapeHtml(job.company)}</p>
        </div>
      </div>
      <div class="flex items-center gap-3 text-sm text-slate-500 mb-4">
        <span><i class="fas fa-map-marker-alt mr-1.5 text-indigo-500"></i>${escapeHtml(job.location)}</span>
        <span class="px-2 py-0.5 rounded border border-slate-200">${escapeHtml(job.jobType)}</span>
        <span><i class="fas fa-clock mr-1 text-slate-400"></i>${escapeHtml(job.experience)}</span>
      </div>
      <div class="flex items-center justify-between mb-4">
        <span class="text-lg font-bold text-slate-700">${escapeHtml(job.salary)}</span>
        <span class="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded">${escapeHtml(job.workMode)}</span>
      </div>
      <div class="flex flex-wrap gap-2 mb-4">
        ${(job.requiredSkills || [])
          .slice(0, 5)
          .map(
            (skill) =>
              `<span class="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded border border-indigo-100">${escapeHtml(skill)}</span>`
          )
          .join('')}
        ${(job.requiredSkills || []).length > 5
          ? `<span class="text-xs text-slate-400">+${(job.requiredSkills.length - 5)} more</span>`
          : ''}
      </div>
      <div class="text-xs text-slate-400 mb-5 border-t border-slate-50 pt-3 flex items-center gap-2">
        <i class="fas fa-calendar mr-1"></i>
        Posted ${escapeHtml(formatRelativeDate(job.postedDate))} &bull; Source: ${escapeHtml(job.source)}
      </div>
      <div class="grid grid-cols-2 gap-3">
        ${
          showApply
            ? `<button onclick="window.handleJobApply('${job.id}')" class="${applied ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'} py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed" ${applied ? 'disabled' : ''}>
              ${applied ? 'Applied' : 'Apply Now'}
            </button>`
            : ''
        }
        <button onclick="window.viewJobDetails('${job.id}')" class="py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition">
          Details
        </button>
      </div>
    </div>
  `;

  return card;
}

/* ------------------------------------------------------------------ */
/*  Global window handlers (used by inline onclick in HTML)           */
/* ------------------------------------------------------------------ */

/**
 * Handle save/unsave job from a card.
 */
window.handleJobSave = function (jobId) {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please log in to save jobs.', 'error');
    setTimeout(() => (location.href = 'login.html'), 800);
    return;
  }

  const result = toggleSaveJob(user.id, jobId);
  showToast(result.message, result.success ? 'success' : 'error');

  // Re-render current page if it displays save state
  if (isActivePage('jobs.html') && window.renderJobsPage) {
    window.renderJobsPage();
  }
  if (isActivePage('job-details.html') && window.renderJobDetailPage) {
    window.renderJobDetailPage();
  }
};

/**
 * Handle apply for job from a card.
 */
window.handleJobApply = function (jobId) {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please log in to apply for jobs.', 'error');
    setTimeout(() => (location.href = 'login.html'), 800);
    return;
  }

  if (hasApplied(user.id, jobId)) {
    showToast('You have already applied to this job.', 'error');
    return;
  }

  const job = getJobById(jobId);
  if (!job) {
    showToast('Job not found.', 'error');
    return;
  }

  const result = applyForJob({
    studentId: user.id,
    jobId,
    studentName: user.fullName,
    studentEmail: user.email,
    resumeUrl: user.resumeUrl || '',
  });

  showToast(result.message, result.success ? 'success' : 'error');

  if (result.success) {
    if (isActivePage('jobs.html') && window.renderJobsPage) {
      window.renderJobsPage();
    }
    if (isActivePage('job-details.html') && window.renderJobDetailPage) {
      window.renderJobDetailPage();
    }
  }
};

/**
 * View job details (navigate to job-details.html with id).
 */
window.viewJobDetails = function (jobId) {
  location.href = `job-details.html?id=${jobId}`;
};

/* ------------------------------------------------------------------ */
/*  Date helper                                                       */
/* ------------------------------------------------------------------ */

function formatRelativeDate(dateStr) {
  const posted = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - posted) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  return posted.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  Page initializers (assigned to window for HTML inline use)        */
/* ------------------------------------------------------------------ */

/**
 * Landing page: render featured jobs and categories.
 */
window.initLandingPage = function () {
  const featuredContainer = $('#featured-jobs-grid');
  if (!featuredContainer) return;

  const jobs = getAllJobs()
    .sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate))
    .slice(0, 6);

  featuredContainer.innerHTML = jobs.map((job) => renderJobCard(job, { compact: true })).join('');

  // Make cards clickable
  $$('#featured-jobs-grid .job-card').forEach((card, index) => {
    card.addEventListener('click', () => {
      viewJobDetails(jobs[index].id);
    });
  });
};

/**
 * Jobs search page: render filters and job list.
 */
window.initJobsPage = function () {
  const user = getCurrentUser();
  const userId = user ? user.id : null;

  const searchInput = $('#job-search');
  const locationFilter = $('#filter-location');
  const typeFilter = $('#filter-job-type');
  const workModeFilter = $('#filter-work-mode');
  const experienceFilter = $('#filter-experience');
  const salaryFilter = $('#filter-salary');
  const sortSelect = $('#sort-select');
  const resultsContainer = $('#jobs-list');
  const resultsCount = $('#results-count');
  const clearFiltersBtn = $('#clear-filters');

  // Populate filter options
  const options = getFilterOptions();
  const fillSelect = (selectEl, values, label) => {
    if (!selectEl) return;
    selectEl.innerHTML = `<option value="">${label}</option>` + values.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  };

  fillSelect(locationFilter, options.locations, 'All Locations');
  fillSelect(typeFilter, options.jobTypes, 'All Job Types');
  fillSelect(workModeFilter, options.workModes, 'All Work Modes');
  fillSelect(experienceFilter, options.experiences, 'All Experience Levels');

  // State
  let state = {
    query: '',
    location: '',
    jobType: '',
    workMode: '',
    experience: '',
    minSalary: '',
    sortBy: 'newest',
  };

  function render() {
    const jobs = filterJobs(state);
    if (resultsCount) resultsCount.textContent = jobs.length;
    if (resultsContainer) {
      resultsContainer.innerHTML = jobs
        .map((job) =>
          renderJobCard(job, {
            userId,
            showSave: true,
            showApply: true,
          }).outerHTML
        )
        .join('');

      // Re-attach click handlers for card details
      resultsContainer.querySelectorAll('.job-card').forEach((card, index) => {
        card.addEventListener('click', (e) => {
          // Ignore clicks on buttons inside card
          if (e.target.closest('button')) return;
          viewJobDetails(jobs[index].id);
        });
      });
    }
  }

  // Wire up inputs
  const bind = (el, key, getter) => {
    if (!el) return;
    el.addEventListener('change', () => {
      state[key] = getter(el);
      render();
    });
    el.addEventListener('input', () => {
      state[key] = getter(el);
      render();
    });
  };

  bind(searchInput, 'query', (e) => e.value.trim());
  bind(locationFilter, 'location', (e) => e.value);
  bind(typeFilter, 'jobType', (e) => e.value);
  bind(workModeFilter, 'workMode', (e) => e.value);
  bind(experienceFilter, 'experience', (e) => e.value);
  bind(salaryFilter, 'minSalary', (e) => e.value);
  bind(sortSelect, 'sortBy', (e) => e.value);

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      state = {
        query: '',
        location: '',
        jobType: '',
        workMode: '',
        experience: '',
        minSalary: '',
        sortBy: 'newest',
      };
      if (searchInput) searchInput.value = '';
      if (locationFilter) locationFilter.value = '';
      if (typeFilter) typeFilter.value = '';
      if (workModeFilter) workModeFilter.value = '';
      if (experienceFilter) experienceFilter.value = '';
      if (salaryFilter) salaryFilter.value = '';
      if (sortSelect) sortSelect.value = 'newest';
      render();
      showToast('Filters cleared.', 'info');
    });
  }

  render();

  // Expose for external re-render (e.g. after save/apply)
  window.renderJobsPage = render;
};

/**
 * Job details page: render full job info + match + apply/save.
 */
window.initJobDetailsPage = function () {
  const params = new URLSearchParams(location.search);
  const jobId = params.get('id');
  const job = getJobById(jobId);

  if (!job) {
    document.body.innerHTML = `
      <div class="max-w-xl mx-auto py-20 text-center">
        <div class="bg-rose-50 border border-rose-100 rounded-2xl p-8 text-rose-800">
          <h2 class="text-xl font-bold mb-2">Job not found</h2>
          <p class="mb-6">The job listing you are looking for does not exist.</p>
          <a href="jobs.html" class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition">Browse Jobs</a>
        </div>
      </div>
    `;
    return;
  }

  const user = getCurrentUser();
  const userId = user ? user.id : null;

  // Render hero header
  const hero = $('#job-hero');
  if (hero) {
    hero.innerHTML = `
      <div class="flex items-center gap-4 mb-4">
        <img src="${escapeHtml(job.companyLogo)}" alt="${escapeHtml(job.company)}" class="w-12 h-12 rounded-lg" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(job.company)}&background=4F46E5&color=fff'">
        <div>
          <h2 class="text-xl font-bold text-slate-800">${escapeHtml(job.company)}</h2>
          <span class="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">${job.isDemo ? 'Demo Listing' : 'Recruiter Posted'}</span>
        </div>
      </div>
      <h1 class="text-3xl font-bold text-slate-900 mb-3">${escapeHtml(job.title)}</h1>
      <div class="flex items-center gap-3 text-sm text-slate-500 mb-6">
        <span><i class="fas fa-map-marker-alt mr-1.5 text-indigo-500"></i>${escapeHtml(job.location)}</span>
        <span><i class="fas fa-clock mr-1 text-slate-400"></i>${escapeHtml(job.jobType)}</span>
        <span><i class="fas fa-laptop-code mr-1 text-slate-400"></i>${escapeHtml(job.workMode)}</span>
        <span><i class="fas fa-rupee-sign mr-1 text-slate-400"></i>${escapeHtml(job.salary)}</span>
        <span><i class="fas fa-calendar mr-1 text-slate-400"></i>${escapeHtml(job.experience)}</span>
        <span><i class="fas fa-calendar-alt mr-1 text-slate-400"></i>Deadline: ${escapeHtml(job.deadline)}</span>
      </div>
    `;
  }

  // Render details sections
  const jobDetailsContent = $('#job-details-content');
  if (jobDetailsContent) {
    jobDetailsContent.innerHTML = `
      <div class="space-y-8">
        <section>
          <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2 mb-3"><i class="fas fa-file-alt text-indigo-600"></i>Job Description</h3>
          <p class="text-slate-600 leading-relaxed">${escapeHtml(job.description)}</p>
        </section>

        <section>
          <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2 mb-3"><i class="fas fa-list-check text-indigo-600"></i>Responsibilities</h3>
          <ul class="list-disc list-inside text-slate-600 leading-relaxed space-y-2">
            ${(job.responsibilities || []).map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
          </ul>
        </section>

        <section>
          <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2 mb-3"><i class="fas fa-graduation-cap text-indigo-600"></i>Required Qualifications</h3>
          <ul class="list-disc list-inside text-slate-600 leading-relaxed space-y-2">
            ${(job.qualifications || []).map((q) => `<li>${escapeHtml(q)}</li>`).join('')}
          </ul>
        </section>

        <section>
          <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2 mb-3"><i class="fas fa-cogs text-indigo-600"></i>Required Skills</h3>
          <div class="flex flex-wrap gap-2">
            ${(job.requiredSkills || []).map((s) => `<span class="bg-indigo-50 text-indigo-700 text-sm px-3 py-1.5 rounded-full border border-indigo-100 font-medium">${escapeHtml(s)}</span>`).join('')}
          </div>
        </section>

        ${
          user && user.role === 'student'
            ? `
            <section class="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
              <h3 class="text-lg font-bold text-slate-800 mb-3">Skill Match with Your Profile</h3>
              <div class="space-y-4">
                <div>
                  <div class="flex justify-between mb-1">
                    <span class="text-sm font-medium text-slate-600">Match Percentage</span>
                    <span class="text-lg font-bold text-indigo-600" id="match-percent">Calculating...</span>
                  </div>
                  <div class="w-full bg-slate-200 rounded-full h-3">
                    <div id="match-bar" class="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-700" style="width: 0%"></div>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div class="bg-white p-3 rounded-xl border border-slate-100">
                    <p class="text-xs font-semibold text-green-600 mb-2">Matching Skills</p>
                    <div class="flex flex-wrap gap-1" id="matching-skills">
                      <span class="text-xs text-slate-400 italic">Loading...</span>
                    </div>
                  </div>
                  <div class="bg-white p-3 rounded-xl border border-slate-100">
                    <p class="text-xs font-semibold text-rose-600 mb-2">Missing Skills (Skill Gap)</p>
                    <div class="flex flex-wrap gap-1" id="missing-skills">
                      <span class="text-xs text-slate-400 italic">Loading...</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            `
            : ''
        }
      </div>
    `;

    // Compute match if student
    if (user && user.role === 'student') {
      const match = calculateMatch(user.skills || [], job.requiredSkills || []);
      const percentEl = $('#match-percent');
      const barEl = $('#match-bar');
      const matchingEl = $('#matching-skills');
      const missingEl = $('#missing-skills');

      if (percentEl) percentEl.textContent = `${match.matchPercentage}%`;
      if (barEl) barEl.style.width = `${match.matchPercentage}%`;
      if (matchingEl) {
        matchingEl.innerHTML = match.matchingSkills
          .map((s) => `<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">${escapeHtml(s)}</span>`)
          .join('') || '<span class="text-xs text-slate-400 italic">None</span>';
      }
      if (missingEl) {
        missingEl.innerHTML = match.missingSkills
          .map((s) => `<span class="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded">${escapeHtml(s)}</span>`)
          .join('') || '<span class="text-xs text-slate-400 italic">None</span>';
      }
    }
  }

  // Action buttons
  const actionContainer = $('#job-actions');
  if (actionContainer) {
    const isSaved = userId ? isJobSaved(userId, job.id) : false;
    const applied = userId ? hasApplied(userId, job.id) : false;

    actionContainer.innerHTML = `
      ${
        user
          ? `
          <button onclick="window.handleJobSave('${job.id}')" id="save-btn" class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition ${isSaved ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600'} border">
            <i class="fas fa-heart"></i> ${isSaved ? 'Saved' : 'Save Job'}
          </button>
          <button onclick="window.handleJobApply('${job.id}')" class="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition ${applied ? 'opacity-80' : ''}" ${applied ? 'disabled' : ''}>
            ${applied ? 'Already Applied' : 'Apply Now'}
          </button>
          `
          : `
          <a href="login.html" class="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold text-sm text-center shadow-lg hover:shadow-xl transition">Log in to Apply</a>
          `
        }
    `;
  }

  // Expose re-render
  window.renderJobDetailPage = () => {
    initJobDetailsPage();
  };
};

/* ------------------------------------------------------------------ */
/*  Student dashboard                                                 */
/* ------------------------------------------------------------------ */

window.initStudentDashboard = function () {
  const data = getStudentDashboardData();
  if (!data) return;

  // Welcome
  const welcome = $('#welcome-user');
  if (welcome) welcome.textContent = `Hi, ${data.user.fullName}`;

  // Stats
  setStat('stat-total-jobs', data.totalJobs);
  setStat('stat-saved-jobs', data.savedJobs);
  setStat('stat-applied-jobs', data.appliedJobs);

  // Profile completion
  const completion = calculateProfileCompletion(data.user);
  const completionBar = $('#profile-completion-bar');
  const completionText = $('#profile-completion-text');
  if (completionBar) completionBar.style.width = `${completion}%`;
  if (completionText) completionText.textContent = `${completion}% Complete`;

  // Avg match
  const avgMatchEl = $('#avg-match');
  if (avgMatchEl) {
    avgMatchEl.innerHTML = `
      <div class="w-full bg-slate-200 rounded-full h-2.5">
        <div class="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full" style="width: ${data.avgMatch}%"></div>
      </div>
      <p class="text-xs text-slate-500 mt-1">Average match across all jobs</p>
    `;
  }

  // Recommended jobs
  renderRecommendations(data.recommendedJobs, data.user.id);

  // Recent jobs
  renderRecentJobs(data.recentJobs);

  // Application status
  renderApplicationStatus(data.statusCounts);
};

function setStat(id, value) {
  const el = $(`#${id}`);
  if (el) el.textContent = value;
}

function calculateProfileCompletion(user) {
  let fields = 0;
  let filled = 0;
  const checks = ['fullName', 'college', 'degree', 'graduationYear', 'skills', 'resumeUrl'];
  checks.forEach((field) => {
    fields++;
    const val = user[field];
    if (val !== undefined && val !== null && val !== '') {
      if (Array.isArray(val)) {
        if (val.length > 0) filled++;
      } else filled++;
    }
  });
  return fields === 0 ? 0 : Math.round((filled / fields) * 100);
}

function renderRecommendations(jobs, studentId) {
  const container = $('#recommended-jobs');
  if (!container) return;
  container.innerHTML = jobs
    .map((job) => {
      const match = job.match || calculateMatch((getCurrentUser() || {}).skills || [], job.requiredSkills || []);
      return recommendationCard(job, match, studentId);
    })
    .join('');
}

function recommendationCard(job, match, studentId) {
  const isSaved = isJobSaved(studentId, job.id);
  const applied = hasApplied(studentId, job.id);
  return `
    <article class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition">
      <div class="p-5">
        <div class="flex justify-between items-start mb-3">
          <div>
            <h3 class="text-lg font-bold text-slate-800">${escapeHtml(job.title)}</h3>
            <p class="text-sm text-indigo-600 font-medium mt-0.5">${escapeHtml(job.company)}</p>
          </div>
          <span class="text-xs font-bold px-2 py-0.5 rounded-full ${match.badgeColor}">${match.badge}</span>
        </div>
        <div class="flex items-center gap-3 text-sm text-slate-500 mb-3">
          <span><i class="fas fa-map-marker-alt mr-1 text-slate-400"></i>${escapeHtml(job.location)}</span>
          <span><i class="fas fa-rupee-sign mr-1 text-slate-400"></i>${escapeHtml(job.salary)}</span>
        </div>
        <div class="flex flex-wrap gap-1 mb-4">
          ${(job.requiredSkills || []).slice(0, 4).map((s) => `<span class="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded">${escapeHtml(s)}</span>`).join('')}
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button onclick="window.handleJobApply('${job.id}')" class="py-2 rounded-xl font-semibold text-sm ${applied ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'}" ${applied ? 'disabled' : ''}>
            ${applied ? 'Applied' : 'Apply'}
          </button>
          <button onclick="window.handleJobSave('${job.id}')" class="py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition">
            ${isSaved ? 'Saved' : 'Save'}
          </button>
        </div>
        <div class="mt-3 pt-3 border-t border-slate-50">
          <div class="flex justify-between text-xs mb-1">
            <span class="text-slate-500">Match</span>
            <span class="font-bold text-indigo-600">${match.matchPercentage}%</span>
          </div>
          <div class="w-full bg-slate-200 rounded-full h-2">
            <div class="bg-indigo-500 h-2 rounded-full" style="width: ${match.matchPercentage}%"></div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderRecentJobs(jobs) {
  const container = $('#recent-jobs');
  if (!container) return;
  container.innerHTML = jobs
    .map(
      (job) => `
      <article class="flex items-center gap-4 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition cursor-pointer group" onclick="window.viewJobDetails('${job.id}')">
        <img src="${escapeHtml(job.companyLogo)}" class="w-10 h-10 rounded-lg object-cover" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(job.company)}&background=4F46E5&color=fff'">
        <div class="flex-1">
          <h4 class="text-sm font-bold text-slate-800">${escapeHtml(job.title)}</h4>
          <p class="text-xs text-slate-500">${escapeHtml(job.company)} &bull; ${escapeHtml(job.location)}</p>
        </div>
        <span class="text-xs text-indigo-600 font-medium">${escapeHtml(job.salary)}</span>
      </article>
    `
    )
    .join('');
}

function renderApplicationStatus(counts) {
  const container = $('#application-status');
  if (!container) return;
  container.innerHTML = `
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-blue-50 rounded-2xl p-4">
        <p class="text-xs font-semibold text-blue-600 mb-1">Pending</p>
        <p class="text-2xl font-bold text-slate-800">${counts.Pending}</p>
      </div>
      <div class="bg-indigo-50 rounded-2xl p-4">
        <p class="text-xs font-semibold text-indigo-600 mb-1">Shortlisted</p>
        <p class="text-2xl font-bold text-slate-800">${counts.Shortlisted}</p>
      </div>
      <div class="bg-rose-50 rounded-2xl p-4">
        <p class="text-xs font-semibold text-rose-600 mb-1">Rejected</p>
        <p class="text-2xl font-bold text-slate-800">${counts.Rejected}</p>
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/*  Recruiter dashboard                                               */
/* ------------------------------------------------------------------ */

window.initRecruiterDashboard = function () {
  const data = getRecruiterDashboardData();
  if (!data) return;

  const welcome = $('#welcome-user');
  if (welcome) welcome.textContent = `Hi, ${data.user.fullName}`;

  setStat('stat-active-jobs', data.totalJobs);
  setStat('stat-total-apps', data.totalApplications);
  setStat('stat-shortlisted', data.shortlisted);

  // Recent applications
  const container = $('#recent-applications');
  if (container) {
    if (data.recentApplications.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10">
          <i class="fas fa-inbox text-slate-300 text-3xl mb-3"></i>
          <p class="text-slate-500">No applications yet. Post a job to start receiving applications.</p>
        </div>
      `;
    } else {
      container.innerHTML = data.recentApplications
        .map(
          (app) => `
          <div class="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:shadow-sm transition">
            <div>
              <p class="text-sm font-bold text-slate-800">${escapeHtml(app.studentName)}</p>
              <p class="text-xs text-slate-500">${escapeHtml(app.studentEmail)}</p>
              <p class="text-xs text-indigo-600 font-medium mt-1">${escapeHtml(app.jobTitle)}</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="px-3 py-1 rounded-full text-xs font-semibold ${app.status === 'Shortlisted' ? 'bg-green-100 text-green-700' : app.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}">
                ${app.status}
              </span>
              <div class="flex gap-2">
                <button onclick="window.updateAppStatus('${app.id}', 'Shortlisted')" class="text-xs text-green-600 hover:bg-green-50 px-2 py-1 rounded">Shortlist</button>
                <button onclick="window.updateAppStatus('${app.id}', 'Rejected')" class="text-xs text-rose-600 hover:bg-rose-50 px-2 py-1 rounded">Reject</button>
              </div>
            </div>
          </div>
        `
        )
        .join('');
    }
  }

  // Manage jobs list (recruiter's own jobs)
  const manageJobsContainer = $('#manage-jobs-list');
  if (manageJobsContainer) {
    renderRecruiterJobs(data.jobs);
  }
};

window.updateAppStatus = function (appId, status) {
  const result = updateApplicationStatus(appId, status);
  showToast(result.message, result.success ? 'success' : 'error');
  if (result.success) {
    initRecruiterDashboard();
  }
};

function renderRecruiterJobs(jobs) {
  const container = $('#manage-jobs-list');
  if (!container) return;
  if (jobs.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10">
        <i class="fas fa-briefcase text-slate-300 text-3xl mb-3"></i>
        <p class="text-slate-500">You haven't posted any jobs yet.</p>
        <button onclick="location.href='recruiter-dashboard.html#postjob'" class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition mt-4 inline-block">Post Your First Job</button>
      </div>
    `;
    return;
  }
  container.innerHTML = jobs
    .map(
      (job) => `
      <div class="bg-white rounded-xl border border-slate-100 p-5 mb-4 shadow-sm hover:shadow-md transition">
        <div class="flex justify-between items-start mb-3">
          <div>
            <h4 class="text-lg font-bold text-slate-800">${escapeHtml(job.title)}</h4>
            <p class="text-sm text-slate-500">${escapeHtml(job.company)} &bull; ${escapeHtml(job.location)}</p>
          </div>
          <span class="text-xs font-medium px-2 py-0.5 rounded ${job.isDemo ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}">
            ${job.isDemo ? 'Demo' : 'Active'}
          </span>
        </div>
        <div class="flex items-center gap-3 text-sm text-slate-500 mb-4">
          <span>${escapeHtml(job.jobType)}</span>
          <span>${escapeHtml(job.workMode)}</span>
          <span>${escapeHtml(job.salary)}</span>
        </div>
        <div class="flex gap-2">
          <button onclick="window.editJob('${job.id}')" class="flex-1 bg-indigo-50 text-indigo-600 py-2 rounded-lg text-sm font-medium border border-indigo-100 hover:bg-indigo-100 transition">Edit</button>
          <button onclick="window.deleteJob('${job.id}')" class="flex-1 bg-rose-50 text-rose-600 py-2 rounded-lg text-sm font-medium border border-rose-100 hover:bg-rose-100 transition">Delete</button>
        </div>
      </div>
    `
    )
    .join('');
}

window.editJob = function (jobId) {
  const jobs = getAllJobs();
  const job = jobs.find((j) => j.id === jobId);
  if (!job) return;
  const user = getCurrentUser();
  if (job.postedBy !== user.id) {
    showToast('You can only edit your own jobs.', 'error');
    return;
  }

  // Fill the post-job form modal with existing data and set mode to edit
  const form = $('#post-job-form');
  const modal = $('#post-job-modal');
  const modalTitle = $('#post-job-modal-title');
  const submitBtn = $('#post-job-submit');

  if (!form || !modal) return;

  modalTitle.textContent = 'Edit Job Listing';
  submitBtn.textContent = 'Update Job';
  submitBtn.dataset.editId = jobId;

  // Fill fields
  setFormValue('job-title', job.title);
  setFormValue('job-company', job.company);
  setFormValue('job-description', job.description);
  setFormValue('job-skills', (job.requiredSkills || []).join(', '));
  setFormValue('job-location', job.location);
  setFormValue('job-salary', job.salary);
  setFormValue('job-type', job.jobType);
  setFormValue('job-workmode', job.workMode);
  setFormValue('job-experience', job.experience);
  setFormValue('job-deadline', job.deadline);

  modal.classList.remove('hidden');
};

window.deleteJob = function (jobId) {
  if (!confirm('Are you sure you want to delete this job listing?')) return;
  const user = getCurrentUser();
  const result = deleteJob(jobId, user.id);
  showToast(result.message, result.success ? 'success' : 'error');
  if (result.success) {
    initRecruiterDashboard();
  }
};

/* ------------------------------------------------------------------ */
/*  Post job form (recruiter)                                         */
/* ------------------------------------------------------------------ */

window.initPostJobForm = function () {
  const form = $('#post-job-form');
  const modal = $('#post-job-modal');
  const closeBtn = $('#post-job-close');
  const cancelBtn = $('#post-job-cancel');
  const submitBtn = $('#post-job-submit');
  const openBtn = $('#post-job-btn');

  if (!form) return;

  // Open modal
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
      form.reset();
      submitBtn.removeAttribute('dataset.editId');
      delete submitBtn.dataset.editId;
      $('#post-job-modal-title').textContent = 'Post a New Job';
    });
  }

  // Close
  [closeBtn, cancelBtn].forEach((btn) => {
    if (btn)
      btn.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
  });

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  // Submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) {
      showToast('Please log in to post jobs.', 'error');
      return;
    }

    const formData = new FormData(form);
    const jobData = {
      title: formData.get('title'),
      company: formData.get('company') || user.companyName,
      description: formData.get('description'),
      responsibilities: formData.get('responsibilities'),
      qualifications: formData.get('qualifications'),
      requiredSkills: formData.get('requiredSkills'),
      location: formData.get('location'),
      salary: formData.get('salary'),
      jobType: formData.get('jobType'),
      workMode: formData.get('workMode'),
      experience: formData.get('experience'),
      deadline: formData.get('deadline'),
    };

    const editId = submitBtn.dataset.editId;
    let result;
    if (editId) {
      result = updateJob(editId, jobData, user.id);
    } else {
      result = createJob(jobData, user.id);
    }

    showToast(result.message, result.success ? 'success' : 'error');

    if (result.success) {
      modal.classList.add('hidden');
      form.reset();
      delete submitBtn.dataset.editId;
      $('#post-job-modal-title').textContent = 'Post a New Job';
      if (window.initRecruiterDashboard) initRecruiterDashboard();
    }
  });
};

function setFormValue(id, value) {
  const el = $(`#${id}`);
  if (el) el.value = value || '';
}

/* ------------------------------------------------------------------ */
/*  Student profile page                                              */
/* ------------------------------------------------------------------ */

window.initProfilePage = function () {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please log in to view your profile.', 'error');
    setTimeout(() => (location.href = 'login.html'), 800);
    return;
  }

  // Fill display fields
  const fill = (id, value, attr = 'textContent') => {
    const el = $(`#${id}`);
    if (el) el[attr] = value;
  };

  fill('profile-name', user.fullName);
  fill('profile-email', user.email);
  fill('profile-role', user.role.charAt(0).toUpperCase() + user.role.slice(1));
  fill('profile-college', user.college || 'Not specified');
  fill('profile-degree', user.degree || 'Not specified');
  fill('profile-year', user.graduationYear || 'Not specified');
  fill('profile-skills', (user.skills || []).join(', ') || 'Not specified');
  fill('profile-resume', user.resumeUrl || 'Not provided');
  fill('profile-photo', user.profilePhoto ? `<img src="${escapeHtml(user.profilePhoto)}" class="w-full h-full object-cover rounded-full">` : 'innerHTML');

  // Edit form prefill
  const editName = $('#edit-name');
  const editCollege = $('#edit-college');
  const editDegree = $('#edit-degree');
  const editYear = $('#edit-year');
  const editSkills = $('#edit-skills');
  const editResume = $('#edit-resume');
  const editPhoto = $('#edit-photo');

  if (editName) editName.value = user.fullName;
  if (editCollege) editCollege.value = user.college || '';
  if (editDegree) editDegree.value = user.degree || '';
  if (editYear) editYear.value = user.graduationYear || '';
  if (editSkills) editSkills.value = (user.skills || []).join(', ');
  if (editResume) editResume.value = user.resumeUrl || '';
  if (editPhoto) editPhoto.value = user.profilePhoto || '';

  // Save profile
  const saveBtn = $('#save-profile-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const updates = {
        fullName: editName.value.trim(),
        college: editCollege.value.trim(),
        degree: editDegree.value.trim(),
        graduationYear: editYear.value.trim(),
        skills: editSkills.value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        resumeUrl: editResume.value.trim(),
        profilePhoto: editPhoto.value.trim(),
      };

      const result = updateCurrentUser(updates);
      showToast(result.message, result.success ? 'success' : 'error');

      if (result.success) {
        // Refresh display
        initProfilePage();
      }
    });
  }

  // Logout from profile
  const profileLogout = $('#profile-logout');
  if (profileLogout) {
    profileLogout.addEventListener('click', handleLogout);
  }
};

/* ------------------------------------------------------------------ */
/*  Auth pages (login/register)                                       */
/* ------------------------------------------------------------------ */

window.toggleLoginRole = function (role) {
  const radios = document.querySelectorAll('input[name="role"]');
  radios.forEach((r) => {
    r.checked = r.value === role;
    const label = r.parentElement;
    if (role === 'student') {
      label.className = 'flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-indigo-600 bg-indigo-50 text-indigo-700 rounded-lg font-semibold transition cursor-pointer';
    } else {
      label.className = 'flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 bg-white text-slate-600 rounded-lg font-semibold transition cursor-pointer hover:border-indigo-300';
    }
  });
  // Also style the other label oppositely
  const studentLabel = document.querySelector('input[name="role"][value="student"]').parentElement;
  const recruiterLabel = document.querySelector('input[name="role"][value="recruiter"]').parentElement;
  if (role === 'student') {
    studentLabel.className = 'flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-indigo-600 bg-indigo-50 text-indigo-700 rounded-lg font-semibold transition cursor-pointer';
    recruiterLabel.className = 'flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 bg-white text-slate-600 rounded-lg font-semibold transition cursor-pointer hover:border-indigo-300';
  } else {
    recruiterLabel.className = 'flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-indigo-600 bg-indigo-50 text-indigo-700 rounded-lg font-semibold transition cursor-pointer';
    studentLabel.className = 'flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 bg-white text-slate-600 rounded-lg font-semibold transition cursor-pointer hover:border-indigo-300';
  }
};

window.initLoginPage = function () {
  const form = $('#login-form');
  if (!form) return;

  const togglePassword = $('#toggle-password');
  const passwordInput = $('#login-password');

  // Role toggle click handlers
  document.querySelectorAll('input[name="role"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      toggleLoginRole(radio.value);
    });
  });

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      togglePassword.classList.toggle('fa-eye');
      togglePassword.classList.toggle('fa-eye-slash');
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    const role = $('input[name="role"]:checked')?.value || 'student';

    const result = authLogin(email, password, role);
    showToast(result.message, result.success ? 'success' : 'error');

    if (result.success) {
      setTimeout(() => {
        location.href = result.user.role === 'student' ? 'student-dashboard.html' : 'recruiter-dashboard.html';
      }, 800);
    }
  });
};

window.toggleRegisterRole = function (role) {
  const roleInput = $('#register-role');
  const studentFields = $('#student-fields');
  const recruiterFields = $('#recruiter-fields');
  const studentBtn = $('#role-student');
  const recruiterBtn = $('#role-recruiter');

  if (!roleInput || !studentFields || !recruiterFields) return;

  roleInput.value = role;

  if (role === 'student') {
    studentFields.classList.remove('hidden');
    recruiterFields.classList.add('hidden');
    if (studentBtn) studentBtn.className = 'flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-indigo-600 bg-indigo-50 text-indigo-700 rounded-lg font-semibold transition';
    if (recruiterBtn) recruiterBtn.className = 'flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 bg-white text-slate-600 rounded-lg font-semibold transition hover:border-indigo-300';
  } else {
    studentFields.classList.add('hidden');
    recruiterFields.classList.remove('hidden');
    if (studentBtn) studentBtn.className = 'flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 bg-white text-slate-600 rounded-lg font-semibold transition hover:border-indigo-300';
    if (recruiterBtn) recruiterBtn.className = 'flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-indigo-600 bg-indigo-50 text-indigo-700 rounded-lg font-semibold transition';
  }
};

window.initRegisterPage = function () {
  const form = $('#register-form');
  if (!form) return;

  const togglePassword = $('#toggle-password');
  const passwordInput = $('#register-password');
  const roleSelect = $('#register-role');
  const studentFields = $('#student-fields');
  const recruiterFields = $('#recruiter-fields');

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      togglePassword.classList.toggle('fa-eye');
      togglePassword.classList.toggle('fa-eye-slash');
    });
  }

  // Show/hide role-specific fields when hidden input changes
  roleSelect.addEventListener('change', () => {
    if (roleSelect.value === 'student') {
      studentFields.classList.remove('hidden');
      recruiterFields.classList.add('hidden');
    } else {
      studentFields.classList.add('hidden');
      recruiterFields.classList.remove('hidden');
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const role = roleSelect.value;
    const userData = {
      role,
      fullName: $('#register-name').value.trim(),
      email: $('#register-email').value.trim(),
      password: $('#register-password').value,
    };

    if (role === 'student') {
      userData.college = $('#register-college').value.trim();
      userData.degree = $('#register-degree').value.trim();
      userData.graduationYear = $('#register-year').value.trim();
      userData.skills = $('#register-skills').value.trim();
    } else {
      userData.companyName = $('#register-company').value.trim();
      userData.designation = $('#register-designation').value.trim();
    }

    // Basic client-side validation
    if (!userData.fullName || !userData.email || !userData.password) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    if (userData.password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    const result = authRegister(userData);
    showToast(result.message, result.success ? 'success' : 'error');

    if (result.success) {
      setTimeout(() => {
        location.href = 'login.html';
      }, 1000);
    }
  });
};

/* ------------------------------------------------------------------ */
/*  Mobile menu toggle                                                */
/* ------------------------------------------------------------------ */

window.initMobileMenu = function () {
  const btn = $('#mobile-menu-btn');
  const menu = $('#mobile-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    menu.classList.toggle('hidden');
  });
};

/* ------------------------------------------------------------------ */
/*  Global init                                                       */
/* ------------------------------------------------------------------ */

// Run on every page load
document.addEventListener('DOMContentLoaded', () => {
  seedDemoData();
  updateNavbar();
  initMobileMenu();

  // Initialize page-specific logic based on body classes / filename
  const page = location.pathname.split('/').pop();

  if (page === 'index.html' || page === '') initLandingPage();
  if (page === 'jobs.html') initJobsPage();
  if (page === 'job-details.html') initJobDetailsPage();
  if (page === 'student-dashboard.html') initStudentDashboard();
  if (page === 'recruiter-dashboard.html') initRecruiterDashboard();
  if (page === 'recruiter-dashboard.html') initPostJobForm();
  if (page === 'profile.html') initProfilePage();
  if (page === 'login.html') initLoginPage();
  if (page === 'register.html') initRegisterPage();
});
