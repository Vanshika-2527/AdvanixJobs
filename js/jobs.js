/**
 * jobs.js
 * Advanix - Job data and search/filter logic (frontend prototype).
 *
 * All job data lives in LocalStorage. Seeded demo jobs are clearly marked
 * with isDemo: true. Recruiter-posted jobs have isDemo: false.
 */

import { get, set, STORAGE_KEYS, seedDemoData } from './storage.js';

/**
 * Get all jobs. Seeds demo data on first run if storage is empty.
 * @returns {Array}
 */
export function getAllJobs() {
  let jobs = get(STORAGE_KEYS.JOBS, []);
  if (jobs.length === 0) {
    seedDemoData();
    jobs = get(STORAGE_KEYS.JOBS, []);
  }
  return jobs;
}

/**
 * Get a single job by ID.
 * @param {string} jobId
 * @returns {Object|null}
 */
export function getJobById(jobId) {
  const jobs = getAllJobs();
  return jobs.find((job) => job.id === jobId) || null;
}

/**
 * Get jobs posted by a specific recruiter.
 * @param {string} recruiterId
 * @returns {Array}
 */
export function getJobsByRecruiter(recruiterId) {
  return getAllJobs().filter((job) => job.postedBy === recruiterId);
}

/**
 * Filter and sort jobs based on search criteria.
 * @param {Object} filters
 *   { query, location, jobType, workMode, experience, minSalary, sortBy }
 * @returns {Array} filtered and sorted jobs
 */
export function filterJobs(filters = {}) {
  let jobs = getAllJobs();

  const {
    query = '',
    location = '',
    jobType = '',
    workMode = '',
    experience = '',
    minSalary = '',
    sortBy = 'newest',
  } = filters;

  const q = query.toLowerCase().trim();

  jobs = jobs.filter((job) => {
    // Text search across title, company, skills
    if (q) {
      const haystack = [
        job.title,
        job.company,
        ...(job.requiredSkills || []),
        job.location,
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    // Location filter
    if (location && job.location.toLowerCase() !== location.toLowerCase()) {
      return false;
    }

    // Job type filter
    if (jobType && job.jobType !== jobType) {
      return false;
    }

    // Work mode filter
    if (workMode && job.workMode !== workMode) {
      return false;
    }

    // Experience filter
    if (experience && job.experience !== experience) {
      return false;
    }

    // Min salary filter (naive numeric compare on the first number in the salary string)
    if (minSalary) {
      const jobSalaryNumber = extractSalaryNumber(job.salary);
      if (jobSalaryNumber === null || jobSalaryNumber < Number(minSalary)) {
        return false;
      }
    }

    return true;
  });

  // Sort
  if (sortBy === 'newest') {
    jobs.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
  } else if (sortBy === 'relevance') {
    // Relevance: jobs matching the query text first, then by posted date
    if (q) {
      jobs.sort((a, b) => {
        const aScore = relevanceScore(a, q);
        const bScore = relevanceScore(b, q);
        if (bScore !== aScore) return bScore - aScore;
        return new Date(b.postedDate) - new Date(a.postedDate);
      });
    } else {
      jobs.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
    }
  }

  return jobs;
}

/**
 * Extract the first number from a salary string like '₹20,000 / month'.
 * Returns null if none found.
 */
function extractSalaryNumber(salary) {
  if (!salary) return null;
  const match = salary.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

/**
 * Simple relevance score: title match = 3, company = 2, skill = 1.
 */
function relevanceScore(job, q) {
  let score = 0;
  const title = (job.title || '').toLowerCase();
  const company = (job.company || '').toLowerCase();
  if (title.includes(q)) score += 3;
  if (company.includes(q)) score += 2;
  if ((job.requiredSkills || []).some((s) => s.toLowerCase().includes(q))) score += 1;
  return score;
}

/**
 * Get distinct filter options from all jobs (for populating filter dropdowns).
 * @returns {Object}
 */
export function getFilterOptions() {
  const jobs = getAllJobs();
  const locations = [...new Set(jobs.map((j) => j.location))].sort();
  const jobTypes = [...new Set(jobs.map((j) => j.jobType))].sort();
  const workModes = [...new Set(jobs.map((j) => j.workMode))].sort();
  const experiences = [...new Set(jobs.map((j) => j.experience))].sort();
  return { locations, jobTypes, workModes, experiences };
}

/**
 * Get all application records.
 * @returns {Array}
 */
export function getAllApplications() {
  return get(STORAGE_KEYS.APPLICATIONS, []);
}

/**
 * Get applications for a specific job.
 * @param {string} jobId
 * @returns {Array}
 */
export function getApplicationsForJob(jobId) {
  const applications = getAllApplications();
  return applications.filter((a) => a.jobId === jobId);
}

/**
 * Get applications for a specific student.
 * @param {string} studentId
 * @returns {Array}
 */
export function getApplicationsForStudent(studentId) {
  const applications = getAllApplications();
  return applications.filter((a) => a.studentId === studentId);
}

/**
 * Check if a student has already applied to a job.
 * @param {string} studentId
 * @param {string} jobId
 * @returns {boolean}
 */
export function hasApplied(studentId, jobId) {
  const applications = getAllApplications();
  return applications.some(
    (a) => a.studentId === studentId && a.jobId === jobId
  );
}

/**
 * Apply for a job. Prevents duplicate applications.
 * @param {Object} application { studentId, jobId, studentName, studentEmail, resumeUrl }
 * @returns {{success: boolean, message: string}}
 */
export function applyForJob(application) {
  const applications = getAllApplications();

  // Prevent duplicate applications
  if (hasApplied(application.studentId, application.jobId)) {
    return {
      success: false,
      message: 'You have already applied to this job.',
    };
  }

  const newApplication = {
    id: 'app_' + Date.now(),
    studentId: application.studentId,
    jobId: application.jobId,
    studentName: application.studentName,
    studentEmail: application.studentEmail,
    resumeUrl: application.resumeUrl || '',
    status: 'Pending', // Pending | Shortlisted | Rejected
    appliedAt: new Date().toISOString(),
  };

  applications.push(newApplication);
  set(STORAGE_KEYS.APPLICATIONS, applications);

  // Add application id to the job's applicants array
  const jobs = getAllJobs();
  const jobIndex = jobs.findIndex((j) => j.id === application.jobId);
  if (jobIndex !== -1) {
    if (!jobs[jobIndex].applicants) jobs[jobIndex].applicants = [];
    jobs[jobIndex].applicants.push(newApplication.id);
    set(STORAGE_KEYS.JOBS, jobs);
  }

  return { success: true, message: 'Application submitted successfully!' };
}

/**
 * Update application status (recruiter action).
 * @param {string} applicationId
 * @param {string} status - 'Shortlisted' | 'Rejected' | 'Pending'
 * @returns {{success: boolean, message: string}}
 */
export function updateApplicationStatus(applicationId, status) {
  const applications = getAllApplications();
  const index = applications.findIndex((a) => a.id === applicationId);
  if (index === -1) {
    return { success: false, message: 'Application not found.' };
  }

  applications[index].status = status;
  applications[index].updatedAt = new Date().toISOString();
  set(STORAGE_KEYS.APPLICATIONS, applications);

  const statusMessages = {
    Shortlisted: 'Candidate shortlisted.',
    Rejected: 'Candidate rejected.',
    Pending: 'Application reset to pending.',
  };

  return { success: true, message: statusMessages[status] || 'Status updated.' };
}

/**
 * Get all saved (bookmarked) job records.
 * @returns {Array}
 */
export function getAllSavedJobs() {
  return get(STORAGE_KEYS.SAVED_JOBS, []);
}

/**
 * Get saved job IDs for a student.
 * @param {string} studentId
 * @returns {string[]}
 */
export function getSavedJobIds(studentId) {
  const saved = getAllSavedJobs();
  return saved
    .filter((s) => s.studentId === studentId)
    .map((s) => s.jobId);
}

/**
 * Check if a job is saved by a student.
 * @param {string} studentId
 * @param {string} jobId
 * @returns {boolean}
 */
export function isJobSaved(studentId, jobId) {
  return getSavedJobIds(studentId).includes(jobId);
}

/**
 * Toggle save/unsave a job for a student.
 * @param {string} studentId
 * @param {string} jobId
 * @returns {{success: boolean, message: string, saved: boolean}}
 */
export function toggleSaveJob(studentId, jobId) {
  const saved = getAllSavedJobs();
  const alreadySaved = saved.some((s) => s.studentId === studentId && s.jobId === jobId);

  if (alreadySaved) {
    const updated = saved.filter((s) => !(s.studentId === studentId && s.jobId === jobId));
    set(STORAGE_KEYS.SAVED_JOBS, updated);
    return { success: true, message: 'Job removed from saved jobs.', saved: false };
  } else {
    saved.push({
      id: 'save_' + Date.now(),
      studentId,
      jobId,
      savedAt: new Date().toISOString(),
    });
    set(STORAGE_KEYS.SAVED_JOBS, saved);
    return { success: true, message: 'Job saved!', saved: true };
  }
}

/**
 * Create a new job posting (recruiter).
 * @param {Object} jobData
 * @param {string} postedBy (recruiter user id)
 * @returns {{success: boolean, message: string, job?: Object}}
 */
export function createJob(jobData, postedBy) {
  const jobs = getAllJobs();
  const newJob = {
    id: 'job_' + Date.now(),
    title: jobData.title.trim(),
    company: jobData.company.trim(),
    companyLogo: jobData.companyLogo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(jobData.company.trim()) + '&background=4F46E5&color=fff',
    location: jobData.location.trim(),
    salary: jobData.salary.trim(),
    jobType: jobData.jobType,
    workMode: jobData.workMode,
    experience: jobData.experience.trim(),
    deadline: jobData.deadline.trim(),
    description: jobData.description.trim(),
    responsibilities: jobData.responsibilities
      ? jobData.responsibilities.split('\n').filter(Boolean).map((r) => r.trim())
      : [],
    qualifications: jobData.qualifications
      ? jobData.qualifications.split('\n').filter(Boolean).map((q) => q.trim())
      : [],
    requiredSkills: jobData.requiredSkills
      ? jobData.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    postedDate: new Date().toISOString().split('T')[0],
    source: 'Posted by Recruiter',
    isDemo: false,
    postedBy,
    applicants: [],
  };

  jobs.push(newJob);
  set(STORAGE_KEYS.JOBS, jobs);

  return { success: true, message: 'Job posted successfully!', job: newJob };
}

/**
 * Update an existing job (recruiter, only their own jobs).
 * @param {string} jobId
 * @param {Object} updates
 * @param {string} postedBy
 * @returns {{success: boolean, message: string}}
 */
export function updateJob(jobId, updates, postedBy) {
  const jobs = getAllJobs();
  const index = jobs.findIndex((j) => j.id === jobId);
  if (index === -1) {
    return { success: false, message: 'Job not found.' };
  }
  if (jobs[index].postedBy !== postedBy) {
    return { success: false, message: 'You can only edit your own job listings.' };
  }

  jobs[index] = {
    ...jobs[index],
    ...updates,
    id: jobId, // preserve id
    postedBy, // preserve ownership
  };
  set(STORAGE_KEYS.JOBS, jobs);

  return { success: true, message: 'Job updated successfully.' };
}

/**
 * Delete a job (recruiter, only their own jobs).
 * @param {string} jobId
 * @param {string} postedBy
 * @returns {{success: boolean, message: string}}
 */
export function deleteJob(jobId, postedBy) {
  const jobs = getAllJobs();
  const job = jobs.find((j) => j.id === jobId);
  if (!job) {
    return { success: false, message: 'Job not found.' };
  }
  if (job.postedBy !== postedBy) {
    return { success: false, message: 'You can only delete your own job listings.' };
  }

  const updatedJobs = jobs.filter((j) => j.id !== jobId);
  set(STORAGE_KEYS.JOBS, updatedJobs);

  // Also remove related applications
  const applications = getAllApplications().filter((a) => a.jobId !== jobId);
  set(STORAGE_KEYS.APPLICATIONS, applications);

  return { success: true, message: 'Job deleted successfully.' };
}
