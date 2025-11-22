"use client";

import { useCoop } from "@/context/CoopContext";
import { useState } from "react";
import { format } from "date-fns";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, Badge, EmptyState } from "@/components/UI";
import { YearlyArchive } from "@/types";

const ArchivesPage = () => {
  const { state } = useCoop();
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  const toggleYear = (year: number) => {
    setExpandedYear(expandedYear === year ? null : year);
  };

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-indigo-600 font-light">Loading archives...</p>
        </div>
      </div>
    );
  }

  const archives = state.archives || [];
  const sortedArchives = [...archives].sort((a, b) => b.year - a.year); // Most recent first

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="container mx-auto max-w-7xl px-3 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-indigo-900 tracking-tight mb-1 sm:mb-2">
            Archives
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-indigo-600 font-light">
            Historical yearly data and financial records
          </p>
        </div>

        {sortedArchives.length === 0 ? (
          <Card className="p-12">
            <EmptyState
              title="No Archived Data"
              description="No yearly archives have been created yet. Archives are created when you archive a year's worth of data."
            />
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {sortedArchives.map((archive) => (
              <Card key={archive.archivedDate} className="overflow-hidden shadow-sm">
                {/* Archive Header */}
                <button
                  onClick={() => toggleYear(archive.year)}
                  className="w-full p-4 sm:p-6 border-b-2 border-indigo-200 hover:bg-indigo-50/30 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold text-indigo-900">
                        Year {archive.year}
                      </h2>
                      <p className="text-xs sm:text-sm text-indigo-600 font-light mt-1">
                        Archived on{" "}
                        {format(new Date(archive.archivedDate), "MMMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="neutral" className="hidden sm:inline-flex">
                        {archive.collections.length} periods
                      </Badge>
                      <svg
                        className={`w-6 h-6 text-indigo-600 transition-transform duration-200 ${
                          expandedYear === archive.year ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Summary Stats - Always Visible */}
                <div className="p-3 sm:p-4 lg:p-6 bg-indigo-50/30">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                    <div className="bg-white/80 border-2 border-indigo-200 rounded-lg p-2.5 sm:p-3 lg:p-4">
                      <p className="text-xs uppercase tracking-wider text-indigo-600 font-normal mb-1">
                        Total Collected
                      </p>
                      <p className="text-sm sm:text-base lg:text-lg font-semibold text-indigo-900 break-all">
                        ₱{archive.summary.totalCollected.toLocaleString()}
                      </p>
                    </div>

                    <div className="bg-white/80 border-2 border-rose-200 rounded-lg p-2.5 sm:p-3 lg:p-4">
                      <p className="text-xs uppercase tracking-wider text-rose-600 font-normal mb-1">
                        Total Disbursed
                      </p>
                      <p className="text-sm sm:text-base lg:text-lg font-semibold text-rose-900 break-all">
                        ₱{archive.summary.totalDisbursed.toLocaleString()}
                      </p>
                    </div>

                    <div className="bg-white/80 border-2 border-purple-200 rounded-lg p-2.5 sm:p-3 lg:p-4">
                      <p className="text-xs uppercase tracking-wider text-purple-600 font-normal mb-1">
                        Total Repayments
                      </p>
                      <p className="text-sm sm:text-base lg:text-lg font-semibold text-purple-900 break-all">
                        ₱{archive.summary.totalRepayments.toLocaleString()}
                      </p>
                    </div>

                    <div className="bg-white/80 border-2 border-emerald-200 rounded-lg p-2.5 sm:p-3 lg:p-4">
                      <p className="text-xs uppercase tracking-wider text-emerald-600 font-normal mb-1">
                        Ending Balance
                      </p>
                      <p className="text-sm sm:text-base lg:text-lg font-semibold text-emerald-900 break-all">
                        ₱{archive.summary.endingBalance.toLocaleString()}
                      </p>
                    </div>

                    <div className="bg-white/80 border-2 border-amber-200 rounded-lg p-2.5 sm:p-3 lg:p-4 col-span-2 sm:col-span-1">
                      <p className="text-xs uppercase tracking-wider text-amber-600 font-normal mb-1">
                        Loans Issued
                      </p>
                      <p className="text-sm sm:text-base lg:text-lg font-semibold text-amber-900">
                        {archive.summary.totalLoansIssued}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expandable Details */}
                {expandedYear === archive.year && (
                  <div className="p-3 sm:p-4 lg:p-6 border-t-2 border-indigo-200">
                    {/* Collection Periods */}
                    <div className="mb-4 sm:mb-6">
                      <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-indigo-900 mb-2 sm:mb-3 lg:mb-4">
                        Collection Periods ({archive.collections.length})
                      </h3>
                      {archive.collections.length === 0 ? (
                        <p className="text-xs sm:text-sm text-indigo-600 font-light">
                          No collection periods in this archive.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {archive.collections
                            .sort(
                              (a, b) =>
                                new Date(b.date).getTime() -
                                new Date(a.date).getTime()
                            )
                            .map((period) => (
                              <div
                                key={period.id}
                                className="flex items-center justify-between p-2.5 sm:p-3 lg:p-4 border-2 border-indigo-200 rounded-lg hover:bg-indigo-50/30 transition-colors"
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <p className="text-xs sm:text-sm lg:text-base font-semibold text-indigo-900 truncate">
                                    {format(new Date(period.date), "MMMM d, yyyy")}
                                  </p>
                                  <p className="text-xs text-indigo-600 font-light">
                                    {period.payments.length} payments
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-xs sm:text-sm lg:text-base font-semibold text-indigo-900">
                                    ₱{period.totalCollected.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Loans */}
                    <div className="mb-4 sm:mb-6">
                      <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-indigo-900 mb-2 sm:mb-3 lg:mb-4">
                        Loans ({archive.loans.length})
                      </h3>
                      {archive.loans.length === 0 ? (
                        <p className="text-xs sm:text-sm text-indigo-600 font-light">
                          No loans in this archive.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                          {archive.loans
                            .sort(
                              (a, b) =>
                                new Date(b.dateIssued).getTime() -
                                new Date(a.dateIssued).getTime()
                            )
                            .map((loan) => (
                              <div
                                key={loan.id}
                                className="border-2 border-indigo-200 rounded-lg p-2.5 sm:p-3 lg:p-4 hover:bg-indigo-50/30 transition-colors"
                              >
                                <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                                  <p className="text-xs sm:text-sm font-semibold text-indigo-900">
                                    Member #{loan.memberId}
                                  </p>
                                  <Badge
                                    variant={
                                      loan.status === "APPROVED"
                                        ? "success"
                                        : loan.status === "PENDING"
                                        ? "warning"
                                        : loan.status === "REJECTED"
                                        ? "error"
                                        : "neutral"
                                    }
                                    className="text-xs"
                                  >
                                    {loan.status}
                                  </Badge>
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-indigo-600 font-light">
                                      Amount:
                                    </span>
                                    <span className="text-indigo-900 font-semibold">
                                      ₱{loan.amount.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-indigo-600 font-light">
                                      Issued:
                                    </span>
                                    <span className="text-indigo-900 font-normal">
                                      {format(new Date(loan.dateIssued), "MMM d")}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Repayments */}
                    <div>
                      <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-indigo-900 mb-2 sm:mb-3 lg:mb-4">
                        Repayments ({archive.repayments.length})
                      </h3>
                      {archive.repayments.length === 0 ? (
                        <p className="text-xs sm:text-sm text-indigo-600 font-light">
                          No repayments in this archive.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {archive.repayments
                            .sort(
                              (a, b) =>
                                new Date(b.date).getTime() -
                                new Date(a.date).getTime()
                            )
                            .slice(0, 10)
                            .map((repayment) => (
                              <div
                                key={repayment.id}
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 p-2.5 sm:p-3 border-2 border-indigo-200 rounded-lg text-xs"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                  <span className="text-indigo-900 font-normal">
                                    Member #{repayment.memberId}
                                  </span>
                                  <span className="text-indigo-600 font-light text-xs">
                                    {format(new Date(repayment.date), "MMM d, yyyy")}
                                  </span>
                                </div>
                                <span className="text-emerald-700 font-semibold text-sm sm:text-xs">
                                  ₱{repayment.amount.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          {archive.repayments.length > 10 && (
                            <p className="text-xs text-indigo-600 font-light text-center pt-1 sm:pt-2">
                              Showing 10 of {archive.repayments.length} repayments
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        {archives.length > 0 && (
          <Card className="mt-6 lg:mt-8">
            <div className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-indigo-900 mb-3">
                About Archives
              </h3>
              <div className="space-y-2 text-sm text-indigo-700 font-light">
                <p>
                  Archives contain historical data for completed years. Once archived,
                  data is preserved for record-keeping and reference purposes.
                </p>
                <p>
                  Each archive includes all collection periods, loans, repayments, and
                  penalties from that year, along with summary statistics.
                </p>
                <p className="text-xs text-indigo-600">
                  💡 Tip: Click on a year to expand and view detailed records.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default function Page() {
  return (
    <ProtectedRoute>
      <ArchivesPage />
    </ProtectedRoute>
  );
}
