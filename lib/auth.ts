export type AuthUser = {
  id: string;
  email: string;
  email_verified: boolean;
  name: string | null;
  avatar_url: string | null;
  status: string;
  last_login_at: string | null;
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export function getApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:8000"
  );
}

export function getGoogleLoginUrl() {
  return `${getApiBaseUrl()}/api/v1/auth/google/login`;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/me`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`Failed to load session (${response.status})`);
  }

  return (await response.json()) as AuthUser;
}

export async function logoutCurrentUser(): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to log out (${response.status})`);
  }
}
