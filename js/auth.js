/**
 * auth.js
 * Advanix - Simulated authentication (frontend prototype).
 *
 * This module handles registration, login, logout, and current-user state
 * using LocalStorage.
 *
 * SECURITY NOTE (for college project / portfolio):
 *   Passwords are stored in plaintext in LocalStorage. This is a DEMO only
 *   and is NOT production-secure. A real implementation would use
 *   bcrypt/argon2 hashing, HTTPS-only cookies, JWT access + refresh tokens,
 *   and a backend API (Node.js/Express + MongoDB).
 */

import { get, set, STORAGE_KEYS } from './storage.js';

/**
 * Register a new user.
 * @param {Object} userData
 * @returns {{success: boolean, message: string, user?: Object}}
 */
export function register(userData) {
  const users = get(STORAGE_KEYS.USERS, []);

  // Prevent duplicate email registration
  const emailExists = users.some((u) => u.email.toLowerCase() === userData.email.toLowerCase());
  if (emailExists) {
    return { success: false, message: 'An account with this email already exists.' };
  }

  const user = {
    id: 'user_' + Date.now(),
    role: userData.role, // 'student' or 'recruiter'
    fullName: userData.fullName.trim(),
    email: userData.email.trim().toLowerCase(),
    password: userData.password, // prototype-only plaintext
    createdAt: new Date().toISOString(),
  };

  // Role-specific fields
  if (userData.role === 'student') {
    user.college = userData.college.trim();
    user.degree = userData.degree.trim();
    user.graduationYear = userData.graduationYear.trim();
    user.skills = userData.skills
      ? userData.skills.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    user.resumeUrl = '';
    user.profilePhoto = '';
  } else if (userData.role === 'recruiter') {
    user.companyName = userData.companyName.trim();
    user.designation = userData.designation.trim();
  }

  users.push(user);
  set(STORAGE_KEYS.USERS, users);

  return { success: true, message: 'Account created successfully! You can now log in.', user };
}

/**
 * Log in a user.
 * @param {string} email
 * @param {string} password
 * @param {string} role - expected role ('student' | 'recruiter')
 * @returns {{success: boolean, message: string, user?: Object}}
 */
export function login(email, password, role) {
  const users = get(STORAGE_KEYS.USERS, []);
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!user) {
    return { success: false, message: 'Invalid email or password.' };
  }

  if (user.role !== role) {
    return {
      success: false,
      message: `This account is registered as a ${user.role}. Please select the correct role.`,
    };
  }

  // Create a demo session (NOT a real JWT - prototype only)
  const session = {
    userId: user.id,
    role: user.role,
    loggedInAt: new Date().toISOString(),
  };
  set(STORAGE_KEYS.CURRENT_USER, session);

  return { success: true, message: `Welcome back, ${user.fullName}!`, user };
}

/**
 * Log out the current user.
 */
export function logout() {
  removeCurrentUser();
  // Redirect handled by the caller (usually to index.html)
}

/**
 * Get the currently logged-in user's session.
 * @returns {Object|null}
 */
export function getCurrentSession() {
  return get(STORAGE_KEYS.CURRENT_USER, null);
}

/**
 * Get the full user object for the currently logged-in user.
 * @returns {Object|null}
 */
export function getCurrentUser() {
  const session = getCurrentSession();
  if (!session) return null;
  const users = get(STORAGE_KEYS.USERS, []);
  return users.find((u) => u.id === session.userId) || null;
}

/**
 * Remove the current session from storage.
 */
function removeCurrentUser() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

/**
 * Check if a user is currently logged in.
 * @returns {boolean}
 */
export function isLoggedIn() {
  return getCurrentSession() !== null;
}

/**
 * Update the current user's profile (used for student profile editing).
 * @param {Object} updates
 * @returns {{success: boolean, message: string}}
 */
export function updateCurrentUser(updates) {
  const session = getCurrentSession();
  if (!session) {
    return { success: false, message: 'You must be logged in to update your profile.' };
  }

  const users = get(STORAGE_KEYS.USERS, []);
  const index = users.findIndex((u) => u.id === session.userId);
  if (index === -1) {
    return { success: false, message: 'User not found.' };
  }

  users[index] = { ...users[index], ...updates };
  set(STORAGE_KEYS.USERS, users);

  return { success: true, message: 'Profile updated successfully.' };
}
