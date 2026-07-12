const STORAGE_KEY = "elara_user_id";
const DEFAULT_USER = "demo_user";

export function getUserId(): string {
  if (typeof window === "undefined") return DEFAULT_USER;
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_USER;
}

export function setUserId(id: string): void {
  const clean = id.trim() || DEFAULT_USER;
  localStorage.setItem(STORAGE_KEY, clean);
}

export function getInitialUserId(): string {
  if (typeof window === "undefined") return DEFAULT_USER;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  // Seed default
  localStorage.setItem(STORAGE_KEY, DEFAULT_USER);
  return DEFAULT_USER;
}