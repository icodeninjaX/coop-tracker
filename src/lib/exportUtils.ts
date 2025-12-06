import { format } from "date-fns";
import type {
  CoopState,
  CollectionPeriod,
  Loan,
  Repayment,
  Member,
  Penalty,
  YearlyArchive,
} from "@/types";

/**
 * Export utilities for Coop Tracking System
 * Supports CSV and JSON export formats
 */

// ============ GENERAL EXPORT UTILITIES ============

/**
 * Download a file to the user's device
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate timestamp for filenames
 */
function getTimestamp(): string {
  return format(new Date(), "yyyy-MM-dd_HH-mm-ss");
}

// ============ CSV EXPORT UTILITIES ============

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV<T extends Record<string, unknown>>(data: T[], headers?: string[]): string {
  if (data.length === 0) return "";

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  // Create CSV rows
  const rows = data.map((row) =>
    csvHeaders
      .map((header) => {
        const value = row[header];
        // Handle null/undefined
        if (value === null || value === undefined) return "";
        // Escape quotes and wrap in quotes if contains comma or quote
        const stringValue = String(value);
        if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(",")
  );

  // Combine headers and rows
  return [csvHeaders.join(","), ...rows].join("\n");
}

/**
 * Export collection periods to CSV
 */
export function exportCollectionsToCSV(collections: CollectionPeriod[]) {
  const data = collections.map((period) => ({
    Date: period.date,
    "Total Collected": period.totalCollected,
    "Number of Payments": period.payments.length,
    "Default Contribution": period.defaultContribution || "N/A",
  }));

  const csv = arrayToCSV(data);
  downloadFile(csv, `collections_${getTimestamp()}.csv`, "text/csv");
}

/**
 * Export payments to CSV (detailed)
 */
export function exportPaymentsToCSV(collections: CollectionPeriod[], members: Member[]) {
  const payments: Array<{
    Date: string;
    Period: string;
    "Member ID": number;
    "Member Name": string;
    Amount: number;
  }> = [];

  collections.forEach((period) => {
    period.payments.forEach((payment) => {
      const member = members.find((m) => m.id === payment.memberId);
      payments.push({
        Date: payment.date.split("T")[0],
        Period: period.date,
        "Member ID": payment.memberId,
        "Member Name": member?.name || "Unknown",
        Amount: payment.amount,
      });
    });
  });

  const csv = arrayToCSV(payments);
  downloadFile(csv, `payments_${getTimestamp()}.csv`, "text/csv");
}

/**
 * Export loans to CSV
 */
export function exportLoansToCSV(loans: Loan[], members: Member[]) {
  const data = loans.map((loan) => {
    const member = members.find((m) => m.id === loan.memberId);
    return {
      "Loan ID": loan.id,
      "Member ID": loan.memberId,
      "Member Name": member?.name || "Unknown",
      Amount: loan.amount,
      "Date Issued": loan.dateIssued.split("T")[0],
      Status: loan.status,
      "Repayment Plan": loan.repaymentPlan || "N/A",
      "Interest Rate": loan.interestRate ? `${(loan.interestRate * 100).toFixed(1)}%` : "N/A",
      "Term Count": loan.termCount || "N/A",
      "Date Approved": loan.dateApproved ? loan.dateApproved.split("T")[0] : "N/A",
      "Disbursement Period": loan.disbursementPeriodId || "N/A",
      "Date Closed": loan.dateClosed ? loan.dateClosed.split("T")[0] : "N/A",
    };
  });

  const csv = arrayToCSV(data);
  downloadFile(csv, `loans_${getTimestamp()}.csv`, "text/csv");
}

/**
 * Export repayments to CSV
 */
export function exportRepaymentsToCSV(repayments: Repayment[], members: Member[], loans: Loan[]) {
  const data = repayments.map((repayment) => {
    const member = members.find((m) => m.id === repayment.memberId);
    const loan = loans.find((l) => l.id === repayment.loanId);
    return {
      "Repayment ID": repayment.id,
      Date: repayment.date.split("T")[0],
      "Member ID": repayment.memberId,
      "Member Name": member?.name || "Unknown",
      "Loan ID": repayment.loanId,
      "Loan Amount": loan?.amount || "N/A",
      "Repayment Amount": repayment.amount,
      Period: repayment.periodId,
    };
  });

  const csv = arrayToCSV(data);
  downloadFile(csv, `repayments_${getTimestamp()}.csv`, "text/csv");
}

/**
 * Export members to CSV
 */
export function exportMembersToCSV(members: Member[]) {
  const data = members.map((member) => ({
    ID: member.id,
    Name: member.name,
  }));

  const csv = arrayToCSV(data);
  downloadFile(csv, `members_${getTimestamp()}.csv`, "text/csv");
}

/**
 * Export penalties to CSV
 */
export function exportPenaltiesToCSV(penalties: Penalty[], loans: Loan[], members: Member[]) {
  const data = penalties.map((penalty) => {
    const loan = loans.find((l) => l.id === penalty.loanId);
    const member = members.find((m) => m.id === loan?.memberId);
    return {
      "Penalty ID": penalty.id,
      "Loan ID": penalty.loanId,
      "Member ID": loan?.memberId || "N/A",
      "Member Name": member?.name || "Unknown",
      Amount: penalty.amount,
      Date: penalty.date.split("T")[0],
      Period: penalty.periodId,
      Reason: penalty.reason || "N/A",
    };
  });

  const csv = arrayToCSV(data);
  downloadFile(csv, `penalties_${getTimestamp()}.csv`, "text/csv");
}

/**
 * Export financial summary to CSV
 */
export function exportFinancialSummaryToCSV(state: CoopState) {
  const totalCollected = state.collections.reduce(
    (sum, c) => sum + c.totalCollected,
    0
  );
  const totalDisbursed = state.loans
    .filter((l) => l.status === "APPROVED" || l.status === "PAID")
    .reduce((sum, l) => sum + l.amount, 0);
  const totalRepayments = state.repayments.reduce(
    (sum, r) => sum + r.amount,
    0
  );
  const totalPenalties = state.penalties.reduce((sum, p) => sum + p.amount, 0);

  const data = [
    { Metric: "Beginning Balance", Value: state.beginningBalance },
    { Metric: "Total Collected", Value: totalCollected },
    { Metric: "Total Disbursed", Value: totalDisbursed },
    { Metric: "Total Repayments", Value: totalRepayments },
    { Metric: "Total Penalties", Value: totalPenalties },
    { Metric: "Current Balance", Value: state.currentBalance },
    { Metric: "Total Members", Value: state.members.length },
    { Metric: "Total Collection Periods", Value: state.collections.length },
    { Metric: "Total Loans", Value: state.loans.length },
    { Metric: "Active Loans", Value: state.loans.filter((l) => l.status === "APPROVED").length },
    { Metric: "Paid Loans", Value: state.loans.filter((l) => l.status === "PAID").length },
  ];

  const csv = arrayToCSV(data);
  downloadFile(csv, `financial_summary_${getTimestamp()}.csv`, "text/csv");
}

// ============ JSON EXPORT UTILITIES ============

/**
 * Export complete state to JSON (backup)
 */
export function exportFullStateToJSON(state: CoopState) {
  const json = JSON.stringify(state, null, 2);
  downloadFile(json, `coop_backup_${getTimestamp()}.json`, "application/json");
}

/**
 * Export collections to JSON
 */
export function exportCollectionsToJSON(collections: CollectionPeriod[]) {
  const json = JSON.stringify(collections, null, 2);
  downloadFile(json, `collections_${getTimestamp()}.json`, "application/json");
}

/**
 * Export loans to JSON
 */
export function exportLoansToJSON(loans: Loan[]) {
  const json = JSON.stringify(loans, null, 2);
  downloadFile(json, `loans_${getTimestamp()}.json`, "application/json");
}

/**
 * Export archives to JSON
 */
export function exportArchivesToJSON(archives: YearlyArchive[]) {
  const json = JSON.stringify(archives, null, 2);
  downloadFile(json, `archives_${getTimestamp()}.json`, "application/json");
}

// ============ IMPORT UTILITIES ============

/**
 * Import state from JSON file
 */
export async function importStateFromJSON(file: File): Promise<CoopState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const state = JSON.parse(content) as CoopState;

        // Basic validation
        if (!state.members || !Array.isArray(state.members)) {
          throw new Error("Invalid state: missing members array");
        }
        if (!state.collections || !Array.isArray(state.collections)) {
          throw new Error("Invalid state: missing collections array");
        }

        resolve(state);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}

/**
 * Parse CSV string to array of objects
 */
export function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const data: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    data.push(row);
  }

  return data;
}

// ============ REPORT GENERATION ============

/**
 * Generate comprehensive financial report
 */
export function exportComprehensiveReport(state: CoopState) {
  const timestamp = getTimestamp();
  const reportData = {
    generatedAt: new Date().toISOString(),
    summary: {
      beginningBalance: state.beginningBalance,
      currentBalance: state.currentBalance,
      totalMembers: state.members.length,
      totalPeriods: state.collections.length,
      totalLoans: state.loans.length,
      activeLoans: state.loans.filter((l) => l.status === "APPROVED").length,
      paidLoans: state.loans.filter((l) => l.status === "PAID").length,
      totalCollected: state.collections.reduce((sum, c) => sum + c.totalCollected, 0),
      totalDisbursed: state.loans
        .filter((l) => l.status === "APPROVED" || l.status === "PAID")
        .reduce((sum, l) => sum + l.amount, 0),
      totalRepayments: state.repayments.reduce((sum, r) => sum + r.amount, 0),
      totalPenalties: state.penalties.reduce((sum, p) => sum + p.amount, 0),
    },
    members: state.members,
    collections: state.collections,
    loans: state.loans,
    repayments: state.repayments,
    penalties: state.penalties,
    archives: state.archives,
  };

  const json = JSON.stringify(reportData, null, 2);
  downloadFile(json, `comprehensive_report_${timestamp}.json`, "application/json");
}
