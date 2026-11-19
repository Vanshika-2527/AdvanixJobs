/**
 * dashboard.js
 * Advanix - Dashboard-specific logic for student and recruiter views.
 *
 * Computes dashboard stats, recommended jobs, and application status summaries.
 */

import {
  getAllJobs,
  getAllApplications,
  getApplicationsForStudent,
  getApplicationsForJob,
  getSavedJobIds,
  isJobSaved,
} from './jobs.js';
import { getCurrentUser } from './auth.js';
import { calculateMatch } from './matching.js';

/**
 * Build student dashboard data.
 * @returns {Object}
 */
export function getStudentDashboardData() {
  const user = getCurrentUser();
  if (!user || user.role !== 'student') return null;

  const jobs = getAllJobs();
  const applications = getApplicationsForStudent(user.id);
  const savedJobIds = getSavedJobIds(user.id);

  const studentSkills = user.skills || [];

  // Recommended jobs: compute match for every job, sort by match desc
  const recommendedJobs = jobs
    .map((job) => {
      const match = calculateMatch(studentSkills, job.requiredSkills || []);
      return { ...job, match };
    })
    .sort((a, b) => b.match.matchPercentage - a.match.matchPercentage)
    .slice(0, 6);

  // Recently added jobs (newest first)
  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate))
    .slice(0, 4);

  // Application status overview
  const statusCounts = { Pending: 0, Shortlisted: 0, Rejected: 0 };
  applications.forEach((app) => {
    if (statusCounts[app.status] !== undefined) {
      statusCounts[app.status]++;
    }
  });

  // Skill match overview: average match across all jobs
  const allMatches = jobs.map((job) =>
    calculateMatch(studentSkills, job.requiredSkills || []).matchPercentage
  );
  const avgMatch =
    allMatches.length > 0
      ? Math.round(allMatches.reduce((a, b) => a + b, 0) / allMatches.length)
      : 0;

  return {
    user,
    totalJobs: jobs.length,
    savedJobs: savedJobIds.length,
    appliedJobs: applications.length,
    statusCounts,
    recommendedJobs,
    recentJobs,
    avgMatch,
    studentSkills,
  };
}

/**
 * Build recruiter dashboard data.
 * @returns {Object}
 */
export function getRecruiterDashboardData() {
  const user = getCurrentUser();
  if (!user || user.role !== 'recruiter') return null;

  const jobs = getAllJobs().filter((j) => j.postedBy === user.id);
  const allApplications = getAllApplications();

  // Applications for this recruiter's jobs
  const recruiterApplicationIds = new Set();
  jobs.forEach((job) => {
    (job.applicants || []).forEach((aid) => recruiterApplicationIds.add(aid));
  });
  const recruiterApplications = allApplications.filter((a) =>
    recruiterApplicationIds.has(a.id)
  );

  const shortlisted = recruiterApplications.filter((a) => a.status === 'Shortlisted').length;
  const rejected = recruiterApplications.filter((a) => a.status === 'Rejected').length;
  const pending = recruiterApplications.filter((a) => a.status === 'Pending').length;

  // Recent applications (newest first), with job title attached
  const recentApplications = [...recruiterApplications]
    .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
    .slice(0, 5)
    .map((app) => {
      const job = getAllJobs().find((j) => j.id === app.jobId);
      return { ...app, jobTitle: job ? job.title : 'Unknown Job' };
    });

  return {
    user,
    totalJobs: jobs.length,
    totalApplications: recruiterApplications.length,
    shortlisted,
    rejected,
    pending,
    recentApplications,
    jobs,
  };
}

/**
 * Get full application details for a job (recruiter applicants page).
 * Includes match percentage against the job requirements if student skills exist.
 * @param {string} jobId
 * @returns {Array}
 */
export function getJobApplicantsWithMatch(jobId) {
  const job = getAllJobs().find((j) => j.id === jobId);
  if (!job) return [];

  const applications = getApplicationsForJob(jobId);
  return applications.map((app) => {
    // Find the student user to compute match
    const users = JSON.parse(localStorage.getItem('sjc_users') || '[]');
    const student = users.find((u) => u.id === app.studentId);
    let match = null;
    if (student) {
      match = calculateMatch(student.skills || [], job.requiredSkills || []);
    }
    return { ...app, student, match };
  });
}
