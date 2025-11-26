"use client";

import {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
  useState,
} from "react";
import {
  CoopState,
  Payment,
  Loan,
  CollectionPeriod,
  Repayment,
  Penalty,
  YearlyArchive,
} from "../types";
import { loadRemoteState, saveRemoteState } from "@/lib/remoteState";
import { useAuth } from "./AuthContext";
import {
  calculateSharesFromContribution,
  calculateInterestEarned,
  calculateDividendDistribution,
  calculateTotalShares,
} from "@/lib/shareCalculations";
import {
  needsShareMigration,
  migrateToShareSystem,
} from "@/lib/dataMigration";

// ---- Schedule utilities (module scope for stable references) ----
// Utilities to compute due schedules
function toYMD(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nextCutoffOnOrAfter(base: Date): Date {
  const d = new Date(base);
  const day = d.getDate();
  if (day <= 10) {
    d.setDate(10);
  } else if (day <= 25) {
    d.setDate(25);
  } else {
    d.setMonth(d.getMonth() + 1);
    d.setDate(10);
  }
  d.setHours(12, 0, 0, 0);
  return d;
}

function generateCutoffSchedule(start: Date, count: number): Date[] {
  const dates: Date[] = [];
  let current = nextCutoffOnOrAfter(start);
  for (let i = 0; i < count; i++) {
    dates.push(new Date(current));
    const day = current.getDate();
    if (day === 10) {
      current = new Date(current);
      current.setDate(25);
    } else {
      current = new Date(current);
      current.setMonth(current.getMonth() + 1);
      current.setDate(10);
    }
    current.setHours(12, 0, 0, 0);
  }
  return dates;
}

function generateMonthlySchedule(start: Date, count: number): Date[] {
  const dates: Date[] = [];
  let current = new Date(start);
  current.setHours(12, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(current);
    d.setMonth(d.getMonth() + 1);
    const day = Math.min(
      current.getDate(),
      new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    );
    d.setDate(day);
    d.setHours(12, 0, 0, 0);
    dates.push(d);
    current = d;
  }
  return dates;
}

const initialState: CoopState = {
  beginningBalance: 0,
  currentBalance: 0,
  members: Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    name: `Member ${i + 1}`,
    committedShares: 0,
    forfeited: false,
  })),
  collections: [],
  loans: [],
  repayments: [],
  penalties: [],
  selectedPeriod: "",
  archives: [],
  // Share system fields
  sharePrice: 500, // Default: ₱500 per share
  totalInterestPool: 0,
  dividendDistributions: [],
  shareHistory: [],
};

type CoopAction =
  | { type: "ADD_PAYMENT"; payload: Payment }
  | { type: "ADD_LOAN"; payload: Loan }
  | { type: "UPDATE_LOAN"; payload: { loanId: string; loan: Partial<Loan> } }
  | { type: "DELETE_LOAN"; payload: { loanId: string } }
  | { type: "ADD_MEMBER"; payload: { name: string } }
  | { type: "UPDATE_MEMBER"; payload: { memberId: number; name: string } }
  | { type: "DELETE_MEMBER"; payload: { memberId: number } }
  | { type: "ADD_REPAYMENT"; payload: Repayment }
  | { type: "REMOVE_REPAYMENT"; payload: { repaymentId: string } }
  | { type: "ADD_PENALTY"; payload: Penalty }
  | { type: "REMOVE_PENALTY"; payload: { penaltyId: string } }
  | {
      type: "UPDATE_LOAN_STATUS";
      payload: {
        loanId: string;
        status: Loan["status"];
        dateApproved?: string;
        disbursementPeriodId?: string;
      };
    }
  | { type: "UPDATE_BALANCE"; payload: number }
  | { type: "ADD_COLLECTION_PERIOD"; payload: CollectionPeriod }
  | { type: "DELETE_COLLECTION_PERIOD"; payload: { periodId: string } }
  | {
      type: "UPDATE_COLLECTION_PERIOD";
      payload: { periodId: string; date: string; defaultContribution?: number };
    }
  | {
      type: "REMOVE_PAYMENT";
      payload: { memberId: number; collectionPeriod: string };
    }
  | { type: "UPDATE_MEMBER_NAME"; payload: { memberId: number; name: string } }
  | {
      type: "UPDATE_PERIOD_DEFAULT";
      payload: { periodId: string; defaultContribution: number };
    }
  | {
      type: "UPSERT_PAYMENT";
      payload: {
        memberId: number;
        collectionPeriod: string;
        amount: number;
        date?: string;
      };
    }
  | { type: "SET_SELECTED_PERIOD"; payload: { periodId: string } }
  | { type: "LOAD_STATE"; payload: CoopState }
  | { type: "ARCHIVE_YEAR"; payload: { year: number } }
  | { type: "RESET_PERIODS" }
  // Share system actions
  | { type: "DISTRIBUTE_DIVIDENDS"; payload: { date: string } }
  | { type: "FORFEIT_INTEREST"; payload: { memberId: number; date: string } }
  | { type: "RESTORE_MEMBER_INTEREST"; payload: { memberId: number } }
  | { type: "UPDATE_SHARE_PRICE"; payload: { sharePrice: number } }
  | { type: "UPDATE_MEMBER_SHARES"; payload: { memberId: number; shares: number } }
  | { type: "BULK_UPDATE_SHARES"; payload: { updates: Array<{ memberId: number; shares: number }> } };

function coopReducer(state: CoopState, action: CoopAction): CoopState {
  switch (action.type) {
    case "ADD_PAYMENT":
      const newCollections = [...state.collections];
      const collectionPeriod = newCollections.find(
        (c) => c.id === action.payload.collectionPeriod
      );
      if (collectionPeriod) {
        // Prevent duplicate payment for the same member in the same period
        const alreadyPaid = collectionPeriod.payments.some(
          (p) => p.memberId === action.payload.memberId
        );
        if (!alreadyPaid) {
          const amount =
            action.payload.amount || collectionPeriod.defaultContribution || 0;
          collectionPeriod.payments.push({ ...action.payload, amount });
          collectionPeriod.totalCollected += amount;
        }
      }
      return {
        ...state,
        collections: newCollections,
      };

    case "ADD_LOAN": {
      // If loan is added with APPROVED or PAID status, add its interest to pool
      let newInterestPool = state.totalInterestPool;
      if (action.payload.status === "APPROVED" || action.payload.status === "PAID") {
        const interestEarned = calculateInterestEarned(action.payload);
        newInterestPool += interestEarned;
      }

      return {
        ...state,
        loans: [...state.loans, action.payload],
        totalInterestPool: newInterestPool,
      };
    }

    case "UPDATE_LOAN": {
      // If status is being changed, update interest pool
      const oldLoan = state.loans.find((loan) => loan.id === action.payload.loanId);
      let newInterestPool = state.totalInterestPool;

      if (oldLoan && action.payload.loan.status && action.payload.loan.status !== oldLoan.status) {
        const oldStatusIncludesInterest = oldLoan.status === "APPROVED" || oldLoan.status === "PAID";
        const newStatusIncludesInterest = action.payload.loan.status === "APPROVED" || action.payload.loan.status === "PAID";
        const interestEarned = calculateInterestEarned(oldLoan);

        if (!oldStatusIncludesInterest && newStatusIncludesInterest) {
          // Adding interest
          newInterestPool += interestEarned;
        } else if (oldStatusIncludesInterest && !newStatusIncludesInterest) {
          // Removing interest
          newInterestPool = Math.max(0, newInterestPool - interestEarned);
        }
      }

      return {
        ...state,
        loans: state.loans.map((loan) =>
          loan.id === action.payload.loanId
            ? { ...loan, ...action.payload.loan }
            : loan
        ),
        totalInterestPool: newInterestPool,
      };
    }

    case "DELETE_LOAN": {
      // If deleting an APPROVED or PAID loan, remove its interest from pool
      const loanToDelete = state.loans.find((loan) => loan.id === action.payload.loanId);
      let newInterestPool = state.totalInterestPool;

      if (loanToDelete && (loanToDelete.status === "APPROVED" || loanToDelete.status === "PAID")) {
        const interestEarned = calculateInterestEarned(loanToDelete);
        newInterestPool = Math.max(0, newInterestPool - interestEarned);
      }

      return {
        ...state,
        loans: state.loans.filter((loan) => loan.id !== action.payload.loanId),
        repayments: state.repayments.filter(
          (repayment) => repayment.loanId !== action.payload.loanId
        ),
        penalties: state.penalties.filter(
          (penalty) => penalty.loanId !== action.payload.loanId
        ),
        totalInterestPool: newInterestPool,
      };
    }

    case "ADD_MEMBER": {
      const newMemberId = Math.max(...state.members.map((m) => m.id), 0) + 1;
      return {
        ...state,
        members: [
          ...state.members,
          {
            id: newMemberId,
            name: action.payload.name,
            committedShares: 0,
            forfeited: false,
          },
        ],
      };
    }

    case "UPDATE_MEMBER":
      return {
        ...state,
        members: state.members.map((member) =>
          member.id === action.payload.memberId
            ? { ...member, name: action.payload.name }
            : member
        ),
      };

    case "DELETE_MEMBER": {
      const memberId = action.payload.memberId;
      // Get loan IDs for this member
      const memberLoanIds = state.loans
        .filter((loan) => loan.memberId === memberId)
        .map((loan) => loan.id);

      // Also remove all related data for this member
      const newCollections = state.collections.map((collection) => {
        const filteredPayments = collection.payments.filter(
          (p) => p.memberId !== memberId
        );
        const removedTotal = collection.payments
          .filter((p) => p.memberId === memberId)
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        return {
          ...collection,
          payments: filteredPayments,
          totalCollected: collection.totalCollected - removedTotal,
        };
      });

      return {
        ...state,
        members: state.members.filter((member) => member.id !== memberId),
        collections: newCollections,
        loans: state.loans.filter((loan) => loan.memberId !== memberId),
        repayments: state.repayments.filter(
          (repayment) => repayment.memberId !== memberId
        ),
        penalties: state.penalties.filter(
          (penalty) => !memberLoanIds.includes(penalty.loanId)
        ),
      };
    }

    case "ADD_REPAYMENT": {
      const repayments = [...state.repayments, action.payload];
      // Auto-mark loan PAID if fully repaid (principal+interest+assessed penalties)
      const repaidForLoan = repayments
        .filter((r) => r.loanId === action.payload.loanId)
        .reduce((s, r) => s + (r.amount || 0), 0);
      const penaltiesForLoan = state.penalties
        .filter((p) => p.loanId === action.payload.loanId)
        .reduce((s, p) => s + (p.amount || 0), 0);
      const loans = state.loans.map((loan) => {
        if (loan.id !== action.payload.loanId || loan.status === "REJECTED")
          return loan;
        const rate =
          loan.interestRate ??
          (loan.repaymentPlan === "MONTHLY"
            ? 0.04
            : loan.repaymentPlan === "CUT_OFF"
            ? 0.03
            : 0);
        const months = loan.termCount ?? 0;
        const totalDueBase = (loan.amount || 0) * (1 + rate * months);
        const totalDue = totalDueBase + penaltiesForLoan;
        if (repaidForLoan >= totalDue && loan.status !== "PAID") {
          return {
            ...loan,
            status: "PAID" as Loan["status"],
            dateClosed: new Date().toISOString(),
          };
        }
        return loan;
      });
      return { ...state, repayments, loans };
    }

    case "ADD_PENALTY": {
      return { ...state, penalties: [...state.penalties, action.payload] };
    }

    case "REMOVE_PENALTY": {
      return {
        ...state,
        penalties: state.penalties.filter(
          (p) => p.id !== action.payload.penaltyId
        ),
      };
    }

    case "REMOVE_REPAYMENT": {
      const toRemove = state.repayments.find(
        (r) => r.id === action.payload.repaymentId
      );
      if (!toRemove) return state;
      const repayments = state.repayments.filter(
        (r) => r.id !== action.payload.repaymentId
      );
      // Re-evaluate loan status in case it was PAID because of this repayment
      const repaidForLoan = repayments
        .filter((r) => r.loanId === toRemove.loanId)
        .reduce((s, r) => s + (r.amount || 0), 0);
      const loans = state.loans.map((loan) => {
        if (loan.id !== toRemove.loanId) return loan;
        const rate =
          loan.interestRate ??
          (loan.repaymentPlan === "MONTHLY"
            ? 0.04
            : loan.repaymentPlan === "CUT_OFF"
            ? 0.03
            : 0);
        const months = loan.termCount ?? 0;
        const penaltiesForLoan = state.penalties
          .filter((p) => p.loanId === loan.id)
          .reduce((s, p) => s + (p.amount || 0), 0);
        const totalDue =
          (loan.amount || 0) * (1 + rate * months) + penaltiesForLoan;
        if (loan.status !== "REJECTED") {
          if (repaidForLoan >= totalDue) {
            // remain PAID
            return {
              ...loan,
              status: "PAID" as Loan["status"],
              dateClosed: loan.dateClosed ?? new Date().toISOString(),
            };
          }
          // if previously PAID and now not fully repaid, revert to APPROVED and clear closed date
          return {
            ...loan,
            status: (loan.status === "PAID"
              ? "APPROVED"
              : loan.status) as Loan["status"],
            dateClosed: repaidForLoan >= totalDue ? loan.dateClosed : undefined,
          };
        }
        return loan;
      });
      return { ...state, repayments, loans };
    }

    case "UPDATE_LOAN_STATUS": {
      // Find the loan being updated
      const loanToUpdate = state.loans.find((l) => l.id === action.payload.loanId);
      if (!loanToUpdate) return state;

      const oldStatus = loanToUpdate.status;
      const newStatus = action.payload.status;

      const updatedLoans = state.loans.map((loan) =>
        loan.id === action.payload.loanId
          ? {
              ...loan,
              status: action.payload.status,
              dateApproved:
                action.payload.status === "APPROVED"
                  ? action.payload.dateApproved ?? new Date().toISOString()
                  : loan.dateApproved,
              disbursementPeriodId:
                action.payload.status === "APPROVED"
                  ? action.payload.disbursementPeriodId ??
                    loan.disbursementPeriodId
                  : loan.disbursementPeriodId,
              dateClosed:
                action.payload.status === "PAID"
                  ? new Date().toISOString()
                  : loan.dateClosed,
            }
          : loan
      );

      // Update interest pool based on status transitions
      let newInterestPool = state.totalInterestPool;
      const interestEarned = calculateInterestEarned(loanToUpdate);

      // Status transition logic:
      // Add interest when loan becomes APPROVED or PAID (from PENDING or REJECTED)
      // Remove interest when loan moves back to PENDING or REJECTED (from APPROVED or PAID)

      const oldStatusIncludesInterest = oldStatus === "APPROVED" || oldStatus === "PAID";
      const newStatusIncludesInterest = newStatus === "APPROVED" || newStatus === "PAID";

      if (!oldStatusIncludesInterest && newStatusIncludesInterest) {
        // Adding interest: PENDING/REJECTED → APPROVED/PAID
        newInterestPool += interestEarned;
      } else if (oldStatusIncludesInterest && !newStatusIncludesInterest) {
        // Removing interest: APPROVED/PAID → PENDING/REJECTED
        newInterestPool = Math.max(0, newInterestPool - interestEarned);
      }
      // If both old and new status include interest (APPROVED ↔ PAID), no change needed

      return {
        ...state,
        loans: updatedLoans,
        totalInterestPool: newInterestPool,
      };
    }

    case "UPDATE_BALANCE":
      return {
        ...state,
        currentBalance: action.payload,
      };

    case "REMOVE_PAYMENT": {
      const collectionsCopy = state.collections.map((c) => ({
        ...c,
        payments: [...c.payments],
      }));
      const period = collectionsCopy.find(
        (c) => c.id === action.payload.collectionPeriod
      );

      if (period) {
        const removed = period.payments.filter(
          (p) => p.memberId === action.payload.memberId
        );
        period.payments = period.payments.filter(
          (p) => p.memberId !== action.payload.memberId
        );
        if (removed.length > 0) {
          const removedTotal = removed.reduce(
            (sum, p) => sum + (p.amount || 0),
            0
          );
          period.totalCollected = Math.max(
            0,
            (period.totalCollected || 0) - removedTotal
          );
        }
      }

      // SIMPLIFIED: Just update collections, no share changes
      return { ...state, collections: collectionsCopy };
    }

    case "UPSERT_PAYMENT": {
      const { memberId, collectionPeriod, amount } = action.payload;
      const amt = isFinite(amount) && amount > 0 ? amount : 0;
      const collectionsCopy = state.collections.map((c) => ({
        ...c,
        payments: [...c.payments],
      }));
      const period = collectionsCopy.find((c) => c.id === collectionPeriod);

      if (period) {
        const idx = period.payments.findIndex((p) => p.memberId === memberId);
        if (idx >= 0) {
          // Update existing payment
          const prev = period.payments[idx];
          const delta = amt - (prev.amount || 0);
          period.payments[idx] = {
            ...prev,
            amount: amt,
            date: action.payload.date ?? prev.date,
          };
          period.totalCollected = (period.totalCollected || 0) + delta;
        } else {
          // New payment
          const paymentDate = action.payload.date ?? new Date().toISOString();
          period.payments.push({
            memberId,
            amount: amt,
            date: paymentDate,
            collectionPeriod,
          });
          period.totalCollected = (period.totalCollected || 0) + amt;
        }
      }

      // SIMPLIFIED: Just update collections, no share changes
      return { ...state, collections: collectionsCopy };
    }

    case "UPDATE_MEMBER_NAME":
      return {
        ...state,
        members: state.members.map((m) =>
          m.id === action.payload.memberId
            ? { ...m, name: action.payload.name }
            : m
        ),
      };

    case "UPDATE_PERIOD_DEFAULT":
      return {
        ...state,
        collections: state.collections.map((c) =>
          c.id === action.payload.periodId
            ? { ...c, defaultContribution: action.payload.defaultContribution }
            : c
        ),
      };

    case "ADD_COLLECTION_PERIOD":
      // Avoid duplicate periods by id
      if (state.collections.some((c) => c.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        collections: [...state.collections, action.payload],
      };

    case "DELETE_COLLECTION_PERIOD": {
      const periodToDelete = state.collections.find(
        (c) => c.id === action.payload.periodId
      );
      if (!periodToDelete) return state;

      // Remove the period
      const updatedCollections = state.collections.filter(
        (c) => c.id !== action.payload.periodId
      );

      // Remove all payments from this period
      const updatedPayments = updatedCollections.map((c) => ({
        ...c,
        payments: c.payments.filter(
          (p) => p.collectionPeriod !== action.payload.periodId
        ),
      }));

      // Remove any repayments linked to this period
      const updatedRepayments = state.repayments.filter(
        (r) => r.periodId !== action.payload.periodId
      );

      // Remove any penalties linked to this period
      const updatedPenalties = state.penalties.filter(
        (p) => p.periodId !== action.payload.periodId
      );

      // Remove any loans disbursed in this period
      const updatedLoans = state.loans.map((loan) =>
        loan.disbursementPeriodId === action.payload.periodId
          ? { ...loan, disbursementPeriodId: undefined }
          : loan
      );

      // If the deleted period was selected, select the first remaining period or clear
      let newSelectedPeriod = state.selectedPeriod;
      if (state.selectedPeriod === action.payload.periodId) {
        newSelectedPeriod = updatedCollections.length > 0 ? updatedCollections[0].id : "";
      }

      return {
        ...state,
        collections: updatedPayments,
        repayments: updatedRepayments,
        penalties: updatedPenalties,
        loans: updatedLoans,
        selectedPeriod: newSelectedPeriod,
      };
    }

    case "UPDATE_COLLECTION_PERIOD": {
      const { periodId, date, defaultContribution } = action.payload;
      const periodToUpdate = state.collections.find((c) => c.id === periodId);
      if (!periodToUpdate) return state;

      // Update the period with new values
      const updatedCollections = state.collections.map((c) => {
        if (c.id !== periodId) return c;

        // If date changed, update the ID as well (since ID is based on date)
        const newId = date !== c.date ? date : c.id;

        // Update all payments to reference the new period ID
        const updatedPayments = c.payments.map((p) => ({
          ...p,
          collectionPeriod: newId,
        }));

        return {
          ...c,
          id: newId,
          date: date,
          defaultContribution:
            defaultContribution !== undefined ? defaultContribution : c.defaultContribution,
          payments: updatedPayments,
        };
      });

      // If the date changed, update references in repayments, penalties, and loans
      const newPeriodId = date !== periodToUpdate.date ? date : periodId;

      const updatedRepayments = state.repayments.map((r) =>
        r.periodId === periodId ? { ...r, periodId: newPeriodId } : r
      );

      const updatedPenalties = state.penalties.map((p) =>
        p.periodId === periodId ? { ...p, periodId: newPeriodId } : p
      );

      const updatedLoans = state.loans.map((l) =>
        l.disbursementPeriodId === periodId
          ? { ...l, disbursementPeriodId: newPeriodId }
          : l
      );

      // Update selected period if it was the one being edited
      const newSelectedPeriod =
        state.selectedPeriod === periodId ? newPeriodId : state.selectedPeriod;

      return {
        ...state,
        collections: updatedCollections,
        repayments: updatedRepayments,
        penalties: updatedPenalties,
        loans: updatedLoans,
        selectedPeriod: newSelectedPeriod,
      };
    }

    case "LOAD_STATE": {
      type RawLoan = Partial<Loan> & {
        memberId: number;
        amount: number;
        dateIssued: string;
        status: Loan["status"];
      };
      const rawLoans: RawLoan[] = (action.payload.loans as RawLoan[]) || [];
      // Deduplicate and merge collection periods by id
      const mergedCollectionsMap = new Map<string, CollectionPeriod>();
      (action.payload.collections || []).forEach((p) => {
        const existing = mergedCollectionsMap.get(p.id);
        if (!existing) {
          mergedCollectionsMap.set(p.id, {
            id: p.id,
            date: p.date,
            totalCollected: p.totalCollected || 0,
            payments: [...(p.payments || [])],
          });
        } else {
          const allPayments = [...existing.payments, ...(p.payments || [])];
          // Unique by memberId per period
          const seen = new Set<number>();
          const uniquePayments = allPayments.filter((pay) => {
            if (seen.has(pay.memberId)) return false;
            seen.add(pay.memberId);
            return true;
          });
          const total = uniquePayments.reduce(
            (sum, pay) => sum + (pay.amount || 0),
            0
          );
          mergedCollectionsMap.set(p.id, {
            id: existing.id,
            date: existing.date,
            payments: uniquePayments,
            totalCollected: total,
          });
        }
      });
      const mergedCollections = Array.from(mergedCollectionsMap.values());
      const repayments: Repayment[] =
        (action.payload.repayments as Repayment[]) || [];
      const penalties: Penalty[] =
        (action.payload.penalties as Penalty[]) || [];
      // Normalize loans and auto-mark PAID for fully repaid
      const normalizedLoans = rawLoans.map((l) => ({
        id: l.id ?? `${l.dateIssued}-${l.memberId}`,
        memberId: l.memberId,
        amount: l.amount,
        dateIssued: l.dateIssued,
        status: (l.status as Loan["status"]) ?? "PENDING",
        dateApproved: l.dateApproved,
        disbursementPeriodId: l.disbursementPeriodId,
        repaymentPlan: l.repaymentPlan as Loan["repaymentPlan"],
        interestRate: l.interestRate,
        dateClosed: l.dateClosed,
        termCount: l.termCount,
      }));
      const repaidByLoan = new Map<string, number>();
      repayments.forEach((r) => {
        repaidByLoan.set(
          r.loanId,
          (repaidByLoan.get(r.loanId) || 0) + (r.amount || 0)
        );
      });
      const loans: Loan[] = normalizedLoans.map((loan) => {
        const repaid = repaidByLoan.get(loan.id) || 0;
        const rate =
          loan.interestRate ??
          (loan.repaymentPlan === "MONTHLY"
            ? 0.04
            : loan.repaymentPlan === "CUT_OFF"
            ? 0.03
            : 0);
        const months = loan.termCount ?? 0;
        const penaltiesForLoan = penalties
          .filter((p) => p.loanId === (loan.id as string))
          .reduce((s, p) => s + (p.amount || 0), 0);
        const totalDue =
          (loan.amount || 0) * (1 + rate * months) + penaltiesForLoan;
        if (loan.status !== "REJECTED" && repaid >= totalDue) {
          return {
            ...loan,
            status: "PAID" as Loan["status"],
            dateClosed: loan.dateClosed ?? new Date().toISOString(),
          };
        }
        return loan;
      });
      // Recalculate total interest pool from all APPROVED and PAID loans
      const recalculatedInterestPool = loans
        .filter((loan) => loan.status === "APPROVED" || loan.status === "PAID")
        .reduce((sum, loan) => sum + calculateInterestEarned(loan), 0);

      return {
        ...action.payload,
        loans,
        collections: mergedCollections,
        repayments,
        penalties,
        archives: action.payload.archives || [],
        // Preserve the current selected period if it exists and is valid
        selectedPeriod:
          action.payload.selectedPeriod || state.selectedPeriod || "",
        // Use recalculated interest pool to ensure accuracy
        totalInterestPool: recalculatedInterestPool,
      };
    }

    case "SET_SELECTED_PERIOD": {
      return {
        ...state,
        selectedPeriod: action.payload.periodId,
      };
    }

    case "ARCHIVE_YEAR": {
      const { year } = action.payload;

      // Filter data for the specified year
      const yearCollections = state.collections.filter(
        (c) => new Date(c.date).getFullYear() === year
      );
      const yearLoans = state.loans.filter(
        (l) => new Date(l.dateIssued).getFullYear() === year
      );
      const yearRepayments = state.repayments.filter(
        (r) => new Date(r.date).getFullYear() === year
      );
      const yearPenalties = state.penalties.filter(
        (p) => new Date(p.date).getFullYear() === year
      );

      // Calculate summary statistics
      const totalCollected = yearCollections.reduce(
        (sum, c) => sum + c.totalCollected,
        0
      );
      const totalDisbursed = yearLoans
        .filter((l) => l.status === "APPROVED")
        .reduce((sum, l) => sum + l.amount, 0);
      const totalRepayments = yearRepayments.reduce(
        (sum, r) => sum + r.amount,
        0
      );
      const totalPenalties = yearPenalties.reduce(
        (sum, p) => sum + p.amount,
        0
      );

      // Calculate ending balance for the year
      const endingBalance = totalCollected + totalRepayments - totalDisbursed;

      // Count active members (members who made at least one payment during the year)
      const activeMemberIds = new Set(
        yearCollections.flatMap((c) => c.payments.map((p) => p.memberId))
      );

      // Create archive
      const archive: YearlyArchive = {
        year,
        archivedDate: new Date().toISOString(),
        summary: {
          totalCollected,
          totalDisbursed,
          totalRepayments,
          totalPenalties,
          endingBalance,
          activeMembers: activeMemberIds.size,
          totalLoansIssued: yearLoans.length,
        },
        collections: yearCollections,
        loans: yearLoans,
        repayments: yearRepayments,
        penalties: yearPenalties,
      };

      // Remove archived data from current state
      const remainingCollections = state.collections.filter(
        (c) => new Date(c.date).getFullYear() !== year
      );
      const remainingLoans = state.loans.filter(
        (l) => new Date(l.dateIssued).getFullYear() !== year
      );
      const remainingRepayments = state.repayments.filter(
        (r) => new Date(r.date).getFullYear() !== year
      );
      const remainingPenalties = state.penalties.filter(
        (p) => new Date(p.date).getFullYear() !== year
      );

      return {
        ...state,
        archives: [...state.archives, archive],
        collections: remainingCollections,
        loans: remainingLoans,
        repayments: remainingRepayments,
        penalties: remainingPenalties,
        beginningBalance: endingBalance, // Carry forward the balance
        currentBalance: state.currentBalance, // Keep current balance as is
        selectedPeriod: remainingCollections.length > 0 ? remainingCollections[0].id : "",
      };
    }

    case "RESET_PERIODS": {
      return {
        ...state,
        collections: [],
        loans: [],
        repayments: [],
        penalties: [],
        selectedPeriod: "",
        // Keep members and balance, but reset all transactional data
      };
    }

    case "DISTRIBUTE_DIVIDENDS": {
      const { date } = action.payload;

      // Get all period IDs
      const periodsCovered = state.collections.map((c) => c.id);

      // Calculate dividend distribution
      const distribution = calculateDividendDistribution(
        state.totalInterestPool,
        state.members,
        date,
        periodsCovered
      );

      return {
        ...state,
        dividendDistributions: [...state.dividendDistributions, distribution],
        totalInterestPool: 0, // Reset pool after distribution
      };
    }

    case "FORFEIT_INTEREST": {
      const { memberId, date } = action.payload;

      // Calculate potential dividend to track forfeited amount
      const totalShares = calculateTotalShares(state.members);
      const perShareDividend = totalShares > 0 ? state.totalInterestPool / totalShares : 0;
      const member = state.members.find((m) => m.id === memberId);
      const forfeitedAmount = member ? (member.committedShares || 0) * perShareDividend : 0;

      return {
        ...state,
        members: state.members.map((m) =>
          m.id === memberId
            ? {
                ...m,
                forfeited: true,
                forfeitureDate: date,
                forfeitedInterest: forfeitedAmount,
              }
            : m
        ),
      };
    }

    case "RESTORE_MEMBER_INTEREST": {
      const { memberId } = action.payload;
      return {
        ...state,
        members: state.members.map((m) =>
          m.id === memberId
            ? {
                ...m,
                forfeited: false,
                forfeitureDate: undefined,
                forfeitedInterest: undefined,
              }
            : m
        ),
      };
    }

    case "UPDATE_SHARE_PRICE": {
      const { sharePrice } = action.payload;
      return {
        ...state,
        sharePrice: sharePrice > 0 ? sharePrice : state.sharePrice,
      };
    }

    case "UPDATE_MEMBER_SHARES": {
      const { memberId, shares } = action.payload;
      const member = state.members.find((m) => m.id === memberId);

      if (!member) return state;

      const previousShares = member.committedShares || 0;
      const newShares = Math.max(0, shares); // Ensure non-negative

      // Update member shares
      const updatedMembers = state.members.map((m) =>
        m.id === memberId
          ? { ...m, committedShares: newShares }
          : m
      );

      // Add to history if shares changed
      if (previousShares !== newShares) {
        const historyEntry = {
          memberId,
          date: new Date().toISOString(),
          previousShares,
          newShares,
        };

        return {
          ...state,
          members: updatedMembers,
          shareHistory: [...state.shareHistory, historyEntry],
        };
      }

      return {
        ...state,
        members: updatedMembers,
      };
    }

    case "BULK_UPDATE_SHARES": {
      const { updates } = action.payload;
      const historyEntries: { memberId: number; date: string; previousShares: number; newShares: number }[] = [];

      const updatedMembers = state.members.map((member) => {
        const update = updates.find((u) => u.memberId === member.id);
        if (update) {
          const previousShares = member.committedShares || 0;
          const newShares = Math.max(0, update.shares);

          if (previousShares !== newShares) {
            historyEntries.push({
              memberId: member.id,
              date: new Date().toISOString(),
              previousShares,
              newShares,
            });
          }

          return { ...member, committedShares: newShares };
        }
        return member;
      });

      return {
        ...state,
        members: updatedMembers,
        shareHistory: [...state.shareHistory, ...historyEntries],
      };
    }

    default:
      return state;
  }
}

const CoopContext = createContext<
  | {
      state: CoopState;
      dispatch: React.Dispatch<CoopAction>;
    }
  | undefined
>(undefined);

export function CoopProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(coopReducer, initialState);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      console.log("CoopContext: No user, skipping load");
      setHasLoadedOnce(false); // Reset load state when no user
      return; // Don't load state if no user
    }

    console.log("CoopContext: Loading state for user", user.id);

    // Load state from Supabase if configured, else localStorage
    const init = async () => {
      try {
        const remote = await loadRemoteState(user.id);
        if (remote) {
          console.log("CoopContext: Loaded remote state", remote);

          // Check if share system migration is needed
          if (needsShareMigration(remote)) {
            console.log("CoopContext: Running share system migration...");
            const migratedState = migrateToShareSystem(remote);
            dispatch({ type: "LOAD_STATE", payload: migratedState });

            // Save migrated state immediately
            await saveRemoteState(migratedState, user.id);
            console.log("CoopContext: Migration completed and saved");
          } else {
            dispatch({ type: "LOAD_STATE", payload: remote });
          }

          // Auto-select latest period if none is selected
          if (
            !remote.selectedPeriod &&
            remote.collections &&
            remote.collections.length > 0
          ) {
            const latest = [...remote.collections].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )[0];
            if (latest) {
              dispatch({
                type: "SET_SELECTED_PERIOD",
                payload: { periodId: latest.id },
              });
            }
          }

          setHasLoadedOnce(true);
          // Keep localStorage as backup - don't remove it immediately
          if (typeof window !== "undefined") {
            localStorage.setItem(
              `coopState_${user.id}`,
              JSON.stringify(remote)
            );
            console.log(
              "CoopContext: Synced remote state to localStorage backup"
            );
          }
          return;
        }

        const savedState =
          typeof window !== "undefined"
            ? localStorage.getItem(`coopState_${user.id}`)
            : null;
        if (savedState) {
          console.log("CoopContext: Loaded local state");
          try {
            const parsedState = JSON.parse(savedState);
            dispatch({ type: "LOAD_STATE", payload: parsedState });

            // Auto-select latest period if none is selected
            if (
              !parsedState.selectedPeriod &&
              parsedState.collections &&
              parsedState.collections.length > 0
            ) {
              const latest = [...parsedState.collections].sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime()
              )[0];
              if (latest) {
                dispatch({
                  type: "SET_SELECTED_PERIOD",
                  payload: { periodId: latest.id },
                });
              }
            }
          } catch (parseError) {
            console.error(
              "CoopContext: Error parsing saved state:",
              parseError
            );
            console.log("CoopContext: Using initial state due to parse error");
          }
        } else {
          console.log("CoopContext: No saved state found, using initial state");
        }
        setHasLoadedOnce(true);
      } catch (error) {
        console.error("CoopContext: Error during initialization:", error);
        setHasLoadedOnce(true); // Still mark as loaded to prevent infinite loading
      }
    };
    init();
  }, [user]);

  useEffect(() => {
    if (!user) return; // Don't seed if no user

    // Seed initial collection periods if none exist and not previously seeded
    const seeded = localStorage.getItem(`coopSeeded_${user.id}`);
    if (!seeded) {
      if (state.collections.length === 0) {
        const seedPeriods: CollectionPeriod[] = [
          {
            id: "2024-12-10",
            date: "2024-12-10",
            totalCollected: 0,
            payments: [],
            defaultContribution: 1000,
          },
          {
            id: "2024-12-25",
            date: "2024-12-25",
            totalCollected: 0,
            payments: [],
            defaultContribution: 1000,
          },
          {
            id: "2025-01-10",
            date: "2025-01-10",
            totalCollected: 0,
            payments: [],
            defaultContribution: 1000,
          },
        ];
        seedPeriods.forEach((p) =>
          dispatch({ type: "ADD_COLLECTION_PERIOD", payload: p })
        );
      }
      localStorage.setItem(`coopSeeded_${user.id}`, "1");
    }
  }, [state.collections.length, user]);

  useEffect(() => {
    if (!user) return; // Don't save if no user
    if (!hasLoadedOnce) return; // Don't save during initial load

    console.log("CoopContext: Saving state for user", user.id);

    // Always save to localStorage first as it's synchronous and reliable
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`coopState_${user.id}`, JSON.stringify(state));
        console.log("CoopContext: Saved to localStorage successfully");
      } catch (localError) {
        console.error("CoopContext: Error saving to localStorage:", localError);
      }
    }

    // Save to Supabase as additional backup (async)
    saveRemoteState(state, user.id)
      .then(() => {
        console.log("CoopContext: Saved to remote state successfully");
      })
      .catch((err) => {
        console.error("CoopContext: Failed to save remote state:", err);
        // LocalStorage save already completed above, so data is still persisted
      });
  }, [state, user, hasLoadedOnce]);

  useEffect(() => {
    // Derive current balance = contributions + repayments - disbursed loans
    const totalCollected = state.collections.reduce(
      (sum, c) => sum + (c.totalCollected || 0),
      0
    );
    const totalRepaid = state.repayments.reduce(
      (sum, r) => sum + (r.amount || 0),
      0
    );
    const totalDisbursed = state.loans
      .filter((l) => l.status === "APPROVED")
      .reduce((sum, l) => sum + (l.amount || 0), 0);

    const derived = totalCollected + totalRepaid - totalDisbursed;
    if (derived !== state.currentBalance) {
      dispatch({ type: "UPDATE_BALANCE", payload: derived });
    }
  }, [state.collections, state.repayments, state.loans, state.currentBalance]);

  // ...schedule utilities are defined at module scope above

  // Auto-assess penalties for missed amortization periods
  useEffect(() => {
    // Reference date is the latest collection period date, else today
    const sortedPeriods = [...state.collections].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const referenceDate = sortedPeriods.length
      ? new Date(sortedPeriods[sortedPeriods.length - 1].date)
      : new Date();
    referenceDate.setHours(12, 0, 0, 0);

    const existingPenaltyIds = new Set(state.penalties.map((p) => p.id));

    state.loans.forEach((loan) => {
      if (loan.status !== "APPROVED") return;
      const approvedDate = new Date(loan.dateApproved || loan.dateIssued);
      if (!loan.termCount || loan.termCount <= 0) return;
      const rate =
        loan.interestRate ??
        (loan.repaymentPlan === "MONTHLY"
          ? 0.04
          : loan.repaymentPlan === "CUT_OFF"
          ? 0.03
          : 0);
      const totalDue = (loan.amount || 0) * (1 + rate * loan.termCount);
      const installment = loan.termCount > 0 ? totalDue / loan.termCount : 0;
      if (!(installment > 0)) return;

      const schedule =
        loan.repaymentPlan === "MONTHLY"
          ? generateMonthlySchedule(approvedDate, loan.termCount)
          : generateCutoffSchedule(approvedDate, loan.termCount);

      const dueCount = schedule.filter(
        (d) => d.getTime() <= referenceDate.getTime()
      ).length;
      if (dueCount <= 0) return;

      const paidSoFar = state.repayments
        .filter(
          (r) =>
            r.loanId === loan.id &&
            new Date(r.date).getTime() <= referenceDate.getTime()
        )
        .reduce((s, r) => s + (r.amount || 0), 0);
      const installmentsCovered = Math.floor(paidSoFar / installment);
      const missedCount = Math.max(0, dueCount - installmentsCovered);
      if (missedCount <= 0) return;

      // Determine how many penalties already recorded up to dueCount indices
      const penaltiesForLoan = state.penalties.filter(
        (p) => p.loanId === loan.id
      );
      // We encoded ids as `${loan.id}-missed-${index}` so we can check by index
      const existingMissedIndices = new Set<number>();
      for (const p of penaltiesForLoan) {
        const m = p.id.match(/-missed-(\d+)$/);
        if (m) existingMissedIndices.add(parseInt(m[1], 10));
      }

      const penaltyRate = loan.penaltyRate ?? 0.03; // 3% default
      for (let k = installmentsCovered + 1; k <= dueCount; k++) {
        if (existingMissedIndices.has(k)) continue; // already assessed
        const missedDueDate = schedule[k - 1];
        // find next collection period after missed due date
        const nextPeriod = sortedPeriods.find(
          (p) => new Date(p.date).getTime() > missedDueDate.getTime()
        );
        const periodId = nextPeriod
          ? nextPeriod.id
          : sortedPeriods.length
          ? sortedPeriods[sortedPeriods.length - 1].id
          : toYMD(missedDueDate);
        const penaltyAmount = penaltyRate * installment;
        const penaltyId = `${loan.id}-missed-${k}`;
        if (!existingPenaltyIds.has(penaltyId)) {
          dispatch({
            type: "ADD_PENALTY",
            payload: {
              id: penaltyId,
              loanId: loan.id,
              amount: penaltyAmount,
              date: new Date().toISOString(),
              periodId,
              reason: `Missed installment #${k} due ${toYMD(missedDueDate)}`,
            } as Penalty,
          });
        }
      }
    });
  }, [state.loans, state.repayments, state.collections, state.penalties]);

  return (
    <CoopContext.Provider value={{ state, dispatch }}>
      {children}
    </CoopContext.Provider>
  );
}

export function useCoop() {
  const context = useContext(CoopContext);
  if (context === undefined) {
    throw new Error("useCoop must be used within a CoopProvider");
  }
  return context;
}
