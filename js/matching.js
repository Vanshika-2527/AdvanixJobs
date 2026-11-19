/**
 * matching.js
 * Advanix - Beginner-friendly, rule-based job matching system.
 *
 * Algorithm (simple and explainable):
 *   Match Percentage = (Number of Matching Skills / Total Required Skills) × 100
 *
 * SECURITY / SCOPE NOTE:
 *   This is a basic rule-based recommendation system, NOT an AI-trained model.
 *   It only compares skill keywords. A production version could use ML models,
 *   embeddings, and behavioral signals.
 */

/**
 * Normalize a skill string: trim whitespace and lowercase for comparison.
 * @param {string} skill
 * @returns {string}
 */
function normalizeSkill(skill) {
  return skill.trim().toLowerCase();
}

/**
 * Calculate the skill match between a student's skills and a job's required skills.
 * @param {string[]} studentSkills - e.g. ['HTML', 'CSS', 'JavaScript']
 * @param {string[]} jobRequiredSkills - e.g. ['HTML', 'CSS', 'JavaScript', 'React']
 * @returns {Object} {
 *   matchPercentage: number (0-100),
 *   matchingSkills: string[],
 *   missingSkills: string[],
 *   badge: string,          // 'Excellent' | 'Good' | 'Fair' | 'Poor'
 *   badgeColor: string,     // tailwind-ish color class name
 * }
 */
export function calculateMatch(studentSkills, jobRequiredSkills) {
  if (!Array.isArray(studentSkills)) studentSkills = [];
  if (!Array.isArray(jobRequiredSkills)) jobRequiredSkills = [];

  const normalizedStudent = new Set(studentSkills.map(normalizeSkill).filter(Boolean));
  const normalizedJob = jobRequiredSkills.map(normalizeSkill).filter(Boolean);

  const matchingSkills = jobRequiredSkills.filter((skill) =>
    normalizedStudent.has(normalizeSkill(skill))
  );

  const missingSkills = jobRequiredSkills.filter(
    (skill) => !normalizedStudent.has(normalizeSkill(skill))
  );

  let matchPercentage = 0;
  if (normalizedJob.length > 0) {
    matchPercentage = Math.round((matchingSkills.length / normalizedJob.length) * 100);
  }

  const { badge, badgeColor } = getMatchBadge(matchPercentage);

  return {
    matchPercentage,
    matchingSkills,
    missingSkills,
    badge,
    badgeColor,
  };
}

/**
 * Convert a percentage into a human-readable badge and color.
 * @param {number} percentage
 * @returns {{badge: string, badgeColor: string}}
 */
function getMatchBadge(percentage) {
  if (percentage >= 80) {
    return { badge: 'Excellent Match', badgeColor: 'text-green-600 bg-green-100' };
  }
  if (percentage >= 60) {
    return { badge: 'Good Match', badgeColor: 'text-blue-600 bg-blue-100' };
  }
  if (percentage >= 40) {
    return { badge: 'Fair Match', badgeColor: 'text-amber-600 bg-amber-100' };
  }
  return { badge: 'Low Match', badgeColor: 'text-rose-600 bg-rose-100' };
}

/**
 * Get recommended skills to learn (the missing skills), sorted.
 * @param {string[]} missingSkills
 * @returns {string[]}
 */
export function getSkillGap(missingSkills) {
  return [...missingSkills].sort();
}

/**
 * Format match percentage for display.
 * @param {number} percentage
 * @returns {string}
 */
export function formatMatchPercentage(percentage) {
  return `${percentage}%`;
}
