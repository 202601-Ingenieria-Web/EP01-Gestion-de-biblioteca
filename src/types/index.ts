// Tipos compartidos entre páginas y componentes del frontend.

export type Role = "ADMIN" | "USER";
export type MovementType = "INCOMING" | "OUTGOING";
export type ReturnCondition = "GOOD" | "DAMAGED";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
  enabled: boolean;
  createdAt: string;
}

export interface BookSummary {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  totalCopies: number;
  activeLoans: number;
  availableCopies: number;
  createdAt: string;
  createdBy: { id: string; name: string; email: string };
}

export interface Movement {
  id: string;
  type: MovementType;
  quantity: number;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

export interface LoanUser {
  id: string;
  name: string;
  email: string;
}

export interface LoanBook {
  id: string;
  title: string;
  author: string | null;
}

export interface Loan {
  id: string;
  loanedAt: string;
  returnedAt: string | null;
  returnCondition: ReturnCondition | null;
  notes: string | null;
  book: LoanBook;
  user: LoanUser;
}

export interface AvailabilitySeries {
  bookId: string;
  title: string;
  currentTotalCopies: number;
  series: {
    date: string;
    totalCopies: number;
    activeLoans: number;
    availableCopies: number;
  }[];
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}
