// Cliente fetch para el frontend (browser). Todas las llamadas van a /api/*
// y usan las cookies de sesión automáticamente.

import type {
  BookSummary,
  Loan,
  Movement,
  UserProfile,
  AvailabilitySeries,
  ReturnCondition,
  Role,
} from "@/types";

// ─── helpers ─────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  const json = await res.json();

  if (!res.ok) {
    const message = json?.error?.message ?? "Error desconocido.";
    throw new Error(message);
  }

  return json as T;
}

// ─── auth ─────────────────────────────────────────────────────────────────────

export async function loginApi(email: string, password: string) {
  return apiFetch<{ user: UserProfile }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logoutApi() {
  return apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export async function getMeApi() {
  return apiFetch<{ user: UserProfile }>("/api/auth/me");
}

// ─── books ────────────────────────────────────────────────────────────────────

export async function getBooksApi() {
  return apiFetch<{ books: BookSummary[] }>("/api/books");
}

export async function getBookApi(id: string) {
  return apiFetch<{ book: BookSummary }>(`/api/books/${id}`);
}

export async function createBookApi(data: {
  title: string;
  author?: string | null;
  description?: string | null;
  totalCopies: number;
}) {
  return apiFetch<{ book: BookSummary }>("/api/books", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getBookAvailabilityApi(id: string) {
  return apiFetch<AvailabilitySeries>(`/api/books/${id}/availability`);
}

// ─── loans ────────────────────────────────────────────────────────────────────

export async function getLoansApi(params?: {
  userId?: string;
  bookId?: string;
  status?: "active" | "returned";
}) {
  const q = new URLSearchParams();
  if (params?.userId) q.set("userId", params.userId);
  if (params?.bookId) q.set("bookId", params.bookId);
  if (params?.status) q.set("status", params.status);
  const qs = q.toString();
  return apiFetch<{ loans: Loan[] }>(`/api/loans${qs ? `?${qs}` : ""}`);
}

export async function getLoanApi(id: string) {
  return apiFetch<{ loan: Loan }>(`/api/loans/${id}`);
}

export async function createLoanApi(data: {
  bookId: string;
  userId?: string;
  notes?: string | null;
}) {
  return apiFetch<{ loan: Loan }>("/api/loans", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function returnLoanApi(
  id: string,
  data: { returnCondition: ReturnCondition; notes?: string | null }
) {
  return apiFetch<{ loan: Loan }>(`/api/loans/${id}/return`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ─── movements ────────────────────────────────────────────────────────────────

export async function getMovementsApi(bookId: string) {
  return apiFetch<{ movements: Movement[] }>(
    `/api/movements?bookId=${bookId}`
  );
}

export async function createMovementApi(data: {
  bookId: string;
  type: "INCOMING" | "OUTGOING";
  quantity: number;
}) {
  return apiFetch<{ movement: Movement }>("/api/movements", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── users ────────────────────────────────────────────────────────────────────

export async function getUsersApi() {
  return apiFetch<{ users: UserProfile[] }>("/api/users");
}

export async function createUserApi(data: {
  email: string;
  password: string;
  name: string;
  image?: string | null;
  role: Role;
}) {
  return apiFetch<{ user: UserProfile }>("/api/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateUserRoleApi(id: string, role: Role) {
  return apiFetch<{ user: UserProfile }>(`/api/users/${id}`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
}
