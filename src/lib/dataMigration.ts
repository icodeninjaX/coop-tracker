import {
  CoopState,
  Member,
} from "../types";
import {
  calculateInterestEarned,
} from "./shareCalculations";

/**
 * Check if the state needs share system migration
 * @param state - Current CoopState
 * @returns true if migration is needed
 */
export function needsShareMigration(state: CoopState): boolean {
  // Check if share system fields are missing or empty
  const hasSharePrice = state.sharePrice !== undefined && state.sharePrice > 0;
  const hasShareHistory = state.shareHistory !== undefined && state.shareHistory.length >= 0;
  const hasDividendDistributions = state.dividendDistributions !== undefined;
  const hasTotalInterestPool = state.totalInterestPool !== undefined;

  // If any core field is missing, migration is needed
  if (!hasSharePrice || !hasShareHistory || !hasDividendDistributions || !hasTotalInterestPool) {
    console.log("Share system migration needed: Missing core fields");
    return true;
  }

  // Check if members have committedShares field
  const membersNeedMigration = state.members.some(
    (m) => m.committedShares === undefined
  );

  if (membersNeedMigration) {
    console.log("Share system migration needed: Members missing committedShares");
    return true;
  }

  return false;
}

/**
 * Migrate existing coop data to include share system
 * @param state - Current CoopState
 * @returns Migrated CoopState
 */
export function migrateToShareSystem(state: CoopState): CoopState {
  console.log("Starting share system migration...");

  // Initialize share system fields
  const sharePrice = state.sharePrice || 500;
  const dividendDistributions = state.dividendDistributions || [];

  // DO NOT calculate shares from payments
  // Instead, initialize all members with 0 committed shares
  // Admin will manually set them
  const updatedMembers: Member[] = state.members.map((member) => ({
    ...member,
    committedShares: member.committedShares || 0, // Keep existing or default to 0
    forfeited: member.forfeited || false,
  }));

  console.log("Members initialized with default 0 committed shares");

  // Calculate total interest pool from paid/approved loans
  const totalInterestPool = state.loans
    .filter((loan) => loan.status === "APPROVED" || loan.status === "PAID")
    .reduce((sum, loan) => sum + calculateInterestEarned(loan), 0);

  console.log(
    `Calculated total interest pool: ₱${totalInterestPool.toLocaleString()}`
  );

  return {
    ...state,
    sharePrice,
    totalInterestPool,
    dividendDistributions,
    shareHistory: [], // Clear old accumulation-based history
    members: updatedMembers,
  };
}

/**
 * DEPRECATED: This function is no longer applicable with the fixed commitment model.
 * Shares are now manually set by admin, not calculated from payments.
 * Keeping for backwards compatibility but it does nothing.
 * @deprecated
 */
export function recalculateAllShares(state: CoopState): CoopState {
  console.log("recalculateAllShares is deprecated - shares are now manually set");
  return state;
}

/**
 * Validate share system data integrity
 * @param state - Current CoopState
 * @returns Validation result with any errors found
 */
export function validateShareSystem(state: CoopState): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if share price is valid
  if (!state.sharePrice || state.sharePrice <= 0) {
    errors.push("Invalid share price");
  }

  // Check if member shares are non-negative
  state.members.forEach((member) => {
    const memberShares = member.committedShares || 0;

    if (memberShares < 0) {
      errors.push(
        `Member ${member.id} (${member.name}): Committed shares cannot be negative (${memberShares})`
      );
    }
  });

  // Check if interest pool is non-negative
  if (state.totalInterestPool < 0) {
    errors.push("Interest pool cannot be negative");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get migration summary for user review
 * @param oldState - State before migration
 * @param newState - State after migration
 * @returns Summary of changes
 */
export function getMigrationSummary(
  oldState: CoopState,
  newState: CoopState
): {
  membersUpdated: number;
  totalCommittedShares: number;
  shareHistoryEntries: number;
  interestPoolCalculated: number;
} {
  const membersUpdated = newState.members.filter((m) => (m.committedShares || 0) > 0).length;
  const totalCommittedShares = newState.members.reduce(
    (sum, m) => sum + (m.committedShares || 0),
    0
  );
  const shareHistoryEntries = newState.shareHistory.length;
  const interestPoolCalculated = newState.totalInterestPool || 0;

  return {
    membersUpdated,
    totalCommittedShares,
    shareHistoryEntries,
    interestPoolCalculated,
  };
}
