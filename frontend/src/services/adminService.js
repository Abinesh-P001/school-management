import { formatBearerToken } from './schoolService';
import { getApiBaseUrl } from '../config/api';

const API_BASE = getApiBaseUrl();

/**
 * Fetch all managed user accounts from the protected FastAPI endpoint.
 * Password hashes and credentials are never transmitted.
 */
export async function getManagedUsers(token) {
  const headers = { 'Content-Type': 'application/json' };
  const auth = formatBearerToken(token);
  if (auth) {
    headers['Authorization'] = auth;
  }

  const response = await fetch(`${API_BASE}/admin/users`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP Error ${response.status}: Failed to fetch users`);
  }

  return await response.json();
}

/**
 * Admin: Add Teacher Account with Invitation.
 * Provisions Supabase Auth user & Teacher database record.
 */
export async function createTeacherAccount(teacherData, token) {
  const headers = { 'Content-Type': 'application/json' };
  const auth = formatBearerToken(token);
  if (auth) {
    headers['Authorization'] = auth;
  }

  const response = await fetch(`${API_BASE}/admin/teachers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(teacherData),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP Error ${response.status}: Failed to create teacher account`);
  }

  return await response.json();
}

/**
 * Admin: Add Student Account with Invitation.
 * Provisions Supabase Auth user & Student database record.
 */
export async function createStudentAccount(studentData, token) {
  const headers = { 'Content-Type': 'application/json' };
  const auth = formatBearerToken(token);
  if (auth) {
    headers['Authorization'] = auth;
  }

  const response = await fetch(`${API_BASE}/admin/students`, {
    method: 'POST',
    headers,
    body: JSON.stringify(studentData),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP Error ${response.status}: Failed to create student account`);
  }

  return await response.json();
}

/**
 * Create a new user account (Admin only).
 * Dispatches to backend administrative endpoint so the current administrator's
 * session in Supabase Auth is strictly preserved.
 */
export async function createManagedUser(userData, token) {
  const headers = { 'Content-Type': 'application/json' };
  const auth = formatBearerToken(token);
  if (auth) {
    headers['Authorization'] = auth;
  }

  const response = await fetch(`${API_BASE}/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP Error ${response.status}: Failed to create user`);
  }

  return await response.json();
}

/**
 * Update user active status (Admin only).
 */
export async function updateManagedUserStatus(userId, isActive, token) {
  const headers = { 'Content-Type': 'application/json' };
  const auth = formatBearerToken(token);
  if (auth) {
    headers['Authorization'] = auth;
  }

  const response = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ is_active: isActive }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP Error ${response.status}: Failed to update status`);
  }

  return await response.json();
}

/**
 * Delete a user account (Admin only).
 */
export async function deleteManagedUser(userId, token) {
  const headers = {};
  const auth = formatBearerToken(token);
  if (auth) {
    headers['Authorization'] = auth;
  }

  const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok && response.status !== 204) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP Error ${response.status}: Failed to delete user`);
  }

  return true;
}
