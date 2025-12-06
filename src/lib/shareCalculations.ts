import {
  Loan,
  Member,
  Payment,
  DividendDistribution,
  MemberDividend,
  MemberShareHistory,
} from "../types";

/**
 * Calculate shares from a contribution amount
 * @param amount - Contribution amount
 * @param sharePrice - Price per share (default: 500)
 * @returns Number of shares
 */
export function calculateSharesFromContribution(
  amount: number,
  sharePrice: number = 500
): number {
  if (!isFinite(amount) || amount <= 0 || !isFinite(sharePrice) || sharePrice <= 0) {
    return 0;
  }
  return amount / sharePrice;
}

/**
 * Calculate total committed shares across all members
 * @param members - Array of members
 * @returns Total committed shares
 */
export function calculateTotalShares(members: Member[]): number {
  return members.reduce((sum, member) => sum + (member.committedShares || 0), 0);
}

/**
 * Calculate total interest earned from a loan
 * @param loan - Loan object
 * @returns Interest amount
 */
export function calculateInterestEarned(loan: Loan): number {
  if (loan.status !== "APPROVED" && loan.status !== "PAID") {
    return 0;
  }

  const interestRate =
    loan.interestRate ||
    (loan.repaymentPlan === "MONTHLY" ? 0.04 : 0.03);
  const termCount = loan.termCount || 5;
  const interest = loan.amount * interestRate * termCount;

  return interest;
}

/**
 * Calculate total due amount for a loan (principal + interest)
 * @param loan - Loan object
 * @returns Total due amount
 */
export function calculateTotalDue(loan: Loan): number {
  const interest = calculateInterestEarned(loan);
  return loan.amount + interest;
}

/**
 * Calculate dividend distribution for all members
 * @param totalInterestPool - Total interest to distribute
 * @param members - Array of members
 * @param date - Distribution date (ISO string)
 * @param periodsCovered - Array of period IDs covered by this distribution
 * @returns DividendDistribution object
 */
export function calculateDividendDistribution(
  totalInterestPool: number,
  members: Member[],
  date: string,
  periodsCovered: string[]
): DividendDistribution {
  const totalShares = calculateTotalShares(members);

  // Prevent division by zero
  if (totalShares === 0) {
    return {
      id: `dividend-${Date.now()}`,
      date,
      totalInterestPool: 0,
      totalShares: 0,
      perShareDividend: 0,
      distributions: [],
      periodsCovered,
    };
  }

  const perShareDividend = totalInterestPool / totalShares;

  const distributions: MemberDividend[] = members.map((member) => {
    const memberShares = member.committedShares || 0;
    const isForfeited = member.forfeited || false;
    const dividendAmount = isForfeited ? 0 : memberShares * perShareDividend;

    return {
      memberId: member.id,
      shares: memberShares,
      dividendAmount,
      forfeited: isForfeited,
    };
  });

  return {
    id: `dividend-${Date.now()}`,
    date,
    totalInterestPool,
    totalShares,
    perShareDividend,
    distributions,
    periodsCovered,
  };
}

/**
 * DEPRECATED: This function is no longer applicable with the fixed commitment model.
 * Shares are now manually set by admin, not calculated from payments.
 * @deprecated
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function calculateMemberShareHistory(_payments: Payment[]): MemberShareHistory[] {
  console.log("calculateMemberShareHistory is deprecated - shares are now manually set");
  return [];
}

/**
 * Calculate total interest pool from all paid/approved loans
 * @param loans - Array of loans
 * @returns Total interest earned
 */
export function calculateTotalInterestPool(loans: Loan[]): number {
  return loans
    .filter((loan) => loan.status === "APPROVED" || loan.status === "PAID")
    .reduce((sum, loan) => sum + calculateInterestEarned(loan), 0);
}

/**
 * Calculate forfeited interest amount for a member
 * Used when a member forfeits their interest
 * @param member - Member object
 * @param perShareDividend - Current per-share dividend amount
 * @returns Forfeited amount
 */
export function calculateForfeitedInterest(
  member: Member,
  perShareDividend: number
): number {
  const shares = member.committedShares || 0;
  return shares * perShareDividend;
}

/**
 * DEPRECATED: This function is no longer applicable with the fixed commitment model.
 * Use member.committedShares directly instead.
 * @deprecated
 */
export function getMemberTotalShares(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _shareHistory: MemberShareHistory[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _memberId: number
): number {
  console.log("getMemberTotalShares is deprecated - use member.committedShares instead");
  return 0;
}

/**
 * Calculate total dividends distributed
 * @param dividendDistributions - Array of dividend distributions
 * @returns Total amount distributed
 */
export function calculateTotalDividendsDistributed(
  dividendDistributions: DividendDistribution[]
): number {
  return dividendDistributions.reduce((sum, distribution) => {
    const distributionTotal = distribution.distributions.reduce(
      (memberSum, memberDividend) => memberSum + memberDividend.dividendAmount,
      0
    );
    return sum + distributionTotal;
  }, 0);
}

/**
 * Calculate expected contribution for a member based on committed shares
 * @param committedShares - Member's committed shares
 * @param sharePrice - Price per share (default: 500)
 * @returns Expected contribution amount
 */
export function calculateExpectedContribution(
  committedShares: number,
  sharePrice: number = 500
): number {
  return committedShares * sharePrice;
}

/**
 * Check if member's payment matches their commitment
 * @param payment - Payment amount
 * @param committedShares - Member's committed shares
 * @param sharePrice - Price per share (default: 500)
 * @returns Object with compliance status and details
 */
export function checkPaymentCompliance(
  payment: number,
  committedShares: number,
  sharePrice: number = 500
): {
  isCompliant: boolean;
  expected: number;
  actual: number;
  difference: number;
} {
  const expected = calculateExpectedContribution(committedShares, sharePrice);
  const difference = payment - expected;

  return {
    isCompliant: payment >= expected,
    expected,
    actual: payment,
    difference,
  };
}
