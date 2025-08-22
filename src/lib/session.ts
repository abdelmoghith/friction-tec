// Session management utilities for localStorage operations
import type { UserProfile } from '../types';
import users from '../data/users.json';

const SESSION_KEY = 'whary_admin_session';

// Format date for display
export function formatJoinDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Get user initials for avatar
export function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

// Log in a user
export function login(email, password) {
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    const userProfile: UserProfile = {
      id: user.email, // Using email as ID for simplicity
      name: user.name,
      email: user.email,
      role: user.role,
      access: user.access,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(userProfile));
    return userProfile;
  }
  return null;
}

// Log out the current user
export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

// Get current user profile
export function getCurrentUserProfile(): UserProfile | null {
  const session = localStorage.getItem(SESSION_KEY);
  if (session) {
    return JSON.parse(session);
  }
  return null;
}
