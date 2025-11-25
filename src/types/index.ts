export interface Member {
  id: number;
  name: string;
  committedShares: number; // Fixed share commitment (manually set by admin)
  forfeited?: boolean; // If member forfeited interest
  forfeitureDate?: string; // When they forfeited (ISO date)
  forfeitedInterest?: number; // Amount forfeited
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

export interface MemberShareHistory {
  memberId: number;
  date: string; // When admin changed their shares
  previousShares: number; // Shares before change
  newShares: number; // Shares after change
  changedBy?: string; // Optional: admin who made the change
  reason?: string; // Optional: reason for change
}

export interface MemberDividend {
  memberId: number;
  shares: number; // Shares at time of distribution
  dividendAmount: number; // Amount received
  forfeited: boolean; // If forfeited
}

export interface DividendDistribution {
  id: string;
  date: string; // When dividend was distributed (ISO date)
  totalInterestPool: number; // Total interest to distribute
  totalShares: number; // Total shares across all members
  perShareDividend: number; // Amount per share
  distributions: MemberDividend[]; // Per-member dividends
  periodsCovered: string[]; // Which periods this covers
}

export interface CollectionPeriod {
  id: string;
  date: string;
  totalCollected: number;
  payments: Payment[];
  defaultContribution?: number; // per-period default contribution amount
}

export interface YearlyArchive {
  year: number; // e.g., 2024
  archivedDate: string; // when archive was created
  summary: {
    totalCollected: number;
    totalDisbursed: number;
    totalRepayments: number;
    totalPenalties: number;
    endingBalance: number;
    activeMembers: number;
    totalLoansIssued: number;
    totalShares?: number; // Total shares at time of archive
    totalDividendsDistributed?: number; // Total dividends paid
  };
  collections: CollectionPeriod[];
  loans: Loan[];
  repayments: Repayment[];
  penalties: Penalty[];
  shareHistory?: MemberShareHistory[]; // Share transactions for the year
  dividendDistributions?: DividendDistribution[]; // Dividend distributions for the year
}

export interface CoopState {
  beginningBalance: number;
  currentBalance: number;
  members: Member[];
  collections: CollectionPeriod[];
  loans: Loan[];
  repayments: Repayment[];
  penalties: Penalty[];
  selectedPeriod: string; // Currently selected period ID
  archives: YearlyArchive[]; // Archived yearly data
  // Share system fields
  sharePrice: number; // Price per share (default: 500)
  totalInterestPool: number; // Total interest earned from loans
  dividendDistributions: DividendDistribution[]; // Dividend distribution history
  shareHistory: MemberShareHistory[]; // Historical share transactions
}
