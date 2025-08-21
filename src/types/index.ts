export interface Member {
  id: number;
  name: string;
}

export interface Payment {
  memberId: number;
  amount: number;
  date: string;
  collectionPeriod: string;
}

export interface Loan {
  id: string;
  memberId: number;
  amount: number;
  dateIssued: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  // When the loan is actually disbursed/approved and which period it belongs to
  dateApproved?: string;
  disbursementPeriodId?: string;
  repaymentPlan?: "MONTHLY" | "CUT_OFF"; // monthly or every cutoff (10/25)
  interestRate?: number; // 0.04 for monthly, 0.03 for cut-off
  dateClosed?: string; // when loan fully paid
  termCount?: number; // number of months (MONTHLY) or cut-offs (CUT_OFF)
  penaltyRate?: number; // fraction of installment added as penalty when a scheduled payment is missed (e.g., 0.02 = 2%)
}

export interface Repayment {
  id: string;
  loanId: string;
  memberId: number;
  amount: number;
  date: string; // ISO date
  periodId: string; // collection period where repayment was made
}

export interface Penalty {
  id: string;
  loanId: string;
  amount: number;
  date: string; // when penalty was assessed
  periodId: string; // collection period where penalty was assessed (usually next payment period)
  reason?: string;
}

export interface CollectionPeriod {
  id: string;
  date: string;
  totalCollected: number;
  payments: Payment[];
  defaultContribution?: number; // per-period default contribution amount
}

export interface CoopState {
  beginningBalance: number;
  currentBalance: number;
  members: Member[];
  collections: CollectionPeriod[];
  loans: Loan[];
  repayments: Repayment[];
  penalties: Penalty[];
}
